/**
 * 章・ステージ管理システムE2Eテスト
 *
 * このテストスイートは、章・ステージ管理システムのエンドツーエンドフローを検証します：
 * - 新規ゲーム開始フロー
 * - 進行状況の保存・復元
 * - 章完了とキャラクター復活
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { ChapterManager } from '../../game/src/systems/chapter/ChapterManager';
import { PartyManager } from '../../game/src/systems/chapter/PartyManager';
import { StageProgressManager } from '../../game/src/systems/chapterStage/StageProgressManager';
import { SaveLoadManager } from '../../game/src/systems/chapterStage/SaveLoadManager';
import type { ChapterData, StageMetadata } from '../../game/src/types/chapterStage';

describe('章・ステージ管理システムE2Eテスト', () => {
  let chapterManager: ChapterManager;
  let partyManager: PartyManager;
  let stageProgressManager: StageProgressManager;
  let saveLoadManager: SaveLoadManager;

  // テスト用の章データ
  const chapter1Data: ChapterData = {
    id: 'chapter-1',
    name: '第1章：薔薇の目覚め',
    storyDescription: '物語の始まり',
    stageIds: ['stage-1-1', 'stage-1-2', 'stage-1-3'],
    recommendedLevel: 1,
  };

  const chapter2Data: ChapterData = {
    id: 'chapter-2',
    name: '第2章：闇の森',
    storyDescription: '冒険は続く',
    stageIds: ['stage-2-1', 'stage-2-2'],
    recommendedLevel: 5,
  };

  // テスト用のステージメタデータ
  const stageMetadata: StageMetadata[] = [
    {
      id: 'stage-1-1',
      name: '序章',
      chapterId: 'chapter-1',
      difficulty: 1,
      recommendedLevel: 1,
      unlockCondition: { type: 'PREVIOUS_STAGE', requiredStageIds: [] },
      rewards: [],
    },
    {
      id: 'stage-1-2',
      name: '試練',
      chapterId: 'chapter-1',
      difficulty: 2,
      recommendedLevel: 2,
      unlockCondition: { type: 'PREVIOUS_STAGE', requiredStageIds: ['stage-1-1'] },
      rewards: [],
    },
    {
      id: 'stage-1-3',
      name: 'ボス戦',
      chapterId: 'chapter-1',
      difficulty: 3,
      recommendedLevel: 3,
      unlockCondition: { type: 'PREVIOUS_STAGE', requiredStageIds: ['stage-1-2'] },
      rewards: [],
    },
    {
      id: 'stage-2-1',
      name: '森の入口',
      chapterId: 'chapter-2',
      difficulty: 4,
      recommendedLevel: 5,
      unlockCondition: { type: 'PREVIOUS_STAGE', requiredStageIds: [] },
      rewards: [],
    },
    {
      id: 'stage-2-2',
      name: '森の奥地',
      chapterId: 'chapter-2',
      difficulty: 5,
      recommendedLevel: 6,
      unlockCondition: { type: 'PREVIOUS_STAGE', requiredStageIds: ['stage-2-1'] },
      rewards: [],
    },
  ];

  // テスト用のキャラクター
  const allCharacters = [
    'hero',
    'warrior',
    'mage',
    'healer',
    'archer',
    'thief',
    'knight',
    'priest',
  ];

  beforeEach(() => {
    // LocalStorageをクリア
    localStorage.clear();

    // マネージャーを初期化
    chapterManager = new ChapterManager();
    partyManager = new PartyManager();
    stageProgressManager = new StageProgressManager();
    saveLoadManager = new SaveLoadManager();

    // テストデータを設定
    chapterManager.setChapterDataForTesting(chapter1Data);
    chapterManager.setChapterDataForTesting(chapter2Data);
    stageProgressManager.registerStageMetadataList(stageMetadata);
  });

  afterEach(() => {
    // クリーンアップ
    localStorage.clear();
    if (chapterManager) {
      chapterManager.destroy?.();
    }
  });

  describe('E2Eテスト1: 新規ゲーム開始フロー', () => {
    test('新規ゲームを開始し、最初の章をプレイできる', () => {
      // 1. 新規ゲーム開始
      const startResult = chapterManager.startChapter('chapter-1', allCharacters);
      expect(startResult.success).toBe(true);

      const chapterState = chapterManager.getCurrentChapterState();
      expect(chapterState).not.toBeNull();
      expect(chapterState?.chapterId).toBe('chapter-1');
      expect(chapterState?.availableCharacterIds).toHaveLength(allCharacters.length);
      expect(chapterState?.lostCharacterIds).toHaveLength(0);

      // 2. パーティを編成
      partyManager.addCharacter('hero');
      partyManager.addCharacter('warrior');
      partyManager.addCharacter('mage');
      partyManager.addCharacter('healer');

      const party = partyManager.getParty();
      expect(party.members).toHaveLength(4);

      // 3. パーティを検証
      const validation = partyManager.validateParty(chapterManager.getLostCharacters());
      expect(validation.isValid).toBe(true);

      // 4. 最初のステージを解放
      stageProgressManager.unlockStage('stage-1-1');
      expect(stageProgressManager.isStageUnlocked('stage-1-1')).toBe(true);

      // 5. ステージをクリア
      stageProgressManager.completeStage('stage-1-1', []);
      expect(stageProgressManager.getStageProgress('stage-1-1')?.isCompleted).toBe(true);

      // 6. 次のステージが自動解放されることを確認
      expect(stageProgressManager.isStageUnlocked('stage-1-2')).toBe(true);
    });

    test('初期状態では全キャラクターが利用可能', () => {
      chapterManager.startChapter('chapter-1', allCharacters);

      const availableCharacters = chapterManager.getAvailableCharacters();
      const lostCharacters = chapterManager.getLostCharacters();

      expect(availableCharacters).toHaveLength(allCharacters.length);
      expect(lostCharacters).toHaveLength(0);
      expect(availableCharacters).toEqual(allCharacters);
    });

    test('章開始時にステージ進行状況が初期化される', () => {
      chapterManager.startChapter('chapter-1', allCharacters);

      const progress = stageProgressManager.getChapterProgress('chapter-1');

      expect(progress).toHaveLength(3); // chapter-1には3つのステージ
      expect(progress.every(p => !p.isCompleted)).toBe(true);
      expect(progress.every(p => !p.isUnlocked)).toBe(true);
    });
  });

  describe('E2Eテスト2: 進行状況の保存・復元', () => {
    test('ゲーム進行中にセーブし、正確に復元できる', () => {
      // 1. ゲームを開始して進行
      chapterManager.startChapter('chapter-1', allCharacters);
      partyManager.addCharacter('hero');
      partyManager.addCharacter('warrior');
      partyManager.addCharacter('mage');

      stageProgressManager.unlockStage('stage-1-1');
      stageProgressManager.completeStage('stage-1-1', []);
      stageProgressManager.unlockStage('stage-1-2');

      chapterManager.markCharacterAsLost('archer');

      // 2. 現在の状態を記録
      const originalState = chapterManager.getCurrentChapterState();
      const originalParty = partyManager.getParty();
      const originalProgress = stageProgressManager.getChapterProgress('chapter-1');

      expect(originalState).not.toBeNull();

      // 3. セーブ
      chapterManager.saveChapterState();

      const chapterStateData = {
        version: '1.0.0',
        timestamp: Date.now(),
        chapterId: originalState!.chapterId,
        currentStageIndex: originalState!.currentStageIndex,
        lostCharacterIds: originalState!.lostCharacterIds,
        availableCharacterIds: originalState!.availableCharacterIds,
        completedStageIds: originalState!.completedStageIds,
        isCompleted: originalState!.isCompleted,
        startTime: originalState!.startTime,
        playTime: originalState!.playTime,
      };

      saveLoadManager.saveGame(
        1,
        chapterStateData,
        stageProgressManager.saveProgress(),
        originalParty,
        5000
      );

      // 4. 新しいゲームセッションをシミュレート
      const newChapterManager = new ChapterManager();
      const newPartyManager = new PartyManager();
      const newStageProgressManager = new StageProgressManager();

      newChapterManager.setChapterDataForTesting(chapter1Data);
      newStageProgressManager.registerStageMetadataList(stageMetadata);

      // 5. ロード
      const loadedData = saveLoadManager.loadGame(1);
      expect(loadedData).not.toBeNull();

      newChapterManager.restoreChapterState('chapter-1');
      newPartyManager.setParty(loadedData!.partyComposition);
      newStageProgressManager.restoreProgress(loadedData!.stageProgress);

      // 6. 復元された状態を検証
      const restoredState = newChapterManager.getCurrentChapterState();
      const restoredParty = newPartyManager.getParty();
      const restoredProgress = newStageProgressManager.getChapterProgress('chapter-1');

      expect(restoredState?.chapterId).toBe(originalState?.chapterId);
      expect(restoredState?.lostCharacterIds).toEqual(originalState?.lostCharacterIds);
      expect(restoredState?.availableCharacterIds).toEqual(originalState?.availableCharacterIds);
      expect(restoredParty.members).toEqual(originalParty.members);
      expect(restoredProgress).toHaveLength(originalProgress.length);
    });

    test('オートセーブが自動的に実行される', () => {
      // 1. オートセーブを有効化
      saveLoadManager.setAutoSaveEnabled(true);

      // 2. ゲームを進行
      chapterManager.startChapter('chapter-1', allCharacters);
      partyManager.addCharacter('hero');

      stageProgressManager.unlockStage('stage-1-1');
      stageProgressManager.completeStage('stage-1-1', []);

      // 3. オートセーブを実行
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

      // 4. オートセーブスロットから復元できることを確認
      const autoSaveData = saveLoadManager.loadGame(0);
      expect(autoSaveData).not.toBeNull();
      expect(autoSaveData?.chapterState.chapterId).toBe('chapter-1');
    });

    test('複数のセーブスロットを使い分けられる', () => {
      // スロット1: 章1の序盤
      chapterManager.startChapter('chapter-1', allCharacters);
      const state1 = chapterManager.getCurrentChapterState();
      expect(state1).not.toBeNull();

      const stateData1 = {
        version: '1.0.0',
        timestamp: Date.now(),
        chapterId: state1!.chapterId,
        currentStageIndex: state1!.currentStageIndex,
        lostCharacterIds: state1!.lostCharacterIds,
        availableCharacterIds: state1!.availableCharacterIds,
        completedStageIds: state1!.completedStageIds,
        isCompleted: state1!.isCompleted,
        startTime: state1!.startTime,
        playTime: state1!.playTime,
      };

      const progress1 = stageProgressManager.saveProgress();

      saveLoadManager.saveGame(
        1,
        stateData1,
        progress1,
        partyManager.getParty(),
        1000
      );

      // スロット2: 章1の中盤（ステージ1をクリア）
      stageProgressManager.unlockStage('stage-1-1');
      stageProgressManager.completeStage('stage-1-1', []);
      chapterManager.recordStageCompletion('stage-1-1');

      const state2 = chapterManager.getCurrentChapterState();
      expect(state2).not.toBeNull();

      const stateData2 = {
        version: '1.0.0',
        timestamp: Date.now(),
        chapterId: state2!.chapterId,
        currentStageIndex: state2!.currentStageIndex,
        lostCharacterIds: state2!.lostCharacterIds,
        availableCharacterIds: state2!.availableCharacterIds,
        completedStageIds: state2!.completedStageIds,
        isCompleted: state2!.isCompleted,
        startTime: state2!.startTime,
        playTime: state2!.playTime,
      };

      const progress2 = stageProgressManager.saveProgress();

      saveLoadManager.saveGame(
        2,
        stateData2,
        progress2,
        partyManager.getParty(),
        2000
      );

      // 両方のスロットから正しくロードできることを確認
      const loaded1 = saveLoadManager.loadGame(1);
      const loaded2 = saveLoadManager.loadGame(2);

      expect(loaded1?.chapterState.completedStageIds).toHaveLength(0);
      expect(loaded2?.chapterState.completedStageIds).toHaveLength(1);
    });
  });

  describe('E2Eテスト3: 章完了とキャラクター復活', () => {
    test('章完了後、ロストキャラクターが次章で復活する', () => {
      // 1. 第1章を開始
      chapterManager.startChapter('chapter-1', allCharacters);

      // 2. キャラクターをロスト
      chapterManager.markCharacterAsLost('warrior');
      chapterManager.markCharacterAsLost('mage');

      let state = chapterManager.getCurrentChapterState();
      expect(state?.lostCharacterIds).toHaveLength(2);
      expect(state?.availableCharacterIds).toHaveLength(allCharacters.length - 2);

      // 3. 章を完了
      chapterManager.completeChapter();
      state = chapterManager.getCurrentChapterState();
      expect(state?.isCompleted).toBe(true);

      // 4. 次章の準備
      chapterManager.prepareNextChapter('chapter-2', allCharacters);

      // 5. 第2章を開始
      chapterManager.startChapter('chapter-2', allCharacters);
      state = chapterManager.getCurrentChapterState();

      // 6. キャラクターが復活していることを確認
      expect(state?.lostCharacterIds).toHaveLength(0);
      expect(state?.availableCharacterIds).toHaveLength(allCharacters.length);
      expect(state?.availableCharacterIds).toEqual(allCharacters);
    });

    test('章完了時に進行状況が正しく記録される', () => {
      // 1. 章を開始して全ステージをクリア
      chapterManager.startChapter('chapter-1', allCharacters);

      stageProgressManager.unlockStage('stage-1-1');
      stageProgressManager.completeStage('stage-1-1', []);
      chapterManager.recordStageCompletion('stage-1-1');

      stageProgressManager.unlockStage('stage-1-2');
      stageProgressManager.completeStage('stage-1-2', []);
      chapterManager.recordStageCompletion('stage-1-2');

      stageProgressManager.unlockStage('stage-1-3');
      stageProgressManager.completeStage('stage-1-3', []);
      chapterManager.recordStageCompletion('stage-1-3');

      // 2. 章が完了したことを確認
      const isCompleted = stageProgressManager.isChapterCompleted('chapter-1');
      expect(isCompleted).toBe(true);

      // 3. 章を完了状態にする
      const result = chapterManager.completeChapter();
      expect(result.success).toBe(true);

      const state = chapterManager.getCurrentChapterState();
      expect(state?.isCompleted).toBe(true);
      expect(state?.completedStageIds).toHaveLength(3);
    });

    test('複数の章を連続してプレイできる', () => {
      // 第1章
      chapterManager.startChapter('chapter-1', allCharacters);
      stageProgressManager.unlockStage('stage-1-1');
      stageProgressManager.completeStage('stage-1-1', []);
      chapterManager.completeChapter();

      const chapter1State = chapterManager.getCurrentChapterState();
      expect(chapter1State?.isCompleted).toBe(true);

      // 第2章への移行
      chapterManager.prepareNextChapter('chapter-2', allCharacters);
      chapterManager.startChapter('chapter-2', allCharacters);

      const chapter2State = chapterManager.getCurrentChapterState();
      expect(chapter2State?.chapterId).toBe('chapter-2');
      expect(chapter2State?.isCompleted).toBe(false);
      expect(chapter2State?.lostCharacterIds).toHaveLength(0);

      // 第2章のステージをプレイ
      stageProgressManager.unlockStage('stage-2-1');
      expect(stageProgressManager.isStageUnlocked('stage-2-1')).toBe(true);
    });
  });
});
