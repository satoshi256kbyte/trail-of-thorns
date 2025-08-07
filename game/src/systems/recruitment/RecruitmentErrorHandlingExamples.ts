/**
 * RecruitmentErrorHandling Examples and Usage Guide
 *
 * This file provides examples of how to use the recruitment error handling system
 * and demonstrates best practices for error recovery and user feedback.
 */

import { RecruitmentErrorHandler, RecruitmentErrorRecoveryResult } from './RecruitmentErrorHandler';
import { RecruitmentSystem } from './RecruitmentSystem';
import { RecruitmentUI } from './RecruitmentUI';
import {
  RecruitmentError,
  RecruitmentContext,
  RecruitmentResult,
  RecruitmentAction,
} from '../../types/recruitment';
import { Unit, StageData } from '../../types/gameplay';

/**
 * Example 1: Basic Error Handling Setup
 *
 * Shows how to set up the recruitment error handling system
 * with proper configuration and integration.
 */
export class BasicRecruitmentErrorHandlingExample {
  private scene: Phaser.Scene;
  private recruitmentSystem: RecruitmentSystem;
  private errorHandler: RecruitmentErrorHandler;
  private recruitmentUI: RecruitmentUI;
  private eventEmitter: Phaser.Events.EventEmitter;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.eventEmitter = new Phaser.Events.EventEmitter();

    // Initialize recruitment system with error handling
    this.recruitmentSystem = new RecruitmentSystem(
      scene,
      {
        enableRecruitment: true,
        maxNPCsPerStage: 3,
        autoShowConditions: true,
      },
      this.eventEmitter
    );

    // Get the integrated error handler
    this.errorHandler = this.recruitmentSystem.getErrorHandler();

    // Configure error handler
    this.errorHandler.updateConfig({
      showUserMessages: true,
      messageDuration: 3000,
      showRecruitmentHints: true,
      enableErrorAnimations: true,
      enableErrorSounds: true,
    });

    // Initialize UI with error handler integration
    this.recruitmentUI = new RecruitmentUI(
      scene,
      {
        showConditions: true,
        showProgress: true,
        enableSoundEffects: true,
      },
      this.eventEmitter,
      this.errorHandler
    );

    // Set up error event listeners
    this.setupErrorEventListeners();
  }

  private setupErrorEventListeners(): void {
    // Listen for error handling events
    this.eventEmitter.on(
      'recruitment-error-handled',
      (data: {
        error: RecruitmentError;
        context: RecruitmentContext;
        recoveryResult: RecruitmentErrorRecoveryResult;
      }) => {
        console.log(`Recruitment error handled: ${data.error}`, data.recoveryResult);

        // Custom logic based on error type
        switch (data.error) {
          case RecruitmentError.INVALID_TARGET:
            this.handleInvalidTargetError(data.context, data.recoveryResult);
            break;
          case RecruitmentError.CONDITIONS_NOT_MET:
            this.handleConditionsNotMetError(data.context, data.recoveryResult);
            break;
          case RecruitmentError.NPC_ALREADY_DEFEATED:
            this.handleNPCDefeatedError(data.context, data.recoveryResult);
            break;
        }
      }
    );

    // Listen for cancel requests
    this.eventEmitter.on(
      'recruitment-cancel-requested',
      (data: { error: RecruitmentError; context: RecruitmentContext }) => {
        console.log(`Recruitment cancelled due to: ${data.error}`);
        this.cancelCurrentRecruitmentAction();
      }
    );

    // Listen for reset requests
    this.eventEmitter.on(
      'recruitment-reset-requested',
      (data: { error: RecruitmentError; context: RecruitmentContext }) => {
        console.log(`Recruitment system reset due to: ${data.error}`);
        this.resetRecruitmentSystem();
      }
    );

    // Listen for cleanup requests
    this.eventEmitter.on(
      'recruitment-cleanup-requested',
      (data: { error: RecruitmentError; context: RecruitmentContext }) => {
        console.log(`Recruitment cleanup requested due to: ${data.error}`);
        this.cleanupFailedRecruitment(data.context);
      }
    );
  }

  private handleInvalidTargetError(
    context: RecruitmentContext,
    recovery: RecruitmentErrorRecoveryResult
  ): void {
    // Show guidance to help player select valid targets
    this.recruitmentUI.showRecruitmentGuidance(
      'Select a character with a recruitment indicator to attempt recruitment.',
      ['Look for the crown icon above recruitable characters'],
      context.target.position
    );

    // Highlight valid recruitment targets
    this.highlightValidRecruitmentTargets();
  }

  private handleConditionsNotMetError(
    context: RecruitmentContext,
    recovery: RecruitmentErrorRecoveryResult
  ): void {
    // Show current progress and remaining conditions
    const progress = this.recruitmentSystem.getRecruitmentProgress(context.target, context);
    if (progress) {
      this.recruitmentUI.showRecruitmentProgressError(
        context.target,
        progress.overallProgress,
        'Some recruitment conditions are not yet satisfied.'
      );
    }

    // Show detailed condition guidance
    const conditions = this.recruitmentSystem.getRecruitmentConditions(context.target);
    const conditionDescriptions = conditions.map(c => c.description);

    this.recruitmentUI.showRecruitmentGuidance(
      'Complete all recruitment conditions before attempting to recruit this character.',
      conditionDescriptions,
      context.target.position
    );
  }

  private handleNPCDefeatedError(
    context: RecruitmentContext,
    recovery: RecruitmentErrorRecoveryResult
  ): void {
    // Show failure notification
    this.recruitmentUI.showRecruitmentFailure(
      context.target,
      'Recruitment failed - the character was defeated before stage completion.'
    );

    // Update UI to reflect failed recruitment
    this.recruitmentUI.hideNPCIndicator(context.target);

    // Log the failure for statistics
    console.log(`Recruitment failed for ${context.target.name} - NPC was defeated`);
  }

  private cancelCurrentRecruitmentAction(): void {
    // Clear any active recruitment UI
    this.recruitmentUI.clearRecruitmentMessages();

    // Reset selection state (this would integrate with game state manager)
    console.log('Cancelling current recruitment action');
  }

  private resetRecruitmentSystem(): void {
    // Perform comprehensive system reset
    this.errorHandler.resetStatistics();
    this.errorHandler.clearErrorHistory();

    // Reinitialize if needed
    console.log('Resetting recruitment system');
  }

  private cleanupFailedRecruitment(context: RecruitmentContext): void {
    // Clean up any resources related to the failed recruitment
    this.recruitmentUI.hideNPCIndicator(context.target);
    this.recruitmentUI.clearRecruitmentMessages();

    console.log(`Cleaning up failed recruitment for ${context.target.name}`);
  }

  private highlightValidRecruitmentTargets(): void {
    // This would highlight all valid recruitment targets on the map
    const recruitableIds = this.recruitmentSystem.getRecruitableCharacterIds();
    console.log('Highlighting valid recruitment targets:', recruitableIds);
  }
}

/**
 * Example 2: Advanced Error Recovery Patterns
 *
 * Demonstrates advanced error recovery patterns and retry mechanisms.
 */
export class AdvancedRecruitmentErrorRecoveryExample {
  private recruitmentSystem: RecruitmentSystem;
  private errorHandler: RecruitmentErrorHandler;
  private retryAttempts: Map<string, number> = new Map();
  private maxRetryAttempts: number = 3;

  constructor(recruitmentSystem: RecruitmentSystem) {
    this.recruitmentSystem = recruitmentSystem;
    this.errorHandler = recruitmentSystem.getErrorHandler();
  }

  /**
   * Attempt recruitment with automatic retry on recoverable errors
   */
  async attemptRecruitmentWithRetry(
    attacker: Unit,
    target: Unit,
    damage: number,
    currentTurn: number
  ): Promise<RecruitmentResult> {
    const retryKey = `${attacker.id}-${target.id}`;
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;

    try {
      // Attempt recruitment
      const result = await this.recruitmentSystem.processRecruitmentAttempt(
        attacker,
        target,
        damage,
        undefined,
        currentTurn
      );

      // If successful, clear retry counter
      if (result.success) {
        this.retryAttempts.delete(retryKey);
        return result;
      }

      // Handle error based on type and retry count
      if (result.error && this.shouldRetry(result.error, currentAttempts)) {
        console.log(`Retrying recruitment attempt ${currentAttempts + 1}/${this.maxRetryAttempts}`);

        // Increment retry counter
        this.retryAttempts.set(retryKey, currentAttempts + 1);

        // Wait before retry
        await this.waitForRetry(currentAttempts);

        // Recursive retry
        return this.attemptRecruitmentWithRetry(attacker, target, damage, currentTurn);
      }

      // Max retries reached or non-recoverable error
      this.retryAttempts.delete(retryKey);
      return result;
    } catch (error) {
      // Handle unexpected errors
      const errorResult = await this.errorHandler.handleRecruitmentError(
        RecruitmentError.SYSTEM_ERROR,
        {
          attacker,
          target,
          damage,
          turn: currentTurn,
          alliedUnits: [],
          enemyUnits: [],
          npcUnits: [],
        },
        `Unexpected error during recruitment: ${error instanceof Error ? error.message : String(error)}`
      );

      return {
        success: false,
        conditionsMet: [],
        nextAction: RecruitmentAction.RECRUITMENT_FAILED,
        error: RecruitmentError.SYSTEM_ERROR,
        message: errorResult.message,
      };
    }
  }

  private shouldRetry(error: RecruitmentError, currentAttempts: number): boolean {
    // Don't retry if max attempts reached
    if (currentAttempts >= this.maxRetryAttempts) {
      return false;
    }

    // Only retry on specific recoverable errors
    const retryableErrors = [RecruitmentError.SYSTEM_ERROR, RecruitmentError.DATA_CORRUPTION];

    return retryableErrors.includes(error);
  }

  private async waitForRetry(attemptNumber: number): Promise<void> {
    // Exponential backoff: 1s, 2s, 4s, etc.
    const delay = Math.pow(2, attemptNumber) * 1000;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Batch recruitment with error handling
   */
  async attemptBatchRecruitment(
    recruitmentAttempts: Array<{
      attacker: Unit;
      target: Unit;
      damage: number;
    }>,
    currentTurn: number
  ): Promise<{
    successful: RecruitmentResult[];
    failed: Array<{ attempt: any; error: RecruitmentError; message: string }>;
  }> {
    const successful: RecruitmentResult[] = [];
    const failed: Array<{ attempt: any; error: RecruitmentError; message: string }> = [];

    for (const attempt of recruitmentAttempts) {
      try {
        const result = await this.attemptRecruitmentWithRetry(
          attempt.attacker,
          attempt.target,
          attempt.damage,
          currentTurn
        );

        if (result.success) {
          successful.push(result);
        } else {
          failed.push({
            attempt,
            error: result.error || RecruitmentError.SYSTEM_ERROR,
            message: result.message || 'Unknown error',
          });
        }
      } catch (error) {
        failed.push({
          attempt,
          error: RecruitmentError.SYSTEM_ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { successful, failed };
  }
}

/**
 * Example 3: Error Monitoring and Analytics
 *
 * Shows how to monitor and analyze recruitment errors for debugging and improvement.
 */
export class RecruitmentErrorMonitoringExample {
  private errorHandler: RecruitmentErrorHandler;
  private errorAnalytics: {
    errorFrequency: Map<RecruitmentError, number>;
    errorTrends: Array<{ timestamp: number; error: RecruitmentError; context: string }>;
    userImpact: Map<string, number>; // User ID -> error count
  };

  constructor(errorHandler: RecruitmentErrorHandler) {
    this.errorHandler = errorHandler;
    this.errorAnalytics = {
      errorFrequency: new Map(),
      errorTrends: [],
      userImpact: new Map(),
    };

    this.setupErrorMonitoring();
  }

  private setupErrorMonitoring(): void {
    // Monitor error events
    this.errorHandler.on(
      'recruitment-error-handled',
      (data: {
        error: RecruitmentError;
        context: RecruitmentContext;
        recoveryResult: RecruitmentErrorRecoveryResult;
      }) => {
        this.recordError(data.error, data.context, data.recoveryResult);
      }
    );

    // Periodic analysis
    setInterval(() => {
      this.analyzeErrorTrends();
    }, 60000); // Every minute
  }

  private recordError(
    error: RecruitmentError,
    context: RecruitmentContext,
    recovery: RecruitmentErrorRecoveryResult
  ): void {
    // Update frequency tracking
    const currentCount = this.errorAnalytics.errorFrequency.get(error) || 0;
    this.errorAnalytics.errorFrequency.set(error, currentCount + 1);

    // Record trend data
    this.errorAnalytics.errorTrends.push({
      timestamp: Date.now(),
      error,
      context: `${context.attacker?.name || 'unknown'} -> ${context.target?.name || 'unknown'}`,
    });

    // Track user impact (if user ID available)
    const userId = (context as any).userId || 'anonymous';
    const userErrorCount = this.errorAnalytics.userImpact.get(userId) || 0;
    this.errorAnalytics.userImpact.set(userId, userErrorCount + 1);

    // Log critical errors immediately
    if (!recovery.recoverable) {
      console.error(`Critical recruitment error: ${error}`, {
        context,
        recovery,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private analyzeErrorTrends(): void {
    const stats = this.errorHandler.getStatistics();
    const recentErrors = this.getRecentErrors(300000); // Last 5 minutes

    // Check for error spikes
    if (recentErrors.length > 10) {
      console.warn(`High error rate detected: ${recentErrors.length} errors in last 5 minutes`);
      this.alertHighErrorRate(recentErrors);
    }

    // Check for new error patterns
    const errorTypes = new Set(recentErrors.map(e => e.error));
    if (errorTypes.size > 3) {
      console.warn('Multiple error types detected, possible system instability');
    }

    // Check for user impact
    const affectedUsers = Array.from(this.errorAnalytics.userImpact.entries()).filter(
      ([_, count]) => count > 5
    ).length;

    if (affectedUsers > 0) {
      console.warn(`${affectedUsers} users experiencing high error rates`);
    }
  }

  private getRecentErrors(timeWindowMs: number): Array<{
    timestamp: number;
    error: RecruitmentError;
    context: string;
  }> {
    const cutoff = Date.now() - timeWindowMs;
    return this.errorAnalytics.errorTrends.filter(e => e.timestamp > cutoff);
  }

  private alertHighErrorRate(
    recentErrors: Array<{
      timestamp: number;
      error: RecruitmentError;
      context: string;
    }>
  ): void {
    // Group errors by type
    const errorGroups = new Map<RecruitmentError, number>();
    recentErrors.forEach(e => {
      errorGroups.set(e.error, (errorGroups.get(e.error) || 0) + 1);
    });

    // Find most common error
    let mostCommonError: RecruitmentError | null = null;
    let maxCount = 0;
    errorGroups.forEach((count, error) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonError = error;
      }
    });

    if (mostCommonError) {
      console.error(`Error spike alert: ${mostCommonError} occurred ${maxCount} times`, {
        totalErrors: recentErrors.length,
        timeWindow: '5 minutes',
        errorBreakdown: Object.fromEntries(errorGroups),
      });
    }
  }

  /**
   * Generate error report for debugging
   */
  generateErrorReport(): {
    summary: {
      totalErrors: number;
      errorsByType: Record<string, number>;
      mostCommonError: string | null;
      criticalErrors: number;
      recoveryRate: number;
    };
    recentTrends: Array<{ timestamp: number; error: RecruitmentError; context: string }>;
    userImpact: Array<{ userId: string; errorCount: number }>;
    recommendations: string[];
  } {
    const stats = this.errorHandler.getStatistics();
    const recentErrors = this.getRecentErrors(3600000); // Last hour

    // Calculate recovery rate
    const recoveryRate =
      stats.totalErrors > 0 ? (stats.recoveredErrors / stats.totalErrors) * 100 : 100;

    // Generate recommendations
    const recommendations: string[] = [];

    if (stats.errorsByType[RecruitmentError.INVALID_TARGET] > stats.totalErrors * 0.5) {
      recommendations.push('Consider improving UI indicators for recruitable characters');
    }

    if (stats.errorsByType[RecruitmentError.CONDITIONS_NOT_MET] > stats.totalErrors * 0.3) {
      recommendations.push('Consider showing recruitment conditions more prominently');
    }

    if (stats.criticalErrors > 0) {
      recommendations.push('Investigate system stability issues causing critical errors');
    }

    if (recoveryRate < 80) {
      recommendations.push('Improve error recovery mechanisms');
    }

    return {
      summary: {
        totalErrors: stats.totalErrors,
        errorsByType: stats.errorsByType as Record<string, number>,
        mostCommonError: stats.mostCommonError || null,
        criticalErrors: stats.criticalErrors,
        recoveryRate,
      },
      recentTrends: recentErrors,
      userImpact: Array.from(this.errorAnalytics.userImpact.entries())
        .map(([userId, errorCount]) => ({ userId, errorCount }))
        .sort((a, b) => b.errorCount - a.errorCount),
      recommendations,
    };
  }
}

/**
 * Example 4: Custom Error Recovery Strategies
 *
 * Shows how to implement custom error recovery strategies for specific game scenarios.
 */
export class CustomRecruitmentErrorRecoveryExample {
  private recruitmentSystem: RecruitmentSystem;
  private errorHandler: RecruitmentErrorHandler;

  constructor(recruitmentSystem: RecruitmentSystem) {
    this.recruitmentSystem = recruitmentSystem;
    this.errorHandler = recruitmentSystem.getErrorHandler();
  }

  /**
   * Custom recovery strategy for tutorial stages
   */
  async handleTutorialRecruitmentError(
    error: RecruitmentError,
    context: RecruitmentContext
  ): Promise<RecruitmentErrorRecoveryResult> {
    switch (error) {
      case RecruitmentError.CONDITIONS_NOT_MET:
        return this.handleTutorialConditionsNotMet(context);

      case RecruitmentError.INVALID_TARGET:
        return this.handleTutorialInvalidTarget(context);

      default:
        return this.errorHandler.handleSpecificRecruitmentError(error, context);
    }
  }

  private async handleTutorialConditionsNotMet(
    context: RecruitmentContext
  ): Promise<RecruitmentErrorRecoveryResult> {
    // In tutorial, provide step-by-step guidance
    const conditions = this.recruitmentSystem.getRecruitmentConditions(context.target);
    const progress = this.recruitmentSystem.getRecruitmentProgress(context.target, context);

    if (progress) {
      // Show detailed tutorial guidance
      const unmetConditions = conditions.filter((_, index) => !progress.conditionProgress[index]);
      const nextCondition = unmetConditions[0];

      if (nextCondition) {
        // Provide specific tutorial instruction
        const tutorialMessage = this.generateTutorialMessage(nextCondition);

        // Show tutorial popup (this would integrate with tutorial system)
        console.log(`Tutorial guidance: ${tutorialMessage}`);
      }
    }

    return {
      success: true,
      action: 'cancel',
      message: 'Tutorial guidance provided for recruitment conditions',
      requiresUserAction: true,
      userGuidance: 'Follow the tutorial instructions to complete the recruitment conditions',
      stateModified: false,
      recoverable: true,
    };
  }

  private async handleTutorialInvalidTarget(
    context: RecruitmentContext
  ): Promise<RecruitmentErrorRecoveryResult> {
    // In tutorial, highlight the correct target
    const recruitableIds = this.recruitmentSystem.getRecruitableCharacterIds();

    if (recruitableIds.length > 0) {
      // Show tutorial arrow pointing to correct target
      console.log(`Tutorial: Point to recruitable character ${recruitableIds[0]}`);
    }

    return {
      success: true,
      action: 'cancel',
      message: 'Tutorial guidance provided for target selection',
      requiresUserAction: true,
      userGuidance: 'Select the highlighted character to attempt recruitment',
      stateModified: false,
      recoverable: true,
    };
  }

  private generateTutorialMessage(condition: any): string {
    switch (condition.type) {
      case 'specific_attacker':
        return `Use ${condition.parameters.attackerId} to attack this character`;
      case 'hp_threshold':
        return `Reduce the character's HP to ${condition.parameters.threshold * 100}% or below`;
      case 'damage_type':
        return `Use ${condition.parameters.damageType} damage to attack`;
      default:
        return 'Complete the recruitment condition as shown';
    }
  }

  /**
   * Custom recovery strategy for competitive multiplayer
   */
  async handleMultiplayerRecruitmentError(
    error: RecruitmentError,
    context: RecruitmentContext,
    playerId: string
  ): Promise<RecruitmentErrorRecoveryResult> {
    // In multiplayer, errors might need different handling
    switch (error) {
      case RecruitmentError.SYSTEM_ERROR:
        // In multiplayer, system errors might need to sync with other players
        return this.handleMultiplayerSystemError(context, playerId);

      case RecruitmentError.INVALID_TARGET:
        // In multiplayer, target might have been recruited by another player
        return this.handleMultiplayerTargetConflict(context, playerId);

      default:
        return this.errorHandler.handleSpecificRecruitmentError(error, context);
    }
  }

  private async handleMultiplayerSystemError(
    context: RecruitmentContext,
    playerId: string
  ): Promise<RecruitmentErrorRecoveryResult> {
    // Notify other players of system error
    console.log(`Multiplayer system error for player ${playerId}, notifying other players`);

    // Attempt to resync game state
    // This would integrate with multiplayer synchronization system

    return {
      success: false,
      action: 'reset',
      message: 'Multiplayer synchronization error, attempting to resync',
      requiresUserAction: true,
      userGuidance: 'Please wait while the game resyncs with other players',
      stateModified: true,
      recoverable: false,
    };
  }

  private async handleMultiplayerTargetConflict(
    context: RecruitmentContext,
    playerId: string
  ): Promise<RecruitmentErrorRecoveryResult> {
    // Check if target was recruited by another player
    console.log(`Checking if ${context.target.name} was recruited by another player`);

    return {
      success: true,
      action: 'cancel',
      message: 'This character may have been recruited by another player',
      requiresUserAction: true,
      userGuidance: 'Select a different character or wait for game state to update',
      stateModified: false,
      recoverable: true,
    };
  }
}

/**
 * Usage Examples Summary
 *
 * These examples demonstrate:
 * 1. Basic setup and configuration of the error handling system
 * 2. Advanced retry mechanisms and recovery patterns
 * 3. Error monitoring and analytics for system improvement
 * 4. Custom recovery strategies for different game modes
 *
 * Key principles:
 * - Always handle errors gracefully without breaking game flow
 * - Provide clear user feedback and guidance
 * - Log errors for debugging and improvement
 * - Implement appropriate recovery strategies based on error type
 * - Monitor error patterns to identify system issues
 * - Customize error handling for different game contexts (tutorial, multiplayer, etc.)
 */
