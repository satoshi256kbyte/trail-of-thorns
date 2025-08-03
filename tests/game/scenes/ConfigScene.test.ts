// Mock Phaser before importing ConfigScene
const mockAdd = {
  graphics: jest.fn().mockReturnValue({
    fillGradientStyle: jest.fn(),
    fillRect: jest.fn(),
    setDepth: jest.fn(),
    destroy: jest.fn(),
  }),
  text: jest.fn().mockReturnValue({
    setOrigin: jest.fn().mockReturnThis(),
    destroy: jest.fn(),
  }),
  rectangle: jest.fn().mockReturnValue({
    setStrokeStyle: jest.fn().mockReturnThis(),
    setInteractive: jest.fn().mockReturnThis(),
    setFillStyle: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
  }),
  existing: jest.fn(),
};

const mockCameras = {
  main: {
    fadeOut: jest.fn(),
    once: jest.fn(),
  },
};

const mockSceneManager = {
  start: jest.fn(),
};

jest.mock('phaser', () => ({
  Scene: jest.fn().mockImplementation(function (this: any, config: any) {
    this.scene = { key: config.key, start: mockSceneManager.start };
    this.add = mockAdd;
    this.cameras = mockCameras;
    return this;
  }),
  GameObjects: {
    Container: jest.fn().mockImplementation(function (this: any, scene: any, x: number, y: number) {
      this.scene = scene;
      this.x = x;
      this.y = y;
      this.add = jest.fn();
      this.setSize = jest.fn().mockReturnThis();
      this.setInteractive = jest.fn().mockReturnThis();
      this.on = jest.fn().mockReturnThis();
      this.destroy = jest.fn();
      return this;
    }),
  },
  Math: {
    Clamp: jest.fn((value, min, max) => Math.max(min, Math.min(max, value))),
  },
}));

// Mock MenuButton
jest.mock('../../../game/src/ui/MenuButton', () => ({
  MenuButton: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
  })),
}));

// Mock GameConfig
jest.mock('../../../game/src/config/GameConfig', () => ({
  GameConfig: {
    GAME_WIDTH: 1920,
    GAME_HEIGHT: 1080,
  },
}));

import { ConfigScene, ConfigOptions } from '../../../game/src/scenes/ConfigScene';
import { MenuButton } from '../../../game/src/ui/MenuButton';

/**
 * Tests for ConfigScene functionality
 * Covers configuration options, UI controls, and scene navigation
 */
describe('ConfigScene', () => {
  let configScene: ConfigScene;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create new ConfigScene instance
    configScene = new ConfigScene();
  });

  afterEach(() => {
    if (configScene) {
      configScene.destroy();
    }
  });

  describe('Constructor', () => {
    test('should initialize with correct scene key', () => {
      expect(configScene.scene.key).toBe('ConfigScene');
    });

    test('should initialize with default configuration options', () => {
      const configOptions = configScene.getConfigOptions();

      expect(configOptions.masterVolume).toBe(0.8);
      expect(configOptions.sfxVolume).toBe(0.7);
      expect(configOptions.musicVolume).toBe(0.6);
      expect(configOptions.fullscreen).toBe(false);
      expect(configOptions.keyBindings).toEqual({
        up: 'W',
        down: 'S',
        left: 'A',
        right: 'D',
        action: 'SPACE',
        menu: 'ESC',
      });
    });
  });

  describe('Lifecycle Methods', () => {
    test('should log preload phase', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      configScene.preload();

      expect(consoleSpy).toHaveBeenCalledWith('ConfigScene: preload phase');
      consoleSpy.mockRestore();
    });

    test('should initialize scene elements in create method', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      configScene.create();

      expect(consoleSpy).toHaveBeenCalledWith('ConfigScene: create phase');
      expect(consoleSpy).toHaveBeenCalledWith('ConfigScene: initialization completed');
      expect(mockAdd.graphics).toHaveBeenCalled();
      expect(mockAdd.text).toHaveBeenCalled();
      expect(MenuButton).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test('should handle update method without errors', () => {
      expect(() => {
        configScene.update(1000, 16);
      }).not.toThrow();
    });
  });

  describe('Configuration Management', () => {
    test('should get current configuration options', () => {
      const options = configScene.getConfigOptions();

      expect(options).toHaveProperty('masterVolume');
      expect(options).toHaveProperty('sfxVolume');
      expect(options).toHaveProperty('musicVolume');
      expect(options).toHaveProperty('fullscreen');
      expect(options).toHaveProperty('keyBindings');
    });

    test('should set configuration options', () => {
      const newOptions: ConfigOptions = {
        masterVolume: 0.5,
        sfxVolume: 0.4,
        musicVolume: 0.3,
        fullscreen: true,
        keyBindings: {
          up: 'UP',
          down: 'DOWN',
          left: 'LEFT',
          right: 'RIGHT',
          action: 'ENTER',
          menu: 'TAB',
        },
      };

      configScene.setConfigOptions(newOptions);
      const retrievedOptions = configScene.getConfigOptions();

      expect(retrievedOptions).toEqual(newOptions);
    });

    test('should not modify original options object when getting config', () => {
      const options = configScene.getConfigOptions();
      options.masterVolume = 0.1;

      const optionsAgain = configScene.getConfigOptions();
      expect(optionsAgain.masterVolume).toBe(0.8); // Should be original value
    });
  });

  describe('Scene Navigation', () => {
    test('should create back button with correct parameters', () => {
      configScene.create();

      expect(MenuButton).toHaveBeenCalledWith(
        configScene,
        960, // GAME_WIDTH / 2
        918, // GAME_HEIGHT * 0.85
        'Back',
        expect.any(Function),
        150,
        50
      );
    });

    test('should handle back button navigation with fade transition', () => {
      configScene.create();

      // Get the back button callback
      const backButtonCall = (MenuButton as jest.Mock).mock.calls.find(call => call[3] === 'Back');
      expect(backButtonCall).toBeDefined();

      const backCallback = backButtonCall[4];
      backCallback();

      expect(mockCameras.main.fadeOut).toHaveBeenCalledWith(300, 0, 0, 0);
      expect(mockCameras.main.once).toHaveBeenCalledWith(
        'camerafadeoutcomplete',
        expect.any(Function)
      );
    });

    test('should transition to TitleScene after fade out', () => {
      configScene.create();

      const backButtonCall = (MenuButton as jest.Mock).mock.calls.find(call => call[3] === 'Back');
      const backCallback = backButtonCall[4];
      backCallback();

      // Get the fade complete callback and execute it
      const fadeCompleteCallback = mockCameras.main.once.mock.calls[0][1];
      fadeCompleteCallback();

      expect(mockSceneManager.start).toHaveBeenCalledWith('TitleScene');
    });
  });

  describe('Requirements Compliance', () => {
    test('should satisfy requirement 3.2: Display configuration menu', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      configScene.create();

      // Should create title text
      expect(mockAdd.text).toHaveBeenCalledWith(
        960, // centerX
        162, // titleY (GAME_HEIGHT * 0.15)
        'Configuration',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    test('should satisfy requirement 3.3: Show mock settings options', () => {
      configScene.create();

      // Should create graphics for background
      expect(mockAdd.graphics).toHaveBeenCalled();

      // Should create existing components (sliders and toggles)
      expect(mockAdd.existing).toHaveBeenCalled();
    });

    test('should satisfy requirement 3.4: Provide way to return to title screen', () => {
      configScene.create();

      const backButtonCall = (MenuButton as jest.Mock).mock.calls.find(call => call[3] === 'Back');
      expect(backButtonCall).toBeDefined();

      const backCallback = backButtonCall[4];
      backCallback();

      const fadeCompleteCallback = mockCameras.main.once.mock.calls[0][1];
      fadeCompleteCallback();

      expect(mockSceneManager.start).toHaveBeenCalledWith('TitleScene');
    });
  });

  describe('Error Handling', () => {
    test('should handle errors in background setup gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockGraphics = {
        fillGradientStyle: jest.fn(() => {
          throw new Error('Test error');
        }),
        fillRect: jest.fn(),
        setDepth: jest.fn(),
        destroy: jest.fn(),
      };

      mockAdd.graphics.mockReturnValueOnce(mockGraphics);

      expect(() => {
        configScene.create();
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error setting up background:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });

    test('should handle errors in title creation gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockAdd.text.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      expect(() => {
        configScene.create();
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error creating config title:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });

    test('should handle errors in back button handling gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockCameras.main.fadeOut.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      configScene.create();

      const backButtonCall = (MenuButton as jest.Mock).mock.calls.find(call => call[3] === 'Back');
      const backCallback = backButtonCall[4];

      expect(() => {
        backCallback();
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error handling back button:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    test('should clean up all resources on destroy', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      configScene.create();
      configScene.destroy();

      expect(consoleSpy).toHaveBeenCalledWith('ConfigScene: cleanup completed');
      consoleSpy.mockRestore();
    });

    test('should handle destroy when components are undefined', () => {
      expect(() => {
        configScene.destroy();
      }).not.toThrow();
    });
  });
});
