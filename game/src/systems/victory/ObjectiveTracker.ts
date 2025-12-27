/**
 * ObjectiveTracker - Tracks objective progress automatically based on game events
 *
 * This class handles:
 * - Automatic objective progress tracking
 * - Objective condition evaluation
 * - Unit defeated event handling
 * - Position reached event handling
 * - Turn advance event handling
 * - Real-time progress updates
 *
 * Implements requirements 1.4, 1.7, 1.8, 1.9 from the boss victory system specification
 */

import * as Phaser from 'phaser';
import {
  Objective,
  ObjectiveType,
  ObjectiveProgress,
  ObjectiveTargetData,
} from '../../types/victory';
import { Unit, Position, GameState } from '../../types/gameplay';
import { ObjectiveManager } from './ObjectiveManager';

/**
 * Objective tracker configuration
 */
export interface ObjectiveTrackerConfig {
  /** Whether to show detailed debug logs */
  enableDebugLogs: boolean;
  /** Whether to automatically update objectives on events */
  autoTrack: boolean;
  /** Whether to emit progress events */
  emitProgressEvents: boolean;
}

/**
 * Objective evaluation result
 */
export interface ObjectiveEvaluationResult {
  success: boolean;
  objectiveId: string;
  isComplete: boolean;
  progress: ObjectiveProgress;
  message?: string;
  error?: string;
}

/**
 * Unit defeated event data
 */
export interface UnitDefeatedEvent {
  unit: Unit;
  defeatedBy?: Unit;
  isBoss?: boolean;
  timestamp: number;
}

/**
 * Position reached event data
 */
export interface PositionReachedEvent {
  unit: Unit;
  position: Position;
  timestamp: number;
}

/**
 * Turn advance event data
 */
export interface TurnAdvanceEvent {
  currentTurn: number;
  previousTurn: number;
  activePlayer: 'player' | 'enemy';
  timestamp: number;
}

/**
 * ObjectiveTracker class for automatic objective progress tracking
 */
export class ObjectiveTracker extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private config: ObjectiveTrackerConfig;
  private objectiveManager: ObjectiveManager;
  private gameState?: GameState;

  // Tracking state
  private defeatedUnits: Set<string> = new Set();
  private reachedPositions: Map<string, Position[]> = new Map(); // unitId -> positions
  private currentTurn: number = 1;

  // Default configuration
  private static readonly DEFAULT_CONFIG: ObjectiveTrackerConfig = {
    enableDebugLogs: false,
    autoTrack: true,
    emitProgressEvents: true,
  };

  /**
   * Creates a new ObjectiveTracker instance
   * @param scene - Phaser scene for events
   * @param objectiveManager - Objective manager instance
   * @param config - Objective tracker configuration
   */
  constructor(
    scene: Phaser.Scene,
    objectiveManager: ObjectiveManager,
    config?: Partial<ObjectiveTrackerConfig>
  ) {
    super();

    this.scene = scene;
    this.objectiveManager = objectiveManager;
    this.config = { ...ObjectiveTracker.DEFAULT_CONFIG, ...config };

    this.setupEventListeners();
    this.log('ObjectiveTracker initialized');
  }

  /**
   * Set the current game state for objective evaluation
   * @param gameState - Current game state
   */
  public setGameState(gameState: GameState): void {
    this.gameState = gameState;
    this.currentTurn = gameState.currentTurn;
  }

  /**
   * Track objective progress automatically
   * Evaluates all objectives and updates their progress
   * @returns Array of evaluation results
   */
  public trackObjectiveProgress(): ObjectiveEvaluationResult[] {
    try {
      const objectives = this.objectiveManager.getAllObjectives();
      const results: ObjectiveEvaluationResult[] = [];

      for (const objective of objectives) {
        if (objective.isComplete) {
          continue; // Skip already completed objectives
        }

        const result = this.evaluateObjectiveCondition(objective);
        results.push(result);

        // Update objective progress if changed
        if (result.success && !result.isComplete) {
          this.objectiveManager.updateProgress(objective.id, result.progress);
        }
      }

      this.log('Objective progress tracked', { evaluatedCount: results.length });

      return results;
    } catch (error) {
      this.log('Error tracking objective progress', error);
      return [];
    }
  }

  /**
   * Evaluate an objective's condition
   * @param objective - Objective to evaluate
   * @returns Evaluation result
   */
  public evaluateObjectiveCondition(objective: Objective): ObjectiveEvaluationResult {
    try {
      if (!objective) {
        return {
          success: false,
          objectiveId: 'unknown',
          isComplete: false,
          progress: { current: 0, target: 0, percentage: 0 },
          error: 'Objective is null or undefined',
        };
      }

      // Evaluate based on objective type
      switch (objective.type) {
        case ObjectiveType.DEFEAT_BOSS:
          return this.evaluateDefeatBossObjective(objective);

        case ObjectiveType.DEFEAT_ALL_ENEMIES:
          return this.evaluateDefeatAllEnemiesObjective(objective);

        case ObjectiveType.REACH_POSITION:
          return this.evaluateReachPositionObjective(objective);

        case ObjectiveType.SURVIVE_TURNS:
          return this.evaluateSurviveTurnsObjective(objective);

        case ObjectiveType.PROTECT_UNIT:
          return this.evaluateProtectUnitObjective(objective);

        case ObjectiveType.COLLECT_ITEMS:
          return this.evaluateCollectItemsObjective(objective);

        case ObjectiveType.CUSTOM:
          return this.evaluateCustomObjective(objective);

        default:
          return {
            success: false,
            objectiveId: objective.id,
            isComplete: false,
            progress: objective.progress,
            error: `Unknown objective type: ${objective.type}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        objectiveId: objective.id,
        isComplete: false,
        progress: objective.progress,
        error: `Failed to evaluate objective: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Handle unit defeated event
   * @param event - Unit defeated event data
   */
  public handleUnitDefeated(event: UnitDefeatedEvent): void {
    try {
      if (!event || !event.unit) {
        this.log('Warning: Invalid unit defeated event', event);
        return;
      }

      // Track defeated unit
      this.defeatedUnits.add(event.unit.id);

      this.log('Unit defeated', {
        unitId: event.unit.id,
        isBoss: event.isBoss,
        totalDefeated: this.defeatedUnits.size,
      });

      // Update relevant objectives
      if (this.config.autoTrack) {
        this.updateDefeatObjectives(event);
      }

      // Emit unit defeated event
      if (this.config.emitProgressEvents) {
        this.emit('unit-defeated-tracked', {
          event,
          defeatedCount: this.defeatedUnits.size,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      this.log('Error handling unit defeated', error);
    }
  }

  /**
   * Handle position reached event
   * @param event - Position reached event data
   */
  public handlePositionReached(event: PositionReachedEvent): void {
    try {
      if (!event || !event.unit || !event.position) {
        this.log('Warning: Invalid position reached event', event);
        return;
      }

      // Track reached position
      const positions = this.reachedPositions.get(event.unit.id) || [];
      positions.push({ ...event.position });
      this.reachedPositions.set(event.unit.id, positions);

      this.log('Position reached', {
        unitId: event.unit.id,
        position: event.position,
        totalPositions: positions.length,
      });

      // Update relevant objectives
      if (this.config.autoTrack) {
        this.updatePositionObjectives(event);
      }

      // Emit position reached event
      if (this.config.emitProgressEvents) {
        this.emit('position-reached-tracked', {
          event,
          positionCount: positions.length,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      this.log('Error handling position reached', error);
    }
  }

  /**
   * Handle turn advance event
   * @param event - Turn advance event data
   */
  public handleTurnAdvance(event: TurnAdvanceEvent): void {
    try {
      if (!event) {
        this.log('Warning: Invalid turn advance event', event);
        return;
      }

      // Update current turn
      this.currentTurn = event.currentTurn;

      this.log('Turn advanced', {
        currentTurn: event.currentTurn,
        previousTurn: event.previousTurn,
        activePlayer: event.activePlayer,
      });

      // Update relevant objectives
      if (this.config.autoTrack) {
        this.updateTurnObjectives(event);
      }

      // Emit turn advance event
      if (this.config.emitProgressEvents) {
        this.emit('turn-advanced-tracked', {
          event,
          currentTurn: this.currentTurn,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      this.log('Error handling turn advance', error);
    }
  }

  /**
   * Evaluate defeat boss objective
   * @param objective - Objective to evaluate
   * @returns Evaluation result
   */
  private evaluateDefeatBossObjective(objective: Objective): ObjectiveEvaluationResult {
    const targetData = objective.targetData;
    if (!targetData?.bossId) {
      return {
        success: false,
        objectiveId: objective.id,
        isComplete: false,
        progress: objective.progress,
        error: 'Boss ID not specified in target data',
      };
    }

    const isBossDefeated = this.defeatedUnits.has(targetData.bossId);
    const progress: ObjectiveProgress = {
      current: isBossDefeated ? 1 : 0,
      target: 1,
      percentage: isBossDefeated ? 100 : 0,
    };

    return {
      success: true,
      objectiveId: objective.id,
      isComplete: isBossDefeated,
      progress,
      message: isBossDefeated ? 'Boss defeated' : 'Boss not yet defeated',
    };
  }

  /**
   * Evaluate defeat all enemies objective
   * @param objective - Objective to evaluate
   * @returns Evaluation result
   */
  private evaluateDefeatAllEnemiesObjective(objective: Objective): ObjectiveEvaluationResult {
    if (!this.gameState) {
      return {
        success: false,
        objectiveId: objective.id,
        isComplete: false,
        progress: objective.progress,
        error: 'Game state not available',
      };
    }

    // Count total enemies and defeated enemies
    const enemyUnits = this.gameState.turnOrder.filter(unit => unit.faction === 'enemy');
    const totalEnemies = enemyUnits.length;
    const defeatedEnemies = enemyUnits.filter(unit => this.defeatedUnits.has(unit.id)).length;

    const progress: ObjectiveProgress = {
      current: defeatedEnemies,
      target: totalEnemies,
      percentage: totalEnemies > 0 ? (defeatedEnemies / totalEnemies) * 100 : 0,
    };

    return {
      success: true,
      objectiveId: objective.id,
      isComplete: defeatedEnemies >= totalEnemies && totalEnemies > 0,
      progress,
      message: `Defeated ${defeatedEnemies}/${totalEnemies} enemies`,
    };
  }

  /**
   * Evaluate reach position objective
   * @param objective - Objective to evaluate
   * @returns Evaluation result
   */
  private evaluateReachPositionObjective(objective: Objective): ObjectiveEvaluationResult {
    const targetData = objective.targetData;
    if (!targetData?.targetPosition && !targetData?.targetArea) {
      return {
        success: false,
        objectiveId: objective.id,
        isComplete: false,
        progress: objective.progress,
        error: 'Target position or area not specified',
      };
    }

    if (!this.gameState) {
      return {
        success: false,
        objectiveId: objective.id,
        isComplete: false,
        progress: objective.progress,
        error: 'Game state not available',
      };
    }

    // Check if any player unit has reached the target
    const playerUnits = this.gameState.turnOrder.filter(unit => unit.faction === 'player');
    let hasReached = false;

    for (const unit of playerUnits) {
      if (targetData.targetPosition) {
        // Check single position
        if (
          unit.position.x === targetData.targetPosition.x &&
          unit.position.y === targetData.targetPosition.y
        ) {
          hasReached = true;
          break;
        }
      } else if (targetData.targetArea) {
        // Check area
        for (const pos of targetData.targetArea) {
          if (unit.position.x === pos.x && unit.position.y === pos.y) {
            hasReached = true;
            break;
          }
        }
        if (hasReached) break;
      }
    }

    const progress: ObjectiveProgress = {
      current: hasReached ? 1 : 0,
      target: 1,
      percentage: hasReached ? 100 : 0,
    };

    return {
      success: true,
      objectiveId: objective.id,
      isComplete: hasReached,
      progress,
      message: hasReached ? 'Position reached' : 'Position not yet reached',
    };
  }

  /**
   * Evaluate survive turns objective
   * @param objective - Objective to evaluate
   * @returns Evaluation result
   */
  private evaluateSurviveTurnsObjective(objective: Objective): ObjectiveEvaluationResult {
    const targetData = objective.targetData;
    if (!targetData?.surviveTurns || targetData.surviveTurns <= 0) {
      return {
        success: false,
        objectiveId: objective.id,
        isComplete: false,
        progress: objective.progress,
        error: 'Survive turns not specified or invalid',
      };
    }

    const progress: ObjectiveProgress = {
      current: this.currentTurn,
      target: targetData.surviveTurns,
      percentage: Math.min(100, (this.currentTurn / targetData.surviveTurns) * 100),
    };

    return {
      success: true,
      objectiveId: objective.id,
      isComplete: this.currentTurn >= targetData.surviveTurns,
      progress,
      message: `Turn ${this.currentTurn}/${targetData.surviveTurns}`,
    };
  }

  /**
   * Evaluate protect unit objective
   * @param objective - Objective to evaluate
   * @returns Evaluation result
   */
  private evaluateProtectUnitObjective(objective: Objective): ObjectiveEvaluationResult {
    const targetData = objective.targetData;
    if (!targetData?.protectUnitId) {
      return {
        success: false,
        objectiveId: objective.id,
        isComplete: false,
        progress: objective.progress,
        error: 'Protected unit ID not specified',
      };
    }

    if (!this.gameState) {
      return {
        success: false,
        objectiveId: objective.id,
        isComplete: false,
        progress: objective.progress,
        error: 'Game state not available',
      };
    }

    // Check if protected unit is still alive
    const protectedUnit = this.gameState.turnOrder.find(
      unit => unit.id === targetData.protectUnitId
    );
    const isAlive = protectedUnit && protectedUnit.currentHP > 0;
    const isDefeated = this.defeatedUnits.has(targetData.protectUnitId);

    const progress: ObjectiveProgress = {
      current: isAlive && !isDefeated ? 1 : 0,
      target: 1,
      percentage: isAlive && !isDefeated ? 100 : 0,
    };

    return {
      success: true,
      objectiveId: objective.id,
      isComplete: false, // This objective is never "complete" until stage ends
      progress,
      message: isAlive && !isDefeated ? 'Unit protected' : 'Unit defeated (objective failed)',
    };
  }

  /**
   * Evaluate collect items objective
   * @param objective - Objective to evaluate
   * @returns Evaluation result
   */
  private evaluateCollectItemsObjective(objective: Objective): ObjectiveEvaluationResult {
    const targetData = objective.targetData;
    if (!targetData?.itemIds || targetData.itemIds.length === 0) {
      return {
        success: false,
        objectiveId: objective.id,
        isComplete: false,
        progress: objective.progress,
        error: 'Item IDs not specified',
      };
    }

    // TODO: Implement item collection tracking when inventory system is available
    // For now, return not implemented
    return {
      success: false,
      objectiveId: objective.id,
      isComplete: false,
      progress: objective.progress,
      error: 'Item collection tracking not yet implemented',
    };
  }

  /**
   * Evaluate custom objective
   * @param objective - Objective to evaluate
   * @returns Evaluation result
   */
  private evaluateCustomObjective(objective: Objective): ObjectiveEvaluationResult {
    const targetData = objective.targetData;
    if (!targetData?.customCondition) {
      return {
        success: false,
        objectiveId: objective.id,
        isComplete: false,
        progress: objective.progress,
        error: 'Custom condition function not specified',
      };
    }

    if (!this.gameState) {
      return {
        success: false,
        objectiveId: objective.id,
        isComplete: false,
        progress: objective.progress,
        error: 'Game state not available',
      };
    }

    try {
      const isComplete = targetData.customCondition(this.gameState);
      const progress: ObjectiveProgress = {
        current: isComplete ? 1 : 0,
        target: 1,
        percentage: isComplete ? 100 : 0,
      };

      return {
        success: true,
        objectiveId: objective.id,
        isComplete,
        progress,
        message: isComplete ? 'Custom condition met' : 'Custom condition not met',
      };
    } catch (error) {
      return {
        success: false,
        objectiveId: objective.id,
        isComplete: false,
        progress: objective.progress,
        error: `Custom condition evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Update defeat-related objectives
   * @param event - Unit defeated event
   */
  private updateDefeatObjectives(event: UnitDefeatedEvent): void {
    try {
      const objectives = this.objectiveManager.getAllObjectives();

      for (const objective of objectives) {
        if (objective.isComplete) continue;

        // Update boss defeat objectives
        if (
          objective.type === ObjectiveType.DEFEAT_BOSS &&
          event.isBoss &&
          objective.targetData?.bossId === event.unit.id
        ) {
          this.objectiveManager.updateProgress(objective.id, {
            current: 1,
            target: 1,
            percentage: 100,
          });
        }

        // Update defeat all enemies objectives
        if (objective.type === ObjectiveType.DEFEAT_ALL_ENEMIES && event.unit.faction === 'enemy') {
          const result = this.evaluateDefeatAllEnemiesObjective(objective);
          if (result.success) {
            this.objectiveManager.updateProgress(objective.id, result.progress);
          }
        }
      }
    } catch (error) {
      this.log('Error updating defeat objectives', error);
    }
  }

  /**
   * Update position-related objectives
   * @param event - Position reached event
   */
  private updatePositionObjectives(event: PositionReachedEvent): void {
    try {
      const objectives = this.objectiveManager.getObjectivesByType(ObjectiveType.REACH_POSITION);

      for (const objective of objectives) {
        if (objective.isComplete) continue;

        const result = this.evaluateReachPositionObjective(objective);
        if (result.success) {
          this.objectiveManager.updateProgress(objective.id, result.progress);
        }
      }
    } catch (error) {
      this.log('Error updating position objectives', error);
    }
  }

  /**
   * Update turn-related objectives
   * @param event - Turn advance event
   */
  private updateTurnObjectives(event: TurnAdvanceEvent): void {
    try {
      const objectives = this.objectiveManager.getObjectivesByType(ObjectiveType.SURVIVE_TURNS);

      for (const objective of objectives) {
        if (objective.isComplete) continue;

        const result = this.evaluateSurviveTurnsObjective(objective);
        if (result.success) {
          this.objectiveManager.updateProgress(objective.id, result.progress);
        }
      }
    } catch (error) {
      this.log('Error updating turn objectives', error);
    }
  }

  /**
   * Get defeated units count
   * @returns Number of defeated units
   */
  public getDefeatedUnitsCount(): number {
    return this.defeatedUnits.size;
  }

  /**
   * Get defeated units
   * @returns Set of defeated unit IDs
   */
  public getDefeatedUnits(): Set<string> {
    return new Set(this.defeatedUnits);
  }

  /**
   * Check if a unit is defeated
   * @param unitId - Unit ID to check
   * @returns True if unit is defeated
   */
  public isUnitDefeated(unitId: string): boolean {
    return this.defeatedUnits.has(unitId);
  }

  /**
   * Get reached positions for a unit
   * @param unitId - Unit ID
   * @returns Array of reached positions
   */
  public getReachedPositions(unitId: string): Position[] {
    return this.reachedPositions.get(unitId) || [];
  }

  /**
   * Get current turn number
   * @returns Current turn number
   */
  public getCurrentTurn(): number {
    return this.currentTurn;
  }

  /**
   * Reset tracking state
   */
  public reset(): void {
    this.defeatedUnits.clear();
    this.reachedPositions.clear();
    this.currentTurn = 1;

    this.emit('tracker-reset', {
      timestamp: Date.now(),
    });

    this.log('ObjectiveTracker reset');
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen to scene events
    this.scene.events.on('shutdown', this.onSceneShutdown.bind(this));
    this.scene.events.on('destroy', this.onSceneDestroy.bind(this));
  }

  /**
   * Handle scene shutdown
   */
  private onSceneShutdown(): void {
    this.emit('objective-tracker-shutdown');
  }

  /**
   * Handle scene destroy
   */
  private onSceneDestroy(): void {
    this.destroy();
  }

  /**
   * Log message with objective tracker prefix
   * @param message - Message to log
   * @param data - Additional data to log
   */
  private log(message: string, data?: any): void {
    if (this.config.enableDebugLogs) {
      if (data) {
        console.log(`[ObjectiveTracker] ${message}`, data);
      } else {
        console.log(`[ObjectiveTracker] ${message}`);
      }
    }
  }

  /**
   * Cleanup and destroy objective tracker
   */
  public destroy(): void {
    // Clear tracking state
    this.defeatedUnits.clear();
    this.reachedPositions.clear();

    // Emit destroyed event
    this.emit('objective-tracker-destroyed');

    this.log('ObjectiveTracker destroyed');
  }
}
