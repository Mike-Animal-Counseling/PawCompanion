import { AppError } from '../lib/errors.js';
import { isZodError, formatZodError } from '../lib/validate.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
    requestId: req.id,
  });
}

export function errorHandler(error, req, res, _next) {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong. Please try again.';
  let details;

  if (error instanceof AppError) {
    status = error.status;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (isZodError(error)) {
    status = 422;
    code = 'VALIDATION_ERROR';
    message = 'Please check the highlighted fields';
    details = formatZodError(error);
  } else if (error?.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body is too large';
  } else if (error instanceof SyntaxError && 'body' in error) {
    status = 400;
    code = 'INVALID_JSON';
    message = 'Request body must be valid JSON';
  } else if (error?.code === 11000) {
    status = 409;
    code = 'DUPLICATE';
    message = 'That record already exists';
  } else if (error?.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    code = 'FILE_TOO_LARGE';
    message = 'Images must be smaller than 5 MB';
  } else if (error?.code === 'LIMIT_UNEXPECTED_FILE') {
    status = 400;
    code = 'UNEXPECTED_FILE';
    message = 'Unexpected file field';
  }

  if (status >= 500) {
    logger.error('request.failed', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      error: error?.message,
      stack: error?.stack?.split('\n').slice(0, 6).join('\n'),
    });
  }

  if (res.headersSent) return;
  res.status(status).json({
    error: { code, message, ...(details ? { details } : {}) },
    requestId: req.id,
  });
}
