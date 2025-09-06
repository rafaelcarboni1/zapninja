/**
 * @file: index.ts
 * @responsibility: Main entry point for database package
 * @exports: client, queries, migrations, types
 * @imports: shared types
 * @layer: database
 */

// Export database client
export * from './client/index.js';

// Export query builders
export * from './queries/index.js';

// Export migration utilities
export * from './migrations/index.js';

// Export database-specific types
export * from './types/index.js';

// Export repository pattern implementations
export * from './repositories/index.js';

// Export transaction helpers
export * from './transactions/index.js';