/**
 * VictoryConditionDebugCommands
 * 
 * ボス戦・勝利条件システムのデバッグコマンドシステム
 * 開発者向けのテスト・デバッグコマンドを提供
 * 
 * 要件14.1-14.6: デバッグ・開発支援機能
 */

import { VictoryConditionSystem } from '../systems/victory/VictoryConditionSystem';
import { ObjectiveManager } from '../systems/victory/ObjectiveManager';
import { BossSystem } from '../systems/victory/BossSystem';
import { RewardCalculator } from '../systems/victory/RewardCalculator';
import { Unit } from '../types/gameplay';
import { BossData } from '../types/boss';
import { StageRewards } from '../types/reward';

/**
 * コンソールコマンドの結果
 */
export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * ボス戦・勝利条件デバッグコマンドシステム
 * 要件14: デバッグ・開発支援
 */
export class VictoryConditionDebugCommands {
  private victoryConditionSystem?: VictoryConditionSystem;
  private rewardMultiplier: number = 1.0;

  constructor(victoryConditionSystem?: VictoryConditionSystem) {
    this.victoryConditionSystem = victoryConditionSystem;
    this.initializeConsoleCommands();
  }

  /**
   * コンソールコマンドの初期化
   */
  private initializeConsoleCommands(): void {
    if (typeof window === 'undefined') return;

    // グローバルオブジェクトに勝利条件コマンドを追加
    (window as any).victoryCommands = {
      // 勝利・敗北強制
      forceVictory: () => this.forceVictory(),
      forceDefeat: (reason?: string) => this.forceDefeat(reason),

      // ボス操作
      defeatBoss: (bossId: string) => this.defeatBoss(bossId),
      listBosses: () => this.listBosses(),
      showBossInfo: (bossId: string) => this.showBossInfo(bossId),

      // 報酬調整
      setRewardMultiplier: (multiplier: number) => this.setRewardMultiplier(multiplier),
      getRewardMultiplier: () => this.getRewardMultiplier(),
      previewRewards: () => this.previewRewards(),

      // 目標管理
      showObjectiveStatus: () => this.showObjectiveStatus(),
      completeObjective: (objectiveId: string) => this.completeObjective(objectiveId),
      listObjectives: () => this.listObjectives(),

      // システム情報
      getSystemStatus: () => this.getSystemStatus(),
      getPerformance: () => this.getPerformance(),
      clearCache: () => this.clearCache(),

      // ヘルプ
      help: () => this.showHelp(),
    };

    console.log(
      'ボス戦・勝利条件コンソールコマンドが利用可能です。victoryCommands.help() でヘルプを表示できます。'
    );
  }

  /**
   * VictoryConditionSystemへの参照を設定
   */
  public setVictoryConditionSystem(system: VictoryConditionSystem): void {
    this.victoryConditionSystem = system;
  }

  /**
   * 勝利を強制
   * 要件14.4: コンソールコマンドで勝利・敗北を強制できる
   */
  private forceVictory(): CommandResult {
    if (!this.victoryConditionSystem) {
      return {
        success: false,
        message: 'VictoryConditionSystemが設定されていません',
      };
    }

    if (!this.victoryConditionSystem.isSystemInitialized()) {
      return {
        success: false,
        message: 'システムが初期化されていません',
      };
    }

    if (this.victoryConditionSystem.isStageCompleted()) {
      return {
        success: false,
        message: 'ステージは既にクリアされています',
      };
    }

    if (this.victoryConditionSystem.isStageFailedStatus()) {
      return {
        success: false,
        message: 'ステージは既に失敗しています',
      };
    }

    try {
      // すべての目標を強制的に完了
      const objectiveManager = this.victoryConditionSystem.getObjectiveManager();
      const objectives = objectiveManager.getAllObjectives();
      
      for (const objective of objectives) {
        if (!objective.isComplete) {
          objectiveManager.completeObjective(objective.id);
        }
      }

      // 勝利判定を実行
      const victoryResult = this.victoryConditionSystem.checkVictoryConditions();

      if (victoryResult.isVictory) {
        return {
          success: true,
          message: '勝利を強制しました',
          data: {
            satisfiedConditions: victoryResult.satisfiedConditions.length,
            completedObjectives: objectives.filter(o => o.isComplete).length,
          },
        };
      } else {
        return {
          success: false,
          message: '勝利条件を満たせませんでした',
          data: victoryResult,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 敗北を強制
   * 要件14.4: コンソールコマンドで勝利・敗北を強制できる
   */
  private forceDefeat(reason: string = 'デバッグコマンドによる強制敗北'): CommandResult {
    if (!this.victoryConditionSystem) {
      return {
        success: false,
        message: 'VictoryConditionSystemが設定されていません',
      };
    }

    if (!this.victoryConditionSystem.isSystemInitialized()) {
      return {
        success: false,
        message: 'システムが初期化されていません',
      };
    }

    if (this.victoryConditionSystem.isStageCompleted()) {
      return {
        success: false,
        message: 'ステージは既にクリアされています',
      };
    }

    if (this.victoryConditionSystem.isStageFailedStatus()) {
      return {
        success: false,
        message: 'ステージは既に失敗しています',
      };
    }

    try {
      // 敗北判定を実行
      const defeatResult = this.victoryConditionSystem.checkDefeatConditions();

      return {
        success: true,
        message: `敗北を強制しました: ${reason}`,
        data: {
          reason,
          triggeredConditions: defeatResult.triggeredConditions.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * ボスを即座に撃破
   * 要件14.5: コンソールコマンドでボスを即座に撃破できる
   */
  private defeatBoss(bossId: string): CommandResult {
    if (!this.victoryConditionSystem) {
      return {
        success: false,
        message: 'VictoryConditionSystemが設定されていません',
      };
    }

    if (!this.victoryConditionSystem.isSystemInitialized()) {
      return {
        success: false,
        message: 'システムが初期化されていません',
      };
    }

    try {
      const bossSystem = this.victoryConditionSystem.getBossSystem();
      
      // ボスが存在するか確認
      if (!bossSystem.isBoss(bossId)) {
        return {
          success: false,
          message: `ボス '${bossId}' が見つかりません`,
        };
      }

      // ボスデータを取得
      const bossData = bossSystem.getBossData(bossId);
      if (!bossData) {
        return {
          success: false,
          message: `ボスデータ '${bossId}' が見つかりません`,
        };
      }

      // ダミーのボスユニットを作成
      const bossUnit: Unit = {
        id: bossId,
        name: bossData.name,
        position: { x: 0, y: 0 },
        stats: {
          level: 1,
          maxHP: 0,
          maxMP: 0,
          attack: 0,
          defense: 0,
          speed: 0,
          movement: 0,
        },
        currentHP: 0,
        currentMP: 0,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
      };

      // ボス撃破処理を実行
      this.victoryConditionSystem.handleBossDefeat(bossUnit).then(result => {
        console.log('Boss defeat result:', result);
      });

      return {
        success: true,
        message: `ボス '${bossData.name}' を撃破しました`,
        data: {
          bossId,
          bossName: bossData.name,
          roseEssence: bossData.roseEssenceAmount,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * ボス一覧を表示
   * 要件14.2: ボス情報を詳細表示する
   */
  private listBosses(): CommandResult {
    if (!this.victoryConditionSystem) {
      return {
        success: false,
        message: 'VictoryConditionSystemが設定されていません',
      };
    }

    if (!this.victoryConditionSystem.isSystemInitialized()) {
      return {
        success: false,
        message: 'システムが初期化されていません',
      };
    }

    try {
      const bossSystem = this.victoryConditionSystem.getBossSystem();
      const allBosses = bossSystem.getAllBosses();

      const bossList = allBosses.map(boss => ({
        id: boss.id,
        name: boss.name,
        type: boss.bossType,
        difficulty: boss.difficulty,
        roseEssence: boss.roseEssenceAmount,
        phases: boss.phases.length,
      }));

      return {
        success: true,
        message: `${bossList.length} 体のボスが登録されています`,
        data: bossList,
      };
    } catch (error) {
      return {
        success: false,
        message: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * ボス情報を詳細表示
   * 要件14.2: ボス情報を詳細表示する
   */
  private showBossInfo(bossId: string): CommandResult {
    if (!this.victoryConditionSystem) {
      return {
        success: false,
        message: 'VictoryConditionSystemが設定されていません',
      };
    }

    if (!this.victoryConditionSystem.isSystemInitialized()) {
      return {
        success: false,
        message: 'システムが初期化されていません',
      };
    }

    try {
      const bossSystem = this.victoryConditionSystem.getBossSystem();
      
      if (!bossSystem.isBoss(bossId)) {
        return {
          success: false,
          message: `ボス '${bossId}' が見つかりません`,
        };
      }

      const bossData = bossSystem.getBossData(bossId);
      if (!bossData) {
        return {
          success: false,
          message: `ボスデータ '${bossId}' が見つかりません`,
        };
      }

      return {
        success: true,
        message: `ボス '${bossData.name}' の詳細情報`,
        data: {
          id: bossData.id,
          name: bossData.name,
          title: bossData.title,
          description: bossData.description,
          type: bossData.bossType,
          difficulty: bossData.difficulty,
          roseEssence: {
            amount: bossData.roseEssenceAmount,
            type: bossData.roseEssenceType,
          },
          phases: bossData.phases.map(phase => ({
            number: phase.phaseNumber,
            hpThreshold: `${phase.hpThreshold}%`,
            newAbilities: phase.newAbilities.length,
          })),
          specialAbilities: bossData.specialAbilities.map(ability => ({
            id: ability.id,
            name: ability.name,
            type: ability.type,
          })),
          experienceReward: bossData.experienceReward,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 報酬倍率を設定
   * 要件14.6: コンソールコマンドで報酬を調整できる
   */
  private setRewardMultiplier(multiplier: number): CommandResult {
    if (multiplier <= 0) {
      return {
        success: false,
        message: '報酬倍率は0より大きい値である必要があります',
      };
    }

    this.rewardMultiplier = multiplier;

    return {
      success: true,
      message: `報酬倍率を ${multiplier}x に設定しました`,
      data: { multiplier },
    };
  }

  /**
   * 報酬倍率を取得
   * 要件14.6: コンソールコマンドで報酬を調整できる
   */
  private getRewardMultiplier(): CommandResult {
    return {
      success: true,
      message: '現在の報酬倍率',
      data: { multiplier: this.rewardMultiplier },
    };
  }

  /**
   * 報酬をプレビュー
   * 要件14.3: 報酬計算の内訳を表示する
   */
  private previewRewards(): CommandResult {
    if (!this.victoryConditionSystem) {
      return {
        success: false,
        message: 'VictoryConditionSystemが設定されていません',
      };
    }

    if (!this.victoryConditionSystem.isSystemInitialized()) {
      return {
        success: false,
        message: 'システムが初期化されていません',
      };
    }

    try {
      const performance = this.victoryConditionSystem.getStagePerformance();
      const stageData = this.victoryConditionSystem.getCurrentStageData();

      if (!stageData) {
        return {
          success: false,
          message: 'ステージデータが見つかりません',
        };
      }

      // 報酬計算機を取得
      const rewardCalculator = this.victoryConditionSystem.getRewardCalculator();

      // 報酬を計算
      const rewards = rewardCalculator.calculateRewards(
        {
          id: stageData.id,
          name: stageData.name,
          baseExperienceReward: stageData.baseExperienceReward,
          targetTurns: stageData.targetTurns,
          maxTurns: stageData.maxTurns,
        },
        performance,
        stageData.bosses,
        []
      );

      // 報酬倍率を適用
      const adjustedRewards: StageRewards = {
        ...rewards,
        baseExperience: Math.floor(rewards.baseExperience * this.rewardMultiplier),
        bossRewards: rewards.bossRewards.map(br => ({
          ...br,
          roseEssenceAmount: Math.floor(br.roseEssenceAmount * this.rewardMultiplier),
          experienceBonus: Math.floor(br.experienceBonus * this.rewardMultiplier),
        })),
      };

      return {
        success: true,
        message: '報酬プレビュー',
        data: {
          performance,
          rewards: adjustedRewards,
          multiplier: this.rewardMultiplier,
          breakdown: {
            baseExperience: adjustedRewards.baseExperience,
            bossRewards: adjustedRewards.bossRewards.length,
            clearRating: adjustedRewards.clearRatingBonus.rating,
            ratingMultiplier: adjustedRewards.clearRatingBonus.experienceMultiplier,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 目標達成状態を表示
   * 要件14.1: 目標の達成状態を表示する
   */
  private showObjectiveStatus(): CommandResult {
    if (!this.victoryConditionSystem) {
      return {
        success: false,
        message: 'VictoryConditionSystemが設定されていません',
      };
    }

    if (!this.victoryConditionSystem.isSystemInitialized()) {
      return {
        success: false,
        message: 'システムが初期化されていません',
      };
    }

    try {
      const objectiveManager = this.victoryConditionSystem.getObjectiveManager();
      const objectives = objectiveManager.getAllObjectives();

      const objectiveStatus = objectives.map(obj => ({
        id: obj.id,
        type: obj.type,
        description: obj.description,
        required: obj.isRequired,
        complete: obj.isComplete,
        progress: `${obj.progress.current}/${obj.progress.target}`,
        percentage: `${obj.progress.percentage.toFixed(1)}%`,
      }));

      console.table(objectiveStatus);

      return {
        success: true,
        message: `${objectives.length} 個の目標が登録されています`,
        data: objectiveStatus,
      };
    } catch (error) {
      return {
        success: false,
        message: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 目標を強制的に完了
   */
  private completeObjective(objectiveId: string): CommandResult {
    if (!this.victoryConditionSystem) {
      return {
        success: false,
        message: 'VictoryConditionSystemが設定されていません',
      };
    }

    if (!this.victoryConditionSystem.isSystemInitialized()) {
      return {
        success: false,
        message: 'システムが初期化されていません',
      };
    }

    try {
      const objectiveManager = this.victoryConditionSystem.getObjectiveManager();
      const result = objectiveManager.completeObjective(objectiveId);

      if (result.success) {
        return {
          success: true,
          message: `目標 '${objectiveId}' を完了しました`,
          data: result,
        };
      } else {
        return {
          success: false,
          message: `目標の完了に失敗しました: ${result.message}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 目標一覧を表示
   */
  private listObjectives(): CommandResult {
    if (!this.victoryConditionSystem) {
      return {
        success: false,
        message: 'VictoryConditionSystemが設定されていません',
      };
    }

    if (!this.victoryConditionSystem.isSystemInitialized()) {
      return {
        success: false,
        message: 'システムが初期化されていません',
      };
    }

    try {
      const objectiveManager = this.victoryConditionSystem.getObjectiveManager();
      const objectives = objectiveManager.getAllObjectives();

      const objectiveList = objectives.map(obj => ({
        id: obj.id,
        type: obj.type,
        description: obj.description,
        complete: obj.isComplete ? '✓' : '✗',
      }));

      return {
        success: true,
        message: `${objectives.length} 個の目標が登録されています`,
        data: objectiveList,
      };
    } catch (error) {
      return {
        success: false,
        message: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * システム状態を取得
   */
  private getSystemStatus(): CommandResult {
    if (!this.victoryConditionSystem) {
      return {
        success: false,
        message: 'VictoryConditionSystemが設定されていません',
      };
    }

    try {
      const stageData = this.victoryConditionSystem.getCurrentStageData();
      const objectiveManager = this.victoryConditionSystem.getObjectiveManager();
      const bossSystem = this.victoryConditionSystem.getBossSystem();

      const status = {
        initialized: this.victoryConditionSystem.isSystemInitialized(),
        stageComplete: this.victoryConditionSystem.isStageCompleted(),
        stageFailed: this.victoryConditionSystem.isStageFailedStatus(),
        currentStage: stageData ? {
          id: stageData.id,
          name: stageData.name,
        } : null,
        objectives: {
          total: objectiveManager.getAllObjectives().length,
          completed: objectiveManager.getAllObjectives().filter(o => o.isComplete).length,
        },
        bosses: {
          total: bossSystem.getAllBosses().length,
        },
      };

      return {
        success: true,
        message: 'システム状態',
        data: status,
      };
    } catch (error) {
      return {
        success: false,
        message: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * パフォーマンス情報を取得
   */
  private getPerformance(): CommandResult {
    if (!this.victoryConditionSystem) {
      return {
        success: false,
        message: 'VictoryConditionSystemが設定されていません',
      };
    }

    if (!this.victoryConditionSystem.isSystemInitialized()) {
      return {
        success: false,
        message: 'システムが初期化されていません',
      };
    }

    try {
      const performance = this.victoryConditionSystem.getStagePerformance();

      return {
        success: true,
        message: 'ステージパフォーマンス',
        data: performance,
      };
    } catch (error) {
      return {
        success: false,
        message: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * キャッシュをクリア
   */
  private clearCache(): CommandResult {
    if (!this.victoryConditionSystem) {
      return {
        success: false,
        message: 'VictoryConditionSystemが設定されていません',
      };
    }

    try {
      const performanceManager = this.victoryConditionSystem.getPerformanceManager();
      performanceManager.clearAll();

      return {
        success: true,
        message: 'キャッシュをクリアしました',
      };
    } catch (error) {
      return {
        success: false,
        message: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * ヘルプを表示
   */
  private showHelp(): CommandResult {
    const helpText = `
=== ボス戦・勝利条件コンソールコマンド ヘルプ ===

【勝利・敗北強制】
victoryCommands.forceVictory()              - 勝利を強制
victoryCommands.forceDefeat('理由')         - 敗北を強制

【ボス操作】
victoryCommands.defeatBoss('boss_id')       - ボスを即座に撃破
victoryCommands.listBosses()                - ボス一覧を表示
victoryCommands.showBossInfo('boss_id')     - ボス詳細情報を表示

【報酬調整】
victoryCommands.setRewardMultiplier(2.0)    - 報酬倍率を設定
victoryCommands.getRewardMultiplier()       - 現在の報酬倍率を取得
victoryCommands.previewRewards()            - 報酬をプレビュー

【目標管理】
victoryCommands.showObjectiveStatus()       - 目標達成状態を表示
victoryCommands.completeObjective('obj_id') - 目標を強制完了
victoryCommands.listObjectives()            - 目標一覧を表示

【システム情報】
victoryCommands.getSystemStatus()           - システム状態を取得
victoryCommands.getPerformance()            - パフォーマンス情報を取得
victoryCommands.clearCache()                - キャッシュをクリア

使用例:
1. victoryCommands.showObjectiveStatus()    - 目標の進捗を確認
2. victoryCommands.listBosses()             - ボス一覧を確認
3. victoryCommands.showBossInfo('boss_1')   - ボス詳細を確認
4. victoryCommands.defeatBoss('boss_1')     - ボスを撃破
5. victoryCommands.setRewardMultiplier(2.0) - 報酬を2倍に
6. victoryCommands.previewRewards()         - 報酬を確認
7. victoryCommands.forceVictory()           - 勝利を強制
        `;

    console.log(helpText);

    return {
      success: true,
      message: 'ヘルプをコンソールに表示しました',
      data: helpText,
    };
  }

  /**
   * コンソールコマンドの破棄
   */
  public destroy(): void {
    if (typeof window !== 'undefined') {
      delete (window as any).victoryCommands;
    }
  }
}
