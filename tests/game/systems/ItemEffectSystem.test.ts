/**
 * ItemEffectSystem ユニットテスト
 * 
 * このテストファイルは、ItemEffectSystemの具体的な動作を検証します。
 * エッジケース、エラー条件、特定の例をテストします。
 * 
 * 要件: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { ItemEffectSystem, Character } from '../../../game/src/systems/ItemEffectSystem';
import {
  ItemEffect,
  EffectType,
  EffectTarget,
} from '../../../game/src/types/inventory';

describe('ItemEffectSystem - Unit Tests', () => {
  let system: ItemEffectSystem;
  let testCharacter: Character;

  beforeEach(() => {
    system = new ItemEffectSystem();
    testCharacter = {
      id: 'test-char-1',
      name: 'Test Character',
      level: 10,
      currentHP: 50,
      maxHP: 100,
      currentMP: 30,
      maxMP: 50,
      stats: {
        attack: 20,
        defense: 15,
        speed: 10,
        accuracy: 80,
        evasion: 20,
      },
      statusEffects: [],
    };
  });

  describe('効果適用の正確性', () => {
    test('HP回復効果が正しく適用される', () => {
      const effect: ItemEffect = {
        id: 'hp-potion',
        type: EffectType.HP_RECOVERY,
        target: EffectTarget.HP,
        value: 30,
        duration: 0,
        isPermanent: true,
        stackable: false,
      };

      const result = system.applyEffect(effect, testCharacter.id, testCharacter);

      expect(result.success).toBe(true);
      expect(testCharacter.currentHP).toBe(80); // 50 + 30
      expect(result.valueApplied).toBe(30);
    });

    test('MP回復効果が正しく適用される', () => {
      const effect: ItemEffect = {
        id: 'mp-potion',
        type: EffectType.MP_RECOVERY,
        target: EffectTarget.MP,
        value: 15,
        duration: 0,
        isPermanent: true,
        stackable: false,
      };

      const result = system.applyEffect(effect, testCharacter.id, testCharacter);

      expect(result.success).toBe(true);
      expect(testCharacter.currentMP).toBe(45); // 30 + 15
      expect(result.valueApplied).toBe(15);
    });

    test('攻撃力上昇効果が正しく適用される', () => {
      const effect: ItemEffect = {
        id: 'attack-buff',
        type: EffectType.STAT_BOOST,
        target: EffectTarget.ATTACK,
        value: 10,
        duration: 3,
        isPermanent: false,
        stackable: false,
      };

      const initialAttack = testCharacter.stats.attack;
      const result = system.applyEffect(effect, testCharacter.id, testCharacter);

      expect(result.success).toBe(true);
      expect(testCharacter.stats.attack).toBe(initialAttack + 10);
    });

    test('防御力上昇効果が正しく適用される', () => {
      const effect: ItemEffect = {
        id: 'defense-buff',
        type: EffectType.STAT_BOOST,
        target: EffectTarget.DEFENSE,
        value: 5,
        duration: 3,
        isPermanent: false,
        stackable: false,
      };

      const initialDefense = testCharacter.stats.defense;
      const result = system.applyEffect(effect, testCharacter.id, testCharacter);

      expect(result.success).toBe(true);
      expect(testCharacter.stats.defense).toBe(initialDefense + 5);
    });

    test('状態異常回復効果が正しく適用される', () => {
      // 状態異常を付与
      testCharacter.statusEffects = ['poison', 'paralysis'];

      const effect: ItemEffect = {
        id: 'cure-potion',
        type: EffectType.STATUS_CURE,
        target: EffectTarget.STATUS,
        value: 0,
        duration: 0,
        isPermanent: true,
        stackable: false,
      };

      const result = system.applyEffect(effect, testCharacter.id, testCharacter);

      expect(result.success).toBe(true);
      expect(testCharacter.statusEffects.length).toBe(1); // 1つ減少
    });
  });

  describe('エッジケース - 最大値超過', () => {
    test('HP回復が最大値を超えない', () => {
      testCharacter.currentHP = 95;

      const effect: ItemEffect = {
        id: 'hp-potion',
        type: EffectType.HP_RECOVERY,
        target: EffectTarget.HP,
        value: 50, // 95 + 50 = 145 > 100
        duration: 0,
        isPermanent: true,
        stackable: false,
      };

      system.applyEffect(effect, testCharacter.id, testCharacter);

      expect(testCharacter.currentHP).toBe(testCharacter.maxHP); // 100
    });

    test('MP回復が最大値を超えない', () => {
      testCharacter.currentMP = 45;

      const effect: ItemEffect = {
        id: 'mp-potion',
        type: EffectType.MP_RECOVERY,
        target: EffectTarget.MP,
        value: 20, // 45 + 20 = 65 > 50
        duration: 0,
        isPermanent: true,
        stackable: false,
      };

      system.applyEffect(effect, testCharacter.id, testCharacter);

      expect(testCharacter.currentMP).toBe(testCharacter.maxMP); // 50
    });

    test('HP回復で既に最大値の場合は変化しない', () => {
      testCharacter.currentHP = testCharacter.maxHP;

      const effect: ItemEffect = {
        id: 'hp-potion',
        type: EffectType.HP_RECOVERY,
        target: EffectTarget.HP,
        value: 30,
        duration: 0,
        isPermanent: true,
        stackable: false,
      };

      system.applyEffect(effect, testCharacter.id, testCharacter);

      expect(testCharacter.currentHP).toBe(testCharacter.maxHP);
    });
  });

  describe('エッジケース - ゼロ値', () => {
    test('効果値が0の場合は変化しない', () => {
      const initialHP = testCharacter.currentHP;

      const effect: ItemEffect = {
        id: 'zero-effect',
        type: EffectType.HP_RECOVERY,
        target: EffectTarget.HP,
        value: 0,
        duration: 0,
        isPermanent: true,
        stackable: false,
      };

      system.applyEffect(effect, testCharacter.id, testCharacter);

      expect(testCharacter.currentHP).toBe(initialHP);
    });

    test('状態異常がない場合の回復は失敗しない', () => {
      testCharacter.statusEffects = [];

      const effect: ItemEffect = {
        id: 'cure-potion',
        type: EffectType.STATUS_CURE,
        target: EffectTarget.STATUS,
        value: 0,
        duration: 0,
        isPermanent: true,
        stackable: false,
      };

      const result = system.applyEffect(effect, testCharacter.id, testCharacter);

      expect(result.success).toBe(true);
      expect(testCharacter.statusEffects.length).toBe(0);
    });
  });

  describe('一時効果の管理', () => {
    test('一時効果が正しく登録される', () => {
      const effect: ItemEffect = {
        id: 'temp-buff',
        type: EffectType.STAT_BOOST,
        target: EffectTarget.ATTACK,
        value: 10,
        duration: 3,
        isPermanent: false,
        stackable: false,
      };

      system.applyEffect(effect, testCharacter.id, testCharacter);

      const activeEffects = system.getActiveEffects(testCharacter.id);
      expect(activeEffects.length).toBe(1);
      expect(activeEffects[0].id).toBe('temp-buff');
    });

    test('永続効果は登録されない', () => {
      const effect: ItemEffect = {
        id: 'perm-buff',
        type: EffectType.STAT_BOOST,
        target: EffectTarget.ATTACK,
        value: 10,
        duration: 0,
        isPermanent: true,
        stackable: false,
      };

      system.applyEffect(effect, testCharacter.id, testCharacter);

      const activeEffects = system.getActiveEffects(testCharacter.id);
      expect(activeEffects.length).toBe(0);
    });

    test('持続時間が経過すると効果が解除される', () => {
      const effect: ItemEffect = {
        id: 'temp-buff',
        type: EffectType.STAT_BOOST,
        target: EffectTarget.ATTACK,
        value: 10,
        duration: 2,
        isPermanent: false,
        stackable: false,
      };

      system.applyEffect(effect, testCharacter.id, testCharacter);

      // 1ターン経過
      system.updateTemporaryEffects(0);
      expect(system.getActiveEffects(testCharacter.id).length).toBe(1);

      // 2ターン経過
      system.updateTemporaryEffects(0);
      expect(system.getActiveEffects(testCharacter.id).length).toBe(0);
    });

    test('複数の一時効果を管理できる', () => {
      const effect1: ItemEffect = {
        id: 'buff-1',
        type: EffectType.STAT_BOOST,
        target: EffectTarget.ATTACK,
        value: 10,
        duration: 3,
        isPermanent: false,
        stackable: true,
      };

      const effect2: ItemEffect = {
        id: 'buff-2',
        type: EffectType.STAT_BOOST,
        target: EffectTarget.DEFENSE,
        value: 5,
        duration: 2,
        isPermanent: false,
        stackable: true,
      };

      system.applyEffect(effect1, testCharacter.id, testCharacter);
      system.applyEffect(effect2, testCharacter.id, testCharacter);

      expect(system.getActiveEffects(testCharacter.id).length).toBe(2);
    });

    test('スタック不可の効果は上書きされる', () => {
      const effect1: ItemEffect = {
        id: 'buff',
        type: EffectType.STAT_BOOST,
        target: EffectTarget.ATTACK,
        value: 10,
        duration: 3,
        isPermanent: false,
        stackable: false,
      };

      const effect2: ItemEffect = {
        id: 'buff',
        type: EffectType.STAT_BOOST,
        target: EffectTarget.ATTACK,
        value: 20,
        duration: 5,
        isPermanent: false,
        stackable: false,
      };

      system.applyEffect(effect1, testCharacter.id, testCharacter);
      system.applyEffect(effect2, testCharacter.id, testCharacter);

      const activeEffects = system.getActiveEffects(testCharacter.id);
      expect(activeEffects.length).toBe(1);
      expect(activeEffects[0].value).toBe(20);
    });
  });

  describe('効果の除去', () => {
    test('登録された効果を除去できる', () => {
      const effect: ItemEffect = {
        id: 'temp-buff',
        type: EffectType.STAT_BOOST,
        target: EffectTarget.ATTACK,
        value: 10,
        duration: 3,
        isPermanent: false,
        stackable: false,
      };

      system.applyEffect(effect, testCharacter.id, testCharacter);
      expect(system.getActiveEffects(testCharacter.id).length).toBe(1);

      const removed = system.removeEffect('temp-buff', testCharacter.id);
      expect(removed).toBe(true);
      expect(system.getActiveEffects(testCharacter.id).length).toBe(0);
    });

    test('存在しない効果の除去は失敗する', () => {
      const removed = system.removeEffect('non-existent', testCharacter.id);
      expect(removed).toBe(false);
    });

    test('存在しないキャラクターの効果除去は失敗する', () => {
      const removed = system.removeEffect('any-effect', 'non-existent-char');
      expect(removed).toBe(false);
    });
  });

  describe('効果の検証', () => {
    test('有効な効果は検証を通過する', () => {
      const effect: ItemEffect = {
        id: 'valid-effect',
        type: EffectType.HP_RECOVERY,
        target: EffectTarget.HP,
        value: 30,
        duration: 0,
        isPermanent: true,
        stackable: false,
      };

      expect(system.validateEffect(effect)).toBe(true);
    });

    test('無効な効果は検証に失敗する', () => {
      const invalidEffect = {
        id: 'invalid-effect',
        // type が欠けている
        target: EffectTarget.HP,
        value: 30,
        duration: 0,
        isPermanent: true,
        stackable: false,
      } as any;

      expect(system.validateEffect(invalidEffect)).toBe(false);
    });
  });

  describe('効果値の計算', () => {
    test('効果値が正しく計算される', () => {
      const effect: ItemEffect = {
        id: 'test-effect',
        type: EffectType.HP_RECOVERY,
        target: EffectTarget.HP,
        value: 30.7, // 小数点
        duration: 0,
        isPermanent: true,
        stackable: false,
      };

      const value = system.calculateEffectValue(effect, testCharacter);
      expect(value).toBe(30); // 切り捨て
    });

    test('負の効果値も計算できる', () => {
      const effect: ItemEffect = {
        id: 'test-effect',
        type: EffectType.DAMAGE,
        target: EffectTarget.HP,
        value: -10,
        duration: 0,
        isPermanent: true,
        stackable: false,
      };

      const value = system.calculateEffectValue(effect, testCharacter);
      expect(value).toBe(-10);
    });
  });

  describe('システムのクリア', () => {
    test('システムをクリアできる', () => {
      const effect: ItemEffect = {
        id: 'temp-buff',
        type: EffectType.STAT_BOOST,
        target: EffectTarget.ATTACK,
        value: 10,
        duration: 3,
        isPermanent: false,
        stackable: false,
      };

      system.applyEffect(effect, testCharacter.id, testCharacter);
      expect(system.getActiveEffects(testCharacter.id).length).toBe(1);

      system.clear();
      expect(system.getActiveEffects(testCharacter.id).length).toBe(0);
    });
  });

  describe('複数キャラクターの効果管理', () => {
    test('複数のキャラクターの効果を独立して管理できる', () => {
      const char1: Character = { ...testCharacter, id: 'char-1' };
      const char2: Character = { ...testCharacter, id: 'char-2' };

      const effect1: ItemEffect = {
        id: 'buff-1',
        type: EffectType.STAT_BOOST,
        target: EffectTarget.ATTACK,
        value: 10,
        duration: 3,
        isPermanent: false,
        stackable: false,
      };

      const effect2: ItemEffect = {
        id: 'buff-2',
        type: EffectType.STAT_BOOST,
        target: EffectTarget.DEFENSE,
        value: 5,
        duration: 2,
        isPermanent: false,
        stackable: false,
      };

      system.applyEffect(effect1, char1.id, char1);
      system.applyEffect(effect2, char2.id, char2);

      expect(system.getActiveEffects(char1.id).length).toBe(1);
      expect(system.getActiveEffects(char2.id).length).toBe(1);
      expect(system.getActiveEffects(char1.id)[0].id).toBe('buff-1');
      expect(system.getActiveEffects(char2.id)[0].id).toBe('buff-2');
    });
  });
});
