import type { ErrorRequestHandler, RequestHandler } from 'express';
import { MulterError } from 'multer';
import { QueryFailedError } from 'typeorm';
import { env, isProd } from '../config/env';
import { HttpError } from '../utils/http-error';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(HttpError.notFound('المسار غير موجود'));
};

function normalize(err: unknown): HttpError | null {
  if (err instanceof HttpError) return err;

  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const mb = Math.round(env.UPLOAD_MAX_BYTES / 1024 / 1024);
      return HttpError.badRequest(`حجم الصورة يجب ألا يتجاوز ${mb} ميغابايت`);
    }
    return HttpError.badRequest('تعذر رفع الملف');
  }

  if (err instanceof QueryFailedError) {
    const code = (err.driverError as { code?: string } | undefined)?.code;
    if (code === '23505') return HttpError.conflict('هذه القيمة مستخدمة مسبقاً', 'DUPLICATE');
    if (code === '22P02') return HttpError.notFound();
  }

  // body-parser: malformed JSON or oversized body.
  const type = (err as { type?: string } | null)?.type;
  if (type === 'entity.parse.failed') return HttpError.badRequest('صيغة البيانات غير صالحة');
  if (type === 'entity.too.large') return new HttpError(413, 'PAYLOAD_TOO_LARGE', 'البيانات المرسلة كبيرة جداً');

  return null;
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const known = normalize(err);
  if (known) {
    res.status(known.status).json({
      error: { code: known.code, message: known.message, ...(known.details !== undefined ? { details: known.details } : {}) },
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'حدث خطأ غير متوقع، حاول مرة أخرى',
      ...(isProd ? {} : { details: err instanceof Error ? err.stack : err }),
    },
  });
};
