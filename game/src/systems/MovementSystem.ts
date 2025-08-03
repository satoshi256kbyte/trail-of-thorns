/**
 * MovementSystem - Central coordinator for character movement
 *
 * This class serves as the main controller for the character movement system,
 * coordinating between MovementCalculator, PathfindingService, MovementRenderer,
 * and MovementExecutor to provide a complete movement experience.
 */

import { Unit, Position, MapData } from '../types/gameplay';
import { MovementState, MovementError, MovementErrorDetails, TerrainCost } from '../types/movement';
import { MovementCalculator } from './MovementCalculator';
import { PathfindingService } from './PathfindingService';
import { MovementRenderer } from '../rendering/MovementRenderer';
import { MovementExecutor, MovementExecutionResult } from './MovementExecutor';
import { PositionUtils } from '../types/movement';
import {
  MovementErrorHandler,
  MovementNotification,
  MovementRecoveryOptions,
} from '../utils/MovementErrorHandler';
import { MovementDebugManager } from '../debug/MovementDebugManager';
import { GameConfig } from '../config/GameConfig';

/**
 * Movement system configuration
 */
export interface MovementSystemConfig {
  enableVisualFeedback: boolean;
  enablePathPreview: boolean;
  enableMovementAnimation: boolean;
  terrainCosts?: TerrainCost;
}

/**
 * Movement validation result
 */
export interface MovementValidationResult {
  valid: boolean;
  error?: MovementError;
  message?: string;
  details?: MovementErrorDetails;
}

/**
 * Movement execution options
 */
export interface MovementExecutionOptions {
  showPath?: boolean;
  animate?: boolean;
  onComplete?: (character: Unit, result: MovementExecutionResult) => void;
  onPathUpdate?: (path: Position[]) => void;
}

/**
 * Default movement system configuration
 */
const DEFAULT_CONFIG: MovementSystemConfig = {
  enableVisualFeedback: true,
  enablePathPreview: true,
  enableMovementAnimation: true,
};

/**
 * MovementSystem coordinates all movement-related subsystems
 */
export class MovementSystem {
  private scene: Phaser.Scene;
  private config: MovementSystemConfig;
  private mapData: MapData | null = null;
  private eventEmitter?: Phaser.Events.EventEmitter;
  private gameStateManager?: any; // GameStateManager reference for turn integration

  // Movement subsystems
  private movementCalculator: MovementCalculator;
  private pathfindingService: PathfindingService;
  private movementRenderer: MovementRenderer;
  private movementExecutor: MovementExecutor;
  private errorHandler: MovementErrorHandler;
  private debugManager?: MovementDebugManager;

  // Current movement state
  private currentState: MovementState;
  private occupiedPositions: Position[] = [];
  private allUnits: Unit[] = [];

  // Event callbacks
  private onMovementComplete?: (character: Unit, result: MovementExecutionResult) => void;
  private onSelectionChange?: (character: Unit | null) => void;
  private onMovementStateChange?: (state: MovementState) => void;

  /**
   * Creates a new MovementSystem instance
   * @param scene - The Phaser scene to operate in
   * @param config - Optional configuration overrides
   * @param eventEmitter - Optional event emitter for system events
   */
  constructor(
    scene: Phaser.Scene,
    config?: Partial<MovementSystemConfig>,
    eventEmitter?: Phaser.Events.EventEmitter
  ) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventEmitter = eventEmitter;

    // Initialize subsystems
    this.movementCalculator = new MovementCalculator(this.config.terrainCosts);
    this.pathfindingService = new PathfindingService(this.config.terrainCosts);
    this.movementRenderer = new MovementRenderer(scene);
    this.movementExecutor = new MovementExecutor(scene);
    this.errorHandler = new MovementErrorHandler();

    // Initialize debug manager if in development mode
    const gameConfig = new GameConfig();
    const movementSystemConfig = gameConfig.getMovementSystemConfig();
    if (movementSystemConfig.enableMovementDebug) {
      this.debugManager = new MovementDebugManager(scene, movementSystemConfig);
      this.debugManager.setMovementSystem(this);
    }

    // Set up error handler callbacks
    this.setupErrorHandlerCallbacks();

    // Initialize movement state
    this.currentState = {
      selectedCharacter: null,
      movementRange: [],
      currentPath: [],
      isMoving: false,
      movementMode: 'none',
    };
  }

  /**
   * Set the GameStateManager for turn-based integration
   * @param gameStateManager - GameStateManager instance
   */
  public setGameStateManager(gameStateManager: any): void {
    this.gameStateManager = gameStateManager;
  }

  /**
   * Initialize the movement system with map data
   * @param mapData - Map data for movement calculations
   */
  public initialize(mapData: MapData): void {
    this.mapData = mapData;

    // Pass map data to subsystems
    this.movementRenderer.setMapData(mapData);
    this.movementExecutor.setMapData(mapData);
  }

  /**
   * Update the list of all units for collision detection
   * @param units - Array of all units on the map
   */
  public updateUnits(units: Unit[]): void {
    this.allUnits = [...units];
    this.updateOccupiedPositions();
  }

  /**
   * Select a character for movement with validation
   * @param character - Character to select for movement
   * @param allowDeselection - Whether to allow deselecting the same character
   * @returns Validation result indicating success or failure
   */
  public selectCharacterForMovement(
    character: Unit,
    allowDeselection: boolean = true
  ): MovementValidationResult {
    // Validate character selection first (this handles null/invalid characters)
    const validation = this.validateCharacterSelection(character);
    if (!validation.valid) {
      // Handle error with error handler
      if (validation.error && validation.message) {
        this.errorHandler.handleCharacterSelectionError(
          character,
          validation.error,
          validation.message
        );
      }
      return validation;
    }

    // Check if clicking on the same character (deselection logic)
    if (allowDeselection && this.currentState.selectedCharacter === character) {
      this.deselectCharacter();
      return { valid: true };
    }

    // Switch to new character (clear previous selection)
    this.switchToCharacter(character);

    return { valid: true };
  }

  /**
   * Show movement range for the specified character
   * @param character - Character to show movement range for
   */
  public showMovementRange(character: Unit): void {
    if (!this.mapData) {
      console.warn('MovementSystem: Map data not initialized');
      return;
    }

    // Calculate movement range
    const movementRange = this.movementCalculator.calculateMovementRange(
      character,
      this.mapData,
      this.occupiedPositions
    );

    // Update state
    this.currentState.movementRange = movementRange;

    // Show visual feedback if enabled
    if (this.config.enableVisualFeedback) {
      this.movementRenderer.highlightMovementRange(movementRange, character);
    }

    // Notify state change
    this.notifyStateChange();
  }

  /**
   * Show movement path to the specified destination
   * @param destination - Destination position
   * @param options - Optional path display options
   */
  public showMovementPath(destination: Position, options?: { showPreview?: boolean }): void {
    if (!this.currentState.selectedCharacter || !this.mapData) {
      return;
    }

    const character = this.currentState.selectedCharacter;

    // Check if destination is reachable
    if (!this.isPositionReachable(character, destination)) {
      this.clearPath();
      return;
    }

    // Find path to destination
    const path = this.pathfindingService.findPath(
      character.position,
      destination,
      this.mapData,
      character.stats.movement,
      this.occupiedPositions
    );

    if (path.length === 0) {
      this.clearPath();
      return;
    }

    // Update state
    this.currentState.currentPath = path;

    // Show visual feedback if enabled
    if (this.config.enablePathPreview && options?.showPreview !== false) {
      this.movementRenderer.showMovementPath(path);
    }

    // Notify state change
    this.notifyStateChange();
  }

  /**
   * Execute movement to the specified destination
   * @param character - Character to move
   * @param destination - Destination position
   * @param options - Optional execution options
   * @returns Promise that resolves when movement is complete
   */
  public async executeMovement(
    character: Unit,
    destination: Position,
    options?: MovementExecutionOptions
  ): Promise<MovementExecutionResult> {
    // Validate movement execution
    const validation = this.validateMovementExecution(character, destination);
    if (!validation.valid) {
      // Handle error with error handler
      if (validation.error && validation.message) {
        this.errorHandler.handleMovementExecutionError(
          character,
          destination,
          validation.error,
          validation.message
        );
      }

      const result: MovementExecutionResult = {
        success: false,
        error: validation.error,
        message: validation.message,
      };

      if (options?.onComplete) {
        options.onComplete(character, result);
      }

      return result;
    }

    // Set movement state
    this.currentState.isMoving = true;
    this.currentState.movementMode = 'moving';
    this.notifyStateChange();

    try {
      // Find path to destination
      const path = this.pathfindingService.findPath(
        character.position,
        destination,
        this.mapData!,
        character.stats.movement,
        this.occupiedPositions
      );

      if (path.length === 0) {
        throw new Error('No valid path found to destination');
      }

      // Update current path
      this.currentState.currentPath = path;

      // Show path if requested
      if (options?.showPath !== false && this.config.enablePathPreview) {
        this.movementRenderer.showMovementPath(path);
      }

      // Notify path update
      if (options?.onPathUpdate) {
        options.onPathUpdate(path);
      }

      // Execute movement animation if enabled
      let result: MovementExecutionResult;
      if (this.config.enableMovementAnimation && options?.animate !== false) {
        result = await this.movementExecutor.animateMovement(character, path);
      } else {
        // Instant movement without animation
        character.position = PositionUtils.clone(destination);
        character.hasMoved = true;
        result = {
          success: true,
          finalPosition: destination,
        };
      }

      // Update occupied positions
      this.updateOccupiedPositions();

      // Mark character as moved in GameStateManager
      if (this.gameStateManager && typeof this.gameStateManager.markCharacterMoved === 'function') {
        const markResult = this.gameStateManager.markCharacterMoved(character);
        if (!markResult.success) {
          console.warn(
            'Failed to mark character as moved in GameStateManager:',
            markResult.message
          );
        }
      }

      // Clear movement state
      this.clearMovementState();

      // Show success feedback
      if (result.success && result.finalPosition) {
        this.errorHandler.showMovementSuccess(character, path, result.finalPosition);
      }

      // Call completion callbacks
      if (options?.onComplete) {
        options.onComplete(character, result);
      }

      if (this.onMovementComplete) {
        this.onMovementComplete(character, result);
      }

      return result;
    } catch (error) {
      // Handle movement execution error
      const errorMessage = error instanceof Error ? error.message : 'Movement execution failed';

      // Handle with error handler
      this.errorHandler.handleMovementInterruption(
        character,
        character.position,
        destination,
        errorMessage
      );

      const result: MovementExecutionResult = {
        success: false,
        error: MovementError.MOVEMENT_IN_PROGRESS,
        message: errorMessage,
        finalPosition: character.position,
      };

      // Clear movement state
      this.clearMovementState();

      // Call completion callbacks
      if (options?.onComplete) {
        options.onComplete(character, result);
      }

      if (this.onMovementComplete) {
        this.onMovementComplete(character, result);
      }

      return result;
    }
  }

  /**
   * Deselect the currently selected character
   */
  public deselectCharacter(): void {
    if (!this.currentState.selectedCharacter) {
      return; // No character selected
    }

    const previousCharacter = this.currentState.selectedCharacter;

    // Clear selection and visual feedback
    this.clearSelection();

    // Notify selection change
    if (this.onSelectionChange) {
      this.onSelectionChange(null);
    }

    // Notify state change
    this.notifyStateChange();

    this.eventEmitter?.emit('character-deselected', {
      character: previousCharacter,
      timestamp: Date.now(),
    });
  }

  /**
   * Switch to a different character for movement
   * @param character - New character to select
   */
  public switchToCharacter(character: Unit): void {
    const previousCharacter = this.currentState.selectedCharacter;

    // Clear any existing selection
    this.clearSelection();

    // Set new selection
    this.currentState.selectedCharacter = character;
    this.currentState.movementMode = 'selecting';

    // Calculate and show movement range
    this.showMovementRange(character);

    // Notify selection change
    if (this.onSelectionChange) {
      this.onSelectionChange(character);
    }

    // Notify state change
    this.notifyStateChange();

    this.eventEmitter?.emit('character-switched', {
      previousCharacter,
      newCharacter: character,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle right-click cancellation
   * This method is designed to be called by input handlers when right-click is detected
   */
  public handleRightClickCancellation(): void {
    // Cancel any active movement animation
    if (this.currentState.selectedCharacter && this.currentState.isMoving) {
      this.movementExecutor.cancelMovement(this.currentState.selectedCharacter);
    }

    // Clear selection and movement state
    this.cancelMovement();

    this.eventEmitter?.emit('movement-cancelled-by-right-click', {
      timestamp: Date.now(),
    });
  }

  /**
   * Cancel current movement selection or execution
   */
  public cancelMovement(): void {
    // Cancel any active movement animation
    if (this.currentState.selectedCharacter) {
      this.movementExecutor.cancelMovement(this.currentState.selectedCharacter);
    }

    // Clear selection and visual feedback
    this.clearSelection();
    this.clearMovementState();

    // Notify selection change
    if (this.onSelectionChange) {
      this.onSelectionChange(null);
    }

    // Notify state change
    this.notifyStateChange();

    this.eventEmitter?.emit('movement-cancelled', {
      timestamp: Date.now(),
    });
  }

  /**
   * Check if a character can move (validation without selection)
   * @param character - Character to check
   * @returns True if character can move, false otherwise
   */
  public canCharacterMove(character: Unit): boolean {
    // Use GameStateManager validation if available
    if (this.gameStateManager && typeof this.gameStateManager.canCharacterMove === 'function') {
      return this.gameStateManager.canCharacterMove(character);
    }

    // Fallback to local validation
    const validation = this.validateCharacterSelection(character);
    return validation.valid;
  }

  /**
   * Check if a position is reachable by the currently selected character
   * @param character - Character to check movement for
   * @param position - Position to check
   * @returns True if position is reachable, false otherwise
   */
  public isPositionReachable(character: Unit, position: Position): boolean {
    if (!this.mapData) {
      return false;
    }

    return this.movementCalculator.isPositionReachable(
      character,
      position,
      this.mapData,
      this.occupiedPositions
    );
  }

  /**
   * Get the movement cost to reach a specific position
   * @param character - Character to calculate cost for
   * @param destination - Destination position
   * @returns Movement cost or -1 if unreachable
   */
  public getMovementCostToPosition(character: Unit, destination: Position): number {
    if (!this.mapData) {
      return -1;
    }

    return this.movementCalculator.getMovementCostToPosition(
      character,
      destination,
      this.mapData,
      this.occupiedPositions
    );
  }

  /**
   * Get current movement state
   * @returns Current movement state
   */
  public getCurrentState(): MovementState {
    return { ...this.currentState };
  }

  /**
   * Get currently selected character
   * @returns Selected character or null
   */
  public getSelectedCharacter(): Unit | null {
    return this.currentState.selectedCharacter;
  }

  /**
   * Check if any character is currently moving
   * @returns True if movement is in progress, false otherwise
   */
  public isMovementInProgress(): boolean {
    return this.currentState.isMoving;
  }

  /**
   * Check if a specific character is currently selected
   * @param character - Character to check
   * @returns True if the character is selected, false otherwise
   */
  public isCharacterSelected(character: Unit): boolean {
    return this.currentState.selectedCharacter === character;
  }

  /**
   * Set event callback for movement completion
   * @param callback - Callback function
   */
  public setOnMovementComplete(
    callback: (character: Unit, result: MovementExecutionResult) => void
  ): void {
    this.onMovementComplete = callback;
  }

  /**
   * Set event callback for selection changes
   * @param callback - Callback function
   */
  public setOnSelectionChange(callback: (character: Unit | null) => void): void {
    this.onSelectionChange = callback;
  }

  /**
   * Set event callback for movement state changes
   * @param callback - Callback function
   */
  public setOnMovementStateChange(callback: (state: MovementState) => void): void {
    this.onMovementStateChange = callback;
  }

  /**
   * Set event emitter for system events
   * @param eventEmitter - Event emitter instance
   */
  public setEventEmitter(eventEmitter: Phaser.Events.EventEmitter): void {
    this.eventEmitter = eventEmitter;
  }

  /**
   * Update movement system configuration
   * @param config - New configuration values
   */
  public updateConfig(config: Partial<MovementSystemConfig>): void {
    this.config = { ...this.config, ...config };

    // Update subsystem configurations if terrain costs changed
    if (config.terrainCosts) {
      this.movementCalculator.setTerrainCosts(config.terrainCosts);
      this.pathfindingService.setTerrainCosts(config.terrainCosts);
    }
  }

  /**
   * Get the movement error handler for external configuration
   * @returns Movement error handler instance
   */
  public getErrorHandler(): MovementErrorHandler {
    return this.errorHandler;
  }

  /**
   * Set up error handler callbacks for visual feedback and recovery
   */
  private setupErrorHandlerCallbacks(): void {
    // Handle notifications
    this.errorHandler.onNotification((notification: MovementNotification) => {
      this.handleMovementNotification(notification);
    });

    // Handle visual feedback
    this.errorHandler.onVisualFeedback((error: MovementError, details: MovementErrorDetails) => {
      this.handleMovementVisualFeedback(error, details);
    });

    // Handle recovery actions
    this.errorHandler.onRecovery((options: MovementRecoveryOptions) => {
      this.handleMovementRecovery(options);
    });
  }

  /**
   * Handle movement notification display
   * @param notification - Notification to display
   */
  private handleMovementNotification(notification: MovementNotification): void {
    // Emit event for UI system to handle
    this.eventEmitter?.emit('movement-notification', notification);

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[${notification.type.toUpperCase()}] ${notification.title}: ${notification.message}`
      );
    }
  }

  /**
   * Handle movement visual feedback
   * @param error - Movement error type
   * @param details - Error details
   */
  private handleMovementVisualFeedback(error: MovementError, details: MovementErrorDetails): void {
    if (!this.config.enableVisualFeedback) {
      return;
    }

    switch (error) {
      case MovementError.DESTINATION_OCCUPIED:
        if (details.position) {
          this.movementRenderer.showMovementError(details.position, 'occupied', 2000);
        }
        break;

      case MovementError.DESTINATION_UNREACHABLE:
        if (details.position) {
          this.movementRenderer.showMovementError(details.position, 'unreachable', 2000);
          this.showAlternativeMovementOptions(details.character, details.position);
        }
        break;

      case MovementError.PATH_BLOCKED:
        if (details.position) {
          this.movementRenderer.showMovementError(details.position, 'blocked', 2000);
        }
        break;

      case MovementError.CHARACTER_ALREADY_MOVED:
        if (details.character) {
          this.movementRenderer.showCharacterSelectionError(
            details.character,
            'already_moved',
            2000
          );
        }
        break;

      case MovementError.INVALID_CHARACTER_SELECTION:
        if (details.character) {
          this.movementRenderer.showCharacterSelectionError(details.character, 'invalid', 2000);
        }
        break;

      case MovementError.MOVEMENT_IN_PROGRESS:
        // Show warning on currently moving character if available
        if (this.currentState.selectedCharacter) {
          this.movementRenderer.showMovementWarning(
            this.currentState.selectedCharacter.position,
            'suboptimal',
            1500
          );
        }
        break;
    }
  }

  /**
   * Handle movement recovery actions
   * @param options - Recovery options
   */
  private handleMovementRecovery(options: MovementRecoveryOptions): void {
    if (options.clearSelection) {
      this.clearSelection();
    }

    if (options.clearHighlights) {
      this.movementRenderer.clearHighlights();
    }

    if (options.resetMovementState) {
      this.clearMovementState();
    }

    // Notify state change after recovery
    this.notifyStateChange();
  }

  /**
   * Show alternative movement options when primary destination fails
   * @param character - Character attempting to move
   * @param blockedDestination - Originally requested destination
   */
  private showAlternativeMovementOptions(
    character: Unit | undefined,
    blockedDestination: Position
  ): void {
    if (!character || !this.mapData) {
      return;
    }

    // Calculate alternative positions within movement range
    const movementRange = this.movementCalculator.calculateMovementRange(
      character,
      this.mapData,
      this.occupiedPositions
    );

    // Find positions adjacent to the blocked destination
    const adjacentPositions = PositionUtils.getAdjacentPositions(blockedDestination);
    const alternatives = adjacentPositions.filter(pos =>
      movementRange.some(rangePos => PositionUtils.equals(pos, rangePos))
    );

    if (alternatives.length > 0) {
      this.movementRenderer.showAlternativePositions(alternatives, 4000);
      this.errorHandler.showMovementAlternatives(character, blockedDestination, alternatives);
    }
  }

  /**
   * Validate character selection for movement
   * @param character - Character to validate
   * @returns Validation result
   */
  private validateCharacterSelection(character: Unit): MovementValidationResult {
    if (!character) {
      return {
        valid: false,
        error: MovementError.INVALID_CHARACTER_SELECTION,
        message: 'Character is null or undefined',
      };
    }

    // Use GameStateManager validation if available (includes turn-based checks)
    if (this.gameStateManager && typeof this.gameStateManager.canCharacterMove === 'function') {
      const canMove = this.gameStateManager.canCharacterMove(character);
      if (!canMove) {
        // Determine specific error based on character state
        if (character.hasMoved) {
          return {
            valid: false,
            error: MovementError.CHARACTER_ALREADY_MOVED,
            message: 'Character has already moved this turn',
            details: {
              error: MovementError.CHARACTER_ALREADY_MOVED,
              message: 'Character has already moved this turn',
              character: character,
            },
          };
        }

        if (character.currentHP <= 0) {
          return {
            valid: false,
            error: MovementError.INVALID_CHARACTER_SELECTION,
            message: 'Character is defeated and cannot move',
          };
        }

        // Check turn state
        const isPlayerTurn =
          this.gameStateManager.isPlayerTurn && this.gameStateManager.isPlayerTurn();
        if (character.faction === 'player' && !isPlayerTurn) {
          return {
            valid: false,
            error: MovementError.INVALID_ACTION,
            message: 'Cannot move player character during enemy turn',
          };
        }

        if (character.faction === 'enemy' && isPlayerTurn) {
          return {
            valid: false,
            error: MovementError.INVALID_ACTION,
            message: 'Cannot move enemy character during player turn',
          };
        }

        return {
          valid: false,
          error: MovementError.INVALID_ACTION,
          message: 'Character cannot move based on current game state',
        };
      }
    }

    // Validate character structure
    if (!character.stats || typeof character.stats.movement !== 'number') {
      return {
        valid: false,
        error: MovementError.INVALID_CHARACTER_SELECTION,
        message: 'Character has invalid stats structure',
      };
    }

    if (!this.mapData) {
      return {
        valid: false,
        error: MovementError.INVALID_POSITION,
        message: 'Map data not initialized',
      };
    }

    if (character.stats.movement <= 0) {
      return {
        valid: false,
        error: MovementError.INSUFFICIENT_MOVEMENT_POINTS,
        message: 'Character has no movement points',
      };
    }

    if (this.currentState.isMoving) {
      return {
        valid: false,
        error: MovementError.MOVEMENT_IN_PROGRESS,
        message: 'Another character is currently moving',
      };
    }

    return { valid: true };
  }

  /**
   * Validate movement execution
   * @param character - Character to move
   * @param destination - Destination position
   * @returns Validation result
   */
  private validateMovementExecution(
    character: Unit,
    destination: Position
  ): MovementValidationResult {
    // First validate character selection
    const characterValidation = this.validateCharacterSelection(character);
    if (!characterValidation.valid) {
      return characterValidation;
    }

    if (!this.mapData) {
      return {
        valid: false,
        error: MovementError.INVALID_POSITION,
        message: 'Map data not initialized',
      };
    }

    // Validate destination position
    if (!PositionUtils.isValidPosition(destination, this.mapData.width, this.mapData.height)) {
      return {
        valid: false,
        error: MovementError.INVALID_POSITION,
        message: 'Destination position is outside map bounds',
        details: {
          error: MovementError.INVALID_POSITION,
          message: 'Destination position is outside map bounds',
          position: destination,
        },
      };
    }

    // Check if destination is occupied first (unless it's the character's current position)
    if (!PositionUtils.equals(character.position, destination)) {
      const occupiedSet = new Set(this.occupiedPositions.map(pos => PositionUtils.toKey(pos)));
      if (occupiedSet.has(PositionUtils.toKey(destination))) {
        return {
          valid: false,
          error: MovementError.DESTINATION_OCCUPIED,
          message: 'Destination position is occupied by another unit',
          details: {
            error: MovementError.DESTINATION_OCCUPIED,
            message: 'Destination position is occupied by another unit',
            position: destination,
          },
        };
      }
    }

    // Check if destination is reachable
    if (!this.isPositionReachable(character, destination)) {
      return {
        valid: false,
        error: MovementError.DESTINATION_UNREACHABLE,
        message: 'Destination is not reachable within movement range',
        details: {
          error: MovementError.DESTINATION_UNREACHABLE,
          message: 'Destination is not reachable within movement range',
          position: destination,
          character: character,
        },
      };
    }

    return { valid: true };
  }

  /**
   * Update the list of occupied positions
   */
  private updateOccupiedPositions(): void {
    this.occupiedPositions = this.allUnits
      .filter(unit => unit.currentHP > 0) // Only living units occupy positions
      .map(unit => PositionUtils.clone(unit.position));
  }

  /**
   * Clear current selection and visual feedback
   */
  private clearSelection(): void {
    this.currentState.selectedCharacter = null;
    this.currentState.movementRange = [];
    this.currentState.currentPath = [];
    this.currentState.movementMode = 'none';

    // Clear visual feedback
    if (this.config.enableVisualFeedback) {
      this.movementRenderer.clearHighlights();
    }
  }

  /**
   * Clear movement path display
   */
  private clearPath(): void {
    this.currentState.currentPath = [];

    if (this.config.enablePathPreview) {
      this.movementRenderer.clearPath();
    }
  }

  /**
   * Clear movement state after execution
   */
  private clearMovementState(): void {
    this.currentState.isMoving = false;
    this.currentState.movementMode = 'none';
    this.currentState.currentPath = [];

    // Clear visual feedback
    if (this.config.enableVisualFeedback) {
      this.movementRenderer.clearHighlights();
    }
  }

  /**
   * Notify listeners of state changes
   */
  private notifyStateChange(): void {
    if (this.onMovementStateChange) {
      this.onMovementStateChange({ ...this.currentState });
    }
  }

  /**
   * Destroy the movement system and clean up resources
   */
  public destroy(): void {
    // Cancel any active movements
    this.cancelMovement();

    // Destroy subsystems
    this.movementRenderer.destroy();
    this.movementExecutor.destroy();
    this.errorHandler.destroy();

    // Clear all data
    this.allUnits = [];
    this.occupiedPositions = [];
    this.mapData = null;

    // Clear callbacks
    this.onMovementComplete = undefined;
    this.onSelectionChange = undefined;
    this.onMovementStateChange = undefined;

    // Reset state
    this.currentState = {
      selectedCharacter: null,
      movementRange: [],
      currentPath: [],
      isMoving: false,
      movementMode: 'none',
    };
  }

  // ===== DEBUG METHODS =====

  /**
   * Enable debug mode for movement system
   */
  public enableDebugMode(): void {
    if (this.debugManager) {
      this.debugManager.enableDebugMode();
      console.log('MovementSystem: Debug mode enabled');
    } else {
      console.warn('MovementSystem: Debug manager not available');
    }
  }

  /**
   * Disable debug mode for movement system
   */
  public disableDebugMode(): void {
    if (this.debugManager) {
      this.debugManager.disableDebugMode();
      console.log('MovementSystem: Debug mode disabled');
    }
  }

  /**
   * Toggle debug mode for movement system
   */
  public toggleDebugMode(): void {
    if (this.debugManager) {
      this.debugManager.toggleDebugMode();
    }
  }

  /**
   * Set map data for debugging
   * @param mapData - Map data to use for debugging
   */
  public setMapDataForDebug(mapData: MapData): void {
    if (this.debugManager) {
      this.debugManager.setMapData(mapData);
    }
  }

  /**
   * Update debug manager (should be called from scene update)
   * @param time - Current time
   * @param delta - Time delta
   */
  public updateDebug(time: number, delta: number): void {
    if (this.debugManager) {
      this.debugManager.update(time, delta);
    }
  }

  /**
   * Get debug manager instance
   * @returns Debug manager or undefined if not available
   */
  public getDebugManager(): MovementDebugManager | undefined {
    return this.debugManager;
  }

  /**
   * Get current selected character (for debugging)
   * @returns Currently selected character or null
   */
  public getSelectedCharacter(): Unit | null {
    return this.currentState.selectedCharacter;
  }

  /**
   * Get current movement state (for debugging)
   * @returns Current movement state
   */
  public getMovementState(): MovementState {
    return { ...this.currentState };
  }

  /**
   * Get movement subsystems (for debugging)
   * @returns Object containing all movement subsystems
   */
  public getSubsystems(): {
    calculator: MovementCalculator;
    pathfinding: PathfindingService;
    renderer: MovementRenderer;
    executor: MovementExecutor;
    errorHandler: MovementErrorHandler;
  } {
    return {
      calculator: this.movementCalculator,
      pathfinding: this.pathfindingService,
      renderer: this.movementRenderer,
      executor: this.movementExecutor,
      errorHandler: this.errorHandler,
    };
  }
}
