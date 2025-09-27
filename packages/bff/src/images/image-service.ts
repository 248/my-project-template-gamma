/**
 * 画像管理サービス
 * 要件 4.1-4.6: 画像管理機能
 * 要件 11.1-11.5: 画像保存の段階的方針
 */

import {
  Image,
  createImage,
  updateImage,
  validateFileUpload,
  validateImage,
  DEFAULT_FILE_VALIDATION_OPTIONS,
  FileValidationOptions,
} from '@template-gamma/core/image';
import { validateUserId } from '@template-gamma/core/user';
import {
  SupabaseAdapter,
  StorageAdapter,
  Logger,
} from '@template-gamma/adapters';
import {
  BffError,
  ValidationError,
  AuthorizationError,
  NotFoundError,
  ERROR_CODES,
} from '../error-handler.js';

/**
 * ページネーション情報
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}

/**
 * 画像一覧結果
 */
export interface ImageList {
  images: Image[];
  pagination: Pagination;
}

/**
 * アップロード結果
 */
export interface UploadResult {
  image: Image;
  uploadUrl?: string;
}

/**
 * 画像ファイル情報
 */
export interface ImageFile {
  filename: string;
  size: number;
  mimeType: string;
  buffer: ArrayBuffer;
}

/**
 * 画像サービスインターフェース
 */
export interface ImageService {
  uploadImage(userId: string, file: ImageFile): Promise<UploadResult>;
  listUserImages(
    userId: string,
    page?: number,
    limit?: number
  ): Promise<ImageList>;
  getImage(userId: string, imageId: string): Promise<Image>;
  deleteImage(userId: string, imageId: string): Promise<void>;
  getImageUrl(userId: string, imageId: string): Promise<string>;
}

/**
 * 画像サービス実装
 */
export class ImageServiceImpl implements ImageService {
  private readonly fileValidationOptions: FileValidationOptions;

  constructor(
    private supabaseAdapter: SupabaseAdapter,
    private storageAdapter: StorageAdapter,
    private logger: Logger,
    fileValidationOptions?: Partial<FileValidationOptions>
  ) {
    this.fileValidationOptions = {
      ...DEFAULT_FILE_VALIDATION_OPTIONS,
      ...fileValidationOptions,
    };
  }

  /**
   * 画像をアップロードする
   * 要件 4.1: 画像アップロード UI を提供する
   * 要件 4.6: 画像をユーザー ID に強固に紐付けて保存する
   */
  async uploadImage(userId: string, file: ImageFile): Promise<UploadResult> {
    this.logger.info(
      { userId, filename: file.filename, size: file.size },
      'Starting image upload'
    );

    try {
      // ユーザーIDの検証
      const userIdErrors = validateUserId(userId);
      if (userIdErrors.length > 0) {
        throw new ValidationError('Invalid user ID', { errors: userIdErrors });
      }

      // ファイルの検証
      const fileErrors = validateFileUpload(
        {
          filename: file.filename,
          size: file.size,
          mimeType: file.mimeType,
        },
        this.fileValidationOptions
      );

      if (fileErrors.length > 0) {
        throw new ValidationError('File validation failed', {
          errors: fileErrors,
        });
      }

      // 画像IDを生成
      const imageId = crypto.randomUUID();

      // 画像レコードを作成
      const image = createImage({
        id: imageId,
        userId,
        filename: file.filename,
        fileSize: file.size,
        mimeType: file.mimeType,
      });

      // 画像レコードの検証
      const imageErrors = validateImage(image);
      if (imageErrors.length > 0) {
        throw new ValidationError('Image record validation failed', {
          errors: imageErrors,
        });
      }

      // データベースに画像レコードを保存
      await this.supabaseAdapter.createImage(image);

      try {
        // ストレージにファイルをアップロード
        const uploadUrl = await this.storageAdapter.uploadFile(
          'user-images',
          image.storagePath,
          file.buffer,
          {
            contentType: file.mimeType,
            metadata: {
              userId,
              imageId,
              originalFilename: file.filename,
            },
          }
        );

        // アップロード成功時、ステータスを更新
        const updatedImage = updateImage(image, { status: 'ready' });
        await this.supabaseAdapter.updateImage(updatedImage);

        this.logger.info(
          { userId, imageId, filename: file.filename },
          'Image uploaded successfully'
        );

        return { image: updatedImage, uploadUrl };
      } catch (uploadError) {
        // アップロード失敗時、ステータスを失敗に更新
        const failedImage = updateImage(image, { status: 'failed' });
        await this.supabaseAdapter.updateImage(failedImage);

        this.logger.error(
          { err: uploadError, userId, imageId },
          'Failed to upload image to storage'
        );

        throw new BffError(
          ERROR_CODES.IMAGE_UPLOAD_FAILED,
          'Failed to upload image to storage'
        );
      }
    } catch (error) {
      this.logger.error(
        { err: error, userId, filename: file.filename },
        'Failed to upload image'
      );

      if (error instanceof ValidationError || error instanceof BffError) {
        throw error;
      }

      throw new BffError(
        ERROR_CODES.IMAGE_UPLOAD_FAILED,
        'Failed to upload image'
      );
    }
  }

  /**
   * ユーザーの画像一覧を取得する
   * 要件 4.3: ユーザー自身に紐づく画像の一覧を最新順で表示する
   */
  async listUserImages(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ImageList> {
    this.logger.info({ userId, page, limit }, 'Listing user images');

    try {
      // ユーザーIDの検証
      const userIdErrors = validateUserId(userId);
      if (userIdErrors.length > 0) {
        throw new ValidationError('Invalid user ID', { errors: userIdErrors });
      }

      // ページネーションパラメータの検証
      if (page < 1) {
        throw new ValidationError('Page must be greater than 0');
      }

      if (limit < 1 || limit > 100) {
        throw new ValidationError('Limit must be between 1 and 100');
      }

      // 画像一覧を取得
      const offset = (page - 1) * limit;
      const { images, total } = await this.supabaseAdapter.getUserImages(
        userId,
        limit,
        offset
      );

      const hasNext = offset + images.length < total;

      const pagination: Pagination = {
        page,
        limit,
        total,
        hasNext,
      };

      this.logger.info(
        { userId, page, limit, total, count: images.length },
        'User images retrieved'
      );

      return { images, pagination };
    } catch (error) {
      this.logger.error(
        { err: error, userId, page, limit },
        'Failed to list user images'
      );

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new BffError(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve user images'
      );
    }
  }

  /**
   * 画像を取得する
   * 要件 4.5: アップロードした本人のみ許可する
   */
  async getImage(userId: string, imageId: string): Promise<Image> {
    this.logger.info({ userId, imageId }, 'Getting image');

    try {
      // ユーザーIDの検証
      const userIdErrors = validateUserId(userId);
      if (userIdErrors.length > 0) {
        throw new ValidationError('Invalid user ID', { errors: userIdErrors });
      }

      if (!imageId) {
        throw new ValidationError('Image ID is required');
      }

      // 画像を取得
      const image = await this.supabaseAdapter.getImage(imageId);

      if (!image) {
        throw new NotFoundError('Image', imageId);
      }

      // 所有者チェック
      if (image.userId !== userId) {
        this.logger.warn(
          { userId, imageId, ownerId: image.userId },
          'User attempted to access image they do not own'
        );
        throw new AuthorizationError(
          'You do not have permission to access this image'
        );
      }

      return image;
    } catch (error) {
      this.logger.error({ err: error, userId, imageId }, 'Failed to get image');

      if (
        error instanceof ValidationError ||
        error instanceof NotFoundError ||
        error instanceof AuthorizationError
      ) {
        throw error;
      }

      throw new BffError(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to retrieve image'
      );
    }
  }

  /**
   * 画像を削除する
   * 要件 4.4: 認証済みユーザーのみ許可する
   */
  async deleteImage(userId: string, imageId: string): Promise<void> {
    this.logger.info({ userId, imageId }, 'Deleting image');

    try {
      // 画像の存在と所有者チェック
      const image = await this.getImage(userId, imageId);

      // ストレージから削除
      try {
        await this.storageAdapter.deleteFile('user-images', image.storagePath);
      } catch (storageError) {
        this.logger.warn(
          {
            err: storageError,
            userId,
            imageId,
            storagePath: image.storagePath,
          },
          'Failed to delete image from storage, continuing with database deletion'
        );
      }

      // データベースから削除
      await this.supabaseAdapter.deleteImage(imageId);

      this.logger.info({ userId, imageId }, 'Image deleted successfully');
    } catch (error) {
      this.logger.error(
        { err: error, userId, imageId },
        'Failed to delete image'
      );

      if (
        error instanceof ValidationError ||
        error instanceof NotFoundError ||
        error instanceof AuthorizationError
      ) {
        throw error;
      }

      throw new BffError(
        ERROR_CODES.IMAGE_DELETE_FAILED,
        'Failed to delete image'
      );
    }
  }

  /**
   * 画像の表示URLを取得する
   * 要件 11.2: 署名付き URL または公開ポリシーで本人のみに可視化する
   */
  async getImageUrl(userId: string, imageId: string): Promise<string> {
    this.logger.info({ userId, imageId }, 'Getting image URL');

    try {
      // 画像の存在と所有者チェック
      const image = await this.getImage(userId, imageId);

      // 画像が表示可能な状態かチェック
      if (image.status !== 'ready') {
        throw new BffError(
          ERROR_CODES.IMAGE_PROCESSING_FAILED,
          `Image is not ready for display. Current status: ${image.status}`
        );
      }

      // 署名付きURLを生成
      const signedUrl = await this.storageAdapter.getSignedUrl(
        'user-images',
        image.storagePath,
        { expiresIn: 3600 } // 1時間
      );

      this.logger.info({ userId, imageId }, 'Image URL generated');

      return signedUrl;
    } catch (error) {
      this.logger.error(
        { err: error, userId, imageId },
        'Failed to get image URL'
      );

      if (
        error instanceof ValidationError ||
        error instanceof NotFoundError ||
        error instanceof AuthorizationError ||
        error instanceof BffError
      ) {
        throw error;
      }

      throw new BffError(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to generate image URL'
      );
    }
  }
}

/**
 * 画像サービスファクトリー
 */
export class ImageServiceFactory {
  static create(
    supabaseAdapter: SupabaseAdapter,
    storageAdapter: StorageAdapter,
    logger: Logger,
    fileValidationOptions?: Partial<FileValidationOptions>
  ): ImageService {
    return new ImageServiceImpl(
      supabaseAdapter,
      storageAdapter,
      logger,
      fileValidationOptions
    );
  }
}
