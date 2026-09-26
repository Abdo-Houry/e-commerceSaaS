// Loaded with --require before any test file, so config/env.ts sees these values.
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.TEST_DB_NAME ?? 'matjari_test';
process.env.JWT_ACCESS_SECRET ??= 'test-access';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh';
