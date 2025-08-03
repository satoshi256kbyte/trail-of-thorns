/**
 * MovementExecutor - Handles smooth character movement animation
 *
 * This class manages the execution of character movement with smooth animations,
 * including character facing direction updates and movement completion callbacks.
 */

import * as Phaser from 'phaser';
import { Unit, Position, MapData } from '../types/gameplay';
import { MovementAnimationConfig, MovementError } from '../types/movement';
import { PositionUtils } from '../types/movement';

/**
 * Movement execution result
 */
export interface MovementExecutionResult {
  success: boolean;
  error?: MovementError;
  message?: string;
  finalPosition?: Position;
}

/**
 * Movement completion callback function type
 */
export type MovementCompletionCallback = (character: Unit, result: MovementExecutionResult) => void;

/**
 * Character facing direction enumeration
 */
export enum FacingDirection {
  NORTH = 'north',
  EAST = 'east',
  SOUTH = 'south',
  WEST = 'west',
}

/**
 * Movement animation state
 */
interface MovementAnimationState {
  character: Unit;
  path: Position[];
  currentStepIndex: number;
  isAnimating: boolean;
  startTime: number;
  totalDuration: number;
  onComplete?: MovementCompletionCallback;
  onStepComplete?: (stepIndex: number) => void;
}

/**
 * Default movement animation configuration
 */
const DEFAULT_ANIMATION_CONFIG: MovementAnimationConfig = {
  moveSpeed: 200, // pixels per second
  turnSpeed: Math.PI * 2, // radians per second (full rotation per second)
  easing: 'Power2', // Phaser easing function
  stepDelay: 100, // delay between tile movements in milliseconds
};

/**
 * MovementExecutor handles smooth character movement animation
 */
export class MovementExecutor {
  private scene: Phaser.Scene;
  private config: MovementAnimationConfig;
  private mapData: MapData | null = null;

  // Active movement tracking
  private activeMovements = new Map<string, MovementAnimationState>();
  private activeTweens: Phaser.Tweens.Tween[] = [];

  // Movement queue for handling multiple movement requests
  private movementQueue: Array<{
    character: Unit;
    path: Position[];
    callback?: MovementCompletionCallback;
  }> = [];

  private isProcessingQueue = false;

  /**
   * Creates a new MovementExecutor instance
   * @param scene - The Phaser scene to animate in
   * @param config - Optional animation configuration overrides
   */
  constructor(scene: Phaser.Scene, config?: Partial<MovementAnimationConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_ANIMATION_CONFIG, ...config };
  }

  /**
   * Set map data for coordinate calculations
   * @param mapData - Map data containing tile size and dimensions
   */
  public setMapData(mapData: MapData): void {
    this.mapData = mapData;
  }

  /**
   * Animate character movement along a path
   * @param character - Character to animate
   * @param path - Array of positions representing the movement path
   * @param onComplete - Optional callback when movement completes
   * @returns Promise that resolves when movement is complete
   */
  public async animateMovement(
    character: Unit,
    path: Position[],
    onComplete?: MovementCompletionCallback
  ): Promise<MovementExecutionResult> {
    // Validate inputs
    const validation = this.validateMovementInputs(character, path);
    if (!validation.success) {
      const result: MovementExecutionResult = {
        success: false,
        error: validation.error,
        message: validation.message,
      };

      if (onComplete) {
        onComplete(character, result);
      }

      return result;
    }

    // Check if character is already moving
    if (this.isCharacterMoving(character)) {
      const result: MovementExecutionResult = {
        success: false,
        error: MovementError.MOVEMENT_IN_PROGRESS,
        message: 'Character is already moving',
      };

      if (onComplete) {
        onComplete(character, result);
      }

      return result;
    }

    // Add to movement queue
    return new Promise(resolve => {
      this.movementQueue.push({
        character,
        path: [...path],
        callback: (char, result) => {
          if (onComplete) {
            onComplete(char, result);
          }
          resolve(result);
        },
      });

      this.processMovementQueue();
    });
  }

  /**
   * Cancel movement for a specific character
   * @param character - Character to cancel movement for
   * @returns True if movement was cancelled, false if no movement was active
   */
  public cancelMovement(character: Unit): boolean {
    const characterId = character.id;
    const movementState = this.activeMovements.get(characterId);

    if (!movementState) {
      return false;
    }

    // Stop current animation
    this.stopCharacterAnimation(character);

    // Remove from active movements
    this.activeMovements.delete(characterId);

    // Call completion callback with cancellation result
    if (movementState.onComplete) {
      const result: MovementExecutionResult = {
        success: false,
        error: MovementError.MOVEMENT_IN_PROGRESS,
        message: 'Movement was cancelled',
        finalPosition: character.position,
      };

      movementState.onComplete(character, result);
    }

    return true;
  }

  /**
   * Cancel all active movements
   */
  public cancelAllMovements(): void {
    const activeCharacters = Array.from(this.activeMovements.keys());

    activeCharacters.forEach(characterId => {
      const movementState = this.activeMovements.get(characterId);
      if (movementState) {
        this.cancelMovement(movementState.character);
      }
    });

    // Clear movement queue
    this.movementQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Check if a character is currently moving
   * @param character - Character to check
   * @returns True if character is moving, false otherwise
   */
  public isCharacterMoving(character: Unit): boolean {
    return this.activeMovements.has(character.id);
  }

  /**
   * Get the current movement progress for a character
   * @param character - Character to check
   * @returns Movement progress (0-1) or null if not moving
   */
  public getMovementProgress(character: Unit): number | null {
    const movementState = this.activeMovements.get(character.id);

    if (!movementState || !movementState.isAnimating) {
      return null;
    }

    const elapsed = Date.now() - movementState.startTime;
    const progress = Math.min(elapsed / movementState.totalDuration, 1);

    return progress;
  }

  /**
   * Update animation configuration
   * @param config - New configuration values
   */
  public updateConfig(config: Partial<MovementAnimationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current animation configuration
   * @returns Current animation configuration
   */
  public getConfig(): MovementAnimationConfig {
    return { ...this.config };
  }

  /**
   * Process the movement queue
   */
  private async processMovementQueue(): Promise<void> {
    if (this.isProcessingQueue || this.movementQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.movementQueue.length > 0) {
      const movement = this.movementQueue.shift()!;

      // Execute movement (validation happens in executeMovement)
      await this.executeMovement(movement.character, movement.path, movement.callback);
    }

    this.isProcessingQueue = false;
  }

  /**
   * Execute movement for a character
   * @param character - Character to move
   * @param path - Movement path
   * @param callback - Completion callback
   */
  private async executeMovement(
    character: Unit,
    path: Position[],
    callback?: MovementCompletionCallback
  ): Promise<void> {
    if (!this.mapData || !character.sprite) {
      const result: MovementExecutionResult = {
        success: false,
        error: MovementError.INVALID_CHARACTER_SELECTION,
        message: 'Character sprite not available or map data not set',
      };

      if (callback) {
        callback(character, result);
      }
      return;
    }

    // Calculate total animation duration
    const totalDuration = this.calculateMovementDuration(path);

    // Create movement state
    const movementState: MovementAnimationState = {
      character,
      path: [...path],
      currentStepIndex: 0,
      isAnimating: true,
      startTime: Date.now(),
      totalDuration,
      onComplete: callback,
    };

    // Store active movement
    this.activeMovements.set(character.id, movementState);

    try {
      // Execute movement step by step
      await this.animateMovementSteps(movementState);

      // Movement completed successfully
      const result: MovementExecutionResult = {
        success: true,
        finalPosition: path[path.length - 1],
      };

      // Update character position
      character.position = PositionUtils.clone(path[path.length - 1]);
      character.hasMoved = true;

      // Clean up
      this.activeMovements.delete(character.id);

      if (callback) {
        callback(character, result);
      }
    } catch (error) {
      // Movement failed
      const result: MovementExecutionResult = {
        success: false,
        error: MovementError.MOVEMENT_IN_PROGRESS,
        message: error instanceof Error ? error.message : 'Movement animation failed',
        finalPosition: character.position,
      };

      // Clean up
      this.activeMovements.delete(character.id);

      if (callback) {
        callback(character, result);
      }
    }
  }

  /**
   * Animate movement steps for a character
   * @param movementState - Movement state to animate
   */
  private async animateMovementSteps(movementState: MovementAnimationState): Promise<void> {
    const { character, path } = movementState;

    for (let i = 1; i < path.length; i++) {
      const fromPosition = path[i - 1];
      const toPosition = path[i];

      // Update facing direction
      this.updateCharacterFacing(character, fromPosition, toPosition);

      // Animate movement to next position
      await this.animateMovementStep(character, fromPosition, toPosition);

      // Update movement state
      movementState.currentStepIndex = i;

      // Call step completion callback if provided
      if (movementState.onStepComplete) {
        movementState.onStepComplete(i);
      }

      // Add delay between steps if configured
      if (this.config.stepDelay > 0 && i < path.length - 1) {
        await this.delay(this.config.stepDelay);
      }
    }
  }

  /**
   * Animate a single movement step
   * @param character - Character to animate
   * @param from - Starting position
   * @param to - Ending position
   */
  private async animateMovementStep(character: Unit, from: Position, to: Position): Promise<void> {
    if (!this.mapData || !character.sprite) {
      throw new Error('Character sprite or map data not available');
    }

    const fromWorld = this.tileToWorldPosition(from);
    const toWorld = this.tileToWorldPosition(to);

    if (!fromWorld || !toWorld) {
      throw new Error('Invalid tile positions for animation');
    }

    // Calculate animation duration based on distance and speed
    const distance = PositionUtils.euclideanDistance(fromWorld, toWorld);
    const duration = (distance / this.config.moveSpeed) * 1000; // Convert to milliseconds

    return new Promise<void>((resolve, reject) => {
      const tween = this.scene.tweens.add({
        targets: character.sprite,
        x: toWorld.x,
        y: toWorld.y,
        duration: duration,
        ease: this.config.easing,
        onComplete: () => {
          // Remove tween from active list
          const index = this.activeTweens.indexOf(tween);
          if (index > -1) {
            this.activeTweens.splice(index, 1);
          }
          resolve();
        },
        onError: () => {
          reject(new Error('Movement tween failed'));
        },
      });

      this.activeTweens.push(tween);
    });
  }

  /**
   * Update character facing direction based on movement
   * @param character - Character to update
   * @param from - Starting position
   * @param to - Ending position
   */
  private updateCharacterFacing(character: Unit, from: Position, to: Position): void {
    if (!character.sprite) {
      return;
    }

    const direction = this.getMovementDirection(from, to);
    const facingDirection = this.directionToFacing(direction);

    // Update sprite rotation or flip based on facing direction
    this.applyFacingDirection(character.sprite, facingDirection);
  }

  /**
   * Get movement direction between two positions
   * @param from - Starting position
   * @param to - Ending position
   * @returns Direction vector
   */
  private getMovementDirection(from: Position, to: Position): Position {
    return PositionUtils.subtract(to, from);
  }

  /**
   * Convert direction vector to facing direction
   * @param direction - Direction vector
   * @returns Facing direction
   */
  private directionToFacing(direction: Position): FacingDirection {
    if (Math.abs(direction.x) > Math.abs(direction.y)) {
      return direction.x > 0 ? FacingDirection.EAST : FacingDirection.WEST;
    } else {
      return direction.y > 0 ? FacingDirection.SOUTH : FacingDirection.NORTH;
    }
  }

  /**
   * Apply facing direction to character sprite
   * @param sprite - Character sprite
   * @param facing - Facing direction
   */
  private applyFacingDirection(sprite: Phaser.GameObjects.Sprite, facing: FacingDirection): void {
    // Reset any previous transformations
    sprite.setFlipX(false);
    sprite.setRotation(0);

    switch (facing) {
      case FacingDirection.NORTH:
        // Sprite faces up (default orientation assumed to be south)
        sprite.setRotation(Math.PI);
        break;

      case FacingDirection.EAST:
        // Sprite faces right
        sprite.setRotation(-Math.PI / 2);
        break;

      case FacingDirection.SOUTH:
        // Sprite faces down (default orientation)
        break;

      case FacingDirection.WEST:
        // Sprite faces left
        sprite.setRotation(Math.PI / 2);
        break;
    }
  }

  /**
   * Calculate total movement duration for a path
   * @param path - Movement path
   * @returns Total duration in milliseconds
   */
  private calculateMovementDuration(path: Position[]): number {
    if (!this.mapData || path.length < 2) {
      return 0;
    }

    let totalDistance = 0;

    for (let i = 1; i < path.length; i++) {
      const from = this.tileToWorldPosition(path[i - 1]);
      const to = this.tileToWorldPosition(path[i]);

      if (from && to) {
        totalDistance += PositionUtils.euclideanDistance(from, to);
      }
    }

    // Calculate duration based on speed, plus step delays
    const movementDuration = (totalDistance / this.config.moveSpeed) * 1000;
    const delayDuration = (path.length - 2) * this.config.stepDelay; // No delay after last step

    return movementDuration + delayDuration;
  }

  /**
   * Stop animation for a specific character
   * @param character - Character to stop animation for
   */
  private stopCharacterAnimation(character: Unit): void {
    // Find and stop any active tweens for this character
    const characterTweens = this.activeTweens.filter(tween =>
      tween.targets.includes(character.sprite)
    );

    characterTweens.forEach(tween => {
      tween.stop();
      const index = this.activeTweens.indexOf(tween);
      if (index > -1) {
        this.activeTweens.splice(index, 1);
      }
    });
  }

  /**
   * Validate movement inputs
   * @param character - Character to validate
   * @param path - Path to validate
   * @returns Validation result
   */
  private validateMovementInputs(character: Unit, path: Position[]): MovementExecutionResult {
    if (!character) {
      return {
        success: false,
        error: MovementError.INVALID_CHARACTER_SELECTION,
        message: 'Character is null or undefined',
      };
    }

    if (!character.sprite) {
      return {
        success: false,
        error: MovementError.INVALID_CHARACTER_SELECTION,
        message: 'Character sprite is not available',
      };
    }

    if (!path || path.length < 2) {
      return {
        success: false,
        error: MovementError.INVALID_POSITION,
        message: 'Path must contain at least 2 positions',
      };
    }

    if (!this.mapData) {
      return {
        success: false,
        error: MovementError.INVALID_POSITION,
        message: 'Map data not set',
      };
    }

    // Validate that path starts from character's current position
    if (!PositionUtils.equals(path[0], character.position)) {
      return {
        success: false,
        error: MovementError.INVALID_POSITION,
        message: "Path must start from character's current position",
      };
    }

    // Validate that all positions in path are adjacent
    for (let i = 1; i < path.length; i++) {
      const distance = PositionUtils.manhattanDistance(path[i - 1], path[i]);
      if (distance !== 1) {
        return {
          success: false,
          error: MovementError.PATH_BLOCKED,
          message: `Path positions must be adjacent (step ${i})`,
        };
      }
    }

    return { success: true };
  }

  /**
   * Convert tile position to world position
   * @param tilePosition - Tile coordinates
   * @returns World coordinates or null if invalid
   */
  private tileToWorldPosition(tilePosition: Position): Position | null {
    if (!this.mapData) {
      return null;
    }

    return {
      x: tilePosition.x * this.mapData.tileSize + this.mapData.tileSize / 2,
      y: tilePosition.y * this.mapData.tileSize + this.mapData.tileSize / 2,
    };
  }

  /**
   * Create a delay promise
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after the delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.scene.time.delayedCall(ms, resolve);
    });
  }

  /**
   * Destroy the movement executor and clean up resources
   */
  public destroy(): void {
    // Cancel all active movements
    this.cancelAllMovements();

    // Stop all active tweens
    this.activeTweens.forEach(tween => {
      if (tween && !tween.isDestroyed()) {
        tween.destroy();
      }
    });

    // Clear all data structures
    this.activeMovements.clear();
    this.activeTweens = [];
    this.movementQueue = [];

    // Clear references
    this.mapData = null;
    this.isProcessingQueue = false;
  }
}
