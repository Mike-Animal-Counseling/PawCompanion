export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message = 'Invalid request', details) => new AppError(400, 'BAD_REQUEST', message, details);
export const unauthorized = (message = 'Authentication required') => new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'You do not have access to this resource') => new AppError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Resource not found') => new AppError(404, 'NOT_FOUND', message);
export const conflict = (message = 'The request conflicts with the current state', details) => new AppError(409, 'CONFLICT', message, details);
export const unprocessable = (message = 'Please check the highlighted fields', details) => new AppError(422, 'VALIDATION_ERROR', message, details);
export const tooManyRequests = (message = 'Too many requests') => new AppError(429, 'RATE_LIMITED', message);
export const unavailable = (message = 'Service temporarily unavailable') => new AppError(503, 'UNAVAILABLE', message);

export function asyncHandler(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
