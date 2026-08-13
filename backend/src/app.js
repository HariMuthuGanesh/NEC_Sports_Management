import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/authRoutes.js';

const app = express();

// 1. Universal Security Headers (OWASP standards via Helmet)
app.use(helmet({
    contentSecurityPolicy: false, // Customized for API / frontend integration
    crossOriginEmbedderPolicy: false
}));

// 2. Restricted CORS Configuration
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'https://nec.edu.in'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Payload Limit Protection (Defend against Denial-of-Service / Buffer Payload attacks)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 4. Security & Auth API Routes
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.json({
        system: 'NEC Sports Management System API',
        security: 'OWASP Compliant Security Headers & JWT Enabled',
        status: 'Active'
    });
});

export default app;
