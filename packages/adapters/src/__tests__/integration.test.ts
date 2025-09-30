import { describe, it, expect } from 'vitest';
import { SupabaseFactory } from '../supabase/supabase-factory';
import { StorageFactory } from '../storage/storage-factory';
import { LoggerFactory } from '../logger/logger-factory';
import { TraceContext } from '../trace-context/trace-context';
import { STORAGE_BUCKETS } from '../storage/types';

describe('Adapters Integration', () => {
  describe('Factory pattern with environment variables', () => {
    it('should create mock adapters when USE_MOCK_* is true', () => {
      const mockEnv = {
        USE_MOCK_SUPABASE: 'true',
        USE_MOCK_STORAGE: 'true',
        LOG_LEVEL: 'info',
        SERVICE_NAME: 'test-service',
        NODE_ENV: 'test',
        APP_VERSION: '1.0.0',
      };

      const supabaseAdapter = SupabaseFactory.create(mockEnv);
      const storageAdapter = StorageFactory.create(mockEnv);
      const logger = LoggerFactory.createDefault(mockEnv);

      expect(supabaseAdapter).toBeDefined();
      expect(storageAdapter).toBeDefined();
      expect(logger).toBeDefined();
    });

    it('should throw error when required config is missing for real adapters', () => {
      const emptyEnv = {
        USE_MOCK_SUPABASE: 'false',
        USE_MOCK_STORAGE: 'false',
      };

      expect(() => SupabaseFactory.create(emptyEnv)).toThrow();
      expect(() => StorageFactory.create(emptyEnv)).toThrow();
    });
  });

  describe('TraceContext integration with Logger', () => {
    it('should generate trace context and use it in logger', () => {
      const traceInfo = TraceContext.generateNewTrace();
      const requestId = TraceContext.generateRequestId();

      const logger = LoggerFactory.createDefault({
        NODE_ENV: 'test',
        LOG_LEVEL: 'info',
      });

      const childLogger = logger.child({
        requestId,
        traceId: traceInfo.traceId,
        spanId: traceInfo.spanId,
      });

      // ログ出力のテスト（実際の出力は確認しないが、エラーが発生しないことを確認）
      expect(() => {
        childLogger.info('Integration test log');
      }).not.toThrow();
    });

    it('should parse and generate traceparent headers', () => {
      const originalTraceparent =
        '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
      const traceInfo = TraceContext.parseTraceparent(originalTraceparent);

      expect(traceInfo.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
      expect(traceInfo.parentId).toBe('00f067aa0ba902b7');

      const childSpan = TraceContext.generateChildSpan(traceInfo);
      const newTraceparent = TraceContext.generateTraceparent(childSpan);

      expect(newTraceparent).toMatch(
        /^00-4bf92f3577b34da6a3ce929d0e0e4736-[0-9a-f]{16}-01$/
      );
    });
  });

  describe('Mock adapters workflow', () => {
    it('should simulate complete user and image workflow', async () => {
      const supabaseAdapter = SupabaseFactory.createMock();
      const storageAdapter = StorageFactory.createMock();
      const logger = LoggerFactory.createDefault({ NODE_ENV: 'test' });

      // ヘルスチェック
      const supabaseHealth = await supabaseAdapter.ping();
      const storageHealth = await storageAdapter.ping();

      expect(supabaseHealth).toBe(true);
      expect(storageHealth).toBe(true);

      logger.info(
        {
          supabaseHealth,
          storageHealth,
        },
        'Health check completed'
      );

      // ユーザー作成
      const newUser = {
        id: 'integration-test-user',
        lastLoginAt: new Date(),
      };

      const createdUser = await supabaseAdapter.createUser(newUser);
      expect(createdUser.id).toBe(newUser.id);

      logger.info({ userId: createdUser.id }, 'User created');

      // 画像アップロード
      await storageAdapter.createBucket(STORAGE_BUCKETS.USER_IMAGES);

      const imageContent = Buffer.from('fake image content');
      const imagePath = `${createdUser.id}/test-image.jpg`;

      const uploadedPath = await storageAdapter.uploadFile(
        STORAGE_BUCKETS.USER_IMAGES,
        imagePath,
        imageContent,
        'image/jpeg'
      );

      expect(uploadedPath).toBe(imagePath);

      logger.info(
        {
          userId: createdUser.id,
          imagePath: uploadedPath,
        },
        'Image uploaded'
      );

      // 署名付きURL生成
      const signedUrl = await storageAdapter.getSignedUrl(
        STORAGE_BUCKETS.USER_IMAGES,
        imagePath
      );

      expect(signedUrl).toContain(imagePath);

      // ファイル一覧取得
      const files = await storageAdapter.listFiles(
        STORAGE_BUCKETS.USER_IMAGES,
        createdUser.id
      );

      expect(files).toHaveLength(1);
      expect(files[0].name).toBe('test-image.jpg');

      logger.info(
        {
          userId: createdUser.id,
          fileCount: files.length,
        },
        'Workflow completed successfully'
      );
    });
  });

  describe('Error handling integration', () => {
    it('should handle adapter failures gracefully', async () => {
      const supabaseAdapter = SupabaseFactory.createMock({
        shouldFailPing: true,
      });
      const storageAdapter = StorageFactory.createMock({
        shouldFailPing: true,
      });
      const logger = LoggerFactory.createDefault({ NODE_ENV: 'test' });

      const supabaseHealth = await supabaseAdapter.ping();
      const storageHealth = await storageAdapter.ping();

      expect(supabaseHealth).toBe(false);
      expect(storageHealth).toBe(false);

      // エラーログの出力テスト
      expect(() => {
        logger.error(
          {
            supabaseHealth,
            storageHealth,
            err: new Error('Health check failed'),
          },
          'Health check failed'
        );
      }).not.toThrow();
    });
  });
});
