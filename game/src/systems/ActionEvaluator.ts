/**
 * ActionEvaluator - AI action evaluation system
 *
 * This module provides:
 * - Evaluation of different action types (move, attack, skill, wait)
 * - Tactical evaluation (terrain, position, threat level)
 * - Strategic scoring for AI decision making
 * - Integration with game systems for accurate evaluation
 */

import {
    AIAction,
    AIActionType,
    AIContext,
    AITarget,
    DifficultySettings,
    AISystemIntegration,
} from '../types/ai';
import { Unit, Position, MapData } from '../types/gameplay';
import { Skill, SkillType, TargetType, SkillUsabilityResult } from '../types/skill';

/**
 * Evaluation result for an action
 */
export interface ActionEvaluation {
    action: AIAction;
    score: number;
    tacticalScore: number;
    strategicScore: number;
    riskLevel: number;
    confidence: number;
    breakdown: EvaluationBreakdown;
}

/**
 * Detailed breakdown of evaluation factors
 */
export interface EvaluationBreakdown {
    baseScore: number;
    positionScore: number;
    threatScore: number;
    opportunityScore: number;
    terrainScore: number;
    personalityModifier: number;
    difficultyModifier: number;
    randomFactor: number;
}

/**
 * Terrain evaluation data
 */
export interface TerrainEvaluation {
    defensiveBonus: number;
    movementCost: number;
    coverValue: number;
    strategicValue: number;
    hazardLevel: number;
}

/**
 * Threat assessment for a position
 */
export interface ThreatAssessment {
    immediateThreats: Unit[];
    potentialThreats: Unit[];
    threatLevel: number;
    escapeRoutes: Position[];
    safetyScore: number;
}

/**
 * ActionEvaluator class for AI decision making
 */
export class ActionEvaluator {
    private integration: AISystemIntegration;
    private difficultySettings: DifficultySettings;

    // Evaluation weights (can be configured)
    private readonly weights = {
        position: 0.3,
        threat: 0.25,
        opportunity: 0.25,
        terrain: 0.1,
        personality: 0.1,
    };

    constructor(integration: AISystemIntegration, difficultySettings: DifficultySettings) {
        this.integration = integration;
        this.difficultySettings = difficultySettings;
    }

    /**
     * Evaluate a move action
     * @param from Starting position
     * @param to Target position
     * @param context Current game context
     * @returns Evaluation score (0-100)
     */
    public evaluateMove(from: Position, to: Position, context: AIContext): ActionEvaluation {
        const action: AIAction = {
            type: AIActionType.MOVE,
            priority: 0,
            position: to,
            reasoning: `Move from (${from.x},${from.y}) to (${to.x},${to.y})`,
        };

        // Base movement evaluation
        const baseScore = this.calculateMoveBaseScore(from, to, context);

        // Position evaluation
        const positionScore = this.evaluatePositionalAdvantage(to, context);

        // Threat evaluation
        const threatScore = this.evaluateThreatLevel(to, context);

        // Terrain evaluation
        const terrainScore = this.evaluateTerrainBonus(to, context);

        // Opportunity evaluation (what actions become available from this position)
        const opportunityScore = this.evaluateOpportunities(to, context);

        const breakdown: EvaluationBreakdown = {
            baseScore,
            positionScore,
            threatScore: -threatScore, // Negative because high threat is bad
            opportunityScore,
            terrainScore,
            personalityModifier: 0,
            difficultyModifier: 0,
            randomFactor: 0,
        };

        const tacticalScore = this.calculateTacticalScore(breakdown);
        const strategicScore = this.calculateStrategicScore(to, context);
        const riskLevel = this.calculateRiskLevel(to, context);
        const confidence = this.calculateConfidence(breakdown);

        const totalScore = tacticalScore + strategicScore;

        return {
            action: { ...action, priority: totalScore },
            score: totalScore,
            tacticalScore,
            strategicScore,
            riskLevel,
            confidence,
            breakdown,
        };
    }

    /**
     * Evaluate an attack action
     * @param attacker Attacking unit
     * @param target Target unit
     * @param context Current game context
     * @returns Evaluation score (0-100)
     */
    public evaluateAttack(attacker: Unit, target: Unit, context: AIContext): ActionEvaluation {
        const action: AIAction = {
            type: AIActionType.ATTACK,
            priority: 0,
            target,
            reasoning: `Attack ${target.name}`,
        };

        // Base attack evaluation
        const baseScore = this.calculateAttackBaseScore(attacker, target, context);

        // Target priority (NPCs have higher priority)
        const targetPriority = this.evaluateTargetPriority(target, context);

        // Damage potential
        const damageScore = this.evaluateDamagePotential(attacker, target, context);

        // Risk assessment
        const riskScore = this.evaluateAttackRisk(attacker, target, context);

        // Tactical positioning
        const positionScore = this.evaluateAttackPosition(attacker, target, context);

        const breakdown: EvaluationBreakdown = {
            baseScore,
            positionScore,
            threatScore: -riskScore,
            opportunityScore: damageScore,
            terrainScore: 0,
            personalityModifier: targetPriority,
            difficultyModifier: 0,
            randomFactor: 0,
        };

        const tacticalScore = this.calculateTacticalScore(breakdown);
        const strategicScore = targetPriority;
        const riskLevel = riskScore;
        const confidence = this.calculateConfidence(breakdown);

        const totalScore = tacticalScore + strategicScore;

        return {
            action: { ...action, priority: totalScore },
            score: totalScore,
            tacticalScore,
            strategicScore,
            riskLevel,
            confidence,
            breakdown,
        };
    }

    /**
     * Evaluate a skill use action
     * @param skill Skill to use (can be string ID or Skill object)
     * @param target Target unit (optional)
     * @param context Current game context
     * @returns Evaluation score (0-100)
     */
    public evaluateSkillUse(skill: string | Skill, target: Unit | undefined, context: AIContext): ActionEvaluation {
        const skillId = typeof skill === 'string' ? skill : skill.id;
        const skillObj = typeof skill === 'string' ? this.getSkillFromSystem(skill, context) : skill;

        const action: AIAction = {
            type: AIActionType.SKILL,
            priority: 0,
            skillId,
            skill: skillObj,
            target,
            reasoning: `Use skill ${skillId}${target ? ` on ${target.name}` : ''}`,
        };

        // Base skill evaluation
        const baseScore = this.calculateSkillBaseScore(skillObj, target, context);

        // Skill effectiveness
        const effectivenessScore = this.evaluateSkillEffectiveness(skillObj, target, context);

        // Resource cost consideration
        const costScore = this.evaluateSkillCost(skillObj, context);

        // Timing evaluation
        const timingScore = this.evaluateSkillTiming(skillObj, target, context);

        const breakdown: EvaluationBreakdown = {
            baseScore,
            positionScore: 0,
            threatScore: 0,
            opportunityScore: effectivenessScore,
            terrainScore: 0,
            personalityModifier: timingScore,
            difficultyModifier: -costScore, // Negative because high cost is bad
            randomFactor: 0,
        };

        const tacticalScore = this.calculateTacticalScore(breakdown);
        const strategicScore = effectivenessScore;
        const riskLevel = costScore;
        const confidence = this.calculateConfidence(breakdown);

        const totalScore = tacticalScore + strategicScore;

        return {
            action: { ...action, priority: totalScore },
            score: totalScore,
            tacticalScore,
            strategicScore,
            riskLevel,
            confidence,
            breakdown,
        };
    }

    /**
     * Evaluate a wait action
     * @param context Current game context
     * @returns Evaluation score (0-100)
     */
    public evaluateWait(context: AIContext): ActionEvaluation {
        const action: AIAction = {
            type: AIActionType.WAIT,
            priority: 0,
            reasoning: 'Wait and observe',
        };

        // Wait is generally low priority but safe
        const baseScore = 10;

        // Higher score if in a good defensive position
        const positionScore = this.evaluatePositionalAdvantage(context.currentUnit.position, context);

        // Lower score if there are immediate threats
        const threatScore = this.evaluateThreatLevel(context.currentUnit.position, context);

        const breakdown: EvaluationBreakdown = {
            baseScore,
            positionScore: positionScore * 0.5, // Reduced weight for waiting
            threatScore: -threatScore * 0.3, // Reduced penalty for waiting
            opportunityScore: 0,
            terrainScore: 0,
            personalityModifier: 0,
            difficultyModifier: 0,
            randomFactor: 0,
        };

        const tacticalScore = this.calculateTacticalScore(breakdown);
        const strategicScore = 0; // Waiting has no strategic value
        const riskLevel = 0; // Waiting is safe
        const confidence = 0.8; // High confidence in wait evaluation

        const totalScore = tacticalScore;

        return {
            action: { ...action, priority: totalScore },
            score: totalScore,
            tacticalScore,
            strategicScore,
            riskLevel,
            confidence,
            breakdown,
        };
    }

    /**
     * Evaluate positional advantage of a location
     * @param position Position to evaluate
     * @param context Current game context
     * @returns Position score (0-100)
     */
    public evaluatePositionalAdvantage(position: Position, context: AIContext): number {
        let score = 0;

        // Distance to enemies (closer can be better for attackers, worse for supporters)
        const enemyDistances = context.visibleEnemies.map(enemy =>
            this.calculateDistance(position, enemy.position)
        );

        if (enemyDistances.length > 0) {
            const avgEnemyDistance = enemyDistances.reduce((a, b) => a + b, 0) / enemyDistances.length;
            const minEnemyDistance = Math.min(...enemyDistances);

            // Balanced distance scoring (not too close, not too far)
            const optimalDistance = 3;
            score += Math.max(0, 20 - Math.abs(minEnemyDistance - optimalDistance) * 5);
        }

        // Distance to allies (closer is generally better for coordination)
        const allyDistances = context.visibleAllies.map(ally =>
            this.calculateDistance(position, ally.position)
        );

        if (allyDistances.length > 0) {
            const avgAllyDistance = allyDistances.reduce((a, b) => a + b, 0) / allyDistances.length;
            score += Math.max(0, 15 - avgAllyDistance * 2);
        }

        // Central positioning bonus (avoid corners and edges)
        if (context.mapData) {
            const centerX = context.mapData.width / 2;
            const centerY = context.mapData.height / 2;
            const distanceFromCenter = this.calculateDistance(position, { x: centerX, y: centerY });
            const maxDistance = Math.max(context.mapData.width, context.mapData.height) / 2;
            score += (1 - distanceFromCenter / maxDistance) * 10;
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Evaluate terrain bonus at a position
     * @param position Position to evaluate
     * @param context Current game context
     * @returns Terrain score (0-100)
     */
    public evaluateTerrainBonus(position: Position, context: AIContext): number {
        if (!context.mapData) return 0;

        // This is a simplified terrain evaluation
        // In a real game, this would check actual terrain data
        let score = 0;

        // Check if position is within map bounds
        if (position.x < 0 || position.x >= context.mapData.width ||
            position.y < 0 || position.y >= context.mapData.height) {
            return -100; // Invalid position
        }

        // Base terrain score (would be based on actual terrain type)
        score += 20;

        // Height advantage (if terrain has elevation data)
        // score += this.getElevationBonus(position, context);

        // Cover bonus (if terrain provides cover)
        // score += this.getCoverBonus(position, context);

        // Movement cost penalty
        // score -= this.getMovementCostPenalty(position, context);

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Evaluate threat level at a position
     * @param position Position to evaluate
     * @param context Current game context
     * @returns Threat level (0-100, higher is more dangerous)
     */
    public evaluateThreatLevel(position: Position, context: AIContext): number {
        let threatLevel = 0;

        // Check threats from visible enemies
        for (const enemy of context.visibleEnemies) {
            const distance = this.calculateDistance(position, enemy.position);

            // Assume attack range of 1-2 tiles for most units
            const attackRange = 2;

            if (distance <= attackRange) {
                // Immediate threat
                threatLevel += 40;
            } else if (distance <= attackRange + 2) {
                // Potential threat (enemy could move and attack)
                threatLevel += 20;
            } else if (distance <= attackRange + 4) {
                // Distant threat
                threatLevel += 5;
            }
        }

        // Check for area of effect threats
        // (This would be more complex in a real implementation)

        return Math.max(0, Math.min(100, threatLevel));
    }

    // Private helper methods

    private calculateMoveBaseScore(from: Position, to: Position, context: AIContext): number {
        const distance = this.calculateDistance(from, to);
        return Math.max(0, 20 - distance * 2); // Prefer shorter moves
    }

    private calculateAttackBaseScore(attacker: Unit, target: Unit, context: AIContext): number {
        // Base score depends on potential damage and success chance
        let score = 30;

        // Damage potential
        if (this.integration.battleSystem) {
            const estimatedDamage = this.integration.battleSystem.calculateDamage(attacker, target);
            const damageRatio = estimatedDamage / target.currentHP;
            score += damageRatio * 40; // Up to 40 points for high damage
        }

        return score;
    }

    private calculateSkillBaseScore(skill: Skill | null, target: Unit | undefined, context: AIContext): number {
        if (!skill) return 25;

        let score = 25;

        // Skill type based scoring
        switch (skill.skillType) {
            case SkillType.ATTACK:
                score = 40;
                break;
            case SkillType.HEAL:
                score = 35;
                break;
            case SkillType.BUFF:
                score = 30;
                break;
            case SkillType.DEBUFF:
                score = 32;
                break;
            case SkillType.STATUS:
                score = 28;
                break;
            case SkillType.SPECIAL:
                score = 38;
                break;
        }

        // Range consideration
        if (skill.range > 1) {
            score += Math.min(skill.range * 2, 10); // Bonus for longer range
        }

        // Area of effect consideration
        if (skill.areaOfEffect.shape !== 'single') {
            score += skill.areaOfEffect.size * 3; // Bonus for area effects
        }

        return score;
    }

    private evaluateTargetPriority(target: Unit, context: AIContext): number {
        let priority = 0;

        // NPC priority boost
        if (this.integration.recruitmentSystem?.isNPC(target)) {
            priority += 50;
        }

        // Low health targets are higher priority
        const healthRatio = target.currentHP / target.stats.maxHP;
        priority += (1 - healthRatio) * 20;

        // Dangerous enemies are higher priority
        priority += target.stats.attack * 0.5;

        return priority;
    }

    private evaluateDamagePotential(attacker: Unit, target: Unit, context: AIContext): number {
        if (!this.integration.battleSystem) return 20;

        const estimatedDamage = this.integration.battleSystem.calculateDamage(attacker, target);
        const damageRatio = estimatedDamage / target.currentHP;

        return Math.min(50, damageRatio * 50);
    }

    private evaluateAttackRisk(attacker: Unit, target: Unit, context: AIContext): number {
        // Risk of counterattack
        let risk = 0;

        if (this.integration.battleSystem?.canAttack(target, attacker)) {
            const counterDamage = this.integration.battleSystem.calculateDamage(target, attacker);
            const damageRatio = counterDamage / attacker.currentHP;
            risk += damageRatio * 30;
        }

        // Risk from other enemies
        const position = attacker.position;
        risk += this.evaluateThreatLevel(position, context) * 0.3;

        return risk;
    }

    private evaluateAttackPosition(attacker: Unit, target: Unit, context: AIContext): number {
        // Evaluate the tactical advantage of attacking from current position
        return this.evaluatePositionalAdvantage(attacker.position, context) * 0.5;
    }

    private evaluateOpportunities(position: Position, context: AIContext): number {
        let opportunities = 0;

        // Count potential targets from this position
        for (const enemy of context.visibleEnemies) {
            const distance = this.calculateDistance(position, enemy.position);
            if (distance <= 2) { // Assume attack range of 2
                opportunities += 10;
            }
        }

        return Math.min(50, opportunities);
    }

    private evaluateSkillEffectiveness(skill: Skill | null, target: Unit | undefined, context: AIContext): number {
        if (!skill) return 30;

        let effectiveness = 30;

        // Target type compatibility
        if (target) {
            const isEnemy = target.faction !== context.currentCharacter?.faction;
            const isAlly = target.faction === context.currentCharacter?.faction;

            switch (skill.skillType) {
                case SkillType.ATTACK:
                    if (isEnemy) {
                        effectiveness += 25;
                        // Bonus for low-health enemies
                        const healthRatio = target.currentHP / target.stats.maxHP;
                        effectiveness += (1 - healthRatio) * 20;
                    } else {
                        effectiveness = 0; // Can't attack allies
                    }
                    break;
                case SkillType.HEAL:
                    if (isAlly) {
                        effectiveness += 20;
                        // Bonus for injured allies
                        const healthRatio = target.currentHP / target.stats.maxHP;
                        if (healthRatio < 0.5) {
                            effectiveness += (1 - healthRatio) * 30;
                        }
                    } else {
                        effectiveness = 0; // Can't heal enemies
                    }
                    break;
                case SkillType.BUFF:
                    if (isAlly) {
                        effectiveness += 15;
                        // Bonus for healthy allies who can benefit
                        const healthRatio = target.currentHP / target.stats.maxHP;
                        if (healthRatio > 0.6) {
                            effectiveness += 15;
                        }
                    }
                    break;
                case SkillType.DEBUFF:
                case SkillType.STATUS:
                    if (isEnemy) {
                        effectiveness += 20;
                        // Bonus for strong enemies
                        const enemyStrength = target.stats.attack + target.stats.defense;
                        effectiveness += Math.min(enemyStrength * 0.1, 15);
                    }
                    break;
            }
        }

        // Effect potency evaluation
        for (const effect of skill.effects) {
            effectiveness += Math.min(effect.value * 0.1, 10);

            // Success rate consideration
            if (effect.successRate && effect.successRate < 100) {
                effectiveness *= effect.successRate / 100;
            }
        }

        return Math.max(0, effectiveness);
    }

    private evaluateSkillCost(skill: Skill | null, context: AIContext): number {
        if (!skill) return 10;

        let costScore = 50; // Base score (higher is better)
        const currentUnit = context.currentCharacter || context.currentUnit;

        if (currentUnit) {
            const mpCost = skill.usageCondition.mpCost;
            const mpRatio = currentUnit.currentMP / currentUnit.stats.maxMP;
            const costRatio = mpCost / currentUnit.stats.maxMP;

            // Penalize high-cost skills when MP is low
            if (mpRatio < 0.3 && costRatio > 0.2) {
                costScore -= 30;
            } else if (mpRatio < 0.5 && costRatio > 0.4) {
                costScore -= 20;
            }

            // Penalize skills that would leave unit with very low MP
            if (currentUnit.currentMP - mpCost < currentUnit.stats.maxMP * 0.1) {
                costScore -= 25;
            }

            // Cooldown penalty
            if (skill.usageCondition.cooldown > 0) {
                costScore -= skill.usageCondition.cooldown * 2;
            }

            // Usage limit penalty
            if (skill.usageCondition.usageLimit > 0) {
                costScore -= 10; // Penalty for limited-use skills
            }
        }

        return Math.max(0, costScore);
    }

    private evaluateSkillTiming(skill: Skill | null, target: Unit | undefined, context: AIContext): number {
        if (!skill) return 20;

        let timing = 20;

        // Turn-based timing considerations
        const turnNumber = context.turnNumber;

        // Early game timing
        if (turnNumber <= 3) {
            if (skill.skillType === SkillType.BUFF) {
                timing += 15; // Buffs are good early
            }
        }

        // Late game timing
        if (turnNumber >= 10) {
            if (skill.skillType === SkillType.ATTACK || skill.skillType === SkillType.SPECIAL) {
                timing += 10; // Finishing moves are good late
            }
        }

        // Situational timing
        const enemyCount = context.visibleEnemies.length;
        const allyCount = context.visibleAllies.length;

        if (enemyCount > allyCount) {
            // Outnumbered - defensive skills are better
            if (skill.skillType === SkillType.HEAL || skill.skillType === SkillType.BUFF) {
                timing += 15;
            }
        } else if (allyCount > enemyCount) {
            // Advantage - offensive skills are better
            if (skill.skillType === SkillType.ATTACK || skill.skillType === SkillType.DEBUFF) {
                timing += 15;
            }
        }

        // Target-specific timing
        if (target) {
            const healthRatio = target.currentHP / target.stats.maxHP;

            if (skill.skillType === SkillType.HEAL && healthRatio < 0.3) {
                timing += 25; // Emergency healing
            } else if (skill.skillType === SkillType.ATTACK && healthRatio < 0.3) {
                timing += 20; // Finishing blow
            }
        }

        return timing;
    }

    /**
     * Get skill object from skill system
     */
    private getSkillFromSystem(skillId: string, context: AIContext): Skill | null {
        if (this.integration.skillSystem && this.integration.skillSystem.getSkill) {
            return this.integration.skillSystem.getSkill(skillId);
        }
        return null;
    }

    /**
     * Check if skill can be used on target
     */
    private canUseSkillOnTarget(skill: Skill, caster: Unit, target: Unit | undefined, context: AIContext): boolean {
        if (!target) return skill.targetType === TargetType.SELF;

        // Range check
        const distance = this.calculateDistance(caster.position, target.position);
        if (distance > skill.range) {
            return false;
        }

        // Target type check
        const isEnemy = target.faction !== caster.faction;
        const isAlly = target.faction === caster.faction;
        const isSelf = target.id === caster.id;

        switch (skill.targetType) {
            case TargetType.SELF:
                return isSelf;
            case TargetType.SINGLE_ENEMY:
            case TargetType.AREA_ENEMY:
            case TargetType.ALL_ENEMIES:
                return isEnemy;
            case TargetType.SINGLE_ALLY:
            case TargetType.AREA_ALLY:
            case TargetType.ALL_ALLIES:
                return isAlly && !isSelf;
            case TargetType.SINGLE_ANY:
            case TargetType.AREA_ANY:
            case TargetType.ALL_ANY:
                return true;
        }

        return false;
    }

    private calculateTacticalScore(breakdown: EvaluationBreakdown): number {
        return (
            breakdown.baseScore +
            breakdown.positionScore * this.weights.position +
            breakdown.threatScore * this.weights.threat +
            breakdown.opportunityScore * this.weights.opportunity +
            breakdown.terrainScore * this.weights.terrain +
            breakdown.personalityModifier * this.weights.personality
        );
    }

    private calculateStrategicScore(position: Position, context: AIContext): number {
        // Long-term strategic value (simplified)
        return 0;
    }

    private calculateRiskLevel(position: Position, context: AIContext): number {
        return this.evaluateThreatLevel(position, context);
    }

    private calculateConfidence(breakdown: EvaluationBreakdown): number {
        // Calculate confidence based on how clear-cut the evaluation is
        const totalScore = Math.abs(breakdown.baseScore) +
            Math.abs(breakdown.positionScore) +
            Math.abs(breakdown.threatScore) +
            Math.abs(breakdown.opportunityScore);

        return Math.min(1, totalScore / 100);
    }

    private calculateDistance(pos1: Position, pos2: Position): number {
        return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
    }

    /**
     * Update difficulty settings
     * @param newSettings New difficulty settings
     */
    public updateDifficultySettings(newSettings: DifficultySettings): void {
        this.difficultySettings = newSettings;
        console.log('ActionEvaluator: Difficulty settings updated');
    }

    /**
     * Get current difficulty settings
     */
    public getDifficultySettings(): DifficultySettings {
        return { ...this.difficultySettings };
    }
}