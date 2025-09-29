'use client';

import { useState, useEffect, useRef } from 'react';
import { clientLogger } from '@/lib/logger';

interface Image {
  id: string;
  filename: string;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
}

interface ImageListResponse {
  images: Image[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}

export default function ImageManagement() {
  const [images, setImages] = useState<Image[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 画像一覧を取得
  const fetchImages = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/images?page=1&limit=20', {
        headers: {
          'x-user-id': '550e8400-e29b-41d4-a716-446655440000', // 実際の実装では認証から取得
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ImageListResponse = await response.json();
      setImages(data.images);
    } catch (err) {
      clientLogger.error({ err }, 'Failed to fetch images');
      setError('画像一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 画像をアップロード
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // ファイルサイズチェック（10MB制限）
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('ファイルサイズは10MB以下にしてください');
      }

      // ファイル形式チェック
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(
          'JPEG、PNG、GIF、WebP形式のファイルのみアップロード可能です'
        );
      }

      const formData = new FormData();
      formData.append('file', file);

      // アップロード進行状況をシミュレート
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const response = await fetch('/api/images', {
        method: 'POST',
        headers: {
          'x-user-id': '550e8400-e29b-41d4-a716-446655440000', // 実際の実装では認証から取得
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const newImage: Image = await response.json();
      setImages((prev) => [newImage, ...prev]);

      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
    } catch (err) {
      clientLogger.error({ err }, 'Failed to upload image');
      setError(
        err instanceof Error ? err.message : '画像のアップロードに失敗しました'
      );
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  // 画像を削除
  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('この画像を削除しますか？')) return;

    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': '550e8400-e29b-41d4-a716-446655440000', // 実際の実装では認証から取得
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      clientLogger.error({ err }, 'Failed to delete image');
      setError(err instanceof Error ? err.message : '画像の削除に失敗しました');
    }
  };

  // ファイルサイズを人間が読みやすい形式に変換
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '不明';

    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
    return `${formatted} ${sizes[i]}`;
  };

  // ステータスに応じた表示
  const getStatusDisplay = (status: Image['status']) => {
    switch (status) {
      case 'uploading':
        return {
          text: 'アップロード中',
          color: 'text-blue-600',
          bg: 'bg-blue-100',
        };
      case 'processing':
        return {
          text: '処理中',
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
        };
      case 'ready':
        return {
          text: '準備完了',
          color: 'text-green-600',
          bg: 'bg-green-100',
        };
      case 'failed':
        return { text: '失敗', color: 'text-red-600', bg: 'bg-red-100' };
      default:
        return { text: '不明', color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  // 初回読み込み
  useEffect(() => {
    fetchImages();
  }, []);

  return (
    <div className="space-y-6">
      {/* アップロードセクション */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="hidden"
          id="image-upload"
        />

        <label
          htmlFor="image-upload"
          className={`cursor-pointer ${isUploading ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <div className="space-y-2">
            <div className="text-gray-400">
              <svg
                className="mx-auto h-12 w-12"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium text-blue-600 hover:text-blue-500">
                クリックしてファイルを選択
              </span>
              <p className="mt-1">JPEG、PNG、GIF、WebP（最大10MB）</p>
            </div>
          </div>
        </label>

        {/* アップロード進行状況 */}
        {isUploading && (
          <div className="mt-4">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              アップロード中... {uploadProgress}%
            </p>
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 画像一覧 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            アップロード済み画像 ({images.length}件)
          </h3>
          <button
            onClick={fetchImages}
            disabled={isLoading}
            className="btn btn-secondary text-sm"
          >
            {isLoading ? '読み込み中...' : '更新'}
          </button>
        </div>

        {isLoading && images.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">読み込み中...</p>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>まだ画像がアップロードされていません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => {
              const statusDisplay = getStatusDisplay(image.status);

              return (
                <div
                  key={image.id}
                  className="border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  {/* 画像プレビュー（モック版では表示しない） */}
                  <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-gray-400 text-center">
                      <svg
                        className="mx-auto h-12 w-12"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="text-xs mt-1">プレビュー</p>
                    </div>
                  </div>

                  {/* 画像情報 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.bg} ${statusDisplay.color}`}
                      >
                        {statusDisplay.text}
                      </span>
                      {image.status === 'ready' && (
                        <button
                          onClick={() => handleDeleteImage(image.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                          title="削除"
                        >
                          削除
                        </button>
                      )}
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <p
                        className="font-medium truncate"
                        title={image.filename}
                      >
                        {image.filename}
                      </p>
                      <p>サイズ: {formatFileSize(image.fileSize)}</p>
                      <p>形式: {image.mimeType}</p>
                      <p>
                        作成:{' '}
                        {new Date(image.createdAt).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
