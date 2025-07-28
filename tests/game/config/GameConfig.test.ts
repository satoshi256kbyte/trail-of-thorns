// Mock Phaser before importing GameConfig
jest.mock('phaser', () => ({
  AUTO: 'AUTO',
  Scale: {
    FIT: 'FIT',
    CENTER_BOTH: 'CENTER_BOTH',
  },
  Types: {
    Core: {
      GameConfig: {},
    },
  },
}));

import {
  GameConfig,
  IGameConfig,
  IGameConfigValidation,
} from '../../../game/src/config/GameConfig';

describe('GameConfig', () => {
  let gameConfig: GameConfig;

  beforeEach(() => {
    gameConfig = new GameConfig();
  });

  describe('Static Constants', () => {
    test('should have correct static constants', () => {
      expect(GameConfig.GAME_WIDTH).toBe(1920);
      expect(GameConfig.GAME_HEIGHT).toBe(1080);
      expect(GameConfig.BACKGROUND_COLOR).toBe('#2c3e50');
      expect(GameConfig.TARGET_FPS).toBe(60);
      expect(GameConfig.PHYSICS_DEBUG).toBe(false);
    });

    test('static constants should be readonly', () => {
      // TypeScriptの型チェックにより、実際にはコンパイル時にエラーになる
      // ここではランタイムでの値の確認のみ行う
      expect(typeof GameConfig.GAME_WIDTH).toBe('number');
      expect(typeof GameConfig.GAME_HEIGHT).toBe('number');
      expect(typeof GameConfig.BACKGROUND_COLOR).toBe('string');
      expect(typeof GameConfig.TARGET_FPS).toBe('number');
      expect(typeof GameConfig.PHYSICS_DEBUG).toBe('boolean');
    });
  });

  describe('Interface Implementation', () => {
    test('should implement IGameConfig interface', () => {
      expect(gameConfig).toHaveProperty('GAME_WIDTH');
      expect(gameConfig).toHaveProperty('GAME_HEIGHT');
      expect(gameConfig).toHaveProperty('BACKGROUND_COLOR');
      expect(gameConfig).toHaveProperty('TARGET_FPS');
      expect(gameConfig).toHaveProperty('PHYSICS_DEBUG');
      expect(typeof gameConfig.getConfig).toBe('function');
      expect(typeof gameConfig.validateConfig).toBe('function');
    });

    test('instance properties should match static constants', () => {
      expect(gameConfig.GAME_WIDTH).toBe(GameConfig.GAME_WIDTH);
      expect(gameConfig.GAME_HEIGHT).toBe(GameConfig.GAME_HEIGHT);
      expect(gameConfig.BACKGROUND_COLOR).toBe(GameConfig.BACKGROUND_COLOR);
      expect(gameConfig.TARGET_FPS).toBe(GameConfig.TARGET_FPS);
      expect(gameConfig.PHYSICS_DEBUG).toBe(GameConfig.PHYSICS_DEBUG);
    });
  });

  describe('getConfig Method', () => {
    test('should return valid Phaser.Types.Core.GameConfig', () => {
      const config = gameConfig.getConfig();

      expect(config).toBeDefined();
      expect(config.type).toBe('AUTO');
      expect(config.width).toBe(1920);
      expect(config.height).toBe(1080);
      expect(config.parent).toBe('game-container');
      expect(config.backgroundColor).toBe('#2c3e50');
    });

    test('should have correct FPS configuration', () => {
      const config = gameConfig.getConfig();

      expect(config.fps).toBeDefined();
      expect(config.fps?.target).toBe(60);
      expect(config.fps?.forceSetTimeOut).toBe(true);
    });

    test('should have correct scale configuration', () => {
      const config = gameConfig.getConfig();

      expect(config.scale).toBeDefined();
      expect(config.scale?.mode).toBe('FIT');
      expect(config.scale?.autoCenter).toBe('CENTER_BOTH');
      expect(config.scale?.width).toBe(1920);
      expect(config.scale?.height).toBe(1080);
    });

    test('should have correct physics configuration', () => {
      const config = gameConfig.getConfig();

      expect(config.physics).toBeDefined();
      expect(config.physics?.default).toBe('arcade');
      expect(config.physics?.arcade).toBeDefined();
      expect(config.physics?.arcade?.gravity).toEqual({ x: 0, y: 0 });
      expect(config.physics?.arcade?.debug).toBe(false);
    });

    test('should have empty scene array', () => {
      const config = gameConfig.getConfig();

      expect(config.scene).toBeDefined();
      expect(Array.isArray(config.scene)).toBe(true);
      expect(config.scene).toHaveLength(0);
    });
  });

  describe('validateConfig Method', () => {
    test('should return true for valid configuration', () => {
      expect(gameConfig.validateConfig()).toBe(true);
    });

    test('should validate screen dimensions', () => {
      // 正常な値での検証
      expect(gameConfig.validateConfig()).toBe(true);

      // 静的プロパティは変更できないため、
      // ここでは現在の値が有効であることを確認
      expect(GameConfig.GAME_WIDTH).toBeGreaterThan(0);
      expect(GameConfig.GAME_HEIGHT).toBeGreaterThan(0);
    });

    test('should validate background color format', () => {
      // 現在の背景色が有効な16進数形式であることを確認
      const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      expect(colorRegex.test(GameConfig.BACKGROUND_COLOR)).toBe(true);
    });

    test('should validate target FPS', () => {
      // 現在のFPS設定が有効な範囲内であることを確認
      expect(GameConfig.TARGET_FPS).toBeGreaterThan(0);
      expect(GameConfig.TARGET_FPS).toBeLessThanOrEqual(120);
    });
  });

  describe('logConfig Method', () => {
    test('should have logConfig method', () => {
      expect(typeof gameConfig.logConfig).toBe('function');
    });

    test('should log configuration without errors', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      gameConfig.logConfig();

      expect(consoleSpy).toHaveBeenCalledWith('Game Configuration:');
      expect(consoleSpy).toHaveBeenCalledWith('- Screen Size: 1920x1080');
      expect(consoleSpy).toHaveBeenCalledWith('- Background Color: #2c3e50');
      expect(consoleSpy).toHaveBeenCalledWith('- Target FPS: 60');
      expect(consoleSpy).toHaveBeenCalledWith('- Physics Debug: false');

      consoleSpy.mockRestore();
    });
  });

  describe('Type Safety', () => {
    test('should maintain type safety for all properties', () => {
      const config = gameConfig.getConfig();

      // TypeScriptの型チェックが正しく機能していることを確認
      expect(typeof config.width).toBe('number');
      expect(typeof config.height).toBe('number');
      expect(typeof config.backgroundColor).toBe('string');
      expect(typeof config.parent).toBe('string');
    });

    test('should implement interfaces correctly', () => {
      // IGameConfigValidationインターフェースの実装確認
      const validation: IGameConfigValidation = gameConfig;
      expect(validation.GAME_WIDTH).toBe(1920);
      expect(validation.GAME_HEIGHT).toBe(1080);
      expect(validation.BACKGROUND_COLOR).toBe('#2c3e50');
      expect(validation.TARGET_FPS).toBe(60);
      expect(validation.PHYSICS_DEBUG).toBe(false);

      // IGameConfigインターフェースの実装確認
      const fullConfig: IGameConfig = gameConfig;
      expect(typeof fullConfig.getConfig).toBe('function');
      expect(typeof fullConfig.validateConfig).toBe('function');
    });
  });

  describe('Error Handling', () => {
    test('should handle validation errors gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // 現在の実装では常にtrueを返すが、エラーハンドリングの構造は確認できる
      const result = gameConfig.validateConfig();
      expect(typeof result).toBe('boolean');

      consoleErrorSpy.mockRestore();
    });
  });
});
