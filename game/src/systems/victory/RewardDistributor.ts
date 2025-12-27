/**
 * RewardDistributor - 報酬配布システム
 * 
 * ステージクリア時の報酬を各システムに配布します。
 * 経験値、薔薇の力、仲間化情報、アイテムなどの報酬を
 * 適切なシステムに連携して付与します。
 * 
 * 要件4.7, 4.8, 4.9, 4.10, 6.1, 6.2, 7.1, 7.2, 8.1, 8.2に対応
 */

import { EventEmitter } from 'events';
import { StageRewards, BossReward, RecruitmentReward, ItemReward } from '../../types/reward';
import { Unit } from '../../types/gameplay';

/**
 * 報酬配布設定
 */
export interface RewardDistributionConfig {
  // 経験値配布を有効化
  enableExperienceDistribution: boolean;

  // 薔薇の力配布を有効化
  enableRoseEssenceDistribution: boolean;

  // 仲間化報酬処理を有効化
  enableRecruitmentRewards: boolean;

  // アイテム報酬配布を有効化
  enableItemRewards: boolean;

  // 配布失敗時のリトライ回数
  maxRetries: number;

  // デバッグモード
  debugMode: boolean;
}

/**
 * 報酬配布結果
 */
export interface RewardDistributionResult {
  success: boolean;
  experienceDistributed: boolean;
  roseEssenceDistributed: boolean;
  recruitmentProcessed: boolean;
  itemsDistributed: boolean;
  errors: string[];
  details: {
    experienceRecipients: string[];
    roseEssenceAmount: number;
    recruitedCharacters: string[];
    itemsReceived: number;
    lostCharacters: string[]; // ロストしたキャラクターID配列
    lostCharactersCount: number; // ロストしたキャラクター数
  };
  timestamp: number;
}

/**
 * 経験値配布結果
 */
export interface ExperienceDistributionResult {
  success: boolean;
  recipientIds: string[];
  totalExperience: number;
  errors: string[];
}

/**
 * 薔薇の力配布結果
 */
export interface RoseEssenceDistributionResult {
  success: boolean;
  totalAmount: number;
  bossRewards: BossReward[];
  errors: string[];
}

/**
 * 仲間化報酬処理結果
 */
export interface RecruitmentRewardResult {
  success: boolean;
  processedCharacters: string[];
  errors: string[];
}

/**
 * アイテム報酬配布結果
 */
export interface ItemDistributionResult {
  success: boolean;
  itemsDistributed: number;
  errors: string[];
}

/**
 * RewardDistributorクラス
 */
export class RewardDistributor extends EventEmitter {
  private config: RewardDistributionConfig;
  private experienceSystem?: any; // ExperienceSystemへの参照
  private jobSystem?: any; // JobSystemへの参照
  private recruitmentSystem?: any; // RecruitmentSystemへの参照
  private inventorySystem?: any; // InventorySystemへの参照（将来実装）
  private characterLossManager?: any; // CharacterLossManagerへの参照
  private rewardUI?: any; // RewardUIへの参照

  private static readonly DEFAULT_CONFIG: RewardDistributionConfig = {
    enableExperienceDistribution: true,
    enableRoseEssenceDistribution: true,
    enableRecruitmentRewards: true,
    enableItemRewards: true,
    maxRetries: 3,
    debugMode: false,
  };

  /**
   * RewardDistributorインスタンスを作成
   * @param config 設定
   */
  constructor(config?: Partial<RewardDistributionConfig>) {
    super();

    this.config = { ...RewardDistributor.DEFAULT_CONFIG, ...config };
  }

  /**
   * ExperienceSystemへの参照を設定
   * 要件6.1: Experience_Systemに経験値を付与する
   * 
   * @param experienceSystem ExperienceSystemインスタンス
   */
  public setExperienceSystem(experienceSystem: any): void {
    this.experienceSystem = experienceSystem;

    if (this.config.debugMode) {
      console.log('ExperienceSystem reference set in RewardDistributor');
    }
  }

  /**
   * JobSystemへの参照を設定
   * 要件7.1, 7.2: Job_Systemに薔薇の力を付与する
   * 
   * @param jobSystem JobSystemインスタンス
   */
  public setJobSystem(jobSystem: any): void {
    this.jobSystem = jobSystem;

    if (this.config.debugMode) {
      console.log('JobSystem reference set in RewardDistributor');
    }
  }

  /**
   * RecruitmentSystemへの参照を設定
   * 要件8.1, 8.2: Recruitment_Systemに仲間化情報を反映する
   * 
   * @param recruitmentSystem RecruitmentSystemインスタンス
   */
  public setRecruitmentSystem(recruitmentSystem: any): void {
    this.recruitmentSystem = recruitmentSystem;

    if (this.config.debugMode) {
      console.log('RecruitmentSystem reference set in RewardDistributor');
    }
  }

  /**
   * InventorySystemへの参照を設定（将来実装）
   * 要件4.10: アイテム報酬を配布する
   * 
   * @param inventorySystem InventorySystemインスタンス
   */
  public setInventorySystem(inventorySystem: any): void {
    this.inventorySystem = inventorySystem;

    if (this.config.debugMode) {
      console.log('InventorySystem reference set in RewardDistributor');
    }
  }

  /**
   * RewardUIへの参照を設定
   * 要件7.4: 報酬画面でのランクアップ案内表示を実装
   * 
   * @param rewardUI RewardUIインスタンス
   */
  public setRewardUI(rewardUI: any): void {
    this.rewardUI = rewardUI;

    // ランクアップ可能通知イベントをRewardUIに接続
    this.on('rank_up_candidates_available', (data) => {
      if (this.rewardUI && this.rewardUI.showRankUpAvailableNotification) {
        this.rewardUI.showRankUpAvailableNotification(data.candidates);
      }
    });

    if (this.config.debugMode) {
      console.log('RewardUI reference set in RewardDistributor');
    }
  }

  /**
   * CharacterLossManagerへの参照を設定
   * 要件9.1, 9.2, 9.3, 9.4: Character_Loss_Managerとの統合
   * 
   * @param characterLossManager CharacterLossManagerインスタンス
   */
  public setCharacterLossManager(characterLossManager: any): void {
    this.characterLossManager = characterLossManager;

    if (this.config.debugMode) {
      console.log('CharacterLossManager reference set in RewardDistributor');
    }
  }

  /**
   * 報酬を配布
   * 要件4.7: 報酬受け取り処理を実行する
   * 
   * @param rewards ステージ報酬
   * @param playerUnits プレイヤーユニット配列
   * @returns 配布結果
   */
  public async distributeRewards(
    rewards: StageRewards,
    playerUnits: Unit[]
  ): Promise<RewardDistributionResult> {
    const errors: string[] = [];
    const details = {
      experienceRecipients: [] as string[],
      roseEssenceAmount: 0,
      recruitedCharacters: [] as string[],
      itemsReceived: 0,
      lostCharacters: [] as string[],
      lostCharactersCount: 0,
    };

    let experienceDistributed = false;
    let roseEssenceDistributed = false;
    let recruitmentProcessed = false;
    let itemsDistributed = false;

    try {
      if (this.config.debugMode) {
        console.log('報酬配布開始:', rewards);
      }

      // ロスト状態を処理（ステージクリア時）
      // 要件9.1: ステージがクリアされるとき、Character_Loss_Managerからロスト状態を取得する
      const lossStateResult = await this.processCharacterLossState();
      if (lossStateResult) {
        details.lostCharacters = lossStateResult.lostCharacterIds;
        details.lostCharactersCount = lossStateResult.lostCount;
        
        if (!lossStateResult.success) {
          errors.push(...lossStateResult.errors);
        }
      }

      // 経験値報酬を配布
      if (this.config.enableExperienceDistribution) {
        const expResult = await this.distributeExperienceRewards(rewards, playerUnits);
        experienceDistributed = expResult.success;
        details.experienceRecipients = expResult.recipientIds;

        if (!expResult.success) {
          errors.push(...expResult.errors);
        }
      }

      // 薔薇の力を配布
      if (this.config.enableRoseEssenceDistribution) {
        const roseResult = await this.distributeRoseEssence(rewards);
        roseEssenceDistributed = roseResult.success;
        details.roseEssenceAmount = roseResult.totalAmount;

        if (!roseResult.success) {
          errors.push(...roseResult.errors);
        }
      }

      // 仲間化報酬を処理
      if (this.config.enableRecruitmentRewards) {
        const recruitResult = await this.processRecruitmentRewards(rewards);
        recruitmentProcessed = recruitResult.success;
        details.recruitedCharacters = recruitResult.processedCharacters;

        if (!recruitResult.success) {
          errors.push(...recruitResult.errors);
        }
      }

      // アイテム報酬を配布
      if (this.config.enableItemRewards) {
        const itemResult = await this.distributeItemRewards(rewards);
        itemsDistributed = itemResult.success;
        details.itemsReceived = itemResult.itemsDistributed;

        if (!itemResult.success) {
          errors.push(...itemResult.errors);
        }
      }

      const result: RewardDistributionResult = {
        success: errors.length === 0,
        experienceDistributed,
        roseEssenceDistributed,
        recruitmentProcessed,
        itemsDistributed,
        errors,
        details,
        timestamp: Date.now(),
      };

      this.emit('rewards_distributed', result);

      if (this.config.debugMode) {
        console.log('報酬配布完了:', result);
      }

      return result;

    } catch (error) {
      console.error('報酬配布中にエラー:', error);

      return {
        success: false,
        experienceDistributed,
        roseEssenceDistributed,
        recruitmentProcessed,
        itemsDistributed,
        errors: [...errors, error instanceof Error ? error.message : String(error)],
        details,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 経験値報酬を配布
   * 要件4.8, 6.1, 6.2, 6.3: Experience_Systemに経験値を付与する
   * 
   * @param rewards ステージ報酬
   * @param playerUnits プレイヤーユニット配列
   * @returns 経験値配布結果
   */
  public async distributeExperienceRewards(
    rewards: StageRewards,
    playerUnits: Unit[]
  ): Promise<ExperienceDistributionResult> {
    const errors: string[] = [];
    const recipientIds: string[] = [];
    let totalExperience = 0;

    try {
      if (!this.experienceSystem) {
        errors.push('ExperienceSystem not set');
        return {
          success: false,
          recipientIds,
          totalExperience,
          errors,
        };
      }

      if (!playerUnits || playerUnits.length === 0) {
        errors.push('No player units provided');
        return {
          success: false,
          recipientIds,
          totalExperience,
          errors,
        };
      }

      // 基本経験値を全プレイヤーユニットに配布
      for (const unit of playerUnits) {
        try {
          // 基本経験値を付与
          // 要件6.1: Experience_Systemに経験値を付与する
          const baseExpResult = this.experienceSystem.awardExperience(
            unit.id,
            'SUPPORT', // ExperienceAction - ステージクリアは支援扱い
            {
              source: 'STAGE_COMPLETION' as any, // ExperienceSource
              amount: rewards.baseExperience,
              timestamp: Date.now(),
            }
          );

          if (baseExpResult && baseExpResult.finalAmount > 0) {
            recipientIds.push(unit.id);
            totalExperience += baseExpResult.finalAmount;

            if (this.config.debugMode) {
              console.log(`${unit.name}に基本経験値${baseExpResult.finalAmount}を付与`);
            }

            // レベルアップ処理を実行
            // 要件6.3: 報酬配布時のレベルアップ処理連携を実装
            const levelUpResult = this.experienceSystem.checkAndProcessLevelUp(unit.id);
            if (levelUpResult) {
              if (this.config.debugMode) {
                console.log(
                  `${unit.name}がレベルアップ: Lv${levelUpResult.oldLevel} → Lv${levelUpResult.newLevel}`
                );
              }
            }
          }

          // ボス撃破ボーナス経験値を付与
          // 要件6.2: ボス撃破時の経験値ボーナス計算と付与を統合
          for (const bossReward of rewards.bossRewards) {
            const bossExpResult = this.experienceSystem.awardExperience(
              unit.id,
              'DEFEAT', // ExperienceAction - ボス撃破
              {
                source: 'ENEMY_DEFEAT' as any, // ExperienceSource
                amount: bossReward.experienceBonus,
                metadata: {
                  bossId: bossReward.bossId,
                  bossName: bossReward.bossName,
                  isBoss: true,
                },
                timestamp: Date.now(),
              }
            );

            if (bossExpResult && bossExpResult.finalAmount > 0) {
              totalExperience += bossExpResult.finalAmount;

              if (this.config.debugMode) {
                console.log(
                  `${unit.name}にボス撃破ボーナス${bossExpResult.finalAmount}を付与`
                );
              }

              // レベルアップ処理を実行
              const levelUpResult = this.experienceSystem.checkAndProcessLevelUp(unit.id);
              if (levelUpResult) {
                if (this.config.debugMode) {
                  console.log(
                    `${unit.name}がレベルアップ: Lv${levelUpResult.oldLevel} → Lv${levelUpResult.newLevel}`
                  );
                }
              }
            }
          }

          // クリア評価による経験値倍率を適用
          // 要件6.2: クリア評価による経験値倍率適用を統合
          if (rewards.clearRatingBonus.experienceMultiplier > 1.0) {
            const multiplier = rewards.clearRatingBonus.experienceMultiplier;
            const bonusAmount = Math.floor(
              rewards.baseExperience * (multiplier - 1.0)
            );

            if (bonusAmount > 0) {
              const ratingBonusResult = this.experienceSystem.awardExperience(
                unit.id,
                'SUPPORT', // ExperienceAction
                {
                  source: 'ALLY_SUPPORT' as any, // ExperienceSource
                  amount: bonusAmount,
                  multiplier: 1.0, // 既に計算済みなので倍率は1.0
                  metadata: {
                    rating: rewards.clearRatingBonus.rating,
                    isRatingBonus: true,
                  },
                  timestamp: Date.now(),
                }
              );

              if (ratingBonusResult && ratingBonusResult.finalAmount > 0) {
                totalExperience += ratingBonusResult.finalAmount;

                if (this.config.debugMode) {
                  console.log(
                    `${unit.name}にクリア評価ボーナス${ratingBonusResult.finalAmount}を付与 (評価: ${rewards.clearRatingBonus.rating})`
                  );
                }

                // レベルアップ処理を実行
                const levelUpResult = this.experienceSystem.checkAndProcessLevelUp(unit.id);
                if (levelUpResult) {
                  if (this.config.debugMode) {
                    console.log(
                      `${unit.name}がレベルアップ: Lv${levelUpResult.oldLevel} → Lv${levelUpResult.newLevel}`
                    );
                  }
                }
              }
            }
          }

        } catch (error) {
          errors.push(
            `Failed to award experience to ${unit.id}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // 経験値配布完了イベントを発行
      this.emit('experience_rewards_distributed', {
        recipientIds,
        totalExperience,
        timestamp: Date.now(),
      });

      return {
        success: errors.length === 0,
        recipientIds,
        totalExperience,
        errors,
      };

    } catch (error) {
      errors.push(
        `Unexpected error during experience distribution: ${error instanceof Error ? error.message : String(error)}`
      );

      return {
        success: false,
        recipientIds,
        totalExperience,
        errors,
      };
    }
  }

  /**
   * 薔薇の力を配布
   * 要件4.9, 7.1, 7.2, 7.3: Job_Systemに薔薇の力を付与する
   * 
   * @param rewards ステージ報酬
   * @returns 薔薇の力配布結果
   */
  public async distributeRoseEssence(
    rewards: StageRewards
  ): Promise<RoseEssenceDistributionResult> {
    const errors: string[] = [];
    let totalAmount = 0;

    try {
      if (!this.jobSystem) {
        errors.push('JobSystem not set');
        return {
          success: false,
          totalAmount,
          bossRewards: rewards.bossRewards,
          errors,
        };
      }

      if (!rewards.bossRewards || rewards.bossRewards.length === 0) {
        // ボス撃破報酬がない場合は成功として扱う
        return {
          success: true,
          totalAmount: 0,
          bossRewards: [],
          errors: [],
        };
      }

      // 各ボス撃破報酬の薔薇の力を付与
      // 要件7.1: ボスが撃破されるとき、薔薇の力の量を計算する
      // 要件7.2: 薔薇の力が付与されるとき、Job_Systemに薔薇の力を付与する
      for (const bossReward of rewards.bossRewards) {
        try {
          // 薔薇の力の種類と量を含めたソース情報を作成
          // 要件7.3: 薔薇の力の種類と量の計算を統合
          const sourceInfo = {
            type: 'boss_defeat',
            bossId: bossReward.bossId,
            bossName: bossReward.bossName,
            essenceType: bossReward.roseEssenceType,
          };

          await this.jobSystem.awardRoseEssence(
            bossReward.roseEssenceAmount,
            JSON.stringify(sourceInfo),
            undefined // position (optional)
          );

          totalAmount += bossReward.roseEssenceAmount;

          if (this.config.debugMode) {
            console.log(
              `ボス${bossReward.bossName}撃破により薔薇の力${bossReward.roseEssenceAmount}(${bossReward.roseEssenceType})を付与`
            );
          }

        } catch (error) {
          errors.push(
            `Failed to award rose essence for boss ${bossReward.bossId}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // ランクアップ可能なキャラクターを通知
      // 要件7.3: ランクアップ可能なキャラクターを通知する
      if (this.jobSystem.getRankUpCandidates) {
        const rankUpCandidates = this.jobSystem.getRankUpCandidates();

        if (rankUpCandidates && rankUpCandidates.length > 0) {
          this.emit('rank_up_candidates_available', {
            candidates: rankUpCandidates,
            totalRoseEssence: totalAmount,
            bossRewards: rewards.bossRewards,
          });

          if (this.config.debugMode) {
            console.log(`ランクアップ可能キャラクター: ${rankUpCandidates.length}人`);
            rankUpCandidates.forEach((candidate) => {
              console.log(
                `  - ${candidate.characterId}: ${candidate.currentJobName} Lv${candidate.currentRank} → Lv${candidate.nextRank} (必要: ${candidate.requiredRoseEssence})`
              );
            });
          }
        }
      }

      return {
        success: errors.length === 0,
        totalAmount,
        bossRewards: rewards.bossRewards,
        errors,
      };

    } catch (error) {
      errors.push(
        `Unexpected error during rose essence distribution: ${error instanceof Error ? error.message : String(error)}`
      );

      return {
        success: false,
        totalAmount,
        bossRewards: rewards.bossRewards,
        errors,
      };
    }
  }

  /**
   * 仲間化報酬を処理
   * 要件8.1: Recruitment_Systemから仲間化状態を取得する
   * 要件8.2: 仲間化成功キャラクターの完了処理を統合
   * 要件8.3: 次ステージでの使用可能状態設定を実装
   * 要件8.4: 仲間化報酬の計算と表示を統合
   * 
   * @param rewards ステージ報酬
   * @returns 仲間化報酬処理結果
   */
  public async processRecruitmentRewards(
    rewards: StageRewards
  ): Promise<RecruitmentRewardResult> {
    const errors: string[] = [];
    const processedCharacters: string[] = [];

    try {
      if (!this.recruitmentSystem) {
        errors.push('RecruitmentSystem not set');
        return {
          success: false,
          processedCharacters,
          errors,
        };
      }

      if (!rewards.recruitmentRewards || rewards.recruitmentRewards.length === 0) {
        // 仲間化報酬がない場合は成功として扱う
        return {
          success: true,
          processedCharacters: [],
          errors: [],
        };
      }

      // 各仲間化報酬を処理
      for (const recruitmentReward of rewards.recruitmentRewards) {
        try {
          // 要件8.2: 仲間化成功キャラクターの完了処理を統合
          // RecruitmentSystemのcompleteRecruitmentメソッドは既に呼ばれているため、
          // ここでは追加の処理（セーブデータへの保存など）を実行
          
          // 仲間化完了をセーブデータに保存
          if (this.recruitmentSystem.saveRecruitmentCompletion) {
            const saveResult = await this.recruitmentSystem.saveRecruitmentCompletion([{
              unit: { id: recruitmentReward.characterId, name: recruitmentReward.characterName },
              recruitmentId: `recruitment-${recruitmentReward.characterId}-${Date.now()}`,
              recruitedAt: Date.now(),
              conditions: [],
            }]);
            
            if (!saveResult.success) {
              errors.push(`Failed to save recruitment for ${recruitmentReward.characterId}: ${saveResult.message || 'Unknown error'}`);
            }
          }
          
          // 要件8.3: 次ステージでの使用可能状態設定を実装
          // キャラクターは既にcompleteRecruitmentメソッドでfaction='player'に設定されている
          // ここでは追加の状態設定を行う
          
          processedCharacters.push(recruitmentReward.characterId);

          if (this.config.debugMode) {
            console.log(
              `キャラクター${recruitmentReward.characterName}の仲間化を完了し、次ステージで使用可能に設定`
            );
          }
          
          // 要件8.4: 仲間化報酬の計算と表示を統合
          // 仲間化ボーナス経験値がある場合は記録
          if (recruitmentReward.recruitmentBonus > 0) {
            this.emit('recruitment_bonus_awarded', {
              characterId: recruitmentReward.characterId,
              characterName: recruitmentReward.characterName,
              bonusAmount: recruitmentReward.recruitmentBonus,
              timestamp: Date.now(),
            });
          }

        } catch (error) {
          errors.push(
            `Failed to process recruitment for ${recruitmentReward.characterId}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
      
      // 仲間化報酬処理完了イベントを発行
      this.emit('recruitment_rewards_processed', {
        processedCharacters,
        totalRecruitments: rewards.recruitmentRewards.length,
        timestamp: Date.now(),
      });

      return {
        success: errors.length === 0,
        processedCharacters,
        errors,
      };

    } catch (error) {
      errors.push(
        `Unexpected error during recruitment reward processing: ${error instanceof Error ? error.message : String(error)}`
      );

      return {
        success: false,
        processedCharacters,
        errors,
      };
    }
  }

  /**
   * アイテム報酬を配布
   * 要件4.10: アイテム報酬を配布する
   * 
   * @param rewards ステージ報酬
   * @returns アイテム配布結果
   */
  public async distributeItemRewards(
    rewards: StageRewards
  ): Promise<ItemDistributionResult> {
    const errors: string[] = [];
    let itemsDistributed = 0;

    try {
      // アイテムシステムが未実装の場合は警告のみ
      if (!this.inventorySystem) {
        if (this.config.debugMode) {
          console.warn('InventorySystem not set - item rewards not distributed');
        }

        // アイテムシステムが未実装でも成功として扱う
        return {
          success: true,
          itemsDistributed: 0,
          errors: [],
        };
      }

      // 基本アイテム報酬を配布
      if (rewards.itemRewards && rewards.itemRewards.length > 0) {
        for (const itemReward of rewards.itemRewards) {
          try {
            await this.inventorySystem.addItem(
              itemReward.itemId,
              itemReward.quantity
            );

            itemsDistributed += itemReward.quantity;

            if (this.config.debugMode) {
              console.log(
                `アイテム${itemReward.itemName} x${itemReward.quantity}を獲得`
              );
            }

          } catch (error) {
            errors.push(
              `Failed to distribute item ${itemReward.itemId}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      }

      // クリア評価による追加報酬を配布
      if (rewards.clearRatingBonus.additionalRewards && 
          rewards.clearRatingBonus.additionalRewards.length > 0) {
        for (const itemReward of rewards.clearRatingBonus.additionalRewards) {
          try {
            await this.inventorySystem.addItem(
              itemReward.itemId,
              itemReward.quantity
            );

            itemsDistributed += itemReward.quantity;

            if (this.config.debugMode) {
              console.log(
                `評価ボーナスアイテム${itemReward.itemName} x${itemReward.quantity}を獲得`
              );
            }

          } catch (error) {
            errors.push(
              `Failed to distribute bonus item ${itemReward.itemId}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      }

      return {
        success: errors.length === 0,
        itemsDistributed,
        errors,
      };

    } catch (error) {
      errors.push(
        `Unexpected error during item distribution: ${error instanceof Error ? error.message : String(error)}`
      );

      return {
        success: false,
        itemsDistributed,
        errors,
      };
    }
  }

  /**
   * ロスト状態を処理
   * 要件9.1: ステージがクリアされるとき、Character_Loss_Managerからロスト状態を取得する
   * 要件9.2: ロストしたキャラクターがいるとき、ロスト状態を報酬画面に表示する
   * 要件9.3: ステージクリア後、ロスト状態を次ステージに引き継ぐ
   * 
   * @returns ロスト状態処理結果
   */
  private async processCharacterLossState(): Promise<{
    success: boolean;
    lostCharacterIds: string[];
    lostCount: number;
    errors: string[];
  } | null> {
    const errors: string[] = [];
    const lostCharacterIds: string[] = [];
    let lostCount = 0;

    try {
      // CharacterLossManagerが設定されていない場合はスキップ
      if (!this.characterLossManager) {
        if (this.config.debugMode) {
          console.log('CharacterLossManager not set - skipping loss state processing');
        }
        return {
          success: true,
          lostCharacterIds: [],
          lostCount: 0,
          errors: [],
        };
      }

      // 要件9.1: Character_Loss_Managerからロスト状態を取得する
      const lostCharacters = this.characterLossManager.getLostCharacters();
      
      if (lostCharacters && lostCharacters.length > 0) {
        lostCount = lostCharacters.length;
        
        // ロストしたキャラクターIDを収集
        lostCharacters.forEach((lostChar: any) => {
          if (lostChar.characterId) {
            lostCharacterIds.push(lostChar.characterId);
          }
        });

        if (this.config.debugMode) {
          console.log(`ロストしたキャラクター: ${lostCount}人`, lostCharacterIds);
        }

        // 要件9.2: ロスト状態を報酬画面に表示するためのイベントを発行
        this.emit('character_loss_state_retrieved', {
          lostCharacters,
          lostCount,
          lostCharacterIds,
          timestamp: Date.now(),
        });

        // RewardUIが設定されている場合は、ロスト状態を表示
        if (this.rewardUI && typeof this.rewardUI.showLostCharactersInfo === 'function') {
          this.rewardUI.showLostCharactersInfo(lostCharacters);
        }
      } else {
        if (this.config.debugMode) {
          console.log('ロストしたキャラクターはいません');
        }
      }

      // 要件9.3: ステージクリア後、ロスト状態を次ステージに引き継ぐ
      // CharacterLossManagerのsaveChapterStateメソッドを呼び出して永続化
      if (typeof this.characterLossManager.saveChapterState === 'function') {
        const saveResult = this.characterLossManager.saveChapterState();
        
        if (!saveResult.success) {
          errors.push(`Failed to save character loss state: ${saveResult.message || 'Unknown error'}`);
          
          if (this.config.debugMode) {
            console.error('ロスト状態の保存に失敗:', saveResult);
          }
        } else {
          if (this.config.debugMode) {
            console.log('ロスト状態を次ステージに引き継ぐため保存しました');
          }
        }
      }

      return {
        success: errors.length === 0,
        lostCharacterIds,
        lostCount,
        errors,
      };

    } catch (error) {
      const errorMessage = `Unexpected error during character loss state processing: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMessage);

      if (this.config.debugMode) {
        console.error('ロスト状態処理中にエラー:', error);
      }

      return {
        success: false,
        lostCharacterIds,
        lostCount,
        errors,
      };
    }
  }

  /**
   * 設定を更新
   * 
   * @param newConfig 新しい設定
   */
  public updateConfig(newConfig: Partial<RewardDistributionConfig>): void {
    this.config = { ...this.config, ...newConfig };

    this.emit('config_updated', this.config);

    if (this.config.debugMode) {
      console.log('RewardDistributor設定更新:', this.config);
    }
  }

  /**
   * 現在の設定を取得
   * 
   * @returns 現在の設定
   */
  public getConfig(): RewardDistributionConfig {
    return { ...this.config };
  }

  /**
   * システムをリセット
   */
  public reset(): void {
    this.removeAllListeners();

    if (this.config.debugMode) {
      console.log('RewardDistributorをリセットしました');
    }
  }

  /**
   * リソースを破棄
   */
  public destroy(): void {
    this.reset();
    this.experienceSystem = undefined;
    this.jobSystem = undefined;
    this.recruitmentSystem = undefined;
    this.inventorySystem = undefined;
    this.characterLossManager = undefined;
    this.rewardUI = undefined;

    if (this.config.debugMode) {
      console.log('RewardDistributorを破棄しました');
    }
  }
}
