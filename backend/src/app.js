import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import apiRoutes from './routes/apiRoutes.js';
import { auditLogger } from './middleware/auditMiddleware.js';
import { sanitizeData } from './middleware/sanitizationMiddleware.js';
import { requireCsrfToken } from './middleware/csrfMiddleware.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// 0. Centralized Audit Logging
app.use(auditLogger);

// 1. Universal Security Headers (OWASP standards via Helmet)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://*.nec.edu.in"],
            connectSrc: ["'self'", "http://localhost:*", "https://api.mymemory.translated.net", "https://*.nec.edu.in"],
            frameAncestors: ["'none'"], // Prevent clickjacking
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        }
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000, // 1 year HSTS
        includeSubDomains: true,
        preload: true
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    hidePoweredBy: true
}));

// 2. Restricted CORS Configuration
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'https://nec.edu.in', 'https://*.nec.edu.in'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Client-Version'],
    credentials: true,
    maxAge: 86400 // Cache preflight for 24 hours
}));

// 3. Payload Limit Protection (Defend against Denial-of-Service / Buffer Payload attacks)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 3.5. Architectural Security (Sanitization & CSRF)
app.use(sanitizeData);
app.use(requireCsrfToken);

// 4. Rate Limiting (DDoS Protection)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// 5. Security & Auth API Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.json({
        system: 'NEC Sports Management System API',
        security: 'OWASP Compliant Security Headers, CSRF & JWT Enabled',
        status: 'Active'
    });
});

// 6. Global Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;
