/**
 * RoseEssenceGrant - 薔薇の力付与システム
 * 
 * ボス撃破時に獲得する薔薇の力の計算と付与を管理します。
 * 難易度修正、初回ボーナス、JobSystemとの連携を行います。
 * 
 * 要件4.4, 4.9, 7.1, 7.2, 7.3に対応
 */

import { EventEmitter } from 'events';
import { BossData, BossType, BossDifficulty, RoseEssenceType } from '../../types/boss';
import { BossReward } from '../../types/reward';

/**
 * 薔薇の力付与設定
 */
export interface RoseEssenceGrantConfig {
  // 難易度修正倍率
  difficultyModifiers: {
    [BossDifficulty.EASY]: number;
    [BossDifficulty.NORMAL]: number;
    [BossDifficulty.HARD]: number;
    [BossDifficulty.EXTREME]: number;
  };

  // ボス種別修正倍率
  bossTypeModifiers: {
    [BossType.MINOR_BOSS]: number;
    [BossType.MAJOR_BOSS]: number;
    [BossType.CHAPTER_BOSS]: number;
    [BossType.FINAL_BOSS]: number;
  };

  // 初回撃破ボーナス倍率
  firstTimeBonus: number;

  // 最小付与量
  minimumAmount: number;

  // 最大付与量
  maximumAmount: number;

  // デバッグモード
  debugMode: boolean;
}

/**
 * 薔薇の力計算結果
 */
export interface RoseEssenceCalculation {
  baseAmount: number; // 基本量
  difficultyModifier: number; // 難易度修正
  bossTypeModifier: number; // ボス種別修正
  firstTimeBonus: number; // 初回ボーナス
  finalAmount: number; // 最終付与量
  breakdown: string[]; // 計算内訳
}

/**
 * 薔薇の力付与結果
 */
export interface RoseEssenceGrantResult {
  success: boolean;
  bossId: string;
  bossName: string;
  amount: number;
  type: RoseEssenceType;
  calculation: RoseEssenceCalculation;
  isFirstTime: boolean;
  timestamp: number;
  error?: string;
}

/**
 * RoseEssenceGrantクラス
 */
export class RoseEssenceGrant extends EventEmitter {
  private config: RoseEssenceGrantConfig;
  private defeatedBosses: Set<string>; // 撃破済みボスID
  private jobSystem?: any; // JobSystemへの参照

  private static readonly DEFAULT_CONFIG: RoseEssenceGrantConfig = {
    difficultyModifiers: {
      [BossDifficulty.EASY]: 0.8,
      [BossDifficulty.NORMAL]: 1.0,
      [BossDifficulty.HARD]: 1.3,
      [BossDifficulty.EXTREME]: 1.6,
    },
    bossTypeModifiers: {
      [BossType.MINOR_BOSS]: 1.0,
      [BossType.MAJOR_BOSS]: 1.5,
      [BossType.CHAPTER_BOSS]: 2.0,
      [BossType.FINAL_BOSS]: 3.0,
    },
    firstTimeBonus: 1.5, // 初回は1.5倍
    minimumAmount: 1,
    maximumAmount: 1000,
    debugMode: false,
  };

  /**
   * RoseEssenceGrantインスタンスを作成
   * @param config 設定
   */
  constructor(config?: Partial<RoseEssenceGrantConfig>) {
    super();

    this.config = { ...RoseEssenceGrant.DEFAULT_CONFIG, ...config };
    this.defeatedBosses = new Set<string>();
  }

  /**
   * JobSystemへの参照を設定
   * 要件7.2: Job_Systemに薔薇の力を付与する
   * 
   * @param jobSystem JobSystemインスタンス
   */
  public setJobSystem(jobSystem: any): void {
    this.jobSystem = jobSystem;

    if (this.config.debugMode) {
      console.log('JobSystem reference set in RoseEssenceGrant');
    }
  }

  /**
   * 薔薇の力を付与
   * 要件7.1: 薔薇の力の量を計算する
   * 要件7.2: Job_Systemに薔薇の力を付与する
   * 要件7.3: ランクアップ可能なキャラクターを通知する
   * 
   * @param bossData ボスデータ
   * @param position エフェクト表示位置（オプション）
   * @returns 付与結果
   */
  public async grantRoseEssence(
    bossData: BossData,
    position?: { x: number; y: number }
  ): Promise<RoseEssenceGrantResult> {
    try {
      // 初回撃破判定
      const isFirstTime = !this.defeatedBosses.has(bossData.id);

      // 薔薇の力の量を計算
      const calculation = this.calculateRoseEssenceAmount(bossData, isFirstTime);

      // JobSystemに薔薇の力を付与
      if (this.jobSystem) {
        await this.jobSystem.awardRoseEssence(
          calculation.finalAmount,
          `boss_defeat:${bossData.id}`,
          position
        );

        // ランクアップ可能なキャラクターを取得
        const rankUpCandidates = this.jobSystem.getRankUpCandidates?.() || [];

        if (rankUpCandidates.length > 0) {
          // ランクアップ可能通知を発行
          this.emit('rank_up_candidates_available', {
            bossId: bossData.id,
            bossName: bossData.name,
            roseEssenceAmount: calculation.finalAmount,
            candidates: rankUpCandidates,
          });

          if (this.config.debugMode) {
            console.log(`ランクアップ可能キャラクター: ${rankUpCandidates.length}人`);
          }
        }
      } else {
        console.warn('JobSystem not set. Rose essence not awarded.');
      }

      // 撃破済みボスとして記録
      this.defeatedBosses.add(bossData.id);

      const result: RoseEssenceGrantResult = {
        success: true,
        bossId: bossData.id,
        bossName: bossData.name,
        amount: calculation.finalAmount,
        type: bossData.roseEssenceType,
        calculation,
        isFirstTime,
        timestamp: Date.now(),
      };

      this.emit('rose_essence_granted', result);

      if (this.config.debugMode) {
        console.log('薔薇の力付与完了:', result);
        console.log('計算内訳:', calculation.breakdown);
      }

      return result;

    } catch (error) {
      console.error('薔薇の力付与中にエラー:', error);

      return {
        success: false,
        bossId: bossData.id,
        bossName: bossData.name,
        amount: 0,
        type: bossData.roseEssenceType,
        calculation: {
          baseAmount: 0,
          difficultyModifier: 0,
          bossTypeModifier: 0,
          firstTimeBonus: 0,
          finalAmount: 0,
          breakdown: [],
        },
        isFirstTime: false,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 薔薇の力の量を計算
   * 要件7.1: 薔薇の力の量を計算する
   * 要件4.4: 薔薇の力を報酬に含める
   * 
   * @param bossData ボスデータ
   * @param isFirstTime 初回撃破かどうか
   * @returns 計算結果
   */
  public calculateRoseEssenceAmount(
    bossData: BossData,
    isFirstTime: boolean = false
  ): RoseEssenceCalculation {
    const breakdown: string[] = [];

    // 基本量
    const baseAmount = bossData.roseEssenceAmount;
    breakdown.push(`基本量: ${baseAmount}`);

    // 難易度修正を適用
    const difficultyModifier = this.applyDifficultyModifier(baseAmount, bossData.difficulty);
    breakdown.push(
      `難易度修正 (${bossData.difficulty}): ${baseAmount} × ${this.config.difficultyModifiers[bossData.difficulty]} = ${difficultyModifier}`
    );

    // ボス種別修正を適用
    const bossTypeModifier = this.applyBossTypeModifier(difficultyModifier, bossData.bossType);
    breakdown.push(
      `ボス種別修正 (${bossData.bossType}): ${difficultyModifier} × ${this.config.bossTypeModifiers[bossData.bossType]} = ${bossTypeModifier}`
    );

    // 初回ボーナスを適用
    let finalAmount = bossTypeModifier;
    let firstTimeBonus = 0;

    if (isFirstTime) {
      firstTimeBonus = this.applyFirstTimeBonus(bossTypeModifier);
      finalAmount = firstTimeBonus;
      breakdown.push(
        `初回ボーナス: ${bossTypeModifier} × ${this.config.firstTimeBonus} = ${firstTimeBonus}`
      );
    }

    // 最小値・最大値制限を適用
    finalAmount = Math.max(this.config.minimumAmount, Math.min(this.config.maximumAmount, finalAmount));
    finalAmount = Math.floor(finalAmount); // 整数に丸める

    if (finalAmount !== (isFirstTime ? firstTimeBonus : bossTypeModifier)) {
      breakdown.push(`制限適用後: ${finalAmount}`);
    }

    return {
      baseAmount,
      difficultyModifier,
      bossTypeModifier,
      firstTimeBonus: isFirstTime ? firstTimeBonus : 0,
      finalAmount,
      breakdown,
    };
  }

  /**
   * 難易度修正を適用
   * 要件4.9: 難易度による報酬調整
   * 
   * @param baseAmount 基本量
   * @param difficulty 難易度
   * @returns 修正後の量
   */
  public applyDifficultyModifier(baseAmount: number, difficulty: BossDifficulty): number {
    const modifier = this.config.difficultyModifiers[difficulty];
    return baseAmount * modifier;
  }

  /**
   * ボス種別修正を適用
   * 
   * @param amount 現在の量
   * @param bossType ボス種別
   * @returns 修正後の量
   */
  public applyBossTypeModifier(amount: number, bossType: BossType): number {
    const modifier = this.config.bossTypeModifiers[bossType];
    return amount * modifier;
  }

  /**
   * 初回ボーナスを適用
   * 要件7.3: 初回撃破時の特別ボーナス
   * 
   * @param amount 現在の量
   * @returns ボーナス適用後の量
   */
  public applyFirstTimeBonus(amount: number): number {
    return amount * this.config.firstTimeBonus;
  }

  /**
   * ボス撃破報酬を作成
   * 要件4.4: ボス撃破報酬の構造化
   * 
   * @param bossData ボスデータ
   * @param calculation 計算結果
   * @returns ボス報酬
   */
  public createBossReward(bossData: BossData, calculation: RoseEssenceCalculation): BossReward {
    return {
      bossId: bossData.id,
      bossName: bossData.name,
      roseEssenceAmount: calculation.finalAmount,
      roseEssenceType: bossData.roseEssenceType,
      experienceBonus: bossData.experienceReward,
    };
  }

  /**
   * ボスが初回撃破かどうかを判定
   * 
   * @param bossId ボスID
   * @returns 初回撃破かどうか
   */
  public isFirstTimeDefeat(bossId: string): boolean {
    return !this.defeatedBosses.has(bossId);
  }

  /**
   * 撃破済みボスを記録
   * 
   * @param bossId ボスID
   */
  public markBossDefeated(bossId: string): void {
    this.defeatedBosses.add(bossId);

    if (this.config.debugMode) {
      console.log(`ボス撃破記録: ${bossId}`);
    }
  }

  /**
   * 撃破済みボスをクリア（テスト用）
   */
  public clearDefeatedBosses(): void {
    this.defeatedBosses.clear();

    if (this.config.debugMode) {
      console.log('撃破済みボス記録をクリアしました');
    }
  }

  /**
   * 撃破済みボス一覧を取得
   * 
   * @returns 撃破済みボスID配列
   */
  public getDefeatedBosses(): string[] {
    return Array.from(this.defeatedBosses);
  }

  /**
   * 設定を更新
   * 
   * @param newConfig 新しい設定
   */
  public updateConfig(newConfig: Partial<RoseEssenceGrantConfig>): void {
    this.config = { ...this.config, ...newConfig };

    this.emit('config_updated', this.config);

    if (this.config.debugMode) {
      console.log('RoseEssenceGrant設定更新:', this.config);
    }
  }

  /**
   * 現在の設定を取得
   * 
   * @returns 現在の設定
   */
  public getConfig(): RoseEssenceGrantConfig {
    return { ...this.config };
  }

  /**
   * 撃破済みボスデータをエクスポート
   * 
   * @returns 撃破済みボスID配列
   */
  public exportDefeatedBosses(): string[] {
    return this.getDefeatedBosses();
  }

  /**
   * 撃破済みボスデータをインポート
   * 
   * @param defeatedBosses 撃破済みボスID配列
   */
  public importDefeatedBosses(defeatedBosses: string[]): void {
    this.defeatedBosses = new Set(defeatedBosses);

    if (this.config.debugMode) {
      console.log(`撃破済みボスデータをインポート: ${defeatedBosses.length}件`);
    }
  }

  /**
   * システムをリセット
   */
  public reset(): void {
    this.defeatedBosses.clear();
    this.removeAllListeners();

    if (this.config.debugMode) {
      console.log('RoseEssenceGrantをリセットしました');
    }
  }

  /**
   * リソースを破棄
   */
  public destroy(): void {
    this.reset();
    this.jobSystem = undefined;

    if (this.config.debugMode) {
      console.log('RoseEssenceGrantを破棄しました');
    }
  }
}
