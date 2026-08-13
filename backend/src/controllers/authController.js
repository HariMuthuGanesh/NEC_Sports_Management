import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getJwtSecret } from '../middleware/authMiddleware.js';

// Pre-seeded secure users for demonstration
const MOCK_USERS_DB = [
    {
        userId: 'ADM01',
        name: 'Dr. K. Arumugam',
        passwordHash: bcrypt.hashSync('admin123', 10),
        role: 'Director of Physical Education',
        department: 'Sports Office',
        email: 'pe.director@nec.edu.in'
    },
    {
        userId: '2112045',
        name: 'Rahul Sharma',
        passwordHash: bcrypt.hashSync('coord123', 10),
        role: 'Department Sports Coordinator',
        department: 'CSE',
        email: 'rahul.21cse@nec.edu.in'
    },
    {
        userId: '2114012',
        name: 'Priya Patel',
        passwordHash: bcrypt.hashSync('player123', 10),
        role: 'Student Athlete',
        department: 'MECH',
        email: 'priya.21mech@nec.edu.in'
    }
];

export const loginUser = async (req, res) => {
    try {
        const { userId, password, role } = req.body;

        if (!userId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Validation Error: User ID and password are required.'
            });
        }

        const user = MOCK_USERS_DB.find(u => u.userId.toLowerCase() === String(userId).trim().toLowerCase());

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid Credentials: User ID not found.'
            });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid Credentials: Incorrect password.'
            });
        }

        const activeRole = role || user.role;

        // Sign JWT Token with 24-hour expiration
        const token = jwt.sign(
            {
                userId: user.userId,
                name: user.name,
                role: activeRole,
                department: user.department
            },
            getJwtSecret(),
            { expiresIn: '24h' }
        );

        return res.status(200).json({
            success: true,
            message: 'Authentication successful.',
            token,
            user: {
                userId: user.userId,
                name: user.name,
                role: activeRole,
                department: user.department,
                email: user.email
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal server security error during authentication.'
        });
    }
};

export const getCurrentUser = async (req, res) => {
    return res.status(200).json({
        success: true,
        user: req.user
    });
};
