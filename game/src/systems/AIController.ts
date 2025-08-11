/**
 * AIController - Abstract base class for AI character control
 *
 * This module provides:
 * - Abstract base class for all AI controllers
 * - Common AI functionality and utilities
 * - Integration with game systems
 * - Error handling and performance monitoring
 */

import {
    AIAction,
    AIActionType,
    AIContext,
    AIBehaviorType,
    AIPersonality,
    DifficultySettings,
    AIControllerConfig,
    AIError,
    AIThinkingTimeoutError,
    InvalidActionError,
    AIPerformanceMetrics,
    AISystemIntegration,
} from '../types/ai';
import { Unit, Position, MapData } from '../types/gameplay';
import { Skill, SkillType, TargetType } from '../types/skill';
import { AISkillEvaluator, AISkillEvaluation } from './ai/AISkillEvaluator';

/**
 * Abstract base class for AI controllers
 * All AI implementations must extend this class
 */
export abstract class AIController {
    protected unit: Unit;
    protected personality: AIPersonality;
    protected difficultySettings: DifficultySettings;
    protected config: AIControllerConfig;
    protected integration: AISystemIntegration;
    protected performanceMetrics: AIPerformanceMetrics;
    protected skillEvaluator?: AISkillEvaluator;

    // Thinking state
    private isThinking: boolean = false;
    private thinkingStartTime: number = 0;
    private lastDecisionTime: number = 0;

    constructor(
        unit: Unit,
        personality: AIPersonality,
        difficultySettings: DifficultySettings,
        config: AIControllerConfig,
        integration: AISystemIntegration = {}
    ) {
        this.unit = unit;
        this.personality = personality;
        this.difficultySettings = difficultySettings;
        this.config = config;
        this.integration = integration;
        this.performanceMetrics = this.initializePerformanceMetrics();

        // Initialize skill evaluator if skill system is available
        if (integration.skillSystem) {
            this.initializeSkillEvaluator();
        }
    }

    /**
     * Main decision-making method - must be implemented by subclasses
     * @param context Current game context for decision making
     * @returns Promise resolving to the selected action
     */
    public async decideAction(context: AIContext): Promise<AIAction> {
        this.startThinking();

        try {
            // Apply thinking time limit
            const decision = await Promise.race([
                this.makeDecision(context),
                this.createTimeoutPromise(),
            ]);

            this.recordDecision(decision);
            return decision;
        } catch (error) {
            return this.handleDecisionError(error, context);
        } finally {
            this.stopThinking();
        }
    }

    /**
     * Abstract method for making decisions - implemented by subclasses
     * @param context Current game context
     * @returns Promise resolving to the selected action
     */
    protected abstract makeDecision(context: AIContext): Promise<AIAction>;

    /**
     * Evaluate the current position's strategic value
     * @param position Position to evaluate
     * @param context Current game context
     * @returns Numerical evaluation score (higher is better)
     */
    public abstract evaluatePosition(position: Position, context: AIContext): number;

    /**
     * Get the priority of this AI unit for turn order
     * @param context Current game context
     * @returns Priority value (higher goes first)
     */
    public abstract getPriority(context: AIContext): number;

    /**
     * Get valid actions for the current unit
     * @param context Current game context
     * @returns Array of valid actions
     */
    protected getValidActions(context: AIContext): AIAction[] {
        const actions: AIAction[] = [];

        // Always can wait
        actions.push({
            type: AIActionType.WAIT,
            priority: 0,
            reasoning: 'Wait action - always available',
        });

        // Check movement options
        if (this.integration.movementSystem && context.mapData) {
            const movementRange = this.integration.movementSystem.calculateMovementRange(
                this.unit,
                context.mapData
            );

            for (const position of movementRange) {
                if (this.integration.movementSystem.canMoveTo(this.unit, position, context.mapData)) {
                    actions.push({
                        type: AIActionType.MOVE,
                        priority: this.evaluatePosition(position, context),
                        position,
                        reasoning: `Move to position (${position.x}, ${position.y})`,
                    });
                }
            }
        }

        // Check attack options
        if (this.integration.battleSystem) {
            for (const target of context.visibleEnemies) {
                if (this.integration.battleSystem.canAttack(this.unit, target)) {
                    const priority = this.evaluateAttackTarget(target, context);
                    actions.push({
                        type: AIActionType.ATTACK,
                        priority,
                        target,
                        reasoning: `Attack ${target.name} (priority: ${priority})`,
                    });
                }
            }
        }

        // Check skill options using advanced skill evaluator
        if (this.skillEvaluator && this.integration.skillSystem) {
            const skillEvaluations = this.skillEvaluator.evaluateSkillUsage(
                context,
                this.personality,
                this.difficultySettings
            );

            // Add top skill evaluations as actions
            for (const evaluation of skillEvaluations.slice(0, 5)) { // Limit to top 5 skills
                if (evaluation.score > 20) { // Only consider skills with decent scores
                    actions.push({
                        type: AIActionType.SKILL,
                        priority: evaluation.score,
                        target: evaluation.target,
                        position: evaluation.targetPosition,
                        skillId: evaluation.skill.id,
                        skill: evaluation.skill,
                        reasoning: evaluation.reasoning,
                    });
                }
            }
        } else if (this.integration.skillSystem) {
            // Fallback to basic skill evaluation
            const availableSkills = this.integration.skillSystem.getAvailableSkills(this.unit);

            for (const skillId of availableSkills) {
                if (this.integration.skillSystem.canUseSkill(this.unit, skillId)) {
                    // Find best target for this skill
                    const bestTarget = this.findBestSkillTarget(skillId, context);
                    if (bestTarget) {
                        actions.push({
                            type: AIActionType.SKILL,
                            priority: this.evaluateSkillUse(skillId, bestTarget, context),
                            target: bestTarget,
                            skillId,
                            reasoning: `Use skill ${skillId} on ${bestTarget.name}`,
                        });
                    }
                }
            }
        }

        return actions;
    }

    /**
     * Evaluate an attack target's priority
     * @param target Target unit to evaluate
     * @param context Current game context
     * @returns Priority score
     */
    protected evaluateAttackTarget(target: Unit, context: AIContext): number {
        let priority = 0;

        // Base priority from personality
        priority += this.personality.aggressiveness * 10;

        // NPC priority boost
        if (this.integration.recruitmentSystem?.isNPC(target)) {
            priority += this.config.npcPriorityMultiplier;
        }

        // Distance factor (closer is better)
        const distance = this.calculateDistance(this.unit.position, target.position);
        priority += Math.max(0, 10 - distance);

        // Health factor (lower health = higher priority)
        const healthRatio = target.currentHP / target.stats.maxHP;
        priority += (1 - healthRatio) * 5;

        // Apply personality modifier
        priority *= this.personality.getPriorityModifier(target);

        return priority;
    }

    /**
     * Find the best target for a skill
     * @param skillId Skill to use
     * @param context Current game context
     * @returns Best target unit or null
     */
    protected findBestSkillTarget(skillId: string, context: AIContext): Unit | null {
        // This is a simplified implementation
        // In a real game, this would consider skill type, range, effects, etc.

        // For offensive skills, target enemies
        const enemies = context.visibleEnemies.filter(enemy =>
            this.integration.skillSystem?.canUseSkill(this.unit, skillId)
        );

        if (enemies.length > 0) {
            // Return the enemy with highest attack priority
            return enemies.reduce((best, current) =>
                this.evaluateAttackTarget(current, context) > this.evaluateAttackTarget(best, context)
                    ? current : best
            );
        }

        // For support skills, target allies
        const allies = context.visibleAllies.filter(ally => ally.id !== this.unit.id);
        if (allies.length > 0) {
            // Return the ally with lowest health ratio
            return allies.reduce((best, current) =>
                (current.currentHP / current.stats.maxHP) < (best.currentHP / best.stats.maxHP)
                    ? current : best
            );
        }

        return null;
    }

    /**
     * Evaluate skill usage priority
     * @param skillId Skill to evaluate
     * @param target Target for the skill
     * @param context Current game context
     * @returns Priority score
     */
    protected evaluateSkillUse(skillId: string, target: Unit, context: AIContext): number {
        let priority = 5; // Base skill priority

        // Apply personality modifiers
        if (target.faction !== this.unit.faction) {
            // Offensive skill
            priority += this.personality.aggressiveness * 8;
        } else {
            // Support skill
            priority += this.personality.supportiveness * 8;
        }

        // Consider skill usage frequency from difficulty
        priority *= this.difficultySettings.skillUsageFrequency;

        // Additional skill-specific evaluation
        priority += this.evaluateSkillSpecificFactors(skillId, target, context);

        return priority;
    }

    /**
     * Evaluate skill-specific factors
     * @param skillId Skill to evaluate
     * @param target Target for the skill
     * @param context Current game context
     * @returns Additional priority score
     */
    protected evaluateSkillSpecificFactors(skillId: string, target: Unit, context: AIContext): number {
        let bonus = 0;

        // MP efficiency consideration
        if (this.integration.skillSystem) {
            const skill = this.integration.skillSystem.getSkill?.(skillId);
            if (skill) {
                const mpCost = skill.usageCondition?.mpCost || 0;
                const mpRatio = this.unit.currentMP / this.unit.stats.maxMP;

                // Prefer low-cost skills when MP is low
                if (mpRatio < 0.3 && mpCost < this.unit.stats.maxMP * 0.2) {
                    bonus += 10;
                } else if (mpRatio > 0.7) {
                    // Can afford high-cost skills when MP is high
                    bonus += 5;
                }

                // Skill type specific bonuses
                switch (skill.skillType) {
                    case SkillType.ATTACK:
                        // Bonus for attacking low-health enemies
                        if (target.currentHP < target.stats.maxHP * 0.3) {
                            bonus += 15;
                        }
                        // Bonus for attacking NPCs
                        if (this.integration.recruitmentSystem?.isNPC(target)) {
                            bonus += 25;
                        }
                        break;
                    case SkillType.HEAL:
                        // Bonus for healing low-health allies
                        if (target.currentHP < target.stats.maxHP * 0.5) {
                            bonus += 20;
                        }
                        break;
                    case SkillType.BUFF:
                        // Bonus for buffing healthy allies
                        if (target.currentHP > target.stats.maxHP * 0.7) {
                            bonus += 10;
                        }
                        break;
                    case SkillType.DEBUFF:
                        // Bonus for debuffing strong enemies
                        if (target.stats.attack > this.unit.stats.attack) {
                            bonus += 12;
                        }
                        break;
                }
            }
        }

        return bonus;
    }

    /**
     * Check if AI can use a specific skill
     * @param skillId Skill to check
     * @param context Current game context
     * @returns True if skill can be used
     */
    protected canUseSkill(skillId: string, context: AIContext): boolean {
        if (!this.integration.skillSystem) {
            return false;
        }

        // Basic availability check
        if (!this.integration.skillSystem.canUseSkill(this.unit, skillId)) {
            return false;
        }

        // MP check
        const skill = this.integration.skillSystem.getSkill?.(skillId);
        if (skill) {
            const mpCost = skill.usageCondition?.mpCost || 0;
            if (this.unit.currentMP < mpCost) {
                return false;
            }

            // Cooldown check (if skill system supports it)
            const cooldown = skill.usageCondition?.cooldown || 0;
            if (cooldown > 0) {
                // Check if skill is on cooldown (implementation depends on skill system)
                const isOnCooldown = this.integration.skillSystem.isSkillOnCooldown?.(this.unit.id, skillId);
                if (isOnCooldown) {
                    return false;
                }
            }

            // Usage limit check
            const usageLimit = skill.usageCondition?.usageLimit || 0;
            if (usageLimit > 0) {
                const usageCount = this.integration.skillSystem.getSkillUsageCount?.(this.unit.id, skillId) || 0;
                if (usageCount >= usageLimit) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Get skills available for AI use
     * @param context Current game context
     * @returns Array of available skill IDs
     */
    protected getAvailableSkillsForAI(context: AIContext): string[] {
        if (!this.integration.skillSystem) {
            return [];
        }

        const allSkills = this.integration.skillSystem.getAvailableSkills(this.unit);
        return allSkills.filter(skillId => this.canUseSkill(skillId, context));
    }

    /**
     * Evaluate skill effectiveness against multiple targets
     * @param skillId Skill to evaluate
     * @param context Current game context
     * @returns Best target and effectiveness score
     */
    protected evaluateSkillAgainstTargets(skillId: string, context: AIContext): { target: Unit | null, score: number } {
        if (!this.integration.skillSystem) {
            return { target: null, score: 0 };
        }

        const skill = this.integration.skillSystem.getSkill?.(skillId);
        if (!skill) {
            return { target: null, score: 0 };
        }

        let bestTarget: Unit | null = null;
        let bestScore = 0;

        // Determine potential targets based on skill type
        const potentialTargets = this.getPotentialTargetsForSkill(skill, context);

        for (const target of potentialTargets) {
            const score = this.evaluateSkillUse(skillId, target, context);
            if (score > bestScore) {
                bestScore = score;
                bestTarget = target;
            }
        }

        return { target: bestTarget, score: bestScore };
    }

    /**
     * Get potential targets for a skill based on its target type
     * @param skill Skill to get targets for
     * @param context Current game context
     * @returns Array of potential target units
     */
    protected getPotentialTargetsForSkill(skill: any, context: AIContext): Unit[] {
        const targets: Unit[] = [];

        switch (skill.targetType) {
            case TargetType.SELF:
                targets.push(this.unit);
                break;
            case TargetType.SINGLE_ENEMY:
            case TargetType.AREA_ENEMY:
            case TargetType.ALL_ENEMIES:
                targets.push(...context.visibleEnemies);
                break;
            case TargetType.SINGLE_ALLY:
            case TargetType.AREA_ALLY:
            case TargetType.ALL_ALLIES:
                targets.push(...context.visibleAllies.filter(ally => ally.id !== this.unit.id));
                break;
            case TargetType.SINGLE_ANY:
            case TargetType.AREA_ANY:
            case TargetType.ALL_ANY:
                targets.push(...context.visibleEnemies);
                targets.push(...context.visibleAllies.filter(ally => ally.id !== this.unit.id));
                break;
        }

        // Filter by range
        return targets.filter(target => {
            const distance = this.calculateDistance(this.unit.position, target.position);
            return distance <= skill.range;
        });
    }

    /**
     * Calculate distance between two positions
     * @param pos1 First position
     * @param pos2 Second position
     * @returns Manhattan distance
     */
    protected calculateDistance(pos1: Position, pos2: Position): number {
        return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
    }

    /**
     * Apply random factor to decision making
     * @param baseScore Base priority score
     * @returns Modified score with randomness
     */
    protected applyRandomFactor(baseScore: number): number {
        const randomFactor = this.config.randomFactor * this.difficultySettings.randomnessFactor;
        const randomModifier = (Math.random() - 0.5) * randomFactor * baseScore;
        return baseScore + randomModifier;
    }

    /**
     * Check if AI should make a mistake based on difficulty
     * @returns True if AI should make a suboptimal decision
     */
    protected shouldMakeMistake(): boolean {
        return Math.random() < this.difficultySettings.mistakeProbability;
    }

    /**
     * Start thinking timer
     */
    private startThinking(): void {
        this.isThinking = true;
        this.thinkingStartTime = Date.now();
    }

    /**
     * Stop thinking timer and record metrics
     */
    private stopThinking(): void {
        if (this.isThinking) {
            const thinkingTime = Date.now() - this.thinkingStartTime;
            this.lastDecisionTime = thinkingTime;
            this.updatePerformanceMetrics(thinkingTime);
            this.isThinking = false;
        }
    }

    /**
     * Create a timeout promise for thinking time limit
     * @returns Promise that rejects after timeout
     */
    private createTimeoutPromise(): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new AIThinkingTimeoutError(`AI thinking exceeded ${this.config.thinkingTimeLimit}ms`));
            }, this.config.thinkingTimeLimit);
        });
    }

    /**
     * Record a decision for metrics
     * @param decision The decision that was made
     */
    private recordDecision(decision: AIAction): void {
        this.performanceMetrics.totalDecisions++;
        this.performanceMetrics.actionTypeDistribution[decision.type] =
            (this.performanceMetrics.actionTypeDistribution[decision.type] || 0) + 1;

        if (this.config.enableAILogging) {
            console.log(`AI ${this.unit.name} decided: ${decision.type} - ${decision.reasoning}`);
        }
    }

    /**
     * Handle decision-making errors
     * @param error The error that occurred
     * @param context Current game context
     * @returns Recovery action
     */
    private handleDecisionError(error: any, context: AIContext): AIAction {
        this.performanceMetrics.errorCount++;

        if (error instanceof AIError) {
            if (this.config.enableAILogging) {
                console.warn(`AI Error (${error.type}): ${error.message}`);
            }
            return error.getRecoveryAction();
        }

        // Unknown error - use safe fallback
        if (this.config.enableAILogging) {
            console.error(`Unexpected AI error:`, error);
        }

        return {
            type: AIActionType.WAIT,
            priority: 0,
            reasoning: 'Unexpected error - using safe fallback',
        };
    }

    /**
     * Update performance metrics
     * @param thinkingTime Time taken for this decision
     */
    private updatePerformanceMetrics(thinkingTime: number): void {
        const metrics = this.performanceMetrics;

        metrics.averageThinkingTime =
            (metrics.averageThinkingTime * (metrics.totalDecisions - 1) + thinkingTime) / metrics.totalDecisions;

        metrics.maxThinkingTime = Math.max(metrics.maxThinkingTime, thinkingTime);
        metrics.minThinkingTime = Math.min(metrics.minThinkingTime, thinkingTime);

        if (thinkingTime >= this.config.thinkingTimeLimit) {
            metrics.timeoutCount++;
        }
    }

    /**
     * Initialize skill evaluator
     */
    private initializeSkillEvaluator(): void {
        if (this.integration.skillSystem) {
            try {
                // Get skill system and condition checker from integration
                const skillSystem = this.integration.skillSystem;
                const conditionChecker = skillSystem.conditionChecker || skillSystem.getConditionChecker?.();

                if (conditionChecker) {
                    this.skillEvaluator = new AISkillEvaluator(skillSystem, conditionChecker);

                    if (this.config.enableAILogging) {
                        console.log(`AI ${this.unit.name}: Skill evaluator initialized`);
                    }
                }
            } catch (error) {
                if (this.config.enableAILogging) {
                    console.warn(`AI ${this.unit.name}: Failed to initialize skill evaluator:`, error);
                }
            }
        }
    }

    /**
     * Initialize performance metrics
     * @returns Initial metrics object
     */
    private initializePerformanceMetrics(): AIPerformanceMetrics {
        return {
            averageThinkingTime: 0,
            maxThinkingTime: 0,
            minThinkingTime: Infinity,
            totalDecisions: 0,
            timeoutCount: 0,
            errorCount: 0,
            memoryUsage: 0,
            actionTypeDistribution: {} as Record<AIActionType, number>,
        };
    }

    // Getters for external access
    public get currentUnit(): Unit {
        return this.unit;
    }

    public get aiPersonality(): AIPersonality {
        return this.personality;
    }

    public get metrics(): AIPerformanceMetrics {
        return { ...this.performanceMetrics };
    }

    public get isCurrentlyThinking(): boolean {
        return this.isThinking;
    }

    public get lastThinkingTime(): number {
        return this.lastDecisionTime;
    }
}