/**
 * InventoryErrorHandler - インベントリ・装備システムのエラーハンドリング
 * 
 * このシステムは以下の機能を提供します：
 * - エラーログ記録
 * - ユーザーへの通知
 * - 安全な状態への復帰
 * - デフォルト値の使用
 * 
 * 要件: 10.1, 10.2, 10.3, 10.4, 10.5
 */

/**
 * エラーの重要度
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * インベントリエラー
 */
export interface InventoryError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  timestamp: number;
}

/**
 * エラーハンドラーの設定
 */
export interface ErrorHandlerConfig {
  enableConsoleLogging: boolean;
  enableUserNotifications: boolean;
  maxErrorLogSize: number;
  notificationDuration: number; // ミリ秒
}

/**
 * ユーザー通知コールバック
 */
export type UserNotificationCallback = (message: string, severity: ErrorSeverity) => void;

/**
 * 安全な状態への復帰コールバック
 */
export type SafeStateRecoveryCallback = () => void;

/**
 * InventoryErrorHandler クラス
 * エラーハンドリングを担当
 */
export class InventoryErrorHandler {
  private errorLog: InventoryError[];
  private config: ErrorHandlerConfig;
  private userNotificationCallback: UserNotificationCallback | null;
  private safeStateRecoveryCallback: SafeStateRecoveryCallback | null;
  private defaultValues: Map<string, any>;

  constructor(config?: Partial<ErrorHandlerConfig>) {
    this.errorLog = [];
    this.config = {
      enableConsoleLogging: true,
      enableUserNotifications: true,
      maxErrorLogSize: 100,
      notificationDuration: 3000,
      ...config,
    };
    this.userNotificationCallback = null;
    this.safeStateRecoveryCallback = null;
    this.defaultValues = new Map();

    this.initializeDefaultValues();
  }

  /**
   * デフォルト値を初期化
   * 要件10.1対応: デフォルトアイテムを使用
   */
  private initializeDefaultValues(): void {
    // デフォルトアイテムデータ
    this.defaultValues.set('defaultItem', {
      id: 'default_item',
      name: 'デフォルトアイテム',
      description: 'エラー時に使用されるデフォルトアイテム',
      type: 'material',
      rarity: 'common',
      iconPath: 'assets/items/default.png',
      maxStack: 99,
      sellPrice: 0,
      buyPrice: 0,
    });

    // デフォルトインベントリデータ
    this.defaultValues.set('defaultInventoryData', {
      slots: [],
      maxSlots: 100,
      usedSlots: 0,
      gold: 0,
    });

    // デフォルト装備セット
    this.defaultValues.set('defaultEquipmentSet', {
      weapon: null,
      armor: null,
      accessory1: null,
      accessory2: null,
    });
  }

  /**
   * エラーをログに記録
   * 要件10.4対応: 全てのエラーをコンソールにログ出力
   * 
   * @param error エラー情報
   */
  logError(error: InventoryError): void {
    // エラーログに追加
    this.errorLog.push(error);

    // ログサイズ制限
    if (this.errorLog.length > this.config.maxErrorLogSize) {
      this.errorLog.shift(); // 古いエラーを削除
    }

    // コンソールログ出力
    if (this.config.enableConsoleLogging) {
      const timestamp = new Date(error.timestamp).toISOString();
      const contextStr = error.context ? JSON.stringify(error.context) : '';

      switch (error.severity) {
        case ErrorSeverity.INFO:
          console.info(`[InventoryError][INFO][${timestamp}] ${error.code}: ${error.message}`, contextStr);
          break;
        case ErrorSeverity.WARNING:
          console.warn(`[InventoryError][WARNING][${timestamp}] ${error.code}: ${error.message}`, contextStr);
          break;
        case ErrorSeverity.ERROR:
          console.error(`[InventoryError][ERROR][${timestamp}] ${error.code}: ${error.message}`, contextStr);
          break;
        case ErrorSeverity.CRITICAL:
          console.error(`[InventoryError][CRITICAL][${timestamp}] ${error.code}: ${error.message}`, contextStr);
          break;
      }
    }

    // クリティカルエラーの場合は安全な状態に復帰
    // 要件10.5対応: クリティカルエラー発生時にゲームをクラッシュさせず、安全な状態に復帰
    if (error.severity === ErrorSeverity.CRITICAL) {
      this.recoverToSafeState();
    }
  }

  /**
   * ユーザーに通知
   * 要件10.2対応: 操作を拒否し、理由を説明するメッセージを表示
   * 
   * @param message 通知メッセージ
   * @param severity エラーの重要度
   */
  notifyUser(message: string, severity: ErrorSeverity): void {
    if (!this.config.enableUserNotifications) {
      return;
    }

    // コールバックが設定されている場合は実行
    if (this.userNotificationCallback) {
      try {
        this.userNotificationCallback(message, severity);
      } catch (error) {
        // コールバック実行中のエラーをキャッチして、デフォルトの通知にフォールバック
        console.error('[InventoryErrorHandler] Error in notification callback:', error);
        console.log(`[User Notification][${severity}] ${message}`);
      }
    } else {
      // デフォルトの通知（コンソール出力）
      console.log(`[User Notification][${severity}] ${message}`);
    }
  }

  /**
   * 安全な状態に復帰
   * 要件10.5対応: 安全な状態に復帰
   */
  recoverToSafeState(): void {
    console.warn('[InventoryErrorHandler] Recovering to safe state...');

    // コールバックが設定されている場合は実行
    if (this.safeStateRecoveryCallback) {
      try {
        this.safeStateRecoveryCallback();
        console.log('[InventoryErrorHandler] Safe state recovery completed');
      } catch (error) {
        console.error('[InventoryErrorHandler] Failed to recover to safe state:', error);
      }
    } else {
      // デフォルトの復帰処理（何もしない）
      console.warn('[InventoryErrorHandler] No safe state recovery callback set');
    }
  }

  /**
   * デフォルト値を使用
   * 要件10.1対応: デフォルトアイテムを使用
   * 
   * @param key デフォルト値のキー
   * @returns デフォルト値
   */
  useDefaultValue<T>(key: string): T {
    const defaultValue = this.defaultValues.get(key);

    if (defaultValue === undefined) {
      console.warn(`[InventoryErrorHandler] No default value found for key: ${key}`);
      return null as T;
    }

    // デフォルト値を使用したことをログに記録
    this.logError({
      code: 'DEFAULT_VALUE_USED',
      message: `Using default value for: ${key}`,
      severity: ErrorSeverity.WARNING,
      context: { key },
      timestamp: Date.now(),
    });

    return defaultValue as T;
  }

  /**
   * ユーザー通知コールバックを設定
   * 
   * @param callback コールバック関数
   */
  setUserNotificationCallback(callback: UserNotificationCallback): void {
    this.userNotificationCallback = callback;
  }

  /**
   * 安全な状態への復帰コールバックを設定
   * 
   * @param callback コールバック関数
   */
  setSafeStateRecoveryCallback(callback: SafeStateRecoveryCallback): void {
    this.safeStateRecoveryCallback = callback;
  }

  /**
   * カスタムデフォルト値を設定
   * 
   * @param key キー
   * @param value 値
   */
  setDefaultValue(key: string, value: any): void {
    this.defaultValues.set(key, value);
  }

  /**
   * エラーログを取得
   * 
   * @param severity フィルタする重要度（オプション）
   * @returns エラーログ
   */
  getErrorLog(severity?: ErrorSeverity): InventoryError[] {
    if (severity) {
      return this.errorLog.filter(error => error.severity === severity);
    }
    return [...this.errorLog];
  }

  /**
   * エラーログをクリア
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * 設定を更新
   * 
   * @param config 新しい設定
   */
  updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * エラーを作成して記録
   * 
   * @param code エラーコード
   * @param message エラーメッセージ
   * @param severity 重要度
   * @param context コンテキスト情報
   * @returns 作成されたエラー
   */
  createAndLogError(
    code: string,
    message: string,
    severity: ErrorSeverity,
    context?: Record<string, unknown>
  ): InventoryError {
    const error: InventoryError = {
      code,
      message,
      severity,
      context,
      timestamp: Date.now(),
    };

    this.logError(error);

    // ユーザーに通知（ERROR以上の場合）
    if (severity === ErrorSeverity.ERROR || severity === ErrorSeverity.CRITICAL) {
      this.notifyUser(message, severity);
    }

    return error;
  }

  /**
   * データ読み込みエラーを処理
   * 要件10.1対応: アイテムデータの読み込みに失敗する場合の処理
   * 
   * @param itemId アイテムID
   * @param error エラー情報
   * @returns デフォルトアイテム
   */
  handleDataLoadError(itemId: string, error: Error): any {
    this.createAndLogError(
      'DATA_LOAD_FAILED',
      `Failed to load item data: ${itemId}`,
      ErrorSeverity.ERROR,
      { itemId, error: error.message }
    );

    this.notifyUser(
      'アイテムデータの読み込みに失敗しました。デフォルトアイテムを使用します。',
      ErrorSeverity.ERROR
    );

    return this.useDefaultValue('defaultItem');
  }

  /**
   * 不正操作エラーを処理
   * 要件10.2対応: 不正なアイテム操作が試みられる場合の処理
   * 
   * @param operation 操作名
   * @param reason 拒否理由
   */
  handleInvalidOperationError(operation: string, reason: string): void {
    this.createAndLogError(
      'INVALID_OPERATION',
      `Invalid operation: ${operation}`,
      ErrorSeverity.WARNING,
      { operation, reason }
    );

    this.notifyUser(
      `操作が拒否されました: ${reason}`,
      ErrorSeverity.WARNING
    );
  }

  /**
   * 装備失敗エラーを処理
   * 要件10.3対応: 装備の装着に失敗する場合の処理
   * 
   * @param characterId キャラクターID
   * @param itemId アイテムID
   * @param reason 失敗理由
   */
  handleEquipmentFailureError(characterId: string, itemId: string, reason: string): void {
    this.createAndLogError(
      'EQUIPMENT_FAILED',
      `Failed to equip item: ${itemId} to character: ${characterId}`,
      ErrorSeverity.WARNING,
      { characterId, itemId, reason }
    );

    this.notifyUser(
      `装備の装着に失敗しました: ${reason}`,
      ErrorSeverity.WARNING
    );
  }

  /**
   * ストレージエラーを処理
   * 
   * @param operation 操作名（save/load）
   * @param error エラー情報
   */
  handleStorageError(operation: string, error: Error): void {
    const severity = operation === 'save' ? ErrorSeverity.ERROR : ErrorSeverity.WARNING;

    this.createAndLogError(
      'STORAGE_ERROR',
      `Storage ${operation} failed`,
      severity,
      { operation, error: error.message }
    );

    const message = operation === 'save'
      ? 'データの保存に失敗しました。'
      : 'データの読み込みに失敗しました。';

    this.notifyUser(message, severity);
  }

  /**
   * デバッグ情報を取得
   * 
   * @returns デバッグ情報
   */
  getDebugInfo(): {
    totalErrors: number;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: InventoryError[];
  } {
    const errorsBySeverity: Record<ErrorSeverity, number> = {
      [ErrorSeverity.INFO]: 0,
      [ErrorSeverity.WARNING]: 0,
      [ErrorSeverity.ERROR]: 0,
      [ErrorSeverity.CRITICAL]: 0,
    };

    for (const error of this.errorLog) {
      errorsBySeverity[error.severity]++;
    }

    const recentErrors = this.errorLog.slice(-10); // 最新10件

    return {
      totalErrors: this.errorLog.length,
      errorsBySeverity,
      recentErrors,
    };
  }
}
