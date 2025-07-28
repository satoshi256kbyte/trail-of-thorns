import * as Phaser from 'phaser';

/**
 * ゲーム設定の検証用インターフェース
 */
export interface IGameConfigValidation {
  readonly GAME_WIDTH: number;
  readonly GAME_HEIGHT: number;
  readonly BACKGROUND_COLOR: string;
  readonly TARGET_FPS: number;
  readonly PHYSICS_DEBUG: boolean;
}

/**
 * ゲーム設定の型定義
 */
export interface IGameConfig extends IGameConfigValidation {
  getConfig(): Phaser.Types.Core.GameConfig;
  validateConfig(): boolean;
}

/**
 * TypeScript型付きGameConfigクラス
 * ゲームの基本設定を管理し、Phaserに適切な設定を提供する
 */
export class GameConfig implements IGameConfig {
  // 静的設定定数
  public static readonly GAME_WIDTH = 1920;
  public static readonly GAME_HEIGHT = 1080;
  public static readonly BACKGROUND_COLOR = '#2c3e50';
  public static readonly TARGET_FPS = 60;
  public static readonly PHYSICS_DEBUG = false;

  // インスタンス用のプロパティ（インターフェース実装のため）
  public readonly GAME_WIDTH = GameConfig.GAME_WIDTH;
  public readonly GAME_HEIGHT = GameConfig.GAME_HEIGHT;
  public readonly BACKGROUND_COLOR = GameConfig.BACKGROUND_COLOR;
  public readonly TARGET_FPS = GameConfig.TARGET_FPS;
  public readonly PHYSICS_DEBUG = GameConfig.PHYSICS_DEBUG;

  /**
   * 適切に型付けされたPhaser.Types.Core.GameConfigを返す
   * @returns Phaserゲーム設定オブジェクト
   */
  public getConfig(): Phaser.Types.Core.GameConfig {
    return {
      type: Phaser.AUTO,
      width: GameConfig.GAME_WIDTH,
      height: GameConfig.GAME_HEIGHT,
      parent: 'game-container',
      backgroundColor: GameConfig.BACKGROUND_COLOR,
      fps: {
        target: GameConfig.TARGET_FPS,
        forceSetTimeOut: true,
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GameConfig.GAME_WIDTH,
        height: GameConfig.GAME_HEIGHT,
        min: {
          width: 800,
          height: 600,
        },
        max: {
          width: GameConfig.GAME_WIDTH,
          height: GameConfig.GAME_HEIGHT,
        },
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: GameConfig.PHYSICS_DEBUG,
        },
      },
      scene: [], // シーンは後で追加される
    };
  }

  /**
   * 設定値の検証を行う
   * @returns 設定が有効な場合はtrue、無効な場合はfalse
   */
  public validateConfig(): boolean {
    try {
      // 画面サイズの検証
      if (GameConfig.GAME_WIDTH <= 0 || GameConfig.GAME_HEIGHT <= 0) {
        console.error('Invalid screen dimensions');
        return false;
      }

      // 背景色の検証（16進数カラーコード）
      const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!colorRegex.test(GameConfig.BACKGROUND_COLOR)) {
        console.error('Invalid background color format');
        return false;
      }

      // FPSの検証
      if (GameConfig.TARGET_FPS <= 0 || GameConfig.TARGET_FPS > 120) {
        console.error('Invalid target FPS');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Config validation error:', error);
      return false;
    }
  }

  /**
   * 設定値をコンソールに出力する（デバッグ用）
   */
  public logConfig(): void {
    console.log('Game Configuration:');
    console.log(`- Screen Size: ${GameConfig.GAME_WIDTH}x${GameConfig.GAME_HEIGHT}`);
    console.log(`- Background Color: ${GameConfig.BACKGROUND_COLOR}`);
    console.log(`- Target FPS: ${GameConfig.TARGET_FPS}`);
    console.log(`- Physics Debug: ${GameConfig.PHYSICS_DEBUG}`);
  }
}
