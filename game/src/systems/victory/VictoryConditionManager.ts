import Phaser from 'phaser';
import {
  VictoryCondition,
  DefeatCondition,
  VictoryCheckResult,
  DefeatCheckResult,
  GameResult,
  Condition,
} from '../../types/victory';
import { GameState } from '../../types/gameplay';

/**
 * VictoryConditionManager
 * 
 * 勝利・敗北条件の管理と判定を行うクラス
 * ステージの勝利条件と敗北条件を登録し、ゲーム状態に基づいて判定を実行する
 */
export class VictoryConditionManager extends Phaser.Events.EventEmitter {
  private victoryConditions: VictoryCondition[] = [];
  private defeatConditions: DefeatCondition[] = [];
  private lastVictoryCheck: VictoryCheckResult | null = null;
  private lastDefeatCheck: DefeatCheckResult | null = null;

  constructor() {
    super();
  }

  /**
   * 勝利条件を登録
   * @param conditions 登録する勝利条件の配列
   */
  registerVictoryConditions(conditions: VictoryCondition[]): void {
    if (!conditions || conditions.length === 0) {
      console.warn('VictoryConditionManager: No victory conditions provided');
      return;
    }

    // 条件の検証
    for (const condition of conditions) {
      if (!this.validateCondition(condition)) {
        console.error('VictoryConditionManager: Invalid victory condition', condition);
        throw new Error(`Invalid victory condition: ${condition.id}`);
      }
    }

    this.victoryConditions = [...conditions];
    this.emit('victory-conditions-registered', this.victoryConditions);
    
    console.log(`VictoryConditionManager: Registered ${this.victoryConditions.length} victory conditions`);
  }

  /**
   * 敗北条件を登録
   * @param conditions 登録する敗北条件の配列
   */
  registerDefeatConditions(conditions: DefeatCondition[]): void {
    if (!conditions || conditions.length === 0) {
      console.warn('VictoryConditionManager: No defeat conditions provided');
      return;
    }

    // 条件の検証
    for (const condition of conditions) {
      if (!this.validateCondition(condition)) {
        console.error('VictoryConditionManager: Invalid defeat condition', condition);
        throw new Error(`Invalid defeat condition: ${condition.id}`);
      }
    }

    this.defeatConditions = [...conditions];
    this.emit('defeat-conditions-registered', this.defeatConditions);
    
    console.log(`VictoryConditionManager: Registered ${this.defeatConditions.length} defeat conditions`);
  }

  /**
   * 勝利判定を実行
   * @param gameState 現在のゲーム状態
   * @returns 勝利判定結果
   */
  checkVictory(gameState: GameState): VictoryCheckResult {
    if (this.victoryConditions.length === 0) {
      console.warn('VictoryConditionManager: No victory conditions registered');
      return {
        isVictory: false,
        satisfiedConditions: [],
        unsatisfiedConditions: [],
        message: 'No victory conditions registered',
      };
    }

    const satisfiedConditions: VictoryCondition[] = [];
    const unsatisfiedConditions: VictoryCondition[] = [];

    // 各勝利条件を評価
    for (const condition of this.victoryConditions) {
      try {
        const isSatisfied = this.evaluateCondition(condition, gameState);
        
        if (isSatisfied) {
          satisfiedConditions.push(condition);
        } else {
          unsatisfiedConditions.push(condition);
        }
      } catch (error) {
        console.error(`VictoryConditionManager: Error evaluating victory condition ${condition.id}`, error);
        unsatisfiedConditions.push(condition);
      }
    }

    // 必須条件がすべて満たされているかチェック
    const requiredConditions = this.victoryConditions.filter(c => c.isRequired);
    const satisfiedRequiredConditions = satisfiedConditions.filter(c => c.isRequired);
    const isVictory = requiredConditions.length > 0 && 
                      satisfiedRequiredConditions.length === requiredConditions.length;

    const result: VictoryCheckResult = {
      isVictory,
      satisfiedConditions,
      unsatisfiedConditions,
      message: isVictory 
        ? 'All required victory conditions satisfied' 
        : 'Victory conditions not yet satisfied',
    };

    this.lastVictoryCheck = result;

    if (isVictory) {
      this.emit('victory-achieved', result);
      console.log('VictoryConditionManager: Victory achieved!');
    }

    return result;
  }

  /**
   * 敗北判定を実行
   * @param gameState 現在のゲーム状態
   * @returns 敗北判定結果
   */
  checkDefeat(gameState: GameState): DefeatCheckResult {
    if (this.defeatConditions.length === 0) {
      console.warn('VictoryConditionManager: No defeat conditions registered');
      return {
        isDefeat: false,
        triggeredConditions: [],
        message: 'No defeat conditions registered',
      };
    }

    const triggeredConditions: DefeatCondition[] = [];

    // 各敗北条件を評価（いずれか1つでも満たされたら敗北）
    for (const condition of this.defeatConditions) {
      try {
        const isTriggered = this.evaluateCondition(condition, gameState);
        
        if (isTriggered) {
          triggeredConditions.push(condition);
        }
      } catch (error) {
        console.error(`VictoryConditionManager: Error evaluating defeat condition ${condition.id}`, error);
      }
    }

    const isDefeat = triggeredConditions.length > 0;

    const result: DefeatCheckResult = {
      isDefeat,
      triggeredConditions,
      message: isDefeat 
        ? `Defeat: ${triggeredConditions[0].description}` 
        : 'No defeat conditions triggered',
    };

    this.lastDefeatCheck = result;

    if (isDefeat) {
      this.emit('defeat-triggered', result);
      console.log('VictoryConditionManager: Defeat triggered!', triggeredConditions[0].description);
    }

    return result;
  }

  /**
   * 条件を評価
   * @param condition 評価する条件
   * @param gameState 現在のゲーム状態
   * @returns 条件が満たされているかどうか
   */
  evaluateCondition(condition: Condition, gameState: GameState): boolean {
    if (!condition || !condition.evaluate) {
      console.error('VictoryConditionManager: Invalid condition or missing evaluate function', condition);
      return false;
    }

    try {
      return condition.evaluate(gameState);
    } catch (error) {
      console.error(`VictoryConditionManager: Error evaluating condition ${condition.id}`, error);
      return false;
    }
  }

  /**
   * ゲーム結果を処理
   * @param result ゲーム結果
   */
  async handleGameResult(result: GameResult): Promise<void> {
    this.emit('game-result', result);
    
    if (result.isVictory) {
      console.log('VictoryConditionManager: Handling victory result');
      this.emit('handle-victory', result);
    } else {
      console.log('VictoryConditionManager: Handling defeat result');
      this.emit('handle-defeat', result);
    }
  }

  /**
   * 条件の妥当性を検証
   * @param condition 検証する条件
   * @returns 条件が妥当かどうか
   */
  private validateCondition(condition: Condition): boolean {
    if (!condition) {
      return false;
    }

    if (!condition.id || typeof condition.id !== 'string') {
      console.error('VictoryConditionManager: Condition missing valid id', condition);
      return false;
    }

    if (!condition.type || typeof condition.type !== 'string') {
      console.error('VictoryConditionManager: Condition missing valid type', condition);
      return false;
    }

    if (!condition.description || typeof condition.description !== 'string') {
      console.error('VictoryConditionManager: Condition missing valid description', condition);
      return false;
    }

    if (!condition.evaluate || typeof condition.evaluate !== 'function') {
      console.error('VictoryConditionManager: Condition missing valid evaluate function', condition);
      return false;
    }

    return true;
  }

  /**
   * 登録されている勝利条件を取得
   * @returns 勝利条件の配列
   */
  getVictoryConditions(): VictoryCondition[] {
    return [...this.victoryConditions];
  }

  /**
   * 登録されている敗北条件を取得
   * @returns 敗北条件の配列
   */
  getDefeatConditions(): DefeatCondition[] {
    return [...this.defeatConditions];
  }

  /**
   * 最後の勝利判定結果を取得
   * @returns 最後の勝利判定結果
   */
  getLastVictoryCheck(): VictoryCheckResult | null {
    return this.lastVictoryCheck;
  }

  /**
   * 最後の敗北判定結果を取得
   * @returns 最後の敗北判定結果
   */
  getLastDefeatCheck(): DefeatCheckResult | null {
    return this.lastDefeatCheck;
  }

  /**
   * すべての条件をクリア
   */
  clearAllConditions(): void {
    this.victoryConditions = [];
    this.defeatConditions = [];
    this.lastVictoryCheck = null;
    this.lastDefeatCheck = null;
    this.emit('conditions-cleared');
    console.log('VictoryConditionManager: All conditions cleared');
  }

  /**
   * リソースの解放
   */
  destroy(): void {
    this.clearAllConditions();
    this.removeAllListeners();
  }
}
