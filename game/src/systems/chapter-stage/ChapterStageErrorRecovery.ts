/**
 * ChapterStageErrorRecovery - エラーリカバリー機能
 *
 * エラー発生時の復旧処理を管理し、タイトル画面への復帰、
 * 再試行オプション、安全な状態の維持を提供します。
 *
 * 要件: 9.1, 9.4
 */

import { EventEmitter } from 'events';
import { ChapterStageError, ErrorContext } from './ChapterStageErrorHandler';

/**
 * リカバリーアクションの種別
 */
export enum RecoveryAction {
  RETURN_TO_TITLE = 'RETURN_TO_TITLE',
  RETRY = 'RETRY',
  CONTINUE = 'CONTINUE',
  RESET_STATE = 'RESET_STATE',
}

/**
 * リカバリー結果
 */
export interface RecoveryResult {
  success: boolean;
  action: RecoveryAction;
  message?: string;
}

/**
 * リカバリーオプション
 */
export interface RecoveryOptions {
  showRetryButton?: boolean;
  showContinueButton?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
}

/**
 * ChapterStageErrorRecovery - エラーリカバリーマネージャー
 */
export class ChapterStageErrorRecovery extends EventEmitter {
  private scene: any; // Phaser.Scene型だが、テスト可能性のためanyを使用
  private retryCount: Map<string, number> = new Map();
  private maxRetries: number = 3;
  private isRecovering: boolean = false;

  /**
   * コンストラクタ
   * @param scene - Phaserシーン（またはモックシーン）
   */
  constructor(scene: any) {
    super();
    this.scene = scene;
  }

  /**
   * エラーからの復旧を試みる
   * @param errorType - エラー種別
   * @param context - エラーコンテキスト
   * @param options - リカバリーオプション
   * @returns リカバリー結果のPromise
   */
  public async recover(
    errorType: ChapterStageError,
    context: ErrorContext,
    options: RecoveryOptions = {}
  ): Promise<RecoveryResult> {
    if (this.isRecovering) {
      return {
        success: false,
        action: RecoveryAction.CONTINUE,
        message: '既にリカバリー処理中です',
      };
    }

    this.isRecovering = true;

    try {
      // エラー種別に応じたリカバリー処理
      const result = await this.performRecovery(errorType, context, options);
      return result;
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * リカバリー処理を実行する
   * @param errorType - エラー種別
   * @param context - エラーコンテキスト
   * @param options - リカバリーオプション
   * @returns リカバリー結果
   */
  private async performRecovery(
    errorType: ChapterStageError,
    context: ErrorContext,
    options: RecoveryOptions
  ): Promise<RecoveryResult> {
    switch (errorType) {
      case ChapterStageError.SAVE_DATA_CORRUPTED:
      case ChapterStageError.DATA_LOAD_FAILED:
        return await this.handleCriticalError(context);

      case ChapterStageError.SAVE_FAILED:
        return await this.handleSaveError(context, options);

      case ChapterStageError.LOAD_FAILED:
        return await this.handleLoadError(context, options);

      case ChapterStageError.PARTY_FULL:
      case ChapterStageError.CHARACTER_LOST:
      case ChapterStageError.CHARACTER_NOT_AVAILABLE:
        return this.handlePartyError(context);

      case ChapterStageError.STAGE_NOT_UNLOCKED:
      case ChapterStageError.CHAPTER_NOT_UNLOCKED:
        return this.handleUnlockError(context);

      default:
        return this.handleGenericError(context);
    }
  }

  /**
   * 重大なエラーを処理する（タイトル画面に戻る）
   * @param context - エラーコンテキスト
   * @returns リカバリー結果
   */
  private async handleCriticalError(
    context: ErrorContext
  ): Promise<RecoveryResult> {
    // ユーザーに確認を求める
    const shouldReturn = await this.showConfirmDialog(
      '重大なエラーが発生しました',
      'タイトル画面に戻りますか？',
      ['タイトルに戻る', 'キャンセル']
    );

    if (shouldReturn) {
      // 安全な状態を保存
      await this.saveSafeState();

      // タイトル画面に遷移
      this.returnToTitle();

      return {
        success: true,
        action: RecoveryAction.RETURN_TO_TITLE,
        message: 'タイトル画面に戻りました',
      };
    }

    return {
      success: false,
      action: RecoveryAction.CONTINUE,
      message: 'リカバリーがキャンセルされました',
    };
  }

  /**
   * セーブエラーを処理する
   * @param context - エラーコンテキスト
   * @param options - リカバリーオプション
   * @returns リカバリー結果
   */
  private async handleSaveError(
    context: ErrorContext,
    options: RecoveryOptions
  ): Promise<RecoveryResult> {
    const retryKey = `save_${context.slotId || 'default'}`;
    const currentRetries = this.retryCount.get(retryKey) || 0;

    // 最大リトライ回数をチェック
    if (currentRetries >= (options.maxRetries || this.maxRetries)) {
      this.retryCount.delete(retryKey);
      return {
        success: false,
        action: RecoveryAction.CONTINUE,
        message: '最大リトライ回数に達しました',
      };
    }

    // 再試行オプションを表示
    if (options.showRetryButton !== false) {
      const shouldRetry = await this.showConfirmDialog(
        'セーブに失敗しました',
        '再試行しますか？',
        ['再試行', 'キャンセル']
      );

      if (shouldRetry) {
        this.retryCount.set(retryKey, currentRetries + 1);
        this.emit('retry-save', { context });

        return {
          success: true,
          action: RecoveryAction.RETRY,
          message: 'セーブを再試行します',
        };
      }
    }

    return {
      success: false,
      action: RecoveryAction.CONTINUE,
      message: 'セーブがキャンセルされました',
    };
  }

  /**
   * ロードエラーを処理する
   * @param context - エラーコンテキスト
   * @param options - リカバリーオプション
   * @returns リカバリー結果
   */
  private async handleLoadError(
    context: ErrorContext,
    options: RecoveryOptions
  ): Promise<RecoveryResult> {
    const shouldRetry = await this.showConfirmDialog(
      'ロードに失敗しました',
      '別のセーブデータを選択しますか？',
      ['選択する', 'タイトルに戻る']
    );

    if (shouldRetry) {
      this.emit('select-save-slot');
      return {
        success: true,
        action: RecoveryAction.RETRY,
        message: 'セーブデータ選択画面に戻ります',
      };
    }

    this.returnToTitle();
    return {
      success: true,
      action: RecoveryAction.RETURN_TO_TITLE,
      message: 'タイトル画面に戻りました',
    };
  }

  /**
   * パーティ編成エラーを処理する
   * @param context - エラーコンテキスト
   * @returns リカバリー結果
   */
  private handlePartyError(context: ErrorContext): RecoveryResult {
    // パーティ編成画面を維持し、エラーメッセージのみ表示
    return {
      success: true,
      action: RecoveryAction.CONTINUE,
      message: 'パーティ編成を修正してください',
    };
  }

  /**
   * 解放エラーを処理する
   * @param context - エラーコンテキスト
   * @returns リカバリー結果
   */
  private handleUnlockError(context: ErrorContext): RecoveryResult {
    // 解放条件を表示し、選択画面を維持
    this.emit('show-unlock-conditions', context);

    return {
      success: true,
      action: RecoveryAction.CONTINUE,
      message: '解放条件を確認してください',
    };
  }

  /**
   * 一般的なエラーを処理する
   * @param context - エラーコンテキスト
   * @returns リカバリー結果
   */
  private handleGenericError(context: ErrorContext): RecoveryResult {
    return {
      success: true,
      action: RecoveryAction.CONTINUE,
      message: '処理を続行します',
    };
  }

  /**
   * 確認ダイアログを表示する
   * @param title - ダイアログのタイトル
   * @param message - メッセージ
   * @param buttons - ボタンのラベル配列
   * @returns ユーザーの選択結果（最初のボタンがtrueに対応）
   */
  private async showConfirmDialog(
    title: string,
    message: string,
    buttons: string[]
  ): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      const centerX = this.scene.cameras.main.width / 2;
      const centerY = this.scene.cameras.main.height / 2;

      // 背景
      const background = this.scene.add
        .rectangle(centerX, centerY, 500, 250, 0x000000, 0.9)
        .setScrollFactor(0)
        .setDepth(10000);

      // タイトル
      const titleText = this.scene.add
        .text(centerX, centerY - 70, title, {
          fontSize: '24px',
          color: '#ff6b6b',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(10001);

      // メッセージ
      const messageText = this.scene.add
        .text(centerX, centerY - 20, message, {
          fontSize: '18px',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: 450 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(10001);

      // ボタンを作成
      const buttonSpacing = 150;
      const startX = centerX - ((buttons.length - 1) * buttonSpacing) / 2;

      const buttonObjects: Phaser.GameObjects.Text[] = [];

      buttons.forEach((label, index) => {
        const button = this.scene.add
          .text(startX + index * buttonSpacing, centerY + 60, label, {
            fontSize: '18px',
            color: '#ffffff',
            backgroundColor: index === 0 ? '#4a90e2' : '#4a4a4a',
            padding: { x: 20, y: 10 },
          })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(10001)
          .setInteractive({ useHandCursor: true });

        button.on('pointerdown', () => {
          // クリーンアップ
          background.destroy();
          titleText.destroy();
          messageText.destroy();
          buttonObjects.forEach(btn => btn.destroy());

          // 結果を返す
          resolve(index === 0);
        });

        buttonObjects.push(button);
      });
    });
  }

  /**
   * 安全な状態を保存する
   */
  private async saveSafeState(): Promise<void> {
    try {
      // 現在の状態を最小限の情報で保存
      const safeState = {
        timestamp: Date.now(),
        scene: this.scene.scene.key,
      };

      localStorage.setItem('chapter_stage_safe_state', JSON.stringify(safeState));
    } catch (error) {
      console.error('Failed to save safe state:', error);
    }
  }

  /**
   * タイトル画面に戻る
   */
  private returnToTitle(): void {
    // 現在のシーンを停止
    this.scene.scene.stop();

    // タイトルシーンを開始
    this.scene.scene.start('TitleScene');

    this.emit('returned-to-title');
  }

  /**
   * リトライカウントをリセットする
   * @param key - リセットするキー（省略時は全てリセット）
   */
  public resetRetryCount(key?: string): void {
    if (key) {
      this.retryCount.delete(key);
    } else {
      this.retryCount.clear();
    }
  }

  /**
   * 現在のリトライ回数を取得する
   * @param key - 取得するキー
   * @returns リトライ回数
   */
  public getRetryCount(key: string): number {
    return this.retryCount.get(key) || 0;
  }

  /**
   * リカバリー中かどうかを確認する
   * @returns リカバリー中の場合true
   */
  public isRecoveringNow(): boolean {
    return this.isRecovering;
  }

  /**
   * エラーリカバリーマネージャーを破棄する
   */
  public destroy(): void {
    this.removeAllListeners();
    this.retryCount.clear();
    this.isRecovering = false;
  }
}
