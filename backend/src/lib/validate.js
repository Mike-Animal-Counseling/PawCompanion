import { ZodError } from 'zod';
import { unprocessable } from './errors.js';

export function formatZodError(error) {
  const fields = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

/**
 * Validate req.body / req.query / req.params against a zod schema.
 * The parsed (and coerced) value replaces the original input.
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      return next(unprocessable('Please check the highlighted fields', formatZodError(result.error)));
    }
    if (source === 'query') {
      req.query = result.data;
      Object.defineProperty(req, 'validatedQuery', { value: result.data, configurable: true });
    } else {
      req[source] = result.data;
    }
    next();
  };
}

export function isZodError(error) {
  return error instanceof ZodError;
}
