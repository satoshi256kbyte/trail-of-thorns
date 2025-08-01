/**
 * Unit tests for GameplayErrorHandler
 * Tests error handling logic and recovery mechanisms
 */

import {
    GameplayErrorHandler,
    ErrorSeverity,
    ErrorContext,
    handleGameplayError,
    createRecoveryAction
} from '../../../game/src/utils/GameplayErrorHandler';
import { GameplayError, GameplayErrorResult } from '../../../game/src/types/gameplay';

describe('GameplayErrorHandler', () => {
    let errorHandler: GameplayErrorHandler;

    beforeEach(() => {
        // Get fresh instance for each test
        errorHandler = GameplayErrorHandler.getInstance();
        errorHandler.clearErrorLog();

        // Reset configuration to defaults
        errorHandler.updateConfig({
            showUserNotifications: false, // Disable for testing
            logToConsole: false, // Disable for testing
            enableRecovery: true,
            maxRetryAttempts: 3
        });
    });

    describe('singleton pattern', () => {
        it('should return the same instance', () => {
            const instance1 = GameplayErrorHandler.getInstance();
            const instance2 = GameplayErrorHandler.getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe('handleError', () => {
        it('should handle INVALID_STAGE_DATA error', () => {
            const context: ErrorContext = {
                scene: 'GameplayScene',
                system: 'DataLoader',
                data: { stageId: 'test-stage' }
            };

            const result = errorHandler.handleError(
                GameplayError.INVALID_STAGE_DATA,
                'Stage data validation failed',
                context
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(GameplayError.INVALID_STAGE_DATA);
            expect(result.message).toBe('Stage data validation failed');
            expect(result.details).toBe(context);
        });

        it('should handle CHARACTER_LOAD_FAILED error', () => {
            const result = errorHandler.handleError(
                GameplayError.CHARACTER_LOAD_FAILED,
                'Failed to load character sprites'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(GameplayError.CHARACTER_LOAD_FAILED);
        });

        it('should handle MAP_LOAD_FAILED error', () => {
            const result = errorHandler.handleError(
                GameplayError.MAP_LOAD_FAILED,
                'Map data is corrupted'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(GameplayError.MAP_LOAD_FAILED);
        });

        it('should handle INVALID_ACTION error', () => {
            const result = errorHandler.handleError(
                GameplayError.INVALID_ACTION,
                'Cannot move during enemy turn'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(GameplayError.INVALID_ACTION);
        });

        it('should handle CAMERA_BOUNDS_ERROR with recovery', () => {
            const result = errorHandler.handleError(
                GameplayError.CAMERA_BOUNDS_ERROR,
                'Camera moved outside map bounds',
                { system: 'CameraController' }
            );

            // Camera bounds error is recoverable and should succeed
            expect(result.success).toBe(true);
            expect(result.error).toBe(GameplayError.CAMERA_BOUNDS_ERROR);
        });

        it('should handle INVALID_POSITION error', () => {
            const result = errorHandler.handleError(
                GameplayError.INVALID_POSITION,
                'Position is not walkable'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(GameplayError.INVALID_POSITION);
        });

        it('should handle UNIT_NOT_FOUND error', () => {
            const result = errorHandler.handleError(
                GameplayError.UNIT_NOT_FOUND,
                'Unit with ID "missing-unit" not found'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(GameplayError.UNIT_NOT_FOUND);
        });

        it('should handle INVALID_TURN_STATE error', () => {
            const result = errorHandler.handleError(
                GameplayError.INVALID_TURN_STATE,
                'Turn state became inconsistent'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(GameplayError.INVALID_TURN_STATE);
        });

        it('should handle unknown error types', () => {
            const result = errorHandler.handleError(
                'UNKNOWN_ERROR' as GameplayError,
                'This is an unknown error'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('UNKNOWN_ERROR');
        });
    });

    describe('error logging', () => {
        it('should log errors to internal log', () => {
            errorHandler.handleError(
                GameplayError.INVALID_ACTION,
                'Test error message'
            );

            const errorLog = errorHandler.getErrorLog();
            expect(errorLog).toHaveLength(1);
            expect(errorLog[0].error).toBe(GameplayError.INVALID_ACTION);
            expect(errorLog[0].message).toBe('Test error message');
            expect(errorLog[0].timestamp).toBeGreaterThan(0);
        });

        it('should limit error log size to 100 entries', () => {
            // Add 150 errors
            for (let i = 0; i < 150; i++) {
                errorHandler.handleError(
                    GameplayError.INVALID_ACTION,
                    `Error ${i}`
                );
            }

            const errorLog = errorHandler.getErrorLog();
            expect(errorLog).toHaveLength(100);
            // Should keep the most recent errors
            expect(errorLog[99].message).toBe('Error 149');
        });

        it('should clear error log', () => {
            errorHandler.handleError(GameplayError.INVALID_ACTION, 'Test error');
            expect(errorHandler.getErrorLog()).toHaveLength(1);

            errorHandler.clearErrorLog();
            expect(errorHandler.getErrorLog()).toHaveLength(0);
        });
    });

    describe('error severity', () => {
        it('should assign correct severity levels', () => {
            const criticalErrors = [
                GameplayError.INVALID_STAGE_DATA,
                GameplayError.MAP_LOAD_FAILED
            ];

            const highErrors = [
                GameplayError.CHARACTER_LOAD_FAILED,
                GameplayError.INVALID_TURN_STATE
            ];

            const mediumErrors = [
                GameplayError.UNIT_NOT_FOUND,
                GameplayError.INVALID_ACTION
            ];

            const lowErrors = [
                GameplayError.CAMERA_BOUNDS_ERROR,
                GameplayError.INVALID_POSITION
            ];

            // Test by checking the logged severity
            criticalErrors.forEach(error => {
                errorHandler.handleError(error, 'Test message');
                const log = errorHandler.getErrorLog();
                expect(log[log.length - 1].severity).toBe(ErrorSeverity.CRITICAL);
            });

            errorHandler.clearErrorLog();

            highErrors.forEach(error => {
                errorHandler.handleError(error, 'Test message');
                const log = errorHandler.getErrorLog();
                expect(log[log.length - 1].severity).toBe(ErrorSeverity.HIGH);
            });

            errorHandler.clearErrorLog();

            mediumErrors.forEach(error => {
                errorHandler.handleError(error, 'Test message');
                const log = errorHandler.getErrorLog();
                expect(log[log.length - 1].severity).toBe(ErrorSeverity.MEDIUM);
            });

            errorHandler.clearErrorLog();

            lowErrors.forEach(error => {
                errorHandler.handleError(error, 'Test message');
                const log = errorHandler.getErrorLog();
                expect(log[log.length - 1].severity).toBe(ErrorSeverity.LOW);
            });
        });
    });

    describe('configuration', () => {
        it('should update configuration', () => {
            const newConfig = {
                showUserNotifications: true,
                maxRetryAttempts: 5
            };

            errorHandler.updateConfig(newConfig);
            const config = errorHandler.getConfig();

            expect(config.showUserNotifications).toBe(true);
            expect(config.maxRetryAttempts).toBe(5);
            expect(config.logToConsole).toBe(false); // Should keep existing values
        });

        it('should return current configuration', () => {
            const config = errorHandler.getConfig();

            expect(config).toHaveProperty('showUserNotifications');
            expect(config).toHaveProperty('logToConsole');
            expect(config).toHaveProperty('enableRecovery');
            expect(config).toHaveProperty('maxRetryAttempts');
        });
    });

    describe('recovery actions', () => {
        it('should create recovery action', () => {
            const mockAction = jest.fn().mockResolvedValue(true);
            const recoveryAction = errorHandler.createRecoveryAction(
                'retry',
                'Retry loading data',
                mockAction
            );

            expect(recoveryAction.type).toBe('retry');
            expect(recoveryAction.description).toBe('Retry loading data');
            expect(recoveryAction.action).toBe(mockAction);
        });

        it('should execute successful recovery action', async () => {
            const mockAction = jest.fn().mockResolvedValue(true);
            const recoveryAction = errorHandler.createRecoveryAction(
                'retry',
                'Test action',
                mockAction
            );

            const result = await errorHandler.executeRecoveryAction(recoveryAction);

            expect(result).toBe(true);
            expect(mockAction).toHaveBeenCalledTimes(1);
        });

        it('should retry failed recovery action', async () => {
            const mockAction = jest.fn()
                .mockResolvedValueOnce(false) // First attempt fails
                .mockResolvedValueOnce(true); // Second attempt succeeds

            const recoveryAction = errorHandler.createRecoveryAction(
                'retry',
                'Test action',
                mockAction
            );

            const result = await errorHandler.executeRecoveryAction(recoveryAction);

            expect(result).toBe(true);
            expect(mockAction).toHaveBeenCalledTimes(2);
        });

        it('should fail after max retry attempts', async () => {
            const mockAction = jest.fn().mockResolvedValue(false); // Always fails
            const recoveryAction = errorHandler.createRecoveryAction(
                'retry',
                'Test action',
                mockAction
            );

            const result = await errorHandler.executeRecoveryAction(recoveryAction);

            expect(result).toBe(false);
            expect(mockAction).toHaveBeenCalledTimes(3); // maxRetryAttempts
        }, 10000); // Increase timeout

        it('should handle recovery action exceptions', async () => {
            const mockAction = jest.fn().mockRejectedValue(new Error('Action failed'));
            const recoveryAction = errorHandler.createRecoveryAction(
                'retry',
                'Test action',
                mockAction
            );

            const result = await errorHandler.executeRecoveryAction(recoveryAction);

            expect(result).toBe(false);
            expect(mockAction).toHaveBeenCalledTimes(3); // Should retry even on exceptions
        }, 10000); // Increase timeout
    });

    describe('convenience functions', () => {
        it('should handle error through convenience function', () => {
            const result = handleGameplayError(
                GameplayError.INVALID_ACTION,
                'Test error message',
                { scene: 'TestScene' }
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(GameplayError.INVALID_ACTION);
            expect(result.message).toBe('Test error message');
        });

        it('should create recovery action through convenience function', () => {
            const mockAction = jest.fn().mockResolvedValue(true);
            const recoveryAction = createRecoveryAction(
                'fallback',
                'Test fallback',
                mockAction
            );

            expect(recoveryAction.type).toBe('fallback');
            expect(recoveryAction.description).toBe('Test fallback');
            expect(recoveryAction.action).toBe(mockAction);
        });
    });

    describe('error context handling', () => {
        it('should preserve error context in result', () => {
            const context: ErrorContext = {
                scene: 'GameplayScene',
                system: 'TurnManager',
                action: 'nextTurn',
                data: { currentTurn: 5 },
                timestamp: Date.now()
            };

            const result = errorHandler.handleError(
                GameplayError.INVALID_TURN_STATE,
                'Turn state error',
                context
            );

            expect(result.details).toBe(context);
        });

        it('should handle empty context', () => {
            const result = errorHandler.handleError(
                GameplayError.INVALID_ACTION,
                'Test error'
            );

            expect(result.details).toEqual({});
        });
    });

    describe('recovery scheduling', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should schedule scene transitions', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            errorHandler.handleError(
                GameplayError.INVALID_STAGE_DATA,
                'Test error',
                { scene: 'GameplayScene' }
            );

            // Fast-forward time
            jest.advanceTimersByTime(1000);

            expect(consoleSpy).toHaveBeenCalledWith('Transitioning to scene: StageSelectScene');
            consoleSpy.mockRestore();
        });

        it('should schedule retries', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            errorHandler.handleError(
                GameplayError.CHARACTER_LOAD_FAILED,
                'Test error'
            );

            // Fast-forward time
            jest.advanceTimersByTime(2000);

            expect(consoleSpy).toHaveBeenCalledWith('Attempting to reload characters...');
            consoleSpy.mockRestore();
        });

        it('should schedule various recovery actions', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            // Test different recovery actions
            errorHandler.handleError(GameplayError.INVALID_ACTION, 'Test', { system: 'GameStateManager' });
            errorHandler.handleError(GameplayError.CAMERA_BOUNDS_ERROR, 'Test', { system: 'CameraController' });
            errorHandler.handleError(GameplayError.INVALID_POSITION, 'Test');
            errorHandler.handleError(GameplayError.UNIT_NOT_FOUND, 'Test');
            errorHandler.handleError(GameplayError.INVALID_TURN_STATE, 'Test');

            // Fast-forward time to trigger all scheduled actions
            jest.advanceTimersByTime(5000);

            expect(consoleSpy).toHaveBeenCalledWith('Resetting game state to select phase');
            expect(consoleSpy).toHaveBeenCalledWith('Resetting camera to center position');
            expect(consoleSpy).toHaveBeenCalledWith('Clearing movement highlights and selection');
            expect(consoleSpy).toHaveBeenCalledWith('Refreshing unit list');
            expect(consoleSpy).toHaveBeenCalledWith('Resetting turn state');

            consoleSpy.mockRestore();
        });
    });
});