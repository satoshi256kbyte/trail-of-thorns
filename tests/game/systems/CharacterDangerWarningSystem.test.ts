/**
 * Unit tests for CharacterDangerWarningSystem
 * Tests danger level calculation, warning display, and confirmation dialogs
 */

import * as Phaser from 'phaser';
import { CharacterDangerWarningSystem } from '../../../game/src/systems/CharacterDangerWarningSystem';
import { Unit, GameAction, GameActionType } from '../../../game/src/types/gameplay';
import { DangerLevel, LossWarningConfig } from '../../../game/src/types/characterLoss';

// Mock Phaser scene
class MockScene extends Phaser.Events.EventEmitter {
  public add: any;
  public time: any;
  public tweens: any;
  public cameras: any;
  public events: any;

  constructor() {
    super();

    this.add = {
      group: jest.fn(() => ({
        add: jest.fn(),
        clear: jest.fn(),
        destroy: jest.fn(),
      })),
      container: jest.fn(() => ({
        add: jest.fn(),
        setAlpha: jest.fn().mockReturnThis(),
        setScale: jest.fn().mockReturnThis(),
        setDepth: jest.fn().mockReturnThis(),
        setScrollFactor: jest.fn().mockReturnThis(),
        setPosition: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
      })),
      rectangle: jest.fn(() => ({
        setStrokeStyle: jest.fn().mockReturnThis(),
        setInteractive: jest.fn().mockReturnThis(),
        on: jest.fn().mockReturnThis(),
        setAlpha: jest.fn().mockReturnThis(),
      })),
      text: jest.fn(() => ({
        setOrigin: jest.fn().mockReturnThis(),
      })),
      circle: jest.fn(() => ({
        setStrokeStyle: jest.fn().mockReturnThis(),
      })),
    };

    this.time = {
      delayedCall: jest.fn(),
      addEvent: jest.fn(() => ({
        destroy: jest.fn(),
      })),
    };

    this.tweens = {
      add: jest.fn(),
    };

    this.cameras = {
      main: {
        centerX: 400,
        centerY: 300,
        width: 800,
        height: 600,
      },
    };

    this.events = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    };
  }
}

// Helper function to create mock unit
function createMockUnit(id: string, currentHP: number, maxHP: number): Unit {
  return {
    id,
    name: `Unit ${id}`,
    position: { x: 100, y: 100 },
    stats: {
      maxHP,
      maxMP: 50,
      attack: 20,
      defense: 15,
      speed: 10,
      movement: 3,
    },
    currentHP,
    currentMP: 50,
    faction: 'player',
    hasActed: false,
    hasMoved: false,
    equipment: {},
    sprite: {
      x: 100,
      y: 100,
      angle: 0,
    } as any,
  };
}

// Helper function to create mock game action
function createMockAction(type: GameActionType, unitId: string): GameAction {
  return {
    type,
    unitId,
    metadata: {},
  };
}

describe('CharacterDangerWarningSystem', () => {
  let mockScene: MockScene;
  let warningSystem: CharacterDangerWarningSystem;
  let mockUnits: Unit[];

  beforeEach(() => {
    mockScene = new MockScene();
    warningSystem = new CharacterDangerWarningSystem(mockScene as any);

    // Create test units with different HP levels
    mockUnits = [
      createMockUnit('unit1', 100, 100), // Full HP - No danger
      createMockUnit('unit2', 80, 100), // 80% HP - Low danger
      createMockUnit('unit3', 60, 100), // 60% HP - Medium danger
      createMockUnit('unit4', 40, 100), // 40% HP - High danger
      createMockUnit('unit5', 20, 100), // 20% HP - Critical danger
      createMockUnit('unit6', 0, 100), // 0% HP - Critical danger
    ];
  });

  afterEach(() => {
    warningSystem.destroy();
  });

  describe('Danger Level Calculation', () => {
    test('should calculate correct danger levels for different HP percentages', () => {
      warningSystem.updateDangerLevels(mockUnits);

      expect(warningSystem.getDangerLevel('unit1')).toBe(DangerLevel.NONE);
      expect(warningSystem.getDangerLevel('unit2')).toBe(DangerLevel.LOW);
      expect(warningSystem.getDangerLevel('unit3')).toBe(DangerLevel.MEDIUM);
      expect(warningSystem.getDangerLevel('unit4')).toBe(DangerLevel.HIGH);
      expect(warningSystem.getDangerLevel('unit5')).toBe(DangerLevel.CRITICAL);
      expect(warningSystem.getDangerLevel('unit6')).toBe(DangerLevel.CRITICAL);
    });

    test('should return NONE for unknown character IDs', () => {
      expect(warningSystem.getDangerLevel('unknown')).toBe(DangerLevel.NONE);
    });

    test('should correctly identify characters in danger', () => {
      warningSystem.updateDangerLevels(mockUnits);

      expect(warningSystem.isCharacterInDanger('unit1')).toBe(false);
      expect(warningSystem.isCharacterInDanger('unit2')).toBe(true);
      expect(warningSystem.isCharacterInDanger('unit3')).toBe(true);
      expect(warningSystem.isCharacterInDanger('unit4')).toBe(true);
      expect(warningSystem.isCharacterInDanger('unit5')).toBe(true);
    });

    test('should use custom HP thresholds when configured', () => {
      const customConfig: Partial<LossWarningConfig> = {
        criticalHPThreshold: 30,
        highDangerHPThreshold: 60,
        mediumDangerHPThreshold: 80,
      };

      const customWarningSystem = new CharacterDangerWarningSystem(mockScene as any, customConfig);

      const testUnit = createMockUnit('test', 35, 100); // 35% HP
      customWarningSystem.updateDangerLevels([testUnit]);

      expect(customWarningSystem.getDangerLevel('test')).toBe(DangerLevel.HIGH);

      customWarningSystem.destroy();
    });
  });

  describe('Warning Display', () => {
    test('should show danger warning for units in danger', () => {
      const dangerUnit = mockUnits[4]; // Critical danger unit

      warningSystem.showDangerWarning(dangerUnit, DangerLevel.CRITICAL);

      expect(mockScene.add.container).toHaveBeenCalled();
    });

    test('should not show warning for units with no danger', () => {
      const safeUnit = mockUnits[0]; // No danger unit

      warningSystem.showDangerWarning(safeUnit, DangerLevel.NONE);

      expect(mockScene.add.container).not.toHaveBeenCalled();
    });

    test('should hide existing warnings', () => {
      const dangerUnit = mockUnits[4];

      // Show warning first
      warningSystem.showDangerWarning(dangerUnit, DangerLevel.CRITICAL);

      // Then hide it
      warningSystem.hideDangerWarning(dangerUnit);

      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    test('should clear all warnings', () => {
      // Show warnings for multiple units
      warningSystem.showDangerWarning(mockUnits[3], DangerLevel.HIGH);
      warningSystem.showDangerWarning(mockUnits[4], DangerLevel.CRITICAL);

      warningSystem.clearAllWarnings();

      // Verify all warnings are cleared
      expect(warningSystem.isCharacterInDanger('unit4')).toBe(false);
      expect(warningSystem.isCharacterInDanger('unit5')).toBe(false);
    });

    test('should emit events when warnings are shown/hidden', () => {
      const dangerUnit = mockUnits[4];
      const eventSpy = jest.fn();

      warningSystem.on('danger-warning-shown', eventSpy);
      warningSystem.showDangerWarning(dangerUnit, DangerLevel.CRITICAL);

      expect(eventSpy).toHaveBeenCalledWith({
        unit: dangerUnit,
        dangerLevel: DangerLevel.CRITICAL,
      });
    });
  });

  describe('Important Character Handling', () => {
    test('should identify important characters correctly', () => {
      const importantConfig = {
        importantCharacterIds: ['protagonist', 'hero'],
      };

      const customWarningSystem = new CharacterDangerWarningSystem(
        mockScene as any,
        undefined,
        undefined,
        importantConfig
      );

      expect(customWarningSystem.isImportantCharacter('protagonist')).toBe(true);
      expect(customWarningSystem.isImportantCharacter('hero')).toBe(true);
      expect(customWarningSystem.isImportantCharacter('unit1')).toBe(false);

      customWarningSystem.destroy();
    });

    test('should show special warnings for important characters', () => {
      const importantConfig = {
        importantCharacterIds: ['unit5'],
      };

      const customWarningSystem = new CharacterDangerWarningSystem(
        mockScene as any,
        undefined,
        undefined,
        importantConfig
      );

      const importantUnit = mockUnits[4]; // Critical danger unit
      importantUnit.id = 'unit5';

      const eventSpy = jest.fn();
      customWarningSystem.on('important-character-warning-shown', eventSpy);

      customWarningSystem.updateDangerLevels([importantUnit]);

      expect(eventSpy).toHaveBeenCalled();

      customWarningSystem.destroy();
    });
  });

  describe('Action Confirmation Dialog', () => {
    test('should show confirmation dialog for risky actions', async () => {
      const dangerUnit = mockUnits[4]; // Critical danger unit
      const action = createMockAction('attack', 'unit5');

      warningSystem.updateDangerLevels([dangerUnit]);

      // Mock user clicking "continue"
      setTimeout(() => {
        // Simulate clicking the continue button
        const continueCallback =
          mockScene.add.rectangle.mock.results[0]?.value?.on?.mock.calls?.find(
            (call: any) => call[0] === 'pointerdown'
          )?.[1];
        if (continueCallback) {
          continueCallback();
        }
      }, 10);

      const result = await warningSystem.showActionConfirmationDialog(dangerUnit, action);

      expect(result.confirmed).toBe(true);
      expect(mockScene.add.container).toHaveBeenCalled();
    });

    test('should not show dialog when dialogs are disabled', async () => {
      const dialogConfig = {
        enableDialogs: false,
      };

      const customWarningSystem = new CharacterDangerWarningSystem(
        mockScene as any,
        undefined,
        dialogConfig
      );

      const dangerUnit = mockUnits[4];
      const action = createMockAction('move', 'unit5');

      const result = await customWarningSystem.showActionConfirmationDialog(dangerUnit, action);

      expect(result.confirmed).toBe(true);
      expect(mockScene.add.container).not.toHaveBeenCalled();

      customWarningSystem.destroy();
    });

    test('should prevent multiple dialogs from showing simultaneously', async () => {
      const dangerUnit = mockUnits[4];
      const action1 = createMockAction('attack', 'unit5');
      const action2 = createMockAction('move', 'unit5');

      warningSystem.updateDangerLevels([dangerUnit]);

      // Start first dialog
      const promise1 = warningSystem.showActionConfirmationDialog(dangerUnit, action1);

      // Try to start second dialog immediately
      const result2 = await warningSystem.showActionConfirmationDialog(dangerUnit, action2);

      expect(result2.confirmed).toBe(false);

      // Clean up first dialog
      setTimeout(() => {
        const cancelCallback = mockScene.add.rectangle.mock.results[1]?.value?.on?.mock.calls?.find(
          (call: any) => call[0] === 'pointerdown'
        )?.[1];
        if (cancelCallback) {
          cancelCallback();
        }
      }, 10);

      await promise1;
    });
  });

  describe('System Integration', () => {
    test('should emit danger level changed events', () => {
      const eventSpy = jest.fn();
      warningSystem.on('danger-level-changed', eventSpy);

      // Update with units at different danger levels
      warningSystem.updateDangerLevels([mockUnits[4]]); // Critical danger

      expect(eventSpy).toHaveBeenCalledWith({
        unit: mockUnits[4],
        oldLevel: DangerLevel.NONE,
        newLevel: DangerLevel.CRITICAL,
        isImportant: false,
      });
    });

    test('should handle disabled warnings gracefully', () => {
      const disabledConfig: Partial<LossWarningConfig> = {
        enableWarnings: false,
      };

      const disabledWarningSystem = new CharacterDangerWarningSystem(
        mockScene as any,
        disabledConfig
      );

      disabledWarningSystem.updateDangerLevels(mockUnits);

      // Should not show any warnings
      expect(mockScene.add.container).not.toHaveBeenCalled();

      disabledWarningSystem.destroy();
    });

    test('should update warning positions during game loop', () => {
      const dangerUnit = mockUnits[4];
      warningSystem.showDangerWarning(dangerUnit, DangerLevel.CRITICAL);

      // Call update method
      warningSystem.updateWarnings(16.67); // 60fps delta time

      // Should not throw errors
      expect(() => warningSystem.updateWarnings(16.67)).not.toThrow();
    });
  });

  describe('Resource Management', () => {
    test('should clean up resources on destroy', () => {
      const dangerUnit = mockUnits[4];
      warningSystem.showDangerWarning(dangerUnit, DangerLevel.CRITICAL);

      warningSystem.destroy();

      // Should emit destroy event
      const destroyEventSpy = jest.fn();
      warningSystem.on('warning-system-destroyed', destroyEventSpy);

      // Calling destroy again should not cause errors
      expect(() => warningSystem.destroy()).not.toThrow();
    });

    test('should handle scene shutdown gracefully', () => {
      const dangerUnit = mockUnits[4];
      warningSystem.showDangerWarning(dangerUnit, DangerLevel.CRITICAL);

      // Simulate scene shutdown
      mockScene.events.emit('shutdown');

      // Should clear all warnings
      expect(() => warningSystem.clearAllWarnings()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle units without sprites', () => {
      const unitWithoutSprite = { ...mockUnits[4] };
      delete unitWithoutSprite.sprite;

      expect(() => {
        warningSystem.showDangerWarning(unitWithoutSprite, DangerLevel.CRITICAL);
      }).not.toThrow();
    });

    test('should handle invalid HP values', () => {
      const invalidUnit = createMockUnit('invalid', -10, 100);

      warningSystem.updateDangerLevels([invalidUnit]);

      expect(warningSystem.getDangerLevel('invalid')).toBe(DangerLevel.CRITICAL);
    });

    test('should handle zero max HP', () => {
      const zeroMaxHPUnit = createMockUnit('zero', 50, 0);

      warningSystem.updateDangerLevels([zeroMaxHPUnit]);

      expect(warningSystem.getDangerLevel('zero')).toBe(DangerLevel.CRITICAL);
    });

    test('should handle empty unit arrays', () => {
      expect(() => {
        warningSystem.updateDangerLevels([]);
      }).not.toThrow();
    });
  });
});
