import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

const coordinatorPassword = process.env.DEMO_COORDINATOR_PASSWORD;
const playerPassword = process.env.DEMO_PLAYER_PASSWORD;

if (!coordinatorPassword || !playerPassword) {
    throw new Error('DEMO_COORDINATOR_PASSWORD and DEMO_PLAYER_PASSWORD must be set before provisioning demo accounts.');
}

const accounts = {
    coordinator: {
        username: 'coordinator.demo',
        email: 'coordinator.demo@nec.edu.in',
        password: coordinatorPassword,
        role: 'Coordinator'
    },
    player: {
        username: '2114012',
        email: 'player.demo@nec.edu.in',
        password: playerPassword,
        role: 'Player'
    }
};

const upsertUser = async ({ username, email, password, role }) => {
    const passwordHash = await bcrypt.hash(password, 12);
    const [existing] = await pool.execute(
        'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
        [username, email]
    );

    if (existing[0]) {
        await pool.execute(
            'UPDATE users SET username = ?, email = ?, password_hash = ?, role = ?, is_active = 1 WHERE id = ?',
            [username, email, passwordHash, role, existing[0].id]
        );
        return existing[0].id;
    }

    const [result] = await pool.execute(
        'INSERT INTO users (username, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
        [username, email, passwordHash, role]
    );
    return result.insertId;
};

try {
    const coordinatorId = await upsertUser(accounts.coordinator);
    const playerId = await upsertUser(accounts.player);

    const [departments] = await pool.execute('SELECT id FROM departments ORDER BY id LIMIT 1');
    if (!departments[0]) {
        throw new Error('At least one department is required before provisioning the demo player.');
    }

    const [students] = await pool.execute('SELECT student_id FROM students WHERE user_id = ? OR register_number = ? LIMIT 1', [playerId, '2114012']);
    if (students[0]) {
        await pool.execute(
            'UPDATE students SET user_id = ?, register_number = ?, student_name = ?, department_id = ? WHERE student_id = ?',
            [playerId, '2114012', 'Demo Player', departments[0].id, students[0].student_id]
        );
    } else {
        await pool.execute(
            'INSERT INTO students (user_id, student_name, register_number, department_id, student_type) VALUES (?, ?, ?, ?, ?)',
            [playerId, 'Demo Player', '2114012', departments[0].id, 'Hosteller']
        );
    }

    console.log('Demo accounts provisioned successfully.');
    console.log(`Coordinator user id: ${coordinatorId}; Player user id: ${playerId}`);
} finally {
    await pool.end();
}
