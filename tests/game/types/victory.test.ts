/**
 * 勝利条件システムの型定義テスト
 */

import { describe, test, expect } from 'vitest';
import {
  ObjectiveType,
  VictoryConditionType,
  DefeatConditionType,
  type Objective,
  type ObjectiveProgress,
  type VictoryCondition,
  type DefeatCondition,
  type VictoryCheckResult,
  type DefeatCheckResult,
  type GameResult,
} from '../../../game/src/types/victory';

describe('Victory Type Definitions', () => {
  describe('ObjectiveType Enum', () => {
    test('should have all required objective types', () => {
      expect(ObjectiveType.DEFEAT_BOSS).toBe('defeat_boss');
      expect(ObjectiveType.DEFEAT_ALL_ENEMIES).toBe('defeat_all_enemies');
      expect(ObjectiveType.REACH_POSITION).toBe('reach_position');
      expect(ObjectiveType.SURVIVE_TURNS).toBe('survive_turns');
      expect(ObjectiveType.PROTECT_UNIT).toBe('protect_unit');
      expect(ObjectiveType.COLLECT_ITEMS).toBe('collect_items');
      expect(ObjectiveType.CUSTOM).toBe('custom');
    });
  });

  describe('VictoryConditionType Enum', () => {
    test('should have all required victory condition types', () => {
      expect(VictoryConditionType.DEFEAT_BOSS).toBe('defeat_boss');
      expect(VictoryConditionType.DEFEAT_ALL_ENEMIES).toBe('defeat_all_enemies');
      expect(VictoryConditionType.REACH_POSITION).toBe('reach_position');
      expect(VictoryConditionType.SURVIVE_TURNS).toBe('survive_turns');
      expect(VictoryConditionType.PROTECT_UNIT).toBe('protect_unit');
      expect(VictoryConditionType.COLLECT_ITEMS).toBe('collect_items');
      expect(VictoryConditionType.CUSTOM).toBe('custom');
    });
  });

  describe('DefeatConditionType Enum', () => {
    test('should have all required defeat condition types', () => {
      expect(DefeatConditionType.ALL_UNITS_DEFEATED).toBe('all_units_defeated');
      expect(DefeatConditionType.MAIN_CHARACTER_DEFEATED).toBe('main_character_defeated');
      expect(DefeatConditionType.PROTECTED_UNIT_DEFEATED).toBe('protected_unit_defeated');
      expect(DefeatConditionType.TURN_LIMIT_EXCEEDED).toBe('turn_limit_exceeded');
      expect(DefeatConditionType.CUSTOM).toBe('custom');
    });
  });

  describe('ObjectiveProgress Interface', () => {
    test('should create valid objective progress', () => {
      const progress: ObjectiveProgress = {
        current: 5,
        target: 10,
        percentage: 50,
      };

      expect(progress.current).toBe(5);
      expect(progress.target).toBe(10);
      expect(progress.percentage).toBe(50);
    });

    test('should handle completed progress', () => {
      const progress: ObjectiveProgress = {
        current: 10,
        target: 10,
        percentage: 100,
      };

      expect(progress.current).toBe(progress.target);
      expect(progress.percentage).toBe(100);
    });
  });

  describe('Objective Interface', () => {
    test('should create valid objective', () => {
      const objective: Objective = {
        id: 'obj-1',
        type: ObjectiveType.DEFEAT_BOSS,
        description: 'ボスを撃破せよ',
        isRequired: true,
        isComplete: false,
        progress: {
          current: 0,
          target: 1,
          percentage: 0,
        },
        targetData: {
          bossId: 'boss-1',
        },
      };

      expect(objective.id).toBe('obj-1');
      expect(objective.type).toBe(ObjectiveType.DEFEAT_BOSS);
      expect(objective.isRequired).toBe(true);
      expect(objective.isComplete).toBe(false);
      expect(objective.targetData?.bossId).toBe('boss-1');
    });

    test('should create reach position objective', () => {
      const objective: Objective = {
        id: 'obj-2',
        type: ObjectiveType.REACH_POSITION,
        description: '指定位置に到達せよ',
        isRequired: true,
        isComplete: false,
        progress: {
          current: 0,
          target: 1,
          percentage: 0,
        },
        targetData: {
          targetPosition: { x: 10, y: 10 },
        },
      };

      expect(objective.type).toBe(ObjectiveType.REACH_POSITION);
      expect(objective.targetData?.targetPosition).toEqual({ x: 10, y: 10 });
    });
  });

  describe('VictoryCondition Interface', () => {
    test('should create valid victory condition', () => {
      const condition: VictoryCondition = {
        id: 'vc-1',
        type: VictoryConditionType.DEFEAT_BOSS,
        description: 'ボスを撃破する',
        isRequired: true,
        evaluate: () => true,
        conditionData: {
          targetUnitId: 'boss-1',
        },
      };

      expect(condition.id).toBe('vc-1');
      expect(condition.type).toBe(VictoryConditionType.DEFEAT_BOSS);
      expect(condition.isRequired).toBe(true);
      expect(condition.evaluate()).toBe(true);
      expect(condition.conditionData?.targetUnitId).toBe('boss-1');
    });
  });

  describe('DefeatCondition Interface', () => {
    test('should create valid defeat condition', () => {
      const condition: DefeatCondition = {
        id: 'dc-1',
        type: DefeatConditionType.ALL_UNITS_DEFEATED,
        description: '全ユニットが撃破された',
        evaluate: () => false,
      };

      expect(condition.id).toBe('dc-1');
      expect(condition.type).toBe(DefeatConditionType.ALL_UNITS_DEFEATED);
      expect(condition.evaluate()).toBe(false);
    });
  });

  describe('VictoryCheckResult Interface', () => {
    test('should create victory result', () => {
      const result: VictoryCheckResult = {
        isVictory: true,
        satisfiedConditions: ['vc-1', 'vc-2'],
        remainingConditions: [],
        message: 'ステージクリア！',
      };

      expect(result.isVictory).toBe(true);
      expect(result.satisfiedConditions).toHaveLength(2);
      expect(result.remainingConditions).toHaveLength(0);
      expect(result.message).toBe('ステージクリア！');
    });

    test('should create non-victory result', () => {
      const result: VictoryCheckResult = {
        isVictory: false,
        satisfiedConditions: ['vc-1'],
        remainingConditions: ['vc-2'],
      };

      expect(result.isVictory).toBe(false);
      expect(result.satisfiedConditions).toHaveLength(1);
      expect(result.remainingConditions).toHaveLength(1);
    });
  });

  describe('DefeatCheckResult Interface', () => {
    test('should create defeat result', () => {
      const result: DefeatCheckResult = {
        isDefeat: true,
        triggeredCondition: 'dc-1',
        message: 'ゲームオーバー',
      };

      expect(result.isDefeat).toBe(true);
      expect(result.triggeredCondition).toBe('dc-1');
      expect(result.message).toBe('ゲームオーバー');
    });

    test('should create non-defeat result', () => {
      const result: DefeatCheckResult = {
        isDefeat: false,
      };

      expect(result.isDefeat).toBe(false);
      expect(result.triggeredCondition).toBeUndefined();
    });
  });

  describe('GameResult Interface', () => {
    test('should create victory game result', () => {
      const result: GameResult = {
        result: 'victory',
        timestamp: Date.now(),
        turnCount: 15,
        message: 'ステージクリア！',
      };

      expect(result.result).toBe('victory');
      expect(result.turnCount).toBe(15);
      expect(result.message).toBe('ステージクリア！');
      expect(result.timestamp).toBeGreaterThan(0);
    });

    test('should create defeat game result', () => {
      const result: GameResult = {
        result: 'defeat',
        timestamp: Date.now(),
        turnCount: 8,
        message: 'ゲームオーバー',
      };

      expect(result.result).toBe('defeat');
      expect(result.turnCount).toBe(8);
      expect(result.message).toBe('ゲームオーバー');
    });
  });
});
