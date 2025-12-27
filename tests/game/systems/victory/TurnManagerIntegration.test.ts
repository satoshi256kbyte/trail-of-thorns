/**
 * TurnManager統合テスト
 * 
 * VictoryConditionSystemとTurnManagerの統合機能をテストします。
 * 
 * テスト対象:
 * - ターン終了時の目標進捗更新
 * - ターン終了時の勝利・敗北判定
 * - ターン制限目標の自動更新
 * - 生存ターン目標の追跡
 * 
 * 要件: 1.4, 3.1, 3.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Phaser from 'phaser';
import { VictoryConditionSystem, VictoryStageData } from '../../../../game/src/systems/victory/VictoryConditionSystem';
import { ObjectiveType } from '../../../../game/src/types/victory';
import { GameState } from '../../../../game/src/types/gameplay';

describe('VictoryConditionSystem - TurnManager Integration', () => {
  let scene: Phaser.Scene;
  let victorySystem: VictoryConditionSystem;
  let mockStageData: VictoryStageData;

  beforeEach(() => {
    // Phaserシーンのモック作成
    scene = {
      events: {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
      },
    } as any;

    // VictoryConditionSystemを作成
    victorySystem = new VictoryConditionSystem(scene, {
      enableDebugLogs: false,
      autoCheckConditions: true,
      checkOnTurnEnd: true,
    });

    // モックステージデータ
    mockStageData = {
      id: 'test-stage',
      name: 'Test Stage',
      description: 'Test stage for turn manager integration',
      objectives: [
        {
          id: 'survive-10-turns',
          type: ObjectiveType.SURVIVE_TURNS,
          description: '10ターン生存する',
          isRequired: true,
          isComplete: false,
          progress: {
            current: 0,
            target: 10,
            percentage: 0,
          },
          targetData: {
            surviveTurns: 10,
          },
        },
        {
          id: 'defeat-boss',
          type: ObjectiveType.DEFEAT_BOSS,
          description: 'ボスを撃破する',
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
        },
      ],
      victoryConditions: [
        {
          id: 'all-objectives-complete',
          type: 'all_objectives_complete' as any,
          description: 'すべての目標を達成する',
          isRequired: true,
          evaluate: (gameState: GameState) => {
            // ObjectiveManagerから目標の完了状態を取得
            const surviveObjective = victorySystem.getObjectiveManager().getObjective('survive-10-turns');
            const bossObjective = victorySystem.getObjectiveManager().getObjective('defeat-boss');
            return surviveObjective?.isComplete === true && bossObjective?.isComplete === true;
          },
        },
      ],
      defeatConditions: [
        {
          id: 'turn-limit-exceeded',
          type: 'turn_limit_exceeded' as any,
          description: 'ターン制限を超える',
          evaluate: (gameState: GameState) => {
            return gameState.currentTurn > 20;
          },
          conditionData: {
            turnLimit: 20,
          },
        },
      ],
      bosses: [],
      baseExperienceReward: 100,
      targetTurns: 10,
      maxTurns: 20,
    };

    // システムを初期化
    victorySystem.initialize(mockStageData);
  });

  describe('ターン終了時の目標進捗更新', () => {
    it('ターン終了時に生存ターン目標の進捗が更新される', () => {
      const gameState: GameState = {
        currentTurn: 5,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      // ターン終了処理を実行
      victorySystem.onTurnEnd(gameState);

      // 生存ターン目標の進捗を確認
      const objective = victorySystem.getObjectiveManager().getObjective('survive-10-turns');
      expect(objective).toBeDefined();
      expect(objective!.progress.current).toBe(5);
      expect(objective!.progress.target).toBe(10);
      expect(objective!.isComplete).toBe(false);
    });

    it('生存ターン目標が達成されると完了状態になる', () => {
      const gameState: GameState = {
        currentTurn: 10,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      // ターン終了処理を実行
      victorySystem.onTurnEnd(gameState);

      // 生存ターン目標が完了していることを確認
      const objective = victorySystem.getObjectiveManager().getObjective('survive-10-turns');
      expect(objective).toBeDefined();
      expect(objective!.progress.current).toBe(10);
      expect(objective!.isComplete).toBe(true);
    });

    it('複数ターンにわたって進捗が正しく更新される', () => {
      // ターン1
      victorySystem.onTurnEnd({
        currentTurn: 1,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      });

      let objective = victorySystem.getObjectiveManager().getObjective('survive-10-turns');
      expect(objective!.progress.current).toBe(1);

      // ターン5
      victorySystem.onTurnEnd({
        currentTurn: 5,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      });

      objective = victorySystem.getObjectiveManager().getObjective('survive-10-turns');
      expect(objective!.progress.current).toBe(5);

      // ターン10
      victorySystem.onTurnEnd({
        currentTurn: 10,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      });

      objective = victorySystem.getObjectiveManager().getObjective('survive-10-turns');
      expect(objective!.progress.current).toBe(10);
      expect(objective!.isComplete).toBe(true);
    });
  });

  describe('ターン終了時の勝利・敗北判定', () => {
    it('ターン終了時に勝利条件がチェックされる', () => {
      const victoryDetectedSpy = vi.fn();
      victorySystem.on('auto-victory-detected', victoryDetectedSpy);

      // すべての目標を完了させる
      victorySystem.getObjectiveManager().completeObjective('survive-10-turns');
      victorySystem.getObjectiveManager().completeObjective('defeat-boss');

      const gameState: GameState = {
        currentTurn: 10,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      // ターン終了処理を実行
      victorySystem.onTurnEnd(gameState);

      // 勝利検出イベントが発行されることを確認
      expect(victoryDetectedSpy).toHaveBeenCalled();
    });

    it('ターン終了時に敗北条件がチェックされる', () => {
      const defeatDetectedSpy = vi.fn();
      victorySystem.on('auto-defeat-detected', defeatDetectedSpy);

      const gameState: GameState = {
        currentTurn: 21, // ターン制限を超える
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      // ターン終了処理を実行
      victorySystem.onTurnEnd(gameState);

      // 敗北検出イベントが発行されることを確認
      expect(defeatDetectedSpy).toHaveBeenCalled();
    });

    it('ステージ完了後はターン終了処理がスキップされる', () => {
      const victoryDetectedSpy = vi.fn();
      victorySystem.on('auto-victory-detected', victoryDetectedSpy);

      // ステージを完了状態にする
      victorySystem.getObjectiveManager().completeObjective('survive-10-turns');
      victorySystem.getObjectiveManager().completeObjective('defeat-boss');

      const gameState: GameState = {
        currentTurn: 10,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      // 最初のターン終了で勝利
      victorySystem.onTurnEnd(gameState);
      expect(victoryDetectedSpy).toHaveBeenCalledTimes(1);

      // ステージクリア処理を実行
      victorySystem.handleStageComplete(gameState, []);

      // 2回目のターン終了処理（スキップされるべき）
      victorySystem.onTurnEnd({
        ...gameState,
        currentTurn: 11,
      });

      // 勝利検出イベントは1回のみ
      expect(victoryDetectedSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('ターン制限目標の自動更新', () => {
    it('ターン制限目標の進捗が更新される', () => {
      // ターン制限目標を追加
      const turnLimitObjective = {
        id: 'turn-limit-objective',
        type: ObjectiveType.CUSTOM,
        description: '15ターン以内にクリアする',
        isRequired: false,
        isComplete: false,
        progress: {
          current: 0,
          target: 15,
          percentage: 0,
        },
        targetData: {
          turnLimit: 15,
          customCondition: (gameState: GameState) => gameState.currentTurn <= 15,
        },
      };

      const registerResult = victorySystem.getObjectiveManager().registerObjective(turnLimitObjective);
      expect(registerResult.success).toBe(true);

      const gameState: GameState = {
        currentTurn: 10,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      // ターン終了処理を実行
      victorySystem.onTurnEnd(gameState);

      // ターン制限目標の進捗を確認
      const objective = victorySystem.getObjectiveManager().getObjective('turn-limit-objective');
      expect(objective).toBeDefined();
      expect(objective!.progress.current).toBe(10);
      expect(objective!.progress.target).toBe(15);
    });

    it('ターン制限を超えると目標失敗イベントが発行される', () => {
      const objectiveFailedSpy = vi.fn();
      victorySystem.on('objective-failed', objectiveFailedSpy);

      // ターン制限目標を追加
      const turnLimitObjective = {
        id: 'turn-limit-objective-2',
        type: ObjectiveType.CUSTOM,
        description: '15ターン以内にクリアする',
        isRequired: false,
        isComplete: false,
        progress: {
          current: 0,
          target: 15,
          percentage: 0,
        },
        targetData: {
          turnLimit: 15,
          customCondition: (gameState: GameState) => gameState.currentTurn <= 15,
        },
      };

      const registerResult = victorySystem.getObjectiveManager().registerObjective(turnLimitObjective);
      expect(registerResult.success).toBe(true);

      const gameState: GameState = {
        currentTurn: 16, // ターン制限を超える
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      // ターン終了処理を実行
      victorySystem.onTurnEnd(gameState);

      // 目標失敗イベントが発行されることを確認
      expect(objectiveFailedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          objectiveId: 'turn-limit-objective-2',
          reason: 'TURN_LIMIT_EXCEEDED',
          turnLimit: 15,
          currentTurn: 16,
        })
      );
    });
  });

  describe('生存ターン目標の追跡', () => {
    it('生存ターン目標が正しく追跡される', () => {
      // ターン1-9: 未完了
      for (let turn = 1; turn <= 9; turn++) {
        victorySystem.onTurnEnd({
          currentTurn: turn,
          activePlayer: 'player',
          phase: 'select',
          gameResult: null,
          turnOrder: [],
          activeUnitIndex: 0,
        });

        const objective = victorySystem.getObjectiveManager().getObjective('survive-10-turns');
        expect(objective!.progress.current).toBe(turn);
        expect(objective!.isComplete).toBe(false);
      }

      // ターン10: 完了
      victorySystem.onTurnEnd({
        currentTurn: 10,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      });

      const objective = victorySystem.getObjectiveManager().getObjective('survive-10-turns');
      expect(objective!.progress.current).toBe(10);
      expect(objective!.isComplete).toBe(true);
    });

    it('複数の生存ターン目標が独立して追跡される', () => {
      // 2つ目の生存ターン目標を追加
      const secondSurviveObjective = {
        id: 'survive-5-turns',
        type: ObjectiveType.SURVIVE_TURNS,
        description: '5ターン生存する',
        isRequired: false,
        isComplete: false,
        progress: {
          current: 0,
          target: 5,
          percentage: 0,
        },
        targetData: {
          surviveTurns: 5,
        },
      };

      const registerResult = victorySystem.getObjectiveManager().registerObjective(secondSurviveObjective);
      expect(registerResult.success).toBe(true);

      // ターン5
      victorySystem.onTurnEnd({
        currentTurn: 5,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      });

      // 5ターン目標は完了、10ターン目標は未完了
      let objective5 = victorySystem.getObjectiveManager().getObjective('survive-5-turns');
      let objective10 = victorySystem.getObjectiveManager().getObjective('survive-10-turns');

      expect(objective5!.isComplete).toBe(true);
      expect(objective10!.isComplete).toBe(false);
      expect(objective10!.progress.current).toBe(5);

      // ターン10
      victorySystem.onTurnEnd({
        currentTurn: 10,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      });

      // 両方完了（再取得が必要）
      objective5 = victorySystem.getObjectiveManager().getObjective('survive-5-turns');
      objective10 = victorySystem.getObjectiveManager().getObjective('survive-10-turns');
      
      expect(objective5!.isComplete).toBe(true);
      expect(objective10!.isComplete).toBe(true);
    });
  });

  describe('ターン終了イベント', () => {
    it('ターン終了処理後にイベントが発行される', () => {
      const turnEndProcessedSpy = vi.fn();
      victorySystem.on('turn-end-processed', turnEndProcessedSpy);

      const gameState: GameState = {
        currentTurn: 5,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      victorySystem.onTurnEnd(gameState);

      expect(turnEndProcessedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          turn: 5,
          performance: expect.objectContaining({
            turnsUsed: 5,
          }),
        })
      );
    });

    it('パフォーマンスデータにターン数が記録される', () => {
      victorySystem.onTurnEnd({
        currentTurn: 7,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      });

      const performance = victorySystem.getStagePerformance();
      expect(performance.turnsUsed).toBe(7);
    });
  });

  describe('エラーハンドリング', () => {
    it('システム未初期化時はターン終了処理がスキップされる', () => {
      const uninitializedSystem = new VictoryConditionSystem(scene);

      const gameState: GameState = {
        currentTurn: 5,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      // エラーが発生しないことを確認
      expect(() => uninitializedSystem.onTurnEnd(gameState)).not.toThrow();
    });

    it('ステージ失敗後はターン終了処理がスキップされる', async () => {
      const turnEndProcessedSpy = vi.fn();
      victorySystem.on('turn-end-processed', turnEndProcessedSpy);

      // ステージを失敗状態にする
      await victorySystem.handleStageFailure('Test failure');

      const gameState: GameState = {
        currentTurn: 5,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      victorySystem.onTurnEnd(gameState);

      // ターン終了処理イベントが発行されないことを確認
      expect(turnEndProcessedSpy).not.toHaveBeenCalled();
    });
  });
});
