import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '../config/securityConfig.js';

const generateToken = (id, role, dept = 'All') => {
    return jwt.sign({ id, role, dept }, JWT_SECRET, {
        expiresIn: '24h', // Reduced from 30d to 24h for enhanced security
        algorithm: 'HS256'
    });
};

// Pre-hashed demo credentials (bcrypt work factor 10)
const SALT = bcrypt.genSaltSync(10);
const MOCK_USERS = [
    {
        id: 'ADM01',
        username: 'admin',
        userId: 'ADM01',
        passwordHash: bcrypt.hashSync('Admin@123', SALT),
        role: 'admin',
        name: 'Dr. K. Arumugam',
        department: 'Sports Office',
        title: 'Director of Physical Education'
    },
    {
        id: '2112045',
        username: 'coord',
        userId: '2112045',
        passwordHash: bcrypt.hashSync('Coord@456', SALT),
        role: 'coordinator',
        name: 'Rahul Sharma',
        department: 'CSE',
        title: 'CSE Sports Coordinator'
    },
    {
        id: '2114012',
        username: 'player',
        userId: '2114012',
        passwordHash: bcrypt.hashSync('Player@789', SALT),
        role: 'player',
        name: 'Priya Patel',
        department: 'MECH',
        title: 'Student Athlete'
    }
];

export const loginUser = (req, res) => {
    const { username, userId, password } = req.body;
    const identifier = (userId || username || '').trim();

    if (!identifier || !password) {
        return res.status(400).json({ message: 'User ID and password are required.' });
    }

    const user = MOCK_USERS.find(u => 
        u.username.toLowerCase() === identifier.toLowerCase() || 
        u.userId.toLowerCase() === identifier.toLowerCase() ||
        u.id.toLowerCase() === identifier.toLowerCase()
    );

    if (user && bcrypt.compareSync(password, user.passwordHash)) {
        // Strip password hash before returning user info
        const { passwordHash: _, ...userInfo } = user;
        
        res.json({
            ...userInfo,
            token: generateToken(user.id, user.role, user.department),
        });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
};

export const getCurrentUser = (req, res) => {
    res.json(req.user);
};
