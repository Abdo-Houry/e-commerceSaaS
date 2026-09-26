import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../utils/http-error';

type Schemas = { body?: z.ZodType; query?: z.ZodType; params?: z.ZodType };
type Infer<S extends Schemas, K extends keyof Schemas> = S[K] extends z.ZodType ? z.output<S[K]> : undefined;

export interface HandlerContext<S extends Schemas> {
  body: Infer<S, 'body'>;
  query: Infer<S, 'query'>;
  params: Infer<S, 'params'>;
  req: Request;
  res: Response;
}

function parse(schema: z.ZodType | undefined, value: unknown, part: keyof Schemas): unknown {
  if (!schema) return undefined;
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  // A malformed :id must look exactly like a missing record.
  if (part === 'params') throw HttpError.notFound();
  throw new HttpError(400, 'VALIDATION_ERROR', 'البيانات المدخلة غير صالحة', z.flattenError(result.error).fieldErrors);
}

/**
 * Validates body/query/params with zod, then runs the handler with typed input.
 * A returned value is sent as `{ data }`; return `undefined` after writing the response yourself.
 */
export function handle<S extends Schemas>(
  schemas: S,
  fn: (ctx: HandlerContext<S>) => unknown | Promise<unknown>,
  status = 200,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = {
        body: parse(schemas.body, req.body, 'body'),
        query: parse(schemas.query, req.query, 'query'),
        params: parse(schemas.params, req.params, 'params'),
        req,
        res,
      } as HandlerContext<S>;
      const result = await fn(ctx);
      if (result !== undefined && !res.headersSent) res.status(status).json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}

/** Standalone validation middleware for routes that don't use `handle`. */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.body) req.body = parse(schemas.body, req.body, 'body');
      parse(schemas.query, req.query, 'query');
      parse(schemas.params, req.params, 'params');
      next();
    } catch (err) {
      next(err);
    }
  };
}
