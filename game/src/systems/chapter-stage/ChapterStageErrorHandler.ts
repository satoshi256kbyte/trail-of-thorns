/**
 * ChapterStageErrorHandler - エラーハンドリングとユーザーフィードバックシステム
 *
 * 章・ステージ管理システムにおける全てのエラーを一元管理し、
 * 適切なエラーメッセージの表示とエラーログの記録を行います。
 *
 * 要件: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { EventEmitter } from 'events';
import {
  ChapterStageErrorRecovery,
  RecoveryOptions,
  RecoveryResult,
} from './ChapterStageErrorRecovery';

/**
 * エラー種別の列挙型
 */
export enum ChapterStageError {
  // 章管理エラー
  CHAPTER_NOT_FOUND = 'CHAPTER_NOT_FOUND',
  CHAPTER_NOT_UNLOCKED = 'CHAPTER_NOT_UNLOCKED',
  CHAPTER_ALREADY_STARTED = 'CHAPTER_ALREADY_STARTED',

  // パーティ編成エラー
  PARTY_FULL = 'PARTY_FULL',
  CHARACTER_LOST = 'CHARACTER_LOST',
  CHARACTER_NOT_AVAILABLE = 'CHARACTER_NOT_AVAILABLE',
  CHARACTER_DUPLICATE = 'CHARACTER_DUPLICATE',

  // ステージ進行エラー
  STAGE_NOT_FOUND = 'STAGE_NOT_FOUND',
  STAGE_NOT_UNLOCKED = 'STAGE_NOT_UNLOCKED',
  STAGE_ALREADY_COMPLETED = 'STAGE_ALREADY_COMPLETED',

  // セーブ・ロードエラー
  SAVE_DATA_CORRUPTED = 'SAVE_DATA_CORRUPTED',
  SAVE_SLOT_NOT_FOUND = 'SAVE_SLOT_NOT_FOUND',
  SAVE_FAILED = 'SAVE_FAILED',
  LOAD_FAILED = 'LOAD_FAILED',

  // データエラー
  DATA_LOAD_FAILED = 'DATA_LOAD_FAILED',
  DATA_VALIDATION_FAILED = 'DATA_VALIDATION_FAILED',
}

/**
 * エラーコンテキスト情報
 */
export interface ErrorContext {
  chapterId?: string;
  stageId?: string;
  characterId?: string;
  slotId?: number;
  additionalInfo?: Record<string, any>;
}

/**
 * エラーログエントリ
 */
export interface ErrorLogEntry {
  timestamp: number;
  errorType: ChapterStageError;
  message: string;
  context: ErrorContext;
  stackTrace?: string;
}

/**
 * エラーメッセージ設定
 */
interface ErrorMessageConfig {
  [key: string]: string;
}

/**
 * ChapterStageErrorHandler - 章・ステージ管理システムのエラーハンドラー
 */
export class ChapterStageErrorHandler extends EventEmitter {
  private scene: any; // Phaser.Scene型だが、テスト可能性のためanyを使用
  private errorLog: ErrorLogEntry[] = [];
  private maxLogSize: number = 100;
  private errorRecovery: ChapterStageErrorRecovery;

  // エラーメッセージの定義
  private static readonly ERROR_MESSAGES: ErrorMessageConfig = {
    [ChapterStageError.CHAPTER_NOT_FOUND]: '指定された章が見つかりません',
    [ChapterStageError.CHAPTER_NOT_UNLOCKED]: 'この章はまだ解放されていません',
    [ChapterStageError.CHAPTER_ALREADY_STARTED]: 'この章は既に開始されています',

    [ChapterStageError.PARTY_FULL]: 'パーティが満員です（最大6人）',
    [ChapterStageError.CHARACTER_LOST]:
      'このキャラクターは章内で使用不可です',
    [ChapterStageError.CHARACTER_NOT_AVAILABLE]:
      'このキャラクターは利用できません',
    [ChapterStageError.CHARACTER_DUPLICATE]:
      'このキャラクターは既にパーティに含まれています',

    [ChapterStageError.STAGE_NOT_FOUND]: '指定されたステージが見つかりません',
    [ChapterStageError.STAGE_NOT_UNLOCKED]: 'このステージはまだ解放されていません',
    [ChapterStageError.STAGE_ALREADY_COMPLETED]: 'このステージは既にクリア済みです',

    [ChapterStageError.SAVE_DATA_CORRUPTED]: 'セーブデータが破損しています',
    [ChapterStageError.SAVE_SLOT_NOT_FOUND]:
      '指定されたセーブスロットが見つかりません',
    [ChapterStageError.SAVE_FAILED]: 'セーブデータの保存に失敗しました',
    [ChapterStageError.LOAD_FAILED]: 'セーブデータの読み込みに失敗しました',

    [ChapterStageError.DATA_LOAD_FAILED]: 'データの読み込みに失敗しました',
    [ChapterStageError.DATA_VALIDATION_FAILED]: 'データの検証に失敗しました',
  };

  /**
   * コンストラクタ
   * @param scene - Phaserシーン（またはモックシーン）
   */
  constructor(scene: any) {
    super();
    this.scene = scene;
    this.errorRecovery = new ChapterStageErrorRecovery(scene);

    // エラーリカバリーのイベントをリスニング
    this.setupRecoveryListeners();
  }

  /**
   * エラーリカバリーのイベントリスナーを設定する
   */
  private setupRecoveryListeners(): void {
    this.errorRecovery.on('retry-save', data => {
      this.emit('retry-save', data);
    });

    this.errorRecovery.on('select-save-slot', () => {
      this.emit('select-save-slot');
    });

    this.errorRecovery.on('show-unlock-conditions', data => {
      this.emit('show-unlock-conditions', data);
    });

    this.errorRecovery.on('returned-to-title', () => {
      this.emit('returned-to-title');
    });
  }

  /**
   * エラーを処理する（リカバリー機能付き）
   * @param errorType - エラー種別
   * @param context - エラーコンテキスト
   * @param error - 元のエラーオブジェクト（オプション）
   * @param options - リカバリーオプション（オプション）
   * @returns リカバリー結果のPromise
   */
  public async handleError(
    errorType: ChapterStageError,
    context: ErrorContext = {},
    error?: Error,
    options?: RecoveryOptions
  ): Promise<RecoveryResult | void> {
    // エラーメッセージの取得
    const message = this.getErrorMessage(errorType, context);

    // エラーログの記録
    this.logError(errorType, message, context, error);

    // エラーメッセージの表示
    this.showErrorMessage(message);

    // エラー種別に応じた処理
    this.handleSpecificError(errorType, context);

    // エラーイベントの発行
    this.emit('error-occurred', {
      errorType,
      message,
      context,
    });

    // エラーリカバリーを試みる
    if (this.shouldAttemptRecovery(errorType)) {
      return await this.errorRecovery.recover(errorType, context, options);
    }
  }

  /**
   * リカバリーを試みるべきかどうかを判定する
   * @param errorType - エラー種別
   * @returns リカバリーを試みる場合true
   */
  private shouldAttemptRecovery(errorType: ChapterStageError): boolean {
    // 重大なエラーやリカバリー可能なエラーの場合はtrue
    const recoverableErrors = [
      ChapterStageError.SAVE_DATA_CORRUPTED,
      ChapterStageError.DATA_LOAD_FAILED,
      ChapterStageError.SAVE_FAILED,
      ChapterStageError.LOAD_FAILED,
    ];

    return recoverableErrors.includes(errorType);
  }

  /**
   * エラーメッセージを取得する
   * @param errorType - エラー種別
   * @param context - エラーコンテキスト
   * @returns エラーメッセージ
   */
  private getErrorMessage(
    errorType: ChapterStageError,
    context: ErrorContext
  ): string {
    let message =
      ChapterStageErrorHandler.ERROR_MESSAGES[errorType] ||
      'エラーが発生しました';

    // コンテキスト情報を追加
    if (context.stageId && errorType === ChapterStageError.STAGE_NOT_UNLOCKED) {
      message += '\n解放条件を確認してください';
    }

    return message;
  }

  /**
   * エラーログを記録する
   * @param errorType - エラー種別
   * @param message - エラーメッセージ
   * @param context - エラーコンテキスト
   * @param error - 元のエラーオブジェクト
   */
  private logError(
    errorType: ChapterStageError,
    message: string,
    context: ErrorContext,
    error?: Error
  ): void {
    const logEntry: ErrorLogEntry = {
      timestamp: Date.now(),
      errorType,
      message,
      context,
      stackTrace: error?.stack,
    };

    // ログに追加
    this.errorLog.push(logEntry);

    // ログサイズの制限
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // コンソールにログ出力
    console.error('[ChapterStageErrorHandler]', {
      errorType,
      message,
      context,
      timestamp: new Date(logEntry.timestamp).toISOString(),
      stackTrace: error?.stack,
    });
  }

  /**
   * エラーメッセージを表示する
   * @param message - 表示するメッセージ
   */
  private showErrorMessage(message: string): void {
    // UIマネージャーが存在する場合は使用
    const uiManager = (this.scene as any).uiManager;
    if (uiManager && typeof uiManager.showError === 'function') {
      uiManager.showError(message);
    } else {
      // フォールバック: シンプルなテキスト表示
      this.showSimpleErrorMessage(message);
    }
  }

  /**
   * シンプルなエラーメッセージを表示する
   * @param message - 表示するメッセージ
   */
  private showSimpleErrorMessage(message: string): void {
    const centerX = this.scene.cameras.main.width / 2;
    const centerY = this.scene.cameras.main.height / 2;

    // 背景
    const background = this.scene.add
      .rectangle(centerX, centerY, 400, 200, 0x000000, 0.8)
      .setScrollFactor(0)
      .setDepth(10000);

    // エラーメッセージ
    const text = this.scene.add
      .text(centerX, centerY - 30, message, {
        fontSize: '18px',
        color: '#ff6b6b',
        align: 'center',
        wordWrap: { width: 360 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001);

    // OKボタン
    const button = this.scene.add
      .text(centerX, centerY + 50, 'OK', {
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#4a4a4a',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001)
      .setInteractive({ useHandCursor: true });

    button.on('pointerdown', () => {
      background.destroy();
      text.destroy();
      button.destroy();
    });

    // 3秒後に自動的に閉じる
    this.scene.time.delayedCall(3000, () => {
      if (background.active) {
        background.destroy();
        text.destroy();
        button.destroy();
      }
    });
  }

  /**
   * 特定のエラーに対する処理を実行する
   * @param errorType - エラー種別
   * @param context - エラーコンテキスト
   */
  private handleSpecificError(
    errorType: ChapterStageError,
    context: ErrorContext
  ): void {
    switch (errorType) {
      case ChapterStageError.SAVE_DATA_CORRUPTED:
      case ChapterStageError.DATA_LOAD_FAILED:
        // 重大なエラーの場合はタイトル画面に戻る準備
        this.emit('critical-error', { errorType, context });
        break;

      case ChapterStageError.STAGE_NOT_UNLOCKED:
        // 解放条件を表示
        if (context.stageId) {
          this.emit('show-unlock-conditions', { stageId: context.stageId });
        }
        break;

      case ChapterStageError.SAVE_FAILED:
        // 再試行オプションを提供
        this.emit('retry-save', { context });
        break;

      default:
        // その他のエラーは記録のみ
        break;
    }
  }

  /**
   * エラーログを取得する
   * @param limit - 取得する最大件数（デフォルト: 全件）
   * @returns エラーログの配列
   */
  public getErrorLog(limit?: number): ErrorLogEntry[] {
    if (limit) {
      return this.errorLog.slice(-limit);
    }
    return [...this.errorLog];
  }

  /**
   * エラーログをクリアする
   */
  public clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * エラー統計を取得する
   * @returns エラー種別ごとの発生回数
   */
  public getErrorStatistics(): Record<string, number> {
    const statistics: Record<string, number> = {};

    for (const entry of this.errorLog) {
      const errorType = entry.errorType;
      statistics[errorType] = (statistics[errorType] || 0) + 1;
    }

    return statistics;
  }

  /**
   * 最新のエラーを取得する
   * @returns 最新のエラーログエントリ、またはnull
   */
  public getLatestError(): ErrorLogEntry | null {
    return this.errorLog.length > 0
      ? this.errorLog[this.errorLog.length - 1]
      : null;
  }

  /**
   * 特定のエラー種別のログを取得する
   * @param errorType - エラー種別
   * @returns 該当するエラーログの配列
   */
  public getErrorsByType(errorType: ChapterStageError): ErrorLogEntry[] {
    return this.errorLog.filter(entry => entry.errorType === errorType);
  }

  /**
   * エラーハンドラーを破棄する
   */
  public destroy(): void {
    this.removeAllListeners();
    this.errorLog = [];
    this.errorRecovery.destroy();
  }

  /**
   * エラーリカバリーマネージャーを取得する
   * @returns エラーリカバリーマネージャー
   */
  public getErrorRecovery(): ChapterStageErrorRecovery {
    return this.errorRecovery;
  }
}
