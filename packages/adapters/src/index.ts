// Supabase Adapter
export {
  SupabaseAdapterImpl,
  MockSupabaseAdapter,
  SupabaseFactory,
} from './supabase/index';
export type {
  SupabaseAdapter,
  SupabaseConfig,
  DatabaseUser,
} from './supabase/index';

// Storage Adapter
export {
  SupabaseStorageAdapter,
  MockStorageAdapter,
  StorageFactory,
  STORAGE_BUCKETS,
} from './storage/index';
export type {
  StorageAdapter,
  StorageFile,
  StorageConfig,
  StorageBucket,
} from './storage/index';

// Logger
export { DevLogger, WorkersLogger, LoggerFactory } from './logger/index';
export type {
  Logger,
  LogContext,
  LoggerConfig,
  LogLevel,
} from './logger/index';

// TraceContext
export { TraceContext } from './trace-context/index';
export type { TraceInfo } from './trace-context/index';

// Import factories for helper functions
import { SupabaseFactory } from './supabase/index';
import { StorageFactory } from './storage/index';
import { LoggerFactory } from './logger/index';

// Factory functions for easy usage
export function createSupabaseAdapter() {
  return SupabaseFactory.create();
}

export function createStorageAdapter() {
  return StorageFactory.create();
}

export function createLogger() {
  return LoggerFactory.createDefault();
}
