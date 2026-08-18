import jwt from 'jsonwebtoken';

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET || 'fallback_secret_for_mock_db', {
        expiresIn: '30d',
    });
};

export const loginUser = (req, res) => {
    const { username, password } = req.body;

    // Hardcoded mock users matching frontend behavior
    const MOCK_USERS = [
        { id: 'usr_admin1', username: 'admin', password: 'password123', role: 'admin', name: 'Dr. K. Arumugam' },
        { id: 'usr_coord1', username: 'coord', password: 'password123', role: 'coordinator', name: 'Prof. Ramesh', department: 'CSE' },
        { id: 'usr_player1', username: 'player', password: 'password123', role: 'player', name: 'Rahul Sharma', rollNo: '2112045' },
    ];

    const user = MOCK_USERS.find(u => u.username === username);

    if (user && user.password === password) {
        // Strip password
        const { password: _, ...userInfo } = user;
        
        res.json({
            ...userInfo,
            token: generateToken(user.id, user.role),
        });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
};

export const getCurrentUser = (req, res) => {
    // The protect middleware sets req.user
    res.json(req.user);
};
