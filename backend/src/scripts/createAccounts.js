import readline from 'readline';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

// Standard institutional departments for NEC Sports System
const INITIAL_DEPARTMENTS = [
  { code: 'CSE', name: 'Computer Science and Engineering', color: '#0056b3' },
  { code: 'ECE', name: 'Electronics and Communication Engineering', color: '#28a745' },
  { code: 'MECH', name: 'Mechanical Engineering', color: '#dc3545' },
  { code: 'IT', name: 'Information Technology', color: '#17a2b8' },
  { code: 'CIVIL', name: 'Civil Engineering', color: '#ffc107' },
  { code: 'EEE', name: 'Electrical and Electronics Engineering', color: '#6f42c1' },
  { code: 'AI-DS', name: 'Artificial Intelligence and Data Science', color: '#fd7e14' }
];

// Helper to ensure departments exist in MySQL
const ensureDepartmentsExist = async () => {
  const conn = await pool.getConnection();
  try {
    for (const d of INITIAL_DEPARTMENTS) {
      await conn.query(
        `INSERT INTO departments (code, name, color_code) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE name = VALUES(name), color_code = VALUES(color_code)`,
        [d.code, d.name, d.color]
      );
    }
  } finally {
    conn.release();
  }
};

// Helper to create or update user account in MySQL
const createOrUpdateUser = async ({ username, email, password, role, deptCode }) => {
  const conn = await pool.getConnection();
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [existing] = await conn.query(
      'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username, email]
    );

    let userId;
    if (existing[0]) {
      userId = existing[0].id;
      await conn.query(
        'UPDATE users SET username = ?, email = ?, password_hash = ?, role = ?, is_active = 1 WHERE id = ?',
        [username, email, passwordHash, role, userId]
      );
      console.log(`[OK] Updated existing account: ${username} (${email}) - Role: ${role}`);
    } else {
      const [res] = await conn.query(
        'INSERT INTO users (username, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
        [username, email, passwordHash, role]
      );
      userId = res.insertId;
      console.log(`[OK] Created new account: ${username} (${email}) - Role: ${role}`);
    }

    // Link coordinator user ID to department
    if (role === 'Coordinator' && deptCode) {
      const [depts] = await conn.query('SELECT id FROM departments WHERE code = ? LIMIT 1', [deptCode]);
      if (depts[0]) {
        await conn.query('UPDATE departments SET coordinator_user_id = ? WHERE id = ?', [userId, depts[0].id]);
        console.log(`     -> Linked Coordinator ${username} to Department ${deptCode} (Dept ID: ${depts[0].id})`);
      }
    }

    return userId;
  } finally {
    conn.release();
  }
};

// Preset Provisioning Mode
const runPresetProvisioning = async () => {
  const defaultPassword = process.env.INITIAL_ACCOUNT_PASSWORD || 'Password@123';

  console.log('\n============================================================');
  console.log(' NEC SPORTS SYSTEM - INITIAL ACCOUNT PROVISIONING');
  console.log('============================================================\n');

  await ensureDepartmentsExist();

  // 1. Two-Purpose Admin Accounts
  console.log('--- 1. Provisioning Two-Purpose Admin Logins ---');
  await createOrUpdateUser({
    username: 'sys_admin',
    email: 'sys.admin@nec.edu.in',
    password: process.env.ADMIN_PASSWORD || defaultPassword,
    role: 'Admin'
  });

  await createOrUpdateUser({
    username: 'sports_admin',
    email: 'sports.admin@nec.edu.in',
    password: process.env.SPORTS_ADMIN_PASSWORD || defaultPassword,
    role: 'Admin'
  });

  // 2. Department Coordinator Accounts
  console.log('\n--- 2. Provisioning Department Coordinators ---');
  const coordinators = [
    { username: 'coord_cse', email: 'coord.cse@nec.edu.in', deptCode: 'CSE' },
    { username: 'coord_ece', email: 'coord.ece@nec.edu.in', deptCode: 'ECE' },
    { username: 'coord_mech', email: 'coord.mech@nec.edu.in', deptCode: 'MECH' },
    { username: 'coord_it', email: 'coord.it@nec.edu.in', deptCode: 'IT' },
    { username: 'coord_civil', email: 'coord.civil@nec.edu.in', deptCode: 'CIVIL' },
    { username: 'coord_eee', email: 'coord.eee@nec.edu.in', deptCode: 'EEE' },
    { username: 'coord_aids', email: 'coord.aids@nec.edu.in', deptCode: 'AI-DS' }
  ];

  for (const c of coordinators) {
    await createOrUpdateUser({
      username: c.username,
      email: c.email,
      password: defaultPassword,
      role: 'Coordinator',
      deptCode: c.deptCode
    });
  }

  console.log('\n============================================================');
  console.log(' PROVISIONED CREDENTIALS SUMMARY');
  console.log('============================================================');
  console.log(' Admin 1 (System Admin):   username = sys_admin     | pass = ' + defaultPassword);
  console.log(' Admin 2 (Sports Admin):   username = sports_admin  | pass = ' + defaultPassword);
  console.log(' Department Coordinators:  username = coord_cse, coord_ece, coord_mech...');
  console.log('                           pass = ' + defaultPassword);
  console.log('============================================================\n');
};

// Interactive Terminal CLI Mode
const runInteractiveMode = async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  console.log('\n============================================================');
  console.log(' INTERACTIVE TERMINAL ACCOUNT CREATOR TOOL');
  console.log('============================================================\n');

  try {
    await ensureDepartmentsExist();

    console.log('Select Account Role:');
    console.log('  1. System Administrator (Admin)');
    console.log('  2. College Team & Sports Administrator (Admin)');
    console.log('  3. Department Coordinator (Coordinator)');
    console.log('  4. Team Captain (Captain)');
    console.log('  5. Student Athlete (Player)\n');

    const roleChoice = await question('Enter choice (1-5): ');
    let role = 'Admin';
    if (roleChoice.trim() === '3') role = 'Coordinator';
    else if (roleChoice.trim() === '4') role = 'Captain';
    else if (roleChoice.trim() === '5') role = 'Player';

    const username = await question('Enter Username: ');
    const email = await question('Enter Email: ');
    const password = await question('Enter Password: ');

    let deptCode = '';
    if (role === 'Coordinator') {
      deptCode = await question('Enter Department Code (CSE / ECE / MECH / IT / CIVIL / EEE / AI-DS): ');
    }

    if (!username.trim() || !email.trim() || !password.trim()) {
      console.error('\n[ERROR] Username, email, and password are required.');
      rl.close();
      process.exit(1);
    }

    await createOrUpdateUser({
      username: username.trim(),
      email: email.trim(),
      password: password.trim(),
      role,
      deptCode: deptCode.trim().toUpperCase()
    });

    console.log(`\n[SUCCESS] Successfully provisioned ${role} account for "${username}"!`);
  } catch (err) {
    console.error('\n[ERROR] Account creation failed:', err);
  } finally {
    rl.close();
    process.exit(0);
  }
};

// Main Entry
const main = async () => {
  const args = process.argv.slice(2);
  const isInteractive = args.includes('--interactive') || args.includes('-i');

  if (isInteractive) {
    await runInteractiveMode();
  } else {
    await runPresetProvisioning();
    process.exit(0);
  }
};

main();
