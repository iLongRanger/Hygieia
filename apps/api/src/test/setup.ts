beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-signing-min-32-chars';
  process.env.JWT_ISSUER = 'hygieia-test';
  process.env.JWT_AUDIENCE = 'hygieia-api-test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/hygieia_test';
});

afterAll(async () => {
  // Cleanup logic can be added here
});

beforeEach(() => {
  // Reset any global state before each test
});

afterEach(() => {
  // Cleanup after each test
});
