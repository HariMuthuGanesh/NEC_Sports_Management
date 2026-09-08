import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import apiRoutes from './routes/apiRoutes.js';
import { auditLogger } from './middleware/auditMiddleware.js';
import { sanitizeData } from './middleware/sanitizationMiddleware.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import galleryRoutes from './routes/galleryRoutes.js';
import path from 'path';


import cookieParser from 'cookie-parser';
import { COOKIE_SECRET } from './config/securityConfig.js';

const app = express();

// 0. Centralized Audit Logging
app.use(auditLogger);

// 1. Universal Security Headers (OWASP standards via Helmet)
app.use(helmet({
    contentSecurityPolicy: false, // Customized for API / frontend integration
    crossOriginEmbedderPolicy: false
}));

// 2. Restricted CORS Configuration (Strict Origins with Credentials)
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'https://nec.edu.in'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Client-Version']
}));

// 3. Cookie Parser & Payload Limit Protection
app.use(cookieParser(COOKIE_SECRET));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 3.5. Input Sanitization
app.use(sanitizeData);

// 4. Rate Limiting (DDoS Protection)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 1000 : 20000, // Generous dev limit
    message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests from this IP, please try again after 15 minutes' } },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// 5. Security & Auth API Routes
app.use('/api/auth', authRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api', apiRoutes);


// 5.5 Serve static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/', (req, res) => {
    res.json({
        system: 'NEC Sports Management System API',
        security: 'OWASP Compliant Security Headers & JWT Enabled',
        status: 'Active'
    });
});

// 6. Global Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;
