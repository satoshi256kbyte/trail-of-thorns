/**
 * SupportAI - Support-focused AI behavior pattern
 *
 * This module provides:
 * - Ally healing and recovery actions
 * - Buff and debuff skill strategic usage
 * - Protective positioning and support tactics
 * - Team coordination and assistance behavior
 */

import { AIController } from '../AIController';
import { ActionEvaluator, ActionEvaluation } from '../ActionEvaluator';
import {
    AIAction,
    AIActionType,
    AIContext,
    AIPersonality,
    DifficultySettings,
    AIControllerConfig,
    AISystemIntegration,
    ActionType,
    BehaviorResult,
} from '../../types/ai';
import { Unit, Position } from '../../types/gameplay';

/**
 * Support action priorities for different situations
 */
interface SupportPriorities {
    healCritical: number;      // Heal critically wounded allies
    healModerate: number;      // Heal moderately wounded allies
    buffAllies: number;        // Apply beneficial effects to allies
    debuffEnemies: number;     // Apply negative effects to enemies
    protectivePosition: number; // Position to protect allies
    resourceManagement: number; // Manage MP and skill cooldowns
}

/**
 * Ally assessment for support decisions
 */
interface AllyAssessment {
    unit: Unit;
    healthRatio: number;       // Current HP / Max HP
    needsHealing: boolean;     // Below healing threshold
    isCritical: boolean;       // Below critical threshold
    canBeBuffed: boolean;      // Can receive beneficial effects
    threatLevel: number;       // How much danger they're in
    supportPriority: number;   // Overall support priority
    distance: number;          // Distance from support AI
}

/**
 * Support skill evaluation
 */
interface SupportSkillEvaluation {
    skillId: string;
    target: Unit;
    effectiveness: number;     // How effective the skill would be
    urgency: number;          // How urgent the need is
    resourceCost: number;     // MP or other resource cost
    overallValue: number;     // Combined evaluation score
}

/**
 * SupportAI class implementing support-focused behavior
 */
export class SupportAI extends AIController {
    private actionEvaluator: ActionEvaluator;
    private supportPriorities: SupportPriorities;

    // Support AI configuration
    private readonly healingThreshold = 0.6;      // Heal when HP < 60%
    private readonly criticalThreshold = 0.3;     // Critical when HP < 30%
    private readonly maxSupportRange = 4;         // Maximum range for support actions
    private readonly minMPReserve = 0.2;          // Keep 20% MP in reserve

    constructor(
        unit: Unit,
        personality: AIPersonality,
        difficultySettings: DifficultySettings,
        config: AIControllerConfig,
        integration: AISystemIntegration = {}
    ) {
        super(unit, personality, difficultySettings, config, integration);
        this.actionEvaluator = new ActionEvaluator(integration, difficultySettings);
        this.supportPriorities = this.calculateSupportPriorities();
    }

    /**
     * Make decision based on support AI logic
     * @param context Current game context
     * @returns Promise resolving to the selected action
     */
    protected async makeDecision(context: AIContext): Promise<AIAction> {
        // Assess all allies for support needs
        const allyAssessments = this.assessAllies(context);

        // Evaluate support actions
        const supportActions = this.evaluateSupportActions(allyAssessments, context);

        // Evaluate positioning actions
        const positionActions = this.evaluatePositioningActions(context);

        // Evaluate offensive actions (low priority for support AI)
        const offensiveActions = this.evaluateOffensiveActions(context);

        // Combine all actions
        const allActions = [...supportActions, ...positionActions, ...offensiveActions];

        // Apply personality and difficulty modifiers
        const modifiedActions = this.applyPersonalityModifiers(allActions, context);

        // Select the best action
        const bestAction = this.selectBestAction(modifiedActions, context);

        return bestAction;
    }

    /**
     * Evaluate the current position's strategic value for support
     * @param position Position to evaluate
     * @param context Current game context
     * @returns Numerical evaluation score
     */
    public evaluatePosition(position: Position, context: AIContext): number {
        let score = 0;

        // Distance to allies (closer is better for support)
        const allyDistances = context.visibleAllies.map(ally =>
            this.calculateDistance(position, ally.position)
        );

        if (allyDistances.length > 0) {
            const avgAllyDistance = allyDistances.reduce((a, b) => a + b, 0) / allyDistances.length;
            score += Math.max(0, 30 - avgAllyDistance * 5); // Prefer being close to allies
        }

        // Safety evaluation (support units should avoid danger)
        const threatLevel = this.actionEvaluator.evaluateThreatLevel(position, context);
        score -= threatLevel * 0.8; // High penalty for dangerous positions

        // Support range coverage (can reach more allies)
        const alliesInRange = context.visibleAllies.filter(ally =>
            this.calculateDistance(position, ally.position) <= this.maxSupportRange
        ).length;
        score += alliesInRange * 10;

        // Terrain bonus for defensive positions
        const terrainScore = this.actionEvaluator.evaluateTerrainBonus(position, context);
        score += terrainScore * 0.5;

        return Math.max(0, score);
    }

    /**
     * Get the priority of this support AI unit
     * @param context Current game context
     * @returns Priority value
     */
    public getPriority(context: AIContext): number {
        let priority = this.unit.stats.speed;

        // Higher priority if allies need urgent support
        const criticalAllies = context.visibleAllies.filter(ally =>
            ally.currentHP / ally.stats.maxHP < this.criticalThreshold
        ).length;

        priority += criticalAllies * 20;

        // Personality modifier
        priority += this.personality.supportiveness * 15;

        return priority;
    }

    /**
     * Assess all allies for support needs
     * @param context Current game context
     * @returns Array of ally assessments
     */
    private assessAllies(context: AIContext): AllyAssessment[] {
        return context.visibleAllies
            .filter(ally => ally.id !== this.unit.id) // Exclude self
            .map(ally => this.assessAlly(ally, context));
    }

    /**
     * Assess a single ally for support needs
     * @param ally Ally unit to assess
     * @param context Current game context
     * @returns Ally assessment
     */
    private assessAlly(ally: Unit, context: AIContext): AllyAssessment {
        const healthRatio = ally.currentHP / ally.stats.maxHP;
        const distance = this.calculateDistance(this.unit.position, ally.position);

        // Evaluate threat level around the ally
        const threatLevel = this.actionEvaluator.evaluateThreatLevel(ally.position, context);

        // Calculate support priority
        let supportPriority = 0;

        // Health-based priority
        if (healthRatio < this.criticalThreshold) {
            supportPriority += 50; // Critical healing needed
        } else if (healthRatio < this.healingThreshold) {
            supportPriority += 30; // Moderate healing needed
        }

        // Threat-based priority
        supportPriority += threatLevel * 0.3;

        // Distance penalty
        supportPriority -= distance * 2;

        // Unit value modifier (important units get higher priority)
        if (ally.stats.attack > this.unit.stats.attack) {
            supportPriority += 10; // Prioritize strong attackers
        }

        return {
            unit: ally,
            healthRatio,
            needsHealing: healthRatio < this.healingThreshold,
            isCritical: healthRatio < this.criticalThreshold,
            canBeBuffed: this.canReceiveBuff(ally, context),
            threatLevel,
            supportPriority,
            distance,
        };
    }

    /**
     * Evaluate support actions (healing, buffing)
     * @param allyAssessments Ally assessment data
     * @param context Current game context
     * @returns Array of support actions
     */
    private evaluateSupportActions(allyAssessments: AllyAssessment[], context: AIContext): AIAction[] {
        const actions: AIAction[] = [];

        if (!this.integration.skillSystem) {
            return actions;
        }

        const availableSkills = this.integration.skillSystem.getAvailableSkills(this.unit);

        for (const skillId of availableSkills) {
            if (!this.integration.skillSystem.canUseSkill(this.unit, skillId)) {
                continue;
            }

            // Check if this is a support skill
            if (this.isSupportSkill(skillId)) {
                // Find best target for this support skill
                const bestTarget = this.findBestSupportTarget(skillId, allyAssessments, context);

                if (bestTarget) {
                    const evaluation = this.evaluateSupportSkill(skillId, bestTarget, context);

                    actions.push({
                        type: ActionType.SKILL,
                        character: this.unit,
                        target: bestTarget.unit,
                        skill: this.getSkillData(skillId),
                        priority: evaluation.overallValue,
                        evaluationScore: evaluation.effectiveness,
                        reasoning: `Support skill ${skillId} on ${bestTarget.unit.name} (effectiveness: ${evaluation.effectiveness.toFixed(1)})`,
                    });
                }
            }
        }

        return actions;
    }

    /**
     * Evaluate positioning actions for support
     * @param context Current game context
     * @returns Array of positioning actions
     */
    private evaluatePositioningActions(context: AIContext): AIAction[] {
        const actions: AIAction[] = [];

        if (!this.integration.movementSystem || !context.mapData) {
            return actions;
        }

        const movementRange = this.integration.movementSystem.calculateMovementRange(
            this.unit,
            context.mapData
        );

        for (const position of movementRange) {
            if (this.integration.movementSystem.canMoveTo(this.unit, position, context.mapData)) {
                const evaluation = this.actionEvaluator.evaluateMove(
                    this.unit.position,
                    position,
                    context
                );

                // Apply support-specific modifiers
                const supportModifier = this.calculateSupportPositionModifier(position, context);
                const totalScore = evaluation.score + supportModifier;

                actions.push({
                    type: ActionType.MOVE,
                    character: this.unit,
                    targetPosition: position,
                    priority: totalScore,
                    evaluationScore: totalScore,
                    reasoning: `Move to support position (${position.x}, ${position.y}) - support modifier: ${supportModifier.toFixed(1)}`,
                });
            }
        }

        return actions;
    }

    /**
     * Evaluate offensive actions (low priority for support AI)
     * @param context Current game context
     * @returns Array of offensive actions
     */
    private evaluateOffensiveActions(context: AIContext): AIAction[] {
        const actions: AIAction[] = [];

        // Support AI only attacks if no support actions are needed
        const urgentSupportNeeded = context.visibleAllies.some(ally =>
            ally.currentHP / ally.stats.maxHP < this.criticalThreshold
        );

        if (urgentSupportNeeded) {
            return actions; // Skip offensive actions if urgent support is needed
        }

        // Evaluate debuff skills on enemies
        if (this.integration.skillSystem) {
            const availableSkills = this.integration.skillSystem.getAvailableSkills(this.unit);

            for (const skillId of availableSkills) {
                if (this.isDebuffSkill(skillId) &&
                    this.integration.skillSystem.canUseSkill(this.unit, skillId)) {

                    const bestTarget = this.findBestDebuffTarget(skillId, context);
                    if (bestTarget) {
                        const priority = this.evaluateDebuffSkill(skillId, bestTarget, context);

                        actions.push({
                            type: ActionType.SKILL,
                            character: this.unit,
                            target: bestTarget,
                            skill: this.getSkillData(skillId),
                            priority: priority * 0.7, // Lower priority for support AI
                            evaluationScore: priority,
                            reasoning: `Debuff skill ${skillId} on ${bestTarget.name}`,
                        });
                    }
                }
            }
        }

        // Basic attacks (very low priority)
        if (this.integration.battleSystem) {
            for (const enemy of context.visibleEnemies) {
                if (this.integration.battleSystem.canAttack(this.unit, enemy)) {
                    const evaluation = this.actionEvaluator.evaluateAttack(this.unit, enemy, context);

                    actions.push({
                        type: ActionType.ATTACK,
                        character: this.unit,
                        target: enemy,
                        priority: evaluation.score * 0.3, // Very low priority for support AI
                        evaluationScore: evaluation.score,
                        reasoning: `Basic attack on ${enemy.name} (low priority)`,
                    });
                }
            }
        }

        return actions;
    }

    /**
     * Apply personality modifiers to actions
     * @param actions Array of actions to modify
     * @param context Current game context
     * @returns Modified actions
     */
    private applyPersonalityModifiers(actions: AIAction[], context: AIContext): AIAction[] {
        return actions.map(action => {
            let modifier = 1.0;

            // Support actions get boosted by supportiveness
            if (action.type === ActionType.SKILL && action.target?.faction === this.unit.faction) {
                modifier += this.personality.supportiveness * 0.5;
            }

            // Defensive positioning gets boosted by defensiveness
            if (action.type === ActionType.MOVE) {
                modifier += this.personality.defensiveness * 0.3;
            }

            // Offensive actions get reduced (support AI is not aggressive)
            if (action.type === ActionType.ATTACK ||
                (action.type === ActionType.SKILL && action.target?.faction !== this.unit.faction)) {
                modifier -= this.personality.aggressiveness * 0.2;
                modifier += this.personality.supportiveness * 0.1; // Slight boost if it helps team
            }

            // Apply random factor if enabled
            if (this.shouldMakeMistake()) {
                modifier *= this.applyRandomFactor(1.0);
            }

            return {
                ...action,
                priority: action.priority * modifier,
                evaluationScore: action.evaluationScore * modifier,
            };
        });
    }

    /**
     * Select the best action from available options
     * @param actions Array of evaluated actions
     * @param context Current game context
     * @returns Best action to execute
     */
    private selectBestAction(actions: AIAction[], context: AIContext): AIAction {
        if (actions.length === 0) {
            // Fallback to wait action
            return {
                type: ActionType.WAIT,
                character: this.unit,
                priority: 0,
                evaluationScore: 0,
                reasoning: 'No valid actions available - waiting',
            };
        }

        // Sort by priority and select the best
        const sortedActions = actions.sort((a, b) => b.priority - a.priority);
        return sortedActions[0];
    }

    /**
     * Calculate support priorities based on personality and difficulty
     * @returns Support priorities configuration
     */
    private calculateSupportPriorities(): SupportPriorities {
        const base = {
            healCritical: 80,
            healModerate: 50,
            buffAllies: 30,
            debuffEnemies: 20,
            protectivePosition: 40,
            resourceManagement: 25,
        };

        // Apply personality modifiers
        const supportMod = this.personality.supportiveness;
        const defenseMod = this.personality.defensiveness;

        return {
            healCritical: base.healCritical * (1 + supportMod * 0.5),
            healModerate: base.healModerate * (1 + supportMod * 0.3),
            buffAllies: base.buffAllies * (1 + supportMod * 0.4),
            debuffEnemies: base.debuffEnemies * (1 + this.personality.aggressiveness * 0.2),
            protectivePosition: base.protectivePosition * (1 + defenseMod * 0.3),
            resourceManagement: base.resourceManagement * (1 + this.personality.tacticalness * 0.2),
        };
    }

    /**
     * Check if a unit can receive a buff
     * @param unit Unit to check
     * @param context Current game context
     * @returns True if unit can be buffed
     */
    private canReceiveBuff(unit: Unit, context: AIContext): boolean {
        // Simplified check - in a real game, this would check for existing buffs,
        // immunity, and other factors
        return unit.faction === this.unit.faction;
    }

    /**
     * Check if a skill is a support skill
     * @param skillId Skill to check
     * @returns True if it's a support skill
     */
    private isSupportSkill(skillId: string): boolean {
        // Simplified check - in a real game, this would check skill data
        return skillId.includes('heal') || skillId.includes('buff') || skillId.includes('restore');
    }

    /**
     * Check if a skill is a debuff skill
     * @param skillId Skill to check
     * @returns True if it's a debuff skill
     */
    private isDebuffSkill(skillId: string): boolean {
        // Simplified check - in a real game, this would check skill data
        return skillId.includes('debuff') || skillId.includes('weaken') || skillId.includes('slow');
    }

    /**
     * Find the best target for a support skill
     * @param skillId Support skill to use
     * @param allyAssessments Ally assessment data
     * @param context Current game context
     * @returns Best ally assessment or null
     */
    private findBestSupportTarget(
        skillId: string,
        allyAssessments: AllyAssessment[],
        context: AIContext
    ): AllyAssessment | null {
        // Filter allies that can be targeted by this skill
        const validTargets = allyAssessments.filter(assessment =>
            this.canTargetWithSkill(skillId, assessment.unit, context)
        );

        if (validTargets.length === 0) {
            return null;
        }

        // For healing skills, prioritize by health need
        if (skillId.includes('heal')) {
            return validTargets.reduce((best, current) =>
                current.supportPriority > best.supportPriority ? current : best
            );
        }

        // For buff skills, prioritize healthy allies who can benefit most
        if (skillId.includes('buff')) {
            return validTargets
                .filter(assessment => assessment.healthRatio > 0.5) // Don't buff dying allies
                .reduce((best, current) =>
                    current.unit.stats.attack > best.unit.stats.attack ? current : best
                );
        }

        // Default: highest support priority
        return validTargets.reduce((best, current) =>
            current.supportPriority > best.supportPriority ? current : best
        );
    }

    /**
     * Find the best target for a debuff skill
     * @param skillId Debuff skill to use
     * @param context Current game context
     * @returns Best enemy target or null
     */
    private findBestDebuffTarget(skillId: string, context: AIContext): Unit | null {
        const validTargets = context.visibleEnemies.filter(enemy =>
            this.canTargetWithSkill(skillId, enemy, context)
        );

        if (validTargets.length === 0) {
            return null;
        }

        // Prioritize strong enemies or those threatening allies
        return validTargets.reduce((best, current) => {
            const bestThreat = this.calculateEnemyThreat(best, context);
            const currentThreat = this.calculateEnemyThreat(current, context);
            return currentThreat > bestThreat ? current : best;
        });
    }

    /**
     * Evaluate a support skill's effectiveness
     * @param skillId Support skill to evaluate
     * @param target Target ally assessment
     * @param context Current game context
     * @returns Support skill evaluation
     */
    private evaluateSupportSkill(
        skillId: string,
        target: AllyAssessment,
        context: AIContext
    ): SupportSkillEvaluation {
        let effectiveness = 0;
        let urgency = 0;
        let resourceCost = 10; // Base MP cost

        // Healing skill evaluation
        if (skillId.includes('heal')) {
            effectiveness = (1 - target.healthRatio) * 50; // More effective on wounded allies
            urgency = target.isCritical ? 80 : (target.needsHealing ? 50 : 20);
        }

        // Buff skill evaluation
        if (skillId.includes('buff')) {
            effectiveness = target.unit.stats.attack * 0.5; // More effective on strong allies
            urgency = target.threatLevel * 0.3; // More urgent if ally is in danger
        }

        // Distance penalty
        effectiveness -= target.distance * 2;

        // Resource management
        const mpRatio = this.unit.currentMP / this.unit.stats.maxMP;
        if (mpRatio < this.minMPReserve) {
            effectiveness *= 0.5; // Reduce effectiveness if low on MP
        }

        const overallValue = effectiveness + urgency - resourceCost;

        return {
            skillId,
            target: target.unit,
            effectiveness,
            urgency,
            resourceCost,
            overallValue: Math.max(0, overallValue),
        };
    }

    /**
     * Evaluate a debuff skill's value
     * @param skillId Debuff skill to evaluate
     * @param target Enemy target
     * @param context Current game context
     * @returns Evaluation score
     */
    private evaluateDebuffSkill(skillId: string, target: Unit, context: AIContext): number {
        let score = 0;

        // Base effectiveness based on enemy strength
        score += target.stats.attack * 0.3;

        // Higher value if enemy is threatening allies
        const enemyThreat = this.calculateEnemyThreat(target, context);
        score += enemyThreat * 0.5;

        // Distance penalty
        const distance = this.calculateDistance(this.unit.position, target.position);
        score -= distance * 2;

        return Math.max(0, score);
    }

    /**
     * Calculate support position modifier for a position
     * @param position Position to evaluate
     * @param context Current game context
     * @returns Support modifier score
     */
    private calculateSupportPositionModifier(position: Position, context: AIContext): number {
        let modifier = 0;

        // Count allies within support range
        const alliesInRange = context.visibleAllies.filter(ally =>
            this.calculateDistance(position, ally.position) <= this.maxSupportRange
        ).length;

        modifier += alliesInRange * 8;

        // Bonus for being between allies and enemies (protective positioning)
        const avgAllyPos = this.calculateAveragePosition(context.visibleAllies);
        const avgEnemyPos = this.calculateAveragePosition(context.visibleEnemies);

        if (avgAllyPos && avgEnemyPos) {
            const distToAllies = this.calculateDistance(position, avgAllyPos);
            const distToEnemies = this.calculateDistance(position, avgEnemyPos);

            // Prefer positions closer to allies than enemies
            if (distToAllies < distToEnemies) {
                modifier += 10;
            }
        }

        return modifier;
    }

    /**
     * Calculate the threat level of an enemy
     * @param enemy Enemy unit to evaluate
     * @param context Current game context
     * @returns Threat level score
     */
    private calculateEnemyThreat(enemy: Unit, context: AIContext): number {
        let threat = enemy.stats.attack;

        // Check if enemy is close to allies
        const minDistanceToAlly = Math.min(
            ...context.visibleAllies.map(ally =>
                this.calculateDistance(enemy.position, ally.position)
            )
        );

        if (minDistanceToAlly <= 2) {
            threat += 20; // Immediate threat
        } else if (minDistanceToAlly <= 4) {
            threat += 10; // Potential threat
        }

        return threat;
    }

    /**
     * Check if a skill can target a specific unit
     * @param skillId Skill to check
     * @param target Target unit
     * @param context Current game context
     * @returns True if skill can target the unit
     */
    private canTargetWithSkill(skillId: string, target: Unit, context: AIContext): boolean {
        if (!this.integration.skillSystem) {
            return false;
        }

        // Check range
        const distance = this.calculateDistance(this.unit.position, target.position);
        const skillRange = this.getSkillRange(skillId);

        if (distance > skillRange) {
            return false;
        }

        // Check if skill can target this unit type
        return this.integration.skillSystem.canUseSkill(this.unit, skillId);
    }

    /**
     * Get skill data (simplified)
     * @param skillId Skill ID
     * @returns Skill data or null
     */
    private getSkillData(skillId: string): any {
        // Simplified - in a real game, this would fetch from skill system
        return { id: skillId, name: skillId };
    }

    /**
     * Get skill range (simplified)
     * @param skillId Skill ID
     * @returns Skill range
     */
    private getSkillRange(skillId: string): number {
        // Simplified - in a real game, this would fetch from skill data
        return skillId.includes('heal') ? 3 : 2;
    }

    /**
     * Calculate average position of units
     * @param units Array of units
     * @returns Average position or null
     */
    private calculateAveragePosition(units: Unit[]): Position | null {
        if (units.length === 0) {
            return null;
        }

        const sum = units.reduce(
            (acc, unit) => ({
                x: acc.x + unit.position.x,
                y: acc.y + unit.position.y,
            }),
            { x: 0, y: 0 }
        );

        return {
            x: Math.round(sum.x / units.length),
            y: Math.round(sum.y / units.length),
        };
    }
}