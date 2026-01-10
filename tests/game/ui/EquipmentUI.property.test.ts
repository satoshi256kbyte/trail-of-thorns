/**
 * EquipmentUI プロパティベーステスト
 * 
 * Feature: inventory-equipment-system
 * 
 * このテストファイルは、EquipmentUIの正確性プロパティを検証します。
 * 各テストは最低100回の反復で実行されます。
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { fc } from '@fast-check/vitest';
import * as Phaser from 'phaser';
import { EquipmentUI } from '../../../game/src/ui/EquipmentUI';
import { EquipmentManager } from '../../../game/src/systems/EquipmentManager';
import { InventoryManager } from '../../../game/src/systems/InventoryManager';
import { ItemEffectSystem, Character } from '../../../game/src/systems/ItemEffectSystem';
import { ItemDataLoader } from '../../../game/src/systems/ItemDataLoader';
import {
  Equipment,
  EquipmentSlotType,
  ItemType,
  ItemRarity,
  EquipmentStats,
  EquipmentRequirements,
} from '../../../game/src/types/inventory';

// Phaserシーンのモック
class MockScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MockScene' });
  }

  create() {
    // モックシーンの初期化
  }
}

// テスト用のArbitraries（ランダムデータ生成器）

/**
 * 装備能力値のArbitrary
 */
const equipmentStatsArbitrary = fc.record({
  hp: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
  mp: fc.option(fc.integer({ min: 0, max: 50 }), { nil: undefined }),
  attack: fc.option(fc.integer({ min: 0, max: 50 }), { nil: undefined }),
  defense: fc.option(fc.integer({ min: 0, max: 50 }), { nil: undefined }),
  speed: fc.option(fc.integer({ min: 0, max: 20 }), { nil: undefined }),
  accuracy: fc.option(fc.integer({ min: 0, max: 20 }), { nil: undefined }),
  evasion: fc.option(fc.integer({ min: 0, max: 20 }), { nil: undefined }),
});

/**
 * 装備条件のArbitrary（レベル条件あり）
 */
const equipmentRequirementsWithLevelArbitrary = fc.record({
  level: fc.integer({ min: 5, max: 50 }), // 必ずレベル条件を持つ
  job: fc.option(fc.constantFrom('warrior', 'mage', 'archer'), { nil: undefined }),
  stats: fc.option(equipmentStatsArbitrary, { nil: undefined }),
});

/**
 * 装備のArbitrary（レベル条件あり）
 */
const equipmentWithRequirementsArbitrary = (slot: EquipmentSlotType) =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 20 }),
    description: fc.string({ minLength: 0, maxLength: 100 }),
    type: fc.constant(
      slot === EquipmentSlotType.WEAPON
        ? ItemType.WEAPON
        : slot === EquipmentSlotType.ARMOR
        ? ItemType.ARMOR
        : ItemType.ACCESSORY
    ),
    rarity: fc.constantFrom(
      ItemRarity.COMMON,
      ItemRarity.UNCOMMON,
      ItemRarity.RARE,
      ItemRarity.EPIC,
      ItemRarity.LEGENDARY
    ),
    iconPath: fc.constant('assets/items/icon.png'),
    maxStack: fc.constant(1),
    sellPrice: fc.integer({ min: 0, max: 10000 }),
    buyPrice: fc.integer({ min: 0, max: 20000 }),
    slot: fc.constant(slot),
    stats: equipmentStatsArbitrary,
    requirements: equipmentRequirementsWithLevelArbitrary,
    durability: fc.integer({ min: 1, max: 100 }),
    maxDurability: fc.constant(100),
    effects: fc.constant([]),
  }) as fc.Arbitrary<Equipment>;

/**
 * キャラクターのArbitrary
 */
const characterArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 20 }),
  level: fc.integer({ min: 1, max: 99 }),
  currentHP: fc.integer({ min: 1, max: 1000 }),
  maxHP: fc.integer({ min: 1, max: 1000 }),
  currentMP: fc.integer({ min: 0, max: 500 }),
  maxMP: fc.integer({ min: 0, max: 500 }),
  stats: fc.record({
    attack: fc.integer({ min: 1, max: 100 }),
    defense: fc.integer({ min: 1, max: 100 }),
    speed: fc.integer({ min: 1, max: 100 }),
    accuracy: fc.integer({ min: 1, max: 100 }),
    evasion: fc.integer({ min: 1, max: 100 }),
  }),
  statusEffects: fc.constant([]),
}) as fc.Arbitrary<Character>;

describe('EquipmentUI Property-Based Tests', () => {
  let scene: MockScene;
  let game: Phaser.Game;
  let equipmentUI: EquipmentUI;
  let equipmentManager: EquipmentManager;
  let inventoryManager: InventoryManager;
  let itemEffectSystem: ItemEffectSystem;
  let itemDataLoader: ItemDataLoader;

  beforeEach(() => {
    // Phaserゲームインスタンスを作成
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.HEADLESS,
      width: 800,
      height: 600,
      scene: MockScene,
      callbacks: {
        postBoot: (game) => {
          game.loop.stop();
        },
      },
    };

    game = new Phaser.Game(config);
    scene = game.scene.scenes[0] as MockScene;

    // システムを初期化
    itemEffectSystem = new ItemEffectSystem();
    itemDataLoader = new ItemDataLoader();
    inventoryManager = new InventoryManager(itemDataLoader);
    equipmentManager = new EquipmentManager(itemEffectSystem, inventoryManager);

    // EquipmentUIを初期化
    equipmentUI = new EquipmentUI(scene, equipmentManager, inventoryManager);
  });

  afterEach(() => {
    // ゲームインスタンスを破棄
    if (game) {
      game.destroy(true);
    }
  });

  /**
   * プロパティ16: 装備条件の視覚的識別
   * 検証要件: 4.5
   * 
   * 任意の装備条件を満たさないアイテムは、UI上で正しく識別され、
   * 装備可能なアイテムと区別される
   */
  test('Property 16: Visual identification of equipment requirements', () => {
    fc.assert(
      fc.property(
        characterArbitrary,
        fc.array(equipmentWithRequirementsArbitrary(EquipmentSlotType.WEAPON), {
          minLength: 2,
          maxLength: 5,
        }),
        (character, equipments) => {
          // 装備条件を満たすものと満たさないものを分ける
          const canEquipItems: Equipment[] = [];
          const cannotEquipItems: Equipment[] = [];

          equipments.forEach(equipment => {
            // インベントリに追加
            inventoryManager.addItem(equipment, 1);

            // 装備条件をチェック
            const checkResult = equipmentManager.checkEquipmentRequirements(
              character.id,
              equipment,
              character
            );

            if (checkResult.canEquip) {
              canEquipItems.push(equipment);
            } else {
              cannotEquipItems.push(equipment);
            }
          });

          // 少なくとも1つは装備不可能なアイテムがあることを前提とする
          fc.pre(cannotEquipItems.length > 0);

          // UIを表示
          equipmentUI.show(character.id, character);

          // 武器スロットを選択してアイテムリストを表示
          equipmentUI.selectSlot(EquipmentSlotType.WEAPON);

          // アイテムリスト表示データを取得（privateフィールドへのアクセス）
          const itemListDisplays = (equipmentUI as any).itemListDisplays;

          // 各アイテムの視覚的識別を検証
          itemListDisplays.forEach((display: any) => {
            const equipment = display.item;
            const canEquip = display.canEquip;

            // 装備条件チェック結果と一致することを確認
            const checkResult = equipmentManager.checkEquipmentRequirements(
              character.id,
              equipment,
              character
            );

            expect(canEquip).toBe(checkResult.canEquip);

            // 視覚的な区別を検証
            if (!canEquip) {
              // 装備不可能なアイテムはグレーアウトされている
              const nameText = display.nameText;
              const nameColor = nameText.style.color;

              // グレーアウトされた色（#666666）であることを確認
              expect(nameColor).toMatch(/#666666|rgb\(102,\s*102,\s*102\)/i);

              // イタリック体であることを確認
              expect(nameText.style.fontStyle).toBe('italic');

              // インタラクティブでないことを確認
              const background = display.background;
              expect(background.input).toBeUndefined();
            } else {
              // 装備可能なアイテムは通常の色
              const nameText = display.nameText;
              const nameColor = nameText.style.color;

              // 通常の色（#ffffff）であることを確認
              expect(nameColor).toMatch(/#ffffff|rgb\(255,\s*255,\s*255\)/i);

              // 通常のフォントスタイルであることを確認
              expect(nameText.style.fontStyle).toBe('normal');

              // インタラクティブであることを確認
              const background = display.background;
              expect(background.input).toBeDefined();
            }
          });

          // UIを非表示
          equipmentUI.hide();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 補助プロパティ: 装備条件不足の理由表示
   * 
   * 装備条件を満たさないアイテムには、条件不足の理由が表示される
   */
  test('Auxiliary Property: Display of equipment requirement failure reasons', () => {
    fc.assert(
      fc.property(
        characterArbitrary,
        equipmentWithRequirementsArbitrary(EquipmentSlotType.WEAPON),
        (character, equipment) => {
          // キャラクターのレベルを装備条件より低く設定
          if (equipment.requirements.level) {
            character.level = Math.max(1, equipment.requirements.level - 1);
          }

          // インベントリに追加
          inventoryManager.addItem(equipment, 1);

          // UIを表示
          equipmentUI.show(character.id, character);

          // 武器スロットを選択してアイテムリストを表示
          equipmentUI.selectSlot(EquipmentSlotType.WEAPON);

          // アイテムリスト表示データを取得
          const itemListDisplays = (equipmentUI as any).itemListDisplays;

          // 装備不可能なアイテムを見つける
          const cannotEquipDisplay = itemListDisplays.find(
            (display: any) => display.item.id === equipment.id && !display.canEquip
          );

          if (cannotEquipDisplay) {
            // 条件不足の理由が表示されていることを確認
            const container = cannotEquipDisplay.container;
            const children = container.list;

            // 理由テキストが含まれていることを確認
            const hasReasonText = children.some((child: any) => {
              return (
                child instanceof Phaser.GameObjects.Text &&
                child.text.includes('条件不足')
              );
            });

            expect(hasReasonText).toBe(true);
          }

          // UIを非表示
          equipmentUI.hide();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 補助プロパティ: 装備可能アイテムのインタラクティブ性
   * 
   * 装備可能なアイテムのみがクリック可能である
   */
  test('Auxiliary Property: Interactivity of equippable items', () => {
    fc.assert(
      fc.property(
        characterArbitrary,
        fc.array(equipmentWithRequirementsArbitrary(EquipmentSlotType.WEAPON), {
          minLength: 2,
          maxLength: 5,
        }),
        (character, equipments) => {
          // 装備をインベントリに追加
          equipments.forEach(equipment => {
            inventoryManager.addItem(equipment, 1);
          });

          // UIを表示
          equipmentUI.show(character.id, character);

          // 武器スロットを選択してアイテムリストを表示
          equipmentUI.selectSlot(EquipmentSlotType.WEAPON);

          // アイテムリスト表示データを取得
          const itemListDisplays = (equipmentUI as any).itemListDisplays;

          // 各アイテムのインタラクティブ性を検証
          itemListDisplays.forEach((display: any) => {
            const canEquip = display.canEquip;
            const background = display.background;

            if (canEquip) {
              // 装備可能なアイテムはインタラクティブ
              expect(background.input).toBeDefined();
              expect(background.input.cursor).toBe('pointer');
            } else {
              // 装備不可能なアイテムはインタラクティブでない
              expect(background.input).toBeUndefined();
            }
          });

          // UIを非表示
          equipmentUI.hide();
        }
      ),
      { numRuns: 100 }
    );
  });
});
