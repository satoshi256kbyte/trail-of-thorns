import * as Phaser from 'phaser';
import { TerrainCost, MovementAnimationConfig } from '../types/movement';

/**
 * Movement system configuration options
 */
export interface MovementSystemConfig {
  /** Enable visual feedback for movement range and paths */
  enableVisualFeedback: boolean;
  /** Enable path preview when hovering over destinations */
  enablePathPreview: boolean;
  /** Enable smooth movement animations */
  enableMovementAnimation: boolean;
  /** Enable debug visualization for movement calculations */
  enableMovementDebug: boolean;
  /** Show movement range calculations in debug mode */
  showMovementRangeDebug: boolean;
  /** Show pathfinding algorithm steps in debug mode */
  showPathfindingDebug: boolean;
  /** Show movement cost calculations in debug mode */
  showMovementCostDebug: boolean;
  /** Terrain cost configuration */
  terrainCosts: TerrainCost;
  /** Movement animation configuration */
  animationConfig: MovementAnimationConfig;
  /** Debug visualization colors */
  debugColors: {
    movementRange: number;
    pathfinding: number;
    movementCost: number;
    blockedTiles: number;
    alternativePaths: number;
  };
}

/**
 * ゲーム設定の検証用インターフェース
 */
export interface IGameConfigValidation {
  readonly GAME_WIDTH: number;
  readonly GAME_HEIGHT: number;
  readonly BACKGROUND_COLOR: string;
  readonly TARGET_FPS: number;
  readonly PHYSICS_DEBUG: boolean;
  readonly MOVEMENT_SYSTEM: MovementSystemConfig;
}

/**
 * ゲーム設定の型定義
 */
export interface IGameConfig extends IGameConfigValidation {
  getConfig(): Phaser.Types.Core.GameConfig;
  validateConfig(): boolean;
  getMovementSystemConfig(): MovementSystemConfig;
  updateMovementSystemConfig(config: Partial<MovementSystemConfig>): void;
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

  // Movement system configuration
  public static readonly MOVEMENT_SYSTEM: MovementSystemConfig = {
    enableVisualFeedback: true,
    enablePathPreview: true,
    enableMovementAnimation: true,
    enableMovementDebug: process.env.NODE_ENV === 'development',
    showMovementRangeDebug: false,
    showPathfindingDebug: false,
    showMovementCostDebug: false,
    terrainCosts: {
      grass: { movementCost: 1, isPassable: true },
      forest: { movementCost: 2, isPassable: true },
      mountain: { movementCost: 3, isPassable: true },
      water: { movementCost: 999, isPassable: false },
      wall: { movementCost: 999, isPassable: false },
      road: { movementCost: 0.5, isPassable: true },
      bridge: { movementCost: 1, isPassable: true },
    },
    animationConfig: {
      moveSpeed: 200, // pixels per second
      turnSpeed: Math.PI * 2, // radians per second (full rotation per second)
      easing: 'Power2',
      stepDelay: 100, // milliseconds between tile movements
    },
    debugColors: {
      movementRange: 0x00ff00,
      pathfinding: 0xff0000,
      movementCost: 0x0000ff,
      blockedTiles: 0xff00ff,
      alternativePaths: 0xffff00,
    },
  };

  // インスタンス用のプロパティ（インターフェース実装のため）
  public readonly GAME_WIDTH = GameConfig.GAME_WIDTH;
  public readonly GAME_HEIGHT = GameConfig.GAME_HEIGHT;
  public readonly BACKGROUND_COLOR = GameConfig.BACKGROUND_COLOR;
  public readonly TARGET_FPS = GameConfig.TARGET_FPS;
  public readonly PHYSICS_DEBUG = GameConfig.PHYSICS_DEBUG;
  public readonly MOVEMENT_SYSTEM = GameConfig.MOVEMENT_SYSTEM;

  // Mutable movement system configuration for runtime updates
  private movementSystemConfig: MovementSystemConfig;

  /**
   * Constructor - Initialize mutable configuration
   */
  constructor() {
    // Deep clone the static configuration for runtime modifications
    this.movementSystemConfig = JSON.parse(JSON.stringify(GameConfig.MOVEMENT_SYSTEM));
  }

  /**
   * Get current movement system configuration
   * @returns Movement system configuration
   */
  public getMovementSystemConfig(): MovementSystemConfig {
    return { ...this.movementSystemConfig };
  }

  /**
   * Update movement system configuration
   * @param config - Partial configuration to update
   */
  public updateMovementSystemConfig(config: Partial<MovementSystemConfig>): void {
    this.movementSystemConfig = { ...this.movementSystemConfig, ...config };
    console.log('GameConfig: Movement system configuration updated:', config);
  }

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

      // Movement system configuration validation
      if (!this.validateMovementSystemConfig()) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Config validation error:', error);
      return false;
    }
  }

  /**
   * Validate movement system configuration
   * @returns True if valid, false otherwise
   */
  private validateMovementSystemConfig(): boolean {
    const config = this.movementSystemConfig;

    // Validate animation configuration
    if (config.animationConfig.moveSpeed <= 0) {
      console.error('Invalid movement animation speed');
      return false;
    }

    if (config.animationConfig.turnSpeed <= 0) {
      console.error('Invalid movement turn speed');
      return false;
    }

    if (config.animationConfig.stepDelay < 0) {
      console.error('Invalid movement step delay');
      return false;
    }

    // Validate terrain costs
    for (const [terrainType, terrainData] of Object.entries(config.terrainCosts)) {
      if (terrainData.movementCost < 0) {
        console.error(
          `Invalid movement cost for terrain ${terrainType}: ${terrainData.movementCost}`
        );
        return false;
      }
    }

    // Validate debug colors (should be valid hex colors)
    for (const [colorName, colorValue] of Object.entries(config.debugColors)) {
      if (typeof colorValue !== 'number' || colorValue < 0 || colorValue > 0xffffff) {
        console.error(`Invalid debug color ${colorName}: ${colorValue}`);
        return false;
      }
    }

    return true;
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
    console.log('- Movement System:');
    console.log(`  - Visual Feedback: ${this.movementSystemConfig.enableVisualFeedback}`);
    console.log(`  - Path Preview: ${this.movementSystemConfig.enablePathPreview}`);
    console.log(`  - Movement Animation: ${this.movementSystemConfig.enableMovementAnimation}`);
    console.log(`  - Movement Debug: ${this.movementSystemConfig.enableMovementDebug}`);
    console.log(`  - Animation Speed: ${this.movementSystemConfig.animationConfig.moveSpeed}px/s`);
    console.log(`  - Turn Speed: ${this.movementSystemConfig.animationConfig.turnSpeed}rad/s`);
    console.log(`  - Step Delay: ${this.movementSystemConfig.animationConfig.stepDelay}ms`);
    console.log(
      `  - Terrain Types: ${Object.keys(this.movementSystemConfig.terrainCosts).join(', ')}`
    );
  }
}
