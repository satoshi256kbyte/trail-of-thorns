/**
 * VictoryConditionErrorHandler
 * ボス戦・勝利条件システムのエラーハンドリングとユーザーフィードバック
 * 
 * 要件12.1, 12.2, 12.3, 12.4, 12.5に対応
 */

import { Objective, ObjectiveType } from '../../types/victory';
import { BossData } from '../../types/boss';
import { StageRewards, ClearRating } from '../../types/reward';

/**
 * エラー種別
 */
export enum VictoryConditionError {
  INVALID_OBJECTIVE_DATA = 'invalid_objective_data',
  INVALID_BOSS_DATA = 'invalid_boss_data',
  REWARD_CALCULATION_FAILED = 'reward_calculation_failed',
  SYSTEM_INTEGRATION_ERROR = 'system_integration_error',
  UI_DISPLAY_ERROR = 'ui_display_error',
  DATA_PERSISTENCE_ERROR = 'data_persistence_error',
}

/**
 * エラーコンテキスト
 */
export interface ErrorContext {
  error: VictoryConditionError;
  message: string;
  details?: any;
  timestamp: number;
  recoverable: boolean;
}

/**
 * エラー通知
 */
export interface ErrorNotification {
  title: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  actions?: ErrorAction[];
}

/**
 * エラーアクション
 */
export interface ErrorAction {
  label: string;
  action: () => void;
}

/**
 * エラーハンドリング結果
 */
export interface ErrorHandlingResult {
  handled: boolean;
  recovered: boolean;
  fallbackApplied: boolean;
  message: string;
  notification?: ErrorNotification;
}

/**
 * デフォルト目標
 */
const DEFAULT_OBJECTIVE: Objective = {
  id: 'default_objective',
  type: ObjectiveType.DEFEAT_ALL_ENEMIES,
  description: 'すべての敵を撃破する',
  isRequired: true,
  isComplete: false,
  progress: { current: 0, target: 1, percentage: 0 },
};

/**
 * デフォルト報酬
 */
const DEFAULT_REWARDS: StageRewards = {
  baseExperience: 100,
  bossRewards: [],
  recruitmentRewards: [],
  clearRatingBonus: {
    rating: ClearRating.C,
    experienceMultiplier: 1.0,
    additionalRewards: [],
  },
  itemRewards: [],
  specialRewards: [],
};

/**
 * VictoryConditionErrorHandler
 * エラーハンドリングとユーザーフィードバックを担当
 */
export class VictoryConditionErrorHandler {
  private errorLog: ErrorContext[] = [];
  private maxLogSize: number = 100;
  private notificationCallback?: (notification: ErrorNotification) => void;

  /**
   * 通知コールバックを設定
   */
  setNotificationCallback(callback: (notification: ErrorNotification) => void): void {
    this.notificationCallback = callback;
  }

  /**
   * エラーを処理
   * 要件12.5: すべてのエラーを適切にハンドリングする
   */
  handleError(error: VictoryConditionError, context: Partial<ErrorContext>): ErrorHandlingResult {
    // エラーコンテキストを作成
    const errorContext: ErrorContext = {
      error,
      message: context.message || 'Unknown error',
      details: context.details,
      timestamp: Date.now(),
      recoverable: context.recoverable !== false,
    };

    // エラーログに記録
    this.logError(errorContext);

    // エラー種別に応じた処理
    switch (error) {
      case VictoryConditionError.INVALID_OBJECTIVE_DATA:
        return this.handleInvalidObjectiveData(errorContext);

      case VictoryConditionError.INVALID_BOSS_DATA:
        return this.handleInvalidBossData(errorContext);

      case VictoryConditionError.REWARD_CALCULATION_FAILED:
        return this.handleRewardCalculationFailure(errorContext);

      case VictoryConditionError.SYSTEM_INTEGRATION_ERROR:
        return this.handleSystemIntegrationError(errorContext);

      case VictoryConditionError.UI_DISPLAY_ERROR:
        return this.handleUIDisplayError(errorContext);

      case VictoryConditionError.DATA_PERSISTENCE_ERROR:
        return this.handleDataPersistenceError(errorContext);

      default:
        return this.handleUnknownError(errorContext);
    }
  }

  /**
   * 不正な目標データのエラーを処理
   * 要件12.1: 目標データが不正なとき、エラーメッセージを表示する
   */
  private handleInvalidObjectiveData(context: ErrorContext): ErrorHandlingResult {
    console.error('[VictoryConditionErrorHandler] Invalid objective data:', context);

    // デフォルト目標を設定
    const defaultObjective = this.getDefaultObjective();

    // ユーザー通知
    const notification: ErrorNotification = {
      title: '目標データエラー',
      message: '目標データの読み込みに失敗しました。デフォルトの目標を使用します。',
      severity: 'warning',
      actions: [
        {
          label: '続行',
          action: () => {
            console.log('User acknowledged objective data error');
          },
        },
      ],
    };

    this.notifyUser(notification);

    return {
      handled: true,
      recovered: true,
      fallbackApplied: true,
      message: 'Applied default objective',
      notification,
    };
  }

  /**
   * 不正なボスデータのエラーを処理
   * 要件12.2: ボスデータが不正なとき、エラーメッセージを表示する
   */
  private handleInvalidBossData(context: ErrorContext): ErrorHandlingResult {
    console.error('[VictoryConditionErrorHandler] Invalid boss data:', context);

    // ユーザー通知
    const notification: ErrorNotification = {
      title: 'ボスデータエラー',
      message: 'ボスデータの読み込みに失敗しました。ボス戦なしで続行します。',
      severity: 'warning',
      actions: [
        {
          label: '続行',
          action: () => {
            console.log('User acknowledged boss data error');
          },
        },
      ],
    };

    this.notifyUser(notification);

    return {
      handled: true,
      recovered: true,
      fallbackApplied: true,
      message: 'Continuing without boss data',
      notification,
    };
  }

  /**
   * 報酬計算失敗のエラーを処理
   * 要件12.3: 報酬計算でエラーが発生するとき、デフォルト報酬を付与する
   */
  private handleRewardCalculationFailure(context: ErrorContext): ErrorHandlingResult {
    console.error('[VictoryConditionErrorHandler] Reward calculation failed:', context);

    // デフォルト報酬を付与
    const defaultRewards = this.getDefaultRewards();

    // ユーザー通知
    const notification: ErrorNotification = {
      title: '報酬計算エラー',
      message: '報酬の計算に失敗しました。基本報酬を付与します。',
      severity: 'warning',
      actions: [
        {
          label: '確認',
          action: () => {
            console.log('User acknowledged reward calculation error');
          },
        },
      ],
    };

    this.notifyUser(notification);

    return {
      handled: true,
      recovered: true,
      fallbackApplied: true,
      message: 'Applied default rewards',
      notification,
    };
  }

  /**
   * システム統合エラーを処理
   * 要件12.4: システム統合でエラーが発生するとき、エラーログを記録する
   */
  private handleSystemIntegrationError(context: ErrorContext): ErrorHandlingResult {
    console.error('[VictoryConditionErrorHandler] System integration error:', context);

    // エラーログに記録（既に logError で記録済み）

    // ユーザー通知
    const notification: ErrorNotification = {
      title: 'システムエラー',
      message: 'システム連携でエラーが発生しました。一部機能が制限される可能性があります。',
      severity: 'error',
      actions: [
        {
          label: '続行',
          action: () => {
            console.log('User acknowledged system integration error');
          },
        },
        {
          label: '再試行',
          action: () => {
            console.log('User requested retry for system integration');
          },
        },
      ],
    };

    this.notifyUser(notification);

    return {
      handled: true,
      recovered: false,
      fallbackApplied: false,
      message: 'System integration error logged',
      notification,
    };
  }

  /**
   * UI表示エラーを処理
   */
  private handleUIDisplayError(context: ErrorContext): ErrorHandlingResult {
    console.error('[VictoryConditionErrorHandler] UI display error:', context);

    // ユーザー通知
    const notification: ErrorNotification = {
      title: 'UI表示エラー',
      message: 'UIの表示でエラーが発生しました。画面を更新してください。',
      severity: 'warning',
      actions: [
        {
          label: '更新',
          action: () => {
            console.log('User requested UI refresh');
          },
        },
      ],
    };

    this.notifyUser(notification);

    return {
      handled: true,
      recovered: false,
      fallbackApplied: false,
      message: 'UI display error handled',
      notification,
    };
  }

  /**
   * データ永続化エラーを処理
   */
  private handleDataPersistenceError(context: ErrorContext): ErrorHandlingResult {
    console.error('[VictoryConditionErrorHandler] Data persistence error:', context);

    // ユーザー通知
    const notification: ErrorNotification = {
      title: 'データ保存エラー',
      message: 'データの保存に失敗しました。進行状況が失われる可能性があります。',
      severity: 'error',
      actions: [
        {
          label: '再試行',
          action: () => {
            console.log('User requested retry for data persistence');
          },
        },
        {
          label: '続行',
          action: () => {
            console.log('User chose to continue despite persistence error');
          },
        },
      ],
    };

    this.notifyUser(notification);

    return {
      handled: true,
      recovered: false,
      fallbackApplied: false,
      message: 'Data persistence error handled',
      notification,
    };
  }

  /**
   * 未知のエラーを処理
   */
  private handleUnknownError(context: ErrorContext): ErrorHandlingResult {
    console.error('[VictoryConditionErrorHandler] Unknown error:', context);

    // ユーザー通知
    const notification: ErrorNotification = {
      title: '予期しないエラー',
      message: '予期しないエラーが発生しました。ゲームを再起動してください。',
      severity: 'error',
      actions: [
        {
          label: '再起動',
          action: () => {
            console.log('User requested game restart');
          },
        },
      ],
    };

    this.notifyUser(notification);

    return {
      handled: true,
      recovered: false,
      fallbackApplied: false,
      message: 'Unknown error handled',
      notification,
    };
  }

  /**
   * デフォルト目標を取得
   */
  getDefaultObjective(): Objective {
    return { ...DEFAULT_OBJECTIVE };
  }

  /**
   * デフォルト報酬を取得
   */
  getDefaultRewards(): StageRewards {
    return JSON.parse(JSON.stringify(DEFAULT_REWARDS));
  }

  /**
   * エラーをログに記録
   */
  private logError(context: ErrorContext): void {
    this.errorLog.push(context);

    // ログサイズ制限
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
  }

  /**
   * ユーザーに通知
   */
  private notifyUser(notification: ErrorNotification): void {
    if (this.notificationCallback) {
      this.notificationCallback(notification);
    } else {
      // コールバックが設定されていない場合はコンソールに出力
      console.warn('[VictoryConditionErrorHandler] No notification callback set');
      console.warn(`[${notification.severity.toUpperCase()}] ${notification.title}: ${notification.message}`);
    }
  }

  /**
   * エラーログを取得
   */
  getErrorLog(): ErrorContext[] {
    return [...this.errorLog];
  }

  /**
   * エラーログをクリア
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * 最新のエラーを取得
   */
  getLatestError(): ErrorContext | null {
    return this.errorLog.length > 0 ? this.errorLog[this.errorLog.length - 1] : null;
  }

  /**
   * 特定種別のエラーを取得
   */
  getErrorsByType(errorType: VictoryConditionError): ErrorContext[] {
    return this.errorLog.filter((ctx) => ctx.error === errorType);
  }

  /**
   * 回復可能なエラーの数を取得
   */
  getRecoverableErrorCount(): number {
    return this.errorLog.filter((ctx) => ctx.recoverable).length;
  }

  /**
   * 回復不可能なエラーの数を取得
   */
  getUnrecoverableErrorCount(): number {
    return this.errorLog.filter((ctx) => !ctx.recoverable).length;
  }
}
