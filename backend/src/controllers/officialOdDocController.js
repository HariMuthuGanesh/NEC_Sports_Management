import fs from 'fs';
import path from 'path';
import multer from 'multer';
import pool from '../config/db.js';
import {
  createOfficialOdDoc,
  findExistingActiveDoc,
  replaceOfficialOdDoc,
  getOfficialOdDocs,
  getOfficialOdDocById,
  deleteOfficialOdDoc,
  getPublicOfficialOdDocs,
  getPublicOfficialOdFilterOptions
} from '../models/sql/officialOdDocModel.js';

// Multer storage setup for Official Signed OD Documents
const getOdDocumentsUploadsPath = () => {
  const backendPath = path.resolve(process.cwd(), 'backend', 'uploads', 'od_documents');
  const directPath = path.resolve(process.cwd(), 'uploads', 'od_documents');
  const target = (fs.existsSync(path.resolve(process.cwd(), 'backend')) && path.basename(process.cwd()) !== 'backend')
    ? backendPath
    : directPath;
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  return target;
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = getOdDocumentsUploadsPath();
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedSport = (req.body.sportName || 'sport').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const sanitizedDept = (req.body.departmentCode || 'dept').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    cb(null, `signed_od_${sanitizedSport}_${sanitizedDept}_${uniqueSuffix}.pdf`);
  }
});

const pdfUpload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype === 'application/pdf' && ext === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF documents (.pdf) are accepted for official signed OD letters.'));
    }
  }
});

export const uploadOdDocMiddleware = pdfUpload.single('file');

const hasPdfSignature = (filePath) => {
  const descriptor = fs.openSync(filePath, 'r');
  try {
    const signature = Buffer.alloc(5);
    return fs.readSync(descriptor, signature, 0, signature.length, 0) === signature.length
      && signature.toString('ascii') === '%PDF-';
  } finally {
    fs.closeSync(descriptor);
  }
};

/**
 * Upload an official Principal-signed OD PDF (sport-wise and department-wise)
 * POST /api/od/official-documents/upload
 */
export const uploadOfficialOdDocController = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'Official signed OD PDF file is required.' }
      });
    }

    if (!hasPdfSignature(req.file.path)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_FILE_CONTENT', message: 'The uploaded file is not a valid PDF document.' }
      });
    }

    const {
      sportId,
      sportName,
      departmentId,
      departmentCode,
      departmentName,
      tournamentId,
      tournamentName,
      academicYear,
      title,
      replace
    } = req.body;

    if (!sportId && !sportName) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_SPORT', message: 'Sport selection is required.' }
      });
    }

    if (!departmentId && !departmentCode) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_DEPARTMENT', message: 'Department selection is required.' }
      });
    }

    // Resolve Sport info from DB if needed
    let resolvedSportId = Number(sportId);
    let resolvedSportName = sportName;
    if (!resolvedSportName && resolvedSportId) {
      const [sRows] = await pool.execute('SELECT sport_id, name FROM sports WHERE sport_id = ?', [resolvedSportId]);
      if (sRows[0]) {
        resolvedSportName = sRows[0].name;
      }
    } else if (resolvedSportName && !resolvedSportId) {
      const [sRows] = await pool.execute('SELECT sport_id, name FROM sports WHERE name = ? LIMIT 1', [resolvedSportName]);
      if (sRows[0]) {
        resolvedSportId = sRows[0].sport_id;
      }
    }

    // Resolve Department info from DB if needed
    let resolvedDeptId = Number(departmentId);
    let resolvedDeptCode = departmentCode;
    let resolvedDeptName = departmentName;
    if ((!resolvedDeptCode || !resolvedDeptName) && resolvedDeptId) {
      const [dRows] = await pool.execute('SELECT id, code, name FROM departments WHERE id = ?', [resolvedDeptId]);
      if (dRows[0]) {
        resolvedDeptCode = dRows[0].code;
        resolvedDeptName = dRows[0].name;
      }
    } else if (resolvedDeptCode && !resolvedDeptId) {
      const [dRows] = await pool.execute('SELECT id, code, name FROM departments WHERE code = ? LIMIT 1', [resolvedDeptCode]);
      if (dRows[0]) {
        resolvedDeptId = dRows[0].id;
        resolvedDeptName = dRows[0].name;
      }
    }

    const finalAcademicYear = academicYear || '2025-2026';
    const relativeUrl = `/uploads/od_documents/${req.file.filename}`;

    // Check for existing active document for this exact sport + department + academic year
    const existingDoc = await findExistingActiveDoc({
      sport_id: resolvedSportId,
      department_id: resolvedDeptId,
      tournament_id: tournamentId ? Number(tournamentId) : null,
      academic_year: finalAcademicYear
    });

    const isReplacing = replace === 'true' || replace === true;

    if (existingDoc && !isReplacing) {
      // Remove the newly uploaded scratch file since replacement was not explicitly confirmed
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (err) {
        console.warn('Could not clean unconfirmed file:', err);
      }

      return res.status(409).json({
        success: false,
        duplicate: true,
        existingDoc: {
          document_id: existingDoc.document_id,
          sport_name: existingDoc.sport_name,
          department_code: existingDoc.department_code,
          file_name: existingDoc.file_name,
          version: existingDoc.version,
          uploaded_at: existingDoc.created_at
        },
        message: `An official signed OD document already exists for ${resolvedSportName} (${resolvedDeptCode}) for ${finalAcademicYear} (Version ${existingDoc.version}). Please confirm if you want to replace it.`
      });
    }

    let docId;
    let newVersion = 1;

    if (existingDoc && isReplacing) {
      newVersion = (existingDoc.version || 1) + 1;
      docId = await replaceOfficialOdDoc(existingDoc.document_id, {
        sport_id: resolvedSportId,
        sport_name: resolvedSportName || 'Sport',
        department_id: resolvedDeptId,
        department_code: resolvedDeptCode || 'DEPT',
        department_name: resolvedDeptName || resolvedDeptCode || 'Department',
        tournament_id: tournamentId ? Number(tournamentId) : null,
        tournament_name: tournamentName || null,
        academic_year: finalAcademicYear,
        title: title || `${resolvedSportName} - ${resolvedDeptCode} Official OD Letter`,
        file_name: req.file.originalname,
        file_path: req.file.path,
        file_url: relativeUrl,
        file_size: req.file.size,
        version: newVersion,
        uploaded_by: req.user.id
      });
    } else {
      docId = await createOfficialOdDoc({
        sport_id: resolvedSportId,
        sport_name: resolvedSportName || 'Sport',
        department_id: resolvedDeptId,
        department_code: resolvedDeptCode || 'DEPT',
        department_name: resolvedDeptName || resolvedDeptCode || 'Department',
        tournament_id: tournamentId ? Number(tournamentId) : null,
        tournament_name: tournamentName || null,
        academic_year: finalAcademicYear,
        title: title || `${resolvedSportName} - ${resolvedDeptCode} Official OD Letter`,
        file_name: req.file.originalname,
        file_path: req.file.path,
        file_url: relativeUrl,
        file_size: req.file.size,
        version: 1,
        uploaded_by: req.user.id,
        status: 'Active'
      });
    }

    return res.status(201).json({
      success: true,
      message: isReplacing
        ? `Official signed OD letter replaced successfully (Version ${newVersion}).`
        : `Official signed OD letter uploaded and verified successfully.`,
      data: {
        document_id: docId,
        sport_name: resolvedSportName,
        department_code: resolvedDeptCode,
        academic_year: finalAcademicYear,
        version: newVersion,
        file_url: relativeUrl,
        file_name: req.file.originalname
      }
    });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
};

/**
 * List official OD documents (Management view for President / Admin / Coordinator)
 * GET /api/od/official-documents
 */
export const listOfficialOdDocsController = async (req, res, next) => {
  try {
    const { sportId, deptId, tournamentId, academicYear, status } = req.query;
    const docs = await getOfficialOdDocs({
      sportId: sportId ? Number(sportId) : null,
      deptId: deptId ? Number(deptId) : null,
      tournamentId: tournamentId ? Number(tournamentId) : null,
      academicYear: academicYear || null,
      status: status || 'Active'
    });
    return res.json({ success: true, data: docs });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete / Archive an official OD document
 * DELETE /api/od/official-documents/:id
 */
export const deleteOfficialOdDocController = async (req, res, next) => {
  try {
    const documentId = Number(req.params.id);
    const existing = await getOfficialOdDocById(documentId);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Official OD document not found.' } });
    }

    await deleteOfficialOdDoc(documentId);
    return res.json({ success: true, data: { message: 'Document archived successfully.' } });
  } catch (err) {
    next(err);
  }
};

/**
 * Public endpoint: returns all active Principal-signed OD documents for guest/staff verification
 * GET /api/public/od/official-documents
 */
export const getPublicOfficialOdDocsController = async (req, res, next) => {
  try {
    const { sport, department, q } = req.query;
    const docs = await getPublicOfficialOdDocs({
      sport: sport || null,
      department: department || null,
      query: q || ''
    });
    return res.json({ success: true, data: docs });
  } catch (err) {
    next(err);
  }
};

/**
 * Public endpoint: returns filter options (sports and departments with active signed letters)
 * GET /api/public/od/official-documents/options
 */
export const getPublicOfficialOdFilterOptionsController = async (req, res, next) => {
  try {
    const options = await getPublicOfficialOdFilterOptions();
    return res.json({ success: true, data: options });
  } catch (err) {
    next(err);
  }
};

/**
 * Public endpoint: View official PDF document inline
 * GET /api/public/od/official-documents/:id/view
 */
export const viewOfficialOdPdfController = async (req, res, next) => {
  try {
    const documentId = Number(req.params.id);
    const doc = await getOfficialOdDocById(documentId);
    if (!doc || doc.status !== 'Active') {
      return res.status(404).json({ success: false, error: { message: 'Official signed document not found or inactive.' } });
    }

    if (!doc.file_path || !fs.existsSync(doc.file_path)) {
      // Try resolving relative path from uploads dir
      const fallbackPath = path.resolve(process.cwd(), doc.file_path.replace(/^[/\\]+/, ''));
      const directUploads = path.resolve(process.cwd(), 'uploads', 'od_documents', doc.file_name);
      const backendUploads = path.resolve(process.cwd(), 'backend', 'uploads', 'od_documents', doc.file_name);

      const resolved = fs.existsSync(doc.file_path)
        ? doc.file_path
        : fs.existsSync(fallbackPath)
        ? fallbackPath
        : fs.existsSync(directUploads)
        ? directUploads
        : fs.existsSync(backendUploads)
        ? backendUploads
        : null;

      if (!resolved) {
        return res.status(404).json({ success: false, error: { message: 'Document file not found on server storage.' } });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${doc.file_name || 'signed_od.pdf'}"`);
      return fs.createReadStream(resolved).pipe(res);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.file_name || 'signed_od.pdf'}"`);
    return fs.createReadStream(doc.file_path).pipe(res);
  } catch (err) {
    next(err);
  }
};
