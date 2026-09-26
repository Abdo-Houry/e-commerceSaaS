export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }

  static badRequest(message: string, details?: unknown) {
    return new HttpError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'يجب تسجيل الدخول') {
    return new HttpError(401, 'UNAUTHORIZED', message);
  }

  static notFound(message = 'غير موجود') {
    return new HttpError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string, code = 'CONFLICT') {
    return new HttpError(409, code, message);
  }

  static unprocessable(message: string, code = 'UNPROCESSABLE', details?: unknown) {
    return new HttpError(422, code, message, details);
  }
}
