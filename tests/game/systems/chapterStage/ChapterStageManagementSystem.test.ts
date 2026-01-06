/**
 * ChapterStageManagementSystem Unit Tests
 * 章・ステージ管理システムメインコントローラーのユニットテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChapterStageManagementSystem } from '../../../../game/src/systems/chapterStage/ChapterStageManagementSystem';
import { Unit } from '../../../../game/src/types/gameplay';
import { ChapterStageError } from '../../../../game/src/types/chapterStage';

// Phaserシーンのモック（最小限の実装）
const createMockScene = () => ({
  events: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
  add: {
    existing: vi.fn(),
  },
  sys: {
    events: {
      on: vi.fn(),
      off: vi.fn(),
    },
  },
});

describe('ChapterStageManagementSystem', () => {
  let system: ChapterStageManagementSystem;
  let mockScene: any;
  let mockCharacters: Unit[];

  beforeEach(() => {
    // Phaserシーンのモック作成
    mockScene = createMockScene();

    // モックキャラクターの作成
    mockCharacters = [
      {
        id: 'char-001',
        name: 'Hero',
        position: { x: 0, y: 0 },
        stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
        currentHP: 100,
        currentMP: 50,
        faction: 'player',
        hasActed: false,
        hasMoved: false,
        level: 5,
      },
      {
        id: 'char-002',
        name: 'Warrior',
        position: { x: 1, y: 0 },
        stats: { maxHP: 120, maxMP: 30, attack: 25, defense: 20, speed: 8, movement: 3 },
        currentHP: 120,
        currentMP: 30,
        faction: 'player',
        hasActed: false,
        hasMoved: false,
        level: 4,
      },
      {
        id: 'char-003',
        name: 'Mage',
        position: { x: 2, y: 0 },
        stats: { maxHP: 80, maxMP: 100, attack: 15, defense: 10, speed: 12, movement: 2 },
        currentHP: 80,
        currentMP: 100,
        faction: 'player',
        hasActed: false,
        hasMoved: false,
        level: 6,
      },
    ];

    // システムの作成
    system = new ChapterStageManagementSystem(mockScene, {
      autoSaveEnabled: false,
      debugMode: false,
    });
  });

  describe('初期化', () => {
    it('システムを正常に初期化できる', async () => {
      const result = await system.initialize(mockCharacters);

      expect(result.success).toBe(true);
      expect(result.message).toContain('initialized');

      const state = system.getSystemState();
      expect(state.isInitialized).toBe(true);
      expect(state.availableCharacterCount).toBe(3);
    });

    it('空のキャラクターリストで初期化できる', async () => {
      const result = await system.initialize([]);

      expect(result.success).toBe(true);

      const state = system.getSystemState();
      expect(state.isInitialized).toBe(true);
      expect(state.availableCharacterCount).toBe(0);
    });

    it('初期化前はシステム状態が未初期化', () => {
      const state = system.getSystemState();

      expect(state.isInitialized).toBe(false);
      expect(state.currentChapterId).toBeNull();
      expect(state.currentStageId).toBeNull();
    });
  });

  describe('マネージャーアクセス', () => {
    it('各マネージャーにアクセスできる', () => {
      const chapterManager = system.getChapterManager();
      const partyManager = system.getPartyManager();
      const stageProgressManager = system.getStageProgressManager();
      const saveLoadManager = system.getSaveLoadManager();

      expect(chapterManager).toBeDefined();
      expect(partyManager).toBeDefined();
      expect(stageProgressManager).toBeDefined();
      expect(saveLoadManager).toBeDefined();
    });
  });

  describe('キャラクターロスト処理', () => {
    beforeEach(async () => {
      await system.initialize(mockCharacters);
      
      // 章を開始（モック）
      const chapterManager = system.getChapterManager();
      chapterManager.startChapter('chapter-1', mockCharacters.map(c => c.id));
    });

    it('キャラクターロストを正常に処理できる', () => {
      const result = system.handleCharacterLoss('char-001');

      expect(result.success).toBe(true);
      expect(result.message).toContain('lost');

      const chapterManager = system.getChapterManager();
      expect(chapterManager.isCharacterLost('char-001')).toBe(true);
      expect(chapterManager.isCharacterAvailable('char-001')).toBe(false);
    });

    it('複数のキャラクターをロストできる', () => {
      system.handleCharacterLoss('char-001');
      system.handleCharacterLoss('char-002');

      const chapterManager = system.getChapterManager();
      expect(chapterManager.getLostCharacters()).toHaveLength(2);
      expect(chapterManager.getAvailableCharacters()).toHaveLength(1);
    });

    it('未初期化状態ではキャラクターロストを処理できない', () => {
      const uninitializedSystem = new ChapterStageManagementSystem(mockScene);
      const result = uninitializedSystem.handleCharacterLoss('char-001');

      expect(result.success).toBe(false);
      expect(result.error).toBe(ChapterStageError.CHAPTER_NOT_INITIALIZED);
    });
  });

  describe('システム状態', () => {
    it('初期化後のシステム状態を取得できる', async () => {
      await system.initialize(mockCharacters);

      const state = system.getSystemState();

      expect(state.isInitialized).toBe(true);
      expect(state.availableCharacterCount).toBe(3);
      expect(state.lostCharacterCount).toBe(0);
      expect(state.partyMemberCount).toBe(0);
      expect(state.completedStageCount).toBe(0);
    });

    it('キャラクターロスト後のシステム状態を取得できる', async () => {
      await system.initialize(mockCharacters);
      
      const chapterManager = system.getChapterManager();
      chapterManager.startChapter('chapter-1', mockCharacters.map(c => c.id));
      
      system.handleCharacterLoss('char-001');

      const state = system.getSystemState();

      expect(state.availableCharacterCount).toBe(2);
      expect(state.lostCharacterCount).toBe(1);
    });
  });

  describe('セーブスロット', () => {
    it('セーブスロット一覧を取得できる', () => {
      const slots = system.getSaveSlots();

      expect(Array.isArray(slots)).toBe(true);
      expect(slots.length).toBeGreaterThan(0);
    });

    it('各セーブスロットにはslotIdがある', () => {
      const slots = system.getSaveSlots();

      slots.forEach((slot, index) => {
        expect(slot.slotId).toBe(index);
        expect(slot.lastSaved).toBeDefined();
      });
    });
  });

  describe('イベント発行', () => {
    it('初期化時にsystem-initializedイベントを発行する', async () => {
      const eventSpy = vi.fn();
      system.on('system-initialized', eventSpy);

      await system.initialize(mockCharacters);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          characterCount: 3,
        })
      );
    });

    it('キャラクターロスト時にcharacter-lostイベントを発行する', async () => {
      await system.initialize(mockCharacters);
      
      const chapterManager = system.getChapterManager();
      chapterManager.startChapter('chapter-1', mockCharacters.map(c => c.id));

      const eventSpy = vi.fn();
      system.on('character-lost', eventSpy);

      system.handleCharacterLoss('char-001');

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          characterId: 'char-001',
          remainingCharacters: 2,
        })
      );
    });
  });

  describe('破棄処理', () => {
    it('システムを正常に破棄できる', async () => {
      await system.initialize(mockCharacters);

      const eventSpy = vi.fn();
      system.on('system-destroyed', eventSpy);

      system.destroy();

      expect(eventSpy).toHaveBeenCalled();

      const state = system.getSystemState();
      expect(state.isInitialized).toBe(false);
    });

    it('破棄後は初期化されていない状態になる', async () => {
      await system.initialize(mockCharacters);
      system.destroy();

      const state = system.getSystemState();

      expect(state.isInitialized).toBe(false);
      expect(state.currentChapterId).toBeNull();
      expect(state.currentStageId).toBeNull();
    });
  });

  describe('エラーハンドリング', () => {
    it('未初期化状態でのステージ開始はエラーを返す', () => {
      const result = system.startStage('stage-1', ['char-001']);

      expect(result.success).toBe(false);
      expect(result.error).toBe(ChapterStageError.STAGE_NOT_INITIALIZED);
    });

    it('未初期化状態でのステージクリアはエラーを返す', () => {
      const result = system.completeStage('stage-1', []);

      expect(result.success).toBe(false);
      expect(result.error).toBe(ChapterStageError.STAGE_NOT_INITIALIZED);
    });

    it('未初期化状態での章完了はエラーを返す', () => {
      const result = system.completeChapter();

      expect(result.success).toBe(false);
      expect(result.error).toBe(ChapterStageError.CHAPTER_NOT_INITIALIZED);
    });
  });

  describe('統合動作', () => {
    it('初期化からキャラクターロストまでの一連の流れが正常に動作する', async () => {
      // 初期化
      const initResult = await system.initialize(mockCharacters);
      expect(initResult.success).toBe(true);

      // 章開始
      const chapterManager = system.getChapterManager();
      const startResult = chapterManager.startChapter('chapter-1', mockCharacters.map(c => c.id));
      expect(startResult.success).toBe(true);

      // キャラクターロスト
      const lossResult = system.handleCharacterLoss('char-001');
      expect(lossResult.success).toBe(true);

      // 状態確認
      const state = system.getSystemState();
      expect(state.isInitialized).toBe(true);
      expect(state.availableCharacterCount).toBe(2);
      expect(state.lostCharacterCount).toBe(1);
    });
  });
});
