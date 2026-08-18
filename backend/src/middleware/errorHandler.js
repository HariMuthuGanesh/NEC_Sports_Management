/**
 * Global Error Handler
 * Ensures that stack traces are never exposed in production.
 */
export const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

export const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    
    // Log the error internally (Audit Log)
    console.error(`[Error] ${err.message}`);
    
    res.status(statusCode).json({
        message: err.message,
        // Only include stack trace if in development mode
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    });
};
