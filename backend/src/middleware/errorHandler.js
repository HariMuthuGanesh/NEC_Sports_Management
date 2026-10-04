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
    const isCsrfError = err.code === 'EBADCSRFTOKEN' || err.message?.toLowerCase().includes('csrf');
    const isProduction = process.env.NODE_ENV === 'production';
    
    // CSRF Error Mapping: expected client security denial (HTTP 403)
    if (isCsrfError) {
        console.warn(`[Security] [Status 403] CSRF rejection on ${req.method} ${req.originalUrl}: ${err.message}`);
        return res.status(403).json({
            success: false,
            error: {
                code: 'CSRF_ERROR',
                message: 'Invalid or missing CSRF token. Please refresh the page.'
            }
        });
    }

    const statusCode = err.status || err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
    
    // Internal server logging (sanitized)
    console.error(`[ErrorHandler] [Status ${statusCode}] ${err.message}`);
    if (!isProduction && err.stack && statusCode >= 500) {
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
        ...(!isProduction && statusCode >= 500 && { stack: err.stack })
    });
};
