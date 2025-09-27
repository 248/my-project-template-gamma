/**
 * 画像関連の純粋関数とビジネスロジック
 * 要件 11.1: 画像保存の段階的方針
 */

export interface Image {
  id: string;
  userId: string;
  filename: string;
  storagePath: string;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  fileSize?: number;
  mimeType?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateImageInput {
  id: string;
  userId: string;
  filename: string;
  fileSize?: number;
  mimeType?: string;
}

export interface UpdateImageInput {
  status?: Image['status'];
  storagePath?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface ImageValidationError {
  field: string;
  message: string;
}

export interface FileValidationOptions {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}

/**
 * デフォルトのファイル検証オプション
 */
export const DEFAULT_FILE_VALIDATION_OPTIONS: FileValidationOptions = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
};

/**
 * 新しい画像レコードを作成する純粋関数
 * @param input 画像作成入力
 * @returns 作成された画像レコード
 */
export function createImage(input: CreateImageInput): Image {
  const now = new Date();

  return {
    id: input.id,
    userId: input.userId,
    filename: input.filename,
    storagePath: generateStoragePath(input.userId, input.id, input.filename),
    status: 'uploading',
    fileSize: input.fileSize,
    mimeType: input.mimeType,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 画像レコードを更新する純粋関数
 * @param image 既存の画像レコード
 * @param input 更新入力
 * @returns 更新された画像レコード
 */
export function updateImage(image: Image, input: UpdateImageInput): Image {
  const now = new Date();

  return {
    ...image,
    status: input.status || image.status,
    storagePath: input.storagePath || image.storagePath,
    fileSize: input.fileSize || image.fileSize,
    mimeType: input.mimeType || image.mimeType,
    updatedAt: now,
  };
}

/**
 * ストレージパスを生成する純粋関数
 * @param userId ユーザーID
 * @param imageId 画像ID
 * @param filename ファイル名
 * @returns ストレージパス
 */
export function generateStoragePath(
  userId: string,
  imageId: string,
  filename: string
): string {
  // ユーザーIDをフォルダ名に含めてセキュリティを確保
  return `${userId}/${imageId}/${filename}`;
}

/**
 * ファイル名から拡張子を取得する純粋関数
 * @param filename ファイル名
 * @returns 拡張子（ドット付き）
 */
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return '';
  }
  return filename.substring(lastDotIndex).toLowerCase();
}

/**
 * MIMEタイプから拡張子を推定する純粋関数
 * @param mimeType MIMEタイプ
 * @returns 拡張子（ドット付き）
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExtension: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
  };

  return mimeToExtension[mimeType.toLowerCase()] || '';
}

/**
 * ファイルアップロードを検証する純粋関数
 * @param file ファイル情報
 * @param options 検証オプション
 * @returns 検証結果
 */
export function validateFileUpload(
  file: {
    filename: string;
    size?: number;
    mimeType?: string;
  },
  options: FileValidationOptions = DEFAULT_FILE_VALIDATION_OPTIONS
): ImageValidationError[] {
  const errors: ImageValidationError[] = [];

  // ファイル名検証
  if (!file.filename || typeof file.filename !== 'string') {
    errors.push({
      field: 'filename',
      message: 'ファイル名は必須です',
    });
    return errors;
  }

  if (file.filename.trim().length === 0) {
    errors.push({
      field: 'filename',
      message: 'ファイル名は空文字列にできません',
    });
  }

  // 拡張子検証
  const extension = getFileExtension(file.filename);
  if (!extension) {
    errors.push({
      field: 'filename',
      message: 'ファイル拡張子が必要です',
    });
  } else if (!options.allowedExtensions.includes(extension)) {
    errors.push({
      field: 'filename',
      message: `許可されていないファイル形式です。許可される形式: ${options.allowedExtensions.join(', ')}`,
    });
  }

  // ファイルサイズ検証
  if (file.size !== undefined) {
    if (file.size <= 0) {
      errors.push({
        field: 'size',
        message: 'ファイルサイズは0より大きい必要があります',
      });
    } else if (file.size > options.maxSizeBytes) {
      const maxSizeMB = Math.round(options.maxSizeBytes / (1024 * 1024));
      errors.push({
        field: 'size',
        message: `ファイルサイズが上限を超えています。上限: ${maxSizeMB}MB`,
      });
    }
  }

  // MIMEタイプ検証
  if (file.mimeType && !options.allowedMimeTypes.includes(file.mimeType)) {
    errors.push({
      field: 'mimeType',
      message: `許可されていないファイル形式です。許可される形式: ${options.allowedMimeTypes.join(', ')}`,
    });
  }

  return errors;
}

/**
 * 画像レコードを検証する純粋関数
 * @param image 画像レコード
 * @returns 検証結果
 */
export function validateImage(image: Image): ImageValidationError[] {
  const errors: ImageValidationError[] = [];

  // ID検証
  if (!image.id || typeof image.id !== 'string') {
    errors.push({
      field: 'id',
      message: '画像IDは必須です',
    });
  }

  // ユーザーID検証
  if (!image.userId || typeof image.userId !== 'string') {
    errors.push({
      field: 'userId',
      message: 'ユーザーIDは必須です',
    });
  }

  // ファイル名検証
  if (!image.filename || typeof image.filename !== 'string') {
    errors.push({
      field: 'filename',
      message: 'ファイル名は必須です',
    });
  }

  // ストレージパス検証
  if (!image.storagePath || typeof image.storagePath !== 'string') {
    errors.push({
      field: 'storagePath',
      message: 'ストレージパスは必須です',
    });
  }

  // ステータス検証
  const validStatuses: Image['status'][] = [
    'uploading',
    'processing',
    'ready',
    'failed',
  ];
  if (!validStatuses.includes(image.status)) {
    errors.push({
      field: 'status',
      message: `無効なステータスです。有効な値: ${validStatuses.join(', ')}`,
    });
  }

  // 日付検証
  if (!(image.createdAt instanceof Date) || isNaN(image.createdAt.getTime())) {
    errors.push({
      field: 'createdAt',
      message: '作成日時は有効な日付である必要があります',
    });
  }

  if (!(image.updatedAt instanceof Date) || isNaN(image.updatedAt.getTime())) {
    errors.push({
      field: 'updatedAt',
      message: '更新日時は有効な日付である必要があります',
    });
  }

  // 日付の論理的整合性チェック
  if (image.createdAt && image.updatedAt && image.createdAt > image.updatedAt) {
    errors.push({
      field: 'updatedAt',
      message: '更新日時は作成日時以降である必要があります',
    });
  }

  return errors;
}

/**
 * 画像が表示可能かどうかを判定する純粋関数
 * @param image 画像レコード
 * @returns 表示可能かどうか
 */
export function isImageDisplayable(image: Image): boolean {
  return image.status === 'ready';
}

/**
 * 画像が処理中かどうかを判定する純粋関数
 * @param image 画像レコード
 * @returns 処理中かどうか
 */
export function isImageProcessing(image: Image): boolean {
  return image.status === 'uploading' || image.status === 'processing';
}

/**
 * 画像が失敗状態かどうかを判定する純粋関数
 * @param image 画像レコード
 * @returns 失敗状態かどうか
 */
export function isImageFailed(image: Image): boolean {
  return image.status === 'failed';
}

/**
 * ファイルサイズを人間が読みやすい形式に変換する純粋関数
 * @param bytes バイト数
 * @returns 人間が読みやすい形式の文字列
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const value = bytes / Math.pow(k, i);
  const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);

  return `${formatted} ${sizes[i]}`;
}

/**
 * 画像のアップロード進行状況を計算する純粋関数
 * @param image 画像レコード
 * @returns 進行状況（0-100）
 */
export function calculateUploadProgress(image: Image): number {
  switch (image.status) {
    case 'uploading':
      return 25;
    case 'processing':
      return 75;
    case 'ready':
      return 100;
    case 'failed':
      return 0;
    default:
      return 0;
  }
}
