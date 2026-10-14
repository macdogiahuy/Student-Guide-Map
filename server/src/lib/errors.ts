export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly errors: string[] = [],
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message = 'Bad request', errors: string[] = []) {
    return new AppError(400, 'BAD_REQUEST', message, errors);
  }
  static unauthorized(message = 'Unauthorized') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'Forbidden') {
    return new AppError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Not found') {
    return new AppError(404, 'NOT_FOUND', message);
  }
  static conflict(message = 'Conflict') {
    return new AppError(409, 'CONFLICT', message);
  }
  static tooMany(message = 'Too many requests') {
    return new AppError(429, 'TOO_MANY_REQUESTS', message);
  }
  static internal(message = 'Internal server error') {
    return new AppError(500, 'INTERNAL', message);
  }
}
