// Mock Phaser for testing
const mockTweens = {
  add: jest.fn(),
};

const mockInput = {
  setDefaultCursor: jest.fn(),
};

// Create a mock background that tracks method calls
let mockBackground: any;

const mockAdd = {
  rectangle: jest.fn(() => {
    mockBackground = {
      setStrokeStyle: jest.fn().mockReturnThis(),
      setInteractive: jest.fn().mockReturnThis(),
      removeInteractive: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      removeAllListeners: jest.fn().mockReturnThis(),
      setFillStyle: jest.fn().mockReturnThis(),
      input: {},
    };
    return mockBackground;
  }),
  text: jest.fn(() => ({
    setOrigin: jest.fn().mockReturnThis(),
    setText: jest.fn(),
    setColor: jest.fn(),
    destroy: jest.fn(),
  })),
  existing: jest.fn(),
};

const mockScene = {
  add: mockAdd,
  tweens: mockTweens,
  input: mockInput,
};

// Mock Phaser classes
jest.mock('phaser', () => ({
  GameObjects: {
    Container: class MockContainer {
      public x: number = 0;
      public y: number = 0;
      public scene: any;
      private eventListeners: Map<string, Function[]> = new Map();

      constructor(scene: any, x: number, y: number) {
        this.scene = scene;
        this.x = x;
        this.y = y;
      }

      add(child: any) {
        return this;
      }

      setScale(scale: number) {
        return this;
      }

      on(event: string, callback: Function) {
        if (!this.eventListeners.has(event)) {
          this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(callback);
        return this;
      }

      destroy = jest.fn();
    },
  },
}));

import { StageButton } from '../../../game/src/ui/StageButton';
import { StageData } from '../../../game/src/types/StageData';

describe('StageButton', () => {
  let mockStageData: StageData;
  let mockLockedStageData: StageData;
  let onSelectCallback: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockBackground = null;

    // Mock stage data
    mockStageData = {
      id: 'test-stage-1',
      name: 'Test Stage',
      description: 'A test stage for unit testing',
      isUnlocked: true,
      difficulty: 3,
      order: 1,
    };

    mockLockedStageData = {
      id: 'test-stage-2',
      name: 'Locked Stage',
      description: 'A locked test stage',
      isUnlocked: false,
      difficulty: 4,
      order: 2,
    };

    onSelectCallback = jest.fn();
  });

  describe('Constructor', () => {
    it('should create a StageButton with correct properties', () => {
      const stageButton = new StageButton(mockScene, 100, 200, mockStageData, onSelectCallback);

      expect(stageButton).toBeInstanceOf(StageButton);
      expect(stageButton.x).toBe(100);
      expect(stageButton.y).toBe(200);
      expect(mockScene.add.existing).toHaveBeenCalledWith(stageButton);
    });

    it('should create visual elements for unlocked stage', () => {
      new StageButton(mockScene, 100, 200, mockStageData, onSelectCallback);

      // Should create background rectangle
      expect(mockScene.add.rectangle).toHaveBeenCalledWith(0, 0, 280, 160, 0x3498db);

      // Should create text elements
      expect(mockScene.add.text).toHaveBeenCalledWith(0, -40, 'Test Stage', expect.any(Object));
      expect(mockScene.add.text).toHaveBeenCalledWith(
        0,
        -10,
        'A test stage for unit testing',
        expect.any(Object)
      );
      expect(mockScene.add.text).toHaveBeenCalledWith(0, 30, 'Difficulty: ★★★', expect.any(Object));
    });

    it('should create lock indicator for locked stage', () => {
      new StageButton(mockScene, 100, 200, mockLockedStageData, onSelectCallback);

      // Should create lock indicator
      expect(mockScene.add.text).toHaveBeenCalledWith(0, 50, '🔒 LOCKED', expect.any(Object));
    });
  });

  describe('Stage Availability Checking', () => {
    it('should make unlocked stages interactive', () => {
      new StageButton(mockScene, 100, 200, mockStageData, onSelectCallback);

      expect(mockBackground.setInteractive).toHaveBeenCalled();
      expect(mockBackground.on).toHaveBeenCalledWith('pointerover', expect.any(Function));
      expect(mockBackground.on).toHaveBeenCalledWith('pointerout', expect.any(Function));
      expect(mockBackground.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    });

    it('should not make locked stages interactive', () => {
      new StageButton(mockScene, 100, 200, mockLockedStageData, onSelectCallback);

      expect(mockBackground.removeInteractive).toHaveBeenCalled();
    });

    it('should return correct unlock status', () => {
      const unlockedButton = new StageButton(mockScene, 100, 200, mockStageData, onSelectCallback);
      const lockedButton = new StageButton(
        mockScene,
        100,
        200,
        mockLockedStageData,
        onSelectCallback
      );

      expect(unlockedButton.isUnlocked()).toBe(true);
      expect(lockedButton.isUnlocked()).toBe(false);
    });
  });

  describe('Stage Information Display', () => {
    it('should display stage name correctly', () => {
      new StageButton(mockScene, 100, 200, mockStageData, onSelectCallback);

      expect(mockScene.add.text).toHaveBeenCalledWith(
        0,
        -40,
        'Test Stage',
        expect.objectContaining({
          fontSize: '20px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
      );
    });

    it('should display stage description correctly', () => {
      new StageButton(mockScene, 100, 200, mockStageData, onSelectCallback);

      expect(mockScene.add.text).toHaveBeenCalledWith(
        0,
        -10,
        'A test stage for unit testing',
        expect.objectContaining({
          fontSize: '14px',
          color: '#ecf0f1',
          align: 'center',
          wordWrap: { width: 260 },
        })
      );
    });

    it('should display difficulty stars correctly', () => {
      new StageButton(mockScene, 100, 200, mockStageData, onSelectCallback);

      expect(mockScene.add.text).toHaveBeenCalledWith(
        0,
        30,
        'Difficulty: ★★★',
        expect.objectContaining({
          fontSize: '16px',
          color: '#f1c40f',
        })
      );
    });

    it('should display different difficulty levels correctly', () => {
      const easyStage: StageData = { ...mockStageData, difficulty: 1 };
      const hardStage: StageData = { ...mockStageData, difficulty: 5 };

      new StageButton(mockScene, 100, 200, easyStage, onSelectCallback);
      new StageButton(mockScene, 100, 200, hardStage, onSelectCallback);

      expect(mockScene.add.text).toHaveBeenCalledWith(0, 30, 'Difficulty: ★', expect.any(Object));
      expect(mockScene.add.text).toHaveBeenCalledWith(
        0,
        30,
        'Difficulty: ★★★★★',
        expect.any(Object)
      );
    });
  });

  describe('Stage Selection Logic', () => {
    it('should call selection callback when unlocked stage is clicked', () => {
      mockScene.tweens.add = jest.fn().mockImplementation((config: any) => {
        // Simulate tween completion
        if (config.onComplete) {
          config.onComplete();
        }
      });

      new StageButton(mockScene, 100, 200, mockStageData, onSelectCallback);

      // Get the click handler
      const clickHandler = mockBackground.on.mock.calls.find(call => call[0] === 'pointerdown')[1];

      // Simulate click
      clickHandler();

      expect(mockScene.tweens.add).toHaveBeenCalled();
      expect(onSelectCallback).toHaveBeenCalledWith(mockStageData);
    });

    it('should not call selection callback for locked stages', () => {
      new StageButton(mockScene, 100, 200, mockLockedStageData, onSelectCallback);

      // Try to simulate click (should not work since it's not interactive)
      expect(mockBackground.removeInteractive).toHaveBeenCalled();
      expect(onSelectCallback).not.toHaveBeenCalled();
    });
  });

  describe('Getter Methods', () => {
    it('should return correct stage data', () => {
      const stageButton = new StageButton(mockScene, 100, 200, mockStageData, onSelectCallback);

      expect(stageButton.getStage()).toEqual(mockStageData);
      expect(stageButton.getStageId()).toBe('test-stage-1');
      expect(stageButton.getDifficulty()).toBe(3);
      expect(stageButton.isUnlocked()).toBe(true);
    });

    it('should return a copy of stage data, not reference', () => {
      const stageButton = new StageButton(mockScene, 100, 200, mockStageData, onSelectCallback);
      const returnedStage = stageButton.getStage();

      expect(returnedStage).toEqual(mockStageData);
      expect(returnedStage).not.toBe(mockStageData); // Should be a copy
    });
  });

  describe('Cleanup', () => {
    it('should cleanup properly when destroyed', () => {
      const stageButton = new StageButton(mockScene, 100, 200, mockStageData, onSelectCallback);

      // Should not throw any errors when destroying
      expect(() => stageButton.destroy()).not.toThrow();
    });
  });
});
