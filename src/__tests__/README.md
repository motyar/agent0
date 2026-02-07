# Scheduler Tests

This directory contains comprehensive unit and integration tests for the Agent0 scheduler component.

## Test Coverage

The test suite covers:

### Initialization
- ✅ Empty jobs map on creation
- ✅ Correct config path
- ✅ Loading configuration from file

### Configuration Loading
- ✅ Valid config object structure
- ✅ Proper cron_jobs and wakeup_tasks arrays

### Cron Job Registration
- ✅ Register enabled cron jobs
- ✅ Skip disabled cron jobs
- ✅ Handle invalid cron schedules gracefully

### Wakeup Task Registration
- ✅ Skip disabled wakeup tasks
- ✅ Register future wakeup tasks
- ✅ Skip past wakeup tasks beyond grace period

### Task Execution
- ✅ Execute self_analysis tasks
- ✅ Execute memory_cleanup tasks
- ✅ Execute health_check tasks
- ✅ Execute custom tasks
- ✅ Handle unknown task types
- ✅ Handle task execution errors

### Task Runners
- ✅ Self-analysis logging
- ✅ Memory cleanup logging
- ✅ Health check logging
- ✅ Custom task logging

### Scheduler Control
- ✅ Stop all cron jobs
- ✅ Clear wakeup task timeouts
- ✅ Get status with no tasks
- ✅ Get status with multiple tasks

### Integration Tests
- ✅ Complete lifecycle (initialize → status → stop)
- ✅ Register multiple job types
- ✅ Skip disabled jobs during registration

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

## Test Statistics

- **Total Tests**: 27
- **Test Suites**: 1
- **Status**: ✅ All Passing

## Test Framework

- **Framework**: Jest v29.7.0
- **Environment**: Node.js with ES Modules
- **Features**:
  - Console output mocking
  - Async/await support
  - Comprehensive assertions
  - Integration testing

## Notes

- Tests use the actual `config/scheduler.json` file for integration testing
- Console output is mocked to avoid cluttering test output
- Each test is isolated and cleanup is performed after each test
- Tests cover both happy paths and error scenarios
