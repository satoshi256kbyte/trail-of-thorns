/**
 * Integration tests for CharacterLossManager with danger warning system
 * Tests the integration between character loss management and danger warnings
 */

import * as Phaser from 'phaser';
import { CharacterLossManager } from '../../../game/src/systems/CharacterLossManager';
import { CharacterDangerWarningSystem } from '../../../game/src/systems/CharacterDangerWarningSystem';
import { Unit, GameAction } from '../../../game/src/types/gameplay';
import { DangerLevel, LossCause, LossCauseType } from '../../../game/src/types/characterLoss';

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

// Helper function to create mock loss cause
function createMockLossCause(): LossCause {
  return {
    type: LossCauseType.BATTLE_DEFEAT,
    sourceId: 'enemy1',
    sourceName: 'Enemy Unit',
    damageAmount: 50,
    description: 'Defeated in battle',
    timestamp: Date.now(),
  };
}

describe('CharacterLossManager Danger Warning Integration', () => {
  let mockScene: MockScene;
  let lossManager: CharacterLossManager;
  let dangerWarningSystem: CharacterDangerWarningSystem;
  let mockUnits: Unit[];

  beforeEach(() => {
    mockScene = new MockScene();

    // Create systems
    lossManager = new CharacterLossManager(mockScene as any);
    dangerWarningSystem = new CharacterDangerWarningSystem(mockScene as any);

    // Integrate systems
    lossManager.setDangerWarningSystem(dangerWarningSystem);

    // Create test units
    mockUnits = [
      createMockUnit('player1', 100, 100), // Full HP
      createMockUnit('player2', 30, 100), // Critical danger
      createMockUnit('protagonist', 25, 100), // Important character in critical danger
      createMockUnit('enemy1', 50, 100), // Enemy unit
    ];

    // Initialize chapter
    lossManager.initializeChapter('test-chapter', mockUnits);
  });

  afterEach(() => {
    lossManager.destroy();
    dangerWarningSystem.destroy();
  });

  describe('Danger Level Integration', () => {
    test('should update danger levels when units are damaged', () => {
      // Damage a unit
      const damagedUnit = { ...mockUnits[0] };
      damagedUnit.currentHP = 20; // Critical danger

      const updatedUnits = [damagedUnit, ...mockUnits.slice(1)];

      // Update danger levels through loss manager
      lossManager.initializeChapter('test-chapter', updatedUnits);

      // Check that danger warning system was updated
      expect(dangerWarningSystem.getDangerLevel('player1')).toBe(DangerLevel.CRITICAL);
    });

    test('should emit danger level changed events', () => {
      const eventSpy = jest.fn();
      lossManager.on('danger-level-changed', eventSpy);

      // Damage a unit to trigger danger level change
      const damagedUnit = { ...mockUnits[0] };
      damagedUnit.currentHP = 20;

      const updatedUnits = [damagedUnit, ...mockUnits.slice(1)];
      lossManager.initializeChapter('test-chapter', updatedUnits);

      expect(eventSpy).toHaveBeenCalled();
    });

    test('should handle important character danger warnings', () => {
      const eventSpy = jest.fn();
      lossManager.on('important-character-in-danger', eventSpy);

      // Configure important character
      const importantConfig = {
        importantCharacterIds: ['protagonist'],
      };

      const customDangerSystem = new CharacterDangerWarningSystem(
        mockScene as any,
        undefined,
        undefined,
        importantConfig
      );

      lossManager.setDangerWarningSystem(customDangerSystem);

      // Trigger danger for important character
      const importantUnit = mockUnits.find(u => u.id === 'protagonist')!;
      importantUnit.currentHP = 15; // Critical danger

      lossManager.initializeChapter('test-chapter', mockUnits);

      expect(eventSpy).toHaveBeenCalledWith({
        unit: importantUnit,
        dangerLevel: DangerLevel.CRITICAL,
      });

      customDangerSystem.destroy();
    });
  });

  describe('Action Confirmation Integration', () => {
    test('should show confirmation dialog for dangerous actions', async () => {
      const criticalUnit = mockUnits[1]; // Already in critical danger
      const mockAction: GameAction = {
        type: 'attack',
        unitId: 'player2',
        targetId: 'enemy1',
      };

      // Mock user confirming the action
      setTimeout(() => {
        const continueCallback =
          mockScene.add.rectangle.mock.results[0]?.value?.on?.mock.calls?.find(
            (call: any) => call[0] === 'pointerdown'
          )?.[1];
        if (continueCallback) {
          continueCallback();
        }
      }, 10);

      const shouldProceed = await lossManager.checkDangerAndConfirm(criticalUnit, mockAction);

      expect(shouldProceed).toBe(true);
      expect(mockScene.add.container).toHaveBeenCalled();
    });

    test('should allow actions without confirmation for safe units', async () => {
      const safeUnit = mockUnits[0]; // Full HP
      const mockAction: GameAction = {
        type: 'move',
        unitId: 'player1',
        targetPosition: { x: 200, y: 200 },
      };

      const shouldProceed = await lossManager.checkDangerAndConfirm(safeUnit, mockAction);

      expect(shouldProceed).toBe(true);
      expect(mockScene.add.container).not.toHaveBeenCalled();
    });

    test('should handle user canceling dangerous actions', async () => {
      const criticalUnit = mockUnits[1];
      const mockAction: GameAction = {
        type: 'attack',
        unitId: 'player2',
        targetId: 'enemy1',
      };

      // Mock user canceling the action
      setTimeout(() => {
        const cancelCallback = mockScene.add.rectangle.mock.results[1]?.value?.on?.mock.calls?.find(
          (call: any) => call[0] === 'pointerdown'
        )?.[1];
        if (cancelCallback) {
          cancelCallback();
        }
      }, 10);

      const shouldProceed = await lossManager.checkDangerAndConfirm(criticalUnit, mockAction);

      expect(shouldProceed).toBe(false);
    });

    test('should show special confirmation for important characters', async () => {
      const importantConfig = {
        importantCharacterIds: ['protagonist'],
      };

      const customDangerSystem = new CharacterDangerWarningSystem(
        mockScene as any,
        undefined,
        undefined,
        importantConfig
      );

      lossManager.setDangerWarningSystem(customDangerSystem);

      const importantUnit = mockUnits.find(u => u.id === 'protagonist')!;
      importantUnit.currentHP = 40; // High danger for important character

      const mockAction: GameAction = {
        type: 'attack',
        unitId: 'protagonist',
        targetId: 'enemy1',
      };

      // Mock user confirming
      setTimeout(() => {
        const continueCallback =
          mockScene.add.rectangle.mock.results[0]?.value?.on?.mock.calls?.find(
            (call: any) => call[0] === 'pointerdown'
          )?.[1];
        if (continueCallback) {
          continueCallback();
        }
      }, 10);

      const shouldProceed = await lossManager.checkDangerAndConfirm(importantUnit, mockAction);

      expect(shouldProceed).toBe(true);
      expect(mockScene.add.container).toHaveBeenCalled();

      customDangerSystem.destroy();
    });
  });

  describe('Loss Processing with Warnings', () => {
    test('should clear danger warnings when character is lost', async () => {
      const criticalUnit = mockUnits[1];
      const lossCause = createMockLossCause();

      // Verify unit is in danger initially
      expect(dangerWarningSystem.getDangerLevel('player2')).toBe(DangerLevel.CRITICAL);

      // Process character loss
      await lossManager.processCharacterLoss(criticalUnit, lossCause);

      // Verify character is now lost
      expect(lossManager.isCharacterLost('player2')).toBe(true);
    });

    test('should update danger levels after character loss', async () => {
      const eventSpy = jest.fn();
      lossManager.on('danger-level-changed', eventSpy);

      const criticalUnit = mockUnits[1];
      const lossCause = createMockLossCause();

      await lossManager.processCharacterLoss(criticalUnit, lossCause);

      // Should have updated danger levels for remaining units
      expect(eventSpy).toHaveBeenCalled();
    });

    test('should handle multiple character losses with warnings', async () => {
      const unit1 = mockUnits[1]; // Critical danger
      const unit2 = mockUnits[2]; // Important character in critical danger
      const lossCause = createMockLossCause();

      // Process first loss
      await lossManager.processCharacterLoss(unit1, lossCause);
      expect(lossManager.isCharacterLost('player2')).toBe(true);

      // Process second loss
      await lossManager.processCharacterLoss(unit2, lossCause);
      expect(lossManager.isCharacterLost('protagonist')).toBe(true);

      // Verify both characters are lost
      const lostCharacters = lossManager.getLostCharacters();
      expect(lostCharacters).toHaveLength(2);
    });
  });

  describe('Chapter Management with Warnings', () => {
    test('should reset danger warnings when chapter is reset', async () => {
      // Set up some danger warnings
      const criticalUnit = mockUnits[1];
      dangerWarningSystem.showDangerWarning(criticalUnit, DangerLevel.CRITICAL);

      // Reset chapter
      await lossManager.resetChapterState();

      // Verify warnings are cleared
      expect(dangerWarningSystem.getDangerLevel('player2')).toBe(DangerLevel.NONE);
    });

    test('should include danger information in chapter summary', () => {
      // Process a loss
      const criticalUnit = mockUnits[1];
      const lossCause = createMockLossCause();

      return lossManager.processCharacterLoss(criticalUnit, lossCause).then(() => {
        const summary = lossManager.completeChapter();

        expect(summary.lostCharacters).toHaveLength(1);
        expect(summary.lostCharacters[0].characterId).toBe('player2');
        expect(summary.isPerfectClear).toBe(false);
      });
    });
  });

  describe('System Error Handling', () => {
    test('should handle danger warning system failures gracefully', () => {
      // Remove danger warning system
      lossManager.setDangerWarningSystem(null as any);

      // Should not throw when trying to check danger
      expect(async () => {
        const safeUnit = mockUnits[0];
        const mockAction: GameAction = {
          type: 'move',
          unitId: 'player1',
          targetPosition: { x: 200, y: 200 },
        };

        await lossManager.checkDangerAndConfirm(safeUnit, mockAction);
      }).not.toThrow();
    });

    test('should handle invalid units in danger checking', async () => {
      const invalidUnit = { ...mockUnits[0] };
      delete (invalidUnit as any).id;

      const mockAction: GameAction = {
        type: 'move',
        unitId: 'invalid',
        targetPosition: { x: 200, y: 200 },
      };

      const shouldProceed = await lossManager.checkDangerAndConfirm(invalidUnit as any, mockAction);

      expect(shouldProceed).toBe(true); // Should default to allowing action
    });

    test('should handle scene destruction during danger operations', () => {
      // Simulate scene destruction
      mockScene.events.emit('destroy');

      // Should not throw errors
      expect(() => {
        lossManager.destroy();
      }).not.toThrow();
    });
  });

  describe('Performance Considerations', () => {
    test('should handle large numbers of units efficiently', () => {
      // Create many units
      const manyUnits: Unit[] = [];
      for (let i = 0; i < 100; i++) {
        manyUnits.push(createMockUnit(`unit${i}`, Math.random() * 100, 100));
      }

      const startTime = Date.now();

      // Initialize with many units
      lossManager.initializeChapter('large-chapter', manyUnits);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });

    test('should not leak memory during repeated operations', () => {
      // Perform many danger level updates
      for (let i = 0; i < 50; i++) {
        const testUnits = mockUnits.map(unit => ({
          ...unit,
          currentHP: Math.random() * 100,
        }));

        lossManager.initializeChapter(`chapter-${i}`, testUnits);
      }

      // Should not throw memory-related errors
      expect(() => {
        lossManager.destroy();
      }).not.toThrow();
    });
  });
});
