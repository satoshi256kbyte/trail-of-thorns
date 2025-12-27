/**
 * VictoryConditionDataValidator Tests
 * 
 * ボス戦・勝利条件システムのデータバリデーション機能のテスト
 */

import { describe, test, expect } from 'vitest';
import {
  BossDataValidator,
  VictoryConditionValidator,
  DefeatConditionValidator,
  VictoryConditionDataLoader,
  ValidationError,
} from '../../../game/src/utils/VictoryConditionDataValidator';
import type { BossData, VictoryCondition, DefeatCondition } from '../../../game/src/types/victory';

describe('BossDataValidator', () => {
  describe('validate', () => {
    test('有効なボスデータを検証できる', () => {
      const validBoss: BossData = {
        id: 'boss_test',
        name: 'テストボス',
        title: 'テストの支配者',
        description: 'テスト用のボス',
        roseEssenceAmount: 100,
        roseEssenceType: 'crimson',
        isBoss: true,
        bossType: 'minor_boss',
        difficulty: 'normal',
        phases: [
          {
            phaseNumber: 1,
            hpThreshold: 100,
            statModifiers: { attack: 1.0, defense: 1.0 },
            newAbilities: [],
            phaseChangeEffect: null,
          },
        ],
        currentPhase: 1,
        specialAbilities: [],
        aiPersonality: 'aggressive',
        aiPriority: 10,
        experienceReward: 200,
      };

      const result = BossDataValidator.validate(validBoss);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('必須フィールドが欠けている場合エラーを返す', () => {
      const invalidBoss = {
        id: 'boss_test',
        name: 'テストボス',
        // 他の必須フィールドが欠けている
      };

      const result = BossDataValidator.validate(invalidBoss);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.field === 'title')).toBe(true);
      expect(result.errors.some((e) => e.field === 'roseEssenceAmount')).toBe(true);
    });

    test('無効なボスIDパターンを検出する', () => {
      const invalidBoss = {
        id: 'invalid-boss-id', // ハイフンは許可されていない
        name: 'テストボス',
        title: 'テスト',
        description: 'テスト',
        roseEssenceAmount: 100,
        roseEssenceType: 'crimson',
        isBoss: true,
        bossType: 'minor_boss',
        difficulty: 'normal',
        phases: [
          {
            phaseNumber: 1,
            hpThreshold: 100,
            statModifiers: {},
            newAbilities: [],
          },
        ],
        currentPhase: 1,
        specialAbilities: [],
        aiPersonality: 'aggressive',
        aiPriority: 10,
        experienceReward: 200,
      };

      const result = BossDataValidator.validate(invalidBoss);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'id')).toBe(true);
    });

    test('負の薔薇の力の量を検出する', () => {
      const invalidBoss = {
        id: 'boss_test',
        name: 'テストボス',
        title: 'テスト',
        description: 'テスト',
        roseEssenceAmount: -10, // 負の値
        roseEssenceType: 'crimson',
        isBoss: true,
        bossType: 'minor_boss',
        difficulty: 'normal',
        phases: [
          {
            phaseNumber: 1,
            hpThreshold: 100,
            statModifiers: {},
            newAbilities: [],
          },
        ],
        currentPhase: 1,
        specialAbilities: [],
        aiPersonality: 'aggressive',
        aiPriority: 10,
        experienceReward: 200,
      };

      const result = BossDataValidator.validate(invalidBoss);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'roseEssenceAmount')).toBe(true);
    });

    test('無効な薔薇の力の種類を検出する', () => {
      const invalidBoss = {
        id: 'boss_test',
        name: 'テストボス',
        title: 'テスト',
        description: 'テスト',
        roseEssenceAmount: 100,
        roseEssenceType: 'invalid_type', // 無効な種類
        isBoss: true,
        bossType: 'minor_boss',
        difficulty: 'normal',
        phases: [
          {
            phaseNumber: 1,
            hpThreshold: 100,
            statModifiers: {},
            newAbilities: [],
          },
        ],
        currentPhase: 1,
        specialAbilities: [],
        aiPersonality: 'aggressive',
        aiPriority: 10,
        experienceReward: 200,
      };

      const result = BossDataValidator.validate(invalidBoss);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'roseEssenceType')).toBe(true);
    });

    test('isBossがtrueでない場合エラーを返す', () => {
      const invalidBoss = {
        id: 'boss_test',
        name: 'テストボス',
        title: 'テスト',
        description: 'テスト',
        roseEssenceAmount: 100,
        roseEssenceType: 'crimson',
        isBoss: false, // falseは許可されない
        bossType: 'minor_boss',
        difficulty: 'normal',
        phases: [
          {
            phaseNumber: 1,
            hpThreshold: 100,
            statModifiers: {},
            newAbilities: [],
          },
        ],
        currentPhase: 1,
        specialAbilities: [],
        aiPersonality: 'aggressive',
        aiPriority: 10,
        experienceReward: 200,
      };

      const result = BossDataValidator.validate(invalidBoss);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'isBoss')).toBe(true);
    });

    test('フェーズ配列が空の場合エラーを返す', () => {
      const invalidBoss = {
        id: 'boss_test',
        name: 'テストボス',
        title: 'テスト',
        description: 'テスト',
        roseEssenceAmount: 100,
        roseEssenceType: 'crimson',
        isBoss: true,
        bossType: 'minor_boss',
        difficulty: 'normal',
        phases: [], // 空配列
        currentPhase: 1,
        specialAbilities: [],
        aiPersonality: 'aggressive',
        aiPriority: 10,
        experienceReward: 200,
      };

      const result = BossDataValidator.validate(invalidBoss);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'phases')).toBe(true);
    });

    test('現在フェーズがフェーズ数を超える場合エラーを返す', () => {
      const invalidBoss = {
        id: 'boss_test',
        name: 'テストボス',
        title: 'テスト',
        description: 'テスト',
        roseEssenceAmount: 100,
        roseEssenceType: 'crimson',
        isBoss: true,
        bossType: 'minor_boss',
        difficulty: 'normal',
        phases: [
          {
            phaseNumber: 1,
            hpThreshold: 100,
            statModifiers: {},
            newAbilities: [],
          },
        ],
        currentPhase: 5, // フェーズ数を超えている
        specialAbilities: [],
        aiPersonality: 'aggressive',
        aiPriority: 10,
        experienceReward: 200,
      };

      const result = BossDataValidator.validate(invalidBoss);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'currentPhase')).toBe(true);
    });

    test('フェーズのHP閾値が範囲外の場合エラーを返す', () => {
      const invalidBoss = {
        id: 'boss_test',
        name: 'テストボス',
        title: 'テスト',
        description: 'テスト',
        roseEssenceAmount: 100,
        roseEssenceType: 'crimson',
        isBoss: true,
        bossType: 'minor_boss',
        difficulty: 'normal',
        phases: [
          {
            phaseNumber: 1,
            hpThreshold: 150, // 100を超えている
            statModifiers: {},
            newAbilities: [],
          },
        ],
        currentPhase: 1,
        specialAbilities: [],
        aiPersonality: 'aggressive',
        aiPriority: 10,
        experienceReward: 200,
      };

      const result = BossDataValidator.validate(invalidBoss);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('hpThreshold'))).toBe(true);
    });

    test('特殊能力IDの重複を検出する', () => {
      const invalidBoss = {
        id: 'boss_test',
        name: 'テストボス',
        title: 'テスト',
        description: 'テスト',
        roseEssenceAmount: 100,
        roseEssenceType: 'crimson',
        isBoss: true,
        bossType: 'minor_boss',
        difficulty: 'normal',
        phases: [
          {
            phaseNumber: 1,
            hpThreshold: 100,
            statModifiers: {},
            newAbilities: [],
          },
        ],
        currentPhase: 1,
        specialAbilities: [
          {
            id: 'ability_1',
            name: '能力1',
            description: 'テスト',
            type: 'active',
            effect: {},
          },
          {
            id: 'ability_1', // 重複
            name: '能力2',
            description: 'テスト',
            type: 'passive',
            effect: {},
          },
        ],
        aiPersonality: 'aggressive',
        aiPriority: 10,
        experienceReward: 200,
      };

      const result = BossDataValidator.validate(invalidBoss);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Duplicate ability ID'))).toBe(true);
    });

    test('フェーズのHP閾値が降順でない場合警告を返す', () => {
      const boss = {
        id: 'boss_test',
        name: 'テストボス',
        title: 'テスト',
        description: 'テスト',
        roseEssenceAmount: 100,
        roseEssenceType: 'crimson',
        isBoss: true,
        bossType: 'minor_boss',
        difficulty: 'normal',
        phases: [
          {
            phaseNumber: 1,
            hpThreshold: 50, // 降順でない
            statModifiers: {},
            newAbilities: [],
          },
          {
            phaseNumber: 2,
            hpThreshold: 100,
            statModifiers: {},
            newAbilities: [],
          },
        ],
        currentPhase: 1,
        specialAbilities: [],
        aiPersonality: 'aggressive',
        aiPriority: 10,
        experienceReward: 200,
      };

      const result = BossDataValidator.validate(boss);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('descending HP thresholds'))).toBe(true);
    });
  });
});

describe('VictoryConditionValidator', () => {
  describe('validate', () => {
    test('有効な勝利条件を検証できる', () => {
      const validCondition: VictoryCondition = {
        id: 'victory_1',
        type: 'defeat_all_enemies',
        description: '全ての敵を撃破する',
        isRequired: true,
      };

      const result = VictoryConditionValidator.validate(validCondition);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('必須フィールドが欠けている場合エラーを返す', () => {
      const invalidCondition = {
        type: 'defeat_all_enemies',
        // descriptionが欠けている
      };

      const result = VictoryConditionValidator.validate(invalidCondition);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'description')).toBe(true);
    });

    test('無効な勝利条件タイプを検出する', () => {
      const invalidCondition = {
        type: 'invalid_type',
        description: 'テスト',
      };

      const result = VictoryConditionValidator.validate(invalidCondition);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'type')).toBe(true);
    });

    test('defeat_boss条件でbossIdが欠けている場合エラーを返す', () => {
      const invalidCondition = {
        type: 'defeat_boss',
        description: 'ボスを撃破する',
        parameters: {
          // bossIdが欠けている
        },
      };

      const result = VictoryConditionValidator.validate(invalidCondition);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('bossId'))).toBe(true);
    });

    test('reach_position条件でtargetPositionが欠けている場合エラーを返す', () => {
      const invalidCondition = {
        type: 'reach_position',
        description: '指定位置に到達する',
        parameters: {
          // targetPositionが欠けている
        },
      };

      const result = VictoryConditionValidator.validate(invalidCondition);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('targetPosition'))).toBe(true);
    });

    test('survive_turns条件で無効なrequiredTurnsを検出する', () => {
      const invalidCondition = {
        type: 'survive_turns',
        description: 'ターン生存する',
        parameters: {
          requiredTurns: -5, // 負の値
        },
      };

      const result = VictoryConditionValidator.validate(invalidCondition);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('requiredTurns'))).toBe(true);
    });
  });
});

describe('DefeatConditionValidator', () => {
  describe('validate', () => {
    test('有効な敗北条件を検証できる', () => {
      const validCondition: DefeatCondition = {
        id: 'defeat_1',
        type: 'all_units_defeated',
        description: '全ユニットが撃破される',
      };

      const result = DefeatConditionValidator.validate(validCondition);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('必須フィールドが欠けている場合エラーを返す', () => {
      const invalidCondition = {
        type: 'all_units_defeated',
        // descriptionが欠けている
      };

      const result = DefeatConditionValidator.validate(invalidCondition);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'description')).toBe(true);
    });

    test('無効な敗北条件タイプを検出する', () => {
      const invalidCondition = {
        type: 'invalid_type',
        description: 'テスト',
      };

      const result = DefeatConditionValidator.validate(invalidCondition);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'type')).toBe(true);
    });

    test('turn_limit_exceeded条件で無効なmaxTurnsを検出する', () => {
      const invalidCondition = {
        type: 'turn_limit_exceeded',
        description: 'ターン制限超過',
        parameters: {
          maxTurns: 0, // 0は無効
        },
      };

      const result = DefeatConditionValidator.validate(invalidCondition);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('maxTurns'))).toBe(true);
    });
  });
});

describe('VictoryConditionDataLoader', () => {
  describe('loadAndValidateBosses', () => {
    test('有効なボスデータ配列を読み込める', async () => {
      const data = {
        bosses: [
          {
            id: 'boss_test_1',
            name: 'テストボス1',
            title: 'テスト',
            description: 'テスト',
            roseEssenceAmount: 100,
            roseEssenceType: 'crimson',
            isBoss: true,
            bossType: 'minor_boss',
            difficulty: 'normal',
            phases: [
              {
                phaseNumber: 1,
                hpThreshold: 100,
                statModifiers: {},
                newAbilities: [],
              },
            ],
            currentPhase: 1,
            specialAbilities: [],
            aiPersonality: 'aggressive',
            aiPriority: 10,
            experienceReward: 200,
          },
        ],
      };

      const result = await VictoryConditionDataLoader.loadAndValidateBosses(data);

      expect(result.validationResult.isValid).toBe(true);
      expect(result.bosses).toHaveLength(1);
      expect(result.bosses[0].id).toBe('boss_test_1');
    });

    test('無効なボスデータを含む場合エラーを返す', async () => {
      const data = {
        bosses: [
          {
            id: 'boss_test_1',
            // 必須フィールドが欠けている
          },
        ],
      };

      const result = await VictoryConditionDataLoader.loadAndValidateBosses(data);

      expect(result.validationResult.isValid).toBe(false);
      expect(result.validationResult.errors.length).toBeGreaterThan(0);
    });

    test('bosses配列が存在しない場合エラーを返す', async () => {
      const data = {
        // bossesが欠けている
      };

      const result = await VictoryConditionDataLoader.loadAndValidateBosses(data);

      expect(result.validationResult.isValid).toBe(false);
      expect(result.validationResult.errors.some((e) => e.field === 'bosses')).toBe(true);
    });
  });

  describe('validateStageConditions', () => {
    test('有効なステージ条件を検証できる', () => {
      const victoryConditions = [
        {
          type: 'defeat_all_enemies',
          description: '全ての敵を撃破する',
        },
      ];

      const defeatConditions = [
        {
          type: 'all_units_defeated',
          description: '全ユニットが撃破される',
        },
      ];

      const result = VictoryConditionDataLoader.validateStageConditions(
        victoryConditions,
        defeatConditions
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('無効な勝利条件を含む場合エラーを返す', () => {
      const victoryConditions = [
        {
          type: 'invalid_type',
          description: 'テスト',
        },
      ];

      const defeatConditions = [
        {
          type: 'all_units_defeated',
          description: '全ユニットが撃破される',
        },
      ];

      const result = VictoryConditionDataLoader.validateStageConditions(
        victoryConditions,
        defeatConditions
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('無効な敗北条件を含む場合エラーを返す', () => {
      const victoryConditions = [
        {
          type: 'defeat_all_enemies',
          description: '全ての敵を撃破する',
        },
      ];

      const defeatConditions = [
        {
          type: 'invalid_type',
          description: 'テスト',
        },
      ];

      const result = VictoryConditionDataLoader.validateStageConditions(
        victoryConditions,
        defeatConditions
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
