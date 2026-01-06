/**
 * SaveLoadManager LocalStorage統合テスト
 * SaveLoadManager LocalStorage Integration Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { SaveLoadManager } from '../../../../game/src/systems/chapterStage/SaveLoadManager';
import {
  ChapterStateData,
  StageProgressData,
  PartyComposition,
} from '../../../../game/src/types/chapterStage';

describe('SaveLoadManager - LocalStorage統合', () => {
  let saveLoadManager: SaveLoadManager;

  // テストデータ
  const mockChapterState: ChapterStateData = {
    chapterId: 'chapter-1',
    currentStageIndex: 2,
    lostCharacterIds: ['char-003'],
    availableCharacterIds: ['char-001', 'char-002', 'char-004'],
    completedStageIds: ['stage-1-1', 'stage-1-2'],
    isCompleted: false,
    startTime: Date.now(),
    playTime: 3600000,
    version: '1.0.0',
    timestamp: Date.now(),
  };

  const mockStageProgress: StageProgressData = {
    stages: [
      {
        stageId: 'stage-1-1',
        isUnlocked: true,
        isCompleted: true,
        completionTime: Date.now(),
        rewards: [],
      },
      {
        stageId: 'stage-1-2',
        isUnlocked: true,
        isCompleted: true,
        completionTime: Date.now(),
        rewards: [],
      },
      {
        stageId: 'stage-1-3',
        isUnlocked: true,
        isCompleted: false,
        rewards: [],
      },
    ],
  };

  const mockPartyComposition: PartyComposition = {
    members: ['char-001', 'char-002', 'char-004'],
    formation: 'BALANCED',
  };

  beforeEach(() => {
    localStorage.clear();
    saveLoadManager = new SaveLoadManager();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('基本的なセーブ・ロード', () => {
    test('ゲームを保存できる', () => {
      const result = saveLoadManager.saveGame(
        1,
        mockChapterState,
        mockStageProgress,
        mockPartyComposition,
        3600000
      );

      expect(result).toBe(true);
    });

    test('保存したゲームを読み込める', () => {
      // 保存
      saveLoadManager.saveGame(
        1,
        mockChapterState,
        mockStageProgress,
        mockPartyComposition,
        3600000
      );

      // 読み込み
      const loadedData = saveLoadManager.loadGame(1);

      expect(loadedData).not.toBeNull();
      expect(loadedData?.chapterState.chapterId).toBe('chapter-1');
      expect(loadedData?.chapterState.lostCharacterIds).toEqual(['char-003']);
      expect(loadedData?.partyComposition.members).toEqual(['char-001', 'char-002', 'char-004']);
    });

    test('存在しないスロットの読み込みはnullを返す', () => {
      const loadedData = saveLoadManager.loadGame(5);
      expect(loadedData).toBeNull();
    });

    test('セーブデータを削除できる', () => {
      // 保存
      saveLoadManager.saveGame(
        1,
        mockChapterState,
        mockStageProgress,
        mockPartyComposition,
        3600000
      );

      // 削除
      const deleteResult = saveLoadManager.deleteSaveData(1);
      expect(deleteResult).toBe(true);

      // 削除後は読み込めない
      const loadedData = saveLoadManager.loadGame(1);
      expect(loadedData).toBeNull();
    });
  });

  describe('複数スロットの管理', () => {
    test('複数のスロットに保存できる', () => {
      const chapter1State = { ...mockChapterState, chapterId: 'chapter-1' };
      const chapter2State = { ...mockChapterState, chapterId: 'chapter-2' };
      const chapter3State = { ...mockChapterState, chapterId: 'chapter-3' };

      saveLoadManager.saveGame(1, chapter1State, mockStageProgress, mockPartyComposition, 1000);
      saveLoadManager.saveGame(2, chapter2State, mockStageProgress, mockPartyComposition, 2000);
      saveLoadManager.saveGame(3, chapter3State, mockStageProgress, mockPartyComposition, 3000);

      const slot1 = saveLoadManager.loadGame(1);
      const slot2 = saveLoadManager.loadGame(2);
      const slot3 = saveLoadManager.loadGame(3);

      expect(slot1?.chapterState.chapterId).toBe('chapter-1');
      expect(slot2?.chapterState.chapterId).toBe('chapter-2');
      expect(slot3?.chapterState.chapterId).toBe('chapter-3');
    });

    test('セーブスロット一覧を取得できる', () => {
      saveLoadManager.saveGame(
        1,
        mockChapterState,
        mockStageProgress,
        mockPartyComposition,
        3600000
      );
      saveLoadManager.saveGame(
        2,
        { ...mockChapterState, chapterId: 'chapter-2' },
        mockStageProgress,
        mockPartyComposition,
        7200000
      );

      const slots = saveLoadManager.getSaveSlots();

      expect(slots).toHaveLength(10); // MAX_SAVE_SLOTS = 10
      expect(slots[1].saveData).not.toBeNull();
      expect(slots[2].saveData).not.toBeNull();
      expect(slots[3].saveData).toBeNull();
    });
  });

  describe('オートセーブ', () => {
    test('オートセーブが実行される', () => {
      saveLoadManager.autoSave(mockChapterState, mockStageProgress, mockPartyComposition, 3600000);

      // スロット0（オートセーブ用）にデータが保存される
      const autoSaveData = saveLoadManager.loadGame(0);
      expect(autoSaveData).not.toBeNull();
      expect(autoSaveData?.chapterState.chapterId).toBe('chapter-1');
    });

    test('オートセーブを無効にできる', () => {
      saveLoadManager.setAutoSaveEnabled(false);
      expect(saveLoadManager.isAutoSaveEnabled()).toBe(false);

      saveLoadManager.autoSave(mockChapterState, mockStageProgress, mockPartyComposition, 3600000);

      // オートセーブが無効なので保存されない
      const autoSaveData = saveLoadManager.loadGame(0);
      expect(autoSaveData).toBeNull();
    });

    test('オートセーブを再度有効にできる', () => {
      saveLoadManager.setAutoSaveEnabled(false);
      saveLoadManager.setAutoSaveEnabled(true);
      expect(saveLoadManager.isAutoSaveEnabled()).toBe(true);

      saveLoadManager.autoSave(mockChapterState, mockStageProgress, mockPartyComposition, 3600000);

      const autoSaveData = saveLoadManager.loadGame(0);
      expect(autoSaveData).not.toBeNull();
    });
  });

  describe('データ検証', () => {
    test('有効なセーブデータは検証を通過する', () => {
      saveLoadManager.saveGame(
        1,
        mockChapterState,
        mockStageProgress,
        mockPartyComposition,
        3600000
      );

      const loadedData = saveLoadManager.loadGame(1);
      expect(loadedData).not.toBeNull();
    });

    test('破損したセーブデータは読み込めない', () => {
      // 直接LocalStorageに無効なデータを保存
      localStorage.setItem('trail_of_thorns_save_1', 'invalid json data {');

      const loadedData = saveLoadManager.loadGame(1);
      expect(loadedData).toBeNull();
    });
  });

  describe('エラーハンドリング', () => {
    test('無効なスロットIDでの保存は失敗する', () => {
      const result = saveLoadManager.saveGame(
        -1,
        mockChapterState,
        mockStageProgress,
        mockPartyComposition,
        3600000
      );
      expect(result).toBe(false);
    });

    test('無効なスロットIDでの読み込みは失敗する', () => {
      const loadedData = saveLoadManager.loadGame(100);
      expect(loadedData).toBeNull();
    });

    test('無効なスロットIDでの削除は失敗する', () => {
      const result = saveLoadManager.deleteSaveData(-1);
      expect(result).toBe(false);
    });
  });

  describe('LocalStorage統合', () => {
    test('LocalStorageの利用可能性をチェックできる', () => {
      expect(saveLoadManager.isLocalStorageAvailable()).toBe(true);
    });

    test('ストレージ使用量を取得できる', () => {
      saveLoadManager.saveGame(
        1,
        mockChapterState,
        mockStageProgress,
        mockPartyComposition,
        3600000
      );

      const usage = saveLoadManager.getStorageUsage();
      expect(usage.used).toBeGreaterThan(0);
      expect(usage.total).toBeGreaterThan(0);
      expect(usage.percentage).toBeGreaterThanOrEqual(0);
    });

    test('全セーブデータをクリアできる', () => {
      saveLoadManager.saveGame(
        1,
        mockChapterState,
        mockStageProgress,
        mockPartyComposition,
        3600000
      );
      saveLoadManager.saveGame(
        2,
        mockChapterState,
        mockStageProgress,
        mockPartyComposition,
        3600000
      );

      saveLoadManager.clearAllSaveData();

      expect(saveLoadManager.loadGame(1)).toBeNull();
      expect(saveLoadManager.loadGame(2)).toBeNull();
    });
  });

  describe('暗号化機能', () => {
    test('暗号化を有効にしてセーブ・ロードできる', () => {
      const encryptedManager = new SaveLoadManager(true, 'test_encryption_key_12345');

      const saveResult = encryptedManager.saveGame(
        1,
        mockChapterState,
        mockStageProgress,
        mockPartyComposition,
        3600000
      );
      expect(saveResult).toBe(true);

      const loadedData = encryptedManager.loadGame(1);
      expect(loadedData).not.toBeNull();
      expect(loadedData?.chapterState.chapterId).toBe('chapter-1');
    });
  });

  describe('データの永続性', () => {
    test('マネージャーを再作成してもデータは保持される', () => {
      // 最初のマネージャーで保存
      const manager1 = new SaveLoadManager();
      manager1.saveGame(1, mockChapterState, mockStageProgress, mockPartyComposition, 3600000);

      // 新しいマネージャーで読み込み
      const manager2 = new SaveLoadManager();
      const loadedData = manager2.loadGame(1);

      expect(loadedData).not.toBeNull();
      expect(loadedData?.chapterState.chapterId).toBe('chapter-1');
    });
  });
});
