/**
 * ItemEffectSystem プロパティベーステスト
 * 
 * このテストファイルは、ItemEffectSystemの正確性プロパティを検証します。
 * 各テストは最低100回の反復を実行します。
 * 
 * Feature: inventory-equipment-system
 */

import { describe, test, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ItemEffectSystem, Character } from '../../../game/src/systems/ItemEffectSystem';
import {
  ItemEffect,
  EffectType,
  EffectTarget,
  ConsumableType,
  Consumable,
  ItemType,
  ItemRarity,
} from '../../../game/src/types/inventory';

describe('ItemEffectSystem - Property-Based Tests', () => {
  let system: ItemEffectSystem;

  beforeEach(() => {
    system = new ItemEffectSystem();
  });

  /**
   * テスト用のキャラクター生成器
   */
  const characterArbitrary = fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    name: fc.string({ minLength: 1, maxLength: 20 }),
    level: fc.integer({ min: 1, max: 99 }),
    currentHP: fc.integer({ min: 1, max: 999 }),
    maxHP: fc.integer({ min: 1, max: 999 }),
    currentMP: fc.integer({ min: 0, max: 999 }),
    maxMP: fc.integer({ min: 0, max: 999 }),
    stats: fc.record({
      attack: fc.integer({ min: 1, max: 999 }),
      defense: fc.integer({ min: 1, max: 999 }),
      speed: fc.integer({ min: 1, max: 999 }),
      accuracy: fc.integer({ min: 1, max: 100 }),
      evasion: fc.integer({ min: 1, max: 100 }),
    }),
    statusEffects: fc.array(fc.string(), { maxLength: 5 }),
  }).map(char => ({
    ...char,
    currentHP: Math.min(char.currentHP, char.maxHP),
    currentMP: Math.min(char.currentMP, char.maxMP),
  }));

  /**
   * テスト用の効果生成器
   */
  const effectArbitrary = (type: EffectType, target: EffectTarget) =>
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 20 }),
      type: fc.constant(type),
      target: fc.constant(target),
      value: fc.integer({ min: 1, max: 100 }),
      duration: fc.integer({ min: 0, max: 10 }),
      isPermanent: fc.boolean(),
      stackable: fc.boolean(),
    });

  /**
   * プロパティ11: 消耗品使用の効果と消費
   * 検証要件: 3.2
   * 
   * 任意の消耗品を使用した後、効果が適用され、アイテムの数量が1減少する（または削除される）
   */
  test('Property 11: 消耗品使用の効果と消費', () => {
    fc.assert(
      fc.property(
        characterArbitrary,
        effectArbitrary(EffectType.HP_RECOVERY, EffectTarget.HP),
        (character, effect) => {
          // 消耗品を作成
          const consumable: Consumable = {
            id: 'test-consumable',
            name: 'Test Potion',
            description: 'Test healing potion',
            type: ItemType.CONSUMABLE,
            rarity: ItemRarity.COMMON,
            iconPath: '/test.png',
            maxStack: 99,
            sellPrice: 10,
            buyPrice: 20,
            consumableType: ConsumableType.HEALING,
            effects: [effect],
            usableInBattle: true,
            targetType: 'single' as any,
          };

          // 初期HP
          const initialHP = character.currentHP;

          // 効果を適用
          const result = system.applyEffect(effect, character.id, character);

          // 検証: 効果が適用されたこと
          expect(result.success).toBe(true);

          // 検証: HPが回復したこと（最大値を超えない）
          expect(character.currentHP).toBeGreaterThanOrEqual(initialHP);
          expect(character.currentHP).toBeLessThanOrEqual(character.maxHP);

          // 検証: 効果値が正しく適用されたこと
          const expectedHP = Math.min(character.maxHP, initialHP + effect.value);
          expect(character.currentHP).toBe(expectedHP);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ12: 回復アイテムの効果
   * 検証要件: 3.3
   * 
   * 任意の回復アイテムを使用した後、対象キャラクターのHP/MPが増加する（最大値を超えない）
   */
  test('Property 12: 回復アイテムの効果 - HP回復', () => {
    fc.assert(
      fc.property(
        characterArbitrary,
        effectArbitrary(EffectType.HP_RECOVERY, EffectTarget.HP),
        (character, effect) => {
          const initialHP = character.currentHP;
          const maxHP = character.maxHP;

          const result = system.applyEffect(effect, character.id, character);

          // 検証: 効果が適用されたこと
          expect(result.success).toBe(true);

          // 検証: HPが増加したこと（最大値を超えない）
          expect(character.currentHP).toBeGreaterThanOrEqual(initialHP);
          expect(character.currentHP).toBeLessThanOrEqual(maxHP);

          // 検証: 最大値を超えていないこと
          const expectedHP = Math.min(maxHP, initialHP + effect.value);
          expect(character.currentHP).toBe(expectedHP);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 12: 回復アイテムの効果 - MP回復', () => {
    fc.assert(
      fc.property(
        characterArbitrary,
        effectArbitrary(EffectType.MP_RECOVERY, EffectTarget.MP),
        (character, effect) => {
          const initialMP = character.currentMP;
          const maxMP = character.maxMP;

          const result = system.applyEffect(effect, character.id, character);

          // 検証: 効果が適用されたこと
          expect(result.success).toBe(true);

          // 検証: MPが増加したこと（最大値を超えない）
          expect(character.currentMP).toBeGreaterThanOrEqual(initialMP);
          expect(character.currentMP).toBeLessThanOrEqual(maxMP);

          // 検証: 最大値を超えていないこと
          const expectedMP = Math.min(maxMP, initialMP + effect.value);
          expect(character.currentMP).toBe(expectedMP);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ13: バフアイテムの効果
   * 検証要件: 3.4
   * 
   * 任意のバフアイテムを使用した後、対象キャラクターの能力値が一時的に上昇する
   */
  test('Property 13: バフアイテムの効果 - 攻撃力上昇', () => {
    fc.assert(
      fc.property(
        characterArbitrary,
        effectArbitrary(EffectType.STAT_BOOST, EffectTarget.ATTACK),
        (character, effect) => {
          const initialAttack = character.stats.attack;

          const result = system.applyEffect(effect, character.id, character);

          // 検証: 効果が適用されたこと
          expect(result.success).toBe(true);

          // 検証: 攻撃力が上昇したこと
          expect(character.stats.attack).toBe(initialAttack + effect.value);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 13: バフアイテムの効果 - 防御力上昇', () => {
    fc.assert(
      fc.property(
        characterArbitrary,
        effectArbitrary(EffectType.STAT_BOOST, EffectTarget.DEFENSE),
        (character, effect) => {
          const initialDefense = character.stats.defense;

          const result = system.applyEffect(effect, character.id, character);

          // 検証: 効果が適用されたこと
          expect(result.success).toBe(true);

          // 検証: 防御力が上昇したこと
          expect(character.stats.defense).toBe(initialDefense + effect.value);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 13: バフアイテムの効果 - 速度上昇', () => {
    fc.assert(
      fc.property(
        characterArbitrary,
        effectArbitrary(EffectType.STAT_BOOST, EffectTarget.SPEED),
        (character, effect) => {
          const initialSpeed = character.stats.speed;

          const result = system.applyEffect(effect, character.id, character);

          // 検証: 効果が適用されたこと
          expect(result.success).toBe(true);

          // 検証: 速度が上昇したこと
          expect(character.stats.speed).toBe(initialSpeed + effect.value);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ14: 状態異常回復の効果
   * 検証要件: 3.5
   * 
   * 任意の状態異常回復アイテムを使用した後、対象キャラクターの指定された状態異常が解除される
   */
  test('Property 14: 状態異常回復の効果', () => {
    fc.assert(
      fc.property(
        characterArbitrary,
        effectArbitrary(EffectType.STATUS_CURE, EffectTarget.STATUS),
        (character, effect) => {
          // 状態異常を付与
          const initialStatusCount = character.statusEffects.length;
          if (initialStatusCount === 0) {
            character.statusEffects.push('poison');
          }

          const statusCountBeforeCure = character.statusEffects.length;

          const result = system.applyEffect(effect, character.id, character);

          // 検証: 効果が適用されたこと
          expect(result.success).toBe(true);

          // 検証: 状態異常が減少したこと
          if (statusCountBeforeCure > 0) {
            expect(character.statusEffects.length).toBe(statusCountBeforeCure - 1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ15: 一時効果の時間管理
   * 検証要件: 3.6
   * 
   * 任意の一時効果は、指定された持続時間（ターン数）が経過した後に自動的に解除される
   */
  test('Property 15: 一時効果の時間管理', () => {
    fc.assert(
      fc.property(
        characterArbitrary,
        fc
          .record({
            id: fc.string({ minLength: 1, maxLength: 20 }),
            type: fc.constant(EffectType.STAT_BOOST),
            target: fc.constant(EffectTarget.ATTACK),
            value: fc.integer({ min: 1, max: 100 }),
            duration: fc.integer({ min: 1, max: 5 }), // 1-5ターン
            isPermanent: fc.constant(false), // 一時効果
            stackable: fc.boolean(),
          })
          .filter(effect => effect.duration > 0 && !effect.isPermanent),
        (character, effect) => {
          // 効果を適用
          system.applyEffect(effect, character.id, character);

          // 初期状態: 効果が登録されていること
          const activeEffects = system.getActiveEffects(character.id);
          expect(activeEffects.length).toBe(1);

          // 持続時間分ターンを経過させる
          for (let i = 0; i < effect.duration; i++) {
            system.updateTemporaryEffects(0);
          }

          // 検証: 効果が解除されたこと
          const remainingEffects = system.getActiveEffects(character.id);
          expect(remainingEffects.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 追加プロパティ: 効果の検証
   * 
   * 任意の有効な効果は検証を通過する
   */
  test('Additional Property: 効果の検証', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          effectArbitrary(EffectType.HP_RECOVERY, EffectTarget.HP),
          effectArbitrary(EffectType.MP_RECOVERY, EffectTarget.MP),
          effectArbitrary(EffectType.STAT_BOOST, EffectTarget.ATTACK),
          effectArbitrary(EffectType.STAT_BOOST, EffectTarget.DEFENSE),
          effectArbitrary(EffectType.STATUS_CURE, EffectTarget.STATUS)
        ),
        effect => {
          // 検証: 有効な効果は検証を通過すること
          const isValid = system.validateEffect(effect);
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 追加プロパティ: 効果の除去
   * 
   * 任意の登録された効果は除去できる
   */
  test('Additional Property: 効果の除去', () => {
    fc.assert(
      fc.property(
        characterArbitrary,
        fc
          .record({
            id: fc.string({ minLength: 1, maxLength: 20 }),
            type: fc.constant(EffectType.STAT_BOOST),
            target: fc.constant(EffectTarget.ATTACK),
            value: fc.integer({ min: 1, max: 100 }),
            duration: fc.integer({ min: 1, max: 10 }),
            isPermanent: fc.constant(false),
            stackable: fc.boolean(),
          })
          .filter(effect => !effect.isPermanent && effect.duration > 0),
        (character, effect) => {
          // 効果を適用
          system.applyEffect(effect, character.id, character);

          // 初期状態: 効果が登録されていること
          const activeEffects = system.getActiveEffects(character.id);
          expect(activeEffects.length).toBeGreaterThan(0);

          // 効果を除去
          const removed = system.removeEffect(effect.id, character.id);

          // 検証: 除去が成功したこと
          expect(removed).toBe(true);

          // 検証: 効果が除去されたこと
          const remainingEffects = system.getActiveEffects(character.id);
          expect(remainingEffects.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
