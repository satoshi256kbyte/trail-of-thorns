/**
 * 章・ステージ管理システム統合テスト
 *
 * このテストスイートは、章・ステージ管理システムの主要なフローを検証します：
 * - 章開始からクリアまでのフロー
 * - パーティ編成からステージ開始
 * - セーブ・ロードの完全性
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { ChapterManager } from '../../game/src/systems/chapter/ChapterManager';
import { PartyManager } from '../../game/src/systems/chapter/PartyManager';
import { PartyValidationError } from '../../game/src/types/chapter';
import { StageProgressManager } from '../../game/src/systems/chapterStage/StageProgressManager';
import { SaveLoadManager } from '../../game/src/systems/chapterStage/SaveLoadManager';
import type {
  ChapterData,
  ChapterState,
  PartyComposition,
  StageProgress,
  SaveData,
  StageMetadata,
} from '../../game/src/types/chapterStage';

describe('章・ステージ管理システム統合テスト', () => {
  let chapterManager: ChapterManager;
  let partyManager: PartyManager;
  let stageProgressManager: StageProgressManager;
  let saveLoadManager: SaveLoadManager;

  // テスト用の章データ
  const mockChapterData: ChapterData = {
    id: 'test-chapter-1',
    name: 'テスト章',
    storyDescription: 'テスト用の章です',
    stageIds: ['stage-1-1', 'stage-1-2', 'stage-1-3'],
    recommendedLevel: 1,
  };

  // テスト用のステージメタデータ
  const mockStageMetadata: StageMetadata[] = [
    {
      id: 'stage-1-1',
      name: 'ステージ1',
      chapterId: 'test-chapter-1',
      difficulty: 1,
      recommendedLevel: 1,
      unlockCondition: {
        type: 'PREVIOUS_STAGE',
        requiredStageIds: [],
      },
      rewards: [],
    },
    {
      id: 'stage-1-2',
      name: 'ステージ2',
      chapterId: 'test-chapter-1',
      difficulty: 2,
      recommendedLevel: 2,
      unlockCondition: {
        type: 'PREVIOUS_STAGE',
        requiredStageIds: ['stage-1-1'],
      },
      rewards: [],
    },
    {
      id: 'stage-1-3',
      name: 'ステージ3',
      chapterId: 'test-chapter-1',
      difficulty: 3,
      recommendedLevel: 3,
      unlockCondition: {
        type: 'PREVIOUS_STAGE',
        requiredStageIds: ['stage-1-2'],
      },
      rewards: [],
    },
  ];

  // テスト用のキャラクターID
  const testCharacters = ['char-001', 'char-002', 'char-003', 'char-004', 'char-005', 'char-006'];

  beforeEach(() => {
    chapterManager = new ChapterManager();
    partyManager = new PartyManager();
    stageProgressManager = new StageProgressManager();
    saveLoadManager = new SaveLoadManager();

    // テスト用の章データを設定
    chapterManager.setChapterDataForTesting(mockChapterData);

    // ステージメタデータを登録
    stageProgressManager.registerStageMetadataList(mockStageMetadata);
  });

  afterEach(() => {
    // クリーンアップ
    if (chapterManager) {
      chapterManager.destroy?.();
    }
  });

  describe('統合テスト1: 章開始からクリアまでのフロー', () => {
    test('章を開始し、全ステージをクリアして章を完了できる', () => {
      // 1. 章を開始
      chapterManager.startChapter('test-chapter-1', testCharacters);
      const initialState = chapterManager.getCurrentChapterState();

      expect(initialState).not.toBeNull();
      expect(initialState?.chapterId).toBe('test-chapter-1');
      expect(initialState?.currentStageIndex).toBe(0);
      expect(initialState?.availableCharacterIds).toEqual(testCharacters);
      expect(initialState?.lostCharacterIds).toEqual([]);
      expect(initialState?.isCompleted).toBe(false);

      // 2. 最初のステージを解放
      stageProgressManager.unlockStage('stage-1-1');
      expect(stageProgressManager.isStageUnlocked('stage-1-1')).toBe(true);

      // 3. ステージ1をクリア
      stageProgressManager.completeStage('stage-1-1', []);
      const stage1Progress = stageProgressManager.getStageProgress('stage-1-1');
      expect(stage1Progress?.isCompleted).toBe(true);

      // 4. ステージ2が自動的に解放されることを確認
      expect(stageProgressManager.isStageUnlocked('stage-1-2')).toBe(true);

      // 5. ステージ2をクリア
      stageProgressManager.completeStage('stage-1-2', []);
      expect(stageProgressManager.getStageProgress('stage-1-2')?.isCompleted).toBe(true);

      // 6. ステージ3が自動的に解放されることを確認
      expect(stageProgressManager.isStageUnlocked('stage-1-3')).toBe(true);

      // 7. ステージ3をクリア
      stageProgressManager.completeStage('stage-1-3', []);
      expect(stageProgressManager.getStageProgress('stage-1-3')?.isCompleted).toBe(true);

      // 8. 章が完了したことを確認
      const isChapterCompleted = stageProgressManager.isChapterCompleted('test-chapter-1');
      expect(isChapterCompleted).toBe(true);

      // 9. 章を完了状態にする
      chapterManager.completeChapter();
      const finalState = chapterManager.getCurrentChapterState();
      expect(finalState?.isCompleted).toBe(true);
    });

    test('章内でキャラクターがロストし、章完了後にリセットされる', () => {
      // 1. 章を開始
      chapterManager.startChapter('test-chapter-1', testCharacters);

      // 2. キャラクターをロスト状態にする
      chapterManager.markCharacterAsLost('char-003');
      let currentState = chapterManager.getCurrentChapterState();

      expect(currentState).not.toBeNull();
      expect(currentState?.lostCharacterIds).toContain('char-003');
      expect(currentState?.availableCharacterIds).not.toContain('char-003');

      // 3. 章を完了
      chapterManager.completeChapter();

      // 4. 次の章の準備（キャラクター状態リセット）
      chapterManager.prepareNextChapter('test-chapter-2', testCharacters);

      // 5. 次の章のデータを設定
      const mockChapterData2 = {
        id: 'test-chapter-2',
        name: 'テスト章2',
        storyDescription: 'テスト用の章2です',
        stageIds: ['stage-2-1'],
        recommendedLevel: 2,
      };
      chapterManager.setChapterDataForTesting(mockChapterData2);

      // 6. 次の章を開始
      chapterManager.startChapter('test-chapter-2', testCharacters);
      currentState = chapterManager.getCurrentChapterState();

      // 7. ロスト状態がリセットされていることを確認
      expect(currentState).not.toBeNull();
      expect(currentState?.lostCharacterIds).toEqual([]);
      expect(currentState?.availableCharacterIds).toEqual(testCharacters);
    });

    test('ステージクリア時に進行状況が正しく更新される', () => {
      // 1. 章を開始
      chapterManager.startChapter('test-chapter-1', testCharacters);

      // 2. ステージを順番にクリア
      stageProgressManager.unlockStage('stage-1-1');
      stageProgressManager.completeStage('stage-1-1', []);

      // 3. 章の進行状況を取得
      const chapterProgress = stageProgressManager.getChapterProgress('test-chapter-1');

      expect(chapterProgress).toHaveLength(3);
      expect(chapterProgress.find(p => p.stageId === 'stage-1-1')?.isCompleted).toBe(true);
      expect(chapterProgress.find(p => p.stageId === 'stage-1-2')?.isUnlocked).toBe(true);
      expect(chapterProgress.find(p => p.stageId === 'stage-1-3')?.isUnlocked).toBe(false);
    });
  });

  describe('統合テスト2: パーティ編成からステージ開始', () => {
    test('パーティを編成してステージを開始できる', () => {
      // 1. 章を開始
      chapterManager.startChapter('test-chapter-1', testCharacters);

      // 2. パーティを編成
      partyManager.addCharacter('char-001');
      partyManager.addCharacter('char-002');
      partyManager.addCharacter('char-003');

      const party = partyManager.getParty();
      expect(party.members).toHaveLength(3);
      expect(party.members).toContain('char-001');
      expect(party.members).toContain('char-002');
      expect(party.members).toContain('char-003');

      // 3. パーティを検証
      const lostCharacters = chapterManager.getLostCharacters();
      const validationResult = partyManager.validateParty(lostCharacters);

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);

      // 4. ステージを解放
      stageProgressManager.unlockStage('stage-1-1');
      expect(stageProgressManager.isStageUnlocked('stage-1-1')).toBe(true);

      // ステージ開始準備完了
    });

    test('ロストキャラクターを含むパーティは無効', () => {
      // 1. 章を開始
      chapterManager.startChapter('test-chapter-1', testCharacters);

      // 2. パーティを編成（ロスト前に追加）
      partyManager.addCharacter('char-001');
      partyManager.addCharacter('char-002');
      partyManager.addCharacter('char-003');

      // 3. キャラクターをロスト状態にする
      chapterManager.markCharacterAsLost('char-002');

      // 4. パーティを検証
      const lostCharacters = chapterManager.getLostCharacters();
      const validationResult = partyManager.validateParty(lostCharacters);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain(PartyValidationError.CHARACTER_LOST);
    });

    test('パーティサイズ制限（最大6人）が機能する', () => {
      // 1. 章を開始
      chapterManager.startChapter('test-chapter-1', testCharacters);

      // 2. 6人のキャラクターを追加
      testCharacters.forEach(charId => {
        partyManager.addCharacter(charId);
      });

      const party = partyManager.getParty();
      expect(party.members).toHaveLength(6);

      // 3. 7人目を追加しようとする
      const result = partyManager.addCharacter('char-007');
      expect(result).toBe(false);
      expect(partyManager.isPartyFull()).toBe(true);
    });

    test('パーティからキャラクターを除外できる', () => {
      // 1. 章を開始
      chapterManager.startChapter('test-chapter-1', testCharacters);

      // 2. パーティを編成
      partyManager.addCharacter('char-001');
      partyManager.addCharacter('char-002');
      partyManager.addCharacter('char-003');

      expect(partyManager.getParty().members).toHaveLength(3);

      // 3. キャラクターを除外
      const removed = partyManager.removeCharacter('char-002');
      expect(removed).toBe(true);
      expect(partyManager.getParty().members).toHaveLength(2);
      expect(partyManager.getParty().members).not.toContain('char-002');
    });
  });

  describe('統合テスト3: セーブ・ロードの完全性', () => {
    test('ゲーム状態を保存して正確に復元できる', () => {
      // 1. 章を開始
      chapterManager.startChapter('test-chapter-1', testCharacters);

      // 2. パーティを編成
      partyManager.addCharacter('char-001');
      partyManager.addCharacter('char-002');
      partyManager.addCharacter('char-003');

      // 3. ステージを進行
      stageProgressManager.unlockStage('stage-1-1');
      stageProgressManager.completeStage('stage-1-1', []);

      // 4. キャラクターをロスト状態にする
      chapterManager.markCharacterAsLost('char-004');

      // 5. 現在の状態を取得
      const originalChapterState = chapterManager.getCurrentChapterState();
      const originalParty = partyManager.getParty();
      const originalProgress = stageProgressManager.getChapterProgress('test-chapter-1');

      expect(originalChapterState).not.toBeNull();

      // 6. 章状態を保存
      const chapterSaveResult = chapterManager.saveChapterState();
      expect(chapterSaveResult.success).toBe(true);

      // 7. セーブデータを作成して保存
      const chapterStateData = {
        version: '1.0.0',
        timestamp: Date.now(),
        chapterId: originalChapterState!.chapterId,
        currentStageIndex: originalChapterState!.currentStageIndex,
        lostCharacterIds: originalChapterState!.lostCharacterIds,
        availableCharacterIds: originalChapterState!.availableCharacterIds,
        completedStageIds: originalChapterState!.completedStageIds,
        isCompleted: originalChapterState!.isCompleted,
        startTime: originalChapterState!.startTime,
        playTime: originalChapterState!.playTime,
      };

      const saved = saveLoadManager.saveGame(
        1,
        chapterStateData,
        stageProgressManager.saveProgress(),
        originalParty,
        1000
      );
      expect(saved).toBe(true);

      // 8. 新しいマネージャーインスタンスを作成（ロードをシミュレート）
      const newChapterManager = new ChapterManager();
      const newPartyManager = new PartyManager();
      const newStageProgressManager = new StageProgressManager();

      // テスト用の章データを設定
      newChapterManager.setChapterDataForTesting(mockChapterData);
      newStageProgressManager.registerStageMetadataList(mockStageMetadata);

      // 9. ロード
      const loadedData = saveLoadManager.loadGame(1);
      expect(loadedData).not.toBeNull();

      // 10. 状態を復元
      const restoreResult = newChapterManager.restoreChapterState('test-chapter-1');
      expect(restoreResult.success).toBe(true);

      newPartyManager.setParty(loadedData!.partyComposition);
      newStageProgressManager.restoreProgress(loadedData!.stageProgress);

      // 11. 復元された状態を検証
      const restoredChapterState = newChapterManager.getCurrentChapterState();
      const restoredParty = newPartyManager.getParty();
      const restoredProgress = newStageProgressManager.getChapterProgress('test-chapter-1');

      // 章状態の検証
      expect(restoredChapterState?.chapterId).toBe(originalChapterState?.chapterId);
      expect(restoredChapterState?.lostCharacterIds).toEqual(originalChapterState?.lostCharacterIds);
      expect(restoredChapterState?.availableCharacterIds).toEqual(
        originalChapterState?.availableCharacterIds
      );

      // パーティの検証
      expect(restoredParty.members).toEqual(originalParty.members);

      // 進行状況の検証
      expect(restoredProgress).toHaveLength(originalProgress.length);
    });

    test('複数のセーブスロットを管理できる', () => {
      // スロット1にセーブ
      chapterManager.startChapter('test-chapter-1', testCharacters);
      let chapterState1 = chapterManager.getCurrentChapterState();
      expect(chapterState1).not.toBeNull();
      
      const chapterStateData1 = {
        version: '1.0.0',
        timestamp: Date.now(),
        chapterId: chapterState1!.chapterId,
        currentStageIndex: chapterState1!.currentStageIndex,
        lostCharacterIds: chapterState1!.lostCharacterIds,
        availableCharacterIds: chapterState1!.availableCharacterIds,
        completedStageIds: chapterState1!.completedStageIds,
        isCompleted: chapterState1!.isCompleted,
        startTime: chapterState1!.startTime,
        playTime: chapterState1!.playTime,
      };
      saveLoadManager.saveGame(
        1,
        chapterStateData1,
        stageProgressManager.saveProgress(),
        partyManager.getParty(),
        1000
      );

      // スロット2にセーブ（新しいマネージャーで別の章を開始）
      const chapterManager2 = new ChapterManager();
      const mockChapterData2 = {
        id: 'test-chapter-2',
        name: 'テスト章2',
        storyDescription: 'テスト用の章2です',
        stageIds: ['stage-2-1'],
        recommendedLevel: 2,
      };
      chapterManager2.setChapterDataForTesting(mockChapterData2);
      chapterManager2.startChapter('test-chapter-2', testCharacters);
      const chapterState2 = chapterManager2.getCurrentChapterState();
      expect(chapterState2).not.toBeNull();
      
      const chapterStateData2 = {
        version: '1.0.0',
        timestamp: Date.now(),
        chapterId: chapterState2!.chapterId,
        currentStageIndex: chapterState2!.currentStageIndex,
        lostCharacterIds: chapterState2!.lostCharacterIds,
        availableCharacterIds: chapterState2!.availableCharacterIds,
        completedStageIds: chapterState2!.completedStageIds,
        isCompleted: chapterState2!.isCompleted,
        startTime: chapterState2!.startTime,
        playTime: chapterState2!.playTime,
      };
      saveLoadManager.saveGame(
        2,
        chapterStateData2,
        stageProgressManager.saveProgress(),
        partyManager.getParty(),
        2000
      );

      // セーブスロットを取得
      const slots = saveLoadManager.getSaveSlots();
      expect(slots.length).toBeGreaterThan(0);

      // スロット1をロード
      const loaded1 = saveLoadManager.loadGame(1);
      expect(loaded1?.chapterState.chapterId).toBe('test-chapter-1');

      // スロット2をロード
      const loaded2 = saveLoadManager.loadGame(2);
      expect(loaded2?.chapterState.chapterId).toBe('test-chapter-2');
    });

    test('破損したセーブデータを検出できる', () => {
      // 正常なセーブデータ
      const chapterState = chapterManager.getCurrentChapterState() || {
        chapterId: 'test',
        currentStageIndex: 0,
        lostCharacterIds: [],
        availableCharacterIds: [],
        completedStageIds: [],
        isCompleted: false,
        startTime: Date.now(),
        playTime: 0,
      };

      const validSaveData: SaveData = {
        version: '1.0.0',
        timestamp: Date.now(),
        chapterState: {
          version: '1.0.0',
          timestamp: Date.now(),
          ...chapterState,
        },
        stageProgress: stageProgressManager.saveProgress(),
        partyComposition: partyManager.getParty(),
        playTime: 1000,
      };

      // 検証が成功することを確認
      expect(saveLoadManager.validateSaveData(validSaveData)).toBe(true);

      // 破損したセーブデータ（必須フィールドが欠けている）
      const corruptedSaveData = {
        version: '1.0.0',
        // timestampが欠けている
        chapterState: {},
        stageProgress: {},
        partyComposition: { members: [] },
      } as any;

      // 検証が失敗することを確認
      expect(saveLoadManager.validateSaveData(corruptedSaveData)).toBe(false);
    });

    test('オートセーブが正しく機能する', () => {
      // オートセーブを有効化
      saveLoadManager.setAutoSaveEnabled(true);

      // 章を開始
      chapterManager.startChapter('test-chapter-1', testCharacters);

      // ステージをクリア
      stageProgressManager.unlockStage('stage-1-1');
      stageProgressManager.completeStage('stage-1-1', []);

      // オートセーブを実行
      const chapterState = chapterManager.getCurrentChapterState();
      expect(chapterState).not.toBeNull();
      
      const chapterStateData = {
        version: '1.0.0',
        timestamp: Date.now(),
        chapterId: chapterState!.chapterId,
        currentStageIndex: chapterState!.currentStageIndex,
        lostCharacterIds: chapterState!.lostCharacterIds,
        availableCharacterIds: chapterState!.availableCharacterIds,
        completedStageIds: chapterState!.completedStageIds,
        isCompleted: chapterState!.isCompleted,
        startTime: chapterState!.startTime,
        playTime: chapterState!.playTime,
      };
      saveLoadManager.autoSave(
        chapterStateData,
        stageProgressManager.saveProgress(),
        partyManager.getParty(),
        1000
      );

      // オートセーブスロットからロード
      const loaded = saveLoadManager.loadGame(0); // スロット0はオートセーブ用
      expect(loaded).not.toBeNull();
      expect(loaded?.chapterState.chapterId).toBe('test-chapter-1');
    });
  });

  describe('統合テスト4: エラーハンドリング', () => {
    test('未解放ステージへのアクセスを拒否する', () => {
      chapterManager.startChapter('test-chapter-1', testCharacters);

      // ステージ2は未解放
      expect(stageProgressManager.isStageUnlocked('stage-1-2')).toBe(false);

      // 未解放ステージをクリアしようとする
      expect(() => {
        stageProgressManager.completeStage('stage-1-2', []);
      }).toThrow();
    });

    test('存在しないセーブスロットからのロードを処理する', () => {
      const loaded = saveLoadManager.loadGame(999);
      expect(loaded).toBeNull();
    });

    test('パーティ編成の重複チェックが機能する', () => {
      chapterManager.startChapter('test-chapter-1', testCharacters);

      // addCharacter()は重複を防ぐので、2回目の追加は失敗する
      const firstAdd = partyManager.addCharacter('char-001');
      const secondAdd = partyManager.addCharacter('char-001'); // 重複

      expect(firstAdd).toBe(true);
      expect(secondAdd).toBe(false); // 重複は追加時に拒否される
      expect(partyManager.getParty().members).toHaveLength(1);

      // 直接パーティを設定して重複を作成し、検証をテスト
      partyManager.setParty({
        members: ['char-001', 'char-001', 'char-002'], // 重複を含む
        formation: 'BALANCED',
      });

      const lostCharacters = chapterManager.getLostCharacters();
      const validationResult = partyManager.validateParty(lostCharacters);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain(PartyValidationError.CHARACTER_DUPLICATE);
    });
  });
});
