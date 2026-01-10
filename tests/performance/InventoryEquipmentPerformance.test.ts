/**
 * インベントリ・装備システムパフォーマンステスト
 *
 * このテストスイートは、インベントリ・装備システムのパフォーマンスを検証します：
 * - インベントリ画面表示速度（要件11.1: 500ms以内）
 * - アイテム使用・装備操作速度（要件11.2: 100ms以内）
 * - フレームレート測定（要件11.3: 100個のアイテムで60fps維持）
 * - 装備変更時の能力値再計算速度（要件11.4: 50ms以内）
 * - メモリ使用量測定（要件11.5: 50MB以下）
 *
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Phaser from 'phaser';
import { VirtualizedInventoryUI } from '../../game/src/ui/VirtualizedInventoryUI';
import { OptimizedEquipmentManager } from '../../game/src/systems/OptimizedEquipmentManager';
import { InventoryMemoryManager, MemoryUtils } from '../../game/src/systems/inventory/InventoryMemoryManager';
import { InventoryManager } from '../../game/src/systems/InventoryManager';
import { ItemEffectSystem, Character } from '../../game/src/systems/ItemEffectSystem';
import { InventoryErrorHandler } from '../../game/src/systems/inventory/InventoryErrorHandler';
import type { Item, Equipment, Consumable } from '../../game/src/types/inventory';

describe('インベントリ・装備システムパフォーマンステスト', () => {
  let game: Phaser.Game;
  let scene: Phaser.Scene;
  let inventoryManager: InventoryManager;
  let itemEffectSystem: ItemEffectSystem;
  let equipmentManager: OptimizedEquipmentManager;
  let memoryManager: InventoryMemoryManager;

  // テスト用のモックデータ生成
  const createMockItem = (id: string, type: 'weapon' | 'armor' | 'accessory' | 'consumable' = 'consumable'): Item => ({
    id,
    name: `Test Item ${id}`,
    description: 'Test item description',
    type,
    rarity: 'common',
    iconPath: 'assets/items/default.png',
    maxStack: type === 'consumable' ? 99 : 1,
    sellPrice: 100,
    buyPrice: 200,
  });

  const createMockEquipment = (id: string, type: 'weapon' | 'armor' | 'accessory'): Equipment => ({
    ...createMockItem(id, type),
    type,
    equipmentType: type,
    stats: {
      maxHP: 10,
      maxMP: 5,
      attack: 5,
      defense: 5,
      speed: 2,
      luck: 1,
    },
    requirements: {
      level: 1,
      jobs: [],
    },
    durability: {
      current: 100,
      max: 100,
    },
  });

  const createMockConsumable = (id: string): Consumable => ({
    ...createMockItem(id, 'consumable'),
    type: 'consumable',
    effect: {
      type: 'heal',
      value: 50,
      target: 'single',
    },
  });

  const createMockCharacter = (id: string): Character => ({
    id,
    name: `Character ${id}`,
    level: 10,
    job: 'warrior',
    stats: {
      maxHP: 100,
      maxMP: 50,
      attack: 20,
      defense: 15,
      speed: 10,
      luck: 5,
    },
    currentHP: 100,
    currentMP: 50,
    statusEffects: [],
  });

  beforeEach(() => {
    // LocalStorageをクリア
    localStorage.clear();

    // Phaserゲームインスタンスを作成（ヘッドレスモード）
    game = new Phaser.Game({
      type: Phaser.HEADLESS,
      width: 1920,
      height: 1080,
      parent: 'game-container',
      scene: {
        create: function () {
          // 空のシーン
        },
      },
      audio: {
        noAudio: true,
      },
    });

    // シーンを取得
    scene = game.scene.scenes[0];

    // システムを初期化
    const errorHandler = new InventoryErrorHandler();
    inventoryManager = new InventoryManager(100, errorHandler);
    itemEffectSystem = new ItemEffectSystem();
    equipmentManager = new OptimizedEquipmentManager(itemEffectSystem, inventoryManager, errorHandler);
    memoryManager = InventoryMemoryManager.getInstance();
  });

  afterEach(() => {
    // クリーンアップ
    if (game) {
      game.destroy(true);
    }
    inventoryManager.clear();
    equipmentManager.clear();
    memoryManager.stopMonitoring();
    memoryManager.clearHistory();
    localStorage.clear();
  });

  describe('要件11.1: インベントリ画面表示速度（500ms以内）', () => {
    test('空のインベントリ表示が500ms以内に完了する', () => {
      const startTime = performance.now();

      const virtualizedUI = new VirtualizedInventoryUI(scene, inventoryManager);
      virtualizedUI.updateItemDisplay();

      const displayTime = performance.now() - startTime;
      console.log(`空のインベントリ表示時間: ${displayTime.toFixed(2)}ms`);

      expect(displayTime).toBeLessThan(500);

      virtualizedUI.destroy();
    });

    test('10個のアイテムを持つインベントリ表示が500ms以内に完了する', () => {
      // 10個のアイテムを追加
      for (let i = 0; i < 10; i++) {
        inventoryManager.addItem(createMockConsumable(`item-${i}`), 1);
      }

      const startTime = performance.now();

      const virtualizedUI = new VirtualizedInventoryUI(scene, inventoryManager);
      virtualizedUI.updateItemDisplay();

      const displayTime = performance.now() - startTime;
      console.log(`10個のアイテム表示時間: ${displayTime.toFixed(2)}ms`);

      expect(displayTime).toBeLessThan(500);

      virtualizedUI.destroy();
    });

    test('50個のアイテムを持つインベントリ表示が500ms以内に完了する', () => {
      // 50個のアイテムを追加
      for (let i = 0; i < 50; i++) {
        inventoryManager.addItem(createMockConsumable(`item-${i}`), 1);
      }

      const startTime = performance.now();

      const virtualizedUI = new VirtualizedInventoryUI(scene, inventoryManager);
      virtualizedUI.updateItemDisplay();

      const displayTime = performance.now() - startTime;
      console.log(`50個のアイテム表示時間: ${displayTime.toFixed(2)}ms`);

      expect(displayTime).toBeLessThan(500);

      virtualizedUI.destroy();
    });

    test('100個のアイテムを持つインベントリ表示が500ms以内に完了する', () => {
      // 100個のアイテムを追加（満杯）
      for (let i = 0; i < 100; i++) {
        inventoryManager.addItem(createMockConsumable(`item-${i}`), 1);
      }

      const startTime = performance.now();

      const virtualizedUI = new VirtualizedInventoryUI(scene, inventoryManager);
      virtualizedUI.updateItemDisplay();

      const displayTime = performance.now() - startTime;
      console.log(`100個のアイテム表示時間: ${displayTime.toFixed(2)}ms`);

      expect(displayTime).toBeLessThan(500);

      virtualizedUI.destroy();
    });

    test('仮想スクロールによる再描画が500ms以内に完了する', () => {
      // 100個のアイテムを追加
      for (let i = 0; i < 100; i++) {
        inventoryManager.addItem(createMockConsumable(`item-${i}`), 1);
      }

      const virtualizedUI = new VirtualizedInventoryUI(scene, inventoryManager);
      virtualizedUI.updateItemDisplay();

      // スクロール操作をシミュレート
      const startTime = performance.now();
      virtualizedUI.scroll(5); // 5行スクロール

      const scrollTime = performance.now() - startTime;
      console.log(`スクロール時間: ${scrollTime.toFixed(2)}ms`);

      expect(scrollTime).toBeLessThan(500);

      virtualizedUI.destroy();
    });
  });

  describe('要件11.2: アイテム使用・装備操作速度（100ms以内）', () => {
    test('アイテム追加操作が100ms以内に完了する', () => {
      const item = createMockConsumable('test-item');

      const startTime = performance.now();
      const result = inventoryManager.addItem(item, 1);
      const operationTime = performance.now() - startTime;

      console.log(`アイテム追加時間: ${operationTime.toFixed(2)}ms`);

      expect(result).toBe(true);
      expect(operationTime).toBeLessThan(100);
    });

    test('アイテム削除操作が100ms以内に完了する', () => {
      const item = createMockConsumable('test-item');
      inventoryManager.addItem(item, 1);

      const startTime = performance.now();
      const result = inventoryManager.removeItem('test-item', 1);
      const operationTime = performance.now() - startTime;

      console.log(`アイテム削除時間: ${operationTime.toFixed(2)}ms`);

      expect(result).toBe(true);
      expect(operationTime).toBeLessThan(100);
    });

    test('アイテムソート操作が100ms以内に完了する', () => {
      // 50個のアイテムを追加
      for (let i = 0; i < 50; i++) {
        inventoryManager.addItem(createMockConsumable(`item-${i}`), 1);
      }

      const startTime = performance.now();
      inventoryManager.sortItems('type');
      const operationTime = performance.now() - startTime;

      console.log(`アイテムソート時間: ${operationTime.toFixed(2)}ms`);

      expect(operationTime).toBeLessThan(100);
    });

    test('装備装着操作が100ms以内に完了する', () => {
      const character = createMockCharacter('hero');
      const equipment = createMockEquipment('sword-1', 'weapon');
      inventoryManager.addItem(equipment, 1);

      const startTime = performance.now();
      const result = equipmentManager.equipItem(character.id, 'weapon', equipment);
      const operationTime = performance.now() - startTime;

      console.log(`装備装着時間: ${operationTime.toFixed(2)}ms`);

      expect(result).toBe(true);
      expect(operationTime).toBeLessThan(100);
    });

    test('装備解除操作が100ms以内に完了する', () => {
      const character = createMockCharacter('hero');
      const equipment = createMockEquipment('sword-1', 'weapon');
      inventoryManager.addItem(equipment, 1);
      equipmentManager.equipItem(character.id, 'weapon', equipment);

      const startTime = performance.now();
      const result = equipmentManager.unequipItem(character.id, 'weapon');
      const operationTime = performance.now() - startTime;

      console.log(`装備解除時間: ${operationTime.toFixed(2)}ms`);

      expect(result).not.toBeNull();
      expect(operationTime).toBeLessThan(100);
    });

    test('連続した装備操作が100ms以内に完了する', () => {
      const character = createMockCharacter('hero');
      const equipment1 = createMockEquipment('sword-1', 'weapon');
      const equipment2 = createMockEquipment('sword-2', 'weapon');
      inventoryManager.addItem(equipment1, 1);
      inventoryManager.addItem(equipment2, 1);

      const startTime = performance.now();

      // 装備1を装着
      equipmentManager.equipItem(character.id, 'weapon', equipment1);

      // 装備2に変更
      equipmentManager.equipItem(character.id, 'weapon', equipment2);

      const operationTime = performance.now() - startTime;
      console.log(`連続装備操作時間: ${operationTime.toFixed(2)}ms`);

      expect(operationTime).toBeLessThan(100);
    });
  });

  describe('要件11.3: フレームレート（100個のアイテムで60fps維持）', () => {
    test('100個のアイテムを持つインベントリで60fps以上を維持', (done) => {
      // 100個のアイテムを追加
      for (let i = 0; i < 100; i++) {
        inventoryManager.addItem(createMockConsumable(`item-${i}`), 1);
      }

      const virtualizedUI = new VirtualizedInventoryUI(scene, inventoryManager);
      virtualizedUI.updateItemDisplay();

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

          console.log(`平均FPS（100個のアイテム）: ${averageFps.toFixed(2)}`);
          console.log(`最小FPS（100個のアイテム）: ${minFps.toFixed(2)}`);

          // 60fps以上を維持
          expect(averageFps).toBeGreaterThanOrEqual(60);
          expect(minFps).toBeGreaterThan(55);

          virtualizedUI.destroy();
          done();
        }
      };

      requestAnimationFrame(measureFrame);
    }, 10000);

    test('スクロール操作時に60fps以上を維持', (done) => {
      // 100個のアイテムを追加
      for (let i = 0; i < 100; i++) {
        inventoryManager.addItem(createMockConsumable(`item-${i}`), 1);
      }

      const virtualizedUI = new VirtualizedInventoryUI(scene, inventoryManager);
      virtualizedUI.updateItemDisplay();

      const frameRates: number[] = [];
      let frameCount = 0;
      const maxFrames = 60;

      const measureFrame = () => {
        frameCount++;
        const fps = game.loop.actualFps;
        frameRates.push(fps);

        // 10フレームごとにスクロール
        if (frameCount % 10 === 0) {
          virtualizedUI.scroll(1);
        }

        if (frameCount < maxFrames) {
          requestAnimationFrame(measureFrame);
        } else {
          const averageFps = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
          const minFps = Math.min(...frameRates);

          console.log(`スクロール時の平均FPS: ${averageFps.toFixed(2)}`);
          console.log(`スクロール時の最小FPS: ${minFps.toFixed(2)}`);

          // スクロール時も60fps以上を維持
          expect(averageFps).toBeGreaterThanOrEqual(60);
          expect(minFps).toBeGreaterThan(55);

          virtualizedUI.destroy();
          done();
        }
      };

      requestAnimationFrame(measureFrame);
    }, 10000);
  });

  describe('要件11.4: 装備変更時の能力値再計算速度（50ms以内）', () => {
    test('装備なしの能力値計算が50ms以内に完了する', () => {
      const character = createMockCharacter('hero');

      const startTime = performance.now();
      const stats = equipmentManager.getTotalStats(character.id);
      const calculationTime = performance.now() - startTime;

      console.log(`装備なし能力値計算時間: ${calculationTime.toFixed(2)}ms`);

      expect(stats).toBeDefined();
      expect(calculationTime).toBeLessThan(50);
    });

    test('1つの装備の能力値計算が50ms以内に完了する', () => {
      const character = createMockCharacter('hero');
      const equipment = createMockEquipment('sword-1', 'weapon');
      inventoryManager.addItem(equipment, 1);
      equipmentManager.equipItem(character.id, 'weapon', equipment);

      const startTime = performance.now();
      const stats = equipmentManager.getTotalStats(character.id);
      const calculationTime = performance.now() - startTime;

      console.log(`1つの装備の能力値計算時間: ${calculationTime.toFixed(2)}ms`);

      expect(stats).toBeDefined();
      expect(calculationTime).toBeLessThan(50);
    });

    test('全スロット装備済みの能力値計算が50ms以内に完了する', () => {
      const character = createMockCharacter('hero');

      // 全スロットに装備
      const weapon = createMockEquipment('sword-1', 'weapon');
      const armor = createMockEquipment('armor-1', 'armor');
      const accessory1 = createMockEquipment('ring-1', 'accessory');
      const accessory2 = createMockEquipment('ring-2', 'accessory');

      inventoryManager.addItem(weapon, 1);
      inventoryManager.addItem(armor, 1);
      inventoryManager.addItem(accessory1, 1);
      inventoryManager.addItem(accessory2, 1);

      equipmentManager.equipItem(character.id, 'weapon', weapon);
      equipmentManager.equipItem(character.id, 'armor', armor);
      equipmentManager.equipItem(character.id, 'accessory1', accessory1);
      equipmentManager.equipItem(character.id, 'accessory2', accessory2);

      const startTime = performance.now();
      const stats = equipmentManager.getTotalStats(character.id);
      const calculationTime = performance.now() - startTime;

      console.log(`全スロット装備の能力値計算時間: ${calculationTime.toFixed(2)}ms`);

      expect(stats).toBeDefined();
      expect(calculationTime).toBeLessThan(50);
    });

    test('キャッシュヒット時の能力値計算が50ms以内に完了する', () => {
      const character = createMockCharacter('hero');
      const equipment = createMockEquipment('sword-1', 'weapon');
      inventoryManager.addItem(equipment, 1);
      equipmentManager.equipItem(character.id, 'weapon', equipment);

      // 初回計算（キャッシュミス）
      equipmentManager.getTotalStats(character.id);

      // 2回目の計算（キャッシュヒット）
      const startTime = performance.now();
      const stats = equipmentManager.getTotalStats(character.id);
      const calculationTime = performance.now() - startTime;

      console.log(`キャッシュヒット時の計算時間: ${calculationTime.toFixed(2)}ms`);

      expect(stats).toBeDefined();
      expect(calculationTime).toBeLessThan(50);

      // キャッシュヒット率を確認
      const cacheStats = equipmentManager.getCacheStats();
      console.log(`キャッシュヒット率: ${cacheStats.hitRate.toFixed(2)}%`);
      expect(cacheStats.cacheHits).toBeGreaterThan(0);
    });

    test('複数キャラクターの能力値計算が50ms以内に完了する', () => {
      // 3人のキャラクターを作成
      const characters = [
        createMockCharacter('hero'),
        createMockCharacter('warrior'),
        createMockCharacter('mage'),
      ];

      // 各キャラクターに装備
      characters.forEach((character, index) => {
        const equipment = createMockEquipment(`sword-${index}`, 'weapon');
        inventoryManager.addItem(equipment, 1);
        equipmentManager.equipItem(character.id, 'weapon', equipment);
      });

      const startTime = performance.now();

      // 全キャラクターの能力値を計算
      characters.forEach(character => {
        equipmentManager.getTotalStats(character.id);
      });

      const calculationTime = performance.now() - startTime;
      const averageTime = calculationTime / characters.length;

      console.log(`3人の能力値計算合計時間: ${calculationTime.toFixed(2)}ms`);
      console.log(`1人あたりの平均時間: ${averageTime.toFixed(2)}ms`);

      expect(averageTime).toBeLessThan(50);
    });
  });

  describe('要件11.5: メモリ使用量（50MB以下）', () => {
    test('空のインベントリのメモリ使用量が50MB以下', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // 空のインベントリを作成
      const manager = new InventoryManager(100);

      const afterMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterMemory - initialMemory;

      console.log(`空のインベントリメモリ使用量: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('100個のアイテムを持つインベントリのメモリ使用量が50MB以下', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // 100個のアイテムを追加
      for (let i = 0; i < 100; i++) {
        inventoryManager.addItem(createMockConsumable(`item-${i}`), 1);
      }

      const afterMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterMemory - initialMemory;

      console.log(`100個のアイテムメモリ使用量: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('装備システムのメモリ使用量が50MB以下', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // 10人のキャラクターに装備
      for (let i = 0; i < 10; i++) {
        const character = createMockCharacter(`hero-${i}`);
        const equipment = createMockEquipment(`sword-${i}`, 'weapon');
        inventoryManager.addItem(equipment, 1);
        equipmentManager.equipItem(character.id, 'weapon', equipment);
      }

      const afterMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterMemory - initialMemory;

      console.log(`装備システムメモリ使用量: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('仮想スクロールUIのメモリ使用量が50MB以下', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // 100個のアイテムを追加
      for (let i = 0; i < 100; i++) {
        inventoryManager.addItem(createMockConsumable(`item-${i}`), 1);
      }

      const virtualizedUI = new VirtualizedInventoryUI(scene, inventoryManager);
      virtualizedUI.updateItemDisplay();

      const afterMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterMemory - initialMemory;

      console.log(`仮想スクロールUIメモリ使用量: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      virtualizedUI.destroy();
    });

    test('メモリリークがない（複数回の作成・破棄）', () => {
      // ガベージコレクションを実行
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage().heapUsed;

      // 10回の作成・破棄サイクル
      for (let i = 0; i < 10; i++) {
        const manager = new InventoryManager(100);

        // アイテムを追加
        for (let j = 0; j < 50; j++) {
          manager.addItem(createMockConsumable(`item-${j}`), 1);
        }

        // クリア
        manager.clear();
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

    test('MemoryUtilsによるオブジェクトサイズ推定', () => {
      const item = createMockConsumable('test-item');
      const estimatedSize = MemoryUtils.estimateObjectSize(item);

      console.log(`アイテムオブジェクトの推定サイズ: ${MemoryUtils.formatBytes(estimatedSize)}`);

      // アイテムオブジェクトのサイズが1KB以下であることを確認
      expect(estimatedSize).toBeLessThan(1024);
    });
  });

  describe('統合パフォーマンステスト', () => {
    test('全システムを統合した場合のパフォーマンス', () => {
      const startTime = performance.now();

      // 100個のアイテムを追加
      for (let i = 0; i < 100; i++) {
        inventoryManager.addItem(createMockConsumable(`item-${i}`), 1);
      }

      // 5人のキャラクターに装備
      for (let i = 0; i < 5; i++) {
        const character = createMockCharacter(`hero-${i}`);
        const equipment = createMockEquipment(`sword-${i}`, 'weapon');
        inventoryManager.addItem(equipment, 1);
        equipmentManager.equipItem(character.id, 'weapon', equipment);
        equipmentManager.getTotalStats(character.id);
      }

      // UIを表示
      const virtualizedUI = new VirtualizedInventoryUI(scene, inventoryManager);
      virtualizedUI.updateItemDisplay();

      const totalTime = performance.now() - startTime;
      console.log(`統合パフォーマンステスト合計時間: ${totalTime.toFixed(2)}ms`);

      // 全体で1秒以内に完了
      expect(totalTime).toBeLessThan(1000);

      virtualizedUI.destroy();
    });

    test('連続操作のパフォーマンス', () => {
      const operations = 50;
      const startTime = performance.now();

      for (let i = 0; i < operations; i++) {
        // アイテム追加
        inventoryManager.addItem(createMockConsumable(`item-${i}`), 1);

        // アイテム削除
        if (i > 0) {
          inventoryManager.removeItem(`item-${i - 1}`, 1);
        }

        // ソート
        if (i % 10 === 0) {
          inventoryManager.sortItems('type');
        }
      }

      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / operations;

      console.log(`${operations}回の操作合計時間: ${totalTime.toFixed(2)}ms`);
      console.log(`1回あたりの平均時間: ${averageTime.toFixed(2)}ms`);

      // 1回あたり50ms以内
      expect(averageTime).toBeLessThan(50);
    });
  });
});
