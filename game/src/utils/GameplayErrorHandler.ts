/**
 * Centralized error handling system for SRPG gameplay
 * Provides error recovery mechanisms and user feedback
 */

import { GameplayError, GameplayErrorResult } from '../types/gameplay';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Error context information
 */
export interface ErrorContext {
  scene?: string;
  system?: string;
  action?: string;
  data?: any;
  timestamp?: number;
}

/**
 * Error handling configuration
 */
export interface ErrorHandlingConfig {
  showUserNotifications: boolean;
  logToConsole: boolean;
  enableRecovery: boolean;
  maxRetryAttempts: number;
}

/**
 * Error recovery action
 */
export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'redirect' | 'reset';
  description: string;
  action: () => Promise<boolean>;
}

/**
 * Centralized gameplay error handler
 */
export class GameplayErrorHandler {
  private static instance: GameplayErrorHandler;
  private config: ErrorHandlingConfig;
  private errorLog: Array<{
    error: GameplayError;
    message: string;
    context: ErrorContext;
    timestamp: number;
    severity: ErrorSeverity;
  }> = [];

  private constructor() {
    this.config = {
      showUserNotifications: true,
      logToConsole: true,
      enableRecovery: true,
      maxRetryAttempts: 3,
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(): GameplayErrorHandler {
    if (!GameplayErrorHandler.instance) {
      GameplayErrorHandler.instance = new GameplayErrorHandler();
    }
    return GameplayErrorHandler.instance;
  }

  /**
   * Handle a gameplay error with recovery mechanisms
   * @param error The error type
   * @param message Error message
   * @param context Additional context information
   * @returns Error handling result with recovery options
   */
  handleError(
    error: GameplayError,
    message: string,
    context: ErrorContext = {}
  ): GameplayErrorResult {
    const severity = this.getErrorSeverity(error);
    const timestamp = Date.now();

    // Log the error
    this.logError(error, message, context, severity, timestamp);

    // Create base result
    const result: GameplayErrorResult = {
      success: false,
      error,
      message,
      details: context,
    };

    // Handle based on severity and type
    switch (error) {
      case GameplayError.INVALID_STAGE_DATA:
        return this.handleInvalidStageData(result, context);

      case GameplayError.CHARACTER_LOAD_FAILED:
        return this.handleCharacterLoadFailed(result, context);

      case GameplayError.MAP_LOAD_FAILED:
        return this.handleMapLoadFailed(result, context);

      case GameplayError.INVALID_ACTION:
        return this.handleInvalidAction(result, context);

      case GameplayError.CAMERA_BOUNDS_ERROR:
        return this.handleCameraBoundsError(result, context);

      case GameplayError.INVALID_POSITION:
        return this.handleInvalidPosition(result, context);

      case GameplayError.UNIT_NOT_FOUND:
        return this.handleUnitNotFound(result, context);

      case GameplayError.INVALID_TURN_STATE:
        return this.handleInvalidTurnState(result, context);

      // Movement-specific errors
      case GameplayError.MOVEMENT_CHARACTER_ALREADY_MOVED:
        return this.handleMovementCharacterAlreadyMoved(result, context);

      case GameplayError.MOVEMENT_DESTINATION_UNREACHABLE:
        return this.handleMovementDestinationUnreachable(result, context);

      case GameplayError.MOVEMENT_DESTINATION_OCCUPIED:
        return this.handleMovementDestinationOccupied(result, context);

      case GameplayError.MOVEMENT_INSUFFICIENT_POINTS:
        return this.handleMovementInsufficientPoints(result, context);

      case GameplayError.MOVEMENT_INVALID_CHARACTER:
        return this.handleMovementInvalidCharacter(result, context);

      case GameplayError.MOVEMENT_IN_PROGRESS:
        return this.handleMovementInProgress(result, context);

      case GameplayError.MOVEMENT_PATH_BLOCKED:
        return this.handleMovementPathBlocked(result, context);

      case GameplayError.MOVEMENT_ANIMATION_FAILED:
        return this.handleMovementAnimationFailed(result, context);

      case GameplayError.MOVEMENT_WRONG_TURN:
        return this.handleMovementWrongTurn(result, context);

      default:
        return this.handleGenericError(result, context);
    }
  }

  /**
   * Handle invalid stage data error
   */
  private handleInvalidStageData(
    result: GameplayErrorResult,
    context: ErrorContext
  ): GameplayErrorResult {
    if (this.config.showUserNotifications) {
      this.showUserNotification(
        'Stage Loading Error',
        'The selected stage contains invalid data. Returning to stage selection.',
        'error'
      );
    }

    // Recovery: Return to stage selection
    if (this.config.enableRecovery && context.scene) {
      this.scheduleSceneTransition('StageSelectScene', 1000);
    }

    return result;
  }

  /**
   * Handle character load failed error
   */
  private handleCharacterLoadFailed(
    result: GameplayErrorResult,
    context: ErrorContext
  ): GameplayErrorResult {
    if (this.config.showUserNotifications) {
      this.showUserNotification(
        'Character Loading Error',
        'Failed to load character data. Attempting to reload...',
        'warning'
      );
    }

    // Recovery: Attempt to reload characters
    if (this.config.enableRecovery) {
      this.scheduleRetry(() => this.reloadCharacters(context), 2000);
    }

    return result;
  }

  /**
   * Handle map load failed error
   */
  private handleMapLoadFailed(
    result: GameplayErrorResult,
    context: ErrorContext
  ): GameplayErrorResult {
    if (this.config.showUserNotifications) {
      this.showUserNotification(
        'Map Loading Error',
        'Failed to load map data. Please try selecting a different stage.',
        'error'
      );
    }

    // Recovery: Return to stage selection after delay
    if (this.config.enableRecovery) {
      this.scheduleSceneTransition('StageSelectScene', 2000);
    }

    return result;
  }

  /**
   * Handle invalid action error
   */
  private handleInvalidAction(
    result: GameplayErrorResult,
    context: ErrorContext
  ): GameplayErrorResult {
    if (this.config.showUserNotifications) {
      this.showUserNotification(
        'Invalid Action',
        'That action is not allowed at this time.',
        'info'
      );
    }

    // Recovery: Clear current selection and reset to select phase
    if (this.config.enableRecovery && context.system === 'GameStateManager') {
      this.scheduleGameStateReset();
    }

    return result;
  }

  /**
   * Handle camera bounds error
   */
  private handleCameraBoundsError(
    result: GameplayErrorResult,
    context: ErrorContext
  ): GameplayErrorResult {
    if (this.config.logToConsole) {
      console.warn('Camera bounds error - correcting position');
    }

    // Recovery: Reset camera to center of map
    if (this.config.enableRecovery && context.system === 'CameraController') {
      this.scheduleCameraReset();
    }

    // This is usually not critical, so we can continue
    result.success = true;
    return result;
  }

  /**
   * Handle invalid position error
   */
  private handleInvalidPosition(
    result: GameplayErrorResult,
    context: ErrorContext
  ): GameplayErrorResult {
    if (this.config.showUserNotifications) {
      this.showUserNotification('Invalid Position', 'Cannot move to that location.', 'info');
    }

    // Recovery: Clear movement highlights and reset selection
    if (this.config.enableRecovery) {
      this.scheduleMovementReset();
    }

    return result;
  }

  /**
   * Handle unit not found error
   */
  private handleUnitNotFound(
    result: GameplayErrorResult,
    context: ErrorContext
  ): GameplayErrorResult {
    if (this.config.logToConsole) {
      console.error('Unit not found:', context.data);
    }

    // Recovery: Refresh unit list and clear selection
    if (this.config.enableRecovery) {
      this.scheduleUnitRefresh();
    }

    return result;
  }

  /**
   * Handle invalid turn state error
   */
  private handleInvalidTurnState(
    result: GameplayErrorResult,
    context: ErrorContext
  ): GameplayErrorResult {
    if (this.config.showUserNotifications) {
      this.showUserNotification(
        'Game State Error',
        'Game state became invalid. Attempting to recover...',
        'warning'
      );
    }

    // Recovery: Reset turn state
    if (this.config.enableRecovery) {
      this.scheduleTurnStateReset();
    }

    return result;
  }

  /**
   * Handle generic/unknown errors
   */
  private handleGenericError(
    result: GameplayErrorResult,
    context: ErrorContext
  ): GameplayErrorResult {
    if (this.config.showUserNotifications) {
      this.showUserNotification(
        'Unexpected Error',
        'An unexpected error occurred. The game will attempt to recover.',
        'error'
      );
    }

    // Recovery: Return to main menu as last resort
    if (this.config.enableRecovery) {
      this.scheduleSceneTransition('TitleScene', 3000);
    }

    return result;
  }

  /**
   * Handle movement character already moved error
   */
  private handleMovementCharacterAlreadyMoved(
    result: GameplayErrorResult,
    context: ErrorContext
  ): GameplayErrorResult {
    if (this.config.showUserNotifications) {
      this.showUserNotification(
        'Character Already Moved',
        'This character has already moved this turn.',
        'info'
      );
    }

    // Recovery: Clear selection
    if (this.config.enableRecovery) {
      this.scheduleMovementReset();
    }

    return result;
  }

  /**
   * Handle movement destination unreachable error
   */
  private handleMovementDestinationUnreachable(
    result: GameplayErrorResult,
    context: ErrorContext
  ): GameplayErrorResult {
    if (this.config.showUserNotifications) {
      this.showUserNotification(
        'Destination Unreachable',
        'The selected destination is not within movement range.',
        'info'
      );
    }

    // Recovery: Show alternative positions
    if (this.config.enableRecovery) {
      this.scheduleAlternativePositionsDisplay(context);
    }

    return result;
  }

  /**
   * Handle movement destination occupied error
   */
  private handleMovementDestinationOccupied(
    result: GameplayErrorResult,
    context: ErrorContext
  ): GameplayErrorResult {
    if (this.config.showUserNotifications) {
      this.showUserNotification(
        'Position Occupied',
        'Another unit is already at that position.',
        'info'
      );
    }

    // Recovery: Show alternative positions
    if (this.config.enableRecovery) {
      this.scheduleAlternativePositionsDisplay(context);
    }

    return result;
  }

  /**
   * Handle movement insufficient points error
   */
  private handleMovementInsufficientPoints(
    result: GameplayErrorResult,
    context: ErrorContext
  ): GameplayErrorResult {
    if (this.config.showUserNotifications) {
      this.showUserNotification(
        'Insufficient Movement',
        'The character does not have enough movement points to reach that position.',
        'info'
      );
    }

    // Recovery: Show reachable positions
    if (this.config.enableRecovery) {
      this.scheduleMovementRangeDisplay(context);
    }

    return result;
  }

  /**
   * Handle movement invalid character error
   */
  private handleMovementInvalidCharacter(
    result: GameplayErrorResult,
    context: ErrorContext
  ): GameplayErrorResult {
    if (this.config.showUserNotifications) {
      this.showUserNotification(
        'Invalid Character',
        'Cannot select this character for movement.',
        'warning'
      );
    }

    // Recovery: Clear selection
    if (this.config.enableRecovery) {
      this.scheduleMovementReset();
    }

    return result;
  }

  /**
   * Handle movement in progress error
   */
  private handleMovementInProgress(
    result: GameplayErrorResult,
    context: ErrorContext
  ): GameplayErrorResult {
    if (this.config.showUserNotifications) {
      this.showUserNotification(
        'Movement in Progress',
        'Please wait for the current movement to complete.',
        'info'
      );
    }

    // No recovery needed - just wait for current movement to finish
    return result;
  }

  /**
   * Handle movement path blocked error
   */
  private handleMovementPathBlocked(
    result: GameplayErrorResult,
    context: ErrorContext
  ): GameplayErrorResult {
    if (this.config.showUserNotifications) {
      this.showUserNotification(
        'Path Blocked',
        'The path to the destination is blocked.',
        'warning'
      );
    }

    // Recovery: Show alternative paths or positions
    if (this.config.enableRecovery) {
      this.scheduleAlternativePositionsDisplay(context);
    }

    return result;
  }

  /**
   * Handle movement animation failed error
   */
  private handleMovementAnimationFailed(
    result: GameplayErrorResult,
    context: ErrorContext
  ): GameplayErrorResult {
    if (this.config.showUserNotifications) {
      this.showUserNotification(
        'Movement Animation Error',
        'Movement animation failed, but the character position has been updated.',
        'warning'
      );
    }

    // Recovery: Reset movement state
    if (this.config.enableRecovery) {
      this.scheduleMovementReset();
    }

    // This is not critical - the movement logic succeeded
    result.success = true;
    return result;
  }

  /**
   * Handle movement wrong turn error
   */
  private handleMovementWrongTurn(
    result: GameplayErrorResult,
    context: ErrorContext
  ): GameplayErrorResult {
    if (this.config.showUserNotifications) {
      this.showUserNotification(
        'Wrong Turn',
        'Cannot move this character during the current turn.',
        'info'
      );
    }

    // Recovery: Clear selection
    if (this.config.enableRecovery) {
      this.scheduleMovementReset();
    }

    return result;
  }

  /**
   * Schedule alternative positions display
   */
  private scheduleAlternativePositionsDisplay(context: ErrorContext): void {
    setTimeout(() => {
      console.log('Showing alternative movement positions');
      // Example: MovementSystem.showAlternativePositions(context.data);
    }, 300);
  }

  /**
   * Schedule movement range display
   */
  private scheduleMovementRangeDisplay(context: ErrorContext): void {
    setTimeout(() => {
      console.log('Showing movement range');
      // Example: MovementSystem.showMovementRange(context.data.character);
    }, 200);
  }

  /**
   * Determine error severity based on error type
   */
  private getErrorSeverity(error: GameplayError): ErrorSeverity {
    switch (error) {
      case GameplayError.INVALID_STAGE_DATA:
      case GameplayError.MAP_LOAD_FAILED:
        return ErrorSeverity.CRITICAL;

      case GameplayError.CHARACTER_LOAD_FAILED:
      case GameplayError.INVALID_TURN_STATE:
      case GameplayError.MOVEMENT_ANIMATION_FAILED:
        return ErrorSeverity.HIGH;

      case GameplayError.UNIT_NOT_FOUND:
      case GameplayError.INVALID_ACTION:
      case GameplayError.MOVEMENT_INVALID_CHARACTER:
      case GameplayError.MOVEMENT_PATH_BLOCKED:
        return ErrorSeverity.MEDIUM;

      case GameplayError.CAMERA_BOUNDS_ERROR:
      case GameplayError.INVALID_POSITION:
      case GameplayError.MOVEMENT_CHARACTER_ALREADY_MOVED:
      case GameplayError.MOVEMENT_DESTINATION_UNREACHABLE:
      case GameplayError.MOVEMENT_DESTINATION_OCCUPIED:
      case GameplayError.MOVEMENT_INSUFFICIENT_POINTS:
      case GameplayError.MOVEMENT_IN_PROGRESS:
      case GameplayError.MOVEMENT_WRONG_TURN:
        return ErrorSeverity.LOW;

      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  /**
   * Log error to internal log and console
   */
  private logError(
    error: GameplayError,
    message: string,
    context: ErrorContext,
    severity: ErrorSeverity,
    timestamp: number
  ): void {
    const logEntry = {
      error,
      message,
      context,
      timestamp,
      severity,
    };

    this.errorLog.push(logEntry);

    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog.shift();
    }

    if (this.config.logToConsole) {
      const logMethod =
        severity === ErrorSeverity.CRITICAL
          ? 'error'
          : severity === ErrorSeverity.HIGH
            ? 'error'
            : severity === ErrorSeverity.MEDIUM
              ? 'warn'
              : 'log';

      console[logMethod](`[${severity.toUpperCase()}] ${error}: ${message}`, context);
    }
  }

  /**
   * Show user notification (to be implemented with actual UI system)
   */
  private showUserNotification(
    title: string,
    message: string,
    type: 'info' | 'warning' | 'error'
  ): void {
    // This would integrate with the actual UI system
    // For now, we'll use console output
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);

    // In a real implementation, this would show a toast notification or modal
    // Example: UIManager.showNotification(title, message, type);
  }

  /**
   * Schedule scene transition after delay
   */
  private scheduleSceneTransition(sceneName: string, delay: number): void {
    setTimeout(() => {
      // This would integrate with the actual scene manager
      console.log(`Transitioning to scene: ${sceneName}`);
      // Example: SceneManager.switchTo(sceneName);
    }, delay);
  }

  /**
   * Schedule retry of an operation
   */
  private scheduleRetry(operation: () => Promise<boolean>, delay: number): void {
    setTimeout(async () => {
      try {
        const success = await operation();
        if (!success) {
          console.log('Retry operation failed');
        }
      } catch (error) {
        console.error('Retry operation threw error:', error);
      }
    }, delay);
  }

  /**
   * Schedule character reload
   */
  private async reloadCharacters(context: ErrorContext): Promise<boolean> {
    try {
      // This would integrate with the actual character manager
      console.log('Attempting to reload characters...');
      // Example: return await CharacterManager.reloadCharacters();
      return true;
    } catch (error) {
      console.error('Failed to reload characters:', error);
      return false;
    }
  }

  /**
   * Schedule game state reset
   */
  private scheduleGameStateReset(): void {
    setTimeout(() => {
      console.log('Resetting game state to select phase');
      // Example: GameStateManager.resetToSelectPhase();
    }, 500);
  }

  /**
   * Schedule camera reset
   */
  private scheduleCameraReset(): void {
    setTimeout(() => {
      console.log('Resetting camera to center position');
      // Example: CameraController.resetToCenter();
    }, 100);
  }

  /**
   * Schedule movement reset
   */
  private scheduleMovementReset(): void {
    setTimeout(() => {
      console.log('Clearing movement highlights and selection');
      // Example: MapRenderer.clearHighlights(); GameStateManager.clearSelection();
    }, 200);
  }

  /**
   * Schedule unit refresh
   */
  private scheduleUnitRefresh(): void {
    setTimeout(() => {
      console.log('Refreshing unit list');
      // Example: CharacterManager.refreshUnits();
    }, 300);
  }

  /**
   * Schedule turn state reset
   */
  private scheduleTurnStateReset(): void {
    setTimeout(() => {
      console.log('Resetting turn state');
      // Example: GameStateManager.resetTurnState();
    }, 1000);
  }

  /**
   * Get error log for debugging
   */
  getErrorLog(): typeof this.errorLog {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ErrorHandlingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): ErrorHandlingConfig {
    return { ...this.config };
  }

  /**
   * Create a recovery action
   */
  createRecoveryAction(
    type: RecoveryAction['type'],
    description: string,
    action: () => Promise<boolean>
  ): RecoveryAction {
    return { type, description, action };
  }

  /**
   * Execute recovery action with retry logic
   */
  async executeRecoveryAction(recoveryAction: RecoveryAction): Promise<boolean> {
    let attempts = 0;

    while (attempts < this.config.maxRetryAttempts) {
      try {
        const success = await recoveryAction.action();
        if (success) {
          console.log(
            `Recovery action "${recoveryAction.description}" succeeded on attempt ${attempts + 1}`
          );
          return true;
        }
      } catch (error) {
        console.error(
          `Recovery action "${recoveryAction.description}" failed on attempt ${attempts + 1}:`,
          error
        );
      }

      attempts++;

      // Wait before retry (exponential backoff)
      if (attempts < this.config.maxRetryAttempts) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }

    console.error(
      `Recovery action "${recoveryAction.description}" failed after ${this.config.maxRetryAttempts} attempts`
    );
    return false;
  }
}

/**
 * Convenience function to handle errors
 */
export function handleGameplayError(
  error: GameplayError,
  message: string,
  context: ErrorContext = {}
): GameplayErrorResult {
  return GameplayErrorHandler.getInstance().handleError(error, message, context);
}

/**
 * Convenience function to create recovery actions
 */
export function createRecoveryAction(
  type: RecoveryAction['type'],
  description: string,
  action: () => Promise<boolean>
): RecoveryAction {
  return GameplayErrorHandler.getInstance().createRecoveryAction(type, description, action);
}
