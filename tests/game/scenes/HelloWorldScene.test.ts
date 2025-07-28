// Mock Phaser before importing HelloWorldScene
const mockAdd = {
  text: jest.fn().mockReturnValue({
    setOrigin: jest.fn().mockReturnThis(),
    destroy: jest.fn(),
  }),
  graphics: jest.fn().mockReturnValue({
    fillStyle: jest.fn().mockReturnThis(),
    fillRect: jest.fn().mockReturnThis(),
    setDepth: jest.fn().mockReturnThis(),
    destroy: jest.fn(),
  }),
};

jest.mock('phaser', () => ({
  Scene: jest.fn().mockImplementation(function (this: any, config: any) {
    this.scene = { key: config.key };
    this.add = mockAdd;
    return this;
  }),
  Display: {
    Color: {
      HexStringToColor: jest.fn().mockReturnValue({ color: 0x2c3e50 }),
    },
  },
  Types: {
    GameObjects: {
      Text: {
        TextStyle: {},
      },
    },
  },
}));

// Mock GameConfig
jest.mock('../../../game/src/config/GameConfig', () => ({
  GameConfig: {
    GAME_WIDTH: 1920,
    GAME_HEIGHT: 1080,
    BACKGROUND_COLOR: '#2c3e50',
  },
}));

import { HelloWorldScene } from '../../../game/src/scenes/HelloWorldScene';

describe('HelloWorldScene', () => {
  let scene: HelloWorldScene;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock console.log to avoid cluttering test output
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    // Reset mocks
    jest.clearAllMocks();

    // Create new scene instance
    scene = new HelloWorldScene();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Scene Creation and Key Assignment', () => {
    test('should create scene with correct key', () => {
      expect(scene).toBeDefined();
      expect(scene.scene.key).toBe('HelloWorldScene');
    });

    test('should be instance of HelloWorldScene', () => {
      expect(scene).toBeInstanceOf(HelloWorldScene);
    });

    test('should have scene property with key', () => {
      expect(scene.scene).toBeDefined();
      expect(scene.scene.key).toBe('HelloWorldScene');
    });
  });

  describe('Method Existence', () => {
    test('should have all required Phaser lifecycle methods', () => {
      expect(typeof scene.preload).toBe('function');
      expect(typeof scene.create).toBe('function');
      expect(typeof scene.update).toBe('function');
    });

    test('should have destroy method', () => {
      expect(typeof scene.destroy).toBe('function');
    });

    test('should have proper method signatures', () => {
      // Test that methods can be called without throwing errors
      expect(() => scene.preload()).not.toThrow();
      expect(() => scene.create()).not.toThrow();
      expect(() => scene.update(0, 0)).not.toThrow();
      expect(() => scene.destroy()).not.toThrow();
    });
  });

  describe('Preload Method', () => {
    test('should execute preload without errors', () => {
      expect(() => scene.preload()).not.toThrow();
    });

    test('should log preload phase message', () => {
      scene.preload();
      expect(consoleSpy).toHaveBeenCalledWith('HelloWorldScene: preload phase');
    });
  });

  describe('Create Method', () => {
    test('should execute create without errors', () => {
      expect(() => scene.create()).not.toThrow();
    });

    test('should log create phase and completion messages', () => {
      scene.create();
      expect(consoleSpy).toHaveBeenCalledWith('HelloWorldScene: create phase');
      expect(consoleSpy).toHaveBeenCalledWith('HelloWorldScene: initialization completed');
    });

    test('should call text creation methods', () => {
      scene.create();

      expect(mockAdd.text).toHaveBeenCalledWith(
        960, // centerX (1920/2)
        540, // centerY (1080/2)
        'Hello World',
        expect.objectContaining({
          fontSize: '64px',
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 4,
        })
      );

      expect(mockAdd.graphics).toHaveBeenCalled();
    });

    test('should setup background graphics', () => {
      const mockGraphics = {
        fillStyle: jest.fn().mockReturnThis(),
        fillRect: jest.fn().mockReturnThis(),
        setDepth: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
      };

      mockAdd.graphics.mockReturnValue(mockGraphics);

      scene.create();

      expect(mockAdd.graphics).toHaveBeenCalled();
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(0x2c3e50);
      expect(mockGraphics.fillRect).toHaveBeenCalledWith(0, 0, 1920, 1080);
      expect(mockGraphics.setDepth).toHaveBeenCalledWith(-1);
    });
  });

  describe('Update Method', () => {
    test('should execute update without errors', () => {
      expect(() => scene.update(1000, 16)).not.toThrow();
    });

    test('should accept time and delta parameters', () => {
      const time = 1000;
      const delta = 16;

      expect(() => scene.update(time, delta)).not.toThrow();
    });

    test('should handle different parameter values', () => {
      expect(() => scene.update(0, 0)).not.toThrow();
      expect(() => scene.update(5000, 33)).not.toThrow();
      expect(() => scene.update(-1, -1)).not.toThrow();
    });
  });

  describe('Destroy Method', () => {
    test('should execute destroy without errors', () => {
      expect(() => scene.destroy()).not.toThrow();
    });

    test('should log cleanup completion message', () => {
      scene.destroy();
      expect(consoleSpy).toHaveBeenCalledWith('HelloWorldScene: cleanup completed');
    });

    test('should handle cleanup when objects exist', () => {
      // First create the scene to initialize objects
      scene.create();

      // Mock objects that might exist
      const mockText = { destroy: jest.fn() };
      const mockGraphics = { destroy: jest.fn() };

      // Set private properties (accessing via any to bypass TypeScript)
      (scene as any).helloText = mockText;
      (scene as any).backgroundGraphics = mockGraphics;

      scene.destroy();

      expect(mockText.destroy).toHaveBeenCalled();
      expect(mockGraphics.destroy).toHaveBeenCalled();
    });

    test('should handle cleanup when objects do not exist', () => {
      // Ensure objects are undefined
      (scene as any).helloText = undefined;
      (scene as any).backgroundGraphics = undefined;

      expect(() => scene.destroy()).not.toThrow();
    });
  });

  describe('TypeScript Type Safety', () => {
    test('should maintain proper TypeScript types', () => {
      // Test that the scene maintains proper typing
      expect(scene.scene.key).toBe('HelloWorldScene');

      // Test method return types
      const preloadResult = scene.preload();
      const updateResult = scene.update(0, 0);
      const destroyResult = scene.destroy();

      expect(preloadResult).toBeUndefined();
      expect(updateResult).toBeUndefined();
      expect(destroyResult).toBeUndefined();
    });

    test('should handle method parameters correctly', () => {
      // Test that update method accepts number parameters
      expect(() => {
        const time: number = 1000;
        const delta: number = 16;
        scene.update(time, delta);
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle errors in text creation gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock add.text to throw an error
      mockAdd.text.mockImplementationOnce(() => {
        throw new Error('Mock text creation error');
      });

      // Should not throw, but should log error
      expect(() => scene.create()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error creating Hello World text:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    test('should handle errors in background setup gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock add.graphics to throw an error
      mockAdd.graphics.mockImplementationOnce(() => {
        throw new Error('Mock graphics creation error');
      });

      // Should not throw, but should log error
      expect(() => scene.create()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error setting up background:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Integration with GameConfig', () => {
    test('should use GameConfig constants for positioning', () => {
      scene.create();

      // Verify that text is positioned at center using GameConfig values
      expect(mockAdd.text).toHaveBeenCalledWith(
        960, // GameConfig.GAME_WIDTH / 2
        540, // GameConfig.GAME_HEIGHT / 2
        'Hello World',
        expect.any(Object)
      );
    });

    test('should use GameConfig constants for background dimensions', () => {
      const mockGraphics = {
        fillStyle: jest.fn().mockReturnThis(),
        fillRect: jest.fn().mockReturnThis(),
        setDepth: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
      };

      mockAdd.graphics.mockReturnValue(mockGraphics);

      scene.create();

      // Verify that graphics uses GameConfig dimensions
      expect(mockGraphics.fillRect).toHaveBeenCalledWith(0, 0, 1920, 1080);
    });
  });

  describe('Text Style Configuration', () => {
    test('should create text with proper styling', () => {
      scene.create();

      expect(mockAdd.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        'Hello World',
        expect.objectContaining({
          fontSize: '64px',
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 4,
          shadow: expect.objectContaining({
            offsetX: 2,
            offsetY: 2,
            color: '#000000',
            blur: 4,
            fill: true,
          }),
        })
      );
    });

    test('should set text origin to center', () => {
      const mockText = {
        setOrigin: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
      };

      mockAdd.text.mockReturnValue(mockText);

      scene.create();

      expect(mockText.setOrigin).toHaveBeenCalledWith(0.5, 0.5);
    });
  });
});
