/**
 * VictoryConditionDataLoaderのユニットテスト
 */

import { describe, test, expect } from 'vitest';
import {
  VictoryConditionDataLoader,
  DataValidationError,
  StageDataJSON,
  BossDataJSON,
} from '../../../../game/src/systems/victory/VictoryConditionDataLoader';
import { ObjectiveType, VictoryConditionType, DefeatConditionType } from '../../../../game/src/types/victory';
import { RoseEssenceType, BossType, BossDifficulty, AIPersonality } from '../../../../game/src/types/boss';

describe('VictoryConditionDataLoader', () => {
  describe('loadObjectivesFromStage', () => {
    test('明示的な目標が定義されている場合、目標を読み込む', () => {
      const stageData: StageDataJSON = {
        id: 'test-stage',
        name: 'Test Stage',
        description: 'Test',
        victoryConditions: [],
        defeatConditions: [],
        objectives: [
          {
            id: 'obj-1',
            type: 'defeat_boss',
            description: 'ボスを倒す',
            isRequired: true,
            targetData: { bossId: 'boss-1' },
          },
        ],
      };

      const objectives = VictoryConditionDataLoader.loadObjectivesFromStage(stageData);

      expect(objectives).toHaveLength(1);
      expect(objectives[0].id).toBe('obj-1');
      expect(objectives[0].type).toBe(ObjectiveType.DEFEAT_BOSS);
      expect(objectives[0].description).toBe('ボスを倒す');
      expect(objectives[0].isRequired).toBe(true);
      expect(objectives[0].isComplete).toBe(false);
    });

    test('勝利条件から目標を自動生成する', () => {
      const stageData: StageDataJSON = {
        id: 'test-stage',
        name: 'Test Stage',
        description: 'Test',
        victoryConditions: [
          {
            type: 'defeat_all_enemies',
            description: '全ての敵を倒す',
          },
        ],
        defeatConditions: [],
      };

      const objectives = VictoryConditionDataLoader.loadObjectivesFromStage(stageData);

      expect(objectives).toHaveLength(1);
      expect(objectives[0].type).toBe(ObjectiveType.DEFEAT_ALL_ENEMIES);
      expect(objectives[0].description).toBe('全ての敵を倒す');
    });

    test('複数の勝利条件から複数の目標を生成する', () => {
      const stageData: StageDataJSON = {
        id: 'test-stage',
        name: 'Test Stage',
        description: 'Test',
        victoryConditions: [
          { type: 'defeat_boss', description: 'ボスを倒す', parameters: { bossId: 'boss-1' } },
          { type: 'survive_turns', description: '10ターン生存', parameters: { requiredTurns: 10 } },
        ],
        defeatConditions: [],
      };

      const objectives = VictoryConditionDataLoader.loadObjectivesFromStage(stageData);

      expect(objectives).toHaveLength(2);
      expect(objectives[0].type).toBe(ObjectiveType.DEFEAT_BOSS);
      expect(objectives[1].type).toBe(ObjectiveType.SURVIVE_TURNS);
      expect(objectives[1].progress.target).toBe(10);
    });
  });

  describe('loadVictoryConditions', () => {
    test('勝利条件を正しく読み込む', () => {
      const stageData: StageDataJSON = {
        id: 'test-stage',
        name: 'Test Stage',
        description: 'Test',
        victoryConditions: [
          {
            id: 'vc-1',
            type: 'defeat_boss',
            description: 'ボスを倒す',
            isRequired: true,
            parameters: { bossId: 'boss-1' },
          },
        ],
        defeatConditions: [],
      };

      const conditions = VictoryConditionDataLoader.loadVictoryConditions(stageData);

      expect(conditions).toHaveLength(1);
      expect(conditions[0].id).toBe('vc-1');
      expect(conditions[0].type).toBe(VictoryConditionType.DEFEAT_BOSS);
      expect(conditions[0].description).toBe('ボスを倒す');
      expect(conditions[0].isRequired).toBe(true);
      expect(conditions[0].conditionData).toEqual({ bossId: 'boss-1' });
    });

    test('IDが指定されていない場合、自動生成する', () => {
      const stageData: StageDataJSON = {
        id: 'test-stage',
        name: 'Test Stage',
        description: 'Test',
        victoryConditions: [
          {
            type: 'defeat_all_enemies',
            description: '全ての敵を倒す',
          },
        ],
        defeatConditions: [],
      };

      const conditions = VictoryConditionDataLoader.loadVictoryConditions(stageData);

      expect(conditions).toHaveLength(1);
      expect(conditions[0].id).toMatch(/^victory_defeat_all_enemies_\d+$/);
    });

    test('reach_destinationをreach_positionに変換する', () => {
      const stageData: StageDataJSON = {
        id: 'test-stage',
        name: 'Test Stage',
        description: 'Test',
        victoryConditions: [
          {
            type: 'reach_destination',
            description: '目的地に到達',
            parameters: { targetPosition: { x: 10, y: 10 } },
          },
        ],
        defeatConditions: [],
      };

      const conditions = VictoryConditionDataLoader.loadVictoryConditions(stageData);

      expect(conditions[0].type).toBe(VictoryConditionType.REACH_POSITION);
    });
  });

  describe('loadDefeatConditions', () => {
    test('敗北条件を正しく読み込む', () => {
      const stageData: StageDataJSON = {
        id: 'test-stage',
        name: 'Test Stage',
        description: 'Test',
        victoryConditions: [],
        defeatConditions: [
          {
            id: 'dc-1',
            type: 'all_allies_defeated',
            description: '味方全滅',
          },
        ],
      };

      const conditions = VictoryConditionDataLoader.loadDefeatConditions(stageData);

      expect(conditions).toHaveLength(1);
      expect(conditions[0].id).toBe('dc-1');
      expect(conditions[0].type).toBe(DefeatConditionType.ALL_UNITS_DEFEATED);
      expect(conditions[0].description).toBe('味方全滅');
    });

    test('ターン制限の敗北条件を読み込む', () => {
      const stageData: StageDataJSON = {
        id: 'test-stage',
        name: 'Test Stage',
        description: 'Test',
        victoryConditions: [],
        defeatConditions: [
          {
            type: 'turn_limit_exceeded',
            description: '20ターン以内にクリア',
            parameters: { maxTurns: 20 },
          },
        ],
      };

      const conditions = VictoryConditionDataLoader.loadDefeatConditions(stageData);

      expect(conditions[0].type).toBe(DefeatConditionType.TURN_LIMIT_EXCEEDED);
      expect(conditions[0].conditionData).toEqual({ maxTurns: 20 });
    });
  });

  describe('loadBossData', () => {
    test('ボスデータを正しく読み込む', () => {
      const bossJSON: BossDataJSON = {
        id: 'boss-1',
        name: 'Test Boss',
        title: 'The Tester',
        description: 'A test boss',
        roseEssenceAmount: 100,
        roseEssenceType: 'crimson',
        isBoss: true,
        bossType: 'major_boss',
        difficulty: 'hard',
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
        experienceReward: 500,
      };

      const bossData = VictoryConditionDataLoader.loadBossData(bossJSON);

      expect(bossData.id).toBe('boss-1');
      expect(bossData.name).toBe('Test Boss');
      expect(bossData.roseEssenceAmount).toBe(100);
      expect(bossData.roseEssenceType).toBe(RoseEssenceType.CRIMSON);
      expect(bossData.bossType).toBe(BossType.MAJOR_BOSS);
      expect(bossData.difficulty).toBe(BossDifficulty.HARD);
      expect(bossData.aiPersonality).toBe(AIPersonality.AGGRESSIVE);
    });

    test('必須フィールドが欠けている場合、エラーをスローする', () => {
      const invalidBossJSON = {
        id: 'boss-1',
        name: 'Test Boss',
        // title が欠けている
      } as any;

      expect(() => {
        VictoryConditionDataLoader.loadBossData(invalidBossJSON);
      }).toThrow(DataValidationError);
    });

    test('薔薇の力の量が負の場合、エラーをスローする', () => {
      const invalidBossJSON: BossDataJSON = {
        id: 'boss-1',
        name: 'Test Boss',
        title: 'The Tester',
        description: 'A test boss',
        roseEssenceAmount: -10,
        roseEssenceType: 'crimson',
        isBoss: true,
        bossType: 'major_boss',
        difficulty: 'hard',
        phases: [{ phaseNumber: 1, hpThreshold: 100, statModifiers: {}, newAbilities: [] }],
        currentPhase: 1,
        specialAbilities: [],
        aiPersonality: 'aggressive',
        aiPriority: 10,
        experienceReward: 500,
      };

      expect(() => {
        VictoryConditionDataLoader.loadBossData(invalidBossJSON);
      }).toThrow(DataValidationError);
    });

    test('無効な薔薇の力の種類の場合、エラーをスローする', () => {
      const invalidBossJSON: BossDataJSON = {
        id: 'boss-1',
        name: 'Test Boss',
        title: 'The Tester',
        description: 'A test boss',
        roseEssenceAmount: 100,
        roseEssenceType: 'invalid_type',
        isBoss: true,
        bossType: 'major_boss',
        difficulty: 'hard',
        phases: [{ phaseNumber: 1, hpThreshold: 100, statModifiers: {}, newAbilities: [] }],
        currentPhase: 1,
        specialAbilities: [],
        aiPersonality: 'aggressive',
        aiPriority: 10,
        experienceReward: 500,
      };

      expect(() => {
        VictoryConditionDataLoader.loadBossData(invalidBossJSON);
      }).toThrow(DataValidationError);
    });

    test('フェーズが空の場合、エラーをスローする', () => {
      const invalidBossJSON: BossDataJSON = {
        id: 'boss-1',
        name: 'Test Boss',
        title: 'The Tester',
        description: 'A test boss',
        roseEssenceAmount: 100,
        roseEssenceType: 'crimson',
        isBoss: true,
        bossType: 'major_boss',
        difficulty: 'hard',
        phases: [],
        currentPhase: 1,
        specialAbilities: [],
        aiPersonality: 'aggressive',
        aiPriority: 10,
        experienceReward: 500,
      };

      expect(() => {
        VictoryConditionDataLoader.loadBossData(invalidBossJSON);
      }).toThrow(DataValidationError);
    });
  });

  describe('validateStageData', () => {
    test('有効なステージデータは検証を通過する', () => {
      const validStageData: StageDataJSON = {
        id: 'test-stage',
        name: 'Test Stage',
        description: 'Test',
        victoryConditions: [
          {
            type: 'defeat_all_enemies',
            description: '全ての敵を倒す',
          },
        ],
        defeatConditions: [
          {
            type: 'all_allies_defeated',
            description: '味方全滅',
          },
        ],
      };

      expect(() => {
        VictoryConditionDataLoader.validateStageData(validStageData);
      }).not.toThrow();
    });

    test('ステージIDが欠けている場合、エラーをスローする', () => {
      const invalidStageData = {
        name: 'Test Stage',
        description: 'Test',
        victoryConditions: [],
        defeatConditions: [],
      } as any;

      expect(() => {
        VictoryConditionDataLoader.validateStageData(invalidStageData);
      }).toThrow(DataValidationError);
    });

    test('勝利条件が空の場合、エラーをスローする', () => {
      const invalidStageData: StageDataJSON = {
        id: 'test-stage',
        name: 'Test Stage',
        description: 'Test',
        victoryConditions: [],
        defeatConditions: [
          {
            type: 'all_allies_defeated',
            description: '味方全滅',
          },
        ],
      };

      expect(() => {
        VictoryConditionDataLoader.validateStageData(invalidStageData);
      }).toThrow(DataValidationError);
    });

    test('敗北条件が空の場合、エラーをスローする', () => {
      const invalidStageData: StageDataJSON = {
        id: 'test-stage',
        name: 'Test Stage',
        description: 'Test',
        victoryConditions: [
          {
            type: 'defeat_all_enemies',
            description: '全ての敵を倒す',
          },
        ],
        defeatConditions: [],
      };

      expect(() => {
        VictoryConditionDataLoader.validateStageData(invalidStageData);
      }).toThrow(DataValidationError);
    });

    test('defeat_boss条件にbossIdが欠けている場合、エラーをスローする', () => {
      const invalidStageData: StageDataJSON = {
        id: 'test-stage',
        name: 'Test Stage',
        description: 'Test',
        victoryConditions: [
          {
            type: 'defeat_boss',
            description: 'ボスを倒す',
            // bossId が欠けている
          },
        ],
        defeatConditions: [
          {
            type: 'all_allies_defeated',
            description: '味方全滅',
          },
        ],
      };

      expect(() => {
        VictoryConditionDataLoader.validateStageData(invalidStageData);
      }).toThrow(DataValidationError);
    });

    test('survive_turns条件にrequiredTurnsが欠けている場合、エラーをスローする', () => {
      const invalidStageData: StageDataJSON = {
        id: 'test-stage',
        name: 'Test Stage',
        description: 'Test',
        victoryConditions: [
          {
            type: 'survive_turns',
            description: '生存する',
            // requiredTurns が欠けている
          },
        ],
        defeatConditions: [
          {
            type: 'all_allies_defeated',
            description: '味方全滅',
          },
        ],
      };

      expect(() => {
        VictoryConditionDataLoader.validateStageData(invalidStageData);
      }).toThrow(DataValidationError);
    });

    test('turn_limit_exceeded条件にmaxTurnsが欠けている場合、エラーをスローする', () => {
      const invalidStageData: StageDataJSON = {
        id: 'test-stage',
        name: 'Test Stage',
        description: 'Test',
        victoryConditions: [
          {
            type: 'defeat_all_enemies',
            description: '全ての敵を倒す',
          },
        ],
        defeatConditions: [
          {
            type: 'turn_limit_exceeded',
            description: 'ターン制限超過',
            // maxTurns が欠けている
          },
        ],
      };

      expect(() => {
        VictoryConditionDataLoader.validateStageData(invalidStageData);
      }).toThrow(DataValidationError);
    });
  });

  describe('DataValidationError', () => {
    test('エラーメッセージとメタデータを含む', () => {
      const error = new DataValidationError(
        'Test error',
        'test_type',
        'test_id',
        { detail: 'test detail' }
      );

      expect(error.message).toBe('Test error');
      expect(error.dataType).toBe('test_type');
      expect(error.dataId).toBe('test_id');
      expect(error.details).toEqual({ detail: 'test detail' });
      expect(error.name).toBe('DataValidationError');
    });
  });
});
