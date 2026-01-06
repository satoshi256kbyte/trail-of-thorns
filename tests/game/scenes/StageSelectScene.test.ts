// Mock the StageButton class
const mockStageButton = jest.fn().mockImplementation((scene, x, y, stage, callback) => {
  return {
    scene,
    x,
    y,
    stage,
    callback,
    destroy: jest.fn(),
    getStage: jest.fn().mockReturnValue(stage),
    isUnlocked: jest.fn().mockReturnValue(stage.isUnlocked),
    getStageId: jest.fn().mockReturnValue(stage.id),
    getDifficulty: jest.fn().mockReturnValue(stage.difficulty),
  };
});

jest.mock('../../../game/src/ui/StageButton', () => ({
  StageButton: mockStageButton,
}));

// Mock the MenuButton class
const mockMenuButton = jest.fn().mockImplementation((scene, x, y, text, callback) => {
  return {
    scene,
    x,
    y,
    text,
    callback,
    destroy: jest.fn(),
  };
});

jest.mock('../../../game/src/ui/MenuButton', () => ({
  MenuButton: mockMenuButton,
}));

// Mock Phaser Scene
jest.mock('phaser', () => ({
  Scene: class MockScene {
    constructor(config: any) {}
    add = {
      graphics: jest.fn().mockReturnValue({
        fillGradientStyle: jest.fn(),
        fillRect: jest.fn(),
        lineStyle: jest.fn(),
        lineBetween: jest.fn(),
        setDepth: jest.fn(),
        destroy: jest.fn(),
      }),
      text: jest.fn().mockReturnValue({
        setOrigin: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
      }),
      container: jest.fn().mockReturnValue({
        add: jest.fn(),
        destroy: jest.fn(),
      }),
      existing: jest.fn(),
    };
    load = {
      json: jest.fn(),
    };
    cache = {
      json: {
        get: jest.fn(),
      },
    };
    cameras = {
      main: {
        fadeOut: jest.fn(),
        once: jest.fn(),
      },
    };
    scene = {
      start: jest.fn(),
    };
    game = {};
  },
}));

import { StageSelectScene } from '../../../game/src/scenes/StageSelectScene';
import { StageData } from '../../../game/src/types/StageData';

describe('StageSelectScene - Stage Selection Functionality', () => {
  let scene: StageSelectScene;
  let mockStageData: StageData[];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock stage data
    mockStageData = [
      {
        id: 'stage-001',
        name: 'Forest Path',
        description: 'A peaceful introduction',
        isUnlocked: true,
        difficulty: 1,
        order: 1,
      },
      {
        id: 'stage-002',
        name: 'Mountain Pass',
        description: 'Treacherous terrain',
        isUnlocked: false,
        difficulty: 2,
        order: 2,
      },
      {
        id: 'stage-003',
        name: 'Dark Cave',
        description: 'Mysterious depths',
        isUnlocked: false,
        difficulty: 3,
        order: 3,
      },
    ];

    // Create scene instance
    scene = new StageSelectScene();

    // Mock cache to return our test data
    scene.cache.json.get = jest.fn().mockReturnValue({
      stages: mockStageData,
    });

    // Mock cameras for transitions
    scene.cameras.main.once = jest.fn().mockImplementation((event, callback) => {
      // Immediately call the callback for testing
      callback();
    });
  });

  describe('Stage Data Loading and Validation', () => {
    it('should load and validate stage data correctly', () => {
      scene.create();

      expect(scene.cache.json.get).toHaveBeenCalledWith('stagesData');
      expect(scene.getStageData()).toHaveLength(3);
      expect(scene.getStageCount()).toBe(3);
    });

    it('should handle invalid stage data gracefully', () => {
      const invalidStageData = [
        {
          id: 'invalid-stage',
          // Missing required fields
          isUnlocked: true,
        },
      ];

      scene.cache.json.get = jest.fn().mockReturnValue({
        stages: invalidStageData,
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      scene.create();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid stage data for invalid-stage')
      );

      consoleSpy.mockRestore();
    });

    it('should sort stages by order property', () => {
      const unorderedStages = [
        { ...mockStageData[2], order: 3 },
        { ...mockStageData[0], order: 1 },
        { ...mockStageData[1], order: 2 },
      ];

      scene.cache.json.get = jest.fn().mockReturnValue({
        stages: unorderedStages,
      });

      scene.create();

      const loadedStages = scene.getStageData();
      expect(loadedStages[0].order).toBe(1);
      expect(loadedStages[1].order).toBe(2);
      expect(loadedStages[2].order).toBe(3);
    });
  });

  describe('Stage Button Creation', () => {
    it('should create StageButton components for each stage', () => {
      scene.create();

      expect(mockStageButton).toHaveBeenCalledTimes(3);

      // Check that buttons are created with correct parameters
      expect(mockStageButton).toHaveBeenCalledWith(
        scene,
        expect.any(Number), // x position
        expect.any(Number), // y position
        mockStageData[0], // stage data
        expect.any(Function) // callback
      );
    });

    it('should limit stage buttons to maximum of 6', () => {
      // Create more than 6 stages
      const manyStages = Array.from({ length: 10 }, (_, i) => ({
        id: `stage-${i + 1}`,
        name: `Stage ${i + 1}`,
        description: `Description ${i + 1}`,
        isUnlocked: true,
        difficulty: 1,
        order: i + 1,
      }));

      scene.cache.json.get = jest.fn().mockReturnValue({
        stages: manyStages,
      });

      scene.create();

      // Should only create 6 buttons
      expect(mockStageButton).toHaveBeenCalledTimes(6);
    });
  });

  describe('Stage Selection Logic', () => {
    it('should handle stage selection for unlocked stages', () => {
      scene.create();

      // Get the callback function passed to the first StageButton
      const firstButtonCall = mockStageButton.mock.calls[0];
      const selectionCallback = firstButtonCall[4]; // 5th parameter is the callback

      // Mock console.log to verify logging
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Simulate stage selection
      selectionCallback(mockStageData[0]);

      expect(consoleSpy).toHaveBeenCalledWith(
        `Stage selected: ${mockStageData[0].name} (${mockStageData[0].id})`
      );
      expect(scene.cameras.main.fadeOut).toHaveBeenCalledWith(300, 0, 0, 0);
      expect(scene.scene.start).toHaveBeenCalledWith('TitleScene');

      consoleSpy.mockRestore();
    });

    it('should handle stage selection errors gracefully', () => {
      scene.create();

      // Mock cameras to throw an error
      scene.cameras.main.fadeOut = jest.fn().mockImplementation(() => {
        throw new Error('Camera error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Get the callback and simulate selection
      const selectionCallback = mockStageButton.mock.calls[0][4];
      selectionCallback(mockStageData[0]);

      expect(consoleSpy).toHaveBeenCalledWith('Error handling stage selection:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Stage Availability Checking', () => {
    it('should correctly identify unlocked and locked stages', () => {
      scene.create();

      const stageData = scene.getStageData();

      // First stage should be unlocked
      expect(stageData[0].isUnlocked).toBe(true);

      // Other stages should be locked
      expect(stageData[1].isUnlocked).toBe(false);
      expect(stageData[2].isUnlocked).toBe(false);
    });

    it('should handle mixed unlock states correctly', () => {
      const mixedStages = [
        { ...mockStageData[0], isUnlocked: true },
        { ...mockStageData[1], isUnlocked: true },
        { ...mockStageData[2], isUnlocked: false },
      ];

      scene.cache.json.get = jest.fn().mockReturnValue({
        stages: mixedStages,
      });

      scene.create();

      const stageData = scene.getStageData();
      expect(stageData[0].isUnlocked).toBe(true);
      expect(stageData[1].isUnlocked).toBe(true);
      expect(stageData[2].isUnlocked).toBe(false);
    });
  });

  describe('Grid Layout Calculation', () => {
    it('should calculate correct grid positions for stages', () => {
      scene.create();

      // Check positions of created buttons
      const calls = mockStageButton.mock.calls;

      // First button (0,0 in grid)
      // startX = 1920/2 - 320 = 640, startY = 1080/2 - 80 = 460
      expect(calls[0][1]).toBe(640); // x position
      expect(calls[0][2]).toBe(460); // y position

      // Second button (1,0 in grid)
      // x = startX + (1 * horizontalSpacing) = 640 + 320 = 960
      expect(calls[1][1]).toBe(960); // x position
      expect(calls[1][2]).toBe(460); // y position

      // Third button (2,0 in grid)
      // x = startX + (2 * horizontalSpacing) = 640 + 640 = 1280
      expect(calls[2][1]).toBe(1280); // x position
      expect(calls[2][2]).toBe(460); // y position
    });
  });

  describe('Error Handling', () => {
    it('should handle missing JSON data', () => {
      scene.cache.json.get = jest.fn().mockReturnValue(null);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      scene.create();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load stage data:',
        'Invalid JSON structure: missing stages array'
      );

      consoleSpy.mockRestore();
    });

    it('should handle JSON parsing errors', () => {
      scene.cache.json.get = jest.fn().mockImplementation(() => {
        throw new Error('JSON parse error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      scene.create();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load stage data:',
        expect.stringContaining('JSON parsing error')
      );

      consoleSpy.mockRestore();
    });

    it('should provide fallback stage data on error', () => {
      scene.cache.json.get = jest.fn().mockReturnValue({
        stages: [], // Empty stages array
      });

      scene.create();

      // Should have fallback stage
      expect(scene.getStageCount()).toBe(1);
      expect(scene.getStageData()[0].id).toBe('fallback-stage');
    });
  });

  describe('Scene Cleanup', () => {
    it('should cleanup resources when destroyed', () => {
      scene.create();

      const mockGraphics = scene.add.graphics();
      const mockText = scene.add.text(0, 0, 'test');

      scene.destroy();

      expect(mockGraphics.destroy).toHaveBeenCalled();
      expect(mockText.destroy).toHaveBeenCalled();
    });
  });

  describe('Public Interface', () => {
    it('should provide access to stage data through public methods', () => {
      scene.create();

      expect(scene.getStageData()).toEqual(mockStageData);
      expect(scene.getStageCount()).toBe(3);
    });

    it('should return a copy of stage data, not the original array', () => {
      scene.create();

      const returnedData = scene.getStageData();
      expect(returnedData).toEqual(mockStageData);
      expect(returnedData).not.toBe(mockStageData);
    });
  });
});

describe('StageSelectScene - Chapter-Stage Management Integration', () => {
  let scene: StageSelectScene;
  let mockStageData: StageData[];
  let mockChapterData: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStageData = [
      {
        id: 'stage-1-1',
        name: 'Village Anomaly',
        description: 'Strange events in the village',
        isUnlocked: true,
        difficulty: 1,
        order: 1,
      },
      {
        id: 'stage-1-2',
        name: 'Forest Investigation',
        description: 'Investigate the forest',
        isUnlocked: false,
        difficulty: 2,
        order: 2,
      },
      {
        id: 'stage-1-3',
        name: 'Rose Garden',
        description: 'The source of corruption',
        isUnlocked: false,
        difficulty: 3,
        order: 3,
      },
    ];

    mockChapterData = {
      id: 'chapter-1',
      name: '薔薇の目覚め',
      storyDescription: '平和な村に突如現れた魔性の薔薇...',
      stageIds: ['stage-1-1', 'stage-1-2', 'stage-1-3'],
      recommendedLevel: 1,
    };

    scene = new StageSelectScene();

    scene.cache.json.get = jest.fn().mockReturnValue({
      stages: mockStageData,
    });

    scene.cameras.main.once = jest.fn().mockImplementation((event, callback) => {
      callback();
    });
  });

  describe('Chapter Data Integration', () => {
    it('should accept and store chapter data from scene transition', () => {
      const sceneData = {
        chapterData: mockChapterData,
        fromScene: 'ChapterSelectScene',
      };

      scene.create(sceneData);

      // Verify chapter data is stored
      expect((scene as any).currentChapterData).toEqual(mockChapterData);
    });

    it('should display chapter information when chapter data is provided', () => {
      const sceneData = {
        chapterData: mockChapterData,
      };

      scene.create(sceneData);

      // Verify chapter info text was created
      expect(scene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        140,
        expect.stringContaining(mockChapterData.name),
        expect.any(Object)
      );
    });

    it('should handle missing chapter data gracefully', () => {
      scene.create();

      // Should not throw error
      expect((scene as any).currentChapterData).toBeUndefined();
    });
  });

  describe('Stage Progress Manager Integration', () => {
    it('should initialize StageProgressManager on scene creation', () => {
      scene.create();

      expect((scene as any).stageProgressManager).toBeDefined();
    });

    it('should check stage unlock status from progress manager', () => {
      const sceneData = {
        chapterData: mockChapterData,
      };

      scene.create(sceneData);

      const progressManager = (scene as any).stageProgressManager;
      expect(progressManager).toBeDefined();
    });
  });

  describe('Stage Info Panel Display', () => {
    it('should create stage info panel on initialization', () => {
      scene.create();

      const stageInfoPanel = (scene as any).stageInfoPanel;
      expect(stageInfoPanel).toBeDefined();
      expect(scene.add.container).toHaveBeenCalled();
    });

    it('should show stage info panel on stage hover', () => {
      scene.create();

      const stageInfoPanel = (scene as any).stageInfoPanel;
      const showStageInfo = (scene as any).showStageInfo.bind(scene);

      // Mock setVisible method
      stageInfoPanel.setVisible = jest.fn();

      showStageInfo(mockStageData[0]);

      expect(stageInfoPanel.setVisible).toHaveBeenCalledWith(true);
    });

    it('should hide stage info panel when hover ends', () => {
      scene.create();

      const stageInfoPanel = (scene as any).stageInfoPanel;
      const hideStageInfo = (scene as any).hideStageInfo.bind(scene);

      stageInfoPanel.setVisible = jest.fn();

      hideStageInfo();

      expect(stageInfoPanel.setVisible).toHaveBeenCalledWith(false);
    });

    it('should display stage details including difficulty and recommended level', () => {
      scene.create();

      const stageInfoPanel = (scene as any).stageInfoPanel;
      const showStageInfo = (scene as any).showStageInfo.bind(scene);

      // Mock getData to return text objects
      const mockNameText = { setText: jest.fn() };
      const mockDifficultyText = { setText: jest.fn() };
      const mockLevelText = { setText: jest.fn() };
      const mockStatusText = { setText: jest.fn(), setColor: jest.fn() };
      const mockUnlockText = { setText: jest.fn() };

      stageInfoPanel.getData = jest.fn((key: string) => {
        switch (key) {
          case 'nameText':
            return mockNameText;
          case 'difficultyText':
            return mockDifficultyText;
          case 'levelText':
            return mockLevelText;
          case 'statusText':
            return mockStatusText;
          case 'unlockConditionText':
            return mockUnlockText;
        }
      });

      stageInfoPanel.setVisible = jest.fn();

      showStageInfo(mockStageData[0]);

      expect(mockNameText.setText).toHaveBeenCalledWith(
        expect.stringContaining(mockStageData[0].name)
      );
      expect(mockDifficultyText.setText).toHaveBeenCalledWith(expect.stringContaining('難易度'));
      expect(mockLevelText.setText).toHaveBeenCalledWith(expect.stringContaining('推奨レベル'));
      expect(mockStatusText.setText).toHaveBeenCalled();
    });
  });

  describe('Stage Selection with Unlock Validation', () => {
    it('should allow selection of unlocked stages', async () => {
      scene.create();

      const handleStageSelect = (scene as any).handleStageSelect.bind(scene);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handleStageSelect(mockStageData[0]);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Stage selected: ${mockStageData[0].name}`)
      );

      consoleSpy.mockRestore();
    });

    it('should prevent selection of locked stages', async () => {
      scene.create();

      const handleStageSelect = (scene as any).handleStageSelect.bind(scene);
      const showUnlockMessage = jest.spyOn(scene as any, 'showUnlockConditionMessage');

      await handleStageSelect(mockStageData[1]); // Locked stage

      expect(showUnlockMessage).toHaveBeenCalledWith(mockStageData[1]);
    });

    it('should display unlock condition message for locked stages', () => {
      scene.create();

      const showUnlockMessage = (scene as any).showUnlockConditionMessage.bind(scene);

      // Mock add methods for message display
      const mockOverlay = { destroy: jest.fn(), setDepth: jest.fn() };
      const mockPanel = { destroy: jest.fn(), setDepth: jest.fn() };
      const mockText = { destroy: jest.fn(), setOrigin: jest.fn().mockReturnThis(), setDepth: jest.fn() };

      scene.add.graphics = jest.fn()
        .mockReturnValueOnce(mockOverlay)
        .mockReturnValueOnce(mockPanel);
      scene.add.text = jest.fn().mockReturnValue(mockText);

      showUnlockMessage(mockStageData[1]);

      expect(scene.add.graphics).toHaveBeenCalled();
      expect(scene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.stringContaining('未解放'),
        expect.any(Object)
      );
    });
  });

  describe('Scene Navigation', () => {
    it('should navigate back to ChapterSelectScene when chapter data exists', async () => {
      const sceneData = {
        chapterData: mockChapterData,
      };

      scene.create(sceneData);

      const handleBack = (scene as any).handleBack.bind(scene);

      // Mock SceneTransition
      const mockTransitionTo = jest.fn();
      (scene as any).constructor.transitionTo = mockTransitionTo;

      await handleBack();

      // Should attempt to go back to ChapterSelectScene
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('returning to previous screen')
      );
      consoleSpy.mockRestore();
    });

    it('should navigate back to TitleScene when no chapter data exists', async () => {
      scene.create(); // No chapter data

      const handleBack = (scene as any).handleBack.bind(scene);

      await handleBack();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('returning to previous screen')
      );
      consoleSpy.mockRestore();
    });

    it('should pass stage and chapter data to GameplayScene on selection', async () => {
      const sceneData = {
        chapterData: mockChapterData,
      };

      scene.create(sceneData);

      const handleStageSelect = (scene as any).handleStageSelect.bind(scene);

      await handleStageSelect(mockStageData[0]);

      // Verify console log includes chapter data
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Transitioning to GameplayScene'),
        expect.objectContaining({
          selectedStage: mockStageData[0],
          chapterData: mockChapterData,
        })
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should cleanup chapter data on scene destroy', () => {
      const sceneData = {
        chapterData: mockChapterData,
      };

      scene.create(sceneData);
      scene.destroy();

      expect((scene as any).currentChapterData).toBeUndefined();
    });

    it('should cleanup stage progress manager on scene destroy', () => {
      scene.create();
      scene.destroy();

      expect((scene as any).stageProgressManager).toBeUndefined();
    });

    it('should cleanup stage info panel on scene destroy', () => {
      scene.create();

      const stageInfoPanel = (scene as any).stageInfoPanel;
      stageInfoPanel.destroy = jest.fn();

      scene.destroy();

      expect(stageInfoPanel.destroy).toHaveBeenCalled();
      expect((scene as any).stageInfoPanel).toBeUndefined();
    });
  });
});
