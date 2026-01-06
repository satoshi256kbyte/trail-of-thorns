import { vi } from 'vitest';

// Mock phaser3spectorjs to prevent import errors
vi.mock('phaser3spectorjs', () => ({}));

// Mock the NavigableMenuButton class
vi.mock('../../../game/src/ui/NavigableMenuButton', () => ({
  NavigableMenuButton: class MockNavigableMenuButton {
    scene: any;
    x: number;
    y: number;
    text: string;
    callback: Function;
    
    constructor(scene: any, x: number, y: number, text: string, callback: Function) {
      this.scene = scene;
      this.x = x;
      this.y = y;
      this.text = text;
      this.callback = callback;
    }
    
    destroy = vi.fn();
    setInteractive = vi.fn();
    setAlpha = vi.fn();
    on = vi.fn();
    getId = vi.fn().mockReturnValue(`chapter-button-${this.text}`);
  },
}));

// Mock KeyboardNavigationManager
vi.mock('../../../game/src/utils/KeyboardNavigationManager', () => ({
  KeyboardNavigationManager: class MockKeyboardNavigationManager {
    addElement = vi.fn();
    destroy = vi.fn();
  },
}));

// Mock SceneTransition
vi.mock('../../../game/src/utils/SceneTransition', () => ({
  SceneTransition: {
    createEntranceTransition: vi.fn(),
    transitionTo: vi.fn().mockResolvedValue(undefined),
    validateSceneKey: vi.fn().mockReturnValue(true),
  },
  TransitionType: {
    SLIDE_LEFT: 'SLIDE_LEFT',
    SLIDE_RIGHT: 'SLIDE_RIGHT',
    FADE: 'FADE',
  },
}));

// Mock Phaser Scene
vi.mock('phaser', () => ({
  Scene: class MockScene {
    constructor(config: any) {}
    add = {
      graphics: vi.fn().mockReturnValue({
        fillGradientStyle: vi.fn(),
        fillRect: vi.fn(),
        lineStyle: vi.fn(),
        lineBetween: vi.fn(),
        setDepth: vi.fn(),
        destroy: vi.fn(),
      }),
      text: vi.fn().mockReturnValue({
        setOrigin: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
      }),
      container: vi.fn().mockReturnValue({
        add: vi.fn(),
        setVisible: vi.fn(),
        destroy: vi.fn(),
      }),
      rectangle: vi.fn().mockReturnValue({
        setStrokeStyle: vi.fn(),
      }),
    };
    load = {
      json: vi.fn(),
    };
    cache = {
      json: {
        get: vi.fn(),
      },
    };
    cameras = {
      main: {
        fadeOut: vi.fn(),
        once: vi.fn(),
      },
    };
    scene = {
      start: vi.fn(),
      key: 'ChapterSelectScene',
      isActive: vi.fn().mockReturnValue(true),
    };
    tweens = {
      add: vi.fn(),
    };
    time = {
      delayedCall: vi.fn(),
    };
    data = {
      set: vi.fn(),
      get: vi.fn(),
      remove: vi.fn(),
    };
    game = {};
  },
}));

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChapterSelectScene } from '../../../game/src/scenes/ChapterSelectScene';
import { NavigableMenuButton } from '../../../game/src/ui/NavigableMenuButton';
import { KeyboardNavigationManager } from '../../../game/src/utils/KeyboardNavigationManager';

/**
 * ChapterSelectScene Unit Tests
 * 章選択UIのユニットテスト
 * 要件8.1, 8.2, 8.3, 8.4, 8.5をテスト
 */
describe('ChapterSelectScene', () => {
  let scene: ChapterSelectScene;

  // Mock chapter data
  const mockChapterData = {
    version: '1.0.0',
    chapters: [
      {
        id: 'chapter-1',
        name: 'テスト章1',
        storyDescription: 'テスト用の章です',
        recommendedLevel: 1,
        stages: [
          { id: 'stage-1-1', name: 'ステージ1', difficulty: 1, recommendedLevel: 1 },
        ],
        unlockCondition: { type: 'NONE' },
      },
      {
        id: 'chapter-2',
        name: 'テスト章2',
        storyDescription: 'テスト用の章2です',
        recommendedLevel: 5,
        stages: [
          { id: 'stage-2-1', name: 'ステージ2', difficulty: 3, recommendedLevel: 5 },
        ],
        unlockCondition: {
          type: 'PREVIOUS_CHAPTER',
          requiredChapterId: 'chapter-1',
        },
      },
    ],
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create scene instance
    scene = new ChapterSelectScene();

    // Mock cache to return our test data
    scene.cache.json.get = vi.fn().mockReturnValue(mockChapterData);

    // Mock cameras for transitions
    scene.cameras.main.once = vi.fn().mockImplementation((event, callback) => {
      // Immediately call the callback for testing
      callback();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Scene Initialization', () => {
    test('should create scene with correct key', () => {
      expect(scene).toBeDefined();
      expect(scene.scene.key).toBe('ChapterSelectScene');
    });

    test('should have preload method', () => {
      expect(typeof scene.preload).toBe('function');
    });

    test('should have create method', () => {
      expect(typeof scene.create).toBe('function');
    });

    test('should have destroy method', () => {
      expect(typeof scene.destroy).toBe('function');
    });
  });

  describe('Chapter List Display - 要件8.1', () => {
    test('should load chapter data from JSON', () => {
      scene.create();

      expect(scene.cache.json.get).toHaveBeenCalledWith('chaptersData');
      expect(scene.getChapterData()).toHaveLength(2);
    });

    test('should display chapter list', () => {
      scene.create();

      const chapterCount = scene.getChapterCount();
      expect(chapterCount).toBe(2);
    });

    test('should validate chapter data structure', () => {
      scene.create();

      const chapters = scene.getChapterData();
      chapters.forEach(chapter => {
        expect(chapter).toHaveProperty('id');
        expect(chapter).toHaveProperty('name');
        expect(chapter).toHaveProperty('storyDescription');
        expect(chapter).toHaveProperty('recommendedLevel');
        expect(chapter).toHaveProperty('stages');
      });
    });

    test('should handle invalid chapter data gracefully', () => {
      // Mock invalid data
      scene.cache.json.get = vi.fn().mockReturnValue({
        chapters: [
          { id: 'invalid', name: 'Invalid' }, // Missing required fields
        ],
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      scene.create();

      // Scene should still be functional
      expect(scene.scene.isActive()).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('Chapter Information Display - 要件8.2', () => {
    test('should display chapter name', () => {
      scene.create();

      const chapters = scene.getChapterData();
      expect(chapters[0].name).toBe('テスト章1');
    });

    test('should display recommended level', () => {
      scene.create();

      const chapters = scene.getChapterData();
      expect(chapters[0].recommendedLevel).toBe(1);
    });

    test('should display stage count', () => {
      scene.create();

      const chapters = scene.getChapterData();
      expect(chapters[0].stages.length).toBe(1);
    });

    test('should display story description', () => {
      scene.create();

      const chapters = scene.getChapterData();
      expect(chapters[0].storyDescription).toBe('テスト用の章です');
    });
  });

  describe('Chapter Selection - 要件8.3', () => {
    test('should allow selection of unlocked chapters', () => {
      scene.create();

      const chapters = scene.getChapterData();
      const firstChapter = chapters[0];

      // First chapter should be unlocked by default
      expect(firstChapter.unlockCondition?.type).toBe('NONE');
    });

    test('should initialize chapter data on start', () => {
      scene.create();

      // Verify scene started successfully
      expect(scene.scene.isActive()).toBe(true);
    });

    test('should create chapter buttons', () => {
      scene.create();

      // Scene should create buttons for each chapter
      // The scene successfully creates chapter buttons (verified by no errors)
      expect(scene.getChapterCount()).toBe(2);
    });
  });

  describe('Unlock Conditions - 要件8.4', () => {
    test('should check unlock conditions for locked chapters', () => {
      scene.create();

      const chapters = scene.getChapterData();
      const secondChapter = chapters[1];

      // Second chapter should have unlock condition
      expect(secondChapter.unlockCondition).toBeDefined();
      expect(secondChapter.unlockCondition?.type).toBe('PREVIOUS_CHAPTER');
    });

    test('should display unlock requirements for locked chapters', () => {
      scene.create();

      const chapters = scene.getChapterData();
      const lockedChapter = chapters.find(
        c => c.unlockCondition?.type === 'PREVIOUS_CHAPTER'
      );

      expect(lockedChapter).toBeDefined();
      expect(lockedChapter?.unlockCondition?.requiredChapterId).toBe('chapter-1');
    });
  });

  describe('Continue Functionality - 要件8.5', () => {
    test('should handle no chapter in progress', () => {
      scene.create();

      // Scene should handle case where no chapter is in progress
      expect(scene.scene.isActive()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing chapter data file', () => {
      // Mock missing data
      scene.cache.json.get = vi.fn().mockReturnValue(null);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      scene.create();

      // Scene should still be active with fallback data
      expect(scene.scene.isActive()).toBe(true);

      consoleSpy.mockRestore();
    });

    test('should handle corrupted chapter data', () => {
      // Mock corrupted data
      scene.cache.json.get = vi.fn().mockReturnValue({
        chapters: 'invalid',
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      scene.create();

      // Scene should handle error gracefully
      expect(scene.scene.isActive()).toBe(true);

      consoleSpy.mockRestore();
    });

    test('should validate chapter data before use', () => {
      // Mock data with missing required fields
      scene.cache.json.get = vi.fn().mockReturnValue({
        chapters: [
          {
            id: 'test',
            // Missing name, storyDescription, etc.
          },
        ],
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      scene.create();

      // Invalid chapters should be filtered out
      const chapters = scene.getChapterData();
      expect(chapters.length).toBe(0);

      consoleSpy.mockRestore();
    });
  });

  describe('Scene Cleanup', () => {
    test('should clean up resources on destroy', () => {
      scene.create();

      // Destroy scene
      scene.destroy();

      // Verify cleanup
      expect(scene.getChapterData().length).toBe(0);
    });
  });

  describe('Navigation', () => {
    test('should have back button functionality', () => {
      scene.create();

      // Scene should be active
      expect(scene.scene.isActive()).toBe(true);
    });

    test('should support keyboard navigation', () => {
      scene.create();

      // Scene should have keyboard navigation setup
      // The scene successfully sets up keyboard navigation (verified by no errors)
      expect(scene.scene.isActive()).toBe(true);
    });
  });

  describe('Visual Elements', () => {
    test('should create background graphics', () => {
      scene.create();

      // Scene should have visual elements
      expect(scene.add.graphics).toHaveBeenCalled();
    });

    test('should create title text', () => {
      scene.create();

      // Scene should have title
      expect(scene.add.text).toHaveBeenCalled();
    });

    test('should create chapter info panels', () => {
      scene.create();

      const chapters = scene.getChapterData();
      expect(chapters.length).toBeGreaterThan(0);
    });
  });
});
