/**
 * モック版Storage Adapter（開発・テスト用）
 * Windows環境での動作確認用
 */

import type {
  StorageAdapter,
  StorageFile,
  UploadOptions,
  GetSignedUrlOptions,
} from './types';

interface MockFile {
  path: string;
  content: Buffer;
  contentType: string;
  uploadedAt: Date;
  size: number;
}

export class MockStorageAdapter implements StorageAdapter {
  private files = new Map<string, Map<string, MockFile>>();
  private shouldFailPing = false;

  constructor(options?: { shouldFailPing?: boolean }) {
    this.shouldFailPing = options?.shouldFailPing || false;
  }

  async ping(): Promise<boolean> {
    if (this.shouldFailPing) {
      return false;
    }

    // 軽微な遅延をシミュレート
    await new Promise((resolve) => setTimeout(resolve, 10));
    return true;
  }

  async uploadFile(
    bucket: string,
    path: string,
    file: File | Buffer | ArrayBuffer,
    options?: UploadOptions
  ): Promise<string> {
    if (!this.files.has(bucket)) {
      this.files.set(bucket, new Map());
    }

    const bucketFiles = this.files.get(bucket)!;

    let content: Buffer;
    let size: number;
    let type: string;

    if (file instanceof Buffer) {
      content = file;
      size = file.length;
      type = options?.contentType || 'application/octet-stream';
    } else if (file instanceof ArrayBuffer) {
      content = Buffer.from(file);
      size = file.byteLength;
      type = options?.contentType || 'application/octet-stream';
    } else {
      // File オブジェクトの場合（ブラウザ環境）
      content = Buffer.from(await (file as File).arrayBuffer());
      size = (file as File).size;
      type =
        (file as File).type ||
        options?.contentType ||
        'application/octet-stream';
    }

    const mockFile: MockFile = {
      path,
      content,
      contentType: type,
      uploadedAt: new Date(),
      size,
    };

    bucketFiles.set(path, mockFile);
    return path;
  }

  async getSignedUrl(
    bucket: string,
    path: string,
    options?: GetSignedUrlOptions
  ): Promise<string> {
    const bucketFiles = this.files.get(bucket);
    if (!bucketFiles || !bucketFiles.has(path)) {
      throw new Error(`File not found: ${bucket}/${path}`);
    }

    // モック用の署名付きURL（実際には使用できない）
    const expiresIn = options?.expiresIn || 3600;
    const expiry = Date.now() + expiresIn * 1000;
    return `https://mock-storage.example.com/${bucket}/${path}?expires=${expiry}&signature=mock-signature`;
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const bucketFiles = this.files.get(bucket);
    if (bucketFiles) {
      bucketFiles.delete(path);
    }
  }

  async createBucket(bucket: string): Promise<void> {
    if (!this.files.has(bucket)) {
      this.files.set(bucket, new Map());
    }
  }

  async listFiles(bucket: string, prefix?: string): Promise<StorageFile[]> {
    const bucketFiles = this.files.get(bucket);
    if (!bucketFiles) {
      return [];
    }

    const files: StorageFile[] = [];
    for (const [path, file] of bucketFiles.entries()) {
      if (!prefix || path.startsWith(prefix)) {
        files.push({
          name: path.split('/').pop() || path,
          size: file.size,
          lastModified: file.uploadedAt,
          contentType: file.contentType,
        });
      }
    }

    // 最新順でソート
    return files.sort(
      (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
    );
  }

  // テスト用のヘルパーメソッド
  setFailPing(shouldFail: boolean): void {
    this.shouldFailPing = shouldFail;
  }

  clearFiles(): void {
    this.files.clear();
  }

  getFile(bucket: string, path: string): MockFile | undefined {
    return this.files.get(bucket)?.get(path);
  }

  getBuckets(): string[] {
    return Array.from(this.files.keys());
  }
}
