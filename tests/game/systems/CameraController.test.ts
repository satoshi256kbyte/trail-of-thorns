/**
 * Unit tests for CameraController system
 * Tests camera movement, boundary checking, zoom functionality, and input handling
 */

import {
  CameraController,
  CameraConfig,
  CameraBounds,
} from '../../../game/src/systems/CameraController';
import { MapData, GameplayError } from '../../../game/src/types/gameplay';

// Mock Phaser objects
const mockTweens = {
  add: jest.fn().mockImplementation(config => {
    const tween = {
      progress: 0,
      stop: jest.fn(),
      ...config,
    };

    // Simulate immediate completion for most tests
    if (config.onComplete) {
      setTimeout(() => config.onComplete(), 0);
    }

    return tween;
  }),
};

const mockCamera = {
  scrollX: 0,
  scrollY: 0,
  zoom: 1.0,
  width: 800,
  height: 600,
  setScroll: jest.fn(),
  setZoom: jest.fn(),
  setBounds: jest.fn(),
  centerOn: jest.fn(),
};

const mockKeyboard = {
  createCursorKeys: jest.fn().mockReturnValue({
    up: { isDown: false },
    down: { isDown: false },
    left: { isDown: false },
    right: { isDown: false },
  }),
  addKeys: jest.fn().mockReturnValue({
    W: { isDown: false },
    S: { isDown: false },
    A: { isDown: false },
    D: { isDown: false },
  }),
};

const mockInput = {
  keyboard: mockKeyboard,
  activePointer: {
    x: 400,
    y: 300,
  },
};

const mockScale = {
  width: 800,
  height: 600,
};

const mockScene = {
  cameras: {
    main: mockCamera,
  },
  tweens: mockTweens,
  input: mockInput,
  scale: mockScale,
} as any;

const mockEventEmitter = {
  emit: jest.fn(),
};

describe('CameraController', () => {
  let cameraController: CameraController;
  let testMapData: MapData;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset mock camera state
    mockCamera.scrollX = 0;
    mockCamera.scrollY = 0;
    mockCamera.zoom = 1.0;

    // Create test map data
    testMapData = {
      width: 20,
      height: 15,
      tileSize: 32,
      layers: [
        {
          name: 'background',
          type: 'background',
          data: [],
          visible: true,
          opacity: 1.0,
        },
      ],
      playerSpawns: [{ x: 2, y: 2 }],
      enemySpawns: [{ x: 18, y: 13 }],
    };
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with default configuration', () => {
      cameraController = new CameraController(mockScene);

      expect(cameraController).toBeDefined();
      expect(cameraController.getZoom()).toBe(1.0);
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    test('should initialize with custom configuration', () => {
      const customConfig: Partial<CameraConfig> = {
        moveSpeed: 500,
        minZoom: 0.3,
        maxZoom: 3.0,
      };

      cameraController = new CameraController(
        mockScene,
        testMapData,
        customConfig,
        mockEventEmitter
      );

      const config = cameraController.getConfig();
      expect(config.moveSpeed).toBe(500);
      expect(config.minZoom).toBe(0.3);
      expect(config.maxZoom).toBe(3.0);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('camera-initialized', expect.any(Object));
    });

    test('should initialize with map data', () => {
      cameraController = new CameraController(mockScene, testMapData, undefined, mockEventEmitter);

      const bounds = cameraController.getBounds();
      expect(bounds.right).toBe(testMapData.width * testMapData.tileSize + 50); // 20 * 32 + 50 padding
      expect(bounds.bottom).toBe(testMapData.height * testMapData.tileSize + 50); // 15 * 32 + 50 padding
      expect(mockCamera.setBounds).toHaveBeenCalled();
    });
  });

  describe('Map Bounds Management', () => {
    beforeEach(() => {
      cameraController = new CameraController(mockScene, undefined, undefined, mockEventEmitter);
    });

    test('should set map bounds correctly', () => {
      const result = cameraController.setMapBounds(testMapData);

      expect(result.success).toBe(true);

      const bounds = cameraController.getBounds();
      expect(bounds.left).toBe(-50); // -padding
      expect(bounds.right).toBe(640 + 50); // 20 * 32 + padding
      expect(bounds.top).toBe(-50); // -padding
      expect(bounds.bottom).toBe(480 + 50); // 15 * 32 + padding

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'camera-bounds-updated',
        expect.any(Object)
      );
    });

    test('should reject invalid map data', () => {
      const invalidMapData = { ...testMapData, width: -1 };
      const result = cameraController.setMapBounds(invalidMapData as MapData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.MAP_LOAD_FAILED);
    });

    test('should handle null map data', () => {
      const result = cameraController.setMapBounds(null as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.MAP_LOAD_FAILED);
    });
  });

  describe('Camera Movement', () => {
    beforeEach(() => {
      cameraController = new CameraController(mockScene, testMapData, undefined, mockEventEmitter);
    });

    test('should move camera up', () => {
      mockCamera.scrollY = 100;
      const result = cameraController.moveCamera('up', 16);

      expect(result.success).toBe(true);
      expect(mockCamera.setScroll).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'camera-moved',
        expect.objectContaining({
          direction: 'up',
        })
      );
    });

    test('should move camera down', () => {
      const result = cameraController.moveCamera('down', 16);

      expect(result.success).toBe(true);
      expect(mockCamera.setScroll).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'camera-moved',
        expect.objectContaining({
          direction: 'down',
        })
      );
    });

    test('should move camera left', () => {
      mockCamera.scrollX = 100;
      const result = cameraController.moveCamera('left', 16);

      expect(result.success).toBe(true);
      expect(mockCamera.setScroll).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'camera-moved',
        expect.objectContaining({
          direction: 'left',
        })
      );
    });

    test('should move camera right', () => {
      const result = cameraController.moveCamera('right', 16);

      expect(result.success).toBe(true);
      expect(mockCamera.setScroll).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'camera-moved',
        expect.objectContaining({
          direction: 'right',
        })
      );
    });

    test('should reject invalid direction', () => {
      const result = cameraController.moveCamera('invalid' as any, 16);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
    });

    test('should respect map boundaries', () => {
      // Try to move beyond left boundary
      mockCamera.scrollX = -100; // Already at left boundary
      const result = cameraController.moveCamera('left', 16);

      expect(result.success).toBe(true);
      // Should be constrained to boundary
      const lastCall = mockCamera.setScroll.mock.calls[mockCamera.setScroll.mock.calls.length - 1];
      expect(lastCall[0]).toBeGreaterThanOrEqual(-50); // Should not go beyond left bound
    });
  });

  describe('Camera Focus', () => {
    beforeEach(() => {
      cameraController = new CameraController(mockScene, testMapData, undefined, mockEventEmitter);
    });

    test('should focus on position with smooth movement', async () => {
      const result = cameraController.focusOnPosition(320, 240, 100);

      expect(result.success).toBe(true);
      expect(mockTweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          targets: mockCamera,
          duration: 100,
        })
      );

      // Wait for tween completion
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('camera-focused', expect.any(Object));
    });

    test('should focus immediately with zero duration', () => {
      const result = cameraController.focusOnPosition(320, 240, 0);

      expect(result.success).toBe(true);
      expect(mockCamera.setScroll).toHaveBeenCalled();
      expect(mockTweens.add).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'camera-focused',
        expect.objectContaining({
          immediate: true,
        })
      );
    });

    test('should reject invalid coordinates', () => {
      const result = cameraController.focusOnPosition(NaN, 240);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_POSITION);
    });

    test('should constrain focus position to bounds', () => {
      // Try to focus beyond map boundaries
      const result = cameraController.focusOnPosition(-1000, -1000, 0);

      expect(result.success).toBe(true);
      expect(mockCamera.setScroll).toHaveBeenCalled();

      // Should be constrained to valid bounds
      const lastCall = mockCamera.setScroll.mock.calls[mockCamera.setScroll.mock.calls.length - 1];
      expect(lastCall[0]).toBeGreaterThanOrEqual(-50); // Within left bound
      expect(lastCall[1]).toBeGreaterThanOrEqual(-50); // Within top bound
    });
  });

  describe('Camera Zoom', () => {
    beforeEach(() => {
      cameraController = new CameraController(mockScene, testMapData, undefined, mockEventEmitter);
    });

    test('should set zoom with smooth transition', async () => {
      const result = cameraController.setZoom(1.5, 100);

      expect(result.success).toBe(true);
      expect(mockTweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          targets: mockCamera,
          zoom: 1.5,
          duration: 100,
        })
      );

      // Wait for tween completion
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('camera-zoomed', expect.any(Object));
    });

    test('should set zoom immediately with short duration', () => {
      const result = cameraController.setZoom(1.5, 5);

      expect(result.success).toBe(true);
      expect(mockCamera.setZoom).toHaveBeenCalledWith(1.5);
      expect(mockTweens.add).not.toHaveBeenCalled();
    });

    test('should clamp zoom to configured limits', () => {
      // Test zoom above maximum
      const result1 = cameraController.setZoom(5.0, 5);
      expect(result1.success).toBe(true);
      expect(mockCamera.setZoom).toHaveBeenCalledWith(2.0); // Should be clamped to max

      // Test zoom below minimum
      const result2 = cameraController.setZoom(0.1, 5);
      expect(result2.success).toBe(true);
      expect(mockCamera.setZoom).toHaveBeenCalledWith(0.5); // Should be clamped to min
    });

    test('should reject invalid zoom values', () => {
      const result = cameraController.setZoom(NaN);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
    });
  });

  describe('Keyboard Controls', () => {
    beforeEach(() => {
      cameraController = new CameraController(mockScene, testMapData, undefined, mockEventEmitter);
    });

    test('should enable keyboard controls', () => {
      const result = cameraController.enableKeyboardControls();

      expect(result.success).toBe(true);
      expect(mockKeyboard.createCursorKeys).toHaveBeenCalled();
      expect(mockKeyboard.addKeys).toHaveBeenCalledWith('W,S,A,D');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('camera-keyboard-enabled');
    });

    test('should handle missing keyboard input', () => {
      const sceneWithoutKeyboard = {
        ...mockScene,
        input: { ...mockInput, keyboard: null },
      };

      const controller = new CameraController(sceneWithoutKeyboard, testMapData);
      const result = controller.enableKeyboardControls();

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.INVALID_ACTION);
    });

    test('should disable keyboard controls', () => {
      cameraController.enableKeyboardControls();
      cameraController.disableKeyboardControls();

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('camera-keyboard-disabled');
    });

    test('should handle keyboard input in update loop', () => {
      cameraController.enableKeyboardControls();

      // Mock key presses
      const cursors = mockKeyboard.createCursorKeys();
      cursors.up.isDown = true;

      // Spy on moveCamera method
      const moveCameraSpy = jest.spyOn(cameraController, 'moveCamera');

      cameraController.update(16);

      expect(moveCameraSpy).toHaveBeenCalledWith('up', 16);
    });
  });

  describe('Mouse Controls', () => {
    beforeEach(() => {
      cameraController = new CameraController(mockScene, testMapData, undefined, mockEventEmitter);
    });

    test('should enable mouse controls', () => {
      const result = cameraController.enableMouseControls();

      expect(result.success).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('camera-mouse-enabled');
    });

    test('should disable mouse controls', () => {
      cameraController.enableMouseControls();
      cameraController.disableMouseControls();

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('camera-mouse-disabled');
    });

    test('should handle mouse edge scrolling', () => {
      cameraController.enableMouseControls();

      // Mock mouse at left edge
      mockInput.activePointer.x = 10; // Within threshold of 50
      mockInput.activePointer.y = 300;

      // Spy on moveCamera method
      const moveCameraSpy = jest.spyOn(cameraController, 'moveCamera');

      cameraController.update(16);

      expect(moveCameraSpy).toHaveBeenCalledWith('left', 16);
    });
  });

  describe('Boundary Checking', () => {
    beforeEach(() => {
      cameraController = new CameraController(mockScene, testMapData, undefined, mockEventEmitter);
    });

    test('should constrain camera to left boundary', () => {
      mockCamera.scrollX = -200; // Beyond left boundary
      const result = cameraController.moveCamera('left', 16);

      expect(result.success).toBe(true);
      const lastCall = mockCamera.setScroll.mock.calls[mockCamera.setScroll.mock.calls.length - 1];
      expect(lastCall[0]).toBeGreaterThanOrEqual(-50); // Should not go beyond left bound
    });

    test('should constrain camera to right boundary', () => {
      mockCamera.scrollX = 1000; // Beyond right boundary
      const result = cameraController.moveCamera('right', 16);

      expect(result.success).toBe(true);
      const lastCall = mockCamera.setScroll.mock.calls[mockCamera.setScroll.mock.calls.length - 1];
      expect(lastCall[0]).toBeLessThanOrEqual(690); // Should not go beyond right bound (640 + 50 - 800)
    });

    test('should constrain camera to top boundary', () => {
      mockCamera.scrollY = -200; // Beyond top boundary
      const result = cameraController.moveCamera('up', 16);

      expect(result.success).toBe(true);
      const lastCall = mockCamera.setScroll.mock.calls[mockCamera.setScroll.mock.calls.length - 1];
      expect(lastCall[1]).toBeGreaterThanOrEqual(-50); // Should not go beyond top bound
    });

    test('should constrain camera to bottom boundary', () => {
      mockCamera.scrollY = 1000; // Beyond bottom boundary
      const result = cameraController.moveCamera('down', 16);

      expect(result.success).toBe(true);
      const lastCall = mockCamera.setScroll.mock.calls[mockCamera.setScroll.mock.calls.length - 1];
      expect(lastCall[1]).toBeLessThanOrEqual(530); // Should not go beyond bottom bound (480 + 50 - 600)
    });
  });

  describe('State Management', () => {
    beforeEach(() => {
      cameraController = new CameraController(mockScene, testMapData, undefined, mockEventEmitter);
    });

    test('should track movement state', () => {
      expect(cameraController.isCurrentlyMoving()).toBe(false);

      cameraController.focusOnPosition(320, 240, 100);
      expect(cameraController.isCurrentlyMoving()).toBe(true);
    });

    test('should track zoom state', () => {
      expect(cameraController.isCurrentlyZooming()).toBe(false);

      cameraController.setZoom(1.5, 100);
      expect(cameraController.isCurrentlyZooming()).toBe(true);
    });

    test('should stop all movement', () => {
      cameraController.focusOnPosition(320, 240, 100);
      cameraController.setZoom(1.5, 100);

      expect(cameraController.isCurrentlyMoving()).toBe(true);
      expect(cameraController.isCurrentlyZooming()).toBe(true);

      cameraController.stopAllMovement();

      expect(cameraController.isCurrentlyMoving()).toBe(false);
      expect(cameraController.isCurrentlyZooming()).toBe(false);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('camera-movement-stopped');
    });

    test('should reset camera', () => {
      const result = cameraController.reset(true);

      expect(result.success).toBe(true);
      expect(mockCamera.setZoom).toHaveBeenCalledWith(1.0);
      expect(mockCamera.centerOn).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'camera-reset',
        expect.objectContaining({
          immediate: true,
        })
      );
    });
  });

  describe('Configuration Management', () => {
    beforeEach(() => {
      cameraController = new CameraController(mockScene, testMapData, undefined, mockEventEmitter);
    });

    test('should update configuration', () => {
      const newConfig = { moveSpeed: 600, minZoom: 0.3 };
      const result = cameraController.updateConfig(newConfig);

      expect(result.success).toBe(true);

      const config = cameraController.getConfig();
      expect(config.moveSpeed).toBe(600);
      expect(config.minZoom).toBe(0.3);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'camera-config-updated',
        expect.any(Object)
      );
    });

    test('should get current configuration', () => {
      const config = cameraController.getConfig();

      expect(config).toHaveProperty('moveSpeed');
      expect(config).toHaveProperty('minZoom');
      expect(config).toHaveProperty('maxZoom');
      expect(config).toHaveProperty('zoomSpeed');
    });
  });

  describe('Cleanup', () => {
    beforeEach(() => {
      cameraController = new CameraController(mockScene, testMapData, undefined, mockEventEmitter);
    });

    test('should cleanup resources on destroy', () => {
      cameraController.enableKeyboardControls();
      cameraController.enableMouseControls();
      cameraController.focusOnPosition(320, 240, 100);

      cameraController.destroy();

      expect(cameraController.isCurrentlyMoving()).toBe(false);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('camera-destroyed');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      cameraController = new CameraController(mockScene, testMapData, undefined, mockEventEmitter);
    });

    test('should handle tween creation errors gracefully', () => {
      // Mock tween creation to throw error
      mockTweens.add.mockImplementationOnce(() => {
        throw new Error('Tween creation failed');
      });

      const result = cameraController.focusOnPosition(320, 240, 100);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.CAMERA_BOUNDS_ERROR);
    });

    test('should handle camera operation errors gracefully', () => {
      // Mock camera setScroll to throw error
      mockCamera.setScroll.mockImplementationOnce(() => {
        throw new Error('Camera operation failed');
      });

      const result = cameraController.moveCamera('up', 16);

      expect(result.success).toBe(false);
      expect(result.error).toBe(GameplayError.CAMERA_BOUNDS_ERROR);
    });
  });
});
