import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET, revokeToken } from '../config/securityConfig.js';

const generateToken = (id, role, dept = 'All') => {
    return jwt.sign({ id, role, dept }, JWT_SECRET, {
        expiresIn: '24h',
        algorithm: 'HS256'
    });
};

// Pre-hashed demo credentials (bcrypt work factor 10)
const SALT = bcrypt.genSaltSync(10);
const DUMMY_HASH = bcrypt.hashSync('DummyPassword123!', SALT); // For timing-attack neutralization

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

export const loginUser = async (req, res) => {
    const { username, userId, password } = req.body || {};
    const identifier = (userId || username || '').trim();

    const user = MOCK_USERS.find(u => 
        u.username.toLowerCase() === identifier.toLowerCase() || 
        u.userId.toLowerCase() === identifier.toLowerCase() ||
        u.id.toLowerCase() === identifier.toLowerCase()
    );

    // Timing-attack defense: always run bcrypt comparison even if user doesn't exist
    const hashToCompare = user ? user.passwordHash : DUMMY_HASH;
    const isPasswordValid = bcrypt.compareSync(password, hashToCompare);

    if (user && isPasswordValid) {
        // Strip sensitive password hash before returning
        const { passwordHash: _, ...userInfo } = user;
        const token = generateToken(user.id, user.role, user.department);
        
        return res.json({
            success: true,
            data: {
                ...userInfo,
                token
            }
        });
    }

    // Uniform failure message prevents user enumeration
    return res.status(401).json({ 
        success: false, 
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials provided.' } 
    });
};

export const logoutUser = (req, res) => {
    if (req.token && req.user) {
        revokeToken(req.token, req.user.exp);
    }
    return res.json({ 
        success: true, 
        message: 'Successfully logged out and session revoked.' 
    });
};

export const getCurrentUser = (req, res) => {
    return res.json({
        success: true,
        data: req.user
    });
};
