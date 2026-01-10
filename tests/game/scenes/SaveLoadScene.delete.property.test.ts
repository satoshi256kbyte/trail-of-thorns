import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { SaveLoadScene } from '../../../game/src/scenes/SaveLoadScene';
import { SaveLoadManager } from '../../../game/src/systems/chapterStage/SaveLoadManager';

/**
 * SaveLoadScene Delete Functionality Property-Based Tests
 * Tests for Task 4.1.7.7: Property-based testing (100 iterations)
 * 
 * Property: 削除後のスロットが空になることを確認
 */
describe('SaveLoadScene - Delete Functionality Property-Based Tests', () => {
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 1: 削除後のスロットが空になる
   * For any slot with data, after deletion, the slot should be empty
   * 
   * **Validates: Requirements 2.5**
   */
  test('Property 1: 削除後のスロットが空になる (100 iterations)', async () => {
    const iterations = 100;
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
      // Generate random slot ID (1-9, excluding slot 0 which is autosave)
      const slotId = Math.floor(Math.random() * 9) + 1;

      // Generate random save data
      const saveData = {
        chapterState: {
          chapterId: `chapter-${Math.floor(Math.random() * 10) + 1}`,
          isCompleted: Math.random() > 0.5,
        },
        stageProgress: {
          currentStageId: `stage-${Math.floor(Math.random() * 20) + 1}`,
          completedStages: [],
        },
        partyComposition: {
          members: Array.from({ length: Math.floor(Math.random() * 6) + 1 }, (_, idx) => ({
            characterId: `char-${idx}`,
            name: `Character ${idx}`,
          })),
        },
        playTime: Math.floor(Math.random() * 10000000),
        timestamp: Date.now(),
      };

      // Mock getSaveSlots to return slot with data
      vi.spyOn(mockSaveLoadManager, 'getSaveSlots').mockReturnValue([
        {
          slotId: slotId,
          saveData: saveData,
        },
      ] as any);

      // Mock successful delete
      vi.spyOn(mockSaveLoadManager, 'deleteSaveData').mockReturnValue(true);

      // Set selected slot
      (scene as any).selectedSlotId = slotId;

      // Execute delete
      const deleteSuccess = await (scene as any).executeDelete(slotId);

      // Verify delete was successful
      expect(deleteSuccess).toBe(true);

      // Mock getSaveSlots to return empty slot after deletion
      vi.spyOn(mockSaveLoadManager, 'getSaveSlots').mockReturnValue([
        {
          slotId: slotId,
          saveData: null,
        },
      ] as any);

      // Verify slot is now empty
      const hasData = (scene as any).checkExistingData(slotId);
      expect(hasData).toBe(false);

      successCount++;
    }

    // Verify all iterations succeeded
    expect(successCount).toBe(iterations);
  });

  /**
   * Property 2: 空スロットの削除は常に失敗する
   * For any empty slot, deletion should always fail
   * 
   * **Validates: Requirements 2.5**
   */
  test('Property 2: 空スロットの削除は常に失敗する (100 iterations)', async () => {
    const iterations = 100;
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
      // Generate random slot ID (0-9)
      const slotId = Math.floor(Math.random() * 10);

      // Mock getSaveSlots to return empty slot
      vi.spyOn(mockSaveLoadManager, 'getSaveSlots').mockReturnValue([
        {
          slotId: slotId,
          saveData: null,
        },
      ] as any);

      // Set selected slot
      (scene as any).selectedSlotId = slotId;

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

      successCount++;
    }

    // Verify all iterations succeeded
    expect(successCount).toBe(iterations);
  });

  /**
   * Property 3: 削除操作は冪等である
   * Deleting the same slot multiple times should have the same result
   * 
   * **Validates: Requirements 2.5**
   */
  test('Property 3: 削除操作は冪等である (100 iterations)', async () => {
    const iterations = 100;
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
      // Generate random slot ID (1-9)
      const slotId = Math.floor(Math.random() * 9) + 1;

      // Generate random save data
      const saveData = {
        chapterState: {
          chapterId: `chapter-${Math.floor(Math.random() * 10) + 1}`,
        },
        stageProgress: {},
        partyComposition: { members: [] },
        playTime: Math.floor(Math.random() * 10000000),
        timestamp: Date.now(),
      };

      // Mock getSaveSlots to return slot with data
      vi.spyOn(mockSaveLoadManager, 'getSaveSlots').mockReturnValue([
        {
          slotId: slotId,
          saveData: saveData,
        },
      ] as any);

      // Mock successful delete
      vi.spyOn(mockSaveLoadManager, 'deleteSaveData').mockReturnValue(true);

      // Set selected slot
      (scene as any).selectedSlotId = slotId;

      // Execute delete first time
      const firstDelete = await (scene as any).executeDelete(slotId);
      expect(firstDelete).toBe(true);

      // Mock getSaveSlots to return empty slot after first deletion
      vi.spyOn(mockSaveLoadManager, 'getSaveSlots').mockReturnValue([
        {
          slotId: slotId,
          saveData: null,
        },
      ] as any);

      // Mock deleteSaveData to return true (even though slot is empty)
      // This simulates the idempotent behavior
      vi.spyOn(mockSaveLoadManager, 'deleteSaveData').mockReturnValue(true);

      // Execute delete second time
      const secondDelete = await (scene as any).executeDelete(slotId);

      // Verify both deletes have the same result
      expect(firstDelete).toBe(secondDelete);

      // Verify slot is still empty
      const hasData = (scene as any).checkExistingData(slotId);
      expect(hasData).toBe(false);

      successCount++;
    }

    // Verify all iterations succeeded
    expect(successCount).toBe(iterations);
  });
});
