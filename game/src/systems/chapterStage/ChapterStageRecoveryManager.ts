/**
 * ChapterStageRecoveryManager - 章・ステージ管理システムのエラーリカバリー
 * Chapter-Stage Management System Error Recovery Manager
 * 
 * エラー発生時のリカバリー処理を担当します。
 * タイトル画面への復帰、再試行オプション、安全な状態の維持を提供します。
 * 要件: 9.1, 9.4
 */

import * as Phaser from 'phaser';
import {
  ChapterStageError,
  ChapterState,
  SaveData,
} from '../../types/chapterStage';
import { ErrorHandlingResult } from './ChapterStageErrorHandler';

/**
 * リカバリーアクション
 * Recovery Action
 */
export type RecoveryAction = 'RETURN_TO_TITLE' | 'RETRY' | 'CONTINUE' | 'SHOW_CONDITIONS';

/**
 * リカバリーコンテキスト
 * Recovery Context
 */
export interface RecoveryContext {
  /** エラータイプ */
  error: ChapterStageError;
  /** エラーメッセージ */
  message: string;
  /** リカバリーアクション */
  action: RecoveryAction;
  /** 追加情報 */
  details?: Record<string, unknown>;
  /** タイムスタンプ */
  timestamp: number;
}

/**
 * リカバリー結果
 * Recovery Result
 */
export interface RecoveryResult {
  /** リカバリー成功フラグ */
  success: boolean;
  /** 実行されたアクション */
  action: RecoveryAction;
  /** 結果メッセージ */
  message: string;
  /** 復元された状態（オプション） */
  restoredState?: ChapterState | SaveData;
}

/**
 * セーフステート（安全な状態）
 * Safe State - 最後の安全な状態を保持
 */
export interface SafeState {
  /** 章状態 */
  chapterState?: ChapterState;
  /** セーブデータ */
  saveData?: SaveData;
  /** タイムスタンプ */
  timestamp: number;
  /** 状態の説明 */
  description: string;
}

/**
 * リカバリー設定
 * Recovery Configuration
 */
export interface RecoveryConfig {
  /** 自動リカバリーを有効化 */
  autoRecovery: boolean;
  /** 最大再試行回数 */
  maxRetries: number;
  /** セーフステートの最大保持数 */
  maxSafeStates: number;
  /** タイトル画面への遷移を有効化 */
  enableTitleTransition: boolean;
}

/**
 * リカバリーコールバック
 * Recovery Callbacks
 */
export interface RecoveryCallbacks {
  /** タイトル画面への遷移 */
  onReturnToTitle?: () => void;
  /** 再試行 */
  onRetry?: (context: RecoveryContext) => Promise<boolean>;
  /** 条件表示 */
  onShowConditions?: (context: RecoveryContext) => void;
  /** リカバリー完了 */
  onRecoveryComplete?: (result: RecoveryResult) => void;
}

/**
 * ChapterStageRecoveryManager
 * 章・ステージ管理システムのエラーリカバリーマネージャー
 */
export class ChapterStageRecoveryManager {
  /** Phaserシーン */
  private scene?: Phaser.Scene;
  /** リカバリー設定 */
  private config: RecoveryConfig;
  /** リカバリーコールバック */
  private callbacks: RecoveryCallbacks;
  /** セーフステート履歴 */
  private safeStates: SafeState[] = [];
  /** 再試行カウンター */
  private retryCount: Map<string, number> = new Map();
  /** リカバリー履歴 */
  private recoveryHistory: RecoveryContext[] = [];

  /** デフォルト設定 */
  private static readonly DEFAULT_CONFIG: RecoveryConfig = {
    autoRecovery: true,
    maxRetries: 3,
    maxSafeStates: 5,
    enableTitleTransition: true,
  };

  /**
   * コンストラクタ
   * @param scene - Phaserシーン（オプション）
   * @param config - リカバリー設定（オプション）
   * @param callbacks - リカバリーコールバック（オプション）
   */
  constructor(
    scene?: Phaser.Scene,
    config?: Partial<RecoveryConfig>,
    callbacks?: RecoveryCallbacks
  ) {
    this.scene = scene;
    this.config = { ...ChapterStageRecoveryManager.DEFAULT_CONFIG, ...config };
    this.callbacks = callbacks || {};
    this.log('ChapterStageRecoveryManager initialized');
  }

  /**
   * コールバックを設定
   * @param callbacks - リカバリーコールバック
   */
  setCallbacks(callbacks: RecoveryCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * セーフステートを保存
   * @param state - 章状態またはセーブデータ
   * @param description - 状態の説明
   */
  saveSafeState(state: ChapterState | SaveData, description: string): void {
    const safeState: SafeState = {
      timestamp: Date.now(),
      description,
    };

    // 章状態かセーブデータかを判定
    if ('chapterId' in state) {
      safeState.chapterState = state as ChapterState;
    } else {
      safeState.saveData = state as SaveData;
    }

    // セーフステートを追加
    this.safeStates.push(safeState);

    // 最大保持数を超えた場合は古いものを削除
    if (this.safeStates.length > this.config.maxSafeStates) {
      this.safeStates.shift();
    }

    this.log(`Safe state saved: ${description}`);
  }

  /**
   * 最新のセーフステートを取得
   * @returns セーフステート（存在しない場合はnull）
   */
  getLatestSafeState(): SafeState | null {
    if (this.safeStates.length === 0) {
      return null;
    }
    return this.safeStates[this.safeStates.length - 1];
  }

  /**
   * 全てのセーフステートを取得
   * @returns セーフステート配列
   */
  getAllSafeStates(): SafeState[] {
    return [...this.safeStates];
  }

  /**
   * セーフステートをクリア
   */
  clearSafeStates(): void {
    this.safeStates = [];
    this.log('Safe states cleared');
  }

  /**
   * エラーハンドリング結果からリカバリーを実行
   * @param errorResult - エラーハンドリング結果
   * @returns リカバリー結果
   */
  async recoverFromError(errorResult: ErrorHandlingResult): Promise<RecoveryResult> {
    if (!errorResult.action) {
      return {
        success: false,
        action: 'CONTINUE',
        message: 'リカバリーアクションが指定されていません',
      };
    }

    const context: RecoveryContext = {
      error: ChapterStageError.DATA_LOAD_FAILED, // デフォルト値
      message: errorResult.userMessage || '不明なエラー',
      action: errorResult.action,
      timestamp: Date.now(),
    };

    // リカバリー履歴に追加
    this.recoveryHistory.push(context);

    // アクションに応じたリカバリー処理
    switch (errorResult.action) {
      case 'RETURN_TO_TITLE':
        return await this.returnToTitle(context);
      case 'RETRY':
        return await this.retry(context);
      case 'CONTINUE':
        return this.continueWithCurrentState(context);
      case 'SHOW_CONDITIONS':
        return this.showConditions(context);
      default:
        return {
          success: false,
          action: 'CONTINUE',
          message: '不明なリカバリーアクション',
        };
    }
  }

  /**
   * タイトル画面に戻る
   * @param context - リカバリーコンテキスト
   * @returns リカバリー結果
   */
  private async returnToTitle(context: RecoveryContext): Promise<RecoveryResult> {
    this.log('Returning to title screen...');

    // セーフステートをクリア（タイトルに戻るため）
    this.clearSafeStates();

    // 再試行カウンターをリセット
    this.retryCount.clear();

    // コールバックを実行
    if (this.callbacks.onReturnToTitle) {
      try {
        this.callbacks.onReturnToTitle();
      } catch (error) {
        console.error('Error in onReturnToTitle callback:', error);
      }
    }

    // Phaserシーンがある場合はシーン遷移
    if (this.scene && this.config.enableTitleTransition) {
      try {
        this.scene.scene.start('TitleScene');
      } catch (error) {
        console.error('Failed to transition to TitleScene:', error);
      }
    }

    const result: RecoveryResult = {
      success: true,
      action: 'RETURN_TO_TITLE',
      message: 'タイトル画面に戻りました',
    };

    // リカバリー完了コールバック
    if (this.callbacks.onRecoveryComplete) {
      this.callbacks.onRecoveryComplete(result);
    }

    return result;
  }

  /**
   * 再試行
   * @param context - リカバリーコンテキスト
   * @returns リカバリー結果
   */
  private async retry(context: RecoveryContext): Promise<RecoveryResult> {
    const errorKey = context.error.toString();
    const currentRetries = this.retryCount.get(errorKey) || 0;

    // 最大再試行回数をチェック
    if (currentRetries >= this.config.maxRetries) {
      this.log(`Max retries (${this.config.maxRetries}) reached for ${errorKey}`);
      
      // 最大再試行回数に達した場合はタイトルに戻る
      return await this.returnToTitle({
        ...context,
        message: `再試行回数の上限に達しました。タイトル画面に戻ります。`,
      });
    }

    // 再試行カウンターを増加
    this.retryCount.set(errorKey, currentRetries + 1);
    this.log(`Retry attempt ${currentRetries + 1}/${this.config.maxRetries} for ${errorKey}`);

    // コールバックを実行
    if (this.callbacks.onRetry) {
      try {
        const success = await this.callbacks.onRetry(context);
        
        if (success) {
          // 再試行成功 - カウンターをリセット
          this.retryCount.delete(errorKey);
          
          const result: RecoveryResult = {
            success: true,
            action: 'RETRY',
            message: '再試行に成功しました',
          };

          if (this.callbacks.onRecoveryComplete) {
            this.callbacks.onRecoveryComplete(result);
          }

          return result;
        } else {
          // 再試行失敗 - 再度試行するか判定
          if (currentRetries + 1 >= this.config.maxRetries) {
            return await this.returnToTitle({
              ...context,
              message: '再試行に失敗しました。タイトル画面に戻ります。',
            });
          }

          return {
            success: false,
            action: 'RETRY',
            message: `再試行に失敗しました（${currentRetries + 1}/${this.config.maxRetries}）`,
          };
        }
      } catch (error) {
        console.error('Error in onRetry callback:', error);
        return {
          success: false,
          action: 'RETRY',
          message: '再試行中にエラーが発生しました',
        };
      }
    }

    // コールバックが設定されていない場合
    return {
      success: false,
      action: 'RETRY',
      message: '再試行コールバックが設定されていません',
    };
  }

  /**
   * 現在の状態で続行
   * @param context - リカバリーコンテキスト
   * @returns リカバリー結果
   */
  private continueWithCurrentState(context: RecoveryContext): RecoveryResult {
    this.log('Continuing with current state...');

    // 最新のセーフステートを取得
    const safeState = this.getLatestSafeState();

    const result: RecoveryResult = {
      success: true,
      action: 'CONTINUE',
      message: '現在の状態で続行します',
      restoredState: safeState?.chapterState || safeState?.saveData,
    };

    if (this.callbacks.onRecoveryComplete) {
      this.callbacks.onRecoveryComplete(result);
    }

    return result;
  }

  /**
   * 条件を表示
   * @param context - リカバリーコンテキスト
   * @returns リカバリー結果
   */
  private showConditions(context: RecoveryContext): RecoveryResult {
    this.log('Showing conditions...');

    // コールバックを実行
    if (this.callbacks.onShowConditions) {
      try {
        this.callbacks.onShowConditions(context);
      } catch (error) {
        console.error('Error in onShowConditions callback:', error);
      }
    }

    const result: RecoveryResult = {
      success: true,
      action: 'SHOW_CONDITIONS',
      message: '条件を表示しました',
    };

    if (this.callbacks.onRecoveryComplete) {
      this.callbacks.onRecoveryComplete(result);
    }

    return result;
  }

  /**
   * 再試行カウンターをリセット
   * @param error - エラータイプ（オプション、指定しない場合は全てリセット）
   */
  resetRetryCount(error?: ChapterStageError): void {
    if (error) {
      this.retryCount.delete(error.toString());
      this.log(`Retry count reset for ${error}`);
    } else {
      this.retryCount.clear();
      this.log('All retry counts reset');
    }
  }

  /**
   * 再試行回数を取得
   * @param error - エラータイプ
   * @returns 再試行回数
   */
  getRetryCount(error: ChapterStageError): number {
    return this.retryCount.get(error.toString()) || 0;
  }

  /**
   * リカバリー履歴を取得
   * @param limit - 取得件数制限（オプション）
   * @returns リカバリー履歴
   */
  getRecoveryHistory(limit?: number): RecoveryContext[] {
    if (limit) {
      return this.recoveryHistory.slice(-limit);
    }
    return [...this.recoveryHistory];
  }

  /**
   * リカバリー履歴をクリア
   */
  clearRecoveryHistory(): void {
    this.recoveryHistory = [];
    this.log('Recovery history cleared');
  }

  /**
   * リカバリーマネージャーをリセット
   * 全ての状態をクリアします
   */
  reset(): void {
    this.clearSafeStates();
    this.retryCount.clear();
    this.clearRecoveryHistory();
    this.log('Recovery manager reset');
  }

  /**
   * ログ出力
   * @param message - メッセージ
   */
  private log(message: string): void {
    console.log(`[ChapterStageRecoveryManager] ${message}`);
  }
}
