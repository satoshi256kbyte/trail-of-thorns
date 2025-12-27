/**
 * ボス戦管理システム
 * ボスの登録、判定、撃破処理、薔薇の力計算、フェーズ変化を管理
 */

import Phaser from 'phaser';
import {
  BossData,
  BossDefeatResult,
  BossPhaseChangeEvent,
  RoseEssenceType,
  BossDifficulty,
} from '../../types/boss';
import { Unit } from '../../types/gameplay';

/**
 * ボスシステムエラー種別
 */
export enum BossSystemError {
  BOSS_NOT_FOUND = 'BOSS_NOT_FOUND',
  INVALID_BOSS_DATA = 'INVALID_BOSS_DATA',
  BOSS_ALREADY_REGISTERED = 'BOSS_ALREADY_REGISTERED',
  INVALID_UNIT = 'INVALID_UNIT',
  PHASE_CHANGE_FAILED = 'PHASE_CHANGE_FAILED',
  REWARD_CALCULATION_FAILED = 'REWARD_CALCULATION_FAILED',
}

/**
 * ボスシステムエラー結果
 */
export interface BossSystemErrorResult {
  success: boolean;
  error?: BossSystemError;
  message?: string;
  details?: any;
}

/**
 * ボス戦管理システムクラス
 */
export class BossSystem extends Phaser.Events.EventEmitter {
  private bossData: Map<string, BossData>;
  private bossUnits: Map<string, Unit>;

  constructor() {
    super();
    this.bossData = new Map();
    this.bossUnits = new Map();
  }

  /**
   * ボスを登録
   * @param unit ボスユニット
   * @param bossData ボスデータ
   * @returns 登録結果
   */
  registerBoss(unit: Unit, bossData: BossData): BossSystemErrorResult {
    try {
      // バリデーション
      if (!unit || !unit.id) {
        return {
          success: false,
          error: BossSystemError.INVALID_UNIT,
          message: 'Invalid unit provided',
        };
      }

      if (!bossData || !bossData.id) {
        return {
          success: false,
          error: BossSystemError.INVALID_BOSS_DATA,
          message: 'Invalid boss data provided',
        };
      }

      // 既に登録済みかチェック
      if (this.bossData.has(unit.id)) {
        return {
          success: false,
          error: BossSystemError.BOSS_ALREADY_REGISTERED,
          message: `Boss with ID ${unit.id} is already registered`,
        };
      }

      // ボスデータの検証
      if (!this.validateBossData(bossData)) {
        return {
          success: false,
          error: BossSystemError.INVALID_BOSS_DATA,
          message: 'Boss data validation failed',
        };
      }

      // ボスを登録
      this.bossData.set(unit.id, bossData);
      this.bossUnits.set(unit.id, unit);

      // イベント発行
      this.emit('boss-registered', {
        unitId: unit.id,
        bossData,
        timestamp: Date.now(),
      });

      return { success: true };
    } catch (error) {
      console.error('Error registering boss:', error);
      return {
        success: false,
        error: BossSystemError.INVALID_BOSS_DATA,
        message: 'Failed to register boss',
        details: error,
      };
    }
  }

  /**
   * ユニットがボスかどうか判定
   * @param unitId ユニットID
   * @returns ボスの場合true
   */
  isBoss(unitId: string): boolean {
    return this.bossData.has(unitId);
  }

  /**
   * ボスデータを取得
   * @param unitId ユニットID
   * @returns ボスデータ（存在しない場合null）
   */
  getBossData(unitId: string): BossData | null {
    return this.bossData.get(unitId) || null;
  }

  /**
   * ボス撃破処理
   * @param boss 撃破されたボスユニット
   * @returns 撃破結果
   */
  async handleBossDefeat(boss: Unit): Promise<BossDefeatResult> {
    try {
      // ボスデータ取得
      const bossData = this.getBossData(boss.id);
      if (!bossData) {
        throw new Error(`Boss data not found for unit ${boss.id}`);
      }

      // 薔薇の力を計算
      const roseEssenceAmount = this.calculateRoseEssenceReward(boss);

      // 撃破結果を作成
      const defeatResult: BossDefeatResult = {
        bossId: boss.id,
        bossName: bossData.name,
        roseEssenceAmount,
        roseEssenceType: bossData.roseEssenceType,
        experienceReward: bossData.experienceReward,
        additionalRewards: bossData.additionalRewards || [],
        timestamp: Date.now(),
      };

      // イベント発行
      this.emit('boss-defeated', defeatResult);

      // ボスデータをクリーンアップ
      this.bossData.delete(boss.id);
      this.bossUnits.delete(boss.id);

      return defeatResult;
    } catch (error) {
      console.error('Error handling boss defeat:', error);
      throw error;
    }
  }

  /**
   * 薔薇の力の報酬を計算
   * @param boss ボスユニット
   * @returns 薔薇の力の量
   */
  calculateRoseEssenceReward(boss: Unit): number {
    try {
      const bossData = this.getBossData(boss.id);
      if (!bossData) {
        throw new Error(`Boss data not found for unit ${boss.id}`);
      }

      // 基本報酬
      let reward = bossData.roseEssenceAmount;

      // 難易度による修正
      const difficultyMultiplier = this.getDifficultyMultiplier(bossData.difficulty);
      reward = Math.floor(reward * difficultyMultiplier);

      // 最小値保証
      reward = Math.max(1, reward);

      return reward;
    } catch (error) {
      console.error('Error calculating rose essence reward:', error);
      return 1; // デフォルト値
    }
  }

  /**
   * ボスフェーズ変化処理
   * @param boss ボスユニット
   * @param newPhase 新しいフェーズ番号
   * @returns フェーズ変化結果
   */
  handleBossPhaseChange(boss: Unit, newPhase: number): BossSystemErrorResult {
    try {
      const bossData = this.getBossData(boss.id);
      if (!bossData) {
        return {
          success: false,
          error: BossSystemError.BOSS_NOT_FOUND,
          message: `Boss data not found for unit ${boss.id}`,
        };
      }

      // フェーズの妥当性チェック
      if (newPhase < 1 || newPhase > bossData.phases.length) {
        return {
          success: false,
          error: BossSystemError.PHASE_CHANGE_FAILED,
          message: `Invalid phase number: ${newPhase}`,
        };
      }

      // 現在のフェーズを保存
      const previousPhase = bossData.currentPhase;

      // フェーズを更新
      bossData.currentPhase = newPhase;

      // HP割合を計算
      const hpPercentage = (boss.currentHP / boss.stats.maxHP) * 100;

      // フェーズ変化イベントを作成
      const phaseChangeEvent: BossPhaseChangeEvent = {
        bossId: boss.id,
        previousPhase,
        newPhase,
        hpPercentage,
        timestamp: Date.now(),
      };

      // イベント発行
      this.emit('boss-phase-changed', phaseChangeEvent);

      return { success: true };
    } catch (error) {
      console.error('Error handling boss phase change:', error);
      return {
        success: false,
        error: BossSystemError.PHASE_CHANGE_FAILED,
        message: 'Failed to change boss phase',
        details: error,
      };
    }
  }

  /**
   * ボスのHPに基づいてフェーズ変化をチェック
   * @param boss ボスユニット
   * @returns フェーズが変化した場合true
   */
  checkPhaseChange(boss: Unit): boolean {
    const bossData = this.getBossData(boss.id);
    if (!bossData) {
      return false;
    }

    const hpPercentage = (boss.currentHP / boss.stats.maxHP) * 100;
    const currentPhase = bossData.currentPhase;

    // 次のフェーズがあるかチェック
    if (currentPhase < bossData.phases.length) {
      const nextPhase = bossData.phases[currentPhase]; // 配列は0始まり
      if (hpPercentage <= nextPhase.hpThreshold) {
        // フェーズ変化を実行
        const result = this.handleBossPhaseChange(boss, currentPhase + 1);
        return result.success;
      }
    }

    return false;
  }

  /**
   * 全ボスをクリア
   */
  clearAllBosses(): void {
    this.bossData.clear();
    this.bossUnits.clear();
    this.emit('all-bosses-cleared');
  }

  /**
   * 登録されているボスの数を取得
   * @returns ボスの数
   */
  getBossCount(): number {
    return this.bossData.size;
  }

  /**
   * 全ボスデータを取得
   * @returns ボスデータの配列
   */
  getAllBossData(): BossData[] {
    return Array.from(this.bossData.values());
  }

  /**
   * ボスデータの検証
   * @param bossData 検証するボスデータ
   * @returns 有効な場合true
   */
  private validateBossData(bossData: BossData): boolean {
    // 必須フィールドのチェック
    if (!bossData.id || !bossData.name) {
      return false;
    }

    // 薔薇の力の量が正の数かチェック
    if (bossData.roseEssenceAmount <= 0) {
      return false;
    }

    // フェーズデータのチェック
    if (!Array.isArray(bossData.phases) || bossData.phases.length === 0) {
      return false;
    }

    // 現在のフェーズが有効範囲内かチェック
    if (bossData.currentPhase < 1 || bossData.currentPhase > bossData.phases.length) {
      return false;
    }

    // 経験値報酬が非負かチェック
    if (bossData.experienceReward < 0) {
      return false;
    }

    return true;
  }

  /**
   * 難易度による倍率を取得
   * @param difficulty ボス難易度
   * @returns 倍率
   */
  private getDifficultyMultiplier(difficulty: BossDifficulty): number {
    switch (difficulty) {
      case BossDifficulty.EASY:
        return 0.8;
      case BossDifficulty.NORMAL:
        return 1.0;
      case BossDifficulty.HARD:
        return 1.3;
      case BossDifficulty.EXTREME:
        return 1.6;
      default:
        return 1.0;
    }
  }

  /**
   * システムを破棄
   */
  destroy(): void {
    this.clearAllBosses();
    this.removeAllListeners();
  }
}
