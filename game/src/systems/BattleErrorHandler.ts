/**
 * BattleErrorHandler - Comprehensive error handling system for battle operations
 * 
 * This class provides centralized error handling for all battle system operations,
 * including error classification, recovery mechanisms, user feedback, and state cleanup.
 * 
 * Implements requirements 2.5, 5.1, and error handling for all battle system requirements
 */

import * as Phaser from 'phaser';
import { Unit, Position } from '../types/gameplay';
import {
    BattleError,
    BattleContext,
    BattleErrorDetails,
    Weapon
} from '../types/battle';

/**
 * Error recovery result indicating the outcome of error handling
 */
export interface ErrorRecoveryResult {
    /** Whether the error was successfully handled */
    success: boolean;
    /** Recovery action that was taken */
    action: 'retry' | 'cancel' | 'reset' | 'ignore' | 'fallback';
    /** Message describing the recovery action */
    message: string;
    /** Whether the user needs to take additional action */
    requiresUserAction: boolean;
    /** Suggested next steps for the user */
    userGuidance?: string;
    /** Whether the battle system state was modified */
    stateModified: boolean;
}

/**
 * Error notification configuration
 */
export interface ErrorNotificationConfig {
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
}

/**
 * Error statistics for monitoring and debugging
 */
export interface ErrorStatistics {
    /** Total number of errors encountered */
    totalErrors: number;
    /** Errors by type */
    errorsByType: Record<BattleError, number>;
    /** Successfully recovered errors */
    recoveredErrors: number;
    /** Critical errors that required reset */
    criticalErrors: number;
    /** User-initiated cancellations */
    userCancellations: number;
    /** Last error timestamp */
    lastErrorTime: number;
}

/**
 * User feedback interface for error notifications
 */
export interface UserFeedbackInterface {
    /** Show error message to user */
    showErrorMessage(message: string, type: 'error' | 'warning' | 'info', duration?: number): void;
    /** Show confirmation dialog */
    showConfirmDialog(message: string, onConfirm: () => void, onCancel: () => void): void;
    /** Show guidance tooltip */
    showGuidance(message: string, position?: Position): void;
    /** Clear all error messages */
    clearMessages(): void;
}

/**
 * Comprehensive battle error handler
 */
export class BattleErrorHandler extends Phaser.Events.EventEmitter {
    private scene: Phaser.Scene;
    private config: ErrorNotificationConfig;
    private statistics: ErrorStatistics;
    private userFeedback: UserFeedbackInterface;
    private errorHistory: BattleErrorDetails[] = [];
    private maxHistorySize: number = 100;

    // UI elements for error display
    private errorContainer: Phaser.GameObjects.Container | null = null;
    private errorText: Phaser.GameObjects.Text | null = null;
    private guidanceTooltip: Phaser.GameObjects.Container | null = null;

    // Default configuration
    private static readonly DEFAULT_CONFIG: ErrorNotificationConfig = {
        showUserMessages: true,
        messageDuration: 3000,
        showDetailedErrors: false,
        enableErrorSounds: true,
        autoDismissErrors: true
    };

    /**
     * Creates a new BattleErrorHandler instance
     * @param scene - Phaser scene for UI rendering
     * @param config - Error notification configuration
     */
    constructor(scene: Phaser.Scene, config?: Partial<ErrorNotificationConfig>) {
        super();

        this.scene = scene;
        this.config = { ...BattleErrorHandler.DEFAULT_CONFIG, ...config };

        // Initialize statistics
        this.statistics = {
            totalErrors: 0,
            errorsByType: {} as Record<BattleError, number>,
            recoveredErrors: 0,
            criticalErrors: 0,
            userCancellations: 0,
            lastErrorTime: 0
        };

        // Initialize all error types in statistics
        Object.values(BattleError).forEach(errorType => {
            this.statistics.errorsByType[errorType] = 0;
        });

        // Create user feedback interface
        this.userFeedback = this.createUserFeedbackInterface();

        // Initialize UI elements
        this.initializeUI();
    }

    /**
     * Handle a battle error with comprehensive recovery mechanisms
     * @param error - Type of battle error
     * @param context - Battle context when error occurred
     * @param message - Detailed error message
     * @returns Promise resolving to recovery result
     */
    public async handleError(
        error: BattleError,
        context: BattleContext,
        message?: string
    ): Promise<ErrorRecoveryResult> {
        try {
            // Update statistics
            this.updateStatistics(error);

            // Create error details
            const errorDetails = this.createErrorDetails(error, context, message);

            // Add to history
            this.addToHistory(errorDetails);

            // Log error for debugging
            this.logError(errorDetails);

            // Determine recovery strategy
            const recoveryStrategy = this.determineRecoveryStrategy(error, context);

            // Execute recovery
            const recoveryResult = await this.executeRecovery(recoveryStrategy, errorDetails);

            // Provide user feedback
            await this.provideUserFeedback(errorDetails, recoveryResult);

            // Emit error handled event
            this.emit('error-handled', {
                error,
                context,
                recoveryResult,
                errorDetails
            });

            return recoveryResult;

        } catch (handlingError) {
            // Critical error in error handling itself
            console.error('Critical error in BattleErrorHandler:', handlingError);

            const fallbackResult: ErrorRecoveryResult = {
                success: false,
                action: 'reset',
                message: 'Critical error in error handling, forcing system reset',
                requiresUserAction: true,
                userGuidance: 'The battle system encountered a critical error and needs to be reset',
                stateModified: true
            };

            this.statistics.criticalErrors++;
            this.emit('critical-error', { originalError: error, handlingError, context });

            return fallbackResult;
        }
    }

    /**
     * Handle specific error types with targeted recovery
     * @param error - Battle error type
     * @param context - Battle context
     * @returns Recovery result
     */
    public handleSpecificError(error: BattleError, context: BattleContext): ErrorRecoveryResult {
        switch (error) {
            case BattleError.INVALID_ATTACKER:
                return this.handleInvalidAttacker(context);

            case BattleError.INVALID_TARGET:
                return this.handleInvalidTarget(context);

            case BattleError.OUT_OF_RANGE:
                return this.handleOutOfRange(context);

            case BattleError.ALREADY_ACTED:
                return this.handleAlreadyActed(context);

            case BattleError.INSUFFICIENT_MP:
                return this.handleInsufficientMP(context);

            case BattleError.WEAPON_BROKEN:
                return this.handleWeaponBroken(context);

            case BattleError.TARGET_UNREACHABLE:
                return this.handleTargetUnreachable(context);

            case BattleError.NO_WEAPON_EQUIPPED:
                return this.handleNoWeaponEquipped(context);

            case BattleError.BATTLE_SYSTEM_ERROR:
                return this.handleBattleSystemError(context);

            case BattleError.ANIMATION_FAILED:
                return this.handleAnimationFailed(context);

            case BattleError.DAMAGE_CALCULATION_ERROR:
                return this.handleDamageCalculationError(context);

            default:
                return this.handleUnknownError(error, context);
        }
    }

    /**
     * Provide user guidance for error resolution
     * @param error - Battle error type
     * @param context - Battle context
     * @returns User guidance message
     */
    public getUserGuidance(error: BattleError, context: BattleContext): string {
        switch (error) {
            case BattleError.INVALID_ATTACKER:
                return 'Select a different unit that can attack, or wait for the current unit to recover.';

            case BattleError.INVALID_TARGET:
                return 'Select a valid enemy target within your attack range.';

            case BattleError.OUT_OF_RANGE:
                return 'Move closer to your target or select a target within range.';

            case BattleError.ALREADY_ACTED:
                return 'This unit has already acted this turn. Select a different unit or end your turn.';

            case BattleError.INSUFFICIENT_MP:
                return 'This unit does not have enough MP for this action. Use a different skill or wait to recover MP.';

            case BattleError.WEAPON_BROKEN:
                return 'This weapon is broken and cannot be used. Equip a different weapon or repair this one.';

            case BattleError.TARGET_UNREACHABLE:
                return 'The target cannot be reached due to obstacles. Find a different position or target.';

            case BattleError.NO_WEAPON_EQUIPPED:
                return 'This unit has no weapon equipped. Equip a weapon before attempting to attack.';

            case BattleError.BATTLE_SYSTEM_ERROR:
                return 'A system error occurred. Try canceling the current action and starting over.';

            case BattleError.ANIMATION_FAILED:
                return 'Battle animation failed to play. The battle will continue without animation.';

            case BattleError.DAMAGE_CALCULATION_ERROR:
                return 'Damage calculation failed. The battle will be recalculated.';

            default:
                return 'An unexpected error occurred. Try canceling the current action and starting over.';
        }
    }

    /**
     * Clean up battle state after error
     * @param context - Battle context to clean up
     * @returns Cleanup result
     */
    public cleanupBattleState(context: BattleContext): { success: boolean; message: string } {
        try {
            // Clear any ongoing animations
            this.scene.tweens.killAll();

            // Clear visual effects (this would be implemented with actual graphics objects)
            this.clearVisualEffects();

            // Reset any temporary state modifications
            if (context.attacker) {
                // Reset attacker state if needed
                this.resetUnitState(context.attacker);
            }

            if (context.target) {
                // Reset target state if needed
                this.resetUnitState(context.target);
            }

            // Clear any UI overlays
            this.clearErrorUI();

            return {
                success: true,
                message: 'Battle state cleaned up successfully'
            };

        } catch (error) {
            console.error('Error during battle state cleanup:', error);
            return {
                success: false,
                message: `Cleanup failed: ${error.message}`
            };
        }
    }

    /**
     * Get error statistics for monitoring
     * @returns Current error statistics
     */
    public getStatistics(): ErrorStatistics {
        return { ...this.statistics };
    }

    /**
     * Reset error statistics
     */
    public resetStatistics(): void {
        this.statistics = {
            totalErrors: 0,
            errorsByType: {} as Record<BattleError, number>,
            recoveredErrors: 0,
            criticalErrors: 0,
            userCancellations: 0,
            lastErrorTime: 0
        };

        // Reinitialize error type counters
        Object.values(BattleError).forEach(errorType => {
            this.statistics.errorsByType[errorType] = 0;
        });
    }

    /**
     * Get error history for debugging
     * @param limit - Maximum number of errors to return
     * @returns Recent error history
     */
    public getErrorHistory(limit?: number): BattleErrorDetails[] {
        const historyLimit = limit || this.errorHistory.length;
        return this.errorHistory.slice(-historyLimit);
    }

    /**
     * Clear error history
     */
    public clearErrorHistory(): void {
        this.errorHistory = [];
    }

    // Private methods for error handling implementation

    /**
     * Create detailed error information
     * @param error - Battle error type
     * @param context - Battle context
     * @param message - Error message
     * @returns Detailed error information
     */
    private createErrorDetails(
        error: BattleError,
        context: BattleContext,
        message?: string
    ): BattleErrorDetails {
        return {
            error,
            message: message || this.getDefaultErrorMessage(error),
            context,
            timestamp: Date.now(),
            recoverable: this.isRecoverable(error),
            suggestedAction: this.getSuggestedAction(error)
        };
    }

    /**
     * Determine recovery strategy for error
     * @param error - Battle error type
     * @param context - Battle context
     * @returns Recovery strategy
     */
    private determineRecoveryStrategy(
        error: BattleError,
        context: BattleContext
    ): 'retry' | 'cancel' | 'reset' | 'ignore' | 'fallback' {
        // Critical errors require reset
        if ([
            BattleError.BATTLE_SYSTEM_ERROR,
            BattleError.DAMAGE_CALCULATION_ERROR
        ].includes(error)) {
            return 'reset';
        }

        // Animation errors can be ignored
        if (error === BattleError.ANIMATION_FAILED) {
            return 'ignore';
        }

        // User input errors should be cancelled for retry
        if ([
            BattleError.INVALID_TARGET,
            BattleError.OUT_OF_RANGE,
            BattleError.TARGET_UNREACHABLE
        ].includes(error)) {
            return 'cancel';
        }

        // State errors require cancel for user correction
        if ([
            BattleError.INVALID_ATTACKER,
            BattleError.ALREADY_ACTED,
            BattleError.NO_WEAPON_EQUIPPED,
            BattleError.WEAPON_BROKEN,
            BattleError.INSUFFICIENT_MP
        ].includes(error)) {
            return 'cancel';
        }

        // Default to cancel for unknown errors
        return 'cancel';
    }

    /**
     * Execute error recovery based on strategy
     * @param strategy - Recovery strategy
     * @param errorDetails - Error details
     * @returns Recovery result
     */
    private async executeRecovery(
        strategy: 'retry' | 'cancel' | 'reset' | 'ignore' | 'fallback',
        errorDetails: BattleErrorDetails
    ): Promise<ErrorRecoveryResult> {
        switch (strategy) {
            case 'retry':
                return this.executeRetryRecovery(errorDetails);

            case 'cancel':
                return this.executeCancelRecovery(errorDetails);

            case 'reset':
                return this.executeResetRecovery(errorDetails);

            case 'ignore':
                return this.executeIgnoreRecovery(errorDetails);

            case 'fallback':
                return this.executeFallbackRecovery(errorDetails);

            default:
                return this.executeCancelRecovery(errorDetails);
        }
    }

    /**
     * Execute retry recovery
     * @param errorDetails - Error details
     * @returns Recovery result
     */
    private async executeRetryRecovery(errorDetails: BattleErrorDetails): Promise<ErrorRecoveryResult> {
        // Clean up current state
        const cleanupResult = this.cleanupBattleState(errorDetails.context);

        return {
            success: cleanupResult.success,
            action: 'retry',
            message: 'Action cancelled, you can try again',
            requiresUserAction: true,
            userGuidance: this.getUserGuidance(errorDetails.error, errorDetails.context),
            stateModified: true
        };
    }

    /**
     * Execute cancel recovery
     * @param errorDetails - Error details
     * @returns Recovery result
     */
    private async executeCancelRecovery(errorDetails: BattleErrorDetails): Promise<ErrorRecoveryResult> {
        // Clean up current state
        const cleanupResult = this.cleanupBattleState(errorDetails.context);

        // Emit cancel request
        this.emit('cancel-requested', {
            error: errorDetails.error,
            context: errorDetails.context
        });

        return {
            success: cleanupResult.success,
            action: 'cancel',
            message: 'Action cancelled due to error',
            requiresUserAction: true,
            userGuidance: this.getUserGuidance(errorDetails.error, errorDetails.context),
            stateModified: true
        };
    }

    /**
     * Execute reset recovery
     * @param errorDetails - Error details
     * @returns Recovery result
     */
    private async executeResetRecovery(errorDetails: BattleErrorDetails): Promise<ErrorRecoveryResult> {
        // Perform comprehensive cleanup
        const cleanupResult = this.cleanupBattleState(errorDetails.context);

        // Emit reset request
        this.emit('reset-requested', {
            error: errorDetails.error,
            context: errorDetails.context
        });

        this.statistics.criticalErrors++;

        return {
            success: cleanupResult.success,
            action: 'reset',
            message: 'Battle system reset due to critical error',
            requiresUserAction: true,
            userGuidance: 'The battle system has been reset. You can start a new action.',
            stateModified: true
        };
    }

    /**
     * Execute ignore recovery (for non-critical errors)
     * @param errorDetails - Error details
     * @returns Recovery result
     */
    private async executeIgnoreRecovery(errorDetails: BattleErrorDetails): Promise<ErrorRecoveryResult> {
        return {
            success: true,
            action: 'ignore',
            message: 'Error ignored, continuing with battle',
            requiresUserAction: false,
            stateModified: false
        };
    }

    /**
     * Execute fallback recovery
     * @param errorDetails - Error details
     * @returns Recovery result
     */
    private async executeFallbackRecovery(errorDetails: BattleErrorDetails): Promise<ErrorRecoveryResult> {
        // Clean up current state
        const cleanupResult = this.cleanupBattleState(errorDetails.context);

        return {
            success: cleanupResult.success,
            action: 'fallback',
            message: 'Using fallback behavior for error',
            requiresUserAction: true,
            userGuidance: this.getUserGuidance(errorDetails.error, errorDetails.context),
            stateModified: true
        };
    }

    /**
     * Provide user feedback for error
     * @param errorDetails - Error details
     * @param recoveryResult - Recovery result
     */
    private async provideUserFeedback(
        errorDetails: BattleErrorDetails,
        recoveryResult: ErrorRecoveryResult
    ): Promise<void> {
        if (!this.config.showUserMessages) {
            return;
        }

        // Determine message type
        const messageType = this.getMessageType(errorDetails.error);

        // Create user-friendly message
        const userMessage = this.createUserMessage(errorDetails, recoveryResult);

        // Show message to user
        this.userFeedback.showErrorMessage(
            userMessage,
            messageType,
            this.config.messageDuration
        );

        // Show guidance if needed
        if (recoveryResult.userGuidance && recoveryResult.requiresUserAction) {
            this.userFeedback.showGuidance(recoveryResult.userGuidance);
        }

        // Play error sound if enabled
        if (this.config.enableErrorSounds) {
            this.playErrorSound(messageType);
        }
    }

    // Specific error handlers

    private handleInvalidAttacker(context: BattleContext): ErrorRecoveryResult {
        return {
            success: true,
            action: 'cancel',
            message: 'Invalid attacker selected',
            requiresUserAction: true,
            userGuidance: 'Select a different unit that can attack',
            stateModified: true
        };
    }

    private handleInvalidTarget(context: BattleContext): ErrorRecoveryResult {
        return {
            success: true,
            action: 'cancel',
            message: 'Invalid target selected',
            requiresUserAction: true,
            userGuidance: 'Select a valid enemy target',
            stateModified: false
        };
    }

    private handleOutOfRange(context: BattleContext): ErrorRecoveryResult {
        return {
            success: true,
            action: 'cancel',
            message: 'Target is out of range',
            requiresUserAction: true,
            userGuidance: 'Move closer or select a target within range',
            stateModified: false
        };
    }

    private handleAlreadyActed(context: BattleContext): ErrorRecoveryResult {
        return {
            success: true,
            action: 'fallback',
            message: 'Unit has already acted this turn',
            requiresUserAction: true,
            userGuidance: 'Select a different unit or end your turn',
            stateModified: false
        };
    }

    private handleInsufficientMP(context: BattleContext): ErrorRecoveryResult {
        return {
            success: true,
            action: 'fallback',
            message: 'Insufficient MP for this action',
            requiresUserAction: true,
            userGuidance: 'Use a different skill or wait to recover MP',
            stateModified: false
        };
    }

    private handleWeaponBroken(context: BattleContext): ErrorRecoveryResult {
        return {
            success: true,
            action: 'fallback',
            message: 'Weapon is broken and cannot be used',
            requiresUserAction: true,
            userGuidance: 'Equip a different weapon or repair this one',
            stateModified: false
        };
    }

    private handleTargetUnreachable(context: BattleContext): ErrorRecoveryResult {
        return {
            success: true,
            action: 'cancel',
            message: 'Target cannot be reached',
            requiresUserAction: true,
            userGuidance: 'Find a different position or select another target',
            stateModified: false
        };
    }

    private handleNoWeaponEquipped(context: BattleContext): ErrorRecoveryResult {
        return {
            success: true,
            action: 'fallback',
            message: 'No weapon equipped',
            requiresUserAction: true,
            userGuidance: 'Equip a weapon before attempting to attack',
            stateModified: false
        };
    }

    private handleBattleSystemError(context: BattleContext): ErrorRecoveryResult {
        return {
            success: true,
            action: 'reset',
            message: 'Battle system error occurred',
            requiresUserAction: true,
            userGuidance: 'The battle system will be reset',
            stateModified: true
        };
    }

    private handleAnimationFailed(context: BattleContext): ErrorRecoveryResult {
        return {
            success: true,
            action: 'ignore',
            message: 'Animation failed to play',
            requiresUserAction: false,
            userGuidance: 'Battle will continue without animation',
            stateModified: false
        };
    }

    private handleDamageCalculationError(context: BattleContext): ErrorRecoveryResult {
        return {
            success: false,
            action: 'reset',
            message: 'Damage calculation error',
            requiresUserAction: true,
            userGuidance: 'Battle calculation will be reset',
            stateModified: true
        };
    }

    private handleUnknownError(error: BattleError, context: BattleContext): ErrorRecoveryResult {
        return {
            success: false,
            action: 'cancel',
            message: `Unknown error: ${error}`,
            requiresUserAction: true,
            userGuidance: 'Try canceling the current action and starting over',
            stateModified: true
        };
    }

    // Utility methods

    private updateStatistics(error: BattleError): void {
        this.statistics.totalErrors++;
        this.statistics.errorsByType[error]++;
        this.statistics.lastErrorTime = Date.now();
    }

    private addToHistory(errorDetails: BattleErrorDetails): void {
        this.errorHistory.push(errorDetails);

        // Maintain history size limit
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
        }
    }

    private logError(errorDetails: BattleErrorDetails): void {
        console.error('[BattleErrorHandler]', {
            error: errorDetails.error,
            message: errorDetails.message,
            context: errorDetails.context,
            timestamp: new Date(errorDetails.timestamp).toISOString(),
            recoverable: errorDetails.recoverable
        });
    }

    private getDefaultErrorMessage(error: BattleError): string {
        switch (error) {
            case BattleError.INVALID_ATTACKER:
                return 'The selected unit cannot attack';
            case BattleError.INVALID_TARGET:
                return 'Invalid target selected';
            case BattleError.OUT_OF_RANGE:
                return 'Target is out of attack range';
            case BattleError.ALREADY_ACTED:
                return 'Unit has already acted this turn';
            case BattleError.INSUFFICIENT_MP:
                return 'Insufficient MP for this action';
            case BattleError.WEAPON_BROKEN:
                return 'Weapon is broken';
            case BattleError.TARGET_UNREACHABLE:
                return 'Target cannot be reached';
            case BattleError.NO_WEAPON_EQUIPPED:
                return 'No weapon equipped';
            case BattleError.BATTLE_SYSTEM_ERROR:
                return 'Battle system error';
            case BattleError.ANIMATION_FAILED:
                return 'Animation failed';
            case BattleError.DAMAGE_CALCULATION_ERROR:
                return 'Damage calculation error';
            default:
                return 'Unknown battle error';
        }
    }

    private isRecoverable(error: BattleError): boolean {
        // Most errors are recoverable except critical system errors
        return ![
            BattleError.BATTLE_SYSTEM_ERROR,
            BattleError.DAMAGE_CALCULATION_ERROR
        ].includes(error);
    }

    private getSuggestedAction(error: BattleError): string {
        switch (error) {
            case BattleError.INVALID_ATTACKER:
                return 'Select a different unit';
            case BattleError.INVALID_TARGET:
                return 'Select a valid target';
            case BattleError.OUT_OF_RANGE:
                return 'Move closer or select different target';
            case BattleError.ALREADY_ACTED:
                return 'Select different unit or end turn';
            case BattleError.INSUFFICIENT_MP:
                return 'Use different skill or wait';
            case BattleError.WEAPON_BROKEN:
                return 'Equip different weapon';
            case BattleError.TARGET_UNREACHABLE:
                return 'Find different position';
            case BattleError.NO_WEAPON_EQUIPPED:
                return 'Equip a weapon';
            default:
                return 'Cancel and retry';
        }
    }

    private getMessageType(error: BattleError): 'error' | 'warning' | 'info' {
        if ([
            BattleError.BATTLE_SYSTEM_ERROR,
            BattleError.DAMAGE_CALCULATION_ERROR
        ].includes(error)) {
            return 'error';
        }

        if (error === BattleError.ANIMATION_FAILED) {
            return 'info';
        }

        return 'warning';
    }

    private createUserMessage(
        errorDetails: BattleErrorDetails,
        recoveryResult: ErrorRecoveryResult
    ): string {
        const baseMessage = this.getDefaultErrorMessage(errorDetails.error);

        if (recoveryResult.requiresUserAction && recoveryResult.userGuidance) {
            return `${baseMessage}. ${recoveryResult.userGuidance}`;
        }

        return baseMessage;
    }

    private createUserFeedbackInterface(): UserFeedbackInterface {
        return {
            showErrorMessage: (message: string, type: 'error' | 'warning' | 'info', duration?: number) => {
                this.showErrorMessage(message, type, duration);
            },
            showConfirmDialog: (message: string, onConfirm: () => void, onCancel: () => void) => {
                this.showConfirmDialog(message, onConfirm, onCancel);
            },
            showGuidance: (message: string, position?: Position) => {
                this.showGuidance(message, position);
            },
            clearMessages: () => {
                this.clearErrorUI();
            }
        };
    }

    private initializeUI(): void {
        // Create error container
        this.errorContainer = this.scene.add.container(0, 0);
        this.errorContainer.setDepth(1000); // High depth for visibility
        this.errorContainer.setVisible(false);

        // Create error text
        this.errorText = this.scene.add.text(0, 0, '', {
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#cc0000',
            padding: { x: 10, y: 5 },
            wordWrap: { width: 400 }
        });

        this.errorContainer.add(this.errorText);
    }

    private showErrorMessage(message: string, type: 'error' | 'warning' | 'info', duration?: number): void {
        if (!this.errorText || !this.errorContainer) {
            return;
        }

        // Set message style based on type
        const colors = {
            error: '#cc0000',
            warning: '#ff8800',
            info: '#0088cc'
        };

        this.errorText.setStyle({
            backgroundColor: colors[type]
        });

        this.errorText.setText(message);

        // Position at top center of screen
        const camera = this.scene.cameras.main;
        this.errorContainer.setPosition(
            camera.centerX - this.errorText.width / 2,
            camera.y + 50
        );

        this.errorContainer.setVisible(true);

        // Auto-dismiss if configured
        if (this.config.autoDismissErrors) {
            const dismissDuration = duration || this.config.messageDuration;
            this.scene.time.delayedCall(dismissDuration, () => {
                this.clearErrorUI();
            });
        }
    }

    private showConfirmDialog(message: string, onConfirm: () => void, onCancel: () => void): void {
        // This would be implemented with a proper dialog system
        // For now, use browser confirm as fallback
        if (confirm(message)) {
            onConfirm();
        } else {
            onCancel();
        }
    }

    private showGuidance(message: string, position?: Position): void {
        // Create guidance tooltip
        if (this.guidanceTooltip) {
            this.guidanceTooltip.destroy();
        }

        this.guidanceTooltip = this.scene.add.container(0, 0);

        const background = this.scene.add.graphics();
        background.fillStyle(0x000000, 0.8);
        background.fillRoundedRect(0, 0, 300, 60, 5);

        const text = this.scene.add.text(10, 10, message, {
            fontSize: '14px',
            color: '#ffffff',
            wordWrap: { width: 280 }
        });

        this.guidanceTooltip.add([background, text]);

        // Position tooltip
        const camera = this.scene.cameras.main;
        const x = position ? position.x * 32 : camera.centerX - 150;
        const y = position ? position.y * 32 - 70 : camera.centerY;

        this.guidanceTooltip.setPosition(x, y);
        this.guidanceTooltip.setDepth(1001);

        // Auto-dismiss guidance
        this.scene.time.delayedCall(5000, () => {
            if (this.guidanceTooltip) {
                this.guidanceTooltip.destroy();
                this.guidanceTooltip = null;
            }
        });
    }

    private clearErrorUI(): void {
        if (this.errorContainer) {
            this.errorContainer.setVisible(false);
        }

        if (this.guidanceTooltip) {
            this.guidanceTooltip.destroy();
            this.guidanceTooltip = null;
        }
    }

    private clearVisualEffects(): void {
        // Clear any battle-related visual effects
        // This would be implemented with actual graphics cleanup
    }

    private resetUnitState(unit: Unit): void {
        // Reset any temporary state modifications
        // This would be implemented based on actual unit state structure
    }

    private playErrorSound(type: 'error' | 'warning' | 'info'): void {
        // Play appropriate error sound
        // This would be implemented with actual audio system
        if (this.scene.sound) {
            const soundKey = `error_${type}`;
            if (this.scene.sound.get(soundKey)) {
                this.scene.sound.play(soundKey, { volume: 0.5 });
            }
        }
    }

    /**
     * Destroy the error handler and clean up resources
     */
    public destroy(): void {
        // Clear UI elements
        this.clearErrorUI();

        if (this.errorContainer) {
            this.errorContainer.destroy();
            this.errorContainer = null;
        }

        // Clear history
        this.errorHistory = [];

        // Remove all listeners
        this.removeAllListeners();
    }
}