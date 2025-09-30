/**
 * ユーザー関連の純粋関数とビジネスロジック
 * 要件 10.1: ユーザー情報の永続化
 */

export interface User {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
}

export interface CreateUserInput {
  id: string;
}

export interface UpdateUserInput {
  id: string;
  lastLoginAt?: Date;
}

export interface UserValidationError {
  field: string;
  message: string;
}

/**
 * 新しいユーザーを作成する純粋関数
 * @param input ユーザー作成入力
 * @returns 作成されたユーザー
 */
export function createUser(input: CreateUserInput): User {
  const now = new Date();

  return {
    id: input.id,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };
}

/**
 * ユーザーの最終ログイン時刻を更新する純粋関数
 * @param user 既存のユーザー
 * @param loginTime ログイン時刻（省略時は現在時刻）
 * @returns 更新されたユーザー
 */
export function updateLastLogin(user: User, loginTime?: Date): User {
  const now = loginTime || new Date();

  return {
    ...user,
    lastLoginAt: now,
    updatedAt: now,
  };
}

/**
 * ユーザーを更新する純粋関数
 * @param user 既存のユーザー
 * @param input 更新入力
 * @returns 更新されたユーザー
 */
export function updateUser(user: User, input: UpdateUserInput): User {
  const now = new Date();

  return {
    ...user,
    lastLoginAt: input.lastLoginAt || user.lastLoginAt,
    updatedAt: now,
  };
}

/**
 * ユーザーIDを検証する純粋関数
 * @param userId ユーザーID
 * @returns 検証結果
 */
export function validateUserId(userId: string): UserValidationError[] {
  const errors: UserValidationError[] = [];

  if (!userId) {
    errors.push({
      field: 'id',
      message: 'ユーザーIDは必須です',
    });
    return errors;
  }

  if (typeof userId !== 'string') {
    errors.push({
      field: 'id',
      message: 'ユーザーIDは文字列である必要があります',
    });
  }

  if (userId.trim().length === 0) {
    errors.push({
      field: 'id',
      message: 'ユーザーIDは空文字列にできません',
    });
  }

  // UUID形式の検証（Supabase Authで使用される形式）
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    errors.push({
      field: 'id',
      message: 'ユーザーIDはUUID形式である必要があります',
    });
  }

  return errors;
}

/**
 * ユーザーオブジェクトを検証する純粋関数
 * @param user ユーザーオブジェクト
 * @returns 検証結果
 */
export function validateUser(user: User): UserValidationError[] {
  const errors: UserValidationError[] = [];

  // ID検証
  errors.push(...validateUserId(user.id));

  // 日付検証
  if (!(user.createdAt instanceof Date) || isNaN(user.createdAt.getTime())) {
    errors.push({
      field: 'createdAt',
      message: '作成日時は有効な日付である必要があります',
    });
  }

  if (!(user.updatedAt instanceof Date) || isNaN(user.updatedAt.getTime())) {
    errors.push({
      field: 'updatedAt',
      message: '更新日時は有効な日付である必要があります',
    });
  }

  if (
    !(user.lastLoginAt instanceof Date) ||
    isNaN(user.lastLoginAt.getTime())
  ) {
    errors.push({
      field: 'lastLoginAt',
      message: '最終ログイン日時は有効な日付である必要があります',
    });
  }

  // 日付の論理的整合性チェック
  if (user.createdAt && user.updatedAt && user.createdAt > user.updatedAt) {
    errors.push({
      field: 'updatedAt',
      message: '更新日時は作成日時以降である必要があります',
    });
  }

  return errors;
}

/**
 * ユーザーがアクティブかどうかを判定する純粋関数
 * @param user ユーザー
 * @param inactiveDays 非アクティブと判定する日数（デフォルト: 30日）
 * @returns アクティブかどうか
 */
export function isUserActive(user: User, inactiveDays: number = 30): boolean {
  const now = new Date();
  const inactiveThreshold = new Date(
    now.getTime() - inactiveDays * 24 * 60 * 60 * 1000
  );

  return user.lastLoginAt > inactiveThreshold;
}

/**
 * ユーザーの登録からの経過日数を計算する純粋関数
 * @param user ユーザー
 * @returns 登録からの経過日数
 */
export function getUserAgeDays(user: User): number {
  const now = new Date();
  const diffTime = now.getTime() - user.createdAt.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * ユーザーの最終ログインからの経過日数を計算する純粋関数
 * @param user ユーザー
 * @returns 最終ログインからの経過日数
 */
export function getDaysSinceLastLogin(user: User): number {
  const now = new Date();
  const diffTime = now.getTime() - user.lastLoginAt.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}
