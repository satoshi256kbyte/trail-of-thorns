import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VictoryConditionManager } from '../../../../game/src/systems/victory/VictoryConditionManager';
import {
  VictoryCondition,
  DefeatCondition,
  VictoryConditionType,
  DefeatConditionType,
} from '../../../../game/src/types/victory';
import { GameState } from '../../../../game/src/types/gameplay';

describe('VictoryConditionManager', () => {
  let manager: VictoryConditionManager;
  let mockGameState: GameState;

  beforeEach(() => {
    manager = new VictoryConditionManager();
    
    // モックのゲーム状態を作成
    mockGameState = {
      currentTurn: 1,
      activePlayer: 'player',
      phase: 'select',
      units: [],
      map: {
        width: 10,
        height: 10,
        tiles: [],
      },
    } as GameState;
  });

  describe('registerVictoryConditions', () => {
    it('勝利条件を正しく登録できる', () => {
      const conditions: VictoryCondition[] = [
        {
          id: 'defeat-boss',
          type: VictoryConditionType.DEFEAT_BOSS,
          description: 'ボスを撃破する',
          isRequired: true,
          evaluate: () => false,
        },
      ];

      manager.registerVictoryConditions(conditions);
      
      const registered = manager.getVictoryConditions();
      expect(registered).toHaveLength(1);
      expect(registered[0].id).toBe('defeat-boss');
    });

    it('複数の勝利条件を登録できる', () => {
      const conditions: VictoryCondition[] = [
        {
          id: 'defeat-boss',
          type: VictoryConditionType.DEFEAT_BOSS,
          description: 'ボスを撃破する',
          isRequired: true,
          evaluate: () => false,
        },
        {
          id: 'defeat-all',
          type: VictoryConditionType.DEFEAT_ALL_ENEMIES,
          description: '全ての敵を撃破する',
          isRequired: false,
          evaluate: () => false,
        },
      ];

      manager.registerVictoryConditions(conditions);
      
      const registered = manager.getVictoryConditions();
      expect(registered).toHaveLength(2);
    });

    it('空の配列を登録しようとすると警告を出す', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      manager.registerVictoryConditions([]);
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('不正な条件を登録しようとするとエラーを投げる', () => {
      const invalidCondition = {
        id: 'invalid',
        // type が欠けている
        description: 'Invalid condition',
        isRequired: true,
        evaluate: () => false,
      } as VictoryCondition;

      expect(() => {
        manager.registerVictoryConditions([invalidCondition]);
      }).toThrow();
    });

    it('victory-conditions-registeredイベントを発行する', () => {
      const eventSpy = vi.fn();
      manager.on('victory-conditions-registered', eventSpy);

      const conditions: VictoryCondition[] = [
        {
          id: 'defeat-boss',
          type: VictoryConditionType.DEFEAT_BOSS,
          description: 'ボスを撃破する',
          isRequired: true,
          evaluate: () => false,
        },
      ];

      manager.registerVictoryConditions(conditions);
      
      expect(eventSpy).toHaveBeenCalledWith(conditions);
    });
  });

  describe('registerDefeatConditions', () => {
    it('敗北条件を正しく登録できる', () => {
      const conditions: DefeatCondition[] = [
        {
          id: 'all-defeated',
          type: DefeatConditionType.ALL_UNITS_DEFEATED,
          description: '全ユニットが撃破された',
          evaluate: () => false,
        },
      ];

      manager.registerDefeatConditions(conditions);
      
      const registered = manager.getDefeatConditions();
      expect(registered).toHaveLength(1);
      expect(registered[0].id).toBe('all-defeated');
    });

    it('複数の敗北条件を登録できる', () => {
      const conditions: DefeatCondition[] = [
        {
          id: 'all-defeated',
          type: DefeatConditionType.ALL_UNITS_DEFEATED,
          description: '全ユニットが撃破された',
          evaluate: () => false,
        },
        {
          id: 'turn-limit',
          type: DefeatConditionType.TURN_LIMIT_EXCEEDED,
          description: 'ターン制限を超えた',
          evaluate: () => false,
        },
      ];

      manager.registerDefeatConditions(conditions);
      
      const registered = manager.getDefeatConditions();
      expect(registered).toHaveLength(2);
    });

    it('defeat-conditions-registeredイベントを発行する', () => {
      const eventSpy = vi.fn();
      manager.on('defeat-conditions-registered', eventSpy);

      const conditions: DefeatCondition[] = [
        {
          id: 'all-defeated',
          type: DefeatConditionType.ALL_UNITS_DEFEATED,
          description: '全ユニットが撃破された',
          evaluate: () => false,
        },
      ];

      manager.registerDefeatConditions(conditions);
      
      expect(eventSpy).toHaveBeenCalledWith(conditions);
    });
  });

  describe('checkVictory', () => {
    it('必須条件がすべて満たされている場合、勝利と判定する', () => {
      const conditions: VictoryCondition[] = [
        {
          id: 'defeat-boss',
          type: VictoryConditionType.DEFEAT_BOSS,
          description: 'ボスを撃破する',
          isRequired: true,
          evaluate: () => true, // 満たされている
        },
      ];

      manager.registerVictoryConditions(conditions);
      const result = manager.checkVictory(mockGameState);
      
      expect(result.isVictory).toBe(true);
      expect(result.satisfiedConditions).toHaveLength(1);
      expect(result.unsatisfiedConditions).toHaveLength(0);
    });

    it('必須条件が満たされていない場合、勝利と判定しない', () => {
      const conditions: VictoryCondition[] = [
        {
          id: 'defeat-boss',
          type: VictoryConditionType.DEFEAT_BOSS,
          description: 'ボスを撃破する',
          isRequired: true,
          evaluate: () => false, // 満たされていない
        },
      ];

      manager.registerVictoryConditions(conditions);
      const result = manager.checkVictory(mockGameState);
      
      expect(result.isVictory).toBe(false);
      expect(result.satisfiedConditions).toHaveLength(0);
      expect(result.unsatisfiedConditions).toHaveLength(1);
    });

    it('複数の必須条件がすべて満たされている場合、勝利と判定する', () => {
      const conditions: VictoryCondition[] = [
        {
          id: 'defeat-boss',
          type: VictoryConditionType.DEFEAT_BOSS,
          description: 'ボスを撃破する',
          isRequired: true,
          evaluate: () => true,
        },
        {
          id: 'survive',
          type: VictoryConditionType.SURVIVE_TURNS,
          description: '10ターン生存する',
          isRequired: true,
          evaluate: () => true,
        },
      ];

      manager.registerVictoryConditions(conditions);
      const result = manager.checkVictory(mockGameState);
      
      expect(result.isVictory).toBe(true);
      expect(result.satisfiedConditions).toHaveLength(2);
    });

    it('必須条件の一部が満たされていない場合、勝利と判定しない', () => {
      const conditions: VictoryCondition[] = [
        {
          id: 'defeat-boss',
          type: VictoryConditionType.DEFEAT_BOSS,
          description: 'ボスを撃破する',
          isRequired: true,
          evaluate: () => true,
        },
        {
          id: 'survive',
          type: VictoryConditionType.SURVIVE_TURNS,
          description: '10ターン生存する',
          isRequired: true,
          evaluate: () => false, // 満たされていない
        },
      ];

      manager.registerVictoryConditions(conditions);
      const result = manager.checkVictory(mockGameState);
      
      expect(result.isVictory).toBe(false);
      expect(result.satisfiedConditions).toHaveLength(1);
      expect(result.unsatisfiedConditions).toHaveLength(1);
    });

    it('オプション条件は勝利判定に影響しない', () => {
      const conditions: VictoryCondition[] = [
        {
          id: 'defeat-boss',
          type: VictoryConditionType.DEFEAT_BOSS,
          description: 'ボスを撃破する',
          isRequired: true,
          evaluate: () => true,
        },
        {
          id: 'collect-items',
          type: VictoryConditionType.COLLECT_ITEMS,
          description: 'アイテムを収集する',
          isRequired: false, // オプション
          evaluate: () => false,
        },
      ];

      manager.registerVictoryConditions(conditions);
      const result = manager.checkVictory(mockGameState);
      
      expect(result.isVictory).toBe(true);
    });

    it('勝利条件が登録されていない場合、勝利と判定しない', () => {
      const result = manager.checkVictory(mockGameState);
      
      expect(result.isVictory).toBe(false);
      expect(result.message).toContain('No victory conditions registered');
    });

    it('勝利時にvictory-achievedイベントを発行する', () => {
      const eventSpy = vi.fn();
      manager.on('victory-achieved', eventSpy);

      const conditions: VictoryCondition[] = [
        {
          id: 'defeat-boss',
          type: VictoryConditionType.DEFEAT_BOSS,
          description: 'ボスを撃破する',
          isRequired: true,
          evaluate: () => true,
        },
      ];

      manager.registerVictoryConditions(conditions);
      manager.checkVictory(mockGameState);
      
      expect(eventSpy).toHaveBeenCalled();
    });

    it('条件評価中にエラーが発生した場合、その条件を未満足として扱う', () => {
      const conditions: VictoryCondition[] = [
        {
          id: 'defeat-boss',
          type: VictoryConditionType.DEFEAT_BOSS,
          description: 'ボスを撃破する',
          isRequired: true,
          evaluate: () => {
            throw new Error('Evaluation error');
          },
        },
      ];

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      manager.registerVictoryConditions(conditions);
      const result = manager.checkVictory(mockGameState);
      
      expect(result.isVictory).toBe(false);
      expect(result.unsatisfiedConditions).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('checkDefeat', () => {
    it('敗北条件が満たされている場合、敗北と判定する', () => {
      const conditions: DefeatCondition[] = [
        {
          id: 'all-defeated',
          type: DefeatConditionType.ALL_UNITS_DEFEATED,
          description: '全ユニットが撃破された',
          evaluate: () => true, // 満たされている
        },
      ];

      manager.registerDefeatConditions(conditions);
      const result = manager.checkDefeat(mockGameState);
      
      expect(result.isDefeat).toBe(true);
      expect(result.triggeredConditions).toHaveLength(1);
    });

    it('敗北条件が満たされていない場合、敗北と判定しない', () => {
      const conditions: DefeatCondition[] = [
        {
          id: 'all-defeated',
          type: DefeatConditionType.ALL_UNITS_DEFEATED,
          description: '全ユニットが撃破された',
          evaluate: () => false, // 満たされていない
        },
      ];

      manager.registerDefeatConditions(conditions);
      const result = manager.checkDefeat(mockGameState);
      
      expect(result.isDefeat).toBe(false);
      expect(result.triggeredConditions).toHaveLength(0);
    });

    it('複数の敗北条件のうち1つでも満たされれば敗北と判定する', () => {
      const conditions: DefeatCondition[] = [
        {
          id: 'all-defeated',
          type: DefeatConditionType.ALL_UNITS_DEFEATED,
          description: '全ユニットが撃破された',
          evaluate: () => false,
        },
        {
          id: 'turn-limit',
          type: DefeatConditionType.TURN_LIMIT_EXCEEDED,
          description: 'ターン制限を超えた',
          evaluate: () => true, // これが満たされている
        },
      ];

      manager.registerDefeatConditions(conditions);
      const result = manager.checkDefeat(mockGameState);
      
      expect(result.isDefeat).toBe(true);
      expect(result.triggeredConditions).toHaveLength(1);
      expect(result.triggeredConditions[0].id).toBe('turn-limit');
    });

    it('敗北条件が登録されていない場合、敗北と判定しない', () => {
      const result = manager.checkDefeat(mockGameState);
      
      expect(result.isDefeat).toBe(false);
      expect(result.message).toContain('No defeat conditions registered');
    });

    it('敗北時にdefeat-triggeredイベントを発行する', () => {
      const eventSpy = vi.fn();
      manager.on('defeat-triggered', eventSpy);

      const conditions: DefeatCondition[] = [
        {
          id: 'all-defeated',
          type: DefeatConditionType.ALL_UNITS_DEFEATED,
          description: '全ユニットが撃破された',
          evaluate: () => true,
        },
      ];

      manager.registerDefeatConditions(conditions);
      manager.checkDefeat(mockGameState);
      
      expect(eventSpy).toHaveBeenCalled();
    });

    it('条件評価中にエラーが発生した場合、その条件を無視する', () => {
      const conditions: DefeatCondition[] = [
        {
          id: 'all-defeated',
          type: DefeatConditionType.ALL_UNITS_DEFEATED,
          description: '全ユニットが撃破された',
          evaluate: () => {
            throw new Error('Evaluation error');
          },
        },
      ];

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      manager.registerDefeatConditions(conditions);
      const result = manager.checkDefeat(mockGameState);
      
      expect(result.isDefeat).toBe(false);
      expect(result.triggeredConditions).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('evaluateCondition', () => {
    it('条件を正しく評価できる', () => {
      const condition: VictoryCondition = {
        id: 'test',
        type: VictoryConditionType.CUSTOM,
        description: 'テスト条件',
        isRequired: true,
        evaluate: (state: GameState) => state.currentTurn > 5,
      };

      mockGameState.currentTurn = 10;
      const result = manager.evaluateCondition(condition, mockGameState);
      
      expect(result).toBe(true);
    });

    it('条件が満たされていない場合、falseを返す', () => {
      const condition: VictoryCondition = {
        id: 'test',
        type: VictoryConditionType.CUSTOM,
        description: 'テスト条件',
        isRequired: true,
        evaluate: (state: GameState) => state.currentTurn > 5,
      };

      mockGameState.currentTurn = 3;
      const result = manager.evaluateCondition(condition, mockGameState);
      
      expect(result).toBe(false);
    });

    it('不正な条件の場合、falseを返す', () => {
      const invalidCondition = null as any;
      
      const result = manager.evaluateCondition(invalidCondition, mockGameState);
      
      expect(result).toBe(false);
    });

    it('評価関数がない条件の場合、falseを返す', () => {
      const condition = {
        id: 'test',
        type: VictoryConditionType.CUSTOM,
        description: 'テスト条件',
        isRequired: true,
        // evaluate が欠けている
      } as VictoryCondition;
      
      const result = manager.evaluateCondition(condition, mockGameState);
      
      expect(result).toBe(false);
    });

    it('評価中にエラーが発生した場合、falseを返す', () => {
      const condition: VictoryCondition = {
        id: 'test',
        type: VictoryConditionType.CUSTOM,
        description: 'テスト条件',
        isRequired: true,
        evaluate: () => {
          throw new Error('Evaluation error');
        },
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = manager.evaluateCondition(condition, mockGameState);
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('handleGameResult', () => {
    it('勝利結果を処理する', async () => {
      const eventSpy = vi.fn();
      manager.on('handle-victory', eventSpy);

      const result = {
        isVictory: true,
        timestamp: Date.now(),
      };

      await manager.handleGameResult(result);
      
      expect(eventSpy).toHaveBeenCalledWith(result);
    });

    it('敗北結果を処理する', async () => {
      const eventSpy = vi.fn();
      manager.on('handle-defeat', eventSpy);

      const result = {
        isVictory: false,
        timestamp: Date.now(),
      };

      await manager.handleGameResult(result);
      
      expect(eventSpy).toHaveBeenCalledWith(result);
    });

    it('game-resultイベントを発行する', async () => {
      const eventSpy = vi.fn();
      manager.on('game-result', eventSpy);

      const result = {
        isVictory: true,
        timestamp: Date.now(),
      };

      await manager.handleGameResult(result);
      
      expect(eventSpy).toHaveBeenCalledWith(result);
    });
  });

  describe('getLastVictoryCheck', () => {
    it('最後の勝利判定結果を取得できる', () => {
      const conditions: VictoryCondition[] = [
        {
          id: 'defeat-boss',
          type: VictoryConditionType.DEFEAT_BOSS,
          description: 'ボスを撃破する',
          isRequired: true,
          evaluate: () => true,
        },
      ];

      manager.registerVictoryConditions(conditions);
      manager.checkVictory(mockGameState);
      
      const lastCheck = manager.getLastVictoryCheck();
      expect(lastCheck).not.toBeNull();
      expect(lastCheck?.isVictory).toBe(true);
    });

    it('判定を実行していない場合、nullを返す', () => {
      const lastCheck = manager.getLastVictoryCheck();
      expect(lastCheck).toBeNull();
    });
  });

  describe('getLastDefeatCheck', () => {
    it('最後の敗北判定結果を取得できる', () => {
      const conditions: DefeatCondition[] = [
        {
          id: 'all-defeated',
          type: DefeatConditionType.ALL_UNITS_DEFEATED,
          description: '全ユニットが撃破された',
          evaluate: () => true,
        },
      ];

      manager.registerDefeatConditions(conditions);
      manager.checkDefeat(mockGameState);
      
      const lastCheck = manager.getLastDefeatCheck();
      expect(lastCheck).not.toBeNull();
      expect(lastCheck?.isDefeat).toBe(true);
    });

    it('判定を実行していない場合、nullを返す', () => {
      const lastCheck = manager.getLastDefeatCheck();
      expect(lastCheck).toBeNull();
    });
  });

  describe('clearAllConditions', () => {
    it('すべての条件をクリアできる', () => {
      const victoryConditions: VictoryCondition[] = [
        {
          id: 'defeat-boss',
          type: VictoryConditionType.DEFEAT_BOSS,
          description: 'ボスを撃破する',
          isRequired: true,
          evaluate: () => true,
        },
      ];

      const defeatConditions: DefeatCondition[] = [
        {
          id: 'all-defeated',
          type: DefeatConditionType.ALL_UNITS_DEFEATED,
          description: '全ユニットが撃破された',
          evaluate: () => false,
        },
      ];

      manager.registerVictoryConditions(victoryConditions);
      manager.registerDefeatConditions(defeatConditions);
      manager.checkVictory(mockGameState);
      manager.checkDefeat(mockGameState);

      manager.clearAllConditions();
      
      expect(manager.getVictoryConditions()).toHaveLength(0);
      expect(manager.getDefeatConditions()).toHaveLength(0);
      expect(manager.getLastVictoryCheck()).toBeNull();
      expect(manager.getLastDefeatCheck()).toBeNull();
    });

    it('conditions-clearedイベントを発行する', () => {
      const eventSpy = vi.fn();
      manager.on('conditions-cleared', eventSpy);

      manager.clearAllConditions();
      
      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('リソースを正しく解放する', () => {
      const victoryConditions: VictoryCondition[] = [
        {
          id: 'defeat-boss',
          type: VictoryConditionType.DEFEAT_BOSS,
          description: 'ボスを撃破する',
          isRequired: true,
          evaluate: () => true,
        },
      ];

      manager.registerVictoryConditions(victoryConditions);
      
      const eventSpy = vi.fn();
      manager.on('test-event', eventSpy);

      manager.destroy();
      
      expect(manager.getVictoryConditions()).toHaveLength(0);
      
      // イベントリスナーが削除されていることを確認
      manager.emit('test-event');
      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('条件の一貫性', () => {
    it('同じゲーム状態で複数回判定しても同じ結果を返す', () => {
      const conditions: VictoryCondition[] = [
        {
          id: 'defeat-boss',
          type: VictoryConditionType.DEFEAT_BOSS,
          description: 'ボスを撃破する',
          isRequired: true,
          evaluate: () => true,
        },
      ];

      manager.registerVictoryConditions(conditions);
      
      const result1 = manager.checkVictory(mockGameState);
      const result2 = manager.checkVictory(mockGameState);
      
      expect(result1.isVictory).toBe(result2.isVictory);
      expect(result1.satisfiedConditions.length).toBe(result2.satisfiedConditions.length);
    });

    it('勝利条件と敗北条件は独立して判定される', () => {
      const victoryConditions: VictoryCondition[] = [
        {
          id: 'defeat-boss',
          type: VictoryConditionType.DEFEAT_BOSS,
          description: 'ボスを撃破する',
          isRequired: true,
          evaluate: () => true,
        },
      ];

      const defeatConditions: DefeatCondition[] = [
        {
          id: 'all-defeated',
          type: DefeatConditionType.ALL_UNITS_DEFEATED,
          description: '全ユニットが撃破された',
          evaluate: () => false,
        },
      ];

      manager.registerVictoryConditions(victoryConditions);
      manager.registerDefeatConditions(defeatConditions);
      
      const victoryResult = manager.checkVictory(mockGameState);
      const defeatResult = manager.checkDefeat(mockGameState);
      
      expect(victoryResult.isVictory).toBe(true);
      expect(defeatResult.isDefeat).toBe(false);
    });
  });
});
