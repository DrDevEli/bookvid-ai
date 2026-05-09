# BookVid AI Testing Suite

This directory contains comprehensive tests for the BookVid AI personal project transformation. The testing suite covers unit tests, integration tests, and deployment configuration tests.

## Test Structure

### Unit Tests (`__tests__/`)
- **setup.js**: Global test configuration and utilities
- **controllers/__tests__/**: API controller tests with mocked dependencies
- **models/__tests__/**: Database model and repository tests
- **services/__tests__/**: Business logic and AI service integration tests
- **utils/__tests__/**: Utility function tests (file storage, validation, etc.)
- **middleware/__tests__/**: Middleware tests (authentication, file upload, etc.)

### Integration Tests (`__tests__/integration/`)
- **api.test.js**: End-to-end API endpoint testing
- **errorHandling.test.js**: Edge cases and error handling scenarios

### Deployment Tests (`__tests__/deployment/`)
- **docker.test.js**: Docker configuration and deployment script validation

## Test Coverage

### Core Functionality (Unit Tests)
✅ **Authentication System**
- User registration, login, profile management
- JWT token generation and validation
- Password hashing and verification
- Input validation and error handling

✅ **Database Operations**
- User, Book, Video, and Template repositories
- CRUD operations with SQLite
- Data validation and constraints
- Relationship management and cascading deletes

✅ **File Storage System**
- File upload and validation
- Storage directory management
- File type and size validation
- Security checks (dangerous extensions, path traversal)
- Cleanup and maintenance operations

✅ **AI Service Integrations**
- Script generation with OpenAI API (mocked)
- Voice synthesis with ElevenLabs API (mocked)
- Media selection and template processing
- Error handling for API failures and quota limits

✅ **File Upload Middleware**
- Multi-part form handling
- File type validation
- Size limit enforcement
- Security validation (malicious files, path traversal)

### Integration Tests
✅ **API Endpoints**
- Authentication flows (register, login, profile)
- Book management (CRUD operations)
- Video generation workflow
- File upload endpoints
- Template management
- Error responses and status codes

✅ **Video Generation Workflow**
- Complete end-to-end video generation process
- Error handling at each stage
- Progress tracking and cancellation
- Retry logic with exponential backoff
- Resource cleanup

✅ **Error Handling and Edge Cases**
- Input validation edge cases (long strings, special characters, Unicode)
- Authentication edge cases (malformed tokens, expired tokens)
- File upload edge cases (large files, dangerous extensions)
- Database edge cases (concurrent requests, connection failures)
- Rate limiting and resource management
- Security testing (XSS prevention, SQL injection prevention)

### Deployment Configuration Tests
✅ **Docker Configuration**
- Dockerfile validation and security checks
- Docker Compose configuration (dev vs prod)
- Environment variable management
- Build process validation
- Security configurations (non-root user, file permissions)

✅ **Deployment Scripts**
- Platform-specific deployment scripts (Heroku, Railway, Render)
- Script permissions and shebang validation
- Environment configuration validation

## Test Configuration

### Server Tests (Jest)
- **Framework**: Jest with Supertest for API testing
- **Database**: In-memory SQLite for isolated testing
- **Mocking**: Comprehensive mocking of external services (OpenAI, ElevenLabs)
- **Coverage**: Configured to track coverage across controllers, models, services, and utils
- **Setup**: Global test utilities and environment configuration

### Client Tests (Vitest)
- **Framework**: Vitest with React Testing Library
- **Environment**: jsdom for DOM simulation
- **Mocking**: localStorage, sessionStorage, fetch, and browser APIs
- **Setup**: Global test utilities and component testing helpers

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Suites
```bash
# Unit tests only
npm test -- --testPathPattern="__tests__/(?!integration|deployment)"

# Integration tests only
npm test -- --testPathPattern="integration"

# Deployment tests only
npm test -- --testPathPattern="deployment"

# Specific service tests
npm test -- --testPathPattern="services/__tests__/scriptGeneration.test.js"
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

## Test Utilities

### Global Test Utilities (`setup.js`)
- `createTestUser()`: Creates mock user data
- `createTestBook()`: Creates mock book data
- `createTestVideo()`: Creates mock video data
- `createMockFile()`: Creates mock file upload data
- `delay(ms)`: Utility for async testing

### Mock Services
- **API Key Validation**: Mocked to avoid requiring real API keys
- **External APIs**: OpenAI and ElevenLabs APIs are mocked with realistic responses
- **File System**: Temporary test directories with automatic cleanup
- **Database**: In-memory SQLite with migrations and seeded data

## Best Practices Implemented

### Test Isolation
- Each test runs in isolation with fresh mocks
- Database state is reset between tests
- Temporary files are cleaned up automatically

### Realistic Testing
- Tests use realistic data structures and API responses
- Error conditions are tested with appropriate error types
- Edge cases cover real-world scenarios

### Security Testing
- Input validation testing with malicious inputs
- File upload security testing
- Authentication and authorization testing
- XSS and SQL injection prevention testing

### Performance Testing
- Concurrent request handling
- Rate limiting validation
- Memory usage edge cases
- Large payload handling

## Continuous Integration

The test suite is designed to run in CI/CD environments with:
- No external dependencies (all APIs mocked)
- Deterministic test results
- Comprehensive error reporting
- Coverage reporting integration

## Future Enhancements

Potential areas for test expansion:
- End-to-end browser testing with Playwright
- Performance benchmarking tests
- Load testing for concurrent users
- Visual regression testing for UI components
- API contract testing with OpenAPI schemas