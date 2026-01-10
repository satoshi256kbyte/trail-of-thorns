import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { SaveLoadScene } from '../../../game/src/scenes/SaveLoadScene';
import { SaveLoadManager } from '../../../game/src/systems/chapterStage/SaveLoadManager';

/**
 * SaveLoadScene Delete Functionality Unit Tests
 * Tests for Task 4.1.7: Delete functionality implementation
 */
describe('SaveLoadScene - Delete Functionality', () => {
  let scene: SaveLoadScene;
  let mockSaveLoadManager: SaveLoadManager;

  beforeEach(() => {
    // Create scene instance
    scene = new SaveLoadScene();

    // Mock SaveLoadManager
    mockSaveLoadManager = new SaveLoadManager();

    // Replace scene's SaveLoadManager with mock
    (scene as any).saveLoadManager = mockSaveLoadManager;

    // Mock Phaser scene methods
    (scene as any).add = {
      graphics: vi.fn().mockReturnValue({
        fillGradientStyle: vi.fn(),
        fillRect: vi.fn(),
        lineStyle: vi.fn(),
        lineBetween: vi.fn(),
        destroy: vi.fn(),
      }),
      text: vi.fn().mockReturnValue({
        setOrigin: vi.fn().mockReturnThis(),
        setDepth: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
      }),
    };

    (scene as any).time = {
      delayedCall: vi.fn((delay, callback) => {
        // Execute callback immediately for testing
        callback();
      }),
    };

    // Mock scene data
    (scene as any).currentMode = 'load';
    (scene as any).fromScene = 'TitleScene';
    (scene as any).selectedSlotId = 1;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Delete Button State Management', () => {
    test('should enable delete button when slot with data is selected', () => {
      // Mock slot with data
      vi.spyOn(mockSaveLoadManager, 'getSaveSlots').mockReturnValue([
        {
          slotId: 1,
          saveData: {
            chapterState: { chapterId: 'chapter-1' },
            stageProgress: {},
            partyComposition: { members: [] },
            playTime: 1000,
            timestamp: Date.now(),
          },
        },
      ] as any);

      // Create mock delete button
      const mockDeleteButton = {
        setEnabled: vi.fn(),
      };
      (scene as any).deleteButton = mockDeleteButton;

      // Call updateDeleteButtonState
      (scene as any).updateDeleteButtonState(1);

      // Verify delete button is enabled
      expect(mockDeleteButton.setEnabled).toHaveBeenCalledWith(true);
    });

    test('should disable delete button when empty slot is selected', () => {
      // Mock empty slot
      vi.spyOn(mockSaveLoadManager, 'getSaveSlots').mockReturnValue([
        {
          slotId: 1,
          saveData: null,
        },
      ] as any);

      // Create mock delete button
      const mockDeleteButton = {
        setEnabled: vi.fn(),
      };
      (scene as any).deleteButton = mockDeleteButton;

      // Call updateDeleteButtonState
      (scene as any).updateDeleteButtonState(1);

      // Verify delete button is disabled
      expect(mockDeleteButton.setEnabled).toHaveBeenCalledWith(false);
    });
  });

  describe('Delete Execution', () => {
    test('should successfully delete save data', async () => {
      // Mock successful delete
      vi.spyOn(mockSaveLoadManager, 'deleteSaveData').mockReturnValue(true);

      // Execute delete
      const result = await (scene as any).executeDelete(1);

      // Verify delete was called
      expect(mockSaveLoadManager.deleteSaveData).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    test('should return false when delete fails', async () => {
      // Mock failed delete
      vi.spyOn(mockSaveLoadManager, 'deleteSaveData').mockReturnValue(false);

      // Execute delete
      const result = await (scene as any).executeDelete(1);

      // Verify delete was called
      expect(mockSaveLoadManager.deleteSaveData).toHaveBeenCalledWith(1);
      expect(result).toBe(false);
    });

    test('should handle delete errors gracefully', async () => {
      // Mock delete error
      vi.spyOn(mockSaveLoadManager, 'deleteSaveData').mockImplementation(() => {
        throw new Error('Delete error');
      });

      // Execute delete
      const result = await (scene as any).executeDelete(1);

      // Verify error was handled
      expect(result).toBe(false);
    });
  });

  describe('Delete Button Handler', () => {
    test('should show error when no slot is selected', async () => {
      // Set invalid slot ID
      (scene as any).selectedSlotId = -1;

      // Mock showMessage
      const showMessageSpy = vi.spyOn(scene as any, 'showMessage');

      // Call handleDeleteButton
      await (scene as any).handleDeleteButton();

      // Verify error message was shown
      expect(showMessageSpy).toHaveBeenCalledWith(
        '有効なスロットを選択してください',
        'error'
      );
    });

    test('should show error when empty slot is selected', async () => {
      // Mock empty slot
      vi.spyOn(mockSaveLoadManager, 'getSaveSlots').mockReturnValue([
        {
          slotId: 1,
          saveData: null,
        },
      ] as any);

      // Mock showMessage
      const showMessageSpy = vi.spyOn(scene as any, 'showMessage');

      // Call handleDeleteButton
      await (scene as any).handleDeleteButton();

      // Verify error message was shown
      expect(showMessageSpy).toHaveBeenCalledWith(
        'このスロットにはデータがありません',
        'error'
      );
    });

    test('should show success message and refresh slot list on successful delete', async () => {
      // Mock slot with data
      vi.spyOn(mockSaveLoadManager, 'getSaveSlots').mockReturnValue([
        {
          slotId: 1,
          saveData: {
            chapterState: { chapterId: 'chapter-1' },
            stageProgress: {},
            partyComposition: { members: [] },
            playTime: 1000,
            timestamp: Date.now(),
          },
        },
      ] as any);

      // Mock successful delete
      vi.spyOn(mockSaveLoadManager, 'deleteSaveData').mockReturnValue(true);

      // Mock showMessage and refreshSlotList
      const showMessageSpy = vi.spyOn(scene as any, 'showMessage');
      const refreshSlotListSpy = vi.spyOn(scene as any, 'refreshSlotList').mockImplementation(() => {});

      // Mock delete button
      const mockDeleteButton = {
        setEnabled: vi.fn(),
      };
      (scene as any).deleteButton = mockDeleteButton;

      // Mock detail panel
      const mockDetailPanel = {
        updateDetails: vi.fn(),
      };
      (scene as any).detailPanel = mockDetailPanel;

      // Call handleDeleteButton
      await (scene as any).handleDeleteButton();

      // Verify success message was shown
      expect(showMessageSpy).toHaveBeenCalledWith('削除完了', 'success');

      // Verify slot list was refreshed (called in delayedCall callback)
      expect(refreshSlotListSpy).toHaveBeenCalled();

      // Verify selected slot was reset
      expect((scene as any).selectedSlotId).toBe(-1);

      // Verify delete button was disabled
      expect(mockDeleteButton.setEnabled).toHaveBeenCalledWith(false);

      // Verify detail panel was cleared
      expect(mockDetailPanel.updateDetails).toHaveBeenCalledWith({
        slotId: -1,
        saveData: null,
      });
    });

    test('should show error message on failed delete', async () => {
      // Mock slot with data
      vi.spyOn(mockSaveLoadManager, 'getSaveSlots').mockReturnValue([
        {
          slotId: 1,
          saveData: {
            chapterState: { chapterId: 'chapter-1' },
            stageProgress: {},
            partyComposition: { members: [] },
            playTime: 1000,
            timestamp: Date.now(),
          },
        },
      ] as any);

      // Mock failed delete
      vi.spyOn(mockSaveLoadManager, 'deleteSaveData').mockReturnValue(false);

      // Mock showMessage
      const showMessageSpy = vi.spyOn(scene as any, 'showMessage');

      // Call handleDeleteButton
      await (scene as any).handleDeleteButton();

      // Verify error message was shown
      expect(showMessageSpy).toHaveBeenCalledWith('削除に失敗しました', 'error');
    });
  });

  describe('Empty Slot Delete Prevention', () => {
    test('should not allow deleting empty slots', async () => {
      // Mock empty slot
      vi.spyOn(mockSaveLoadManager, 'getSaveSlots').mockReturnValue([
        {
          slotId: 1,
          saveData: null,
        },
      ] as any);

      // Mock showMessage
      const showMessageSpy = vi.spyOn(scene as any, 'showMessage');

      // Mock deleteSaveData (should not be called)
      const deleteSpy = vi.spyOn(mockSaveLoadManager, 'deleteSaveData');

      // Call handleDeleteButton
      await (scene as any).handleDeleteButton();

      // Verify error message was shown
      expect(showMessageSpy).toHaveBeenCalledWith(
        'このスロットにはデータがありません',
        'error'
      );

      // Verify delete was not called
      expect(deleteSpy).not.toHaveBeenCalled();
    });
  });
});
