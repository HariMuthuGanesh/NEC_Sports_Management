/**
 * Global Security-Aware Error Handler
 * Defends against information disclosure, stack trace leakage, and internal path exposure.
 */

export const notFound = (req, res, next) => {
    const error = new Error(`Resource Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404);
    next(error);
};

export const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Internal server logging (sanitized)
    console.error(`[ErrorHandler] [Status ${statusCode}] ${err.message}`);
    if (!isProduction && err.stack) {
        console.error(err.stack);
    }
    
    // Client response: Never leak database schemas or system paths
    const clientMessage = (statusCode === 500 && isProduction) 
        ? 'An unexpected internal server error occurred. Please contact the Sports Directorate IT support.' 
        : err.message;

    res.status(statusCode).json({
        success: false,
        error: {
            code: err.code || (statusCode === 404 ? 'NOT_FOUND' : statusCode === 403 ? 'FORBIDDEN' : statusCode === 401 ? 'UNAUTHORIZED' : 'SERVER_ERROR'),
            message: clientMessage
        },
        ...(!isProduction && { stack: err.stack })
    });
};
