/**
 * 章・ステージ管理システムパフォーマンステスト
 *
 * このテストスイートは、章・ステージ管理システムのパフォーマンスを検証します：
 * - データ読み込み速度
 * - UI応答速度
 * - メモリ使用量
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { ChapterManager } from '../../game/src/systems/chapter/ChapterManager';
import { PartyManager } from '../../game/src/systems/chapter/PartyManager';
import { StageProgressManager } from '../../game/src/systems/chapterStage/StageProgressManager';
import { SaveLoadManager } from '../../game/src/systems/chapterStage/SaveLoadManager';
import type { ChapterData, StageMetadata } from '../../game/src/types/chapterStage';

describe('章・ステージ管理システムパフォーマンステスト', () => {
  let chapterManager: ChapterManager;
  let partyManager: PartyManager;
  let stageProgressManager: StageProgressManager;
  let saveLoadManager: SaveLoadManager;

  // 大規模テストデータ
  const createLargeChapterData = (chapterCount: number): ChapterData[] => {
    const chapters: ChapterData[] = [];
    for (let i = 1; i <= chapterCount; i++) {
      chapters.push({
        id: `chapter-${i}`,
        name: `第${i}章`,
        storyDescription: `章${i}の説明`,
        stageIds: Array.from({ length: 10 }, (_, j) => `stage-${i}-${j + 1}`),
        recommendedLevel: i,
      });
    }
    return chapters;
  };

  const createLargeStageMetadata = (chapterCount: number): StageMetadata[] => {
    const stages: StageMetadata[] = [];
    for (let i = 1; i <= chapterCount; i++) {
      for (let j = 1; j <= 10; j++) {
        stages.push({
          id: `stage-${i}-${j}`,
          name: `ステージ${i}-${j}`,
          chapterId: `chapter-${i}`,
          difficulty: j,
          recommendedLevel: i,
          unlockCondition: {
            type: 'PREVIOUS_STAGE',
            requiredStageIds: j > 1 ? [`stage-${i}-${j - 1}`] : [],
          },
          rewards: [],
        });
      }
    }
    return stages;
  };

  const createLargeCharacterList = (count: number): string[] => {
    return Array.from({ length: count }, (_, i) => `character-${i + 1}`);
  };

  beforeEach(() => {
    localStorage.clear();
    chapterManager = new ChapterManager();
    partyManager = new PartyManager();
    stageProgressManager = new StageProgressManager();
    saveLoadManager = new SaveLoadManager();
  });

  afterEach(() => {
    localStorage.clear();
    if (chapterManager) {
      chapterManager.destroy?.();
    }
  });

  describe('パフォーマンステスト1: データ読み込み速度', () => {
    test('大量の章データを1秒以内に読み込める', () => {
      const chapters = createLargeChapterData(50); // 50章
      const stages = createLargeStageMetadata(50); // 500ステージ

      const startTime = performance.now();

      // 章データを設定
      chapters.forEach(chapter => {
        chapterManager.setChapterDataForTesting(chapter);
      });

      // ステージメタデータを登録
      stageProgressManager.registerStageMetadataList(stages);

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      console.log(`データ読み込み時間: ${loadTime.toFixed(2)}ms`);
      expect(loadTime).toBeLessThan(1000); // 1秒以内
    });

    test('セーブデータを1秒以内に読み込める', () => {
      // テストデータを準備
      const chapters = createLargeChapterData(10);
      const stages = createLargeStageMetadata(10);
      const characters = createLargeCharacterList(50);

      chapters.forEach(chapter => chapterManager.setChapterDataForTesting(chapter));
      stageProgressManager.registerStageMetadataList(stages);

      // ゲームを進行してセーブ
      chapterManager.startChapter('chapter-1', characters);
      for (let i = 0; i < 20; i++) {
        partyManager.addCharacter(`character-${i + 1}`);
      }

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

      saveLoadManager.saveGame(
        1,
        chapterStateData,
        stageProgressManager.saveProgress(),
        partyManager.getParty(),
        10000
      );

      // ロード速度を測定
      const startTime = performance.now();
      const loadedData = saveLoadManager.loadGame(1);
      const endTime = performance.now();
      const loadTime = endTime - startTime;

      console.log(`セーブデータ読み込み時間: ${loadTime.toFixed(2)}ms`);
      expect(loadedData).not.toBeNull();
      expect(loadTime).toBeLessThan(1000); // 1秒以内
    });

    test('章状態の復元を1秒以内に完了できる', () => {
      const chapters = createLargeChapterData(10);
      const stages = createLargeStageMetadata(10);
      const characters = createLargeCharacterList(50);

      chapters.forEach(chapter => chapterManager.setChapterDataForTesting(chapter));
      stageProgressManager.registerStageMetadataList(stages);

      // セーブデータを作成
      chapterManager.startChapter('chapter-1', characters);
      chapterManager.saveChapterState();

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

      saveLoadManager.saveGame(
        1,
        chapterStateData,
        stageProgressManager.saveProgress(),
        partyManager.getParty(),
        5000
      );

      // 新しいマネージャーで復元
      const newChapterManager = new ChapterManager();
      const newStageProgressManager = new StageProgressManager();

      chapters.forEach(chapter => newChapterManager.setChapterDataForTesting(chapter));
      newStageProgressManager.registerStageMetadataList(stages);

      const loadedData = saveLoadManager.loadGame(1);
      expect(loadedData).not.toBeNull();

      // 復元速度を測定
      const startTime = performance.now();
      newChapterManager.restoreChapterState('chapter-1');
      newStageProgressManager.restoreProgress(loadedData!.stageProgress);
      const endTime = performance.now();
      const restoreTime = endTime - startTime;

      console.log(`章状態復元時間: ${restoreTime.toFixed(2)}ms`);
      expect(restoreTime).toBeLessThan(1000); // 1秒以内
    });
  });

  describe('パフォーマンステスト2: UI応答速度', () => {
    test('パーティ編成操作が即座に応答する（100ms以内）', () => {
      const characters = createLargeCharacterList(100);
      chapterManager.setChapterDataForTesting({
        id: 'test-chapter',
        name: 'テスト章',
        storyDescription: 'テスト',
        stageIds: ['stage-1'],
        recommendedLevel: 1,
      });

      chapterManager.startChapter('test-chapter', characters);

      // パーティ編成操作の速度を測定
      const startTime = performance.now();

      for (let i = 0; i < 6; i++) {
        partyManager.addCharacter(`character-${i + 1}`);
      }

      const endTime = performance.now();
      const operationTime = endTime - startTime;

      console.log(`パーティ編成時間: ${operationTime.toFixed(2)}ms`);
      expect(operationTime).toBeLessThan(100); // 100ms以内
    });

    test('パーティ検証が即座に完了する（50ms以内）', () => {
      const characters = createLargeCharacterList(100);
      chapterManager.setChapterDataForTesting({
        id: 'test-chapter',
        name: 'テスト章',
        storyDescription: 'テスト',
        stageIds: ['stage-1'],
        recommendedLevel: 1,
      });

      chapterManager.startChapter('test-chapter', characters);

      // パーティを編成
      for (let i = 0; i < 6; i++) {
        partyManager.addCharacter(`character-${i + 1}`);
      }

      // 検証速度を測定
      const startTime = performance.now();
      const validation = partyManager.validateParty(chapterManager.getLostCharacters());
      const endTime = performance.now();
      const validationTime = endTime - startTime;

      console.log(`パーティ検証時間: ${validationTime.toFixed(2)}ms`);
      expect(validation.isValid).toBe(true);
      expect(validationTime).toBeLessThan(50); // 50ms以内
    });

    test('ステージ進行状況の取得が即座に完了する（100ms以内）', () => {
      const chapters = createLargeChapterData(10);
      const stages = createLargeStageMetadata(10);

      chapters.forEach(chapter => chapterManager.setChapterDataForTesting(chapter));
      stageProgressManager.registerStageMetadataList(stages);

      // 進行状況取得速度を測定
      const startTime = performance.now();

      for (let i = 1; i <= 10; i++) {
        const progress = stageProgressManager.getChapterProgress(`chapter-${i}`);
        expect(progress).toHaveLength(10);
      }

      const endTime = performance.now();
      const queryTime = endTime - startTime;

      console.log(`進行状況取得時間: ${queryTime.toFixed(2)}ms`);
      expect(queryTime).toBeLessThan(100); // 100ms以内
    });
  });

  describe('パフォーマンステスト3: メモリ使用量', () => {
    test('大量の章データを保持してもメモリリークが発生しない', () => {
      const chapters = createLargeChapterData(100);
      const stages = createLargeStageMetadata(100);

      // 初期メモリ使用量を記録
      if (global.gc) {
        global.gc();
      }
      const initialMemory = process.memoryUsage().heapUsed;

      // データを読み込み
      chapters.forEach(chapter => chapterManager.setChapterDataForTesting(chapter));
      stageProgressManager.registerStageMetadataList(stages);

      // メモリ使用量を確認
      const afterLoadMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterLoadMemory - initialMemory;

      console.log(`メモリ増加量: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // メモリ増加が50MB以下であることを確認
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('セーブ・ロード操作でメモリリークが発生しない', () => {
      const chapters = createLargeChapterData(10);
      const stages = createLargeStageMetadata(10);
      const characters = createLargeCharacterList(50);

      chapters.forEach(chapter => chapterManager.setChapterDataForTesting(chapter));
      stageProgressManager.registerStageMetadataList(stages);

      // 初期メモリ使用量を記録
      if (global.gc) {
        global.gc();
      }
      const initialMemory = process.memoryUsage().heapUsed;

      // 複数回セーブ・ロードを実行（スロット1-9を使用）
      for (let i = 0; i < 9; i++) {
        chapterManager.startChapter('chapter-1', characters);

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

        saveLoadManager.saveGame(
          i + 1,
          chapterStateData,
          stageProgressManager.saveProgress(),
          partyManager.getParty(),
          1000
        );

        const loaded = saveLoadManager.loadGame(i + 1);
        expect(loaded).not.toBeNull();

        chapterManager.completeChapter();
        chapterManager.prepareNextChapter('chapter-2', characters);
      }

      // ガベージコレクション実行
      if (global.gc) {
        global.gc();
      }

      // メモリ使用量を確認
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`セーブ・ロード後のメモリ増加量: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // メモリ増加が30MB以下であることを確認
      expect(memoryIncrease).toBeLessThan(30 * 1024 * 1024);
    });

    test('パーティ編成操作でメモリリークが発生しない', () => {
      const characters = createLargeCharacterList(100);
      chapterManager.setChapterDataForTesting({
        id: 'test-chapter',
        name: 'テスト章',
        storyDescription: 'テスト',
        stageIds: ['stage-1'],
        recommendedLevel: 1,
      });

      chapterManager.startChapter('test-chapter', characters);

      // 初期メモリ使用量を記録
      if (global.gc) {
        global.gc();
      }
      const initialMemory = process.memoryUsage().heapUsed;

      // 複数回パーティ編成を実行
      for (let i = 0; i < 100; i++) {
        partyManager.clearParty();
        for (let j = 0; j < 6; j++) {
          partyManager.addCharacter(`character-${(i * 6 + j) % 100 + 1}`);
        }
        partyManager.validateParty(chapterManager.getLostCharacters());
      }

      // ガベージコレクション実行
      if (global.gc) {
        global.gc();
      }

      // メモリ使用量を確認
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`パーティ編成後のメモリ増加量: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // メモリ増加が10MB以下であることを確認
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('パフォーマンステスト4: セーブ・ロード速度', () => {
    test('セーブ操作が2秒以内に完了する', () => {
      const chapters = createLargeChapterData(10);
      const stages = createLargeStageMetadata(10);
      const characters = createLargeCharacterList(50);

      chapters.forEach(chapter => chapterManager.setChapterDataForTesting(chapter));
      stageProgressManager.registerStageMetadataList(stages);

      chapterManager.startChapter('chapter-1', characters);

      // パーティを編成
      for (let i = 0; i < 6; i++) {
        partyManager.addCharacter(`character-${i + 1}`);
      }

      // セーブ速度を測定
      const startTime = performance.now();

      chapterManager.saveChapterState();

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

      saveLoadManager.saveGame(
        1,
        chapterStateData,
        stageProgressManager.saveProgress(),
        partyManager.getParty(),
        10000
      );

      const endTime = performance.now();
      const saveTime = endTime - startTime;

      console.log(`セーブ時間: ${saveTime.toFixed(2)}ms`);
      expect(saveTime).toBeLessThan(2000); // 2秒以内
    });

    test('複数のセーブスロットへの保存が効率的に実行される', () => {
      const chapters = createLargeChapterData(5);
      const stages = createLargeStageMetadata(5);
      const characters = createLargeCharacterList(20);

      chapters.forEach(chapter => chapterManager.setChapterDataForTesting(chapter));
      stageProgressManager.registerStageMetadataList(stages);

      chapterManager.startChapter('chapter-1', characters);

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

      // 複数スロットへのセーブ速度を測定（スロット1-9）
      const startTime = performance.now();

      for (let i = 1; i <= 9; i++) {
        saveLoadManager.saveGame(
          i,
          chapterStateData,
          stageProgressManager.saveProgress(),
          partyManager.getParty(),
          1000 * i
        );
      }

      const endTime = performance.now();
      const totalSaveTime = endTime - startTime;

      console.log(`9スロットへのセーブ時間: ${totalSaveTime.toFixed(2)}ms`);
      expect(totalSaveTime).toBeLessThan(5000); // 5秒以内
    });
  });
});
