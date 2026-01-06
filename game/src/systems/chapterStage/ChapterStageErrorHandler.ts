/**
 * ChapterStageErrorHandler - 章・ステージ管理システムのエラーハンドリング
 * Chapter-Stage Management System Error Handler
 * 
 * エラー種別の処理、エラーメッセージの表示、エラーログの記録を担当します。
 * 要件: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import * as Phaser from 'phaser';
import {
  ChapterStageError,
  ChapterStageErrorInfo,
  ChapterStageResult,
} from '../../types/chapterStage';

/**
 * エラー通知設定
 * Error Notification Configuration
 */
export interface ErrorNotificationConfig {
  /** 通知表示時間（ミリ秒） */
  displayDuration: number;
  /** 通知位置 */
  position: 'top' | 'center' | 'bottom';
  /** 自動非表示フラグ */
  autoHide: boolean;
}

/**
 * エラーコンテキスト
 * Error Context
 */
export interface ErrorContext {
  /** エラータイプ */
  error: ChapterStageError;
  /** エラーメッセージ */
  message: string;
  /** 追加情報 */
  details?: Record<string, unknown>;
  /** タイムスタンプ */
  timestamp: number;
}

/**
 * エラーハンドリング結果
 * Error Handling Result
 */
export interface ErrorHandlingResult {
  /** 処理成功フラグ */
  handled: boolean;
  /** リカバリー実行フラグ */
  recovered: boolean;
  /** リカバリーアクション */
  action?: 'RETURN_TO_TITLE' | 'RETRY' | 'CONTINUE' | 'SHOW_CONDITIONS';
  /** ユーザーメッセージ */
  userMessage?: string;
}

/**
 * エラー通知コールバック
 * Error Notification Callback
 */
export type ErrorNotificationCallback = (
  title: string,
  message: string,
  severity: 'error' | 'warning' | 'info'
) => void;

/**
 * ChapterStageErrorHandler
 * 章・ステージ管理システムのエラーハンドリングクラス
 */
export class ChapterStageErrorHandler {
  /** エラーログ */
  private errorLog: ErrorContext[] = [];
  /** 最大ログサイズ */
  private readonly maxLogSize: number = 100;
  /** 通知設定 */
  private config: ErrorNotificationConfig;
  /** 通知コールバック */
  private notificationCallback?: ErrorNotificationCallback;
  /** Phaserシーン（UI表示用） */
  private scene?: Phaser.Scene;

  /** デフォルト設定 */
  private static readonly DEFAULT_CONFIG: ErrorNotificationConfig = {
    displayDuration: 3000,
    position: 'center',
    autoHide: true,
  };

  /**
   * コンストラクタ
   * @param scene - Phaserシーン（オプション）
   * @param config - 通知設定（オプション）
   */
  constructor(scene?: Phaser.Scene, config?: Partial<ErrorNotificationConfig>) {
    this.scene = scene;
    this.config = { ...ChapterStageErrorHandler.DEFAULT_CONFIG, ...config };
    this.log('ChapterStageErrorHandler initialized');
  }

  /**
   * 通知コールバックを設定
   * @param callback - 通知コールバック関数
   */
  setNotificationCallback(callback: ErrorNotificationCallback): void {
    this.notificationCallback = callback;
  }

  /**
   * エラーを処理
   * @param error - エラータイプ
   * @param context - コンテキスト情報
   * @returns エラーハンドリング結果
   */
  handleError(
    error: ChapterStageError,
    context?: Record<string, unknown>
  ): ErrorHandlingResult {
    const errorContext: ErrorContext = {
      error,
      message: this.getErrorMessage(error),
      details: context,
      timestamp: Date.now(),
    };

    // エラーログに記録
    this.logError(errorContext);

    // エラータイプに応じた処理
    switch (error) {
      // 章管理エラー
      case ChapterStageError.CHAPTER_NOT_FOUND:
        return this.handleChapterNotFound(errorContext);
      case ChapterStageError.CHAPTER_NOT_UNLOCKED:
        return this.handleChapterNotUnlocked(errorContext);
      case ChapterStageError.CHAPTER_ALREADY_STARTED:
        return this.handleChapterAlreadyStarted(errorContext);
      case ChapterStageError.CHAPTER_NOT_INITIALIZED:
        return this.handleChapterNotInitialized(errorContext);

      // パーティ編成エラー
      case ChapterStageError.PARTY_FULL:
        return this.handlePartyFull(errorContext);
      case ChapterStageError.CHARACTER_LOST:
        return this.handleCharacterLost(errorContext);
      case ChapterStageError.CHARACTER_NOT_AVAILABLE:
        return this.handleCharacterNotAvailable(errorContext);
      case ChapterStageError.CHARACTER_DUPLICATE:
        return this.handleCharacterDuplicate(errorContext);
      case ChapterStageError.INVALID_PARTY_COMPOSITION:
        return this.handleInvalidPartyComposition(errorContext);

      // ステージ進行エラー
      case ChapterStageError.STAGE_NOT_FOUND:
        return this.handleStageNotFound(errorContext);
      case ChapterStageError.STAGE_NOT_UNLOCKED:
        return this.handleStageNotUnlocked(errorContext);
      case ChapterStageError.STAGE_ALREADY_COMPLETED:
        return this.handleStageAlreadyCompleted(errorContext);
      case ChapterStageError.STAGE_NOT_INITIALIZED:
        return this.handleStageNotInitialized(errorContext);

      // セーブ・ロードエラー
      case ChapterStageError.SAVE_DATA_CORRUPTED:
        return this.handleSaveDataCorrupted(errorContext);
      case ChapterStageError.SAVE_SLOT_NOT_FOUND:
        return this.handleSaveSlotNotFound(errorContext);
      case ChapterStageError.SAVE_FAILED:
        return this.handleSaveFailed(errorContext);
      case ChapterStageError.LOAD_FAILED:
        return this.handleLoadFailed(errorContext);

      // データエラー
      case ChapterStageError.DATA_LOAD_FAILED:
        return this.handleDataLoadFailed(errorContext);
      case ChapterStageError.DATA_VALIDATION_FAILED:
        return this.handleDataValidationFailed(errorContext);

      default:
        return this.handleUnknownError(errorContext);
    }
  }

  /**
   * ChapterStageResultからエラーを処理
   * @param result - 処理結果
   * @returns エラーハンドリング結果
   */
  handleResult(result: ChapterStageResult): ErrorHandlingResult | null {
    if (result.success) {
      return null;
    }

    if (result.error) {
      return this.handleError(result.error, result.details);
    }

    // エラータイプが指定されていない場合
    return {
      handled: true,
      recovered: false,
      userMessage: result.message || '不明なエラーが発生しました',
    };
  }

  /**
   * エラーログを取得
   * @param limit - 取得件数制限（オプション）
   * @returns エラーログ
   */
  getErrorLog(limit?: number): ErrorContext[] {
    if (limit) {
      return this.errorLog.slice(-limit);
    }
    return [...this.errorLog];
  }

  /**
   * エラーログをクリア
   */
  clearErrorLog(): void {
    this.errorLog = [];
    this.log('Error log cleared');
  }

  // ===== プライベートメソッド: エラーハンドラー =====

  /**
   * 章が見つからないエラーを処理
   */
  private handleChapterNotFound(context: ErrorContext): ErrorHandlingResult {
    this.showNotification(
      'エラー',
      '指定された章が見つかりません。タイトル画面に戻ります。',
      'error'
    );

    return {
      handled: true,
      recovered: false,
      action: 'RETURN_TO_TITLE',
      userMessage: '章が見つかりません',
    };
  }

  /**
   * 章が解放されていないエラーを処理
   */
  private handleChapterNotUnlocked(context: ErrorContext): ErrorHandlingResult {
    this.showNotification(
      '章未解放',
      'この章はまだ解放されていません。前の章をクリアしてください。',
      'warning'
    );

    return {
      handled: true,
      recovered: true,
      action: 'SHOW_CONDITIONS',
      userMessage: '章が解放されていません',
    };
  }

  /**
   * 章が既に開始されているエラーを処理
   */
  private handleChapterAlreadyStarted(context: ErrorContext): ErrorHandlingResult {
    this.showNotification(
      '警告',
      'この章は既に開始されています。',
      'warning'
    );

    return {
      handled: true,
      recovered: true,
      action: 'CONTINUE',
      userMessage: '章は既に開始されています',
    };
  }

  /**
   * 章が初期化されていないエラーを処理
   */
  private handleChapterNotInitialized(context: ErrorContext): ErrorHandlingResult {
    this.showNotification(
      'エラー',
      '章が初期化されていません。タイトル画面に戻ります。',
      'error'
    );

    return {
      handled: true,
      recovered: false,
      action: 'RETURN_TO_TITLE',
      userMessage: '章が初期化されていません',
    };
  }

  /**
   * パーティが満員エラーを処理
   */
  private handlePartyFull(context: ErrorContext): ErrorHandlingResult {
    this.showNotification(
      'パーティ満員',
      'パーティが満員です（最大6人）。他のキャラクターを除外してください。',
      'warning'
    );

    return {
      handled: true,
      recovered: true,
      action: 'CONTINUE',
      userMessage: 'パーティが満員です（最大6人）',
    };
  }

  /**
   * キャラクターがロスト状態エラーを処理
   */
  private handleCharacterLost(context: ErrorContext): ErrorHandlingResult {
    const characterId = context.details?.characterId as string | undefined;
    const message = characterId
      ? `${characterId}は章内で使用不可です`
      : 'このキャラクターは章内で使用不可です';

    this.showNotification('キャラクター使用不可', message, 'warning');

    return {
      handled: true,
      recovered: true,
      action: 'CONTINUE',
      userMessage: message,
    };
  }

  /**
   * キャラクターが利用不可エラーを処理
   */
  private handleCharacterNotAvailable(context: ErrorContext): ErrorHandlingResult {
    this.showNotification(
      'キャラクター利用不可',
      'このキャラクターは現在利用できません。',
      'warning'
    );

    return {
      handled: true,
      recovered: true,
      action: 'CONTINUE',
      userMessage: 'キャラクターが利用できません',
    };
  }

  /**
   * キャラクターが重複エラーを処理
   */
  private handleCharacterDuplicate(context: ErrorContext): ErrorHandlingResult {
    this.showNotification(
      'キャラクター重複',
      'このキャラクターは既にパーティに含まれています。',
      'warning'
    );

    return {
      handled: true,
      recovered: true,
      action: 'CONTINUE',
      userMessage: 'キャラクターが重複しています',
    };
  }

  /**
   * 無効なパーティ編成エラーを処理
   */
  private handleInvalidPartyComposition(context: ErrorContext): ErrorHandlingResult {
    const details = context.details?.errors as string[] | undefined;
    const message = details && details.length > 0
      ? `パーティ編成が無効です: ${details.join(', ')}`
      : 'パーティ編成が無効です。';

    this.showNotification('無効なパーティ編成', message, 'error');

    return {
      handled: true,
      recovered: true,
      action: 'CONTINUE',
      userMessage: message,
    };
  }

  /**
   * ステージが見つからないエラーを処理
   */
  private handleStageNotFound(context: ErrorContext): ErrorHandlingResult {
    this.showNotification(
      'エラー',
      '指定されたステージが見つかりません。',
      'error'
    );

    return {
      handled: true,
      recovered: false,
      action: 'RETURN_TO_TITLE',
      userMessage: 'ステージが見つかりません',
    };
  }

  /**
   * ステージが解放されていないエラーを処理
   */
  private handleStageNotUnlocked(context: ErrorContext): ErrorHandlingResult {
    const stageId = context.details?.stageId as string | undefined;
    const requiredStages = context.details?.requiredStageIds as string[] | undefined;

    let message = 'このステージはまだ解放されていません。';
    if (requiredStages && requiredStages.length > 0) {
      message += `\n必要なステージ: ${requiredStages.join(', ')}`;
    }

    this.showNotification('ステージ未解放', message, 'warning');

    return {
      handled: true,
      recovered: true,
      action: 'SHOW_CONDITIONS',
      userMessage: 'ステージが解放されていません',
    };
  }

  /**
   * ステージが既に完了しているエラーを処理
   */
  private handleStageAlreadyCompleted(context: ErrorContext): ErrorHandlingResult {
    this.showNotification(
      '情報',
      'このステージは既にクリア済みです。',
      'info'
    );

    return {
      handled: true,
      recovered: true,
      action: 'CONTINUE',
      userMessage: 'ステージは既にクリア済みです',
    };
  }

  /**
   * ステージが初期化されていないエラーを処理
   */
  private handleStageNotInitialized(context: ErrorContext): ErrorHandlingResult {
    this.showNotification(
      'エラー',
      'ステージが初期化されていません。タイトル画面に戻ります。',
      'error'
    );

    return {
      handled: true,
      recovered: false,
      action: 'RETURN_TO_TITLE',
      userMessage: 'ステージが初期化されていません',
    };
  }

  /**
   * セーブデータが破損しているエラーを処理
   */
  private handleSaveDataCorrupted(context: ErrorContext): ErrorHandlingResult {
    this.showNotification(
      'セーブデータエラー',
      'セーブデータが破損しています。タイトル画面に戻ります。',
      'error'
    );

    return {
      handled: true,
      recovered: false,
      action: 'RETURN_TO_TITLE',
      userMessage: 'セーブデータが破損しています',
    };
  }

  /**
   * セーブスロットが見つからないエラーを処理
   */
  private handleSaveSlotNotFound(context: ErrorContext): ErrorHandlingResult {
    const slotId = context.details?.slotId as number | undefined;
    const message = slotId !== undefined
      ? `セーブスロット${slotId}が見つかりません。`
      : 'セーブスロットが見つかりません。';

    this.showNotification('セーブスロットエラー', message, 'error');

    return {
      handled: true,
      recovered: true,
      action: 'CONTINUE',
      userMessage: message,
    };
  }

  /**
   * 保存失敗エラーを処理
   */
  private handleSaveFailed(context: ErrorContext): ErrorHandlingResult {
    this.showNotification(
      '保存失敗',
      'データの保存に失敗しました。もう一度お試しください。',
      'error'
    );

    return {
      handled: true,
      recovered: true,
      action: 'RETRY',
      userMessage: 'データの保存に失敗しました',
    };
  }

  /**
   * 読み込み失敗エラーを処理
   */
  private handleLoadFailed(context: ErrorContext): ErrorHandlingResult {
    this.showNotification(
      '読み込み失敗',
      'データの読み込みに失敗しました。タイトル画面に戻ります。',
      'error'
    );

    return {
      handled: true,
      recovered: false,
      action: 'RETURN_TO_TITLE',
      userMessage: 'データの読み込みに失敗しました',
    };
  }

  /**
   * データ読み込み失敗エラーを処理
   */
  private handleDataLoadFailed(context: ErrorContext): ErrorHandlingResult {
    const dataType = context.details?.dataType as string | undefined;
    const message = dataType
      ? `${dataType}データの読み込みに失敗しました。`
      : 'データの読み込みに失敗しました。';

    this.showNotification('データ読み込みエラー', message, 'error');

    return {
      handled: true,
      recovered: false,
      action: 'RETURN_TO_TITLE',
      userMessage: message,
    };
  }

  /**
   * データ検証失敗エラーを処理
   */
  private handleDataValidationFailed(context: ErrorContext): ErrorHandlingResult {
    const validationErrors = context.details?.validationErrors as string[] | undefined;
    let message = 'データの検証に失敗しました。';
    if (validationErrors && validationErrors.length > 0) {
      message += `\n詳細: ${validationErrors.join(', ')}`;
    }

    this.showNotification('データ検証エラー', message, 'error');

    return {
      handled: true,
      recovered: false,
      action: 'RETURN_TO_TITLE',
      userMessage: 'データの検証に失敗しました',
    };
  }

  /**
   * 不明なエラーを処理
   */
  private handleUnknownError(context: ErrorContext): ErrorHandlingResult {
    this.showNotification(
      'エラー',
      '予期しないエラーが発生しました。',
      'error'
    );

    return {
      handled: true,
      recovered: false,
      action: 'RETURN_TO_TITLE',
      userMessage: '予期しないエラーが発生しました',
    };
  }

  // ===== プライベートメソッド: ユーティリティ =====

  /**
   * エラーメッセージを取得
   * @param error - エラータイプ
   * @returns エラーメッセージ
   */
  private getErrorMessage(error: ChapterStageError): string {
    const messages: Record<ChapterStageError, string> = {
      // 章管理エラー
      [ChapterStageError.CHAPTER_NOT_FOUND]: '章が見つかりません',
      [ChapterStageError.CHAPTER_NOT_UNLOCKED]: '章が解放されていません',
      [ChapterStageError.CHAPTER_ALREADY_STARTED]: '章は既に開始されています',
      [ChapterStageError.CHAPTER_NOT_INITIALIZED]: '章が初期化されていません',

      // パーティ編成エラー
      [ChapterStageError.PARTY_FULL]: 'パーティが満員です',
      [ChapterStageError.CHARACTER_LOST]: 'キャラクターがロスト状態です',
      [ChapterStageError.CHARACTER_NOT_AVAILABLE]: 'キャラクターが利用できません',
      [ChapterStageError.CHARACTER_DUPLICATE]: 'キャラクターが重複しています',
      [ChapterStageError.INVALID_PARTY_COMPOSITION]: 'パーティ編成が無効です',

      // ステージ進行エラー
      [ChapterStageError.STAGE_NOT_FOUND]: 'ステージが見つかりません',
      [ChapterStageError.STAGE_NOT_UNLOCKED]: 'ステージが解放されていません',
      [ChapterStageError.STAGE_ALREADY_COMPLETED]: 'ステージは既にクリア済みです',
      [ChapterStageError.STAGE_NOT_INITIALIZED]: 'ステージが初期化されていません',

      // セーブ・ロードエラー
      [ChapterStageError.SAVE_DATA_CORRUPTED]: 'セーブデータが破損しています',
      [ChapterStageError.SAVE_SLOT_NOT_FOUND]: 'セーブスロットが見つかりません',
      [ChapterStageError.SAVE_FAILED]: '保存に失敗しました',
      [ChapterStageError.LOAD_FAILED]: '読み込みに失敗しました',

      // データエラー
      [ChapterStageError.DATA_LOAD_FAILED]: 'データの読み込みに失敗しました',
      [ChapterStageError.DATA_VALIDATION_FAILED]: 'データの検証に失敗しました',
    };

    return messages[error] || '不明なエラー';
  }

  /**
   * 通知を表示
   * @param title - タイトル
   * @param message - メッセージ
   * @param severity - 重要度
   */
  private showNotification(
    title: string,
    message: string,
    severity: 'error' | 'warning' | 'info'
  ): void {
    if (this.notificationCallback) {
      this.notificationCallback(title, message, severity);
    } else {
      // コールバックが設定されていない場合はコンソールに出力
      const prefix = `[ChapterStageErrorHandler][${severity.toUpperCase()}]`;
      console.warn(`${prefix} ${title}: ${message}`);
    }
  }

  /**
   * エラーをログに記録
   * @param context - エラーコンテキスト
   */
  private logError(context: ErrorContext): void {
    // ログに追加
    this.errorLog.push(context);

    // ログサイズ制限
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // コンソールに出力
    console.error('[ChapterStageErrorHandler]', {
      error: context.error,
      message: context.message,
      details: context.details,
      timestamp: new Date(context.timestamp).toISOString(),
    });
  }

  /**
   * ログ出力
   * @param message - メッセージ
   */
  private log(message: string): void {
    console.log(`[ChapterStageErrorHandler] ${message}`);
  }
}
