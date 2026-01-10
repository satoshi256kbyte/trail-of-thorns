import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Phaser from 'phaser';
import { SaveLoadScene } from '../../game/src/scenes/SaveLoadScene';
import { SaveLoadManager } from '../../game/src/systems/chapterStage/SaveLoadManager';
import { SceneTransition } from '../../game/src/utils/SceneTransition';

/**
 * SaveLoadScene統合テスト
 * SaveLoadScene Integration Tests
 * 
 * Tests the integration between SaveLoadScene and:
 * - SaveLoadManager
 * - Scene transitions
 * - Keyboard navigation
 * - Error recovery
 */

describe('SaveLoadScene Integration Tests', () => {
  let scene: SaveLoadScene;
  let mockGame: Phaser.Game;

  beforeEach(() => {
    // Create mock game
    mockGame = {
      scene: {
        add: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        get: vi.fn(),
      },
      events: {
        on: vi.fn(),
        off: vi.fn(),
      },
    } as any;

    // Create scene instance
    scene = new SaveLoadScene();
    (scene as any).game = mockGame;
    (scene as any).scene = mockGame.scene;
  });

  describe('SaveLoadManager Integration', () => {
    it('should initialize SaveLoadManager on scene creation', () => {
      // Mock scene methods
      (scene as any).add = {
        graphics: vi.fn().mockReturnValue({
          fillGradientStyle: vi.fn().mockReturnThis(),
          fillRect: vi.fn().mockReturnThis(),
          lineStyle: vi.fn().mockReturnThis(),
          lineBetween: vi.fn().mockReturnThis(),
        }),
        text: vi.fn().mockReturnValue({
          setOrigin: vi.fn().mockReturnThis(),
        }),
        container: vi.fn().mockReturnValue({
          add: vi.fn(),
          setDepth: vi.fn(),
        }),
      };
      (scene as any).input = {
        keyboard: {
          addKey: vi.fn().mockReturnValue({
            on: vi.fn(),
          }),
        },
      };
      (scene as any).time = {
        delayedCall: vi.fn(),
      };

      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      // SaveLoadManager should be initialized
      const saveLoadManager = (scene as any).saveLoadManager;
      expect(saveLoadManager).toBeInstanceOf(SaveLoadManager);
    });

    it('should load save slots from SaveLoadManager', () => {
      // Mock SaveLoadManager
      const mockSaveLoadManager = {
        getSaveSlots: vi.fn().mockReturnValue([
          { slotId: 0, saveData: null },
          { slotId: 1, saveData: null },
        ]),
        isLocalStorageAvailable: vi.fn().mockReturnValue(true),
        isAutoSaveEnabled: vi.fn().mockReturnValue(true),
        getStorageUsage: vi.fn().mockReturnValue({ percentage: 50 }),
      };

      (scene as any).saveLoadManager = mockSaveLoadManager;
      (scene as any).add = {
        graphics: vi.fn().mockReturnValue({
          fillGradientStyle: vi.fn().mockReturnThis(),
          fillRect: vi.fn().mockReturnThis(),
          lineStyle: vi.fn().mockReturnThis(),
          lineBetween: vi.fn().mockReturnThis(),
        }),
        text: vi.fn().mockReturnValue({
          setOrigin: vi.fn().mockReturnThis(),
        }),
        container: vi.fn().mockReturnValue({
          add: vi.fn(),
          setDepth: vi.fn(),
        }),
      };
      (scene as any).input = {
        keyboard: {
          addKey: vi.fn().mockReturnValue({
            on: vi.fn(),
          }),
        },
      };
      (scene as any).time = {
        delayedCall: vi.fn(),
      };

      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      expect(mockSaveLoadManager.getSaveSlots).toHaveBeenCalled();
    });

    it('should save game data through SaveLoadManager', async () => {
      const mockSaveLoadManager = {
        saveGame: vi.fn().mockReturnValue(true),
        getSaveSlots: vi.fn().mockReturnValue([]),
        isLocalStorageAvailable: vi.fn().mockReturnValue(true),
        isAutoSaveEnabled: vi.fn().mockReturnValue(true),
        getStorageUsage: vi.fn().mockReturnValue({ percentage: 50 }),
      };

      (scene as any).saveLoadManager = mockSaveLoadManager;
      (scene as any).selectedSlotId = 1;
      (scene as any).currentGameState = {
        chapterState: { chapterId: 'chapter1' },
        stageProgress: {},
        partyComposition: { members: [] },
        playTime: 1000,
      };

      await (scene as any).executeSave(
        1,
        { chapterId: 'chapter1' },
        {},
        { members: [] },
        1000
      );

      expect(mockSaveLoadManager.saveGame).toHaveBeenCalledWith(
        1,
        { chapterId: 'chapter1' },
        {},
        { members: [] },
        1000
      );
    });

    it('should load game data through SaveLoadManager', async () => {
      const mockSaveData = {
        slotId: 1,
        timestamp: Date.now(),
        chapterState: { chapterId: 'chapter1' },
        stageProgress: {},
        partyComposition: { members: [] },
        playTime: 1000,
      };

      const mockSaveLoadManager = {
        loadGame: vi.fn().mockReturnValue(mockSaveData),
        validateSaveData: vi.fn().mockReturnValue(true),
        getSaveSlots: vi.fn().mockReturnValue([]),
        isLocalStorageAvailable: vi.fn().mockReturnValue(true),
        isAutoSaveEnabled: vi.fn().mockReturnValue(true),
        getStorageUsage: vi.fn().mockReturnValue({ percentage: 50 }),
      };

      (scene as any).saveLoadManager = mockSaveLoadManager;
      (scene as any).selectedSlotId = 1;

      const result = await (scene as any).executeLoad(1);

      expect(mockSaveLoadManager.loadGame).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockSaveData);
    });

    it('should delete save data through SaveLoadManager', async () => {
      const mockSaveLoadManager = {
        deleteSaveData: vi.fn().mockReturnValue(true),
        getSaveSlots: vi.fn().mockReturnValue([]),
        isLocalStorageAvailable: vi.fn().mockReturnValue(true),
        isAutoSaveEnabled: vi.fn().mockReturnValue(true),
        getStorageUsage: vi.fn().mockReturnValue({ percentage: 50 }),
      };

      (scene as any).saveLoadManager = mockSaveLoadManager;
      (scene as any).selectedSlotId = 1;

      const result = await (scene as any).executeDelete(1);

      expect(mockSaveLoadManager.deleteSaveData).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });
  });

  describe('Scene Transition Integration', () => {
    it('should transition to TitleScene on back button', async () => {
      const transitionSpy = vi.spyOn(SceneTransition, 'transitionTo').mockResolvedValue();
      const validateSpy = vi.spyOn(SceneTransition, 'validateSceneKey').mockReturnValue(true);

      (scene as any).fromScene = 'TitleScene';

      await (scene as any).handleBackButton();

      expect(validateSpy).toHaveBeenCalledWith(scene, 'TitleScene');
      expect(transitionSpy).toHaveBeenCalled();
    });

    it('should transition to ChapterSelectScene after successful load', async () => {
      const transitionSpy = vi.spyOn(SceneTransition, 'transitionTo').mockResolvedValue();

      const mockSaveData = {
        slotId: 1,
        timestamp: Date.now(),
        chapterState: { chapterId: 'chapter1', isCompleted: true },
        stageProgress: {},
        partyComposition: { members: [] },
        playTime: 1000,
      };

      (scene as any).time = {
        delayedCall: vi.fn((delay, callback) => callback()),
      };

      const targetScene = (scene as any).determineTargetScene(mockSaveData);

      expect(targetScene).toBe('ChapterSelectScene');
    });

    it('should transition to StageSelectScene for in-progress chapter', async () => {
      const mockSaveData = {
        slotId: 1,
        timestamp: Date.now(),
        chapterState: { chapterId: 'chapter1', isCompleted: false },
        stageProgress: {},
        partyComposition: { members: [] },
        playTime: 1000,
      };

      const targetScene = (scene as any).determineTargetScene(mockSaveData);

      expect(targetScene).toBe('StageSelectScene');
    });
  });

  describe('Keyboard Navigation Integration', () => {
    it('should setup keyboard navigation on scene creation', () => {
      (scene as any).add = {
        graphics: vi.fn().mockReturnValue({
          fillGradientStyle: vi.fn().mockReturnThis(),
          fillRect: vi.fn().mockReturnThis(),
          lineStyle: vi.fn().mockReturnThis(),
          lineBetween: vi.fn().mockReturnThis(),
        }),
        text: vi.fn().mockReturnValue({
          setOrigin: vi.fn().mockReturnThis(),
        }),
        container: vi.fn().mockReturnValue({
          add: vi.fn(),
          setDepth: vi.fn(),
        }),
      };
      (scene as any).input = {
        keyboard: {
          addKey: vi.fn().mockReturnValue({
            on: vi.fn(),
          }),
        },
      };
      (scene as any).time = {
        delayedCall: vi.fn(),
      };

      const mockSaveLoadManager = {
        getSaveSlots: vi.fn().mockReturnValue([]),
        isLocalStorageAvailable: vi.fn().mockReturnValue(true),
        isAutoSaveEnabled: vi.fn().mockReturnValue(true),
        getStorageUsage: vi.fn().mockReturnValue({ percentage: 50 }),
      };
      (scene as any).saveLoadManager = mockSaveLoadManager;

      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      expect((scene as any).keyboardNavigation).toBeDefined();
    });

    it('should handle Enter key press', () => {
      (scene as any).keyboardNavigation = {
        getCurrentFocusedElement: vi.fn().mockReturnValue({
          getId: vi.fn().mockReturnValue('save-slot-button-1'),
          onActivate: vi.fn(),
        }),
      };
      (scene as any).selectedSlotId = 1;
      (scene as any).currentMode = 'save';
      (scene as any).saveButton = {
        isInteractive: vi.fn().mockReturnValue(true),
      };

      const handleSaveSpy = vi.spyOn(scene as any, 'handleSaveButton').mockImplementation(() => {});

      (scene as any).handleEnterKey();

      expect(handleSaveSpy).toHaveBeenCalled();
    });

    it('should handle Escape key press', () => {
      const handleBackSpy = vi.spyOn(scene as any, 'handleBackButton').mockImplementation(() => {});

      (scene as any).handleEscapeKey();

      expect(handleBackSpy).toHaveBeenCalled();
    });
  });

  describe('Error Recovery Integration', () => {
    it('should handle storage unavailable error', () => {
      const mockSaveLoadManager = {
        isLocalStorageAvailable: vi.fn().mockReturnValue(false),
        getSaveSlots: vi.fn().mockReturnValue([]),
        isAutoSaveEnabled: vi.fn().mockReturnValue(true),
        getStorageUsage: vi.fn().mockReturnValue({ percentage: 50 }),
      };

      (scene as any).saveLoadManager = mockSaveLoadManager;
      (scene as any).add = {
        graphics: vi.fn().mockReturnValue({
          fillGradientStyle: vi.fn().mockReturnThis(),
          fillRect: vi.fn().mockReturnThis(),
          lineStyle: vi.fn().mockReturnThis(),
          lineBetween: vi.fn().mockReturnThis(),
        }),
        text: vi.fn().mockReturnValue({
          setOrigin: vi.fn().mockReturnThis(),
        }),
        container: vi.fn().mockReturnValue({
          add: vi.fn(),
          setDepth: vi.fn(),
        }),
      };
      (scene as any).input = {
        keyboard: {
          addKey: vi.fn().mockReturnValue({
            on: vi.fn(),
          }),
        },
      };
      (scene as any).time = {
        delayedCall: vi.fn(),
      };

      const showErrorSpy = vi.spyOn(scene as any, 'showEnhancedError');

      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      expect(showErrorSpy).toHaveBeenCalled();
    });

    it('should handle quota exceeded error', () => {
      const mockSaveLoadManager = {
        isLocalStorageAvailable: vi.fn().mockReturnValue(true),
        getStorageUsage: vi.fn().mockReturnValue({ percentage: 95 }),
        getSaveSlots: vi.fn().mockReturnValue([]),
        isAutoSaveEnabled: vi.fn().mockReturnValue(true),
      };

      (scene as any).saveLoadManager = mockSaveLoadManager;
      (scene as any).add = {
        graphics: vi.fn().mockReturnValue({
          fillGradientStyle: vi.fn().mockReturnThis(),
          fillRect: vi.fn().mockReturnThis(),
          lineStyle: vi.fn().mockReturnThis(),
          lineBetween: vi.fn().mockReturnThis(),
        }),
        text: vi.fn().mockReturnValue({
          setOrigin: vi.fn().mockReturnThis(),
        }),
        container: vi.fn().mockReturnValue({
          add: vi.fn(),
          setDepth: vi.fn(),
        }),
      };
      (scene as any).input = {
        keyboard: {
          addKey: vi.fn().mockReturnValue({
            on: vi.fn(),
          }),
        },
      };
      (scene as any).time = {
        delayedCall: vi.fn(),
      };

      const showErrorSpy = vi.spyOn(scene as any, 'showEnhancedError');

      scene.create({ mode: 'load', fromScene: 'TitleScene' });

      expect(showErrorSpy).toHaveBeenCalled();
    });

    it('should handle data corruption error', () => {
      const mockSaveLoadManager = {
        validateSaveData: vi.fn().mockReturnValue(false),
        getSaveSlots: vi.fn().mockReturnValue([
          {
            slotId: 1,
            saveData: { corrupted: true },
          },
        ]),
        isLocalStorageAvailable: vi.fn().mockReturnValue(true),
        isAutoSaveEnabled: vi.fn().mockReturnValue(true),
        getStorageUsage: vi.fn().mockReturnValue({ percentage: 50 }),
      };

      (scene as any).saveLoadManager = mockSaveLoadManager;

      const isCorrupted = (scene as any).checkDataCorruption(1);

      expect(isCorrupted).toBe(true);
    });

    it('should recover from save failure', async () => {
      const mockSaveLoadManager = {
        saveGame: vi.fn().mockReturnValue(false),
        isLocalStorageAvailable: vi.fn().mockReturnValue(true),
        getStorageUsage: vi.fn().mockReturnValue({ percentage: 50 }),
      };

      (scene as any).saveLoadManager = mockSaveLoadManager;
      (scene as any).loadingSpinner = {
        show: vi.fn(),
        hide: vi.fn(),
      };

      const showErrorSpy = vi.spyOn(scene as any, 'showEnhancedError');

      await (scene as any).executeSaveOperation({
        chapterState: {},
        stageProgress: {},
        partyComposition: { members: [] },
        playTime: 1000,
      });

      expect(showErrorSpy).toHaveBeenCalled();
      expect((scene as any).loadingSpinner.hide).toHaveBeenCalled();
    });
  });

  describe('Complete Flow Integration', () => {
    it('should complete save flow from selection to confirmation', async () => {
      const mockSaveLoadManager = {
        saveGame: vi.fn().mockReturnValue(true),
        getSaveSlots: vi.fn().mockReturnValue([
          { slotId: 1, saveData: null },
        ]),
        isLocalStorageAvailable: vi.fn().mockReturnValue(true),
        isAutoSaveEnabled: vi.fn().mockReturnValue(true),
        getStorageUsage: vi.fn().mockReturnValue({ percentage: 50 }),
      };

      (scene as any).saveLoadManager = mockSaveLoadManager;
      (scene as any).selectedSlotId = 1;
      (scene as any).currentGameState = {
        chapterState: {},
        stageProgress: {},
        partyComposition: { members: [] },
        playTime: 1000,
      };
      (scene as any).loadingSpinner = {
        show: vi.fn(),
        hide: vi.fn(),
      };
      (scene as any).time = {
        delayedCall: vi.fn(),
      };

      const showMessageSpy = vi.spyOn(scene as any, 'showMessage');

      await (scene as any).executeSaveOperation({
        chapterState: {},
        stageProgress: {},
        partyComposition: { members: [] },
        playTime: 1000,
      });

      expect(mockSaveLoadManager.saveGame).toHaveBeenCalled();
      expect(showMessageSpy).toHaveBeenCalledWith('保存完了', 'success');
    });

    it('should complete load flow from selection to scene transition', async () => {
      const mockSaveData = {
        slotId: 1,
        timestamp: Date.now(),
        chapterState: { chapterId: 'chapter1', isCompleted: false },
        stageProgress: {},
        partyComposition: { members: [] },
        playTime: 1000,
      };

      const mockSaveLoadManager = {
        loadGame: vi.fn().mockReturnValue(mockSaveData),
        validateSaveData: vi.fn().mockReturnValue(true),
        isLocalStorageAvailable: vi.fn().mockReturnValue(true),
      };

      (scene as any).saveLoadManager = mockSaveLoadManager;
      (scene as any).selectedSlotId = 1;
      (scene as any).loadingSpinner = {
        show: vi.fn(),
        hide: vi.fn(),
      };
      (scene as any).time = {
        delayedCall: vi.fn((delay, callback) => callback()),
      };

      const transitionSpy = vi.spyOn(SceneTransition, 'transitionTo').mockResolvedValue();
      const showMessageSpy = vi.spyOn(scene as any, 'showMessage');

      await (scene as any).executeLoadOperation();

      expect(mockSaveLoadManager.loadGame).toHaveBeenCalled();
      expect(showMessageSpy).toHaveBeenCalledWith('読み込み完了', 'success');
      expect(transitionSpy).toHaveBeenCalled();
    });
  });
});
