/**
 * ゲーム結果処理システム
 * 勝利・敗北時の処理とシーン遷移を管理
 */

import * as Phaser from 'phaser';
import { GameResult } from '../../types/victory';

/**
 * ゲーム結果処理の結果
 */
export interface GameResultHandlerResult {
  success: boolean;
  transitionComplete: boolean;
  error?: string;
}

/**
 * シーン遷移オプション
 */
export interface SceneTransitionOptions {
  duration?: number; // 遷移時間（ミリ秒）
  fadeOut?: boolean; // フェードアウトするか
  fadeIn?: boolean; // フェードインするか
  data?: any; // 次のシーンに渡すデータ
}

/**
 * ゲーム結果処理クラス
 * 勝利・敗北時の処理、画面遷移、ゲーム進行停止を管理
 */
export class GameResultHandler extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private isGameStopped: boolean = false;
  private currentResult: GameResult | null = null;

  /**
   * コンストラクタ
   * @param scene Phaserシーン
   */
  constructor(scene: Phaser.Scene) {
    super();
    this.scene = scene;
  }

  /**
   * 勝利時処理
   * ゲーム進行を停止し、勝利画面への遷移を準備
   * @param result ゲーム結果
   * @returns 処理結果
   */
  async handleVictory(result: GameResult): Promise<GameResultHandlerResult> {
    try {
      console.log('[GameResultHandler] 勝利処理開始:', result);

      // 既に処理済みの場合はスキップ
      if (this.isGameStopped) {
        console.warn('[GameResultHandler] ゲームは既に停止しています');
        return {
          success: false,
          transitionComplete: false,
          error: 'Game already stopped',
        };
      }

      // 結果を保存
      this.currentResult = result;

      // ゲーム進行を停止
      this.stopGameProgression();

      // 勝利イベントを発行
      this.emit('victory', result);

      console.log('[GameResultHandler] 勝利処理完了');

      return {
        success: true,
        transitionComplete: false, // 遷移は別途実行
      };
    } catch (error) {
      console.error('[GameResultHandler] 勝利処理エラー:', error);
      return {
        success: false,
        transitionComplete: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 敗北時処理
   * ゲーム進行を停止し、敗北画面への遷移を準備
   * @param result ゲーム結果
   * @returns 処理結果
   */
  async handleDefeat(result: GameResult): Promise<GameResultHandlerResult> {
    try {
      console.log('[GameResultHandler] 敗北処理開始:', result);

      // 既に処理済みの場合はスキップ
      if (this.isGameStopped) {
        console.warn('[GameResultHandler] ゲームは既に停止しています');
        return {
          success: false,
          transitionComplete: false,
          error: 'Game already stopped',
        };
      }

      // 結果を保存
      this.currentResult = result;

      // ゲーム進行を停止
      this.stopGameProgression();

      // 敗北イベントを発行
      this.emit('defeat', result);

      console.log('[GameResultHandler] 敗北処理完了');

      return {
        success: true,
        transitionComplete: false, // 遷移は別途実行
      };
    } catch (error) {
      console.error('[GameResultHandler] 敗北処理エラー:', error);
      return {
        success: false,
        transitionComplete: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 勝利画面への遷移
   * @param options 遷移オプション
   * @returns 処理結果
   */
  async transitionToVictoryScreen(
    options: SceneTransitionOptions = {}
  ): Promise<GameResultHandlerResult> {
    try {
      console.log('[GameResultHandler] 勝利画面への遷移開始');

      // デフォルトオプション
      const defaultOptions: SceneTransitionOptions = {
        duration: 1000,
        fadeOut: true,
        fadeIn: true,
        data: {
          result: this.currentResult,
          previousScene: this.scene.scene.key,
        },
      };

      const transitionOptions = { ...defaultOptions, ...options };

      // フェードアウト
      if (transitionOptions.fadeOut) {
        await this.fadeOut(transitionOptions.duration!);
      }

      // シーン遷移イベントを発行
      this.emit('transition-to-victory', transitionOptions.data);

      // 実際のシーン遷移は外部で実行される想定
      // （VictoryConditionSystemやGameplaySceneが処理）
      console.log('[GameResultHandler] 勝利画面遷移準備完了');

      return {
        success: true,
        transitionComplete: true,
      };
    } catch (error) {
      console.error('[GameResultHandler] 勝利画面遷移エラー:', error);
      return {
        success: false,
        transitionComplete: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 敗北画面への遷移
   * @param options 遷移オプション
   * @returns 処理結果
   */
  async transitionToDefeatScreen(
    options: SceneTransitionOptions = {}
  ): Promise<GameResultHandlerResult> {
    try {
      console.log('[GameResultHandler] 敗北画面への遷移開始');

      // デフォルトオプション
      const defaultOptions: SceneTransitionOptions = {
        duration: 1000,
        fadeOut: true,
        fadeIn: true,
        data: {
          result: this.currentResult,
          previousScene: this.scene.scene.key,
        },
      };

      const transitionOptions = { ...defaultOptions, ...options };

      // フェードアウト
      if (transitionOptions.fadeOut) {
        await this.fadeOut(transitionOptions.duration!);
      }

      // シーン遷移イベントを発行
      this.emit('transition-to-defeat', transitionOptions.data);

      // 実際のシーン遷移は外部で実行される想定
      // （VictoryConditionSystemやGameplaySceneが処理）
      console.log('[GameResultHandler] 敗北画面遷移準備完了');

      return {
        success: true,
        transitionComplete: true,
      };
    } catch (error) {
      console.error('[GameResultHandler] 敗北画面遷移エラー:', error);
      return {
        success: false,
        transitionComplete: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * ゲーム進行停止
   * ターン進行、入力処理、AI処理などを停止
   */
  stopGameProgression(): void {
    if (this.isGameStopped) {
      console.warn('[GameResultHandler] ゲームは既に停止しています');
      return;
    }

    console.log('[GameResultHandler] ゲーム進行を停止');

    // ゲーム停止フラグを設定
    this.isGameStopped = true;

    // ゲーム停止イベントを発行
    this.emit('game-stopped');

    // シーンの入力を無効化
    if (this.scene.input) {
      this.scene.input.enabled = false;
    }

    // シーンの物理演算を停止（存在する場合）
    if (this.scene.physics && this.scene.physics.world) {
      this.scene.physics.pause();
    }

    // タイマーイベントを停止
    if (this.scene.time) {
      this.scene.time.paused = true;
    }

    console.log('[GameResultHandler] ゲーム進行停止完了');
  }

  /**
   * フェードアウト処理
   * @param duration フェード時間（ミリ秒）
   */
  private fadeOut(duration: number): Promise<void> {
    return new Promise((resolve) => {
      // カメラのフェードアウト
      if (this.scene.cameras && this.scene.cameras.main) {
        this.scene.cameras.main.fadeOut(duration, 0, 0, 0);

        // フェード完了を待つ
        this.scene.cameras.main.once('camerafadeoutcomplete', () => {
          resolve();
        });
      } else {
        // カメラが存在しない場合は即座に完了
        resolve();
      }
    });
  }

  /**
   * ゲームが停止しているかどうか
   * @returns 停止している場合true
   */
  isGameProgressionStopped(): boolean {
    return this.isGameStopped;
  }

  /**
   * 現在のゲーム結果を取得
   * @returns ゲーム結果（存在しない場合null）
   */
  getCurrentResult(): GameResult | null {
    return this.currentResult;
  }

  /**
   * リセット
   * 次のステージのために状態をリセット
   */
  reset(): void {
    console.log('[GameResultHandler] リセット');

    this.isGameStopped = false;
    this.currentResult = null;

    // シーンの入力を有効化
    if (this.scene.input) {
      this.scene.input.enabled = true;
    }

    // シーンの物理演算を再開（存在する場合）
    if (this.scene.physics && this.scene.physics.world) {
      this.scene.physics.resume();
    }

    // タイマーイベントを再開
    if (this.scene.time) {
      this.scene.time.paused = false;
    }

    // イベントリスナーをクリア
    this.removeAllListeners();
  }

  /**
   * 破棄処理
   */
  destroy(): void {
    console.log('[GameResultHandler] 破棄');

    this.reset();
    this.scene = null as any;
  }
}
