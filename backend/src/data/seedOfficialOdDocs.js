import fs from 'fs';
import path from 'path';
import pool from '../config/db.js';

// Minimal valid PDF generator
function createSamplePdfBuffer(title, refNo, dept, sport) {
  const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 320 >>
stream
BT
/F1 18 Tf
50 720 Td
(NATIONAL ENGINEERING COLLEGE - KOVILPATTI) Tj
/F1 12 Tf
0 -24 Td
(DEPARTMENT OF PHYSICAL EDUCATION - OFFICIAL ON DUTY LETTER) Tj
0 -24 Td
(Ref: ${refNo}) Tj
0 -24 Td
(Sport: ${sport} | Department: ${dept}) Tj
0 -36 Td
(This certifies that the athletes of ${dept} have been approved for ${sport}.) Tj
0 -24 Td
(Status: Verified & Signed by Principal and Director of Physical Education.) Tj
0 -48 Td
(Approved by: Dr. K. Kalidasa Murugavel, Principal, NEC) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000234 00000 n 
0000000606 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
675
%%EOF`;
  return Buffer.from(content, 'utf-8');
}

async function seed() {
  const uploadDir = path.resolve(process.cwd(), 'uploads', 'od_documents');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const [users] = await pool.query('SELECT id FROM users WHERE role IN ("Admin", "Sports President", "President") LIMIT 1');
  const adminId = users[0]?.id || 1;

  const samples = [
    {
      sportId: 1,
      sportName: 'Cricket',
      deptId: 1,
      deptCode: 'CSE',
      deptName: 'Computer Science and Engineering',
      tournament: 'Anna University Zonal Tournament 2025-26',
      title: 'Cricket - CSE Department Official Signed OD Letter',
      ref: 'NEC/OD/2025-26/CRIC-CSE/01'
    },
    {
      sportId: 1,
      sportName: 'Cricket',
      deptId: 2,
      deptCode: 'ECE',
      deptName: 'Electronics and Communication Engineering',
      tournament: 'Anna University Zonal Tournament 2025-26',
      title: 'Cricket - ECE Department Official Signed OD Letter',
      ref: 'NEC/OD/2025-26/CRIC-ECE/02'
    },
    {
      sportId: 2,
      sportName: 'Football',
      deptId: 3,
      deptCode: 'MECH',
      deptName: 'Mechanical Engineering',
      tournament: 'State Inter-Collegiate Trophy 2025-26',
      title: 'Football - MECH Department Official Signed OD Letter',
      ref: 'NEC/OD/2025-26/FB-MECH/03'
    },
    {
      sportId: 8,
      sportName: 'Basketball',
      deptId: 4,
      deptCode: 'IT',
      deptName: 'Information Technology',
      tournament: 'Chief Minister Trophy 2025-26',
      title: 'Basketball - IT Department Official Signed OD Letter',
      ref: 'NEC/OD/2025-26/BB-IT/04'
    }
  ];

  for (const s of samples) {
    const filename = `signed_od_${s.sportName.toLowerCase()}_${s.deptCode.toLowerCase()}_sample.pdf`;
    const filepath = path.join(uploadDir, filename);
    const pdfBuffer = createSamplePdfBuffer(s.title, s.ref, s.deptCode, s.sportName);
    fs.writeFileSync(filepath, pdfBuffer);

    const relativeUrl = `/uploads/od_documents/${filename}`;

    const [existing] = await pool.query(
      'SELECT document_id FROM official_od_documents WHERE sport_id = ? AND department_id = ? AND academic_year = ?',
      [s.sportId, s.deptId, '2025-2026']
    );

    if (existing.length === 0) {
      await pool.query(`
        INSERT INTO official_od_documents 
          (sport_id, sport_name, department_id, department_code, department_name, 
           tournament_name, academic_year, title, file_name, file_path, file_url, 
           file_size, version, uploaded_by, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        s.sportId,
        s.sportName,
        s.deptId,
        s.deptCode,
        s.deptName,
        s.tournament,
        '2025-2026',
        s.title,
        filename,
        filepath,
        relativeUrl,
        pdfBuffer.length,
        1,
        adminId,
        'Active'
      ]);
      console.log(`Seeded official OD document: ${s.sportName} - ${s.deptCode}`);
    }
  }

  console.log('Sample official OD documents seeded.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
