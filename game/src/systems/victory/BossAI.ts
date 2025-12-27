/**
 * ボス専用AI行動パターンシステム
 * ボスの戦略的な行動決定、対象選択、特殊能力使用判定を管理
 */

import { AIController } from '../AIController';
import {
  AIAction,
  AIActionType,
  AIContext,
  AIPersonality,
  DifficultySettings,
  AIControllerConfig,
  AISystemIntegration,
} from '../../types/ai';
import { Unit, Position } from '../../types/gameplay';
import { BossData, BossPhase, BossAbility } from '../../types/boss';

/**
 * ボスAI評価結果
 */
export interface BossActionEvaluation {
  action: AIAction;
  score: number;
  reasoning: string;
  isSpecialAbility: boolean;
}

/**
 * ボスAI設定
 */
export interface BossAIConfig extends AIControllerConfig {
  // ボス固有の設定
  abilityUsagePriority: number; // 特殊能力使用優先度（0-1）
  phaseAwarenessFactor: number; // フェーズ認識係数（0-1）
  targetSwitchingThreshold: number; // ターゲット切り替え閾値
  aggressivenessByPhase: Record<number, number>; // フェーズ別攻撃性
}

/**
 * ボス専用AIコントローラークラス
 * 既存のAIControllerを拡張し、ボス固有の行動パターンを実装
 */
export class BossAI extends AIController {
  private bossData: BossData;
  private bossConfig: BossAIConfig;
  private currentTarget: Unit | null = null;
  private abilityUsageHistory: Map<string, number> = new Map();
  private lastPhaseChange: number = 0;

  constructor(
    unit: Unit,
    bossData: BossData,
    difficultySettings: DifficultySettings,
    config: Partial<BossAIConfig> = {},
    integration: AISystemIntegration = {}
  ) {
    // ボスデータからAI性格を取得
    const personality = BossAI.createBossPersonality(bossData);

    // デフォルト設定とマージ
    const bossConfig: BossAIConfig = {
      thinkingTimeLimit: 3000,
      randomFactor: 0.1,
      enableAILogging: true,
      npcPriorityMultiplier: 50,
      abilityUsagePriority: 0.7,
      phaseAwarenessFactor: 0.8,
      targetSwitchingThreshold: 0.3,
      aggressivenessByPhase: {},
      ...config,
    };

    super(unit, personality, difficultySettings, bossConfig, integration);

    this.bossData = bossData;
    this.bossConfig = bossConfig;
  }

  /**
   * ボス行動の決定（オーバーライド）
   * @param context ゲームコンテキスト
   * @returns 選択されたアクション
   */
  protected async makeDecision(context: AIContext): Promise<AIAction> {
    // フェーズ変化をチェック
    this.checkPhaseChange(context);

    // ボス専用の行動評価
    const evaluation = this.evaluateBossAction(context);

    // 最適なアクションを選択
    return evaluation.action;
  }

  /**
   * ボス行動を評価
   * @param context ゲームコンテキスト
   * @returns 評価結果
   */
  public evaluateBossAction(context: AIContext): BossActionEvaluation {
    const evaluations: BossActionEvaluation[] = [];

    // 1. 特殊能力の評価
    const abilityEvaluations = this.evaluateSpecialAbilities(context);
    evaluations.push(...abilityEvaluations);

    // 2. 通常攻撃の評価
    const attackEvaluations = this.evaluateAttackActions(context);
    evaluations.push(...attackEvaluations);

    // 3. 移動の評価
    const movementEvaluations = this.evaluateMovementActions(context);
    evaluations.push(...movementEvaluations);

    // 4. フェーズに基づく行動調整
    const adjustedEvaluations = evaluations.map(evaluation =>
      this.adjustBehaviorByPhase(evaluation, context)
    );

    // 5. 最高スコアのアクションを選択
    const bestEvaluation = adjustedEvaluations.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    // ランダム要素を適用
    if (!this.shouldMakeMistake()) {
      return bestEvaluation;
    }

    // ミスを犯す場合はランダムなアクションを選択
    const randomIndex = Math.floor(Math.random() * adjustedEvaluations.length);
    return adjustedEvaluations[randomIndex] || bestEvaluation;
  }

  /**
   * ボス攻撃対象を選択
   * @param context ゲームコンテキスト
   * @returns 選択されたターゲット
   */
  public selectBossTarget(context: AIContext): Unit | null {
    const enemies = context.visibleEnemies;

    if (enemies.length === 0) {
      return null;
    }

    // ターゲット評価
    const targetScores = enemies.map(enemy => ({
      unit: enemy,
      score: this.evaluateTargetPriority(enemy, context),
    }));

    // スコアでソート
    targetScores.sort((a, b) => b.score - a.score);

    // 現在のターゲットを維持するかチェック
    if (this.currentTarget && this.shouldKeepCurrentTarget(targetScores, context)) {
      return this.currentTarget;
    }

    // 新しいターゲットを選択
    const newTarget = targetScores[0].unit;
    this.currentTarget = newTarget;

    return newTarget;
  }

  /**
   * ボス特殊能力の使用判定
   * @param ability 特殊能力
   * @param context ゲームコンテキスト
   * @returns 使用すべき場合true
   */
  public useBossAbility(ability: BossAbility, context: AIContext): boolean {
    // クールダウンチェック
    if (this.isAbilityOnCooldown(ability)) {
      return false;
    }

    // MP消費チェック
    if (ability.mpCost && this.unit.currentMP < ability.mpCost) {
      return false;
    }

    // フェーズ制限チェック
    if (!this.isAbilityAvailableInCurrentPhase(ability)) {
      return false;
    }

    // 使用条件の評価
    const usageScore = this.evaluateAbilityUsage(ability, context);

    // 閾値を超えた場合に使用
    const threshold = this.bossConfig.abilityUsagePriority * 100;
    return usageScore >= threshold;
  }

  /**
   * フェーズ別行動調整
   * @param evaluation 評価結果
   * @param context ゲームコンテキスト
   * @returns 調整後の評価結果
   */
  public adjustBehaviorByPhase(
    evaluation: BossActionEvaluation,
    context: AIContext
  ): BossActionEvaluation {
    const currentPhase = this.bossData.currentPhase;
    const phaseData = this.getCurrentPhaseData();

    if (!phaseData) {
      return evaluation;
    }

    // フェーズ別の攻撃性を適用
    const phaseAggressiveness = this.bossConfig.aggressivenessByPhase[currentPhase] || 1.0;

    // スコア調整
    let adjustedScore = evaluation.score;

    // 攻撃アクションの場合、フェーズ攻撃性を適用
    if (evaluation.action.type === AIActionType.ATTACK) {
      adjustedScore *= phaseAggressiveness;
    }

    // 特殊能力の場合、フェーズ認識係数を適用
    if (evaluation.isSpecialAbility) {
      adjustedScore *= 1 + this.bossConfig.phaseAwarenessFactor;
    }

    // HP割合に基づく調整
    const hpRatio = this.unit.currentHP / this.unit.stats.maxHP;
    if (hpRatio < 0.3) {
      // 低HP時は防御的な行動を優先
      if (evaluation.action.type === AIActionType.MOVE) {
        adjustedScore *= 1.5;
      }
    } else if (hpRatio > 0.7) {
      // 高HP時は攻撃的な行動を優先
      if (evaluation.action.type === AIActionType.ATTACK || evaluation.isSpecialAbility) {
        adjustedScore *= 1.3;
      }
    }

    return {
      ...evaluation,
      score: adjustedScore,
      reasoning: `${evaluation.reasoning} (Phase ${currentPhase} adjusted)`,
    };
  }

  /**
   * 位置評価（オーバーライド）
   * @param position 評価する位置
   * @param context ゲームコンテキスト
   * @returns 評価スコア
   */
  public evaluatePosition(position: Position, context: AIContext): number {
    let score = 0;

    // 敵との距離を評価
    for (const enemy of context.visibleEnemies) {
      const distance = this.calculateDistance(position, enemy.position);

      // ボスは中距離を好む（近すぎず遠すぎず）
      if (distance >= 2 && distance <= 4) {
        score += 15;
      } else if (distance < 2) {
        score += 5; // 近すぎる
      } else {
        score += 3; // 遠すぎる
      }
    }

    // マップ中央付近を好む
    if (context.mapData) {
      const centerX = context.mapData.width / 2;
      const centerY = context.mapData.height / 2;
      const distanceFromCenter = Math.abs(position.x - centerX) + Math.abs(position.y - centerY);
      score += Math.max(0, 20 - distanceFromCenter);
    }

    return score;
  }

  /**
   * AI優先度を取得（オーバーライド）
   * @param context ゲームコンテキスト
   * @returns 優先度
   */
  public getPriority(context: AIContext): number {
    // ボスは常に高優先度
    return this.bossData.aiPriority || 100;
  }

  /**
   * 特殊能力を評価
   * @param context ゲームコンテキスト
   * @returns 評価結果の配列
   */
  private evaluateSpecialAbilities(context: AIContext): BossActionEvaluation[] {
    const evaluations: BossActionEvaluation[] = [];
    const availableAbilities = this.getAvailableAbilities();

    for (const ability of availableAbilities) {
      if (!this.useBossAbility(ability, context)) {
        continue;
      }

      const target = this.findBestAbilityTarget(ability, context);
      if (!target) {
        continue;
      }

      const score = this.evaluateAbilityUsage(ability, context);

      evaluations.push({
        action: {
          type: AIActionType.SKILL,
          priority: score,
          target,
          skillId: ability.id,
          reasoning: `Use boss ability: ${ability.name}`,
        },
        score,
        reasoning: `Boss ability ${ability.name} on ${target.name}`,
        isSpecialAbility: true,
      });
    }

    return evaluations;
  }

  /**
   * 攻撃アクションを評価
   * @param context ゲームコンテキスト
   * @returns 評価結果の配列
   */
  private evaluateAttackActions(context: AIContext): BossActionEvaluation[] {
    const evaluations: BossActionEvaluation[] = [];
    const target = this.selectBossTarget(context);

    if (!target) {
      return evaluations;
    }

    if (this.integration.battleSystem?.canAttack(this.unit, target)) {
      const score = this.evaluateAttackTarget(target, context);

      evaluations.push({
        action: {
          type: AIActionType.ATTACK,
          priority: score,
          target,
          reasoning: `Attack ${target.name}`,
        },
        score,
        reasoning: `Attack target ${target.name}`,
        isSpecialAbility: false,
      });
    }

    return evaluations;
  }

  /**
   * 移動アクションを評価
   * @param context ゲームコンテキスト
   * @returns 評価結果の配列
   */
  private evaluateMovementActions(context: AIContext): BossActionEvaluation[] {
    const evaluations: BossActionEvaluation[] = [];

    if (!this.integration.movementSystem || !context.mapData) {
      return evaluations;
    }

    const movementRange = this.integration.movementSystem.calculateMovementRange(
      this.unit,
      context.mapData
    );

    // 最大5つの移動候補を評価
    const topPositions = movementRange
      .map(pos => ({
        position: pos,
        score: this.evaluatePosition(pos, context),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    for (const { position, score } of topPositions) {
      evaluations.push({
        action: {
          type: AIActionType.MOVE,
          priority: score,
          position,
          reasoning: `Move to strategic position (${position.x}, ${position.y})`,
        },
        score,
        reasoning: `Move to position (${position.x}, ${position.y})`,
        isSpecialAbility: false,
      });
    }

    return evaluations;
  }

  /**
   * ターゲット優先度を評価
   * @param target ターゲットユニット
   * @param context ゲームコンテキスト
   * @returns 優先度スコア
   */
  private evaluateTargetPriority(target: Unit, context: AIContext): number {
    let score = 0;

    // 基本優先度
    score += this.evaluateAttackTarget(target, context);

    // ボス固有の優先度調整
    // 低HPの敵を優先
    const hpRatio = target.currentHP / target.stats.maxHP;
    if (hpRatio < 0.3) {
      score += 30;
    } else if (hpRatio < 0.5) {
      score += 15;
    }

    // 高攻撃力の敵を優先
    if (target.stats.attack > this.unit.stats.attack) {
      score += 20;
    }

    // 回復役を優先
    if (this.integration.skillSystem) {
      const targetSkills = this.integration.skillSystem.getAvailableSkills(target);
      const hasHealSkill = targetSkills.some(skillId => {
        const skill = this.integration.skillSystem?.getSkill?.(skillId);
        return skill && skill.skillType === 'heal';
      });

      if (hasHealSkill) {
        score += 25;
      }
    }

    return score;
  }

  /**
   * 現在のターゲットを維持すべきかチェック
   * @param targetScores ターゲットスコアの配列
   * @param context ゲームコンテキスト
   * @returns 維持すべき場合true
   */
  private shouldKeepCurrentTarget(
    targetScores: Array<{ unit: Unit; score: number }>,
    context: AIContext
  ): boolean {
    if (!this.currentTarget) {
      return false;
    }

    // 現在のターゲットのスコアを取得
    const currentScore = targetScores.find(ts => ts.unit.id === this.currentTarget!.id)?.score || 0;

    // 最高スコアを取得
    const bestScore = targetScores[0]?.score || 0;

    // スコア差が閾値以下なら現在のターゲットを維持
    const scoreDifference = bestScore - currentScore;
    const threshold = bestScore * this.bossConfig.targetSwitchingThreshold;

    return scoreDifference <= threshold;
  }

  /**
   * 特殊能力の使用を評価
   * @param ability 特殊能力
   * @param context ゲームコンテキスト
   * @returns 評価スコア
   */
  private evaluateAbilityUsage(ability: BossAbility, context: AIContext): number {
    let score = 50; // 基本スコア

    // アクティブ能力は高優先度
    if (ability.type === 'active') {
      score += 30;
    }

    // HP割合に基づく調整
    const hpRatio = this.unit.currentHP / this.unit.stats.maxHP;
    if (hpRatio < 0.5 && ability.effect.type === 'heal') {
      score += 40;
    }

    // 敵の数に基づく調整
    if (ability.effect.target === 'area' && context.visibleEnemies.length >= 3) {
      score += 35;
    }

    // 使用頻度に基づく調整（使いすぎを防ぐ）
    const usageCount = this.abilityUsageHistory.get(ability.id) || 0;
    score -= usageCount * 5;

    return Math.max(0, score);
  }

  /**
   * 特殊能力の最適なターゲットを検索
   * @param ability 特殊能力
   * @param context ゲームコンテキスト
   * @returns ターゲットユニット
   */
  private findBestAbilityTarget(ability: BossAbility, context: AIContext): Unit | null {
    const potentialTargets = this.getPotentialAbilityTargets(ability, context);

    if (potentialTargets.length === 0) {
      return null;
    }

    // ターゲットを評価
    const targetScores = potentialTargets.map(target => ({
      unit: target,
      score: this.evaluateAbilityTarget(ability, target, context),
    }));

    // 最高スコアのターゲットを返す
    targetScores.sort((a, b) => b.score - a.score);
    return targetScores[0].unit;
  }

  /**
   * 特殊能力の潜在的なターゲットを取得
   * @param ability 特殊能力
   * @param context ゲームコンテキスト
   * @returns ターゲットの配列
   */
  private getPotentialAbilityTargets(ability: BossAbility, context: AIContext): Unit[] {
    const targets: Unit[] = [];
    const range = ability.effect.range || 1;

    switch (ability.effect.target) {
      case 'self':
        targets.push(this.unit);
        break;
      case 'enemy':
        targets.push(
          ...context.visibleEnemies.filter(
            enemy => this.calculateDistance(this.unit.position, enemy.position) <= range
          )
        );
        break;
      case 'ally':
        targets.push(
          ...context.visibleAllies.filter(
            ally =>
              ally.id !== this.unit.id &&
              this.calculateDistance(this.unit.position, ally.position) <= range
          )
        );
        break;
      case 'area':
        targets.push(...context.visibleEnemies);
        break;
    }

    return targets;
  }

  /**
   * 特殊能力のターゲットを評価
   * @param ability 特殊能力
   * @param target ターゲット
   * @param context ゲームコンテキスト
   * @returns 評価スコア
   */
  private evaluateAbilityTarget(ability: BossAbility, target: Unit, context: AIContext): number {
    let score = 0;

    // エフェクトタイプに基づく評価
    switch (ability.effect.type) {
      case 'damage':
        // ダメージ能力は低HPの敵を優先
        score += (1 - target.currentHP / target.stats.maxHP) * 50;
        break;
      case 'heal':
        // 回復能力は低HPの味方を優先
        score += (1 - target.currentHP / target.stats.maxHP) * 60;
        break;
      case 'buff':
        // バフは高HPの味方を優先
        score += (target.currentHP / target.stats.maxHP) * 40;
        break;
      case 'debuff':
        // デバフは強い敵を優先
        score += (target.stats.attack / this.unit.stats.attack) * 45;
        break;
    }

    return score;
  }

  /**
   * 利用可能な特殊能力を取得
   * @returns 特殊能力の配列
   */
  private getAvailableAbilities(): BossAbility[] {
    const currentPhase = this.getCurrentPhaseData();
    if (!currentPhase) {
      return [];
    }

    // 現在のフェーズで利用可能な能力をフィルタ
    return this.bossData.specialAbilities.filter(ability =>
      this.isAbilityAvailableInCurrentPhase(ability)
    );
  }

  /**
   * 特殊能力が現在のフェーズで利用可能かチェック
   * @param ability 特殊能力
   * @returns 利用可能な場合true
   */
  private isAbilityAvailableInCurrentPhase(ability: BossAbility): boolean {
    const currentPhase = this.getCurrentPhaseData();
    if (!currentPhase) {
      return false;
    }

    // 現在のフェーズまでに解放された能力かチェック
    for (let i = 0; i < this.bossData.currentPhase; i++) {
      const phase = this.bossData.phases[i];
      if (phase.newAbilities.includes(ability.id)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 特殊能力がクールダウン中かチェック
   * @param ability 特殊能力
   * @returns クールダウン中の場合true
   */
  private isAbilityOnCooldown(ability: BossAbility): boolean {
    if (!ability.cooldown) {
      return false;
    }

    const lastUsed = this.abilityUsageHistory.get(ability.id) || 0;
    const currentTurn = Date.now(); // 簡易的な実装

    // クールダウン期間が経過しているかチェック
    return currentTurn - lastUsed < ability.cooldown * 1000;
  }

  /**
   * 現在のフェーズデータを取得
   * @returns フェーズデータ
   */
  private getCurrentPhaseData(): BossPhase | null {
    const phaseIndex = this.bossData.currentPhase - 1;
    return this.bossData.phases[phaseIndex] || null;
  }

  /**
   * フェーズ変化をチェック
   * @param context ゲームコンテキスト
   */
  private checkPhaseChange(context: AIContext): void {
    const hpRatio = this.unit.currentHP / this.unit.stats.maxHP;
    const currentPhase = this.bossData.currentPhase;

    // 次のフェーズがあるかチェック
    if (currentPhase < this.bossData.phases.length) {
      const nextPhase = this.bossData.phases[currentPhase];
      if (hpRatio * 100 <= nextPhase.hpThreshold) {
        // フェーズ変化を記録
        this.lastPhaseChange = Date.now();
        this.bossData.currentPhase = currentPhase + 1;

        if (this.bossConfig.enableAILogging) {
          console.log(`Boss ${this.unit.name} entered phase ${this.bossData.currentPhase}`);
        }
      }
    }
  }

  /**
   * ボスデータからAI性格を作成
   * @param bossData ボスデータ
   * @returns AI性格
   */
  private static createBossPersonality(bossData: BossData): AIPersonality {
    // ボスのAI性格タイプに基づいてAIPersonalityを作成
    const basePersonality: AIPersonality = {
      aggressiveness: 0.7,
      defensiveness: 0.3,
      supportiveness: 0.2,
      riskTaking: 0.6,
      teamwork: 0.4,
      adaptability: 0.8,
      getPriorityModifier: (target: Unit) => {
        // ボスは常に高優先度
        return 1.5;
      },
    };

    // ボスタイプに基づいて調整
    switch (bossData.aiPersonality) {
      case 'aggressive':
        basePersonality.aggressiveness = 0.9;
        basePersonality.riskTaking = 0.8;
        break;
      case 'defensive':
        basePersonality.defensiveness = 0.8;
        basePersonality.aggressiveness = 0.4;
        break;
      case 'tactical':
        basePersonality.adaptability = 0.9;
        basePersonality.teamwork = 0.7;
        break;
      case 'balanced':
      default:
        // デフォルト値を使用
        break;
    }

    return basePersonality;
  }

  /**
   * システムを破棄
   */
  destroy(): void {
    this.currentTarget = null;
    this.abilityUsageHistory.clear();
  }
}
