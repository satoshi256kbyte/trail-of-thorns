/**
 * RecruitmentErrorHandler - Comprehensive error handling system for recruitment operations
 *
 * This class provides centralized error handling for all recruitment system operations,
 * including error classification, recovery mechanisms, user feedback, and state cleanup.
 *
 * Implements error handling requirements for all recruitment system requirements
 */

import * as Phaser from 'phaser';
import { Unit, Position, GameplayError, GameplayErrorResult } from '../../types/gameplay';
import {
  RecruitmentError,
  RecruitmentContext,
  RecruitmentErrorDetails,
  RecruitmentResult,
  RecruitmentAction,
  RecruitmentStatus,
  RecruitmentUtils,
} from '../../types/recruitment';

/**
 * Error recovery result indicating the outcome of recruitment error handling
 */
export interface RecruitmentErrorRecoveryResult {
  /** Whether the error was successfully handled */
  success: boolean;
  /** Recovery action that was taken */
  action: 'retry' | 'cancel' | 'reset' | 'ignore' | 'fallback' | 'cleanup';
  /** Message describing the recovery action */
  message: string;
  /** Whether the user needs to take additional action */
  requiresUserAction: boolean;
  /** Suggested next steps for the user */
  userGuidance?: string;
  /** Whether the recruitment system state was modified */
  stateModified: boolean;
  /** Whether the error is recoverable */
  recoverable: boolean;
  /** Additional recovery data */
  recoveryData?: any;
}

/**
 * Error notification configuration for recruitment system
 */
export interface RecruitmentErrorNotificationConfig {
  /** Show error messages to user */
  showUserMessages: boolean;
  /** Duration to show error messages (ms) */
  messageDuration: number;
  /** Show detailed error information */
  showDetailedErrors: boolean;
  /** Enable error sound effects */
  enableErrorSounds: boolean;
  /** Auto-dismiss non-critical errors */
  autoDismissErrors: boolean;
  /** Show recruitment guidance hints */
  showRecruitmentHints: boolean;
  /** Enable error animation effects */
  enableErrorAnimations: boolean;
}

/**
 * Error statistics for recruitment system monitoring
 */
export interface RecruitmentErrorStatistics {
  /** Total number of recruitment errors encountered */
  totalErrors: number;
  /** Errors by type */
  errorsByType: Record<RecruitmentError, number>;
  /** Successfully recovered errors */
  recoveredErrors: number;
  /** Critical errors that required reset */
  criticalErrors: number;
  /** User-initiated cancellations */
  userCancellations: number;
  /** Failed recruitment attempts due to errors */
  failedRecruitmentAttempts: number;
  /** Successful error recoveries that led to recruitment */
  successfulRecoveries: number;
  /** Last error timestamp */
  lastErrorTime: number;
  /** Most common error type */
  mostCommonError?: RecruitmentError;
}

/**
 * User feedback interface for recruitment error notifications
 */
export interface RecruitmentUserFeedbackInterface {
  /** Show recruitment error message to user */
  showRecruitmentErrorMessage(
    message: string,
    type: 'error' | 'warning' | 'info',
    duration?: number
  ): void;
  /** Show recruitment condition guidance */
  showRecruitmentGuidance(message: string, conditions?: string[], position?: Position): void;
  /** Show confirmation dialog for recruitment actions */
  showRecruitmentConfirmDialog(message: string, onConfirm: () => void, onCancel: () => void): void;
  /** Highlight recruitment target with error indication */
  highlightRecruitmentError(unit: Unit, errorType: RecruitmentError): void;
  /** Clear all recruitment error messages */
  clearRecruitmentMessages(): void;
  /** Show recruitment progress with error indication */
  showRecruitmentProgressError(unit: Unit, progress: number, errorMessage: string): void;
}

/**
 * Comprehensive recruitment error handler
 */
export class RecruitmentErrorHandler extends Phaser.Events.EventEmitter {
  private scene?: Phaser.Scene;
  private config: RecruitmentErrorNotificationConfig;
  private statistics: RecruitmentErrorStatistics;
  private userFeedback: RecruitmentUserFeedbackInterface;
  private errorHistory: RecruitmentErrorDetails[] = [];
  private maxHistorySize: number = 100;
  private retryAttempts: Map<string, number> = new Map();
  private maxRetryAttempts: number = 3;

  // UI elements for error display
  private errorContainer: Phaser.GameObjects.Container | null = null;
  private errorText: Phaser.GameObjects.Text | null = null;
  private guidanceTooltip: Phaser.GameObjects.Container | null = null;
  private errorHighlights: Map<string, Phaser.GameObjects.Graphics> = new Map();

  // Default configuration
  private static readonly DEFAULT_CONFIG: RecruitmentErrorNotificationConfig = {
    showUserMessages: true,
    messageDuration: 4000,
    showDetailedErrors: false,
    enableErrorSounds: true,
    autoDismissErrors: true,
    showRecruitmentHints: true,
    enableErrorAnimations: true,
  };

  /**
   * Creates a new RecruitmentErrorHandler instance
   * @param scene - Phaser scene for UI rendering
   * @param config - Error notification configuration
   */
  constructor(scene?: Phaser.Scene, config?: Partial<RecruitmentErrorNotificationConfig>) {
    super();

    this.scene = scene;
    this.config = { ...RecruitmentErrorHandler.DEFAULT_CONFIG, ...config };

    // Initialize statistics
    this.statistics = {
      totalErrors: 0,
      errorsByType: {} as Record<RecruitmentError, number>,
      recoveredErrors: 0,
      criticalErrors: 0,
      userCancellations: 0,
      failedRecruitmentAttempts: 0,
      successfulRecoveries: 0,
      lastErrorTime: 0,
    };

    // Initialize all error types in statistics
    Object.values(RecruitmentError).forEach(errorType => {
      this.statistics.errorsByType[errorType] = 0;
    });

    // Create user feedback interface
    this.userFeedback = this.createUserFeedbackInterface();

    // Initialize UI elements if scene is provided
    if (this.scene) {
      this.initializeUI();
    }
  }

  /**
   * Handle a recruitment error with comprehensive recovery mechanisms
   * @param error - Type of recruitment error
   * @param context - Recruitment context when error occurred
   * @param message - Detailed error message
   * @returns Promise resolving to recovery result
   */
  public async handleRecruitmentError(
    error: RecruitmentError,
    context: RecruitmentContext,
    message?: string
  ): Promise<RecruitmentErrorRecoveryResult> {
    try {
      // Update statistics
      this.updateStatistics(error);

      // Create error details
      const errorDetails = this.createErrorDetails(error, context, message);

      // Add to history
      this.addToHistory(errorDetails);

      // Log error for debugging
      this.logError(errorDetails);

      // Check retry attempts
      const retryKey = this.getRetryKey(error, context);
      const currentAttempts = this.retryAttempts.get(retryKey) || 0;

      // Determine recovery strategy
      const recoveryStrategy = this.determineRecoveryStrategy(error, context, currentAttempts);

      // Execute recovery
      const recoveryResult = await this.executeRecovery(
        recoveryStrategy,
        errorDetails,
        currentAttempts
      );

      // Update retry attempts if needed
      if (recoveryResult.action === 'retry') {
        this.retryAttempts.set(retryKey, currentAttempts + 1);
      } else if (recoveryResult.success) {
        this.retryAttempts.delete(retryKey);
      }

      // Provide user feedback
      await this.provideUserFeedback(errorDetails, recoveryResult);

      // Emit error handled event
      this.emit('recruitment-error-handled', {
        error,
        context,
        recoveryResult,
        errorDetails,
      });

      return recoveryResult;
    } catch (handlingError) {
      // Critical error in error handling itself
      console.error('Critical error in RecruitmentErrorHandler:', handlingError);

      const fallbackResult: RecruitmentErrorRecoveryResult = {
        success: false,
        action: 'reset',
        message: 'Critical error in recruitment error handling, forcing system reset',
        requiresUserAction: true,
        userGuidance: 'The recruitment system encountered a critical error and needs to be reset',
        stateModified: true,
        recoverable: false,
      };

      this.statistics.criticalErrors++;
      this.emit('recruitment-critical-error', { originalError: error, handlingError, context });

      return fallbackResult;
    }
  }

  /**
   * Handle specific recruitment error types with targeted recovery
   * @param error - Recruitment error type
   * @param context - Recruitment context
   * @returns Recovery result
   */
  public handleSpecificRecruitmentError(
    error: RecruitmentError,
    context: RecruitmentContext
  ): RecruitmentErrorRecoveryResult {
    switch (error) {
      case RecruitmentError.INVALID_TARGET:
        return this.handleInvalidTarget(context);

      case RecruitmentError.CONDITIONS_NOT_MET:
        return this.handleConditionsNotMet(context);

      case RecruitmentError.NPC_ALREADY_DEFEATED:
        return this.handleNPCAlreadyDefeated(context);

      case RecruitmentError.SYSTEM_ERROR:
        return this.handleSystemError(context);

      case RecruitmentError.INVALID_ATTACKER:
        return this.handleInvalidAttacker(context);

      case RecruitmentError.INVALID_STAGE:
        return this.handleInvalidStage(context);

      case RecruitmentError.DATA_CORRUPTION:
        return this.handleDataCorruption(context);

      default:
        return this.handleUnknownRecruitmentError(error, context);
    }
  }

  /**
   * Provide user guidance for recruitment error resolution
   * @param error - Recruitment error type
   * @param context - Recruitment context
   * @returns User guidance message
   */
  public getRecruitmentUserGuidance(error: RecruitmentError, context: RecruitmentContext): string {
    switch (error) {
      case RecruitmentError.INVALID_TARGET:
        return 'This character cannot be recruited. Look for characters with a recruitment indicator.';

      case RecruitmentError.CONDITIONS_NOT_MET:
        return this.getConditionsNotMetGuidance(context);

      case RecruitmentError.NPC_ALREADY_DEFEATED:
        return 'The NPC was defeated before stage completion. Recruitment has failed for this character.';

      case RecruitmentError.SYSTEM_ERROR:
        return 'A recruitment system error occurred. Try restarting the recruitment process.';

      case RecruitmentError.INVALID_ATTACKER:
        return 'This character cannot perform recruitment attacks. Check the recruitment conditions.';

      case RecruitmentError.INVALID_STAGE:
        return 'This stage does not support character recruitment.';

      case RecruitmentError.DATA_CORRUPTION:
        return 'Recruitment data is corrupted. The system will attempt to recover automatically.';

      default:
        return 'An unexpected recruitment error occurred. Try canceling the current action and starting over.';
    }
  }

  /**
   * Clean up recruitment state after error
   * @param context - Recruitment context to clean up
   * @returns Cleanup result
   */
  public cleanupRecruitmentState(context: RecruitmentContext): {
    success: boolean;
    message: string;
  } {
    try {
      // Clear any ongoing recruitment animations
      if (this.scene) {
        this.scene.tweens.killAll();
      }

      // Clear visual effects
      this.clearRecruitmentVisualEffects();

      // Reset any temporary state modifications
      if (context.target) {
        this.resetRecruitmentUnitState(context.target);
      }

      if (context.attacker) {
        this.resetRecruitmentUnitState(context.attacker);
      }

      // Clear any recruitment UI overlays
      this.clearRecruitmentErrorUI();

      // Clear error highlights
      this.clearErrorHighlights();

      return {
        success: true,
        message: 'Recruitment state cleaned up successfully',
      };
    } catch (error) {
      console.error('Error during recruitment state cleanup:', error);
      return {
        success: false,
        message: `Recruitment cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Validate recruitment context for error handling
   * @param context - Recruitment context to validate
   * @returns Validation result
   */
  public validateRecruitmentContext(context: RecruitmentContext): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!context.attacker) {
      errors.push('Missing attacker in recruitment context');
    }

    if (!context.target) {
      errors.push('Missing target in recruitment context');
    }

    if (typeof context.damage !== 'number' || context.damage < 0) {
      errors.push('Invalid damage value in recruitment context');
    }

    if (typeof context.turn !== 'number' || context.turn < 1) {
      errors.push('Invalid turn value in recruitment context');
    }

    // Check optional fields
    if (!Array.isArray(context.alliedUnits)) {
      warnings.push('Missing or invalid allied units array');
    }

    if (!Array.isArray(context.enemyUnits)) {
      warnings.push('Missing or invalid enemy units array');
    }

    if (!Array.isArray(context.npcUnits)) {
      warnings.push('Missing or invalid NPC units array');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get error statistics for monitoring
   * @returns Current error statistics
   */
  public getStatistics(): RecruitmentErrorStatistics {
    // Calculate most common error
    let mostCommonError: RecruitmentError | undefined;
    let maxCount = 0;

    Object.entries(this.statistics.errorsByType).forEach(([error, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonError = error as RecruitmentError;
      }
    });

    return {
      ...this.statistics,
      mostCommonError,
    };
  }

  /**
   * Reset error statistics
   */
  public resetStatistics(): void {
    this.statistics = {
      totalErrors: 0,
      errorsByType: {} as Record<RecruitmentError, number>,
      recoveredErrors: 0,
      criticalErrors: 0,
      userCancellations: 0,
      failedRecruitmentAttempts: 0,
      successfulRecoveries: 0,
      lastErrorTime: 0,
    };

    // Reinitialize error type counters
    Object.values(RecruitmentError).forEach(errorType => {
      this.statistics.errorsByType[errorType] = 0;
    });

    // Clear retry attempts
    this.retryAttempts.clear();
  }

  /**
   * Get error history for debugging
   * @param limit - Maximum number of errors to return
   * @returns Recent error history
   */
  public getErrorHistory(limit?: number): RecruitmentErrorDetails[] {
    const historyLimit = limit || this.errorHistory.length;
    return this.errorHistory.slice(-historyLimit);
  }

  /**
   * Clear error history
   */
  public clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Update configuration
   * @param newConfig - New configuration options
   */
  public updateConfig(newConfig: Partial<RecruitmentErrorNotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   * @returns Current configuration
   */
  public getConfig(): RecruitmentErrorNotificationConfig {
    return { ...this.config };
  }

  // Private methods for error handling implementation

  /**
   * Create detailed error information
   * @param error - Recruitment error type
   * @param context - Recruitment context
   * @param message - Error message
   * @returns Detailed error information
   */
  private createErrorDetails(
    error: RecruitmentError,
    context: RecruitmentContext,
    message?: string
  ): RecruitmentErrorDetails {
    return RecruitmentUtils.createErrorDetails(
      error,
      message || this.getDefaultErrorMessage(error),
      context,
      this.isRecoverable(error),
      this.getSuggestedAction(error)
    );
  }

  /**
   * Determine recovery strategy for error
   * @param error - Recruitment error type
   * @param context - Recruitment context
   * @param currentAttempts - Current retry attempts
   * @returns Recovery strategy
   */
  private determineRecoveryStrategy(
    error: RecruitmentError,
    context: RecruitmentContext,
    currentAttempts: number
  ): 'retry' | 'cancel' | 'reset' | 'ignore' | 'fallback' | 'cleanup' {
    // If max retry attempts reached, don't retry
    if (currentAttempts >= this.maxRetryAttempts) {
      return 'cancel';
    }

    // Critical errors require reset
    if ([RecruitmentError.SYSTEM_ERROR, RecruitmentError.DATA_CORRUPTION].includes(error)) {
      return 'reset';
    }

    // Permanent failures require cleanup
    if (error === RecruitmentError.NPC_ALREADY_DEFEATED) {
      return 'cleanup';
    }

    // User input errors should be cancelled for retry
    if (
      [
        RecruitmentError.INVALID_TARGET,
        RecruitmentError.CONDITIONS_NOT_MET,
        RecruitmentError.INVALID_ATTACKER,
      ].includes(error)
    ) {
      return 'cancel';
    }

    // Stage-level errors require fallback
    if (error === RecruitmentError.INVALID_STAGE) {
      return 'fallback';
    }

    // Default to cancel for unknown errors
    return 'cancel';
  }

  /**
   * Execute error recovery based on strategy
   * @param strategy - Recovery strategy
   * @param errorDetails - Error details
   * @param currentAttempts - Current retry attempts
   * @returns Recovery result
   */
  private async executeRecovery(
    strategy: 'retry' | 'cancel' | 'reset' | 'ignore' | 'fallback' | 'cleanup',
    errorDetails: RecruitmentErrorDetails,
    currentAttempts: number
  ): Promise<RecruitmentErrorRecoveryResult> {
    switch (strategy) {
      case 'retry':
        return this.executeRetryRecovery(errorDetails, currentAttempts);

      case 'cancel':
        return this.executeCancelRecovery(errorDetails);

      case 'reset':
        return this.executeResetRecovery(errorDetails);

      case 'ignore':
        return this.executeIgnoreRecovery(errorDetails);

      case 'fallback':
        return this.executeFallbackRecovery(errorDetails);

      case 'cleanup':
        return this.executeCleanupRecovery(errorDetails);

      default:
        return this.executeCancelRecovery(errorDetails);
    }
  }

  /**
   * Execute retry recovery
   * @param errorDetails - Error details
   * @param currentAttempts - Current retry attempts
   * @returns Recovery result
   */
  private async executeRetryRecovery(
    errorDetails: RecruitmentErrorDetails,
    currentAttempts: number
  ): Promise<RecruitmentErrorRecoveryResult> {
    // Clean up current state
    const cleanupResult = this.cleanupRecruitmentState(errorDetails.context);

    return {
      success: cleanupResult.success,
      action: 'retry',
      message: `Recruitment action cancelled, retry attempt ${currentAttempts + 1}/${this.maxRetryAttempts}`,
      requiresUserAction: true,
      userGuidance: this.getRecruitmentUserGuidance(errorDetails.error, errorDetails.context),
      stateModified: true,
      recoverable: true,
      recoveryData: { attempts: currentAttempts + 1 },
    };
  }

  /**
   * Execute cancel recovery
   * @param errorDetails - Error details
   * @returns Recovery result
   */
  private async executeCancelRecovery(
    errorDetails: RecruitmentErrorDetails
  ): Promise<RecruitmentErrorRecoveryResult> {
    // Clean up current state
    const cleanupResult = this.cleanupRecruitmentState(errorDetails.context);

    // Emit cancel request
    this.emit('recruitment-cancel-requested', {
      error: errorDetails.error,
      context: errorDetails.context,
    });

    this.statistics.userCancellations++;

    return {
      success: cleanupResult.success,
      action: 'cancel',
      message: 'Recruitment action cancelled due to error',
      requiresUserAction: true,
      userGuidance: this.getRecruitmentUserGuidance(errorDetails.error, errorDetails.context),
      stateModified: true,
      recoverable: true,
    };
  }

  /**
   * Execute reset recovery
   * @param errorDetails - Error details
   * @returns Recovery result
   */
  private async executeResetRecovery(
    errorDetails: RecruitmentErrorDetails
  ): Promise<RecruitmentErrorRecoveryResult> {
    // Perform comprehensive cleanup
    const cleanupResult = this.cleanupRecruitmentState(errorDetails.context);

    // Emit reset request
    this.emit('recruitment-reset-requested', {
      error: errorDetails.error,
      context: errorDetails.context,
    });

    this.statistics.criticalErrors++;

    return {
      success: cleanupResult.success,
      action: 'reset',
      message: 'Recruitment system reset due to critical error',
      requiresUserAction: true,
      userGuidance:
        'The recruitment system has been reset. You can start a new recruitment attempt.',
      stateModified: true,
      recoverable: false,
    };
  }

  /**
   * Execute ignore recovery (for non-critical errors)
   * @param errorDetails - Error details
   * @returns Recovery result
   */
  private async executeIgnoreRecovery(
    errorDetails: RecruitmentErrorDetails
  ): Promise<RecruitmentErrorRecoveryResult> {
    return {
      success: true,
      action: 'ignore',
      message: 'Recruitment error ignored, continuing with battle',
      requiresUserAction: false,
      stateModified: false,
      recoverable: true,
    };
  }

  /**
   * Execute fallback recovery
   * @param errorDetails - Error details
   * @returns Recovery result
   */
  private async executeFallbackRecovery(
    errorDetails: RecruitmentErrorDetails
  ): Promise<RecruitmentErrorRecoveryResult> {
    // Clean up current state
    const cleanupResult = this.cleanupRecruitmentState(errorDetails.context);

    return {
      success: cleanupResult.success,
      action: 'fallback',
      message: 'Using fallback behavior for recruitment error',
      requiresUserAction: true,
      userGuidance: this.getRecruitmentUserGuidance(errorDetails.error, errorDetails.context),
      stateModified: true,
      recoverable: true,
    };
  }

  /**
   * Execute cleanup recovery (for permanent failures)
   * @param errorDetails - Error details
   * @returns Recovery result
   */
  private async executeCleanupRecovery(
    errorDetails: RecruitmentErrorDetails
  ): Promise<RecruitmentErrorRecoveryResult> {
    // Clean up current state
    const cleanupResult = this.cleanupRecruitmentState(errorDetails.context);

    // Mark recruitment as failed
    this.statistics.failedRecruitmentAttempts++;

    // Emit cleanup request
    this.emit('recruitment-cleanup-requested', {
      error: errorDetails.error,
      context: errorDetails.context,
    });

    return {
      success: cleanupResult.success,
      action: 'cleanup',
      message: 'Recruitment permanently failed, cleaning up state',
      requiresUserAction: false,
      userGuidance: 'This recruitment opportunity has been lost.',
      stateModified: true,
      recoverable: false,
    };
  }

  // Specific error handlers

  private handleInvalidTarget(context: RecruitmentContext): RecruitmentErrorRecoveryResult {
    return {
      success: true,
      action: 'cancel',
      message: 'Invalid recruitment target selected',
      requiresUserAction: true,
      userGuidance: 'Select a character that can be recruited (look for recruitment indicators)',
      stateModified: false,
      recoverable: true,
    };
  }

  private handleConditionsNotMet(context: RecruitmentContext): RecruitmentErrorRecoveryResult {
    return {
      success: true,
      action: 'cancel',
      message: 'Recruitment conditions not satisfied',
      requiresUserAction: true,
      userGuidance: this.getConditionsNotMetGuidance(context),
      stateModified: false,
      recoverable: true,
    };
  }

  private handleNPCAlreadyDefeated(context: RecruitmentContext): RecruitmentErrorRecoveryResult {
    return {
      success: false,
      action: 'cleanup',
      message: 'NPC was defeated before recruitment could be completed',
      requiresUserAction: false,
      userGuidance: 'This recruitment opportunity has been lost permanently',
      stateModified: true,
      recoverable: false,
    };
  }

  private handleSystemError(context: RecruitmentContext): RecruitmentErrorRecoveryResult {
    return {
      success: false,
      action: 'reset',
      message: 'Recruitment system error occurred',
      requiresUserAction: true,
      userGuidance: 'The recruitment system will be reset to recover from this error',
      stateModified: true,
      recoverable: false,
    };
  }

  private handleInvalidAttacker(context: RecruitmentContext): RecruitmentErrorRecoveryResult {
    return {
      success: true,
      action: 'cancel',
      message: 'Invalid attacker for recruitment',
      requiresUserAction: true,
      userGuidance:
        'Use the correct character to perform this recruitment (check recruitment conditions)',
      stateModified: false,
      recoverable: true,
    };
  }

  private handleInvalidStage(context: RecruitmentContext): RecruitmentErrorRecoveryResult {
    return {
      success: true,
      action: 'fallback',
      message: 'This stage does not support recruitment',
      requiresUserAction: false,
      userGuidance: 'Character recruitment is not available in this stage',
      stateModified: false,
      recoverable: false,
    };
  }

  private handleDataCorruption(context: RecruitmentContext): RecruitmentErrorRecoveryResult {
    return {
      success: false,
      action: 'reset',
      message: 'Recruitment data corruption detected',
      requiresUserAction: true,
      userGuidance: 'The system will attempt to recover the recruitment data',
      stateModified: true,
      recoverable: false,
    };
  }

  private handleUnknownRecruitmentError(
    error: RecruitmentError,
    context: RecruitmentContext
  ): RecruitmentErrorRecoveryResult {
    return {
      success: false,
      action: 'cancel',
      message: `Unknown recruitment error: ${error}`,
      requiresUserAction: true,
      userGuidance: 'Try canceling the current recruitment action and starting over',
      stateModified: true,
      recoverable: true,
    };
  }

  // Utility methods

  private getConditionsNotMetGuidance(context: RecruitmentContext): string {
    // This would analyze the specific conditions that weren't met
    // For now, provide generic guidance
    return 'Check the recruitment conditions and ensure all requirements are satisfied before attacking.';
  }

  private updateStatistics(error: RecruitmentError): void {
    this.statistics.totalErrors++;
    this.statistics.errorsByType[error]++;
    this.statistics.lastErrorTime = Date.now();
  }

  private addToHistory(errorDetails: RecruitmentErrorDetails): void {
    this.errorHistory.push(errorDetails);

    // Maintain history size limit
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  private logError(errorDetails: RecruitmentErrorDetails): void {
    console.error('[RecruitmentErrorHandler]', {
      error: errorDetails.error,
      message: errorDetails.message,
      context: {
        attacker: errorDetails.context.attacker?.name || 'unknown',
        target: errorDetails.context.target?.name || 'unknown',
        damage: errorDetails.context.damage,
        turn: errorDetails.context.turn,
      },
      timestamp: new Date(errorDetails.timestamp).toISOString(),
      recoverable: errorDetails.recoverable,
    });
  }

  private getRetryKey(error: RecruitmentError, context: RecruitmentContext): string {
    return `${error}_${context.attacker?.id || 'unknown'}_${context.target?.id || 'unknown'}`;
  }

  private getDefaultErrorMessage(error: RecruitmentError): string {
    switch (error) {
      case RecruitmentError.INVALID_TARGET:
        return 'The selected character cannot be recruited';
      case RecruitmentError.CONDITIONS_NOT_MET:
        return 'Recruitment conditions are not satisfied';
      case RecruitmentError.NPC_ALREADY_DEFEATED:
        return 'The NPC was defeated before recruitment completion';
      case RecruitmentError.SYSTEM_ERROR:
        return 'Recruitment system error occurred';
      case RecruitmentError.INVALID_ATTACKER:
        return 'Invalid attacker for recruitment';
      case RecruitmentError.INVALID_STAGE:
        return 'Recruitment not supported in this stage';
      case RecruitmentError.DATA_CORRUPTION:
        return 'Recruitment data corruption detected';
      default:
        return 'Unknown recruitment error';
    }
  }

  private isRecoverable(error: RecruitmentError): boolean {
    // Most errors are recoverable except critical system errors and permanent failures
    return ![
      RecruitmentError.SYSTEM_ERROR,
      RecruitmentError.DATA_CORRUPTION,
      RecruitmentError.NPC_ALREADY_DEFEATED,
      RecruitmentError.INVALID_STAGE,
    ].includes(error);
  }

  private getSuggestedAction(error: RecruitmentError): string {
    switch (error) {
      case RecruitmentError.INVALID_TARGET:
        return 'Select a recruitable character';
      case RecruitmentError.CONDITIONS_NOT_MET:
        return 'Satisfy recruitment conditions';
      case RecruitmentError.NPC_ALREADY_DEFEATED:
        return 'Protect NPCs until stage completion';
      case RecruitmentError.SYSTEM_ERROR:
        return 'Restart recruitment system';
      case RecruitmentError.INVALID_ATTACKER:
        return 'Use correct attacker';
      case RecruitmentError.INVALID_STAGE:
        return 'Try different stage';
      case RecruitmentError.DATA_CORRUPTION:
        return 'Reset recruitment data';
      default:
        return 'Cancel and retry';
    }
  }

  private async provideUserFeedback(
    errorDetails: RecruitmentErrorDetails,
    recoveryResult: RecruitmentErrorRecoveryResult
  ): Promise<void> {
    if (!this.config.showUserMessages) {
      return;
    }

    // Determine message type
    const messageType = this.getMessageType(errorDetails.error);

    // Create user-friendly message
    const userMessage = this.createUserMessage(errorDetails, recoveryResult);

    // Show message to user
    this.userFeedback.showRecruitmentErrorMessage(
      userMessage,
      messageType,
      this.config.messageDuration
    );

    // Show guidance if needed
    if (
      recoveryResult.userGuidance &&
      recoveryResult.requiresUserAction &&
      this.config.showRecruitmentHints
    ) {
      this.userFeedback.showRecruitmentGuidance(recoveryResult.userGuidance);
    }

    // Highlight error on target if applicable
    if (errorDetails.context.target && this.config.enableErrorAnimations) {
      this.userFeedback.highlightRecruitmentError(errorDetails.context.target, errorDetails.error);
    }

    // Play error sound if enabled
    if (this.config.enableErrorSounds) {
      this.playErrorSound(messageType);
    }
  }

  private getMessageType(error: RecruitmentError): 'error' | 'warning' | 'info' {
    if (
      [
        RecruitmentError.SYSTEM_ERROR,
        RecruitmentError.DATA_CORRUPTION,
        RecruitmentError.NPC_ALREADY_DEFEATED,
      ].includes(error)
    ) {
      return 'error';
    }

    if (error === RecruitmentError.INVALID_STAGE) {
      return 'info';
    }

    return 'warning';
  }

  private createUserMessage(
    errorDetails: RecruitmentErrorDetails,
    recoveryResult: RecruitmentErrorRecoveryResult
  ): string {
    const baseMessage = this.getDefaultErrorMessage(errorDetails.error);

    if (recoveryResult.requiresUserAction && recoveryResult.userGuidance) {
      return `${baseMessage}. ${recoveryResult.userGuidance}`;
    }

    return baseMessage;
  }

  private createUserFeedbackInterface(): RecruitmentUserFeedbackInterface {
    return {
      showRecruitmentErrorMessage: (
        message: string,
        type: 'error' | 'warning' | 'info',
        duration?: number
      ) => {
        this.showRecruitmentErrorMessage(message, type, duration);
      },
      showRecruitmentGuidance: (message: string, conditions?: string[], position?: Position) => {
        this.showRecruitmentGuidance(message, conditions, position);
      },
      showRecruitmentConfirmDialog: (
        message: string,
        onConfirm: () => void,
        onCancel: () => void
      ) => {
        this.showRecruitmentConfirmDialog(message, onConfirm, onCancel);
      },
      highlightRecruitmentError: (unit: Unit, errorType: RecruitmentError) => {
        this.highlightRecruitmentError(unit, errorType);
      },
      clearRecruitmentMessages: () => {
        this.clearRecruitmentErrorUI();
      },
      showRecruitmentProgressError: (unit: Unit, progress: number, errorMessage: string) => {
        this.showRecruitmentProgressError(unit, progress, errorMessage);
      },
    };
  }

  private initializeUI(): void {
    if (!this.scene) return;

    // Create error container
    this.errorContainer = this.scene.add.container(0, 0);
    this.errorContainer.setDepth(1000); // High depth for visibility

    // Create error text
    this.errorText = this.scene.add.text(0, 0, '', {
      fontSize: '16px',
      color: '#ff0000',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 },
    });

    this.errorContainer.add(this.errorText);
    this.errorContainer.setVisible(false);
  }

  private showRecruitmentErrorMessage(
    message: string,
    type: 'error' | 'warning' | 'info',
    duration?: number
  ): void {
    if (!this.scene || !this.errorText) return;

    // Set color based on type
    const colors = {
      error: '#ff0000',
      warning: '#ffaa00',
      info: '#0088ff',
    };

    this.errorText.setColor(colors[type]);
    this.errorText.setText(message);

    // Position at top center of screen
    const camera = this.scene.cameras.main;
    this.errorContainer?.setPosition(camera.centerX, camera.y + 50);
    this.errorContainer?.setVisible(true);

    // Auto-hide after duration
    if (this.config.autoDismissErrors && duration) {
      this.scene.time.delayedCall(duration, () => {
        this.errorContainer?.setVisible(false);
      });
    }
  }

  private showRecruitmentGuidance(
    message: string,
    conditions?: string[],
    position?: Position
  ): void {
    // Implementation would show guidance tooltip
    console.log('[Recruitment Guidance]', message, conditions);
  }

  private showRecruitmentConfirmDialog(
    message: string,
    onConfirm: () => void,
    onCancel: () => void
  ): void {
    // Implementation would show confirmation dialog
    console.log('[Recruitment Confirm]', message);
    // For now, auto-confirm
    onConfirm();
  }

  private highlightRecruitmentError(unit: Unit, errorType: RecruitmentError): void {
    if (!this.scene) return;

    // Create error highlight
    const highlight = this.scene.add.graphics();
    highlight.lineStyle(3, 0xff0000, 1);
    highlight.strokeCircle(unit.position.x * 32, unit.position.y * 32, 20);

    this.errorHighlights.set(unit.id, highlight);

    // Remove highlight after delay
    this.scene.time.delayedCall(2000, () => {
      highlight.destroy();
      this.errorHighlights.delete(unit.id);
    });
  }

  private showRecruitmentProgressError(unit: Unit, progress: number, errorMessage: string): void {
    // Implementation would show progress with error indication
    console.log('[Recruitment Progress Error]', unit.name, progress, errorMessage);
  }

  private clearRecruitmentErrorUI(): void {
    this.errorContainer?.setVisible(false);
    this.clearErrorHighlights();
  }

  private clearErrorHighlights(): void {
    this.errorHighlights.forEach(highlight => highlight.destroy());
    this.errorHighlights.clear();
  }

  private clearRecruitmentVisualEffects(): void {
    // Clear any recruitment-specific visual effects
    this.clearErrorHighlights();
  }

  private resetRecruitmentUnitState(unit: Unit): void {
    // Reset any temporary recruitment-related state on the unit
    // This would be implemented based on the specific unit state structure
  }

  private playErrorSound(type: 'error' | 'warning' | 'info'): void {
    if (!this.scene) return;

    // Play appropriate sound based on error type
    const soundKeys = {
      error: 'error_sound',
      warning: 'warning_sound',
      info: 'info_sound',
    };

    // This would play the actual sound if audio assets are loaded
    console.log(`[Audio] Playing ${type} sound: ${soundKeys[type]}`);
  }
}

/**
 * Convenience function to handle recruitment errors
 */
export function handleRecruitmentError(
  error: RecruitmentError,
  context: RecruitmentContext,
  message?: string,
  handler?: RecruitmentErrorHandler
): Promise<RecruitmentErrorRecoveryResult> {
  if (handler) {
    return handler.handleRecruitmentError(error, context, message);
  }

  // Create temporary handler if none provided
  const tempHandler = new RecruitmentErrorHandler();
  return tempHandler.handleRecruitmentError(error, context, message);
}

/**
 * Convenience function to create recruitment error details
 */
export function createRecruitmentErrorDetails(
  error: RecruitmentError,
  context: RecruitmentContext,
  message?: string
): RecruitmentErrorDetails {
  return RecruitmentUtils.createErrorDetails(
    error,
    message || `Recruitment error: ${error}`,
    context,
    true, // Most recruitment errors are recoverable
    'Cancel and retry'
  );
}
