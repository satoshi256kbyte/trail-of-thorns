/**
 * Unit tests for MovementErrorHandler
 * Tests error handling, user feedback, and recovery mechanisms
 */

import {
  MovementErrorHandler,
  MovementNotification,
  MovementNotificationType,
  MovementRecoveryOptions,
  createMovementErrorHandler,
} from '../../../game/src/utils/MovementErrorHandler';
import { MovementError, MovementErrorDetails } from '../../../game/src/types/movement';
import { Unit, Position } from '../../../game/src/types/gameplay';

describe('MovementErrorHandler', () => {
  let errorHandler: MovementErrorHandler;
  let mockCharacter: Unit;
  let mockPosition: Position;

  beforeEach(() => {
    errorHandler = new MovementErrorHandler();

    mockCharacter = {
      id: 'test-character',
      name: 'Test Character',
      position: { x: 5, y: 5 },
      stats: {
        hp: 100,
        mp: 50,
        attack: 20,
        defense: 15,
        movement: 3,
        range: 1,
      },
      currentHP: 100,
      currentMP: 50,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
    };

    mockPosition = { x: 8, y: 8 };
  });

  afterEach(() => {
    errorHandler.destroy();
  });

  describe('constructor and configuration', () => {
    it('should create with default configuration', () => {
      const config = errorHandler.getConfig();

      expect(config.showVisualFeedback).toBe(true);
      expect(config.showNotifications).toBe(true);
      expect(config.enableRecovery).toBe(true);
      expect(config.notificationDuration).toBe(3000);
    });

    it('should create with custom configuration', () => {
      const customHandler = new MovementErrorHandler({
        showVisualFeedback: false,
        notificationDuration: 5000,
      });

      const config = customHandler.getConfig();
      expect(config.showVisualFeedback).toBe(false);
      expect(config.notificationDuration).toBe(5000);
      expect(config.showNotifications).toBe(true); // Should keep default

      customHandler.destroy();
    });

    it('should update configuration', () => {
      errorHandler.updateConfig({
        showNotifications: false,
        enableRecovery: false,
      });

      const config = errorHandler.getConfig();
      expect(config.showNotifications).toBe(false);
      expect(config.enableRecovery).toBe(false);
      expect(config.showVisualFeedback).toBe(true); // Should keep existing
    });
  });

  describe('movement error handling', () => {
    it('should handle movement validation errors', () => {
      const details: MovementErrorDetails = {
        error: MovementError.DESTINATION_UNREACHABLE,
        message: 'Position not reachable',
        character: mockCharacter,
        position: mockPosition,
      };

      const result = errorHandler.handleMovementError(
        MovementError.DESTINATION_UNREACHABLE,
        'Position not reachable',
        details
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.message).toBe('Position not reachable');
    });

    it('should handle character selection errors', () => {
      const notificationCallback = jest.fn();
      const visualFeedbackCallback = jest.fn();
      const recoveryCallback = jest.fn();

      errorHandler.onNotification(notificationCallback);
      errorHandler.onVisualFeedback(visualFeedbackCallback);
      errorHandler.onRecovery(recoveryCallback);

      errorHandler.handleCharacterSelectionError(
        mockCharacter,
        MovementError.CHARACTER_ALREADY_MOVED,
        'Character has already moved'
      );

      expect(notificationCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MovementNotificationType.INFO,
          title: 'Character Already Moved',
          message: 'Character has already moved',
          character: mockCharacter,
        })
      );

      expect(visualFeedbackCallback).toHaveBeenCalled();
      expect(recoveryCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          clearSelection: true,
        })
      );
    });

    it('should handle movement execution errors', () => {
      const notificationCallback = jest.fn();
      const visualFeedbackCallback = jest.fn();
      const recoveryCallback = jest.fn();

      errorHandler.onNotification(notificationCallback);
      errorHandler.onVisualFeedback(visualFeedbackCallback);
      errorHandler.onRecovery(recoveryCallback);

      errorHandler.handleMovementExecutionError(
        mockCharacter,
        mockPosition,
        MovementError.DESTINATION_OCCUPIED,
        'Position is occupied'
      );

      expect(notificationCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MovementNotificationType.INFO,
          title: 'Position Occupied',
          message: 'Position is occupied',
          character: mockCharacter,
          position: mockPosition,
        })
      );

      expect(visualFeedbackCallback).toHaveBeenCalled();
      expect(recoveryCallback).toHaveBeenCalled();
    });
  });

  describe('movement interruption handling', () => {
    it('should handle movement interruption', () => {
      const notificationCallback = jest.fn();
      const recoveryCallback = jest.fn();

      errorHandler.onNotification(notificationCallback);
      errorHandler.onRecovery(recoveryCallback);

      const currentPosition = { x: 6, y: 6 };
      const targetPosition = { x: 8, y: 8 };

      errorHandler.handleMovementInterruption(
        mockCharacter,
        currentPosition,
        targetPosition,
        'Animation cancelled'
      );

      expect(notificationCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MovementNotificationType.WARNING,
          title: 'Movement Interrupted',
          message: expect.stringContaining('Animation cancelled'),
          character: mockCharacter,
          position: currentPosition,
        })
      );

      expect(recoveryCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          clearHighlights: true,
          resetMovementState: true,
        })
      );
    });
  });

  describe('success feedback', () => {
    it('should show movement success feedback', () => {
      const notificationCallback = jest.fn();
      errorHandler.onNotification(notificationCallback);

      const path = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 },
      ];
      const finalPosition = { x: 7, y: 5 };

      errorHandler.showMovementSuccess(mockCharacter, path, finalPosition);

      expect(notificationCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MovementNotificationType.SUCCESS,
          title: 'Movement Complete',
          message: expect.stringContaining('moved successfully'),
          character: mockCharacter,
          position: finalPosition,
          duration: 1500,
        })
      );
    });

    it('should not show success feedback when notifications disabled', () => {
      errorHandler.updateConfig({ showNotifications: false });

      const notificationCallback = jest.fn();
      errorHandler.onNotification(notificationCallback);

      errorHandler.showMovementSuccess(mockCharacter, [{ x: 5, y: 5 }], { x: 5, y: 5 });

      expect(notificationCallback).not.toHaveBeenCalled();
    });
  });

  describe('alternative movement options', () => {
    it('should show movement alternatives', () => {
      const notificationCallback = jest.fn();
      errorHandler.onNotification(notificationCallback);

      const blockedDestination = { x: 8, y: 8 };
      const alternatives = [
        { x: 7, y: 8 },
        { x: 8, y: 7 },
        { x: 7, y: 7 },
      ];

      errorHandler.showMovementAlternatives(mockCharacter, blockedDestination, alternatives);

      expect(notificationCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MovementNotificationType.INFO,
          title: 'Alternative Positions Available',
          message: expect.stringContaining('3 alternative positions'),
          character: mockCharacter,
          position: blockedDestination,
          showVisualFeedback: true,
        })
      );
    });

    it('should not show alternatives when disabled', () => {
      errorHandler.updateConfig({ showAlternativePaths: false });

      const notificationCallback = jest.fn();
      errorHandler.onNotification(notificationCallback);

      errorHandler.showMovementAlternatives(mockCharacter, { x: 8, y: 8 }, [{ x: 7, y: 8 }]);

      expect(notificationCallback).not.toHaveBeenCalled();
    });

    it('should not show alternatives when no alternatives available', () => {
      const notificationCallback = jest.fn();
      errorHandler.onNotification(notificationCallback);

      errorHandler.showMovementAlternatives(mockCharacter, { x: 8, y: 8 }, []);

      expect(notificationCallback).not.toHaveBeenCalled();
    });
  });

  describe('callback management', () => {
    it('should register and call notification callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      errorHandler.onNotification(callback1);
      errorHandler.onNotification(callback2);

      errorHandler.handleCharacterSelectionError(
        mockCharacter,
        MovementError.INVALID_CHARACTER_SELECTION,
        'Invalid character'
      );

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should register and call visual feedback callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      errorHandler.onVisualFeedback(callback1);
      errorHandler.onVisualFeedback(callback2);

      errorHandler.handleCharacterSelectionError(
        mockCharacter,
        MovementError.INVALID_CHARACTER_SELECTION,
        'Invalid character'
      );

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should register and call recovery callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      errorHandler.onRecovery(callback1);
      errorHandler.onRecovery(callback2);

      errorHandler.handleCharacterSelectionError(
        mockCharacter,
        MovementError.CHARACTER_ALREADY_MOVED,
        'Already moved'
      );

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const workingCallback = jest.fn();

      errorHandler.onNotification(errorCallback);
      errorHandler.onNotification(workingCallback);

      // Should not throw despite callback error
      expect(() => {
        errorHandler.handleCharacterSelectionError(
          mockCharacter,
          MovementError.INVALID_CHARACTER_SELECTION,
          'Invalid character'
        );
      }).not.toThrow();

      expect(errorCallback).toHaveBeenCalled();
      expect(workingCallback).toHaveBeenCalled();
    });
  });

  describe('error type mapping', () => {
    it('should create appropriate notifications for different error types', () => {
      const notificationCallback = jest.fn();
      errorHandler.onNotification(notificationCallback);

      const testCases = [
        {
          error: MovementError.CHARACTER_ALREADY_MOVED,
          expectedTitle: 'Character Already Moved',
          expectedType: MovementNotificationType.INFO,
        },
        {
          error: MovementError.INVALID_CHARACTER_SELECTION,
          expectedTitle: 'Invalid Selection',
          expectedType: MovementNotificationType.ERROR,
        },
        {
          error: MovementError.MOVEMENT_IN_PROGRESS,
          expectedTitle: 'Movement in Progress',
          expectedType: MovementNotificationType.WARNING,
        },
      ];

      testCases.forEach(({ error, expectedTitle, expectedType }) => {
        notificationCallback.mockClear();

        errorHandler.handleCharacterSelectionError(mockCharacter, error, 'Test message');

        expect(notificationCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            type: expectedType,
            title: expectedTitle,
          })
        );
      });
    });

    it('should create appropriate notifications for movement execution errors', () => {
      const notificationCallback = jest.fn();
      errorHandler.onNotification(notificationCallback);

      const testCases = [
        {
          error: MovementError.DESTINATION_UNREACHABLE,
          expectedTitle: 'Destination Unreachable',
          expectedType: MovementNotificationType.INFO,
        },
        {
          error: MovementError.DESTINATION_OCCUPIED,
          expectedTitle: 'Position Occupied',
          expectedType: MovementNotificationType.INFO,
        },
        {
          error: MovementError.PATH_BLOCKED,
          expectedTitle: 'Path Blocked',
          expectedType: MovementNotificationType.WARNING,
        },
      ];

      testCases.forEach(({ error, expectedTitle, expectedType }) => {
        notificationCallback.mockClear();

        errorHandler.handleMovementExecutionError(
          mockCharacter,
          mockPosition,
          error,
          'Test message'
        );

        expect(notificationCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            type: expectedType,
            title: expectedTitle,
          })
        );
      });
    });
  });

  describe('recovery options', () => {
    it('should provide appropriate recovery options for different errors', () => {
      const recoveryCallback = jest.fn();
      errorHandler.onRecovery(recoveryCallback);

      // Test different error types and their expected recovery options
      const testCases = [
        {
          error: MovementError.DESTINATION_UNREACHABLE,
          expectedOptions: {
            clearSelection: false,
            showAlternatives: true,
          },
        },
        {
          error: MovementError.CHARACTER_ALREADY_MOVED,
          expectedOptions: {
            clearSelection: true,
            clearHighlights: true,
            resetMovementState: true,
          },
        },
        {
          error: MovementError.MOVEMENT_IN_PROGRESS,
          expectedOptions: {
            clearSelection: false,
            clearHighlights: false,
            resetMovementState: false,
          },
        },
      ];

      testCases.forEach(({ error, expectedOptions }) => {
        recoveryCallback.mockClear();

        errorHandler.handleMovementExecutionError(
          mockCharacter,
          mockPosition,
          error,
          'Test message'
        );

        expect(recoveryCallback).toHaveBeenCalledWith(expect.objectContaining(expectedOptions));
      });
    });
  });

  describe('destroy and cleanup', () => {
    it('should clear all callbacks on destroy', () => {
      const notificationCallback = jest.fn();
      const visualFeedbackCallback = jest.fn();
      const recoveryCallback = jest.fn();

      errorHandler.onNotification(notificationCallback);
      errorHandler.onVisualFeedback(visualFeedbackCallback);
      errorHandler.onRecovery(recoveryCallback);

      errorHandler.destroy();

      // Callbacks should not be called after destroy
      errorHandler.handleCharacterSelectionError(
        mockCharacter,
        MovementError.INVALID_CHARACTER_SELECTION,
        'Test'
      );

      expect(notificationCallback).not.toHaveBeenCalled();
      expect(visualFeedbackCallback).not.toHaveBeenCalled();
      expect(recoveryCallback).not.toHaveBeenCalled();
    });
  });

  describe('convenience function', () => {
    it('should create movement error handler with convenience function', () => {
      const handler = createMovementErrorHandler({
        showVisualFeedback: false,
        notificationDuration: 2000,
      });

      const config = handler.getConfig();
      expect(config.showVisualFeedback).toBe(false);
      expect(config.notificationDuration).toBe(2000);

      handler.destroy();
    });
  });
});
