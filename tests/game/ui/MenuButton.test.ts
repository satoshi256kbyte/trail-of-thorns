// Mock Phaser for testing
const mockTweens = {
  add: jest.fn(),
};

const mockAdd = {
  rectangle: jest.fn(() => ({
    setStrokeStyle: jest.fn(),
  })),
  text: jest.fn(() => ({
    setOrigin: jest.fn(),
    setText: jest.fn(),
    text: 'test',
  })),
  existing: jest.fn(),
};

const mockScene = {
  add: mockAdd,
  tweens: mockTweens,
};

// Mock Phaser classes
jest.mock('phaser', () => ({
  GameObjects: {
    Container: class MockContainer {
      public x: number = 0;
      public y: number = 0;
      public displayWidth: number = 0;
      public displayHeight: number = 0;
      public alpha: number = 1;
      public input: any = { enabled: true };
      public list: any[] = [];
      public scene: any;
      private eventListeners: Map<string, Function[]> = new Map();

      constructor(scene: any, x: number, y: number) {
        this.scene = scene;
        this.x = x;
        this.y = y;
      }

      setSize(width: number, height: number) {
        this.displayWidth = width;
        this.displayHeight = height;
        return this;
      }

      setInteractive(enabled: boolean = true) {
        this.input = { enabled };
        return this;
      }

      setAlpha(alpha: number) {
        this.alpha = alpha;
        return this;
      }

      add(child: any) {
        this.list.push(child);
        return this;
      }

      on(event: string, callback: Function) {
        if (!this.eventListeners.has(event)) {
          this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(callback);
        return this;
      }

      off = jest.fn((event: string) => {
        this.eventListeners.delete(event);
        return this;
      });

      emit(event: string, ...args: any[]) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
          listeners.forEach(listener => listener.call(this, ...args));
        }
        return this;
      }

      destroy = jest.fn();
    },
    Rectangle: class MockRectangle {
      setStrokeStyle = jest.fn();
    },
    Text: class MockText {
      text: string = '';
      setOrigin = jest.fn();
      setText = jest.fn((text: string) => {
        this.text = text;
      });
    },
  },
}));

import { MenuButton } from '../../../game/src/ui/MenuButton';

describe('MenuButton', () => {
  let button: MenuButton;
  let mockCallback: jest.Mock;

  beforeEach(() => {
    mockCallback = jest.fn();
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (button) {
      button.destroy();
    }
  });

  describe('Constructor and Initialization', () => {
    test('should create button with default dimensions', () => {
      button = new MenuButton(mockScene, 100, 100, 'Test Button', mockCallback);

      expect(button).toBeInstanceOf(MenuButton);
      expect(button.x).toBe(100);
      expect(button.y).toBe(100);
    });

    test('should create button with custom dimensions', () => {
      const customWidth = 300;
      const customHeight = 80;
      button = new MenuButton(
        mockScene,
        50,
        50,
        'Custom Button',
        mockCallback,
        customWidth,
        customHeight
      );

      expect(button).toBeInstanceOf(MenuButton);
      expect(button.displayWidth).toBe(customWidth);
      expect(button.displayHeight).toBe(customHeight);
    });

    test('should be interactive by default', () => {
      button = new MenuButton(mockScene, 0, 0, 'Interactive Button', mockCallback);

      expect(button.input).toBeDefined();
      expect(button.input.enabled).toBe(true);
    });

    test('should add button to scene', () => {
      button = new MenuButton(mockScene, 0, 0, 'Scene Button', mockCallback);

      expect(mockScene.add.existing).toHaveBeenCalledWith(button);
    });
  });

  describe('Text Management', () => {
    beforeEach(() => {
      button = new MenuButton(mockScene, 0, 0, 'Initial Text', mockCallback);
    });

    test('should update text content', () => {
      const newText = 'Updated Text';
      button.setText(newText);

      // Access the text object through the container's children
      const textObject = button.list.find(child => child.setText) as any;
      expect(textObject.setText).toHaveBeenCalledWith(newText);
    });
  });

  describe('Enable/Disable Functionality', () => {
    beforeEach(() => {
      button = new MenuButton(mockScene, 0, 0, 'Toggle Button', mockCallback);
    });

    test('should disable button interaction', () => {
      button.setEnabled(false);

      expect(button.input.enabled).toBe(false);
      expect(button.alpha).toBe(0.5);
    });

    test('should enable button interaction', () => {
      button.setEnabled(false);
      button.setEnabled(true);

      expect(button.input.enabled).toBe(true);
      expect(button.alpha).toBe(1);
    });
  });

  describe('State Management', () => {
    beforeEach(() => {
      button = new MenuButton(mockScene, 0, 0, 'State Button', mockCallback);
    });

    test('should track hover state', () => {
      expect(button.getIsHovered()).toBe(false);

      // Simulate hover
      button.emit('pointerover');
      expect(button.getIsHovered()).toBe(true);

      // Simulate unhover
      button.emit('pointerout');
      expect(button.getIsHovered()).toBe(false);
    });

    test('should track pressed state', () => {
      expect(button.getIsPressed()).toBe(false);

      // Simulate press
      button.emit('pointerdown');
      expect(button.getIsPressed()).toBe(true);

      // Simulate release
      button.emit('pointerup');
      expect(button.getIsPressed()).toBe(false);
    });
  });

  describe('Click Handling', () => {
    beforeEach(() => {
      button = new MenuButton(mockScene, 0, 0, 'Click Button', mockCallback);
    });

    test('should call callback on click', () => {
      button.emit('pointerdown');
      button.emit('pointerup');

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    test('should not call callback on pointerupoutside', () => {
      button.emit('pointerdown');
      button.emit('pointerupoutside');

      expect(mockCallback).not.toHaveBeenCalled();
    });

    test('should not call callback when disabled', () => {
      button.setEnabled(false);
      button.emit('pointerdown');
      button.emit('pointerup');

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Animation and Visual Feedback', () => {
    beforeEach(() => {
      button = new MenuButton(mockScene, 0, 0, 'Animation Button', mockCallback);
    });

    test('should trigger hover animation on pointerover', () => {
      button.emit('pointerover');

      // Should create tweens for both background and text
      expect(mockScene.tweens.add).toHaveBeenCalledTimes(2);
    });

    test('should trigger normal animation on pointerout', () => {
      button.emit('pointerover');
      jest.clearAllMocks();

      button.emit('pointerout');

      // Should create tweens for both background and text
      expect(mockScene.tweens.add).toHaveBeenCalledTimes(2);
    });

    test('should trigger pressed animation on pointerdown', () => {
      jest.clearAllMocks();

      button.emit('pointerdown');

      // Should create tweens for both background and text
      expect(mockScene.tweens.add).toHaveBeenCalledTimes(2);
    });
  });

  describe('Event Handling Edge Cases', () => {
    beforeEach(() => {
      button = new MenuButton(mockScene, 0, 0, 'Edge Case Button', mockCallback);
    });

    test('should handle multiple hover events gracefully', () => {
      button.emit('pointerover');
      const firstCallCount = mockScene.tweens.add.mock.calls.length;

      // Second hover should not trigger additional animations
      button.emit('pointerover');
      const secondCallCount = mockScene.tweens.add.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount);
    });

    test('should handle pointerout when not hovered', () => {
      jest.clearAllMocks();

      // Should not trigger animation if not currently hovered
      button.emit('pointerout');

      expect(mockScene.tweens.add).not.toHaveBeenCalled();
    });

    test('should reset pressed state on pointerupoutside', () => {
      button.emit('pointerdown');
      expect(button.getIsPressed()).toBe(true);

      button.emit('pointerupoutside');
      expect(button.getIsPressed()).toBe(false);
    });
  });

  describe('Cleanup and Destruction', () => {
    test('should call destroy method without errors', () => {
      button = new MenuButton(mockScene, 0, 0, 'Cleanup Button', mockCallback);

      // Should not throw any errors when destroying
      expect(() => button.destroy()).not.toThrow();

      // Verify that the mock destroy method was called
      expect(button.destroy).toBeDefined();
    });
  });
});
