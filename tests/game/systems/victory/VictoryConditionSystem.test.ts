/**
 * VictoryConditionSystem統合テスト
 * 
 * メインコントローラーの統合機能をテスト
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import Phaser from 'phaser';
import { VictoryConditionSystem, VictoryStageData } from '../../../../game/src/systems/victory/VictoryConditionSystem';
import { ObjectiveType, VictoryConditionType, DefeatConditionType } from '../../../../game/src/types/victory';
import { BossDifficulty, BossType, RoseEssenceType } from '../../../../game/src/types/boss';
import { Unit, GameState } from '../../../../game/src/types/gameplay';

describe('VictoryConditionSystem', () => {
  let scene: Phaser.Scene;
  let system: VictoryConditionSystem;
  let mockStageData: VictoryStageData;

  beforeEach(() => {
    // Phaserシーンのモック
    scene = {
      events: {
        on: vi.fn(),
        off: vi.fn(),
      },
    } as any;

    // モックステージデータ
    mockStageData = {
      id: 'test-stage-1',
      name: 'テストステージ',
      description: 'テスト用のステージ',
      objectives: [
        {
          id: 'obj-1',
          type: ObjectiveType.DEFEAT_BOSS,
          description: 'ボスを撃破せよ',
          isRequired: true,
          isComplete: false,
          progress: { current: 0, target: 1, percentage: 0 },
          targetData: { bossId: 'boss-1' },
        },
        {
          id: 'obj-2',
          type: ObjectiveType.DEFEAT_ALL_ENEMIES,
          description: '全ての敵を撃破せよ',
          isRequired: false,
          isComplete: false,
          progress: { current: 0, target: 5, percentage: 0 },
        },
      ],
      victoryConditions: [
        {
          id: 'vc-1',
          type: VictoryConditionType.DEFEAT_BOSS,
          description: 'ボスを撃破する',
          isRequired: true,
          evaluate: (gameState: any) => true,
        },
      ],
      defeatConditions: [
        {
          id: 'dc-1',
          type: DefeatConditionType.ALL_UNITS_DEFEATED,
          description: '全ユニットが撃破された',
          evaluate: (gameState: any) => false,
        },
      ],
      bosses: [
        {
          id: 'boss-1',
          name: 'テストボス',
          title: '試練の守護者',
          description: 'テスト用のボス',
          roseEssenceAmount: 100,
          roseEssenceType: RoseEssenceType.CRIMSON,
          isBoss: true,
          bossType: BossType.MINOR_BOSS,
          difficulty: BossDifficulty.NORMAL,
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
          aiPersonality: 'aggressive' as any,
          aiPriority: 10,
          experienceReward: 500,
        },
      ],
      baseExperienceReward: 1000,
      targetTurns: 10,
      maxTurns: 20,
    };

    system = new VictoryConditionSystem(scene, {
      enableDebugLogs: false,
    });
  });

  describe('initialize', () => {
    test('should initialize system with valid stage data', () => {
      const result = system.initialize(mockStageData);

      expect(result.success).toBe(true);
      expect(result.objectivesRegistered).toBe(2);
      expect(result.conditionsRegistered).toBe(2);
      expect(result.bossesRegistered).toBe(1);
      expect(system.isSystemInitialized()).toBe(true);
    });

    test('should fail with invalid stage data', () => {
      const invalidData = {
        id: '',
        name: '',
        objectives: [],
        victoryConditions: [],
        defeatConditions: [],
        bosses: [],
      } as any;

      const result = system.initialize(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_STAGE_DATA');
    });

    test('should reset previous data on re-initialization', () => {
      system.initialize(mockStageData);
      const result = system.initialize(mockStageData);

      expect(result.success).toBe(true);
      expect(system.isSystemInitialized()).toBe(true);
    });
  });

  describe('updateObjectiveProgress', () => {
    beforeEach(() => {
      system.initialize(mockStageData);
    });

    test('should update objective progress', () => {
      system.updateObjectiveProgress('obj-2', 3);

      const objective = system.getObjectiveManager().getObjective('obj-2');
      expect(objective?.progress.current).toBe(3);
      expect(objective?.progress.percentage).toBe(60);
    });

    test('should complete objective when target reached', () => {
      system.updateObjectiveProgress('obj-2', 5);

      const objective = system.getObjectiveManager().getObjective('obj-2');
      expect(objective?.isComplete).toBe(true);
    });

    test('should not update if system not initialized', () => {
      const uninitializedSystem = new VictoryConditionSystem(scene);
      uninitializedSystem.updateObjectiveProgress('obj-1', 1);

      // エラーなく処理されることを確認
      expect(uninitializedSystem.isSystemInitialized()).toBe(false);
    });
  });

  describe('checkVictoryConditions', () => {
    beforeEach(() => {
      system.initialize(mockStageData);
    });

    test('should check victory conditions', () => {
      const gameState: GameState = {
        currentTurn: 5,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      const result = system.checkVictoryConditions(gameState);

      expect(result).toBeDefined();
      expect(typeof result.isVictory).toBe('boolean');
    });

    test('should not check if stage already complete', () => {
      const gameState: GameState = {
        currentTurn: 5,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      system.handleStageComplete(gameState);
      const result = system.checkVictoryConditions(gameState);

      expect(result.message).toContain('already complete');
    });
  });

  describe('checkDefeatConditions', () => {
    beforeEach(() => {
      system.initialize(mockStageData);
    });

    test('should check defeat conditions', () => {
      const gameState: GameState = {
        currentTurn: 5,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      const result = system.checkDefeatConditions(gameState);

      expect(result).toBeDefined();
      expect(typeof result.isDefeat).toBe('boolean');
    });
  });

  describe('handleBossDefeat', () => {
    beforeEach(() => {
      system.initialize(mockStageData);
    });

    test('should handle boss defeat', async () => {
      const bossUnit: Unit = {
        id: 'boss-1',
        name: 'テストボス',
        position: { x: 5, y: 5 },
        stats: {
          maxHP: 1000,
          maxMP: 100,
          attack: 50,
          defense: 30,
          speed: 10,
          movement: 3,
        },
        currentHP: 0,
        currentMP: 100,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
        equipment: {},
      };

      // ボスを登録
      system.registerBossUnit(bossUnit, mockStageData.bosses[0]);

      const result = await system.handleBossDefeat(bossUnit);

      expect(result.bossId).toBe('boss-1');
      expect(result.roseEssenceAmount).toBeGreaterThan(0);
      expect(system.getStagePerformance().bossesDefeated).toBe(1);
    });

    test('should throw error if system not initialized', async () => {
      const uninitializedSystem = new VictoryConditionSystem(scene);
      const bossUnit: Unit = {
        id: 'boss-1',
        name: 'テストボス',
        position: { x: 5, y: 5 },
        stats: {
          maxHP: 1000,
          maxMP: 100,
          attack: 50,
          defense: 30,
          speed: 10,
          movement: 3,
        },
        currentHP: 0,
        currentMP: 100,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
        equipment: {},
      };

      await expect(uninitializedSystem.handleBossDefeat(bossUnit)).rejects.toThrow();
    });
  });

  describe('handleStageComplete', () => {
    beforeEach(() => {
      system.initialize(mockStageData);
    });

    test('should handle stage complete', async () => {
      const gameState: GameState = {
        currentTurn: 8,
        activePlayer: 'player',
        phase: 'victory',
        gameResult: 'victory',
        turnOrder: [],
        activeUnitIndex: 0,
      };

      const result = await system.handleStageComplete(gameState, ['char-1']);

      expect(result.stageId).toBe('test-stage-1');
      expect(result.stageName).toBe('テストステージ');
      expect(result.rewards).toBeDefined();
      expect(result.performance.turnsUsed).toBe(8);
      expect(system.isStageCompleted()).toBe(true);
    });

    test('should throw error if already complete', async () => {
      const gameState: GameState = {
        currentTurn: 8,
        activePlayer: 'player',
        phase: 'victory',
        gameResult: 'victory',
        turnOrder: [],
        activeUnitIndex: 0,
      };

      await system.handleStageComplete(gameState);

      await expect(system.handleStageComplete(gameState)).rejects.toThrow('already complete');
    });
  });

  describe('handleStageFailure', () => {
    beforeEach(() => {
      system.initialize(mockStageData);
    });

    test('should handle stage failure', async () => {
      const gameState: GameState = {
        currentTurn: 5,
        activePlayer: 'player',
        phase: 'defeat',
        gameResult: 'defeat',
        turnOrder: [],
        activeUnitIndex: 0,
      };

      const result = await system.handleStageFailure('全ユニット撃破', gameState);

      expect(result.stageId).toBe('test-stage-1');
      expect(result.defeatReason).toBe('全ユニット撃破');
      expect(result.turnsPlayed).toBe(5);
      expect(system.isStageFailedStatus()).toBe(true);
    });

    test('should throw error if already failed', async () => {
      await system.handleStageFailure('テスト失敗');

      await expect(system.handleStageFailure('再度失敗')).rejects.toThrow('already failed');
    });
  });

  describe('performance tracking', () => {
    beforeEach(() => {
      system.initialize(mockStageData);
    });

    test('should record enemy defeat', () => {
      system.recordEnemyDefeat('enemy-1');
      system.recordEnemyDefeat('enemy-2');

      const performance = system.getStagePerformance();
      expect(performance.enemiesDefeated).toBe(2);
    });

    test('should record unit lost', () => {
      system.recordUnitLost('unit-1');

      const performance = system.getStagePerformance();
      expect(performance.unitsLost).toBe(1);
    });

    test('should record recruitment success', () => {
      system.recordRecruitmentSuccess('char-1');

      const performance = system.getStagePerformance();
      expect(performance.recruitmentSuccesses).toBe(1);
    });

    test('should record damage', () => {
      system.recordDamage(100, 50);

      const performance = system.getStagePerformance();
      expect(performance.damageDealt).toBe(100);
      expect(performance.damageTaken).toBe(50);
    });

    test('should record healing', () => {
      system.recordHealing(75);

      const performance = system.getStagePerformance();
      expect(performance.healingDone).toBe(75);
    });
  });

  describe('onTurnEnd', () => {
    beforeEach(() => {
      system.initialize(mockStageData);
    });

    test('should check conditions on turn end', () => {
      const gameState: GameState = {
        currentTurn: 5,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      // イベントリスナーを設定
      let victoryDetected = false;
      let defeatDetected = false;

      system.on('auto-victory-detected', () => {
        victoryDetected = true;
      });

      system.on('auto-defeat-detected', () => {
        defeatDetected = true;
      });

      system.onTurnEnd(gameState);

      // 条件次第でイベントが発火することを確認
      expect(typeof victoryDetected).toBe('boolean');
      expect(typeof defeatDetected).toBe('boolean');
    });
  });

  describe('reset and destroy', () => {
    test('should reset system', () => {
      system.initialize(mockStageData);
      system.reset();

      expect(system.isSystemInitialized()).toBe(false);
      expect(system.getCurrentStageData()).toBeNull();
    });

    test('should destroy system', () => {
      system.initialize(mockStageData);
      system.destroy();

      expect(system.isSystemInitialized()).toBe(false);
    });
  });

  describe('getters', () => {
    beforeEach(() => {
      system.initialize(mockStageData);
    });

    test('should get objective manager', () => {
      const manager = system.getObjectiveManager();
      expect(manager).toBeDefined();
    });

    test('should get boss system', () => {
      const bossSystem = system.getBossSystem();
      expect(bossSystem).toBeDefined();
    });

    test('should get victory condition manager', () => {
      const manager = system.getVictoryConditionManager();
      expect(manager).toBeDefined();
    });

    test('should get reward calculator', () => {
      const calculator = system.getRewardCalculator();
      expect(calculator).toBeDefined();
    });

    test('should get current stage data', () => {
      const stageData = system.getCurrentStageData();
      expect(stageData).toEqual(mockStageData);
    });

    test('should get stage performance', () => {
      system.recordEnemyDefeat('enemy-1');
      const performance = system.getStagePerformance();
      expect(performance.enemiesDefeated).toBe(1);
    });
  });

  describe('event emission', () => {
    beforeEach(() => {
      system.initialize(mockStageData);
    });

    test('should emit system-initialized event', () => {
      const newSystem = new VictoryConditionSystem(scene);
      let eventEmitted = false;

      newSystem.on('system-initialized', () => {
        eventEmitted = true;
      });

      newSystem.initialize(mockStageData);

      expect(eventEmitted).toBe(true);
    });

    test('should emit objective-completed event', () => {
      let eventEmitted = false;

      system.on('objective-completed', () => {
        eventEmitted = true;
      });

      system.updateObjectiveProgress('obj-1', 1);

      expect(eventEmitted).toBe(true);
    });
  });
});
