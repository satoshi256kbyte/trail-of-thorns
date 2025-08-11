/**
 * TacticalAI - Tactical-focused AI behavior pattern
 *
 * This module provides:
 * - Terrain effect utilization and strategic positioning
 * - Coordinated attacks and formation tactics
 * - Area control and battlefield management
 * - Advanced tactical decision making
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
    TerrainEvaluation,
    ThreatAssessment,
    PositionEvaluation,
} from '../../types/ai';
import { Unit, Position } from '../../types/gameplay';

/**
 * Tactical formation types
 */
enum FormationType {
    DEFENSIVE = 'defensive',
    OFFENSIVE = 'offensive',
    FLANKING = 'flanking',
    PINCER = 'pincer',
    SUPPORT = 'support',
}

/**
 * Tactical priorities for different situations
 */
interface TacticalPriorities {
    terrainControl: number;        // Control key terrain features
    formationMaintenance: number;  // Maintain tactical formations
    flankingManeuvers: number;     // Execute flanking attacks
    areaControl: number;           // Control battlefield areas
    coordinatedAttacks: number;    // Execute coordinated attacks
    strategicWithdrawal: number;   // Tactical retreats
}

/**
 * Terrain tactical value assessment
 */
interface TerrainTacticalValue {
    position: Position;
    defensiveValue: number;        // Defensive bonuses
    offensiveValue: number;        // Offensive advantages
    controlValue: number;          // Strategic control importance
    accessibilityValue: number;    // How accessible the position is
    overallTacticalValue: number;  // Combined tactical assessment
}

/**
 * Coordinated attack plan
 */
interface CoordinatedAttackPlan {
    primaryAttacker: Unit;
    supportingUnits: Unit[];
    target: Unit;
    attackSequence: AIAction[];
    expectedDamage: number;
    successProbability: number;
    riskLevel: number;
}

/**
 * Formation assessment
 */
interface FormationAssessment {
    type: FormationType;
    units: Unit[];
    centerPosition: Position;
    cohesion: number;             // How well units maintain formation
    effectiveness: number;        // How effective the formation is
    vulnerability: number;        // Formation weaknesses
}

/**
 * TacticalAI class implementing advanced tactical behavior
 */
export class TacticalAI extends AIController {
    private actionEvaluator: ActionEvaluator;
    private tacticalPriorities: TacticalPriorities;

    // Tactical AI configuration
    private readonly tacticalRange = 6;           // Range for tactical considerations
    private readonly formationTolerance = 3;     // Distance tolerance for formations
    private readonly flankingRange = 4;          // Range for flanking maneuvers
    private readonly coordinationThreshold = 0.7; // Threshold for coordinated actions

    constructor(
        unit: Unit,
        personality: AIPersonality,
        difficultySettings: DifficultySettings,
        config: AIControllerConfig,
        integration: AISystemIntegration = {}
    ) {
        super(unit, personality, difficultySettings, config, integration);
        this.actionEvaluator = new ActionEvaluator(integration, difficultySettings);
        this.tacticalPriorities = this.calculateTacticalPriorities();
    }

    /**
     * Make decision based on tactical AI logic
     * @param context Current game context
     * @returns Promise resolving to the selected action
     */
    protected async makeDecision(context: AIContext): Promise<AIAction> {
        // Analyze battlefield situation
        const battlefieldAnalysis = this.analyzeBattlefield(context);

        // Evaluate terrain tactical opportunities
        const terrainActions = this.evaluateTerrainTactics(context);

        // Evaluate coordinated attack opportunities
        const coordinatedActions = this.evaluateCoordinatedAttacks(context);

        // Evaluate formation and positioning tactics
        const formationActions = this.evaluateFormationTactics(context);

        // Evaluate flanking and maneuver tactics
        const maneuverActions = this.evaluateManeuverTactics(context);

        // Evaluate area control actions
        const controlActions = this.evaluateAreaControl(context);

        // Combine all tactical actions
        const allActions = [
            ...terrainActions,
            ...coordinatedActions,
            ...formationActions,
            ...maneuverActions,
            ...controlActions,
        ];

        // Apply tactical analysis and personality modifiers
        const modifiedActions = this.applyTacticalModifiers(allActions, battlefieldAnalysis, context);

        // Select the best tactical action
        const bestAction = this.selectBestTacticalAction(modifiedActions, context);

        return bestAction;
    }

    /**
     * Evaluate the current position's tactical value
     * @param position Position to evaluate
     * @param context Current game context
     * @returns Numerical evaluation score
     */
    public evaluatePosition(position: Position, context: AIContext): number {
        let score = 0;

        // Terrain tactical value
        const terrainValue = this.evaluateTerrainTacticalValue(position, context);
        score += terrainValue.overallTacticalValue;

        // Formation positioning value
        const formationValue = this.evaluateFormationPositioning(position, context);
        score += formationValue;

        // Area control value
        const controlValue = this.evaluateAreaControlValue(position, context);
        score += controlValue;

        // Flanking opportunity value
        const flankingValue = this.evaluateFlankingValue(position, context);
        score += flankingValue;

        // Coordination potential
        const coordinationValue = this.evaluateCoordinationPotential(position, context);
        score += coordinationValue;

        return Math.max(0, score);
    }

    /**
     * Get the priority of this tactical AI unit
     * @param context Current game context
     * @returns Priority value
     */
    public getPriority(context: AIContext): number {
        let priority = this.unit.stats.speed;

        // Higher priority for tactical opportunities
        const tacticalOpportunities = this.countTacticalOpportunities(context);
        priority += tacticalOpportunities * 10;

        // Personality modifier
        priority += this.personality.tacticalness * 20;

        // Formation leadership bonus
        if (this.isFormationLeader(context)) {
            priority += 15;
        }

        return priority;
    }

    /**
     * Analyze the overall battlefield situation
     * @param context Current game context
     * @returns Battlefield analysis
     */
    private analyzeBattlefield(context: AIContext): any {
        return {
            enemyFormations: this.analyzeEnemyFormations(context),
            allyFormations: this.analyzeAllyFormations(context),
            keyTerrain: this.identifyKeyTerrain(context),
            tacticalOpportunities: this.identifyTacticalOpportunities(context),
            threatAssessment: this.assessOverallThreats(context),
        };
    }

    /**
     * Evaluate terrain-based tactical actions
     * @param context Current game context
     * @returns Array of terrain tactical actions
     */
    private evaluateTerrainTactics(context: AIContext): AIAction[] {
        const actions: AIAction[] = [];

        if (!this.integration.movementSystem || !context.mapData) {
            return actions;
        }

        // Find high-value terrain positions
        const tacticalPositions = this.identifyTacticalPositions(context);

        for (const terrainValue of tacticalPositions) {
            if (this.integration.movementSystem.canMoveTo(this.unit, terrainValue.position, context.mapData)) {
                const moveEvaluation = this.actionEvaluator.evaluateMove(
                    this.unit.position,
                    terrainValue.position,
                    context
                );

                // Apply terrain tactical bonus
                const tacticalBonus = terrainValue.overallTacticalValue;
                const totalScore = moveEvaluation.score + tacticalBonus;

                actions.push({
                    type: ActionType.MOVE,
                    character: this.unit,
                    targetPosition: terrainValue.position,
                    priority: totalScore,
                    evaluationScore: totalScore,
                    reasoning: `Tactical terrain move to (${terrainValue.position.x}, ${terrainValue.position.y}) - tactical value: ${tacticalBonus.toFixed(1)}`,
                });
            }
        }

        return actions;
    }

    /**
     * Evaluate coordinated attack opportunities
     * @param context Current game context
     * @returns Array of coordinated attack actions
     */
    private evaluateCoordinatedAttacks(context: AIContext): AIAction[] {
        const actions: AIAction[] = [];

        // Find potential coordinated attack plans
        const attackPlans = this.planCoordinatedAttacks(context);

        for (const plan of attackPlans) {
            if (plan.primaryAttacker.id === this.unit.id) {
                // This unit is the primary attacker
                const action = plan.attackSequence[0]; // First action in sequence

                if (action && action.character.id === this.unit.id) {
                    const coordinationBonus = plan.successProbability * 20;
                    const totalScore = action.priority + coordinationBonus;

                    actions.push({
                        ...action,
                        priority: totalScore,
                        evaluationScore: totalScore,
                        reasoning: `Coordinated attack on ${plan.target.name} (success prob: ${(plan.successProbability * 100).toFixed(1)}%)`,
                    });
                }
            } else if (plan.supportingUnits.some(unit => unit.id === this.unit.id)) {
                // This unit is a supporting attacker
                const supportAction = plan.attackSequence.find(action => action.character.id === this.unit.id);

                if (supportAction) {
                    const supportBonus = plan.successProbability * 15;
                    const totalScore = supportAction.priority + supportBonus;

                    actions.push({
                        ...supportAction,
                        priority: totalScore,
                        evaluationScore: totalScore,
                        reasoning: `Support coordinated attack on ${plan.target.name}`,
                    });
                }
            }
        }

        return actions;
    }

    /**
     * Evaluate formation and positioning tactics
     * @param context Current game context
     * @returns Array of formation tactical actions
     */
    private evaluateFormationTactics(context: AIContext): AIAction[] {
        const actions: AIAction[] = [];

        if (!this.integration.movementSystem || !context.mapData) {
            return actions;
        }

        // Analyze current formation
        const currentFormation = this.analyzeCurrentFormation(context);

        // Find optimal formation positions
        const formationPositions = this.calculateOptimalFormationPositions(currentFormation, context);

        for (const position of formationPositions) {
            if (this.integration.movementSystem.canMoveTo(this.unit, position, context.mapData)) {
                const formationValue = this.evaluateFormationPositioning(position, context);
                const moveEvaluation = this.actionEvaluator.evaluateMove(
                    this.unit.position,
                    position,
                    context
                );

                const totalScore = moveEvaluation.score + formationValue;

                actions.push({
                    type: ActionType.MOVE,
                    character: this.unit,
                    targetPosition: position,
                    priority: totalScore,
                    evaluationScore: totalScore,
                    reasoning: `Formation positioning move to (${position.x}, ${position.y}) - formation value: ${formationValue.toFixed(1)}`,
                });
            }
        }

        return actions;
    }

    /**
     * Evaluate flanking and maneuver tactics
     * @param context Current game context
     * @returns Array of maneuver tactical actions
     */
    private evaluateManeuverTactics(context: AIContext): AIAction[] {
        const actions: AIAction[] = [];

        // Identify flanking opportunities
        const flankingOpportunities = this.identifyFlankingOpportunities(context);

        for (const opportunity of flankingOpportunities) {
            // Evaluate flanking move
            if (this.integration.movementSystem?.canMoveTo(this.unit, opportunity.position, context.mapData)) {
                const flankingValue = opportunity.tacticalAdvantage;
                const moveEvaluation = this.actionEvaluator.evaluateMove(
                    this.unit.position,
                    opportunity.position,
                    context
                );

                const totalScore = moveEvaluation.score + flankingValue;

                actions.push({
                    type: ActionType.MOVE,
                    character: this.unit,
                    targetPosition: opportunity.position,
                    priority: totalScore,
                    evaluationScore: totalScore,
                    reasoning: `Flanking maneuver to (${opportunity.position.x}, ${opportunity.position.y}) targeting ${opportunity.target.name}`,
                });
            }

            // Evaluate flanking attack
            if (this.integration.battleSystem?.canAttack(this.unit, opportunity.target)) {
                const flankingAttackBonus = opportunity.tacticalAdvantage * 0.5;
                const attackEvaluation = this.actionEvaluator.evaluateAttack(this.unit, opportunity.target, context);

                const totalScore = attackEvaluation.score + flankingAttackBonus;

                actions.push({
                    type: ActionType.ATTACK,
                    character: this.unit,
                    target: opportunity.target,
                    priority: totalScore,
                    evaluationScore: totalScore,
                    reasoning: `Flanking attack on ${opportunity.target.name} (flanking bonus: ${flankingAttackBonus.toFixed(1)})`,
                });
            }
        }

        return actions;
    }

    /**
     * Evaluate area control actions
     * @param context Current game context
     * @returns Array of area control actions
     */
    private evaluateAreaControl(context: AIContext): AIAction[] {
        const actions: AIAction[] = [];

        // Identify key control points
        const controlPoints = this.identifyControlPoints(context);

        for (const controlPoint of controlPoints) {
            if (this.integration.movementSystem?.canMoveTo(this.unit, controlPoint.position, context.mapData)) {
                const controlValue = controlPoint.strategicValue;
                const moveEvaluation = this.actionEvaluator.evaluateMove(
                    this.unit.position,
                    controlPoint.position,
                    context
                );

                const totalScore = moveEvaluation.score + controlValue;

                actions.push({
                    type: ActionType.MOVE,
                    character: this.unit,
                    targetPosition: controlPoint.position,
                    priority: totalScore,
                    evaluationScore: totalScore,
                    reasoning: `Area control move to (${controlPoint.position.x}, ${controlPoint.position.y}) - control value: ${controlValue.toFixed(1)}`,
                });
            }
        }

        return actions;
    }

    /**
     * Apply tactical modifiers to actions
     * @param actions Array of actions to modify
     * @param battlefieldAnalysis Battlefield analysis data
     * @param context Current game context
     * @returns Modified actions
     */
    private applyTacticalModifiers(
        actions: AIAction[],
        battlefieldAnalysis: any,
        context: AIContext
    ): AIAction[] {
        return actions.map(action => {
            let modifier = 1.0;

            // Tactical actions get boosted by tacticalness
            modifier += this.personality.tacticalness * 0.4;

            // Coordinated actions get boosted if allies are nearby
            const nearbyAllies = context.visibleAllies.filter(ally =>
                this.calculateDistance(this.unit.position, ally.position) <= this.formationTolerance
            ).length;

            if (nearbyAllies > 0) {
                modifier += nearbyAllies * 0.1;
            }

            // Risk assessment modifier
            if (action.type === ActionType.MOVE) {
                const riskLevel = this.actionEvaluator.evaluateThreatLevel(
                    action.targetPosition!,
                    context
                );

                if (riskLevel > 50 && this.personality.riskTolerance < 0.5) {
                    modifier *= 0.7; // Reduce risky moves for risk-averse units
                }
            }

            // Difficulty modifier
            modifier *= (1 + this.difficultySettings.thinkingDepth * 0.1);

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
     * Select the best tactical action from available options
     * @param actions Array of evaluated actions
     * @param context Current game context
     * @returns Best tactical action to execute
     */
    private selectBestTacticalAction(actions: AIAction[], context: AIContext): AIAction {
        if (actions.length === 0) {
            // Fallback to wait action with tactical reasoning
            return {
                type: ActionType.WAIT,
                character: this.unit,
                priority: 0,
                evaluationScore: 0,
                reasoning: 'No tactical opportunities available - observing battlefield',
            };
        }

        // Sort by priority and select the best
        const sortedActions = actions.sort((a, b) => b.priority - a.priority);

        // Apply tactical decision making logic
        const bestAction = sortedActions[0];

        // Consider alternative actions if they're close in value
        const alternatives = sortedActions.filter(action =>
            action.priority >= bestAction.priority * 0.9
        );

        if (alternatives.length > 1 && this.personality.tacticalness > 0.7) {
            // High tactical AI considers multiple options
            return this.selectFromAlternatives(alternatives, context);
        }

        return bestAction;
    }

    /**
     * Calculate tactical priorities based on personality and difficulty
     * @returns Tactical priorities configuration
     */
    private calculateTacticalPriorities(): TacticalPriorities {
        const base = {
            terrainControl: 40,
            formationMaintenance: 35,
            flankingManeuvers: 45,
            areaControl: 30,
            coordinatedAttacks: 50,
            strategicWithdrawal: 25,
        };

        // Apply personality modifiers
        const tacticalMod = this.personality.tacticalness;
        const aggressiveMod = this.personality.aggressiveness;

        return {
            terrainControl: base.terrainControl * (1 + tacticalMod * 0.5),
            formationMaintenance: base.formationMaintenance * (1 + tacticalMod * 0.3),
            flankingManeuvers: base.flankingManeuvers * (1 + tacticalMod * 0.4 + aggressiveMod * 0.2),
            areaControl: base.areaControl * (1 + tacticalMod * 0.6),
            coordinatedAttacks: base.coordinatedAttacks * (1 + tacticalMod * 0.4 + aggressiveMod * 0.3),
            strategicWithdrawal: base.strategicWithdrawal * (1 + this.personality.defensiveness * 0.3),
        };
    }

    // Helper methods for tactical analysis

    private evaluateTerrainTacticalValue(position: Position, context: AIContext): TerrainTacticalValue {
        // Simplified terrain evaluation - in a real game, this would analyze actual terrain data
        return {
            position,
            defensiveValue: 20,
            offensiveValue: 15,
            controlValue: 25,
            accessibilityValue: 18,
            overallTacticalValue: 78,
        };
    }

    private evaluateFormationPositioning(position: Position, context: AIContext): number {
        // Evaluate how well this position maintains formation with allies
        let score = 0;

        const nearbyAllies = context.visibleAllies.filter(ally =>
            this.calculateDistance(position, ally.position) <= this.formationTolerance
        );

        score += nearbyAllies.length * 8;

        return score;
    }

    private evaluateAreaControlValue(position: Position, context: AIContext): number {
        // Evaluate strategic control value of position
        let score = 0;

        // Center of map bonus
        if (context.mapData) {
            const centerX = context.mapData.width / 2;
            const centerY = context.mapData.height / 2;
            const distanceFromCenter = this.calculateDistance(position, { x: centerX, y: centerY });
            score += Math.max(0, 20 - distanceFromCenter * 2);
        }

        return score;
    }

    private evaluateFlankingValue(position: Position, context: AIContext): number {
        // Evaluate flanking opportunities from this position
        let score = 0;

        for (const enemy of context.visibleEnemies) {
            const distance = this.calculateDistance(position, enemy.position);
            if (distance <= this.flankingRange) {
                // Check if this position provides flanking advantage
                if (this.isFlankingPosition(position, enemy, context)) {
                    score += 15;
                }
            }
        }

        return score;
    }

    private evaluateCoordinationPotential(position: Position, context: AIContext): number {
        // Evaluate potential for coordinated actions from this position
        let score = 0;

        const alliesInCoordinationRange = context.visibleAllies.filter(ally =>
            this.calculateDistance(position, ally.position) <= this.tacticalRange
        ).length;

        score += alliesInCoordinationRange * 5;

        return score;
    }

    private countTacticalOpportunities(context: AIContext): number {
        // Count available tactical opportunities
        let count = 0;

        // Flanking opportunities
        count += this.identifyFlankingOpportunities(context).length;

        // Terrain opportunities
        count += this.identifyTacticalPositions(context).length;

        // Coordination opportunities
        count += this.planCoordinatedAttacks(context).length;

        return count;
    }

    private isFormationLeader(context: AIContext): boolean {
        // Simplified check - in a real game, this would check formation data
        return this.unit.stats.attack > 15; // Strong units are formation leaders
    }

    private analyzeEnemyFormations(context: AIContext): FormationAssessment[] {
        // Simplified formation analysis
        return [];
    }

    private analyzeAllyFormations(context: AIContext): FormationAssessment[] {
        // Simplified formation analysis
        return [];
    }

    private identifyKeyTerrain(context: AIContext): TerrainTacticalValue[] {
        // Simplified terrain identification
        return [];
    }

    private identifyTacticalOpportunities(context: AIContext): any[] {
        // Simplified opportunity identification
        return [];
    }

    private assessOverallThreats(context: AIContext): ThreatAssessment[] {
        // Simplified threat assessment
        return [];
    }

    private identifyTacticalPositions(context: AIContext): TerrainTacticalValue[] {
        // Simplified tactical position identification
        const positions: TerrainTacticalValue[] = [];

        if (!context.mapData) return positions;

        // Sample some positions for tactical evaluation
        for (let x = 0; x < context.mapData.width; x += 2) {
            for (let y = 0; y < context.mapData.height; y += 2) {
                const position = { x, y };
                const tacticalValue = this.evaluateTerrainTacticalValue(position, context);

                if (tacticalValue.overallTacticalValue > 50) {
                    positions.push(tacticalValue);
                }
            }
        }

        return positions.sort((a, b) => b.overallTacticalValue - a.overallTacticalValue).slice(0, 5);
    }

    private planCoordinatedAttacks(context: AIContext): CoordinatedAttackPlan[] {
        // Simplified coordinated attack planning
        return [];
    }

    private analyzeCurrentFormation(context: AIContext): FormationAssessment {
        // Simplified formation analysis
        return {
            type: FormationType.DEFENSIVE,
            units: context.visibleAllies,
            centerPosition: this.unit.position,
            cohesion: 0.7,
            effectiveness: 0.6,
            vulnerability: 0.4,
        };
    }

    private calculateOptimalFormationPositions(
        formation: FormationAssessment,
        context: AIContext
    ): Position[] {
        // Simplified formation position calculation
        const positions: Position[] = [];

        // Add positions around formation center
        const center = formation.centerPosition;
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                if (dx !== 0 || dy !== 0) {
                    positions.push({ x: center.x + dx, y: center.y + dy });
                }
            }
        }

        return positions;
    }

    private identifyFlankingOpportunities(context: AIContext): any[] {
        // Simplified flanking opportunity identification
        const opportunities: any[] = [];

        for (const enemy of context.visibleEnemies) {
            // Check positions around enemy for flanking
            const flankingPositions = [
                { x: enemy.position.x - 1, y: enemy.position.y - 1 },
                { x: enemy.position.x + 1, y: enemy.position.y - 1 },
                { x: enemy.position.x - 1, y: enemy.position.y + 1 },
                { x: enemy.position.x + 1, y: enemy.position.y + 1 },
            ];

            for (const position of flankingPositions) {
                if (this.isFlankingPosition(position, enemy, context)) {
                    opportunities.push({
                        position,
                        target: enemy,
                        tacticalAdvantage: 25,
                    });
                }
            }
        }

        return opportunities;
    }

    private identifyControlPoints(context: AIContext): any[] {
        // Simplified control point identification
        const controlPoints: any[] = [];

        if (!context.mapData) return controlPoints;

        // Add center positions as control points
        const centerX = Math.floor(context.mapData.width / 2);
        const centerY = Math.floor(context.mapData.height / 2);

        controlPoints.push({
            position: { x: centerX, y: centerY },
            strategicValue: 30,
        });

        return controlPoints;
    }

    private isFlankingPosition(position: Position, target: Unit, context: AIContext): boolean {
        // Simplified flanking position check
        const distance = this.calculateDistance(position, target.position);
        return distance <= 2 && distance >= 1;
    }

    private selectFromAlternatives(alternatives: AIAction[], context: AIContext): AIAction {
        // Advanced tactical decision making between similar-value alternatives
        // For now, just return the first alternative
        return alternatives[0];
    }
}