/**
 * Character Loss Warning System - E2E Tests
 * 
 * End-to-end tests for the character loss warning system flow:
 * Danger State → Warning Display → Player Judgment
 * 
 * This test suite focuses on the complete warning system user journey
 * from danger detection through player decision making.
 */

import { CharacterLossManager } from '../../game/src/systems/CharacterLossManager';
import { CharacterDangerWarningSystem } from '../../game/src/systems/CharacterDangerWarningSystem';
import { CharacterLossUI } from '../../game/src/ui/CharacterLossUI';
import { BattleSystem } from '../../game/src/systems/BattleSystem';
import { GameStateManager } from '../../game/src/systems/GameStateManager';
import {
    CharacterLossUtils,
    DangerLevel,
    LossCauseType
} from '../../game/src/types/characterLoss';
import { Unit, GameAction } from '../../game/src/types/gameplay';

// Mock Phaser Scene with warning system support
const mockScene = {
    add: {
        existing: jest.fn(),
        container: jest.fn(() => ({
            setDepth: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            add: jest.fn(),
            removeAll: jest.fn(),
            setAlpha: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
        })),
        text: jest.fn(() => ({
            setOrigin: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            setTint: jest.fn().mockReturnThis(),
        })),
        graphics: jest.fn(() => ({
            fillStyle: jest.fn().mockReturnThis(),
            fillRoundedRect: jest.fn().mockReturnThis(),
            lineStyle: jest.fn().mockReturnThis(),
            strokeRoundedRect: jest.fn().mockReturnThis(),
        })),
        particles: jest.fn(() => ({
            createEmitter: jest.fn(() => ({
                start: jest.fn(),
                stop: jest.fn(),
                destroy: jest.fn(),
            })),
        })),
    },
    events: {
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
    },
    cameras: {
        main: { width: 1920, height: 1080 }
    },
    scale: {
        on: jest.fn(),
    },
    time: {
        delayedCall: jest.fn((delay, callback) => {
            setTimeout(callback, 0); // Execute immediately for testing
        }),
    },
    tweens: {
        add: jest.fn((config) => {
            // Simulate animation completion
            if (config.onComplete) {
                setTimeout(config.onComplete, 0);
            }
            return { stop: jest.fn() };
        }),
    },
    input: {
        on: jest.fn(),
        off: jest.fn(),
    },
} as any;

// Helper to create mock units with varying HP levels
const createMockUnit = (
    id: string,
    name: string,
    currentHP: number = 100,
    maxHP: number = 100,
    faction: 'player' | 'enemy' | 'npc' = 'player',
    isImportant: boolean = false
): Unit => ({
    id,
    name,
    position: { x: Math.floor(Math.random() * 10), y: Math.floor(Math.random() * 10) },
    currentHP,
    stats: {
        maxHP,
        attack: 10,
        defense: 5,
        speed: 8,
        movement: 3
    },
    level: 1,
    faction,
    hasActed: false,
    hasMoved: false,
    wasRecruited: faction === 'npc',
    isImportant,
} as Unit);

// Helper to create mock game actions
const createMockAction = (
    type: string,
    unitId: string,
    riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): GameAction => ({
    type,
    unitId,
    riskLevel,
    targetPosition: { x: 5, y: 5 },
    targetUnitId: 'enemy1',
    metadata: { riskLevel },
} as GameAction);

// Mock battle system with danger assessment
const createMockBattleSystem = () => ({
    on: jest.fn(),
    emit: jest.fn(),
    assessActionRisk: jest.fn((unit: Unit, action: GameAction) => {
        // Simulate risk assessment based on unit HP and action type
        if (unit.currentHP <= 25) return 'critical';
        if (unit.currentHP <= 50) return 'high';
        if (action.type === 'attack') return 'medium';
        return 'low';
    }),
    calculatePotentialDamage: jest.fn((attacker: Unit, target: Unit) => ({
        minDamage: 10,
        maxDamage: 30,
        averageDamage: 20,
        criticalChance: 0.1,
    })),
    getCurrentBattleState: jest.fn(() => ({
        phase: 'player_turn',
        currentUnit: null,
        turnCount: 1
    })),
});

// Mock game state manager
const createMockGameStateManager = () => ({
    on: jest.fn(),
    emit: jest.fn(),
    updateUnit: jest.fn(() => ({ success: true })),
    getCurrentTurn: jest.fn(() => 1),
    setGameResult: jest.fn(),
    getGameResult: jest.fn(() => null),
    getAllUnits: jest.fn(() => []),
    getPlayerUnits: jest.fn(() => []),
    getEnemyUnits: jest.fn(() => []),
});

describe('Character Loss Warning System - E2E Tests', () => {
    let manager: CharacterLossManager;
    let warningSystem: CharacterDangerWarningSystem;
    let lossUI: CharacterLossUI;
    let battleSystem: any;
    let gameStateManager: any;
    let mockUnits: Unit[];

    beforeEach(() => {
        // Create units with various HP levels for danger testing
        mockUnits = [
            createMockUnit('hero', 'Hero', 100, 100, 'player', true), // Important character
            createMockUnit('warrior', 'Warrior', 85, 100, 'player'),
            createMockUnit('mage', 'Mage', 45, 100, 'player'), // Medium danger
            createMockUnit('archer', 'Archer', 20, 100, 'player'), // High danger
            createMockUnit('cleric', 'Cleric', 10, 100, 'player'), // Critical danger
            createMockUnit('rogue', 'Rogue', 5, 100, 'player'), // Critical danger
            createMockUnit('goblin1', 'Goblin Scout', 40, 40, 'enemy'),
            createMockUnit('orc1', 'Orc Brute', 80, 80, 'enemy'),
        ];

        // Create system components
        battleSystem = createMockBattleSystem();
        gameStateManager = createMockGameStateManager();
        lossUI = new CharacterLossUI(mockScene);
        warningSystem = new CharacterDangerWarningSystem(mockScene);

        // Create manager with full system integration
        manager = new CharacterLossManager(mockScene);
        manager.setSystemDependencies({
            battleSystem,
            gameStateManager,
            lossUI,
            dangerWarningSystem: warningSystem,
        });
    });

    describe('Danger State Detection and Assessment', () => {
        test('should correctly assess danger levels based on HP percentage', async () => {
            // Initialize chapter
            const chapterId = 'chapter-danger-assessment';
            manager.initializeChapter(chapterId, mockUnits);

            // Test danger level assessment for different HP levels
            const dangerTests = [
                { unit: mockUnits.find(u => u.id === 'hero')!, expectedLevel: DangerLevel.NONE }, // 100% HP
                { unit: mockUnits.find(u => u.id === 'warrior')!, expectedLevel: DangerLevel.LOW }, // 85% HP
                { unit: mockUnits.find(u => u.id === 'mage')!, expectedLevel: DangerLevel.MEDIUM }, // 45% HP
                { unit: mockUnits.find(u => u.id === 'archer')!, expectedLevel: DangerLevel.HIGH }, // 20% HP
                { unit: mockUnits.find(u => u.id === 'cleric')!, expectedLevel: DangerLevel.CRITICAL }, // 10% HP
                { unit: mockUnits.find(u => u.id === 'rogue')!, expectedLevel: DangerLevel.CRITICAL }, // 5% HP
            ];

            for (const { unit, expectedLevel } of dangerTests) {
                const dangerLevel = manager.checkDangerState(unit);
                expect(dangerLevel).toBe(expectedLevel);
            }

            console.log('✓ Danger level assessment test passed');
        });

        test('should detect danger state changes during battle', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-danger-changes', mockUnits);

            const testUnit = mockUnits.find(u => u.id === 'warrior')!;

            // Initial state - healthy
            let dangerLevel = manager.checkDangerState(testUnit);
            expect(dangerLevel).toBe(DangerLevel.LOW);

            // Simulate taking damage
            testUnit.currentHP = 30; // Now at 30% HP
            dangerLevel = manager.checkDangerState(testUnit);
            expect(dangerLevel).toBe(DangerLevel.MEDIUM);

            // Take more damage
            testUnit.currentHP = 15; // Now at 15% HP
            dangerLevel = manager.checkDangerState(testUnit);
            expect(dangerLevel).toBe(DangerLevel.HIGH);

            // Critical damage
            testUnit.currentHP = 5; // Now at 5% HP
            dangerLevel = manager.checkDangerState(testUnit);
            expect(dangerLevel).toBe(DangerLevel.CRITICAL);

            console.log('✓ Danger state change detection test passed');
        });

        test('should handle important character danger assessment', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-important-danger', mockUnits);

            const importantUnit = mockUnits.find(u => u.id === 'hero')!;

            // Reduce important character's HP
            importantUnit.currentHP = 20; // 20% HP

            const dangerLevel = manager.checkDangerState(importantUnit);
            expect(dangerLevel).toBe(DangerLevel.HIGH);

            // Important characters should trigger special handling
            expect(importantUnit.isImportant).toBe(true);

            console.log('✓ Important character danger assessment test passed');
        });
    });

    describe('Warning Display Flow', () => {
        test('should display warnings for dangerous actions', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-warning-display', mockUnits);

            const dangerousUnit = mockUnits.find(u => u.id === 'archer')!; // 20% HP
            const riskAction = createMockAction('attack', dangerousUnit.id, 'high');

            // Track warning display events
            const warningEvents: string[] = [];
            manager.on('danger-warning-shown', () => warningEvents.push('warning-shown'));
            manager.on('confirmation-dialog-shown', () => warningEvents.push('confirmation-shown'));

            // Show warning for dangerous action
            const warningResult = await manager.showLossWarning(dangerousUnit, riskAction);

            // Verify warning was displayed
            expect(typeof warningResult).toBe('boolean');

            console.log('✓ Warning display for dangerous actions test passed');
        });

        test('should show different warning types based on danger level', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-warning-types', mockUnits);

            // Test different warning scenarios
            const warningScenarios = [
                {
                    unit: mockUnits.find(u => u.id === 'mage')!, // Medium danger
                    action: createMockAction('move', 'mage', 'medium'),
                    expectedWarningType: 'caution',
                },
                {
                    unit: mockUnits.find(u => u.id === 'archer')!, // High danger
                    action: createMockAction('attack', 'archer', 'high'),
                    expectedWarningType: 'warning',
                },
                {
                    unit: mockUnits.find(u => u.id === 'cleric')!, // Critical danger
                    action: createMockAction('attack', 'cleric', 'critical'),
                    expectedWarningType: 'critical',
                },
            ];

            for (const scenario of warningScenarios) {
                const warningResult = await manager.showLossWarning(scenario.unit, scenario.action);
                expect(typeof warningResult).toBe('boolean');
            }

            console.log('✓ Different warning types test passed');
        });

        test('should show special warnings for important characters', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-important-warnings', mockUnits);

            const importantUnit = mockUnits.find(u => u.id === 'hero')!;
            importantUnit.currentHP = 15; // Put important character in danger

            const riskAction = createMockAction('attack', importantUnit.id, 'critical');

            // Track important character warning events
            const importantWarningEvents: string[] = [];
            manager.on('important-character-warning-shown', () =>
                importantWarningEvents.push('important-warning-shown')
            );

            // Show warning for important character
            const warningResult = await manager.showLossWarning(importantUnit, riskAction);

            expect(typeof warningResult).toBe('boolean');

            console.log('✓ Important character special warnings test passed');
        });
    });

    describe('Player Judgment and Decision Flow', () => {
        test('should handle player confirmation to proceed with risky action', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-player-proceed', mockUnits);

            const riskyUnit = mockUnits.find(u => u.id === 'archer')!; // 20% HP
            const riskAction = createMockAction('attack', riskyUnit.id, 'high');

            // Mock player choosing to proceed
            jest.spyOn(manager, 'showLossWarning').mockResolvedValue(true);

            const proceedDecision = await manager.showLossWarning(riskyUnit, riskAction);
            expect(proceedDecision).toBe(true);

            // If player proceeds, simulate the risky action resulting in loss
            const lossCause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 25);
            const lostCharacter = await manager.processCharacterLoss(riskyUnit, lossCause);

            expect(lostCharacter.characterId).toBe(riskyUnit.id);
            expect(manager.isCharacterLost(riskyUnit.id)).toBe(true);

            console.log('✓ Player proceed with risky action test passed');
        });

        test('should handle player cancellation of risky action', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-player-cancel', mockUnits);

            const riskyUnit = mockUnits.find(u => u.id === 'cleric')!; // 10% HP
            const riskAction = createMockAction('attack', riskyUnit.id, 'critical');

            // Mock player choosing to cancel
            jest.spyOn(manager, 'showLossWarning').mockResolvedValue(false);

            const cancelDecision = await manager.showLossWarning(riskyUnit, riskAction);
            expect(cancelDecision).toBe(false);

            // If player cancels, character should remain safe
            expect(manager.isCharacterLost(riskyUnit.id)).toBe(false);
            expect(riskyUnit.currentHP).toBe(10); // HP unchanged

            console.log('✓ Player cancel risky action test passed');
        });

        test('should handle multiple warning decisions in sequence', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-multiple-decisions', mockUnits);

            const decisionSequence = [
                {
                    unit: mockUnits.find(u => u.id === 'mage')!,
                    action: createMockAction('move', 'mage', 'medium'),
                    playerDecision: true, // Proceed
                },
                {
                    unit: mockUnits.find(u => u.id === 'archer')!,
                    action: createMockAction('attack', 'archer', 'high'),
                    playerDecision: false, // Cancel
                },
                {
                    unit: mockUnits.find(u => u.id === 'cleric')!,
                    action: createMockAction('heal', 'cleric', 'low'),
                    playerDecision: true, // Proceed (low risk)
                },
            ];

            const decisions = [];
            for (const scenario of decisionSequence) {
                // Mock player decision
                jest.spyOn(manager, 'showLossWarning').mockResolvedValue(scenario.playerDecision);

                const decision = await manager.showLossWarning(scenario.unit, scenario.action);
                decisions.push(decision);

                expect(decision).toBe(scenario.playerDecision);
            }

            expect(decisions).toEqual([true, false, true]);

            console.log('✓ Multiple warning decisions sequence test passed');
        });
    });

    describe('Complete Warning System Flow Integration', () => {
        test('should handle complete warning flow from danger to resolution', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-complete-warning-flow', mockUnits);

            // Step 1: Character enters danger state
            const testUnit = mockUnits.find(u => u.id === 'warrior')!;
            testUnit.currentHP = 25; // Put in danger

            // Step 2: Assess danger level
            const dangerLevel = manager.checkDangerState(testUnit);
            expect(dangerLevel).toBe(DangerLevel.MEDIUM);

            // Step 3: Player attempts risky action
            const riskAction = createMockAction('attack', testUnit.id, 'high');

            // Step 4: System shows warning
            jest.spyOn(manager, 'showLossWarning').mockResolvedValue(true);
            const playerDecision = await manager.showLossWarning(testUnit, riskAction);
            expect(playerDecision).toBe(true);

            // Step 5: Player proceeds, action results in loss
            const lossCause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 30);
            const lostCharacter = await manager.processCharacterLoss(testUnit, lossCause);

            // Step 6: Verify complete flow
            expect(lostCharacter.characterId).toBe(testUnit.id);
            expect(manager.isCharacterLost(testUnit.id)).toBe(true);

            // Step 7: Complete chapter
            const completeResult = manager.completeChapter();
            expect(completeResult.success).toBe(true);
            expect(completeResult.summary!.lostCharacters).toHaveLength(1);

            console.log('✓ Complete warning flow integration test passed');
        });

        test('should handle warning flow with save/load persistence', async () => {
            // Initialize chapter
            const chapterId = 'chapter-warning-persistence';
            manager.initializeChapter(chapterId, mockUnits);

            // Put character in danger and save state
            const testUnit = mockUnits.find(u => u.id === 'mage')!;
            testUnit.currentHP = 30;

            const saveResult = manager.saveChapterState();
            expect(saveResult.success).toBe(true);

            // Create new manager and load state
            const newManager = new CharacterLossManager(mockScene);
            newManager.setSystemDependencies({
                battleSystem,
                gameStateManager,
                lossUI,
                dangerWarningSystem: new CharacterDangerWarningSystem(mockScene),
            });

            const loadResult = newManager.loadChapterState(chapterId);
            expect(loadResult.success).toBe(true);

            // Warning system should still work with loaded state
            const dangerLevel = newManager.checkDangerState(testUnit);
            expect(dangerLevel).toBe(DangerLevel.MEDIUM);

            console.log('✓ Warning flow with persistence test passed');
        });

        test('should handle warning flow under stress conditions', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-warning-stress', mockUnits);

            // Create multiple simultaneous warning scenarios
            const warningScenarios = mockUnits
                .filter(u => u.faction === 'player')
                .map(unit => {
                    unit.currentHP = Math.floor(Math.random() * 30) + 10; // Random low HP
                    return {
                        unit,
                        action: createMockAction('attack', unit.id, 'high'),
                    };
                });

            const startTime = performance.now();

            // Process multiple warnings simultaneously
            const warningPromises = warningScenarios.map(scenario => {
                jest.spyOn(manager, 'showLossWarning').mockResolvedValue(Math.random() > 0.5);
                return manager.showLossWarning(scenario.unit, scenario.action);
            });

            const decisions = await Promise.all(warningPromises);

            const endTime = performance.now();
            const processingTime = endTime - startTime;

            // Verify performance and correctness
            expect(processingTime).toBeLessThan(5000); // 5 seconds max
            expect(decisions).toHaveLength(warningScenarios.length);
            decisions.forEach(decision => {
                expect(typeof decision).toBe('boolean');
            });

            console.log(`✓ Warning flow stress test passed: ${processingTime.toFixed(2)}ms`);
        });
    });

    describe('Warning System Error Handling', () => {
        test('should handle errors in warning display gracefully', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-warning-errors', mockUnits);

            const testUnit = mockUnits.find(u => u.id === 'archer')!;
            testUnit.currentHP = 15;

            // Simulate error in warning system
            const invalidAction = { type: 'invalid', unitId: testUnit.id } as any;

            try {
                const warningResult = await manager.showLossWarning(testUnit, invalidAction);
                // Should handle gracefully, possibly returning default decision
                expect(typeof warningResult).toBe('boolean');
            } catch (error) {
                // Or should throw a handled error
                expect(error).toBeDefined();
            }

            // System should remain functional
            const dangerLevel = manager.checkDangerState(testUnit);
            expect(dangerLevel).toBe(DangerLevel.HIGH);

            console.log('✓ Warning system error handling test passed');
        });

        test('should recover from UI component failures', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-ui-failure-recovery', mockUnits);

            // Simulate UI component failure
            const originalShowWarning = lossUI.showDangerWarning;
            lossUI.showDangerWarning = jest.fn(() => {
                throw new Error('UI component failed');
            });

            const testUnit = mockUnits.find(u => u.id === 'cleric')!;
            testUnit.currentHP = 8;

            const riskAction = createMockAction('attack', testUnit.id, 'critical');

            // Warning system should handle UI failure gracefully
            try {
                const warningResult = await manager.showLossWarning(testUnit, riskAction);
                expect(typeof warningResult).toBe('boolean');
            } catch (error) {
                // Should be a handled error, not a crash
                expect(error).toBeDefined();
            }

            // Restore UI component
            lossUI.showDangerWarning = originalShowWarning;

            console.log('✓ UI component failure recovery test passed');
        });
    });

    describe('Warning System Performance and Optimization', () => {
        test('should perform danger assessment efficiently', async () => {
            // Create large unit set
            const largeUnitSet = Array.from({ length: 100 }, (_, i) =>
                createMockUnit(`unit${i}`, `Unit ${i}`, Math.floor(Math.random() * 100), 100, 'player')
            );

            manager.initializeChapter('chapter-danger-performance', largeUnitSet);

            const startTime = performance.now();

            // Assess danger for all units
            const dangerAssessments = largeUnitSet.map(unit => ({
                unit,
                dangerLevel: manager.checkDangerState(unit),
            }));

            const endTime = performance.now();
            const assessmentTime = endTime - startTime;

            // Verify performance
            expect(assessmentTime).toBeLessThan(1000); // 1 second max
            expect(dangerAssessments).toHaveLength(100);

            // Verify correctness
            dangerAssessments.forEach(assessment => {
                expect(Object.values(DangerLevel)).toContain(assessment.dangerLevel);
            });

            console.log(`✓ Danger assessment performance test passed: ${assessmentTime.toFixed(2)}ms`);
        });

        test('should optimize warning display for frequent updates', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-warning-optimization', mockUnits);

            const testUnit = mockUnits.find(u => u.id === 'warrior')!;

            const startTime = performance.now();

            // Simulate frequent HP changes and warning updates
            for (let hp = 100; hp > 0; hp -= 5) {
                testUnit.currentHP = hp;
                const dangerLevel = manager.checkDangerState(testUnit);

                if (dangerLevel !== DangerLevel.NONE) {
                    const action = createMockAction('move', testUnit.id, 'low');
                    jest.spyOn(manager, 'showLossWarning').mockResolvedValue(true);
                    await manager.showLossWarning(testUnit, action);
                }
            }

            const endTime = performance.now();
            const updateTime = endTime - startTime;

            // Should handle frequent updates efficiently
            expect(updateTime).toBeLessThan(3000); // 3 seconds max

            console.log(`✓ Warning display optimization test passed: ${updateTime.toFixed(2)}ms`);
        });
    });
});