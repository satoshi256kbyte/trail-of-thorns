/**
 * Movement-specific error handling and user feedback system
 * Integrates with GameplayErrorHandler for comprehensive error management
 */

import { Unit, Position, GameplayError, GameplayErrorResult } from '../types/gameplay';
import { MovementError, MovementErrorDetails } from '../types/movement';
import { GameplayErrorHandler, ErrorContext } from './GameplayErrorHandler';

/**
 * Movement error notification types
 */
export enum MovementNotificationType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
}

/**
 * Movement error notification
 */
export interface MovementNotification {
  type: MovementNotificationType;
  title: string;
  message: string;
  duration?: number;
  position?: Position;
  character?: Unit;
  showVisualFeedback?: boolean;
}

/**
 * Movement error recovery options
 */
export interface MovementRecoveryOptions {
  clearSelection?: boolean;
  clearHighlights?: boolean;
  resetMovementState?: boolean;
  showAlternatives?: boolean;
  retryMovement?: boolean;
}

/**
 * Movement error handler configuration
 */
export interface MovementErrorConfig {
  showVisualFeedback: boolean;
  showNotifications: boolean;
  enableRecovery: boolean;
  notificationDuration: number;
  highlightInvalidPositions: boolean;
  showAlternativePaths: boolean;
}

/**
 * Default movement error configuration
 */
const DEFAULT_CONFIG: MovementErrorConfig = {
  showVisualFeedback: true,
  showNotifications: true,
  enableRecovery: true,
  notificationDuration: 3000,
  highlightInvalidPositions: true,
  showAlternativePaths: true,
};

/**
 * Movement-specific error handler
 */
export class MovementErrorHandler {
  private config: MovementErrorConfig;
  private gameplayErrorHandler: GameplayErrorHandler;
  private notificationCallbacks: Array<(notification: MovementNotification) => void> = [];
  private visualFeedbackCallbacks: Array<
    (error: MovementError, details: MovementErrorDetails) => void
  > = [];
  private recoveryCallbacks: Array<(options: MovementRecoveryOptions) => void> = [];

  constructor(config?: Partial<MovementErrorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.gameplayErrorHandler = GameplayErrorHandler.getInstance();
  }

  /**
   * Handle movement validation error with detailed feedback
   * @param error - Movement error type
   * @param message - Error message
   * @param details - Error details
   * @returns Error handling result
   */
  public handleMovementError(
    error: MovementError,
    message: string,
    details?: MovementErrorDetails
  ): GameplayErrorResult {
    // Map movement error to gameplay error
    const gameplayError = this.mapMovementErrorToGameplayError(error);

    // Create error context
    const context: ErrorContext = {
      system: 'MovementSystem',
      action: 'movement_validation',
      data: details,
      timestamp: Date.now(),
    };

    // Handle with gameplay error handler
    const result = this.gameplayErrorHandler.handleError(gameplayError, message, context);

    // Add movement-specific handling
    this.handleMovementSpecificError(error, message, details);

    return result;
  }

  /**
   * Handle character selection error
   * @param character - Character that failed selection
   * @param error - Movement error type
   * @param message - Error message
   */
  public handleCharacterSelectionError(
    character: Unit | null,
    error: MovementError,
    message: string
  ): void {
    const details: MovementErrorDetails = {
      error,
      message,
      character: character || undefined,
    };

    // Show notification
    if (this.config.showNotifications) {
      const notification = this.createCharacterSelectionNotification(error, message, character);
      this.showNotification(notification);
    }

    // Show visual feedback
    if (this.config.showVisualFeedback && character) {
      this.showCharacterSelectionError(character, error);
    }

    // Trigger recovery if enabled
    if (this.config.enableRecovery) {
      this.triggerRecovery({
        clearSelection: true,
        clearHighlights: false,
        resetMovementState: false,
      });
    }
  }

  /**
   * Handle movement execution error
   * @param character - Character that failed to move
   * @param destination - Attempted destination
   * @param error - Movement error type
   * @param message - Error message
   */
  public handleMovementExecutionError(
    character: Unit,
    destination: Position,
    error: MovementError,
    message: string
  ): void {
    const details: MovementErrorDetails = {
      error,
      message,
      character,
      position: destination,
    };

    // Show notification
    if (this.config.showNotifications) {
      const notification = this.createMovementExecutionNotification(
        error,
        message,
        character,
        destination
      );
      this.showNotification(notification);
    }

    // Show visual feedback
    if (this.config.showVisualFeedback) {
      this.showMovementExecutionError(character, destination, error);
    }

    // Trigger recovery if enabled
    if (this.config.enableRecovery) {
      const recoveryOptions = this.getRecoveryOptionsForError(error);
      this.triggerRecovery(recoveryOptions);
    }
  }

  /**
   * Handle movement interruption (e.g., animation cancelled)
   * @param character - Character whose movement was interrupted
   * @param currentPosition - Current position when interrupted
   * @param targetPosition - Original target position
   * @param reason - Reason for interruption
   */
  public handleMovementInterruption(
    character: Unit,
    currentPosition: Position,
    targetPosition: Position,
    reason: string
  ): void {
    const notification: MovementNotification = {
      type: MovementNotificationType.WARNING,
      title: 'Movement Interrupted',
      message: `${character.name}'s movement was interrupted: ${reason}`,
      character,
      position: currentPosition,
      duration: this.config.notificationDuration,
    };

    this.showNotification(notification);

    // Trigger recovery to clean up movement state
    this.triggerRecovery({
      clearSelection: false,
      clearHighlights: true,
      resetMovementState: true,
    });
  }

  /**
   * Show success feedback for completed movement
   * @param character - Character that moved successfully
   * @param path - Path taken
   * @param finalPosition - Final position
   */
  public showMovementSuccess(character: Unit, path: Position[], finalPosition: Position): void {
    if (!this.config.showNotifications) {
      return;
    }

    const notification: MovementNotification = {
      type: MovementNotificationType.SUCCESS,
      title: 'Movement Complete',
      message: `${character.name} moved successfully`,
      character,
      position: finalPosition,
      duration: 1500, // Shorter duration for success messages
    };

    this.showNotification(notification);
  }

  /**
   * Show alternative movement options when primary movement fails
   * @param character - Character attempting to move
   * @param blockedDestination - Originally requested destination
   * @param alternatives - Alternative positions that are reachable
   */
  public showMovementAlternatives(
    character: Unit,
    blockedDestination: Position,
    alternatives: Position[]
  ): void {
    if (!this.config.showAlternativePaths || alternatives.length === 0) {
      return;
    }

    const notification: MovementNotification = {
      type: MovementNotificationType.INFO,
      title: 'Alternative Positions Available',
      message: `Cannot reach (${blockedDestination.x}, ${blockedDestination.y}). ${alternatives.length} alternative positions are available.`,
      character,
      position: blockedDestination,
      duration: this.config.notificationDuration,
      showVisualFeedback: true,
    };

    this.showNotification(notification);

    // Show visual feedback for alternatives
    if (this.config.showVisualFeedback) {
      this.showAlternativePositions(alternatives);
    }
  }

  /**
   * Register callback for notifications
   * @param callback - Function to call when showing notifications
   */
  public onNotification(callback: (notification: MovementNotification) => void): void {
    this.notificationCallbacks.push(callback);
  }

  /**
   * Register callback for visual feedback
   * @param callback - Function to call when showing visual feedback
   */
  public onVisualFeedback(
    callback: (error: MovementError, details: MovementErrorDetails) => void
  ): void {
    this.visualFeedbackCallbacks.push(callback);
  }

  /**
   * Register callback for recovery actions
   * @param callback - Function to call when triggering recovery
   */
  public onRecovery(callback: (options: MovementRecoveryOptions) => void): void {
    this.recoveryCallbacks.push(callback);
  }

  /**
   * Update configuration
   * @param config - New configuration values
   */
  public updateConfig(config: Partial<MovementErrorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * @returns Current configuration
   */
  public getConfig(): MovementErrorConfig {
    return { ...this.config };
  }

  /**
   * Map movement error to gameplay error
   * @param error - Movement error
   * @returns Corresponding gameplay error
   */
  private mapMovementErrorToGameplayError(error: MovementError): GameplayError {
    switch (error) {
      case MovementError.CHARACTER_ALREADY_MOVED:
        return GameplayError.MOVEMENT_CHARACTER_ALREADY_MOVED;
      case MovementError.DESTINATION_UNREACHABLE:
        return GameplayError.MOVEMENT_DESTINATION_UNREACHABLE;
      case MovementError.DESTINATION_OCCUPIED:
        return GameplayError.MOVEMENT_DESTINATION_OCCUPIED;
      case MovementError.INSUFFICIENT_MOVEMENT_POINTS:
        return GameplayError.MOVEMENT_INSUFFICIENT_POINTS;
      case MovementError.INVALID_CHARACTER_SELECTION:
        return GameplayError.MOVEMENT_INVALID_CHARACTER;
      case MovementError.MOVEMENT_IN_PROGRESS:
        return GameplayError.MOVEMENT_IN_PROGRESS;
      case MovementError.PATH_BLOCKED:
        return GameplayError.MOVEMENT_PATH_BLOCKED;
      case MovementError.INVALID_POSITION:
        return GameplayError.INVALID_POSITION;
      default:
        return GameplayError.INVALID_ACTION;
    }
  }

  /**
   * Handle movement-specific error processing
   * @param error - Movement error
   * @param message - Error message
   * @param details - Error details
   */
  private handleMovementSpecificError(
    error: MovementError,
    message: string,
    details?: MovementErrorDetails
  ): void {
    // Trigger visual feedback callbacks
    if (this.config.showVisualFeedback && details) {
      this.visualFeedbackCallbacks.forEach(callback => {
        try {
          callback(error, details);
        } catch (callbackError) {
          console.error('Error in visual feedback callback:', callbackError);
        }
      });
    }
  }

  /**
   * Create notification for character selection error
   * @param error - Movement error
   * @param message - Error message
   * @param character - Character involved
   * @returns Notification object
   */
  private createCharacterSelectionNotification(
    error: MovementError,
    message: string,
    character: Unit | null
  ): MovementNotification {
    let title = 'Selection Error';
    let type = MovementNotificationType.WARNING;

    switch (error) {
      case MovementError.CHARACTER_ALREADY_MOVED:
        title = 'Character Already Moved';
        type = MovementNotificationType.INFO;
        break;
      case MovementError.INVALID_CHARACTER_SELECTION:
        title = 'Invalid Selection';
        type = MovementNotificationType.ERROR;
        break;
      case MovementError.MOVEMENT_IN_PROGRESS:
        title = 'Movement in Progress';
        type = MovementNotificationType.WARNING;
        break;
    }

    return {
      type,
      title,
      message,
      character: character || undefined,
      duration: this.config.notificationDuration,
    };
  }

  /**
   * Create notification for movement execution error
   * @param error - Movement error
   * @param message - Error message
   * @param character - Character involved
   * @param destination - Attempted destination
   * @returns Notification object
   */
  private createMovementExecutionNotification(
    error: MovementError,
    message: string,
    character: Unit,
    destination: Position
  ): MovementNotification {
    let title = 'Movement Error';
    let type = MovementNotificationType.ERROR;

    switch (error) {
      case MovementError.DESTINATION_UNREACHABLE:
        title = 'Destination Unreachable';
        type = MovementNotificationType.INFO;
        break;
      case MovementError.DESTINATION_OCCUPIED:
        title = 'Position Occupied';
        type = MovementNotificationType.INFO;
        break;
      case MovementError.INSUFFICIENT_MOVEMENT_POINTS:
        title = 'Insufficient Movement';
        type = MovementNotificationType.INFO;
        break;
      case MovementError.PATH_BLOCKED:
        title = 'Path Blocked';
        type = MovementNotificationType.WARNING;
        break;
    }

    return {
      type,
      title,
      message,
      character,
      position: destination,
      duration: this.config.notificationDuration,
      showVisualFeedback: true,
    };
  }

  /**
   * Show notification to user
   * @param notification - Notification to show
   */
  private showNotification(notification: MovementNotification): void {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification callback:', error);
      }
    });
  }

  /**
   * Show visual feedback for character selection error
   * @param character - Character with error
   * @param error - Error type
   */
  private showCharacterSelectionError(character: Unit, error: MovementError): void {
    // This would be implemented by the visual feedback callback
    // For example, showing a red highlight around the character
    const details: MovementErrorDetails = {
      error,
      message: 'Character selection failed',
      character,
    };

    this.visualFeedbackCallbacks.forEach(callback => {
      try {
        callback(error, details);
      } catch (callbackError) {
        console.error('Error in visual feedback callback:', callbackError);
      }
    });
  }

  /**
   * Show visual feedback for movement execution error
   * @param character - Character attempting to move
   * @param destination - Failed destination
   * @param error - Error type
   */
  private showMovementExecutionError(
    character: Unit,
    destination: Position,
    error: MovementError
  ): void {
    const details: MovementErrorDetails = {
      error,
      message: 'Movement execution failed',
      character,
      position: destination,
    };

    this.visualFeedbackCallbacks.forEach(callback => {
      try {
        callback(error, details);
      } catch (callbackError) {
        console.error('Error in visual feedback callback:', callbackError);
      }
    });
  }

  /**
   * Show alternative positions visually
   * @param alternatives - Alternative positions to highlight
   */
  private showAlternativePositions(alternatives: Position[]): void {
    // This would be handled by the visual feedback system
    // For now, we'll log the alternatives
    console.log('Alternative positions available:', alternatives);
  }

  /**
   * Get recovery options based on error type
   * @param error - Movement error
   * @returns Recovery options
   */
  private getRecoveryOptionsForError(error: MovementError): MovementRecoveryOptions {
    switch (error) {
      case MovementError.DESTINATION_UNREACHABLE:
      case MovementError.DESTINATION_OCCUPIED:
        return {
          clearSelection: false,
          clearHighlights: false,
          resetMovementState: false,
          showAlternatives: true,
        };

      case MovementError.CHARACTER_ALREADY_MOVED:
        return {
          clearSelection: true,
          clearHighlights: true,
          resetMovementState: true,
        };

      case MovementError.MOVEMENT_IN_PROGRESS:
        return {
          clearSelection: false,
          clearHighlights: false,
          resetMovementState: false,
        };

      case MovementError.PATH_BLOCKED:
        return {
          clearSelection: false,
          clearHighlights: true,
          resetMovementState: false,
          showAlternatives: true,
        };

      default:
        return {
          clearSelection: true,
          clearHighlights: true,
          resetMovementState: true,
        };
    }
  }

  /**
   * Trigger recovery actions
   * @param options - Recovery options
   */
  private triggerRecovery(options: MovementRecoveryOptions): void {
    this.recoveryCallbacks.forEach(callback => {
      try {
        callback(options);
      } catch (error) {
        console.error('Error in recovery callback:', error);
      }
    });
  }

  /**
   * Clear all callbacks and reset state
   */
  public destroy(): void {
    this.notificationCallbacks = [];
    this.visualFeedbackCallbacks = [];
    this.recoveryCallbacks = [];
  }
}

/**
 * Convenience function to create movement error handler
 * @param config - Optional configuration
 * @returns New movement error handler instance
 */
export function createMovementErrorHandler(
  config?: Partial<MovementErrorConfig>
): MovementErrorHandler {
  return new MovementErrorHandler(config);
}
