/**
 * Focused integration tests for AI system with turn-based system
 * Tests the core AI turn management and state integration
 */

import { GameStateManager } from '../../game/src/systems/GameStateManager';
import { Unit } from '../../game/src/types/gameplay';

// Mock event emitter for testing
class MockEventEmitter {
    public emit = jest.fn();
    public on = jest.fn();
    public off = jest.fn();
    public once = jest.fn();
}

describe('AI Turn System Integration', () => {
    let gameStateManager: GameStateManager;
    let mockEventEmitter: MockEventEmitter;
    let playerUnit: Unit;
    let enemyUnit: Unit;
    let allUnits: Unit[];

    beforeEach(() => {
        // Create mock event emitter
        mockEventEmitter = new MockEventEmitter();

        // Create test units
        playerUnit = {
            id: 'player-1',
            name: 'Player Hero',
            position: { x: 1, y: 1 },
            stats: {
                maxHP: 100,
                maxMP: 50,
                attack: 20,
                defense: 15,
                speed: 12,
                movement: 3
            },
            currentHP: 100,
            currentMP: 50,
            faction: 'player',
            hasActed: false,
            hasMoved: false
        };

        enemyUnit = {
            id: 'enemy-1',
            name: 'Enemy Orc',
            position: { x: 5, y: 5 },
            stats: {
                maxHP: 80,
                maxMP: 30,
                attack: 18,
                defense: 12,
                speed: 10,
                movement: 2
            },
            currentHP: 80,
            currentMP: 30,
            faction: 'enemy',
            hasActed: false,
            hasMoved: false
        };

        allUnits = [playerUnit, enemyUnit];

        // Initialize game state manager
        gameStateManager = new GameStateManager(mockEventEmitter as any);
        gameStateManager.initializeTurnOrder(allUnits);
    });

    describe('AI Thinking Phase Management', () => {
        test('should start AI thinking phase for enemy turn', () => {
            // Arrange
            gameStateManager.nextTurn(); // Move to enemy turn
            expect(gameStateManager.getCurrentPlayer()).toBe('enemy');

            // Act
            const result = gameStateManager.startAIThinkingPhase(enemyUnit);

            // Assert
            expect(result.success).toBe(true);
            expect(gameStateManager.getCurrentPhase()).toBe('ai_thinking');
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('ai-thinking-started', {
                aiUnit: enemyUnit,
                currentTurn: expect.any(Number),
                activePlayer: 'enemy'
            });
        });

        test('should complete AI thinking phase and return to enemy phase', () => {
            // Arrange
            gameStateManager.nextTurn(); // Move to enemy turn
            gameStateManager.startAIThinkingPhase(enemyUnit);
            expect(gameStateManager.getCurrentPhase()).toBe('ai_thinking');

            // Act
            const result = gameStateManager.completeAIThinkingPhase(enemyUnit);

            // Assert
            expect(result.success).toBe(true);
            expect(gameStateManager.getCurrentPhase()).toBe('enemy');
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('ai-thinking-completed', {
                aiUnit: enemyUnit,
                currentTurn: expect.any(Number),
                activePlayer: 'enemy'
            });
        });

        test('should reject AI thinking phase for player units', () => {
            // Arrange
            expect(gameStateManager.getCurrentPlayer()).toBe('player');

            // Act
            const result = gameStateManager.startAIThinkingPhase(playerUnit);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toContain('Invalid AI unit for thinking phase');
        });

        test('should reject completing AI thinking phase when not in thinking phase', () => {
            // Arrange
            gameStateManager.nextTurn(); // Move to enemy turn
            expect(gameStateManager.getCurrentPhase()).toBe('enemy');

            // Act
            const result = gameStateManager.completeAIThinkingPhase(enemyUnit);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toContain('Not currently in AI thinking phase');
        });
    });

    describe('AI Unit State Management', () => {
        test('should update AI unit state at turn start', () => {
            // Arrange
            enemyUnit.hasActed = true;
            enemyUnit.hasMoved = true;

            // Act
            const result = gameStateManager.updateAIUnitAtTurnStart(enemyUnit);

            // Assert
            expect(result.success).toBe(true);
            expect(enemyUnit.hasActed).toBe(false);
            expect(enemyUnit.hasMoved).toBe(false);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('ai-unit-turn-started', {
                aiUnit: enemyUnit,
                currentTurn: expect.any(Number),
                skillStatesUpdated: true
            });
        });

        test('should handle null AI unit gracefully', () => {
            // Act
            const result = gameStateManager.updateAIUnitAtTurnStart(null as any);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toContain('AI unit is null or undefined');
        });
    });

    describe('AI Action Completion', () => {
        test('should complete AI move action', () => {
            // Arrange
            gameStateManager.nextTurn(); // Move to enemy turn
            expect(enemyUnit.hasMoved).toBe(false);

            // Act
            const result = gameStateManager.completeAIAction(enemyUnit, 'move');

            // Assert
            expect(result.success).toBe(true);
            expect(enemyUnit.hasMoved).toBe(true);
            expect(enemyUnit.hasActed).toBe(false); // Only moved, not acted
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('ai-action-completed', {
                aiUnit: enemyUnit,
                actionType: 'move',
                turnComplete: false,
                currentTurn: expect.any(Number)
            });
        });

        test('should complete AI attack action', () => {
            // Arrange
            gameStateManager.nextTurn(); // Move to enemy turn
            expect(enemyUnit.hasActed).toBe(false);

            // Act
            const result = gameStateManager.completeAIAction(enemyUnit, 'attack');

            // Assert
            expect(result.success).toBe(true);
            expect(enemyUnit.hasActed).toBe(true);
            expect(enemyUnit.hasMoved).toBe(false); // Only acted, not moved
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('ai-action-completed', {
                aiUnit: enemyUnit,
                actionType: 'attack',
                turnComplete: false,
                currentTurn: expect.any(Number)
            });
        });

        test('should complete AI skill action', () => {
            // Arrange
            gameStateManager.nextTurn(); // Move to enemy turn
            expect(enemyUnit.hasActed).toBe(false);

            // Act
            const result = gameStateManager.completeAIAction(enemyUnit, 'skill');

            // Assert
            expect(result.success).toBe(true);
            expect(enemyUnit.hasActed).toBe(true);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('ai-action-completed', {
                aiUnit: enemyUnit,
                actionType: 'skill',
                turnComplete: false,
                currentTurn: expect.any(Number)
            });
        });

        test('should complete AI wait action', () => {
            // Arrange
            gameStateManager.nextTurn(); // Move to enemy turn
            expect(enemyUnit.hasActed).toBe(false);

            // Act
            const result = gameStateManager.completeAIAction(enemyUnit, 'wait');

            // Assert
            expect(result.success).toBe(true);
            expect(enemyUnit.hasActed).toBe(true);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('ai-action-completed', {
                aiUnit: enemyUnit,
                actionType: 'wait',
                turnComplete: false,
                currentTurn: expect.any(Number)
            });
        });

        test('should advance turn when AI completes both move and action', (done) => {
            // Arrange
            gameStateManager.nextTurn(); // Move to enemy turn
            enemyUnit.hasMoved = true; // Already moved

            // Act
            const result = gameStateManager.completeAIAction(enemyUnit, 'attack');

            // Assert
            expect(result.success).toBe(true);
            expect(enemyUnit.hasActed).toBe(true);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('ai-action-completed', {
                aiUnit: enemyUnit,
                actionType: 'attack',
                turnComplete: true, // Both moved and acted
                currentTurn: expect.any(Number)
            });

            // Should automatically advance turn after delay
            setTimeout(() => {
                expect(gameStateManager.getCurrentPlayer()).toBe('player');
                done();
            }, 600);
        });
    });

    describe('Complete AI Turn Workflow', () => {
        test('should execute complete AI turn workflow', () => {
            // Arrange
            gameStateManager.nextTurn(); // Move to enemy turn
            expect(gameStateManager.getCurrentPlayer()).toBe('enemy');
            expect(gameStateManager.getCurrentPhase()).toBe('enemy');

            // Act & Assert - Step by step workflow

            // 1. Update AI unit at turn start
            const updateResult = gameStateManager.updateAIUnitAtTurnStart(enemyUnit);
            expect(updateResult.success).toBe(true);
            expect(enemyUnit.hasActed).toBe(false);
            expect(enemyUnit.hasMoved).toBe(false);

            // 2. Start AI thinking phase
            const thinkingResult = gameStateManager.startAIThinkingPhase(enemyUnit);
            expect(thinkingResult.success).toBe(true);
            expect(gameStateManager.getCurrentPhase()).toBe('ai_thinking');

            // 3. Complete AI thinking phase
            const completeThinkingResult = gameStateManager.completeAIThinkingPhase(enemyUnit);
            expect(completeThinkingResult.success).toBe(true);
            expect(gameStateManager.getCurrentPhase()).toBe('enemy');

            // 4. Complete AI move action
            const moveResult = gameStateManager.completeAIAction(enemyUnit, 'move');
            expect(moveResult.success).toBe(true);
            expect(enemyUnit.hasMoved).toBe(true);
            expect(enemyUnit.hasActed).toBe(false);

            // 5. Complete AI attack action
            const attackResult = gameStateManager.completeAIAction(enemyUnit, 'attack');
            expect(attackResult.success).toBe(true);
            expect(enemyUnit.hasActed).toBe(true);

            // Verify all events were emitted
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('ai-unit-turn-started', expect.any(Object));
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('ai-thinking-started', expect.any(Object));
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('ai-thinking-completed', expect.any(Object));
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('ai-action-completed', expect.objectContaining({
                actionType: 'move'
            }));
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('ai-action-completed', expect.objectContaining({
                actionType: 'attack',
                turnComplete: true
            }));
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid AI unit for action completion', () => {
            // Act
            const result = gameStateManager.completeAIAction(null as any, 'attack');

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toContain('AI unit is null or undefined');
        });

        test('should handle invalid AI unit for thinking phase', () => {
            // Act
            const result = gameStateManager.startAIThinkingPhase(null as any);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toContain('Invalid AI unit for thinking phase');
        });
    });

    describe('Phase Validation', () => {
        test('should accept ai_thinking as valid phase', () => {
            // Act
            const result = gameStateManager.setPhase('ai_thinking');

            // Assert
            expect(result.success).toBe(true);
            expect(gameStateManager.getCurrentPhase()).toBe('ai_thinking');
        });

        test('should emit phase changed event for ai_thinking phase', () => {
            // Act
            gameStateManager.setPhase('ai_thinking');

            // Assert
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('phase-changed', {
                phase: 'ai_thinking',
                activePlayer: expect.any(String),
                activeUnit: expect.any(Object)
            });
        });
    });
});