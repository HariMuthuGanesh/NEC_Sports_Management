import pool from '../../config/db.js';

/**
 * Creates an official OD document record
 */
export const createOfficialOdDoc = async ({
  sport_id,
  sport_name,
  department_id,
  department_code,
  department_name,
  tournament_id = null,
  tournament_name = null,
  academic_year,
  title = null,
  file_name,
  file_path,
  file_url,
  file_size,
  version = 1,
  uploaded_by,
  status = 'Active'
}) => {
  const [result] = await pool.execute(
    `INSERT INTO official_od_documents 
      (sport_id, sport_name, department_id, department_code, department_name, 
       tournament_id, tournament_name, academic_year, title, file_name, 
       file_path, file_url, file_size, version, uploaded_by, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sport_id,
      sport_name,
      department_id,
      department_code,
      department_name,
      tournament_id,
      tournament_name,
      academic_year,
      title,
      file_name,
      file_path,
      file_url,
      file_size,
      version,
      uploaded_by,
      status
    ]
  );
  return result.insertId;
};

/**
 * Find existing active document for a specific sport + department + tournament + academic year combination
 */
export const findExistingActiveDoc = async ({ sport_id, department_id, tournament_id = null, academic_year }) => {
  let query = `
    SELECT * FROM official_od_documents 
    WHERE sport_id = ? AND department_id = ? AND academic_year = ? AND status = 'Active'
  `;
  const params = [sport_id, department_id, academic_year];

  if (tournament_id) {
    query += ' AND tournament_id = ?';
    params.push(tournament_id);
  }

  query += ' ORDER BY version DESC LIMIT 1';
  const [rows] = await pool.execute(query, params);
  return rows[0] || null;
};

/**
 * Replace an existing document with a new version
 */
export const replaceOfficialOdDoc = async (oldDocId, newDocData) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Mark previous document as 'Replaced'
    await connection.execute(
      `UPDATE official_od_documents SET status = 'Replaced' WHERE document_id = ?`,
      [oldDocId]
    );

    // Insert new version
    const [result] = await connection.execute(
      `INSERT INTO official_od_documents 
        (sport_id, sport_name, department_id, department_code, department_name, 
         tournament_id, tournament_name, academic_year, title, file_name, 
         file_path, file_url, file_size, version, uploaded_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newDocData.sport_id,
        newDocData.sport_name,
        newDocData.department_id,
        newDocData.department_code,
        newDocData.department_name,
        newDocData.tournament_id || null,
        newDocData.tournament_name || null,
        newDocData.academic_year,
        newDocData.title || null,
        newDocData.file_name,
        newDocData.file_path,
        newDocData.file_url,
        newDocData.file_size,
        newDocData.version,
        newDocData.uploaded_by,
        'Active'
      ]
    );

    await connection.commit();
    return result.insertId;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

/**
 * Get official documents with optional filters
 */
export const getOfficialOdDocs = async ({ sportId, deptId, tournamentId, academicYear, status = 'Active' } = {}) => {
  let query = `
    SELECT 
      d.document_id, d.sport_id, d.sport_name,
      d.department_id, d.department_code, d.department_name,
      d.tournament_id, d.tournament_name, d.academic_year,
      d.title, d.file_name, d.file_url, d.file_size,
      d.version, d.status, d.created_at, d.updated_at,
      u.username AS uploaded_by_name, u.email AS uploaded_by_email
    FROM official_od_documents d
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'ALL') {
    query += ' AND d.status = ?';
    params.push(status);
  }
  if (sportId) {
    query += ' AND d.sport_id = ?';
    params.push(sportId);
  }
  if (deptId) {
    query += ' AND d.department_id = ?';
    params.push(deptId);
  }
  if (tournamentId) {
    query += ' AND d.tournament_id = ?';
    params.push(tournamentId);
  }
  if (academicYear) {
    query += ' AND d.academic_year = ?';
    params.push(academicYear);
  }

  query += ' ORDER BY d.created_at DESC, d.version DESC';
  const [rows] = await pool.execute(query, params);
  return rows;
};

/**
 * Get document by ID
 */
export const getOfficialOdDocById = async (documentId) => {
  const [rows] = await pool.execute(
    `SELECT 
      d.*, 
      u.username AS uploaded_by_name, 
      u.email AS uploaded_by_email
     FROM official_od_documents d
     LEFT JOIN users u ON d.uploaded_by = u.id
     WHERE d.document_id = ?`,
    [documentId]
  );
  return rows[0] || null;
};

/**
 * Delete / Archive a document
 */
export const deleteOfficialOdDoc = async (documentId) => {
  const [result] = await pool.execute(
    `UPDATE official_od_documents SET status = 'Archived' WHERE document_id = ?`,
    [documentId]
  );
  return result.affectedRows > 0;
};

/**
 * Public endpoint query for verified Principal-signed documents
 */
export const getPublicOfficialOdDocs = async ({ sport = null, department = null, query = '' } = {}) => {
  let sql = `
    SELECT 
      d.document_id,
      d.sport_name,
      d.department_code,
      d.department_name,
      d.tournament_name,
      d.academic_year,
      d.title,
      d.file_name,
      d.file_url,
      d.file_size,
      d.version,
      d.created_at AS uploaded_at,
      d.updated_at
    FROM official_od_documents d
    WHERE d.status = 'Active'
  `;
  const params = [];

  if (sport && sport !== 'ALL') {
    sql += ' AND (LOWER(d.sport_name) = LOWER(?) OR LOWER(d.sport_name) LIKE LOWER(?))';
    params.push(sport, `%${sport}%`);
  }

  if (department && department !== 'ALL') {
    sql += ' AND (LOWER(d.department_code) = LOWER(?) OR LOWER(d.department_name) = LOWER(?))';
    params.push(department, department);
  }

  if (query && query.trim()) {
    const q = `%${query.trim().toLowerCase()}%`;
    sql += ' AND (LOWER(d.sport_name) LIKE ? OR LOWER(d.department_code) LIKE ? OR LOWER(d.department_name) LIKE ? OR LOWER(d.tournament_name) LIKE ? OR LOWER(d.title) LIKE ?)';
    params.push(q, q, q, q, q);
  }

  sql += ' ORDER BY d.created_at DESC, d.sport_name ASC, d.department_code ASC';
  const [rows] = await pool.execute(sql, params);
  return rows;
};

/**
 * Public summary of available sports and departments with verified signed letters
 */
export const getPublicOfficialOdFilterOptions = async () => {
  const [sportsRows] = await pool.execute(`
    SELECT DISTINCT sport_name, COUNT(document_id) AS document_count
    FROM official_od_documents
    WHERE status = 'Active'
    GROUP BY sport_name
    ORDER BY sport_name ASC
  `);

  const [deptRows] = await pool.execute(`
    SELECT DISTINCT department_code, department_name, COUNT(document_id) AS document_count
    FROM official_od_documents
    WHERE status = 'Active'
    GROUP BY department_code, department_name
    ORDER BY department_code ASC
  `);

  return {
    sports: sportsRows,
    departments: deptRows
  };
};
