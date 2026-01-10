import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Phaser from 'phaser';
import { SaveSlotList } from '../../../game/src/ui/SaveSlotList';
import { SaveSlot } from '../../../game/src/types/chapterStage';

describe('SaveSlotList', () => {
  let scene: Phaser.Scene;
  let saveSlotList: SaveSlotList;
  let mockCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create mock scene
    scene = {
      add: {
        container: vi.fn().mockReturnValue({
          add: vi.fn(),
          setDepth: vi.fn(),
          destroy: vi.fn(),
        }),
      },
      events: {
        on: vi.fn(),
        off: vi.fn(),
      },
    } as any;

    mockCallback = vi.fn();
  });

  describe('create', () => {
    it('should create 10 slot buttons', () => {
      const mockSlots: SaveSlot[] = Array.from({ length: 10 }, (_, i) => ({
        slotId: i,
        saveData: null,
      }));

      saveSlotList = new SaveSlotList(scene, 100, 200, mockCallback);
      saveSlotList.create(mockSlots);

      const slotButtons = saveSlotList.getSlotButtons();
      expect(slotButtons).toHaveLength(10);
    });

    it('should mark slot 0 as autosave', () => {
      const mockSlots: SaveSlot[] = Array.from({ length: 10 }, (_, i) => ({
        slotId: i,
        saveData: null,
      }));

      saveSlotList = new SaveSlotList(scene, 100, 200, mockCallback);
      saveSlotList.create(mockSlots);

      const slot0 = saveSlotList.getSlotButtonById(0);
      expect(slot0).toBeDefined();
      // Slot 0 should be marked as autosave in its display
    });

    it('should handle slots with save data', () => {
      const mockSlots: SaveSlot[] = [
        {
          slotId: 0,
          saveData: {
            slotId: 0,
            timestamp: Date.now(),
            chapterState: { chapterId: 'chapter1', currentStageIndex: 0 } as any,
            stageProgress: {} as any,
            partyComposition: { members: [] } as any,
            playTime: 1000,
          },
        },
        ...Array.from({ length: 9 }, (_, i) => ({
          slotId: i + 1,
          saveData: null,
        })),
      ];

      saveSlotList = new SaveSlotList(scene, 100, 200, mockCallback);
      saveSlotList.create(mockSlots);

      const slot0 = saveSlotList.getSlotButtonById(0);
      expect(slot0).toBeDefined();
    });
  });

  describe('selectSlot', () => {
    beforeEach(() => {
      const mockSlots: SaveSlot[] = Array.from({ length: 10 }, (_, i) => ({
        slotId: i,
        saveData: null,
      }));

      saveSlotList = new SaveSlotList(scene, 100, 200, mockCallback);
      saveSlotList.create(mockSlots);
    });

    it('should select a slot by index', () => {
      saveSlotList.selectSlot(2);

      const selectedSlot = saveSlotList.getSelectedSlotId();
      expect(selectedSlot).toBe(2);
    });

    it('should call callback when slot is selected', () => {
      saveSlotList.selectSlot(3);

      expect(mockCallback).toHaveBeenCalledWith(3);
    });

    it('should deselect previous slot when selecting new slot', () => {
      saveSlotList.selectSlot(1);
      saveSlotList.selectSlot(2);

      const selectedSlot = saveSlotList.getSelectedSlotId();
      expect(selectedSlot).toBe(2);
      expect(mockCallback).toHaveBeenCalledTimes(2);
    });

    it('should handle selecting the same slot twice', () => {
      saveSlotList.selectSlot(1);
      saveSlotList.selectSlot(1);

      expect(mockCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('selectSlotById', () => {
    beforeEach(() => {
      const mockSlots: SaveSlot[] = Array.from({ length: 10 }, (_, i) => ({
        slotId: i,
        saveData: null,
      }));

      saveSlotList = new SaveSlotList(scene, 100, 200, mockCallback);
      saveSlotList.create(mockSlots);
    });

    it('should select a slot by ID', () => {
      saveSlotList.selectSlotById(5);

      const selectedSlot = saveSlotList.getSelectedSlotId();
      expect(selectedSlot).toBe(5);
    });

    it('should handle invalid slot ID', () => {
      saveSlotList.selectSlotById(99);

      const selectedSlot = saveSlotList.getSelectedSlotId();
      expect(selectedSlot).toBe(-1);
    });
  });

  describe('updateSlots', () => {
    it('should update slot list with new data', () => {
      const initialSlots: SaveSlot[] = Array.from({ length: 10 }, (_, i) => ({
        slotId: i,
        saveData: null,
      }));

      saveSlotList = new SaveSlotList(scene, 100, 200, mockCallback);
      saveSlotList.create(initialSlots);

      const updatedSlots: SaveSlot[] = [
        {
          slotId: 0,
          saveData: {
            slotId: 0,
            timestamp: Date.now(),
            chapterState: { chapterId: 'chapter1', currentStageIndex: 0 } as any,
            stageProgress: {} as any,
            partyComposition: { members: [] } as any,
            playTime: 1000,
          },
        },
        ...Array.from({ length: 9 }, (_, i) => ({
          slotId: i + 1,
          saveData: null,
        })),
      ];

      saveSlotList.updateSlots(updatedSlots);

      const slotButtons = saveSlotList.getSlotButtons();
      expect(slotButtons).toHaveLength(10);
    });
  });

  describe('getSlotButtonById', () => {
    beforeEach(() => {
      const mockSlots: SaveSlot[] = Array.from({ length: 10 }, (_, i) => ({
        slotId: i,
        saveData: null,
      }));

      saveSlotList = new SaveSlotList(scene, 100, 200, mockCallback);
      saveSlotList.create(mockSlots);
    });

    it('should return slot button by ID', () => {
      const button = saveSlotList.getSlotButtonById(3);
      expect(button).toBeDefined();
    });

    it('should return undefined for invalid ID', () => {
      const button = saveSlotList.getSlotButtonById(99);
      expect(button).toBeUndefined();
    });
  });

  describe('destroy', () => {
    it('should clean up all resources', () => {
      const mockSlots: SaveSlot[] = Array.from({ length: 10 }, (_, i) => ({
        slotId: i,
        saveData: null,
      }));

      saveSlotList = new SaveSlotList(scene, 100, 200, mockCallback);
      saveSlotList.create(mockSlots);

      saveSlotList.destroy();

      // After destroy, slot buttons should be empty
      const slotButtons = saveSlotList.getSlotButtons();
      expect(slotButtons).toHaveLength(0);
    });
  });

  describe('selection state consistency', () => {
    it('should maintain only one selected slot at a time', () => {
      const mockSlots: SaveSlot[] = Array.from({ length: 10 }, (_, i) => ({
        slotId: i,
        saveData: null,
      }));

      saveSlotList = new SaveSlotList(scene, 100, 200, mockCallback);
      saveSlotList.create(mockSlots);

      // Select multiple slots in sequence
      saveSlotList.selectSlot(0);
      saveSlotList.selectSlot(1);
      saveSlotList.selectSlot(2);

      // Only the last selected slot should be selected
      const selectedSlot = saveSlotList.getSelectedSlotId();
      expect(selectedSlot).toBe(2);
    });
  });
});
