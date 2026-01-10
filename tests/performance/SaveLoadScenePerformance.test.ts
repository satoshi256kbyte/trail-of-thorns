/**
 * 統合セーブ・ロードUIシステムパフォーマンステスト
 *
 * このテストスイートは、SaveLoadSceneのパフォーマンスを検証します：
 * - フレームレート測定（60fps維持）
 * - メモリ使用量測定
 * - ロード時間測定
 *
 * **Validates: Requirements 4.1.17.5**
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Phaser from 'phaser';
import { SaveLoadScene } from '../../game/src/scenes/SaveLoadScene';
import { SaveLoadManager } from '../../game/src/systems/chapterStage/SaveLoadManager';
import type { ChapterStateData, StageProgressData, PartyComposition } from '../../game/src/types/chapterStage';

describe('統合セーブ・ロードUIシステムパフォーマンステスト', () => {
  let game: Phaser.Game;
  let saveLoadManager: SaveLoadManager;
  let scene: SaveLoadScene;

  // テスト用のモックデータ生成
  const createMockChapterState = (chapterId: string = 'chapter-1'): ChapterStateData => ({
    version: '1.0.0',
    timestamp: Date.now(),
    chapterId,
    currentStageIndex: 0,
    lostCharacterIds: [],
    availableCharacterIds: ['hero', 'warrior', 'mage', 'healer'],
    completedStageIds: [],
    isCompleted: false,
    startTime: Date.now(),
    playTime: 1000,
  });

  const createMockStageProgress = (): StageProgressData => ({
    stages: [
      {
        stageId: 'stage-1-1',
        isUnlocked: true,
        isCompleted: false,
        rewards: [],
      },
    ],
  });

  const createMockParty = (): PartyComposition => ({
    members: ['hero', 'warrior', 'mage'],
    formation: 'BALANCED',
  });

  beforeEach(() => {
    // LocalStorageをクリア
    localStorage.clear();

    // SaveLoadManagerを初期化
    saveLoadManager = new SaveLoadManager();

    // テストデータを準備
    for (let i = 1; i <= 9; i++) {
      saveLoadManager.saveGame(
        i,
        createMockChapterState(`chapter-${i}`),
        createMockStageProgress(),
        createMockParty(),
        i * 1000
      );
    }

    // Phaserゲームインスタンスを作成（ヘッドレスモード）
    game = new Phaser.Game({
      type: Phaser.HEADLESS,
      width: 1920,
      height: 1080,
      parent: 'game-container',
      scene: [SaveLoadScene],
      audio: {
        noAudio: true,
      },
    });

    // シーンを取得
    scene = game.scene.getScene('SaveLoadScene') as SaveLoadScene;
  });

  afterEach(() => {
    // クリーンアップ
    if (game) {
      game.destroy(true);
    }
    localStorage.clear();
  });

  describe('フレームレート測定', () => {
    test('シーン初期化時に60fpsを維持する', (done) => {
      // シーンが開始されるまで待機
      scene.events.once('create', () => {
        const frameRates: number[] = [];
        let frameCount = 0;
        const maxFrames = 60; // 1秒間測定（60fps想定）

        const measureFrame = () => {
          frameCount++;
          const fps = game.loop.actualFps;
          frameRates.push(fps);

          if (frameCount < maxFrames) {
            requestAnimationFrame(measureFrame);
          } else {
            // 平均フレームレートを計算
            const averageFps = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
            const minFps = Math.min(...frameRates);

            console.log(`平均FPS: ${averageFps.toFixed(2)}`);
            console.log(`最小FPS: ${minFps.toFixed(2)}`);

            // 60fpsの90%以上を維持（54fps以上）
            expect(averageFps).toBeGreaterThan(54);
            expect(minFps).toBeGreaterThan(50);

            done();
          }
        };

        requestAnimationFrame(measureFrame);
      });

      // シーンを開始
      scene.scene.start();
    }, 10000); // タイムアウトを10秒に設定

    test('スロット選択時のフレームレート低下が許容範囲内', (done) => {
      scene.events.once('create', () => {
        const frameRates: number[] = [];
        let frameCount = 0;
        const maxFrames = 30; // 0.5秒間測定

        // スロット選択をシミュレート
        const selectSlot = (slotId: number) => {
          // 実際のスロット選択処理をシミュレート
          scene.events.emit('slot-selected', slotId);
        };

        const measureFrame = () => {
          frameCount++;
          const fps = game.loop.actualFps;
          frameRates.push(fps);

          // 10フレーム目でスロット選択
          if (frameCount === 10) {
            selectSlot(1);
          }

          if (frameCount < maxFrames) {
            requestAnimationFrame(measureFrame);
          } else {
            const averageFps = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
            console.log(`スロット選択時の平均FPS: ${averageFps.toFixed(2)}`);

            // スロット選択時も50fps以上を維持
            expect(averageFps).toBeGreaterThan(50);

            done();
          }
        };

        requestAnimationFrame(measureFrame);
      });

      scene.scene.start();
    }, 10000);
  });

  describe('メモリ使用量測定', () => {
    test('シーン初期化時のメモリ使用量が許容範囲内', () => {
      // メモリ使用量を測定
      const initialMemory = process.memoryUsage().heapUsed;

      // シーンを開始
      scene.scene.start();

      // シーン初期化後のメモリ使用量
      const afterInitMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterInitMemory - initialMemory;

      console.log(`メモリ増加量: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

      // メモリ増加が50MB以下であることを確認
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('シーン破棄後にメモリリークがない', () => {
      // ガベージコレクションを実行
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage().heapUsed;

      // シーンを複数回作成・破棄
      for (let i = 0; i < 10; i++) {
        scene.scene.start();
        scene.scene.stop();
      }

      // ガベージコレクションを実行
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`10回の作成・破棄後のメモリ増加: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

      // メモリ増加が10MB以下であることを確認（メモリリークがない）
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('ロード時間測定', () => {
    test('シーン初期化が1秒以内に完了する', (done) => {
      const startTime = Date.now();

      scene.events.once('create', () => {
        const loadTime = Date.now() - startTime;
        console.log(`シーン初期化時間: ${loadTime}ms`);

        // 1秒以内に初期化完了
        expect(loadTime).toBeLessThan(1000);

        done();
      });

      scene.scene.start();
    }, 5000);

    test('セーブ操作が2秒以内に完了する', () => {
      const startTime = Date.now();

      // セーブ操作を実行
      const result = saveLoadManager.saveGame(
        5,
        createMockChapterState('chapter-5'),
        createMockStageProgress(),
        createMockParty(),
        5000
      );

      const saveTime = Date.now() - startTime;
      console.log(`セーブ時間: ${saveTime}ms`);

      expect(result).toBe(true);
      expect(saveTime).toBeLessThan(2000);
    });

    test('ロード操作が3秒以内に完了する', () => {
      const startTime = Date.now();

      // ロード操作を実行
      const loadedData = saveLoadManager.loadGame(1);

      const loadTime = Date.now() - startTime;
      console.log(`ロード時間: ${loadTime}ms`);

      expect(loadedData).not.toBeNull();
      expect(loadTime).toBeLessThan(3000);
    });

    test('全セーブスロット取得が500ms以内に完了する', () => {
      const startTime = Date.now();

      // 全セーブスロットを取得
      const saveSlots = saveLoadManager.getSaveSlots();

      const fetchTime = Date.now() - startTime;
      console.log(`全スロット取得時間: ${fetchTime}ms`);

      expect(saveSlots).toHaveLength(10);
      expect(fetchTime).toBeLessThan(500);
    });
  });

  describe('大量データ処理のパフォーマンス', () => {
    test('大量のセーブデータがある場合でもパフォーマンスを維持', () => {
      // 全スロットにデータを保存
      for (let i = 0; i < 10; i++) {
        saveLoadManager.saveGame(
          i,
          createMockChapterState(`chapter-${i}`),
          createMockStageProgress(),
          createMockParty(),
          i * 1000
        );
      }

      const startTime = Date.now();

      // 全スロットを取得
      const saveSlots = saveLoadManager.getSaveSlots();

      const fetchTime = Date.now() - startTime;
      console.log(`全スロット（10個）取得時間: ${fetchTime}ms`);

      expect(saveSlots).toHaveLength(10);
      expect(saveSlots.filter(slot => slot.saveData !== null)).toHaveLength(10);
      expect(fetchTime).toBeLessThan(1000);
    });

    test('連続したセーブ・ロード操作でもパフォーマンスを維持', () => {
      const operations = 20;
      const startTime = Date.now();

      for (let i = 0; i < operations; i++) {
        const slotId = (i % 9) + 1; // スロット1-9を循環

        // セーブ
        saveLoadManager.saveGame(
          slotId,
          createMockChapterState(`chapter-${i}`),
          createMockStageProgress(),
          createMockParty(),
          i * 1000
        );

        // ロード
        saveLoadManager.loadGame(slotId);
      }

      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / operations;

      console.log(`${operations}回のセーブ・ロード合計時間: ${totalTime}ms`);
      console.log(`1回あたりの平均時間: ${averageTime.toFixed(2)}ms`);

      // 1回あたり100ms以内
      expect(averageTime).toBeLessThan(100);
    });
  });
});
