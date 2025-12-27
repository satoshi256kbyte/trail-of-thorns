/**
 * ObjectiveManager - Manages stage objectives and tracks their progress
 *
 * This class handles:
 * - Objective registration and management
 * - Progress tracking and updates
 * - Completion status checking
 * - Objective data validation
 * - Error handling for objective operations
 *
 * Implements requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6 from the boss victory system specification
 */

import * as Phaser from 'phaser';
import {
  Objective,
  ObjectiveType,
  ObjectiveProgress,
  ObjectiveTargetData,
} from '../../types/victory';

/**
 * Objective manager configuration
 */
export interface ObjectiveManagerConfig {
  /** Whether to show detailed debug logs */
  enableDebugLogs: boolean;
  /** Whether to validate objectives on registration */
  validateOnRegister: boolean;
  /** Whether to emit events for progress updates */
  emitProgressEvents: boolean;
  /** Whether to auto-complete objectives when target is reached */
  autoComplete: boolean;
}

/**
 * Objective registration result
 */
export interface ObjectiveRegistrationResult {
  success: boolean;
  objectiveId?: string;
  error?: string;
  message?: string;
}

/**
 * Objective update result
 */
export interface ObjectiveUpdateResult {
  success: boolean;
  objectiveId: string;
  previousProgress: ObjectiveProgress;
  newProgress: ObjectiveProgress;
  isComplete: boolean;
  error?: string;
}

/**
 * Objective validation error
 */
export interface ObjectiveValidationError {
  objectiveId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * ObjectiveManager class for managing stage objectives
 */
export class ObjectiveManager extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private config: ObjectiveManagerConfig;
  private objectives: Map<string, Objective> = new Map();
  private completedObjectives: Set<string> = new Set();

  // Default configuration
  private static readonly DEFAULT_CONFIG: ObjectiveManagerConfig = {
    enableDebugLogs: false,
    validateOnRegister: true,
    emitProgressEvents: true,
    autoComplete: true,
  };

  /**
   * Creates a new ObjectiveManager instance
   * @param scene - Phaser scene for events
   * @param config - Objective manager configuration
   */
  constructor(scene: Phaser.Scene, config?: Partial<ObjectiveManagerConfig>) {
    super();

    this.scene = scene;
    this.config = { ...ObjectiveManager.DEFAULT_CONFIG, ...config };

    this.setupEventListeners();
    this.log('ObjectiveManager initialized');
  }

  /**
   * Register a new objective
   * @param objective - Objective to register
   * @returns Registration result
   */
  public registerObjective(objective: Objective): ObjectiveRegistrationResult {
    try {
      // Validate objective if configured
      if (this.config.validateOnRegister) {
        const validationErrors = this.validateObjective(objective);
        if (validationErrors.length > 0) {
          const errorMessages = validationErrors.map(e => e.message).join(', ');
          return {
            success: false,
            error: 'VALIDATION_FAILED',
            message: `Objective validation failed: ${errorMessages}`,
          };
        }
      }

      // Check for duplicate ID
      if (this.objectives.has(objective.id)) {
        return {
          success: false,
          error: 'DUPLICATE_ID',
          message: `Objective with ID '${objective.id}' already exists`,
        };
      }

      // Initialize progress if not set
      if (!objective.progress) {
        objective.progress = {
          current: 0,
          target: 1,
          percentage: 0,
        };
      }

      // Ensure isComplete is set
      if (objective.isComplete === undefined) {
        objective.isComplete = false;
      }

      // Store objective
      this.objectives.set(objective.id, { ...objective });

      // Emit registration event
      this.emit('objective-registered', {
        objective: this.objectives.get(objective.id),
        timestamp: Date.now(),
      });

      this.log(`Objective registered: ${objective.id} (${objective.type})`);

      return {
        success: true,
        objectiveId: objective.id,
        message: `Objective '${objective.id}' registered successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: 'REGISTRATION_ERROR',
        message: `Failed to register objective: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Update objective progress
   * @param objectiveId - ID of the objective to update
   * @param progress - New progress data
   * @returns Update result
   */
  public updateProgress(
    objectiveId: string,
    progress: Partial<ObjectiveProgress>
  ): ObjectiveUpdateResult {
    try {
      // Get objective
      const objective = this.objectives.get(objectiveId);
      if (!objective) {
        return {
          success: false,
          objectiveId,
          previousProgress: { current: 0, target: 0, percentage: 0 },
          newProgress: { current: 0, target: 0, percentage: 0 },
          isComplete: false,
          error: `Objective '${objectiveId}' not found`,
        };
      }

      // Store previous progress
      const previousProgress = { ...objective.progress };

      // Update progress values
      if (progress.current !== undefined) {
        objective.progress.current = Math.max(0, progress.current);
      }
      if (progress.target !== undefined) {
        objective.progress.target = Math.max(1, progress.target);
      }

      // Recalculate percentage
      objective.progress.percentage = Math.min(
        100,
        (objective.progress.current / objective.progress.target) * 100
      );

      // Check for completion
      const wasComplete = objective.isComplete;
      const isNowComplete =
        this.config.autoComplete && objective.progress.current >= objective.progress.target;

      if (isNowComplete && !wasComplete) {
        objective.isComplete = true;
        this.completedObjectives.add(objectiveId);

        // Emit completion event
        this.emit('objective-completed', {
          objective: { ...objective },
          timestamp: Date.now(),
        });

        this.log(`Objective completed: ${objectiveId}`);
      }

      // Emit progress update event
      if (this.config.emitProgressEvents) {
        this.emit('objective-progress-updated', {
          objectiveId,
          previousProgress,
          newProgress: { ...objective.progress },
          isComplete: objective.isComplete,
          timestamp: Date.now(),
        });
      }

      return {
        success: true,
        objectiveId,
        previousProgress,
        newProgress: { ...objective.progress },
        isComplete: objective.isComplete,
      };
    } catch (error) {
      return {
        success: false,
        objectiveId,
        previousProgress: { current: 0, target: 0, percentage: 0 },
        newProgress: { current: 0, target: 0, percentage: 0 },
        isComplete: false,
        error: `Failed to update progress: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Check if an objective is complete
   * @param objectiveId - ID of the objective to check
   * @returns True if objective is complete, false otherwise
   */
  public isObjectiveComplete(objectiveId: string): boolean {
    const objective = this.objectives.get(objectiveId);
    if (!objective) {
      this.log(`Warning: Checking completion of non-existent objective: ${objectiveId}`);
      return false;
    }

    return objective.isComplete;
  }

  /**
   * Check if all required objectives are complete
   * @returns True if all required objectives are complete, false otherwise
   */
  public areAllObjectivesComplete(): boolean {
    const requiredObjectives = Array.from(this.objectives.values()).filter(obj => obj.isRequired);

    if (requiredObjectives.length === 0) {
      this.log('Warning: No required objectives found');
      return false;
    }

    const allComplete = requiredObjectives.every(obj => obj.isComplete);

    if (allComplete) {
      this.log('All required objectives are complete');
    }

    return allComplete;
  }

  /**
   * Get an objective by ID
   * @param objectiveId - ID of the objective to retrieve
   * @returns Objective if found, null otherwise
   */
  public getObjective(objectiveId: string): Objective | null {
    const objective = this.objectives.get(objectiveId);
    return objective ? { ...objective } : null;
  }

  /**
   * Get all objectives
   * @param filterRequired - If true, only return required objectives
   * @returns Array of all objectives
   */
  public getAllObjectives(filterRequired: boolean = false): Objective[] {
    const objectives = Array.from(this.objectives.values());

    if (filterRequired) {
      return objectives.filter(obj => obj.isRequired).map(obj => ({ ...obj }));
    }

    return objectives.map(obj => ({ ...obj }));
  }

  /**
   * Get objectives by type
   * @param type - Objective type to filter by
   * @returns Array of objectives of the specified type
   */
  public getObjectivesByType(type: ObjectiveType): Objective[] {
    return Array.from(this.objectives.values())
      .filter(obj => obj.type === type)
      .map(obj => ({ ...obj }));
  }

  /**
   * Get completed objectives
   * @returns Array of completed objectives
   */
  public getCompletedObjectives(): Objective[] {
    return Array.from(this.objectives.values())
      .filter(obj => obj.isComplete)
      .map(obj => ({ ...obj }));
  }

  /**
   * Get incomplete objectives
   * @returns Array of incomplete objectives
   */
  public getIncompleteObjectives(): Objective[] {
    return Array.from(this.objectives.values())
      .filter(obj => !obj.isComplete)
      .map(obj => ({ ...obj }));
  }

  /**
   * Get objective completion statistics
   * @returns Statistics about objective completion
   */
  public getCompletionStats(): {
    total: number;
    completed: number;
    incomplete: number;
    required: number;
    requiredCompleted: number;
    percentage: number;
  } {
    const all = Array.from(this.objectives.values());
    const completed = all.filter(obj => obj.isComplete);
    const required = all.filter(obj => obj.isRequired);
    const requiredCompleted = required.filter(obj => obj.isComplete);

    return {
      total: all.length,
      completed: completed.length,
      incomplete: all.length - completed.length,
      required: required.length,
      requiredCompleted: requiredCompleted.length,
      percentage: all.length > 0 ? (completed.length / all.length) * 100 : 0,
    };
  }

  /**
   * Manually mark an objective as complete
   * @param objectiveId - ID of the objective to complete
   * @returns True if successful, false otherwise
   */
  public completeObjective(objectiveId: string): boolean {
    const objective = this.objectives.get(objectiveId);
    if (!objective) {
      this.log(`Warning: Cannot complete non-existent objective: ${objectiveId}`);
      return false;
    }

    if (objective.isComplete) {
      this.log(`Warning: Objective already complete: ${objectiveId}`);
      return true;
    }

    // Mark as complete
    objective.isComplete = true;
    objective.progress.current = objective.progress.target;
    objective.progress.percentage = 100;
    this.completedObjectives.add(objectiveId);

    // Emit completion event
    this.emit('objective-completed', {
      objective: { ...objective },
      timestamp: Date.now(),
    });

    this.log(`Objective manually completed: ${objectiveId}`);

    return true;
  }

  /**
   * Reset an objective's progress
   * @param objectiveId - ID of the objective to reset
   * @returns True if successful, false otherwise
   */
  public resetObjective(objectiveId: string): boolean {
    const objective = this.objectives.get(objectiveId);
    if (!objective) {
      this.log(`Warning: Cannot reset non-existent objective: ${objectiveId}`);
      return false;
    }

    // Reset progress
    objective.progress.current = 0;
    objective.progress.percentage = 0;
    objective.isComplete = false;
    this.completedObjectives.delete(objectiveId);

    // Emit reset event
    this.emit('objective-reset', {
      objectiveId,
      timestamp: Date.now(),
    });

    this.log(`Objective reset: ${objectiveId}`);

    return true;
  }

  /**
   * Remove an objective
   * @param objectiveId - ID of the objective to remove
   * @returns True if successful, false otherwise
   */
  public removeObjective(objectiveId: string): boolean {
    if (!this.objectives.has(objectiveId)) {
      this.log(`Warning: Cannot remove non-existent objective: ${objectiveId}`);
      return false;
    }

    this.objectives.delete(objectiveId);
    this.completedObjectives.delete(objectiveId);

    // Emit removal event
    this.emit('objective-removed', {
      objectiveId,
      timestamp: Date.now(),
    });

    this.log(`Objective removed: ${objectiveId}`);

    return true;
  }

  /**
   * Clear all objectives
   */
  public clearAllObjectives(): void {
    const count = this.objectives.size;
    this.objectives.clear();
    this.completedObjectives.clear();

    // Emit clear event
    this.emit('objectives-cleared', {
      count,
      timestamp: Date.now(),
    });

    this.log(`All objectives cleared (${count} objectives)`);
  }

  /**
   * Validate an objective
   * @param objective - Objective to validate
   * @returns Array of validation errors (empty if valid)
   */
  private validateObjective(objective: Objective): ObjectiveValidationError[] {
    const errors: ObjectiveValidationError[] = [];

    // Validate ID
    if (!objective.id || objective.id.trim() === '') {
      errors.push({
        objectiveId: objective.id || 'unknown',
        field: 'id',
        message: 'Objective ID is required',
        severity: 'error',
      });
    }

    // Validate type
    if (!objective.type || !Object.values(ObjectiveType).includes(objective.type)) {
      errors.push({
        objectiveId: objective.id,
        field: 'type',
        message: `Invalid objective type: ${objective.type}`,
        severity: 'error',
      });
    }

    // Validate description
    if (!objective.description || objective.description.trim() === '') {
      errors.push({
        objectiveId: objective.id,
        field: 'description',
        message: 'Objective description is required',
        severity: 'warning',
      });
    }

    // Validate progress
    if (objective.progress) {
      if (objective.progress.target <= 0) {
        errors.push({
          objectiveId: objective.id,
          field: 'progress.target',
          message: 'Progress target must be greater than 0',
          severity: 'error',
        });
      }

      if (objective.progress.current < 0) {
        errors.push({
          objectiveId: objective.id,
          field: 'progress.current',
          message: 'Progress current cannot be negative',
          severity: 'error',
        });
      }
    }

    // Validate type-specific target data
    if (objective.targetData) {
      this.validateTargetData(objective, errors);
    }

    return errors;
  }

  /**
   * Validate objective target data based on type
   * @param objective - Objective to validate
   * @param errors - Array to add errors to
   */
  private validateTargetData(
    objective: Objective,
    errors: ObjectiveValidationError[]
  ): void {
    const targetData = objective.targetData;
    if (!targetData) return;

    switch (objective.type) {
      case ObjectiveType.DEFEAT_BOSS:
        if (!targetData.bossId) {
          errors.push({
            objectiveId: objective.id,
            field: 'targetData.bossId',
            message: 'Boss ID is required for DEFEAT_BOSS objective',
            severity: 'error',
          });
        }
        break;

      case ObjectiveType.REACH_POSITION:
        if (!targetData.targetPosition && !targetData.targetArea) {
          errors.push({
            objectiveId: objective.id,
            field: 'targetData',
            message: 'Target position or area is required for REACH_POSITION objective',
            severity: 'error',
          });
        }
        break;

      case ObjectiveType.SURVIVE_TURNS:
        if (!targetData.surviveTurns || targetData.surviveTurns <= 0) {
          errors.push({
            objectiveId: objective.id,
            field: 'targetData.surviveTurns',
            message: 'Survive turns must be greater than 0',
            severity: 'error',
          });
        }
        break;

      case ObjectiveType.PROTECT_UNIT:
        if (!targetData.protectUnitId) {
          errors.push({
            objectiveId: objective.id,
            field: 'targetData.protectUnitId',
            message: 'Protected unit ID is required for PROTECT_UNIT objective',
            severity: 'error',
          });
        }
        break;

      case ObjectiveType.COLLECT_ITEMS:
        if (!targetData.itemIds || targetData.itemIds.length === 0) {
          errors.push({
            objectiveId: objective.id,
            field: 'targetData.itemIds',
            message: 'Item IDs are required for COLLECT_ITEMS objective',
            severity: 'error',
          });
        }
        break;

      case ObjectiveType.CUSTOM:
        if (!targetData.customCondition) {
          errors.push({
            objectiveId: objective.id,
            field: 'targetData.customCondition',
            message: 'Custom condition function is required for CUSTOM objective',
            severity: 'warning',
          });
        }
        break;
    }
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
    this.emit('objective-manager-shutdown');
  }

  /**
   * Handle scene destroy
   */
  private onSceneDestroy(): void {
    this.destroy();
  }

  /**
   * Log message with objective manager prefix
   * @param message - Message to log
   */
  private log(message: string): void {
    if (this.config.enableDebugLogs) {
      console.log(`[ObjectiveManager] ${message}`);
    }
  }

  /**
   * Cleanup and destroy objective manager
   */
  public destroy(): void {
    // Clear all objectives
    this.objectives.clear();
    this.completedObjectives.clear();

    // Emit destroyed event
    this.emit('objective-manager-destroyed');

    this.log('ObjectiveManager destroyed');
  }
}
