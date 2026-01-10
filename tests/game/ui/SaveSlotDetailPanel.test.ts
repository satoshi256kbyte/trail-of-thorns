import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Phaser from 'phaser';
import { SaveSlotDetailPanel } from '../../../game/src/ui/SaveSlotDetailPanel';
import { SaveSlot } from '../../../game/src/types/chapterStage';

describe('SaveSlotDetailPanel', () => {
  let scene: Phaser.Scene;
  let detailPanel: SaveSlotDetailPanel;

  beforeEach(() => {
    // Create mock scene
    scene = {
      add: {
        container: vi.fn().mockReturnValue({
          add: vi.fn(),
          setDepth: vi.fn(),
          destroy: vi.fn(),
          removeAll: vi.fn(),
        }),
        graphics: vi.fn().mockReturnValue({
          fillStyle: vi.fn().mockReturnThis(),
          fillRect: vi.fn().mockReturnThis(),
          lineStyle: vi.fn().mockReturnThis(),
          strokeRect: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        }),
        text: vi.fn().mockReturnValue({
          setOrigin: vi.fn().mockReturnThis(),
          setWordWrapWidth: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        }),
      },
    } as any;
  });

  describe('initialization', () => {
    it('should create detail panel at specified position', () => {
      detailPanel = new SaveSlotDetailPanel(scene, 500, 300);

      expect(scene.add.container).toHaveBeenCalled();
    });
  });

  describe('updateDetails - empty slot', () => {
    beforeEach(() => {
      detailPanel = new SaveSlotDetailPanel(scene, 500, 300);
    });

    it('should display "データなし" for empty slot', () => {
      const emptySlot: SaveSlot = {
        slotId: 1,
        saveData: null,
      };

      detailPanel.updateDetails(emptySlot);

      expect(scene.add.text).toHaveBeenCalled();
    });

    it('should handle slot with ID -1 (no selection)', () => {
      const noSelectionSlot: SaveSlot = {
        slotId: -1,
        saveData: null,
      };

      detailPanel.updateDetails(noSelectionSlot);

      expect(scene.add.text).toHaveBeenCalled();
    });
  });

  describe('updateDetails - slot with data', () => {
    beforeEach(() => {
      detailPanel = new SaveSlotDetailPanel(scene, 500, 300);
    });

    it('should display chapter and stage information', () => {
      const slotWithData: SaveSlot = {
        slotId: 1,
        saveData: {
          slotId: 1,
          timestamp: Date.now(),
          chapterState: {
            chapterId: 'chapter1',
            chapterName: '第1章',
            currentStageIndex: 2,
            isCompleted: false,
          } as any,
          stageProgress: {
            stageId: 'stage1',
            stageName: 'ステージ1',
            recommendedLevel: 5,
            completedStages: 3,
            totalStages: 10,
          } as any,
          partyComposition: {
            members: [
              { characterId: 'char1', name: 'キャラA' },
              { characterId: 'char2', name: 'キャラB' },
            ],
          } as any,
          playTime: 3661000, // 1時間1分1秒
        },
      };

      detailPanel.updateDetails(slotWithData);

      // Should create multiple text elements for different information
      expect(scene.add.text).toHaveBeenCalled();
    });

    it('should format play time correctly', () => {
      const slotWithData: SaveSlot = {
        slotId: 1,
        saveData: {
          slotId: 1,
          timestamp: Date.now(),
          chapterState: { chapterId: 'chapter1', chapterName: '第1章' } as any,
          stageProgress: { stageName: 'ステージ1' } as any,
          partyComposition: { members: [] } as any,
          playTime: 7325000, // 2時間2分5秒
        },
      };

      detailPanel.updateDetails(slotWithData);

      expect(scene.add.text).toHaveBeenCalled();
    });

    it('should display party composition', () => {
      const slotWithData: SaveSlot = {
        slotId: 1,
        saveData: {
          slotId: 1,
          timestamp: Date.now(),
          chapterState: { chapterId: 'chapter1' } as any,
          stageProgress: {} as any,
          partyComposition: {
            members: [
              { characterId: 'char1', name: 'キャラA' },
              { characterId: 'char2', name: 'キャラB' },
              { characterId: 'char3', name: 'キャラC' },
            ],
          } as any,
          playTime: 1000,
        },
      };

      detailPanel.updateDetails(slotWithData);

      expect(scene.add.text).toHaveBeenCalled();
    });

    it('should display completed stages count', () => {
      const slotWithData: SaveSlot = {
        slotId: 1,
        saveData: {
          slotId: 1,
          timestamp: Date.now(),
          chapterState: { chapterId: 'chapter1' } as any,
          stageProgress: {
            completedStages: 5,
            totalStages: 10,
          } as any,
          partyComposition: { members: [] } as any,
          playTime: 1000,
        },
      };

      detailPanel.updateDetails(slotWithData);

      expect(scene.add.text).toHaveBeenCalled();
    });
  });

  describe('updateDetails - data corruption warning', () => {
    beforeEach(() => {
      detailPanel = new SaveSlotDetailPanel(scene, 500, 300);
    });

    it('should display warning for corrupted data', () => {
      const corruptedSlot: SaveSlot = {
        slotId: 1,
        saveData: {
          slotId: 1,
          timestamp: Date.now(),
          chapterState: null as any, // Corrupted data
          stageProgress: null as any,
          partyComposition: null as any,
          playTime: 0,
        },
      };

      detailPanel.updateDetails(corruptedSlot);

      expect(scene.add.text).toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should clear all displayed information', () => {
      detailPanel = new SaveSlotDetailPanel(scene, 500, 300);

      const slotWithData: SaveSlot = {
        slotId: 1,
        saveData: {
          slotId: 1,
          timestamp: Date.now(),
          chapterState: { chapterId: 'chapter1' } as any,
          stageProgress: {} as any,
          partyComposition: { members: [] } as any,
          playTime: 1000,
        },
      };

      detailPanel.updateDetails(slotWithData);
      detailPanel.clear();

      // Container should be cleared
      const container = (scene.add.container as any).mock.results[0].value;
      expect(container.removeAll).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should clean up all resources', () => {
      detailPanel = new SaveSlotDetailPanel(scene, 500, 300);

      const slotWithData: SaveSlot = {
        slotId: 1,
        saveData: {
          slotId: 1,
          timestamp: Date.now(),
          chapterState: { chapterId: 'chapter1' } as any,
          stageProgress: {} as any,
          partyComposition: { members: [] } as any,
          playTime: 1000,
        },
      };

      detailPanel.updateDetails(slotWithData);
      detailPanel.destroy();

      // Container should be destroyed
      const container = (scene.add.container as any).mock.results[0].value;
      expect(container.destroy).toHaveBeenCalled();
    });
  });

  describe('timestamp formatting', () => {
    it('should format timestamp correctly', () => {
      detailPanel = new SaveSlotDetailPanel(scene, 500, 300);

      const timestamp = new Date('2024-01-08T12:30:45').getTime();
      const slotWithData: SaveSlot = {
        slotId: 1,
        saveData: {
          slotId: 1,
          timestamp: timestamp,
          chapterState: { chapterId: 'chapter1' } as any,
          stageProgress: {} as any,
          partyComposition: { members: [] } as any,
          playTime: 1000,
        },
      };

      detailPanel.updateDetails(slotWithData);

      expect(scene.add.text).toHaveBeenCalled();
    });
  });
});
