/**
 * AIスキル評価器
 * 
 * AIがスキルを使用する際の判定と優先度計算を行う
 * スキルシステムと連携してAIの戦略的なスキル使用を実現
 */

import {
    AIAction,
    AIActionType,
    AIContext,
    AIPersonality,
    DifficultySettings
} from '../../types/ai';
import { Unit, Position } from '../../types/gameplay';
import {
    Skill,
    SkillType,
    TargetType,
    SkillUsabilityResult,
    SkillUsabilityError,
    CharacterSkillData
} from '../../types/skill';
import { SkillSystem } from '../skills/SkillSystem';
import { SkillConditionChecker } from '../skills/SkillConditionChecker';

/**
 * AIスキル評価結果
 */
export interface AISkillEvaluation {
    /** スキル */
    skill: Skill;
    /** 対象ユニット */
    target?: Unit;
    /** 対象位置 */
    targetPosition?: Position;
    /** 評価スコア（0-100） */
    score: number;
    /** 使用可能性 */
    usability: SkillUsabilityResult;
    /** 評価の詳細 */
    breakdown: AISkillEvaluationBreakdown;
    /** 推奨理由 */
    reasoning: string;
}

/**
 * AIスキル評価の詳細内訳
 */
export interface AISkillEvaluationBreakdown {
    /** 基本スコア */
    baseScore: number;
    /** 効果性スコア */
    effectivenessScore: number;
    /** タイミングスコア */
    timingScore: number;
    /** リソースコストスコア */
    resourceCostScore: number;
    /** 戦況適合度スコア */
    situationalScore: number;
    /** 性格修正値 */
    personalityModifier: number;
    /** 難易度修正値 */
    difficultyModifier: number;
    /** ランダム要素 */
    randomFactor: number;
}

/**
 * スキル使用戦況
 */
export interface SkillUsageSituation {
    /** 敵の数 */
    enemyCount: number;
    /** 味方の数 */
    allyCount: number;
    /** 平均敵HP比率 */
    averageEnemyHealthRatio: number;
    /** 平均味方HP比率 */
    averageAllyHealthRatio: number;
    /** 危険な敵の数 */
    dangerousEnemyCount: number;
    /** 負傷した味方の数 */
    injuredAllyCount: number;
    /** NPCの数 */
    npcCount: number;
    /** 現在のターン数 */
    currentTurn: number;
}

/**
 * AIスキル評価器
 */
export class AISkillEvaluator {
    private skillSystem: SkillSystem;
    private conditionChecker: SkillConditionChecker;

    // 評価重み設定
    private readonly evaluationWeights = {
        effectiveness: 0.35,
        timing: 0.25,
        resourceCost: 0.15,
        situational: 0.15,
        personality: 0.1
    };

    // スキルタイプ別基本優先度
    private readonly skillTypePriority = {
        [SkillType.ATTACK]: 70,
        [SkillType.HEAL]: 60,
        [SkillType.BUFF]: 50,
        [SkillType.DEBUFF]: 55,
        [SkillType.STATUS]: 45,
        [SkillType.SPECIAL]: 65
    };

    constructor(skillSystem: SkillSystem, conditionChecker: SkillConditionChecker) {
        this.skillSystem = skillSystem;
        this.conditionChecker = conditionChecker;
    }

    /**
     * AIのスキル使用判定を行う
     * @param context AI思考コンテキスト
     * @param personality AI性格
     * @param difficultySettings 難易度設定
     * @returns スキル評価結果の配列（スコア順）
     */
    evaluateSkillUsage(
        context: AIContext,
        personality: AIPersonality,
        difficultySettings: DifficultySettings
    ): AISkillEvaluation[] {
        const evaluations: AISkillEvaluation[] = [];
        const currentUnit = context.currentCharacter || context.currentUnit;

        if (!currentUnit) {
            return evaluations;
        }

        // 使用可能なスキルを取得
        const availableSkills = this.skillSystem.getAvailableSkills(currentUnit.id);
        const characterSkillData = this.conditionChecker.getCharacterSkillData(currentUnit.id);
        const situation = this.analyzeSituation(context);

        for (const skillMenuItem of availableSkills) {
            const skill = skillMenuItem.skill;
            const usability = skillMenuItem.usability;

            // 使用不可能なスキルはスキップ
            if (!usability.canUse) {
                continue;
            }

            // 各スキルの最適な対象を見つけて評価
            const targets = this.findOptimalTargets(skill, context);

            for (const target of targets) {
                const evaluation = this.evaluateSkillForTarget(
                    skill,
                    target.unit,
                    target.position,
                    context,
                    personality,
                    difficultySettings,
                    situation,
                    usability,
                    characterSkillData
                );

                if (evaluation.score > 0) {
                    evaluations.push(evaluation);
                }
            }
        }

        // スコア順でソート
        evaluations.sort((a, b) => b.score - a.score);

        return evaluations;
    }

    /**
     * 特定のスキルと対象に対する評価を行う
     */
    private evaluateSkillForTarget(
        skill: Skill,
        target: Unit | undefined,
        targetPosition: Position,
        context: AIContext,
        personality: AIPersonality,
        difficultySettings: DifficultySettings,
        situation: SkillUsageSituation,
        usability: SkillUsabilityResult,
        characterSkillData: CharacterSkillData | null
    ): AISkillEvaluation {
        // 基本スコア
        const baseScore = this.skillTypePriority[skill.skillType] || 50;

        // 効果性評価
        const effectivenessScore = this.evaluateSkillEffectiveness(
            skill, target, targetPosition, context, situation
        );

        // タイミング評価
        const timingScore = this.evaluateSkillTiming(
            skill, target, context, situation
        );

        // リソースコスト評価
        const resourceCostScore = this.evaluateResourceCost(
            skill, context.currentCharacter || context.currentUnit!, characterSkillData
        );

        // 戦況適合度評価
        const situationalScore = this.evaluateSituationalFit(
            skill, target, context, situation
        );

        // 性格修正値
        const personalityModifier = this.calculatePersonalityModifier(
            skill, target, personality
        );

        // 難易度修正値
        const difficultyModifier = this.calculateDifficultyModifier(
            skill, difficultySettings
        );

        // ランダム要素
        const randomFactor = this.calculateRandomFactor(difficultySettings);

        // 評価内訳
        const breakdown: AISkillEvaluationBreakdown = {
            baseScore,
            effectivenessScore,
            timingScore,
            resourceCostScore,
            situationalScore,
            personalityModifier,
            difficultyModifier,
            randomFactor
        };

        // 総合スコア計算
        const totalScore = this.calculateTotalScore(breakdown);

        // 推奨理由生成
        const reasoning = this.generateReasoning(skill, target, breakdown, situation);

        return {
            skill,
            target,
            targetPosition,
            score: Math.max(0, Math.min(100, totalScore)),
            usability,
            breakdown,
            reasoning
        };
    }

    /**
     * スキルの効果性を評価
     */
    private evaluateSkillEffectiveness(
        skill: Skill,
        target: Unit | undefined,
        targetPosition: Position,
        context: AIContext,
        situation: SkillUsageSituation
    ): number {
        let score = 0;

        switch (skill.skillType) {
            case SkillType.ATTACK:
                score = this.evaluateAttackSkillEffectiveness(skill, target, context);
                break;
            case SkillType.HEAL:
                score = this.evaluateHealSkillEffectiveness(skill, target, context, situation);
                break;
            case SkillType.BUFF:
                score = this.evaluateBuffSkillEffectiveness(skill, target, context, situation);
                break;
            case SkillType.DEBUFF:
                score = this.evaluateDebuffSkillEffectiveness(skill, target, context);
                break;
            case SkillType.STATUS:
                score = this.evaluateStatusSkillEffectiveness(skill, target, context);
                break;
            case SkillType.SPECIAL:
                score = this.evaluateSpecialSkillEffectiveness(skill, target, context, situation);
                break;
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * 攻撃スキルの効果性評価
     */
    private evaluateAttackSkillEffectiveness(
        skill: Skill,
        target: Unit | undefined,
        context: AIContext
    ): number {
        if (!target || target.faction === context.currentCharacter?.faction) {
            return 0;
        }

        let score = 50; // 基本スコア

        // ダメージ効果の評価
        const damageEffects = skill.effects.filter(effect => effect.type === 'damage');
        for (const effect of damageEffects) {
            // 対象のHP比率に基づく評価
            const healthRatio = target.currentHP / target.stats.maxHP;
            const damageRatio = effect.value / target.currentHP;

            // 一撃で倒せる場合は高評価
            if (damageRatio >= 1.0) {
                score += 40;
            } else if (damageRatio >= 0.5) {
                score += 25;
            } else if (damageRatio >= 0.3) {
                score += 15;
            }

            // 低HPの敵により高いスコア
            score += (1 - healthRatio) * 20;
        }

        // NPCは最優先攻撃対象
        if (this.isNPC(target, context)) {
            score += 50;
        }

        // 範囲攻撃の場合、巻き込める敵の数を評価
        if (skill.areaOfEffect.shape !== 'single') {
            const affectedPositions = skill.getAffectedPositions(target.position);
            const additionalTargets = context.visibleEnemies.filter(enemy =>
                enemy.id !== target.id &&
                affectedPositions.some(pos => pos.x === enemy.position.x && pos.y === enemy.position.y)
            );
            score += additionalTargets.length * 15;
        }

        return score;
    }

    /**
     * 回復スキルの効果性評価
     */
    private evaluateHealSkillEffectiveness(
        skill: Skill,
        target: Unit | undefined,
        context: AIContext,
        situation: SkillUsageSituation
    ): number {
        if (!target || target.faction !== context.currentCharacter?.faction) {
            return 0;
        }

        let score = 30; // 基本スコア

        // 対象のHP状況による評価
        const healthRatio = target.currentHP / target.stats.maxHP;

        if (healthRatio <= 0.2) {
            score += 50; // 瀕死状態は最優先
        } else if (healthRatio <= 0.4) {
            score += 35;
        } else if (healthRatio <= 0.6) {
            score += 20;
        } else if (healthRatio <= 0.8) {
            score += 10;
        } else {
            score -= 20; // ほぼ満タンなら不要
        }

        // 回復効果の評価
        const healEffects = skill.effects.filter(effect => effect.type === 'heal');
        for (const effect of healEffects) {
            const healRatio = effect.value / target.stats.maxHP;
            score += healRatio * 30;
        }

        // 味方の負傷状況による調整
        if (situation.injuredAllyCount > 2) {
            score += 15; // 多くの味方が負傷している場合
        }

        // 範囲回復の場合、巻き込める味方の数を評価
        if (skill.areaOfEffect.shape !== 'single') {
            const affectedPositions = skill.getAffectedPositions(target.position);
            const additionalTargets = context.visibleAllies.filter(ally =>
                ally.id !== target.id &&
                ally.currentHP < ally.stats.maxHP &&
                affectedPositions.some(pos => pos.x === ally.position.x && pos.y === ally.position.y)
            );
            score += additionalTargets.length * 20;
        }

        return score;
    }

    /**
     * バフスキルの効果性評価
     */
    private evaluateBuffSkillEffectiveness(
        skill: Skill,
        target: Unit | undefined,
        context: AIContext,
        situation: SkillUsageSituation
    ): number {
        if (!target || target.faction !== context.currentCharacter?.faction) {
            return 0;
        }

        let score = 40; // 基本スコア

        // バフ効果の評価
        const buffEffects = skill.effects.filter(effect => effect.type === 'buff');
        for (const effect of buffEffects) {
            // 攻撃力バフは攻撃的な状況で有効
            if (effect.buffType?.includes('ATTACK')) {
                score += situation.enemyCount * 8;
            }
            // 防御力バフは危険な状況で有効
            if (effect.buffType?.includes('DEFENSE')) {
                score += situation.dangerousEnemyCount * 10;
            }
            // 速度バフは常に有用
            if (effect.buffType?.includes('SPEED')) {
                score += 15;
            }
        }

        // 対象の現在の状態による調整
        const healthRatio = target.currentHP / target.stats.maxHP;
        if (healthRatio > 0.7) {
            score += 10; // 健康な味方により効果的
        }

        return score;
    }

    /**
     * デバフスキルの効果性評価
     */
    private evaluateDebuffSkillEffectiveness(
        skill: Skill,
        target: Unit | undefined,
        context: AIContext
    ): number {
        if (!target || target.faction === context.currentCharacter?.faction) {
            return 0;
        }

        let score = 35; // 基本スコア

        // デバフ効果の評価
        const debuffEffects = skill.effects.filter(effect => effect.type === 'debuff');
        for (const effect of debuffEffects) {
            // 強い敵により効果的
            const enemyStrength = target.stats.attack + target.stats.defense;
            score += Math.min(enemyStrength * 0.1, 20);

            // 攻撃力デバフは攻撃的な敵に有効
            if (effect.buffType?.includes('ATTACK_DOWN')) {
                score += target.stats.attack * 0.2;
            }
            // 防御力デバフは硬い敵に有効
            if (effect.buffType?.includes('DEFENSE_DOWN')) {
                score += target.stats.defense * 0.2;
            }
        }

        // NPCには効果が薄い（すぐに倒すべき）
        if (this.isNPC(target, context)) {
            score *= 0.5;
        }

        return score;
    }

    /**
     * 状態異常スキルの効果性評価
     */
    private evaluateStatusSkillEffectiveness(
        skill: Skill,
        target: Unit | undefined,
        context: AIContext
    ): number {
        if (!target || target.faction === context.currentCharacter?.faction) {
            return 0;
        }

        let score = 30; // 基本スコア

        // 状態異常効果の評価
        const statusEffects = skill.effects.filter(effect => effect.type === 'status');
        for (const effect of statusEffects) {
            // 強い敵により効果的
            const enemyStrength = target.stats.attack + target.stats.defense;
            score += Math.min(enemyStrength * 0.15, 25);

            // 成功確率による調整
            if (effect.successRate) {
                score *= effect.successRate / 100;
            }
        }

        return score;
    }

    /**
     * 特殊スキルの効果性評価
     */
    private evaluateSpecialSkillEffectiveness(
        skill: Skill,
        target: Unit | undefined,
        context: AIContext,
        situation: SkillUsageSituation
    ): number {
        // 特殊スキルは個別に評価が必要
        // ここでは基本的な評価のみ実装
        let score = 45;

        // 複数の効果を持つ場合は高評価
        if (skill.effects.length > 1) {
            score += skill.effects.length * 5;
        }

        // 戦況に応じた調整
        if (situation.enemyCount > situation.allyCount) {
            score += 15; // 劣勢時は特殊スキルが有効
        }

        return score;
    }

    /**
     * スキル使用タイミングの評価
     */
    private evaluateSkillTiming(
        skill: Skill,
        target: Unit | undefined,
        context: AIContext,
        situation: SkillUsageSituation
    ): number {
        let score = 50; // 基本スコア

        // ターン数による調整
        if (situation.currentTurn <= 3) {
            // 序盤はバフ・準備系スキルが有効
            if (skill.skillType === SkillType.BUFF) {
                score += 20;
            }
        } else if (situation.currentTurn >= 10) {
            // 終盤は決定打となるスキルが有効
            if (skill.skillType === SkillType.ATTACK || skill.skillType === SkillType.SPECIAL) {
                score += 15;
            }
        }

        // MP残量による調整
        const currentUnit = context.currentCharacter || context.currentUnit!;
        const mpRatio = currentUnit.currentMP / currentUnit.stats.maxMP;
        const skillMpCost = skill.usageCondition.mpCost;
        const mpCostRatio = skillMpCost / currentUnit.stats.maxMP;

        if (mpRatio > 0.7) {
            // MP豊富な時は高コストスキルも使用可能
            score += 10;
        } else if (mpRatio < 0.3) {
            // MP不足時は低コストスキルを優先
            score -= mpCostRatio * 30;
        }

        // 戦況の緊急度による調整
        if (situation.averageAllyHealthRatio < 0.4) {
            // 味方が危険な状況では回復・支援を優先
            if (skill.skillType === SkillType.HEAL || skill.skillType === SkillType.BUFF) {
                score += 25;
            }
        }

        if (situation.averageEnemyHealthRatio < 0.3) {
            // 敵が弱っている時は攻撃を優先
            if (skill.skillType === SkillType.ATTACK) {
                score += 20;
            }
        }

        return score;
    }

    /**
     * リソースコストの評価
     */
    private evaluateResourceCost(
        skill: Skill,
        caster: Unit,
        characterSkillData: CharacterSkillData | null
    ): number {
        let score = 50; // 基本スコア

        // MP消費量による評価
        const mpCost = skill.usageCondition.mpCost;
        const mpRatio = caster.currentMP / caster.stats.maxMP;
        const costRatio = mpCost / caster.stats.maxMP;

        if (costRatio <= 0.1) {
            score += 20; // 低コスト
        } else if (costRatio <= 0.3) {
            score += 10; // 中コスト
        } else if (costRatio <= 0.5) {
            score -= 10; // 高コスト
        } else {
            score -= 30; // 超高コスト
        }

        // MP不足リスクの評価
        if (mpCost > caster.currentMP * 0.8) {
            score -= 25; // MP大部分を消費するリスク
        }

        // クールダウンによる評価
        const cooldown = skill.usageCondition.cooldown;
        if (cooldown > 0) {
            score -= cooldown * 2; // クールダウンが長いほど慎重に
        }

        // 使用回数制限による評価
        const usageLimit = skill.usageCondition.usageLimit;
        if (usageLimit > 0 && characterSkillData) {
            const usedCount = characterSkillData.skillUsageCounts.get(skill.id) || 0;
            const remainingUses = usageLimit - usedCount;

            if (remainingUses <= 1) {
                score -= 20; // 最後の使用は慎重に
            } else if (remainingUses <= 3) {
                score -= 10;
            }
        }

        return score;
    }

    /**
     * 戦況適合度の評価
     */
    private evaluateSituationalFit(
        skill: Skill,
        target: Unit | undefined,
        context: AIContext,
        situation: SkillUsageSituation
    ): number {
        let score = 50; // 基本スコア

        // 敵味方の数的バランス
        const numericalAdvantage = situation.allyCount - situation.enemyCount;

        if (numericalAdvantage > 0) {
            // 数的優位時は攻撃的スキルが有効
            if (skill.skillType === SkillType.ATTACK) {
                score += 15;
            }
        } else if (numericalAdvantage < 0) {
            // 数的劣位時は防御的・支援スキルが有効
            if (skill.skillType === SkillType.HEAL || skill.skillType === SkillType.BUFF) {
                score += 15;
            }
        }

        // NPCの存在による調整
        if (situation.npcCount > 0) {
            if (skill.skillType === SkillType.ATTACK && target && this.isNPC(target, context)) {
                score += 30; // NPC攻撃は最優先
            } else if (skill.skillType === SkillType.HEAL || skill.skillType === SkillType.BUFF) {
                score += 10; // NPCを守るための支援も重要
            }
        }

        // 範囲スキルの状況適合度
        if (skill.areaOfEffect.shape !== 'single') {
            const enemyDensity = this.calculateEnemyDensity(context);
            const allyDensity = this.calculateAllyDensity(context);

            if (skill.targetType.includes('ENEMY') && enemyDensity > 0.3) {
                score += 20; // 敵が密集している時の範囲攻撃
            }
            if (skill.targetType.includes('ALLY') && allyDensity > 0.3) {
                score += 15; // 味方が密集している時の範囲支援
            }
        }

        return score;
    }

    /**
     * 性格による修正値計算
     */
    private calculatePersonalityModifier(
        skill: Skill,
        target: Unit | undefined,
        personality: AIPersonality
    ): number {
        let modifier = 0;

        switch (skill.skillType) {
            case SkillType.ATTACK:
                modifier += personality.aggressiveness * 20;
                break;
            case SkillType.HEAL:
                modifier += personality.supportiveness * 20;
                break;
            case SkillType.BUFF:
                modifier += personality.supportiveness * 15;
                break;
            case SkillType.DEBUFF:
                modifier += personality.tacticalness * 15;
                break;
            case SkillType.STATUS:
                modifier += personality.tacticalness * 10;
                break;
            case SkillType.SPECIAL:
                modifier += personality.tacticalness * 12;
                break;
        }

        // リスク許容度による調整
        const riskLevel = this.calculateSkillRiskLevel(skill);
        if (riskLevel > 0.5) {
            modifier += (personality.riskTolerance - 0.5) * 20;
        }

        return modifier;
    }

    /**
     * 難易度による修正値計算
     */
    private calculateDifficultyModifier(
        skill: Skill,
        difficultySettings: DifficultySettings
    ): number {
        let modifier = 0;

        // スキル使用頻度による調整
        modifier += (difficultySettings.skillUsageFrequency - 0.5) * 20;

        // 思考深度による調整（深く考えるほど最適なスキルを選択）
        modifier += (difficultySettings.thinkingDepth - 3) * 5;

        return modifier;
    }

    /**
     * ランダム要素の計算
     */
    private calculateRandomFactor(difficultySettings: DifficultySettings): number {
        const randomRange = difficultySettings.randomnessFactor * 20;
        return (Math.random() - 0.5) * randomRange;
    }

    /**
     * 総合スコアの計算
     */
    private calculateTotalScore(breakdown: AISkillEvaluationBreakdown): number {
        return (
            breakdown.baseScore +
            breakdown.effectivenessScore * this.evaluationWeights.effectiveness +
            breakdown.timingScore * this.evaluationWeights.timing +
            breakdown.resourceCostScore * this.evaluationWeights.resourceCost +
            breakdown.situationalScore * this.evaluationWeights.situational +
            breakdown.personalityModifier * this.evaluationWeights.personality +
            breakdown.difficultyModifier +
            breakdown.randomFactor
        );
    }

    /**
     * 最適な対象を見つける
     */
    private findOptimalTargets(skill: Skill, context: AIContext): Array<{ unit?: Unit, position: Position }> {
        const targets: Array<{ unit?: Unit, position: Position }> = [];
        const currentUnit = context.currentCharacter || context.currentUnit!;

        // 対象タイプに応じて候補を選択
        switch (skill.targetType) {
            case TargetType.SELF:
                targets.push({ unit: currentUnit, position: currentUnit.position });
                break;

            case TargetType.SINGLE_ENEMY:
            case TargetType.AREA_ENEMY:
            case TargetType.ALL_ENEMIES:
                for (const enemy of context.visibleEnemies) {
                    if (this.isInRange(currentUnit.position, enemy.position, skill.range)) {
                        targets.push({ unit: enemy, position: enemy.position });
                    }
                }
                break;

            case TargetType.SINGLE_ALLY:
            case TargetType.AREA_ALLY:
            case TargetType.ALL_ALLIES:
                for (const ally of context.visibleAllies) {
                    if (ally.id !== currentUnit.id &&
                        this.isInRange(currentUnit.position, ally.position, skill.range)) {
                        targets.push({ unit: ally, position: ally.position });
                    }
                }
                break;

            case TargetType.SINGLE_ANY:
            case TargetType.AREA_ANY:
            case TargetType.ALL_ANY:
                // 敵と味方の両方を対象に
                for (const enemy of context.visibleEnemies) {
                    if (this.isInRange(currentUnit.position, enemy.position, skill.range)) {
                        targets.push({ unit: enemy, position: enemy.position });
                    }
                }
                for (const ally of context.visibleAllies) {
                    if (ally.id !== currentUnit.id &&
                        this.isInRange(currentUnit.position, ally.position, skill.range)) {
                        targets.push({ unit: ally, position: ally.position });
                    }
                }
                break;
        }

        return targets;
    }

    /**
     * 戦況分析
     */
    private analyzeSituation(context: AIContext): SkillUsageSituation {
        const enemyCount = context.visibleEnemies.length;
        const allyCount = context.visibleAllies.length;

        const averageEnemyHealthRatio = enemyCount > 0
            ? context.visibleEnemies.reduce((sum, enemy) =>
                sum + (enemy.currentHP / enemy.stats.maxHP), 0) / enemyCount
            : 1;

        const averageAllyHealthRatio = allyCount > 0
            ? context.visibleAllies.reduce((sum, ally) =>
                sum + (ally.currentHP / ally.stats.maxHP), 0) / allyCount
            : 1;

        const dangerousEnemyCount = context.visibleEnemies.filter(enemy =>
            enemy.stats.attack > 50 || enemy.currentHP > enemy.stats.maxHP * 0.8
        ).length;

        const injuredAllyCount = context.visibleAllies.filter(ally =>
            ally.currentHP < ally.stats.maxHP * 0.7
        ).length;

        const npcCount = context.npcs.length;

        return {
            enemyCount,
            allyCount,
            averageEnemyHealthRatio,
            averageAllyHealthRatio,
            dangerousEnemyCount,
            injuredAllyCount,
            npcCount,
            currentTurn: context.turnNumber
        };
    }

    /**
     * 推奨理由の生成
     */
    private generateReasoning(
        skill: Skill,
        target: Unit | undefined,
        breakdown: AISkillEvaluationBreakdown,
        situation: SkillUsageSituation
    ): string {
        const reasons: string[] = [];

        // 主要な評価要因を特定
        const scores = [
            { name: 'effectiveness', value: breakdown.effectivenessScore },
            { name: 'timing', value: breakdown.timingScore },
            { name: 'resourceCost', value: breakdown.resourceCostScore },
            { name: 'situational', value: breakdown.situationalScore }
        ];

        const topScore = scores.reduce((max, current) =>
            current.value > max.value ? current : max
        );

        // スキルタイプ別の理由
        switch (skill.skillType) {
            case SkillType.ATTACK:
                if (target && this.isNPC(target, null)) {
                    reasons.push('NPCを優先攻撃');
                } else if (target && target.currentHP < target.stats.maxHP * 0.3) {
                    reasons.push('瀕死の敵を確実に撃破');
                } else {
                    reasons.push('攻撃的な行動を選択');
                }
                break;
            case SkillType.HEAL:
                if (target && target.currentHP < target.stats.maxHP * 0.3) {
                    reasons.push('瀕死の味方を緊急回復');
                } else {
                    reasons.push('味方の支援');
                }
                break;
            case SkillType.BUFF:
                reasons.push('味方の能力強化');
                break;
            case SkillType.DEBUFF:
                reasons.push('敵の能力低下');
                break;
        }

        // 戦況による理由
        if (situation.npcCount > 0) {
            reasons.push('NPC保護を考慮');
        }
        if (situation.injuredAllyCount > 2) {
            reasons.push('多数の負傷者への対応');
        }
        if (situation.enemyCount > situation.allyCount) {
            reasons.push('数的劣勢への対策');
        }

        return reasons.join(', ');
    }

    /**
     * ユーティリティメソッド
     */
    private isInRange(from: Position, to: Position, range: number): boolean {
        const distance = Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
        return distance <= range;
    }

    private isNPC(unit: Unit, context: AIContext | null): boolean {
        // NPCかどうかの判定（仲間化システムとの連携）
        // 実装は仲間化システムの実装に依存
        return false; // 暫定実装
    }

    private calculateEnemyDensity(context: AIContext): number {
        // 敵の密集度を計算（簡易実装）
        if (context.visibleEnemies.length < 2) return 0;

        let totalDistance = 0;
        let pairCount = 0;

        for (let i = 0; i < context.visibleEnemies.length; i++) {
            for (let j = i + 1; j < context.visibleEnemies.length; j++) {
                const distance = Math.abs(
                    context.visibleEnemies[i].position.x - context.visibleEnemies[j].position.x
                ) + Math.abs(
                    context.visibleEnemies[i].position.y - context.visibleEnemies[j].position.y
                );
                totalDistance += distance;
                pairCount++;
            }
        }

        const averageDistance = totalDistance / pairCount;
        return Math.max(0, 1 - averageDistance / 10); // 10マス以内なら密集とみなす
    }

    private calculateAllyDensity(context: AIContext): number {
        // 味方の密集度を計算（敵の密集度と同様の実装）
        if (context.visibleAllies.length < 2) return 0;

        let totalDistance = 0;
        let pairCount = 0;

        for (let i = 0; i < context.visibleAllies.length; i++) {
            for (let j = i + 1; j < context.visibleAllies.length; j++) {
                const distance = Math.abs(
                    context.visibleAllies[i].position.x - context.visibleAllies[j].position.x
                ) + Math.abs(
                    context.visibleAllies[i].position.y - context.visibleAllies[j].position.y
                );
                totalDistance += distance;
                pairCount++;
            }
        }

        const averageDistance = totalDistance / pairCount;
        return Math.max(0, 1 - averageDistance / 10);
    }

    private calculateSkillRiskLevel(skill: Skill): number {
        let risk = 0;

        // MP消費量によるリスク
        risk += skill.usageCondition.mpCost / 100;

        // クールダウンによるリスク
        risk += skill.usageCondition.cooldown / 10;

        // 使用回数制限によるリスク
        if (skill.usageCondition.usageLimit > 0) {
            risk += 0.2;
        }

        return Math.min(1, risk);
    }
}