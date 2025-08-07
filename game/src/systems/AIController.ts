/**
 * AIController - Main AI system for enemy unit behavior
 *
 * This class handles:
 * - Enemy AI decision making and behavior patterns
 * - Integration with NPCStateManager for NPC attack priorities
 * - Tactical AI behavior for NPC protection
 * - AI action selection and execution
 * - Recruitment system information integration
 */

import * as Phaser from 'phaser';
import { Unit, Position, MapData } from '../types/gameplay';
import { BattleSystem } from './BattleSystem';
import { MovementSystem } from './MovementSystem';
import { NPCStateManager } from './recruitment/NPCStateManager';
import { RecruitmentSystem } from './recruitment/RecruitmentSystem';

export enum AIBehaviorType {
  AGGRESSIVE = 'aggressive',
  DEFENSIVE = 'defensive',
  SUPPORT = 'support',
  NPC_HUNTER = 'npc_hunter',
  TACTICAL = 'tactical',
}

export enum AIActionType {
  ATTACK = 'attack',
  MOVE = 'move',
  WAIT = 'wait',
  SKILL = 'skill',
  GUARD = 'guard',
}

export interface AIAction {
  type: AIActionType;
  priority: number;
  target?: Unit;
  position?: Position;
  skillId?: string;
  reasoning: string;
}

export interface AIDecisionContext {
  currentUnit: Unit;
  allUnits: Unit[];
  mapData?: MapData;
  currentTurn: number;
  gamePhase: string;
}

export interface AITarget {
  unit: Unit;
  priority: number;
  distance: number;
  isNPC: boolean;
  canAttack: boolean;
  canReach: boolean;
  reasoning: string;
}

export interface AIControllerConfig {
  /** Default thinking time limit in milliseconds */
  thinkingTimeLimit: number;
  /** Enable detailed AI logging */
  enableAILogging: boolean;
  /** NPC priority multiplier */
  npcPriorityMultiplier: number;
  /** Maximum search depth for tactical decisions */
  maxSearchDepth: number;
  /** Enable tactical AI behaviors */
  enableTacticalAI: boolean;
  /** Random factor in decision making (0-1) */
  randomFactor: number;
}

/**
 * Main AI controller class for enemy unit behavior
 */
export class AIController extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private config: AIControllerConfig;
  private battleSystem: BattleSystem;
  private movementSystem: MovementSystem;
  private npcStateManager: NPCStateManager | null = null;
  private recruitmentSystem: RecruitmentSystem | null = null;

  // AI state tracking
  private currentDecisionContext: AIDecisionContext | null = null;
  private lastDecisionTime: number = 0;
  private decisionHistory: Map<string, AIAction[]> = new Map();

  // Default configuration
  private static readonly DEFAULT_CONFIG: AIControllerConfig = {
    thinkingTimeLimit: 2000, // 2 seconds
    enableAILogging: false,
    npcPriorityMultiplier: 10.0,
    maxSearchDepth: 3,
    enableTacticalAI: true,
    randomFactor: 0.1,
  };

  constructor(
    scene: Phaser.Scene,
    battleSystem: BattleSystem,
    movementSystem: MovementSystem,
    config?: Partial<AIControllerConfig>
  ) {
    super();

    this.scene = scene;
    this.battleSystem = battleSystem;
    this.movementSystem = movementSystem;
    this.config = { ...AIController.DEFAULT_CONFIG, ...config };
  }

  /**
   * Set NPCStateManager for NPC priority integration
   * @param npcStateManager NPCStateManager instance
   */
  setNPCStateManager(npcStateManager: NPCStateManager): void {
    this.npcStateManager = npcStateManager;
    this.log('NPCStateManager integrated with AI system');
  }

  /**
   * Set RecruitmentSystem for recruitment information access
   * @param recruitmentSystem RecruitmentSystem instance
   */
  setRecruitmentSystem(recruitmentSystem: RecruitmentSystem): void {
    this.recruitmentSystem = recruitmentSystem;
    this.log('RecruitmentSystem integrated with AI system');
  }

  /**
   * Make AI decision for a unit's turn
   * @param unit Unit to make decision for
   * @param allUnits All units in the game
   * @param mapData Map data for pathfinding
   * @param currentTurn Current turn number
   * @returns Promise resolving to the chosen action
   */
  async makeDecision(
    unit: Unit,
    allUnits: Unit[],
    mapData?: MapData,
    currentTurn: number = 1
  ): Promise<AIAction> {
    const startTime = performance.now();

    try {
      // Create decision context
      this.currentDecisionContext = {
        currentUnit: unit,
        allUnits: allUnits,
        mapData: mapData,
        currentTurn: currentTurn,
        gamePhase: 'battle',
      };

      this.log(`Making AI decision for ${unit.name}`, {
        unitId: unit.id,
        turn: currentTurn,
        hp: unit.currentHP,
      });

      // Analyze available targets with NPC priority
      const targets = this.analyzeTargets(unit, allUnits, mapData);

      // Determine AI behavior based on unit and situation
      const behaviorType = this.determineBehaviorType(unit, targets, allUnits);

      // Generate possible actions
      const possibleActions = await this.generatePossibleActions(
        unit,
        targets,
        behaviorType,
        mapData
      );

      // Select best action based on behavior and priorities
      const selectedAction = this.selectBestAction(possibleActions, behaviorType);

      // Record decision in history
      this.recordDecision(unit.id, selectedAction);

      // Emit AI decision event
      this.emit('ai-decision-made', {
        unit: unit,
        action: selectedAction,
        behaviorType: behaviorType,
        targets: targets,
        decisionTime: performance.now() - startTime,
      });

      this.log(`AI decision made for ${unit.name}: ${selectedAction.type}`, {
        action: selectedAction.type,
        priority: selectedAction.priority,
        reasoning: selectedAction.reasoning,
        decisionTime: performance.now() - startTime,
      });

      return selectedAction;
    } catch (error) {
      this.log(`Error making AI decision for ${unit.name}`, { error: error.message });

      // Return safe fallback action
      const fallbackAction = {
        type: AIActionType.WAIT,
        priority: 0,
        reasoning: 'Error occurred during decision making, defaulting to wait',
      };

      // Record the fallback decision
      this.recordDecision(unit.id, fallbackAction);

      return fallbackAction;
    } finally {
      this.lastDecisionTime = performance.now() - startTime;
    }
  }

  /**
   * Analyze all potential targets with NPC priority consideration
   * @param unit AI unit analyzing targets
   * @param allUnits All units in the game
   * @param mapData Map data for distance calculations
   * @returns Array of analyzed targets sorted by priority
   */
  private analyzeTargets(unit: Unit, allUnits: Unit[], mapData?: MapData): AITarget[] {
    const targets: AITarget[] = [];

    // Filter to enemy units (from AI perspective)
    const enemyUnits = allUnits.filter(
      u => u.faction !== unit.faction && u.currentHP > 0 && u.id !== unit.id
    );

    for (const target of enemyUnits) {
      const distance = this.calculateDistance(unit.position, target.position);
      const isNPC = this.npcStateManager?.isNPC(target) || false;

      // Check recruitment information if available
      let isRecrutable = false;
      if (this.recruitmentSystem && target.faction !== unit.faction) {
        try {
          const recruitmentConditions = this.recruitmentSystem.getRecruitmentConditions(target);
          isRecrutable = recruitmentConditions.length > 0;
        } catch (error) {
          // Ignore recruitment system errors
        }
      }

      // Calculate base priority
      let priority = this.calculateBasePriority(target, distance);

      // Apply NPC priority multiplier
      if (isNPC) {
        const npcPriority = this.npcStateManager?.getNPCPriority(target) || 0;
        priority += npcPriority * this.config.npcPriorityMultiplier;

        this.log(`NPC priority applied to ${target.name}`, {
          basePriority: priority - npcPriority * this.config.npcPriorityMultiplier,
          npcPriority: npcPriority,
          finalPriority: priority,
        });
      }

      // Check if target can be attacked
      const canAttack = this.canAttackTarget(unit, target);
      const canReach = this.canReachTarget(unit, target, mapData);

      // Generate reasoning for target selection
      let reasoning = `Distance: ${distance}`;
      if (isNPC) {
        reasoning += ', NPC (HIGH PRIORITY)';
      }
      if (target.currentHP < target.stats.maxHP * 0.3) {
        reasoning += ', Low HP';
        priority += 20; // Bonus for low HP targets
      }
      if (!canAttack && !canReach) {
        reasoning += ', Cannot reach';
        priority -= 50; // Penalty for unreachable targets
      }

      targets.push({
        unit: target,
        priority: priority,
        distance: distance,
        isNPC: isNPC,
        canAttack: canAttack,
        canReach: canReach,
        reasoning: reasoning,
      });
    }

    // Sort by priority (highest first)
    targets.sort((a, b) => b.priority - a.priority);

    this.log(`Analyzed ${targets.length} targets for ${unit.name}`, {
      topTarget: targets[0]?.unit.name,
      topPriority: targets[0]?.priority,
      npcTargets: targets.filter(t => t.isNPC).length,
    });

    return targets;
  }

  /**
   * Determine AI behavior type based on unit and situation
   * @param unit AI unit
   * @param targets Available targets
   * @param allUnits All units in game
   * @returns Appropriate behavior type
   */
  private determineBehaviorType(unit: Unit, targets: AITarget[], allUnits: Unit[]): AIBehaviorType {
    // Check unit's health status first - survival is priority
    const healthPercentage = unit.currentHP / unit.stats.maxHP;
    if (healthPercentage < 0.3) {
      return AIBehaviorType.DEFENSIVE;
    }

    // Check if there are NPCs present - prioritize NPC hunting if healthy
    const npcTargets = targets.filter(t => t.isNPC);
    if (npcTargets.length > 0) {
      this.log(`${unit.name} switching to NPC hunter behavior`, {
        npcCount: npcTargets.length,
      });
      return AIBehaviorType.NPC_HUNTER;
    }
    if (healthPercentage < 0.3) {
      return AIBehaviorType.DEFENSIVE;
    }

    // Check if unit has support abilities
    if (this.hasHealingAbilities(unit)) {
      const injuredAllies = allUnits.filter(
        u => u.faction === unit.faction && u.currentHP < u.stats.maxHP * 0.5 && u.id !== unit.id
      );

      if (injuredAllies.length > 0) {
        return AIBehaviorType.SUPPORT;
      }
    }

    // Use tactical behavior if enabled and there are strategic opportunities
    if (this.config.enableTacticalAI && this.hasTacticalOpportunities(unit, targets, allUnits)) {
      return AIBehaviorType.TACTICAL;
    }

    // Default to aggressive behavior
    return AIBehaviorType.AGGRESSIVE;
  }

  /**
   * Generate possible actions for the AI unit
   * @param unit AI unit
   * @param targets Available targets
   * @param behaviorType Current behavior type
   * @param mapData Map data for movement
   * @returns Array of possible actions
   */
  private async generatePossibleActions(
    unit: Unit,
    targets: AITarget[],
    behaviorType: AIBehaviorType,
    mapData?: MapData
  ): Promise<AIAction[]> {
    const actions: AIAction[] = [];

    // Generate attack actions
    for (const target of targets) {
      if (target.canAttack) {
        let priority = target.priority;

        // Behavior-specific priority adjustments
        switch (behaviorType) {
          case AIBehaviorType.NPC_HUNTER:
            if (target.isNPC) {
              priority += 100; // Massive bonus for NPCs
            } else {
              priority -= 30; // Penalty for non-NPCs
            }
            break;

          case AIBehaviorType.AGGRESSIVE:
            priority += 10; // Small bonus for all attacks
            break;

          case AIBehaviorType.DEFENSIVE:
            priority -= 20; // Penalty for attacks when defensive
            break;
        }

        actions.push({
          type: AIActionType.ATTACK,
          priority: priority,
          target: target.unit,
          reasoning: `Attack ${target.unit.name}: ${target.reasoning}`,
        });
      }
    }

    // Generate movement actions
    const movementActions = await this.generateMovementActions(
      unit,
      targets,
      behaviorType,
      mapData
    );
    actions.push(...movementActions);

    // Generate wait action (always available)
    actions.push({
      type: AIActionType.WAIT,
      priority: 5, // Low priority fallback
      reasoning: 'Wait and observe',
    });

    // Add some randomness to prevent predictable behavior
    if (this.config.randomFactor > 0) {
      for (const action of actions) {
        const randomAdjustment = (Math.random() - 0.5) * this.config.randomFactor * 20;
        action.priority += randomAdjustment;
      }
    }

    return actions;
  }

  /**
   * Generate movement actions for positioning
   * @param unit AI unit
   * @param targets Available targets
   * @param behaviorType Current behavior type
   * @param mapData Map data
   * @returns Array of movement actions
   */
  private async generateMovementActions(
    unit: Unit,
    targets: AITarget[],
    behaviorType: AIBehaviorType,
    mapData?: MapData
  ): Promise<AIAction[]> {
    const actions: AIAction[] = [];

    if (!mapData || unit.hasMoved) {
      return actions; // Cannot move
    }

    // Get movement range
    const movementRange = this.movementSystem.calculateMovementRange(unit, mapData);

    // Generate positioning actions based on behavior
    switch (behaviorType) {
      case AIBehaviorType.NPC_HUNTER:
      case AIBehaviorType.AGGRESSIVE:
        // Move closer to high-priority targets
        for (const target of targets.slice(0, 3)) {
          // Top 3 targets
          const closerPositions = this.findPositionsCloserToTarget(
            unit.position,
            target.unit.position,
            movementRange
          );

          for (const position of closerPositions.slice(0, 2)) {
            // Top 2 positions
            actions.push({
              type: AIActionType.MOVE,
              priority: target.priority * 0.7, // Lower than direct attack
              position: position,
              reasoning: `Move closer to ${target.unit.name} (${target.isNPC ? 'NPC' : 'enemy'})`,
            });
          }
        }
        break;

      case AIBehaviorType.DEFENSIVE:
        // Move away from threats or to defensive positions
        const defensivePositions = this.findDefensivePositions(
          unit,
          targets,
          movementRange,
          mapData
        );
        for (const position of defensivePositions.slice(0, 2)) {
          actions.push({
            type: AIActionType.MOVE,
            priority: 40,
            position: position,
            reasoning: 'Move to defensive position',
          });
        }
        break;

      case AIBehaviorType.TACTICAL:
        // Move to tactical positions (flanking, high ground, etc.)
        const tacticalPositions = this.findTacticalPositions(unit, targets, movementRange, mapData);
        for (const position of tacticalPositions.slice(0, 2)) {
          actions.push({
            type: AIActionType.MOVE,
            priority: 35,
            position: position,
            reasoning: 'Move to tactical position',
          });
        }
        break;
    }

    return actions;
  }

  /**
   * Select the best action from available options
   * @param actions Available actions
   * @param behaviorType Current behavior type
   * @returns Selected action
   */
  private selectBestAction(actions: AIAction[], behaviorType: AIBehaviorType): AIAction {
    if (actions.length === 0) {
      return {
        type: AIActionType.WAIT,
        priority: 0,
        reasoning: 'No actions available',
      };
    }

    // Sort actions by priority
    actions.sort((a, b) => b.priority - a.priority);

    // Apply behavior-specific selection logic
    let selectedAction = actions[0];

    // For NPC hunter behavior, strongly prefer NPC targets
    if (behaviorType === AIBehaviorType.NPC_HUNTER) {
      const npcAttackActions = actions.filter(
        a => a.type === AIActionType.ATTACK && a.target && this.npcStateManager?.isNPC(a.target)
      );

      if (npcAttackActions.length > 0) {
        selectedAction = npcAttackActions[0];
        this.log('NPC hunter prioritizing NPC target', {
          target: selectedAction.target?.name,
          priority: selectedAction.priority,
        });
      }
    }

    return selectedAction;
  }

  /**
   * Calculate base priority for a target
   * @param target Target unit
   * @param distance Distance to target
   * @returns Base priority value
   */
  private calculateBasePriority(target: Unit, distance: number): number {
    let priority = 50; // Base priority

    // Distance penalty (closer is better)
    priority -= distance * 2;

    // Health-based priority (lower health = higher priority)
    const healthPercentage = target.currentHP / target.stats.maxHP;
    priority += (1 - healthPercentage) * 30;

    // Unit type bonuses (could be expanded based on unit types)
    if (target.stats.attack > target.stats.defense) {
      priority += 10; // Prioritize glass cannons
    }

    return Math.max(0, priority);
  }

  /**
   * Calculate distance between two positions
   * @param pos1 First position
   * @param pos2 Second position
   * @returns Manhattan distance
   */
  private calculateDistance(pos1: Position, pos2: Position): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }

  /**
   * Check if unit can attack target
   * @param attacker Attacking unit
   * @param target Target unit
   * @returns True if can attack
   */
  private canAttackTarget(attacker: Unit, target: Unit): boolean {
    try {
      // Check if attacker can attack at all
      if (!this.battleSystem.canAttack(attacker)) {
        return false;
      }

      // Basic target validation
      if (!target || target.currentHP <= 0 || target.faction === attacker.faction) {
        return false;
      }

      // Check if target is within attack range (simplified check)
      const distance = this.calculateDistance(attacker.position, target.position);
      const maxRange = attacker.weapon?.range || 1; // Default melee range

      return distance <= maxRange;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if unit can reach target (for movement)
   * @param unit Moving unit
   * @param target Target unit
   * @param mapData Map data
   * @returns True if can reach
   */
  private canReachTarget(unit: Unit, target: Unit, mapData?: MapData): boolean {
    if (!mapData || unit.hasMoved) {
      return false;
    }

    try {
      const movementRange = this.movementSystem.calculateMovementRange(unit, mapData);
      return movementRange.some(
        pos => Math.abs(pos.x - target.position.x) <= 1 && Math.abs(pos.y - target.position.y) <= 1
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if unit has healing abilities
   * @param unit Unit to check
   * @returns True if has healing abilities
   */
  private hasHealingAbilities(unit: Unit): boolean {
    // This would check unit's skills/abilities in a full implementation
    // For now, return false as a placeholder
    return false;
  }

  /**
   * Check if there are tactical opportunities
   * @param unit AI unit
   * @param targets Available targets
   * @param allUnits All units
   * @returns True if tactical opportunities exist
   */
  private hasTacticalOpportunities(unit: Unit, targets: AITarget[], allUnits: Unit[]): boolean {
    // Check for flanking opportunities, terrain advantages, etc.
    // This is a simplified implementation
    return targets.some(t => t.distance > 2) && allUnits.length > 4;
  }

  /**
   * Find positions closer to target
   * @param currentPos Current position
   * @param targetPos Target position
   * @param movementRange Available movement positions
   * @returns Positions that are closer to target
   */
  private findPositionsCloserToTarget(
    currentPos: Position,
    targetPos: Position,
    movementRange: Position[]
  ): Position[] {
    const currentDistance = this.calculateDistance(currentPos, targetPos);

    return movementRange
      .filter(pos => this.calculateDistance(pos, targetPos) < currentDistance)
      .sort((a, b) => this.calculateDistance(a, targetPos) - this.calculateDistance(b, targetPos));
  }

  /**
   * Find defensive positions
   * @param unit AI unit
   * @param targets Threat targets
   * @param movementRange Available movement positions
   * @param mapData Map data
   * @returns Defensive positions
   */
  private findDefensivePositions(
    unit: Unit,
    targets: AITarget[],
    movementRange: Position[],
    mapData: MapData
  ): Position[] {
    // Find positions that maximize distance from threats
    return movementRange
      .map(pos => ({
        position: pos,
        safety: targets.reduce(
          (sum, target) => sum + this.calculateDistance(pos, target.unit.position),
          0
        ),
      }))
      .sort((a, b) => b.safety - a.safety)
      .map(item => item.position);
  }

  /**
   * Find tactical positions
   * @param unit AI unit
   * @param targets Available targets
   * @param movementRange Available movement positions
   * @param mapData Map data
   * @returns Tactical positions
   */
  private findTacticalPositions(
    unit: Unit,
    targets: AITarget[],
    movementRange: Position[],
    mapData: MapData
  ): Position[] {
    // This would implement more sophisticated tactical positioning
    // For now, return positions that provide good attack angles
    return movementRange
      .filter(pos => targets.some(t => this.calculateDistance(pos, t.unit.position) <= 3))
      .slice(0, 3);
  }

  /**
   * Record AI decision in history
   * @param unitId Unit ID
   * @param action Selected action
   */
  private recordDecision(unitId: string, action: AIAction): void {
    if (!this.decisionHistory.has(unitId)) {
      this.decisionHistory.set(unitId, []);
    }

    const history = this.decisionHistory.get(unitId)!;
    history.push(action);

    // Keep only last 10 decisions
    if (history.length > 10) {
      history.shift();
    }
  }

  /**
   * Get decision history for a unit
   * @param unitId Unit ID
   * @returns Array of past decisions
   */
  getDecisionHistory(unitId: string): AIAction[] {
    return this.decisionHistory.get(unitId) || [];
  }

  /**
   * Update AI configuration
   * @param newConfig New configuration options
   */
  updateConfig(newConfig: Partial<AIControllerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('AI configuration updated', newConfig);
  }

  /**
   * Get current configuration
   * @returns Current configuration
   */
  getConfig(): AIControllerConfig {
    return { ...this.config };
  }

  /**
   * Clear decision history
   */
  clearDecisionHistory(): void {
    this.decisionHistory.clear();
    this.log('AI decision history cleared');
  }

  /**
   * Get AI statistics
   * @returns Statistics about AI decisions
   */
  getAIStatistics(): {
    totalDecisions: number;
    averageDecisionTime: number;
    actionTypeDistribution: Record<AIActionType, number>;
    npcTargetingRate: number;
  } {
    let totalDecisions = 0;
    const actionCounts: Record<AIActionType, number> = {
      [AIActionType.ATTACK]: 0,
      [AIActionType.MOVE]: 0,
      [AIActionType.WAIT]: 0,
      [AIActionType.SKILL]: 0,
      [AIActionType.GUARD]: 0,
    };
    let npcTargets = 0;
    let attackActions = 0;

    for (const history of this.decisionHistory.values()) {
      totalDecisions += history.length;

      for (const action of history) {
        actionCounts[action.type]++;

        if (action.type === AIActionType.ATTACK) {
          attackActions++;
          if (action.target && this.npcStateManager?.isNPC(action.target)) {
            npcTargets++;
          }
        }
      }
    }

    return {
      totalDecisions,
      averageDecisionTime: this.lastDecisionTime,
      actionTypeDistribution: actionCounts,
      npcTargetingRate: attackActions > 0 ? npcTargets / attackActions : 0,
    };
  }

  /**
   * Log AI message if logging is enabled
   * @param message Log message
   * @param data Additional data
   */
  private log(message: string, data?: any): void {
    if (this.config.enableAILogging) {
      console.log(`[AIController] ${message}`, data || '');
    }
  }

  /**
   * Cleanup and destroy AI controller
   */
  destroy(): void {
    this.clearDecisionHistory();
    this.removeAllListeners();
    this.log('AIController destroyed');
  }
}
