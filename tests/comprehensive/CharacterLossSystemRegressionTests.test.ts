/**
 * Character Loss System - Regression Test Suite
 * 
 * Comprehensive regression tests to ensure critical functionality
 * remains stable across system changes and updates.
 * 
 * This test suite focuses on:
 * - Data consistency and integrity
 * - System integration stability
 * - Performance regression detection
 * - Error handling robustness
 * - UI/UX consistency
 * - Memory management
 */

import { CharacterLossManager } from '../../game/src/systems/CharacterLossManager';
import { CharacterLossState } from '../../game/src/systems/CharacterLossState';
import { CharacterLossUI } from '../../game/src/ui/CharacterLossUI';
import { CharacterLossEffects } from '../../game/src/systems/CharacterLossEffects';
import { CharacterDangerWarningSystem } from '../../game/src/systems/CharacterDangerWarningSystem';
import { BattleSystem } from '../../game/src/systems/BattleSystem';
import { RecruitmentSystem } from '../../game/src/systems/recruitment/RecruitmentSystem';
import { GameStateManager } from '../../game/src/systems/GameStateManager';
import {
    CharacterLossUtils,
    LossCauseType,
    DangerLevel,
    CharacterLossError
} from '../../game/src/types/characterLoss';
import { Unit } from '../../game/src/types/gameplay';

// Mock localStorage for persistence testing
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value.toString(); },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
        length: Object.keys(store).length,
        key: (index: number) => Object.keys(store)[index] || null,
    };
})();

// Mock Phaser Scene
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
            setTimeout(callback, 0);
        }),
    },
    tweens: {
        add: jest.fn((config) => {
            if (config.onComplete) {
                setTimeout(config.onComplete, 0);
            }
            return { stop: jest.fn() };
        }),
    },
} as any;

// Helper to create comprehensive mock units
const createMockUnit = (
    id: string,
    name: string,
    currentHP: number = 100,
    faction: 'player' | 'enemy' | 'npc' = 'player',
    additionalProps: any = {}
): Unit => ({
    id,
    name,
    position: { x: Math.floor(Math.random() * 10), y: Math.floor(Math.random() * 10) },
    currentHP,
    stats: {
        maxHP: 100,
        attack: 10 + Math.floor(Math.random() * 10),
        defense: 5 + Math.floor(Math.random() * 5),
        speed: 8 + Math.floor(Math.random() * 4),
        movement: 3
    },
    level: 1 + Math.floor(Math.random() * 5),
    faction,
    hasActed: false,
    hasMoved: false,
    wasRecruited: faction === 'npc',
    ...additionalProps,
});

// Helper to create mock systems
const createMockSystems = () => ({
    battleSystem: {
        on: jest.fn(),
        emit: jest.fn(),
        processAttack: jest.fn(),
        isUnitDefeated: jest.fn(),
        getCurrentBattleState: jest.fn(() => ({ phase: 'player_turn' })),
    },
    recruitmentSystem: {
        on: jest.fn(),
        emit: jest.fn(),
        isNPC: jest.fn((unit: Unit) => unit.faction === 'npc'),
        handleNPCLoss: jest.fn(),
    },
    gameStateManager: {
        on: jest.fn(),
        emit: jest.fn(),
        updateUnit: jest.fn(() => ({ success: true })),
        getCurrentTurn: jest.fn(() => 1),
        setGameResult: jest.fn(),
        getGameResult: jest.fn(() => null),
    },
});

describe('Character Loss System - Regression Test Suite', () => {
    let manager: CharacterLossManager;
    let mockUnits: Unit[];
    let mockSystems: any;

    beforeEach(() => {
        // Setup localStorage mock
        localStorageMock.clear();
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            writable: true,
        });

        // Create comprehensive unit set
        mockUnits = [
            createMockUnit('hero', 'Hero', 100, 'player', { isImportant: true }),
            createMockUnit('warrior', 'Warrior', 85, 'player'),
            createMockUnit('mage', 'Mage', 60, 'player'),
            createMockUnit('archer', 'Archer', 70, 'player'),
            createMockUnit('cleric', 'Cleric', 90, 'player'),
            createMockUnit('rogue', 'Rogue', 55, 'player'),
            createMockUnit('paladin', 'Paladin', 95, 'player'),
            createMockUnit('wizard', 'Wizard', 65, 'player'),
            createMockUnit('goblin1', 'Goblin Scout', 40, 'enemy'),
            createMockUnit('goblin2', 'Goblin Warrior', 60, 'enemy'),
            createMockUnit('orc1', 'Orc Brute', 80, 'enemy'),
            createMockUnit('knight_npc', 'Recruited Knight', 95, 'npc'),
        ];

        // Create mock systems
        mockSystems = createMockSystems();

        // Create manager with full system integration
        manager = new CharacterLossManager(mockScene);
        manager.setSystemDependencies(mockSystems);
    });

    afterEach(() => {
        localStorageMock.clear();
    });

    describe('Data Consistency and Integrity Regression Tests', () => {
        test('should maintain data consistency across multiple operations', async () => {
            // This test ensures that data remains consistent even with complex operation sequences
            const chapterId = 'chapter-data-consistency';
            manager.initializeChapter(chapterId, mockUnits);

            // Perform complex sequence of operations
            const operations = [
                // Initial losses
                async () => {
                    const cause1 = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 85);
                    await manager.processCharacterLoss(mockUnits[1], cause1); // Warrior
                },
                // Save state
                () => manager.saveChapterState(),
                // More losses
                async () => {
                    const cause2 = CharacterLossUtils.createCriticalDamageCause('goblin1', 'Goblin Scout', 60);
                    await manager.processCharacterLoss(mockUnits[2], cause2); // Mage
                },
                // Load state (should maintain consistency)
                () => manager.loadChapterState(),
                // Additional operations
                async () => {
                    const cause3 = CharacterLossUtils.createStatusEffectCause('poison', 'Poison damage');
                    await manager.processCharacterLoss(mockUnits[5], cause3); // Rogue
                },
                // Save again
                () => manager.saveChapterState(),
                // Complete chapter
                () => manager.completeChapter(),
            ];

            // Execute all operations
            for (const operation of operations) {
                await operation();
            }

            // Verify final consistency
            expect(manager.getTotalLosses()).toBe(3);
            expect(manager.getLostCharacters()).toHaveLength(3);

            // Verify specific losses
            expect(manager.isCharacterLost('warrior')).toBe(true);
            expect(manager.isCharacterLost('mage')).toBe(true);
            expect(manager.isCharacterLost('rogue')).toBe(true);

            // Verify loss history integrity
            const lossHistory = manager.getLossHistory();
            expect(lossHistory).toHaveLength(3);
            expect(lossHistory.every(record => record.characterId && record.cause)).toBe(true);

            console.log('✓ Data consistency regression test passed');
        });

        test('should handle concurrent data modifications without corruption', async () => {
            // Test for race conditions and data corruption under concurrent access
            const chapterId = 'chapter-concurrent-data';
            manager.initializeChapter(chapterId, mockUnits);

            // Create multiple concurrent operations
            const concurrentOperations = [
                manager.processCharacterLoss(
                    mockUnits[1],
                    CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 85)
                ),
                manager.processCharacterLoss(
                    mockUnits[2],
                    CharacterLossUtils.createCriticalDamageCause('goblin1', 'Goblin Scout', 60)
                ),
                manager.processCharacterLoss(
                    mockUnits[3],
                    CharacterLossUtils.createStatusEffectCause('poison', 'Poison damage')
                ),
                Promise.resolve(manager.saveChapterState()),
                Promise.resolve(manager.checkDangerState(mockUnits[4])),
            ];

            // Execute concurrently
            await Promise.all(concurrentOperations);

            // Verify data integrity
            expect(manager.getTotalLosses()).toBe(3);
            expect(manager.getLostCharacters()).toHaveLength(3);

            // Verify no data corruption
            const lostCharacters = manager.getLostCharacters();
            for (const lostChar of lostCharacters) {
                expect(lostChar.characterId).toBeTruthy();
                expect(lostChar.name).toBeTruthy();
                expect(lostChar.cause).toBeTruthy();
                expect(lostChar.lostAt).toBeGreaterThan(0);
            }

            console.log('✓ Concurrent data modification regression test passed');
        });

        test('should maintain referential integrity across system restarts', async () => {
            // Test data integrity across system restarts and reloads
            const chapterId = 'chapter-referential-integrity';

            // First session
            manager.initializeChapter(chapterId, mockUnits);

            const originalLosses = [
                { unit: mockUnits[1], cause: CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 85) },
                { unit: mockUnits[2], cause: CharacterLossUtils.createCriticalDamageCause('goblin1', 'Goblin Scout', 60) },
            ];

            for (const { unit, cause } of originalLosses) {
                await manager.processCharacterLoss(unit, cause);
            }

            manager.saveChapterState();
            const firstSessionSummary = manager.getChapterSummary();

            // Simulate system restart - create new manager
            const newManager = new CharacterLossManager(mockScene);
            newManager.setSystemDependencies(mockSystems);

            // Load state in new session
            const loadResult = newManager.loadChapterState(chapterId);
            expect(loadResult.success).toBe(true);

            // Verify referential integrity
            expect(newManager.getTotalLosses()).toBe(firstSessionSummary.lostCharacters.length);
            expect(newManager.getLostCharacters()).toHaveLength(firstSessionSummary.lostCharacters.length);

            // Verify specific character references
            for (const originalLoss of firstSessionSummary.lostCharacters) {
                expect(newManager.isCharacterLost(originalLoss.characterId)).toBe(true);
                const restoredLoss = newManager.getLostCharacter(originalLoss.characterId);
                expect(restoredLoss).toBeTruthy();
                expect(restoredLoss!.name).toBe(originalLoss.name);
                expect(restoredLoss!.cause.type).toBe(originalLoss.cause.type);
            }

            console.log('✓ Referential integrity regression test passed');
        });
    });

    describe('System Integration Stability Regression Tests', () => {
        test('should maintain stable integration with battle system', async () => {
            // Test battle system integration stability
            const chapterId = 'chapter-battle-integration';
            manager.initializeChapter(chapterId, mockUnits);

            // Simulate various battle system interactions
            const battleInteractions = [
                // Normal battle defeat
                async () => {
                    mockSystems.battleSystem.isUnitDefeated.mockReturnValue(true);
                    const cause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 85);
                    await manager.processCharacterLoss(mockUnits[1], cause);
                },
                // Critical hit defeat
                async () => {
                    mockSystems.battleSystem.isUnitDefeated.mockReturnValue(true);
                    const cause = CharacterLossUtils.createCriticalDamageCause('goblin1', 'Goblin Scout', 120);
                    await manager.processCharacterLoss(mockUnits[2], cause);
                },
                // Status effect defeat
                async () => {
                    const cause = CharacterLossUtils.createStatusEffectCause('poison', 'Poison damage over time');
                    await manager.processCharacterLoss(mockUnits[3], cause);
                },
            ];

            for (const interaction of battleInteractions) {
                await interaction();
            }

            // Verify battle system integration
            expect(mockSystems.gameStateManager.updateUnit).toHaveBeenCalledTimes(3);
            expect(manager.getTotalLosses()).toBe(3);

            // Verify battle system events were handled
            expect(mockSystems.battleSystem.on).toHaveBeenCalled();

            console.log('✓ Battle system integration stability test passed');
        });

        test('should maintain stable integration with recruitment system', async () => {
            // Test recruitment system integration stability
            const chapterId = 'chapter-recruitment-integration';
            manager.initializeChapter(chapterId, mockUnits);

            // Test NPC loss handling
            const npcUnit = mockUnits.find(u => u.faction === 'npc')!;
            const cause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 95);

            await manager.processCharacterLoss(npcUnit, cause);

            // Verify recruitment system integration
            expect(mockSystems.recruitmentSystem.handleNPCLoss).toHaveBeenCalledWith(npcUnit);
            expect(manager.isCharacterLost(npcUnit.id)).toBe(true);

            const lostNPC = manager.getLostCharacter(npcUnit.id);
            expect(lostNPC?.wasRecruited).toBe(true);

            console.log('✓ Recruitment system integration stability test passed');
        });

        test('should handle system integration failures gracefully', async () => {
            // Test graceful handling of system integration failures
            const chapterId = 'chapter-integration-failures';
            manager.initializeChapter(chapterId, mockUnits);

            // Simulate various system failures
            const systemFailures = [
                // Game state manager failure
                () => {
                    mockSystems.gameStateManager.updateUnit.mockReturnValue({ success: false, message: 'Update failed' });
                },
                // Battle system failure
                () => {
                    mockSystems.battleSystem.getCurrentBattleState.mockImplementation(() => {
                        throw new Error('Battle system error');
                    });
                },
                // Recruitment system failure
                () => {
                    mockSystems.recruitmentSystem.handleNPCLoss.mockImplementation(() => {
                        throw new Error('Recruitment system error');
                    });
                },
            ];

            // Test that system continues to function despite failures
            for (let i = 0; i < systemFailures.length; i++) {
                systemFailures[i]();

                const unit = mockUnits[i + 1];
                const cause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 100);

                // Should not throw error despite system failures
                const lostCharacter = await manager.processCharacterLoss(unit, cause);
                expect(lostCharacter.characterId).toBe(unit.id);
                expect(manager.isCharacterLost(unit.id)).toBe(true);
            }

            expect(manager.getTotalLosses()).toBe(3);

            console.log('✓ System integration failure handling test passed');
        });
    });

    describe('Performance Regression Tests', () => {
        test('should maintain acceptable performance for loss processing', async () => {
            // Test that loss processing performance hasn't regressed
            const chapterId = 'chapter-performance-test';
            manager.initializeChapter(chapterId, mockUnits);

            const performanceThresholds = {
                singleLoss: 100, // 100ms max per loss
                multipleLosses: 500, // 500ms max for 10 losses
                largeDataset: 2000, // 2s max for 50 losses
            };

            // Test single loss performance
            const singleLossStart = performance.now();
            const cause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 85);
            await manager.processCharacterLoss(mockUnits[1], cause);
            const singleLossTime = performance.now() - singleLossStart;

            expect(singleLossTime).toBeLessThan(performanceThresholds.singleLoss);

            // Test multiple losses performance
            const multipleLossesStart = performance.now();
            const lossPromises = [];
            for (let i = 2; i < 12 && i < mockUnits.length; i++) {
                const unit = mockUnits[i];
                if (unit.faction === 'player') {
                    const lossCause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 100);
                    lossPromises.push(manager.processCharacterLoss(unit, lossCause));
                }
            }
            await Promise.all(lossPromises);
            const multipleLossesTime = performance.now() - multipleLossesStart;

            expect(multipleLossesTime).toBeLessThan(performanceThresholds.multipleLosses);

            console.log(`✓ Performance regression test passed: Single=${singleLossTime.toFixed(2)}ms, Multiple=${multipleLossesTime.toFixed(2)}ms`);
        });

        test('should maintain memory efficiency under load', async () => {
            // Test memory usage doesn't regress under load
            const chapterId = 'chapter-memory-test';

            // Create large dataset
            const largeUnitSet = Array.from({ length: 100 }, (_, i) =>
                createMockUnit(`unit${i}`, `Unit ${i}`, 100, 'player')
            );

            manager.initializeChapter(chapterId, largeUnitSet);

            const initialMemory = process.memoryUsage().heapUsed;

            // Process many losses
            const lossPromises = largeUnitSet.slice(0, 50).map(unit => {
                const cause = CharacterLossUtils.createBattleDefeatCause('enemy', 'Enemy', 100);
                return manager.processCharacterLoss(unit, cause);
            });

            await Promise.all(lossPromises);

            // Save and load multiple times
            for (let i = 0; i < 10; i++) {
                manager.saveChapterState();
                manager.loadChapterState();
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;

            // Memory increase should be reasonable (less than 50MB)
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

            console.log(`✓ Memory efficiency test passed: Memory increase=${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
        });

        test('should maintain UI responsiveness during heavy operations', async () => {
            // Test UI responsiveness doesn't regress
            const chapterId = 'chapter-ui-responsiveness';
            manager.initializeChapter(chapterId, mockUnits);

            const uiOperationStart = performance.now();

            // Simulate heavy UI operations
            const uiOperations = [];
            for (let i = 0; i < 20; i++) {
                const unit = mockUnits[i % mockUnits.length];

                // Simulate UI updates
                uiOperations.push(
                    Promise.resolve(manager.checkDangerState(unit))
                );

                if (i % 5 === 0 && unit.faction === 'player') {
                    const cause = CharacterLossUtils.createBattleDefeatCause('enemy', 'Enemy', 100);
                    uiOperations.push(manager.processCharacterLoss(unit, cause));
                }
            }

            await Promise.all(uiOperations);

            const uiOperationTime = performance.now() - uiOperationStart;

            // UI operations should complete within reasonable time
            expect(uiOperationTime).toBeLessThan(3000); // 3 seconds max

            console.log(`✓ UI responsiveness test passed: ${uiOperationTime.toFixed(2)}ms`);
        });
    });

    describe('Error Handling Robustness Regression Tests', () => {
        test('should handle all error scenarios without system crash', async () => {
            // Test comprehensive error handling
            const chapterId = 'chapter-error-handling';
            manager.initializeChapter(chapterId, mockUnits);

            const errorScenarios = [
                // Invalid unit data
                async () => {
                    try {
                        const invalidUnit = { ...mockUnits[1], id: '' };
                        const cause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 85);
                        await manager.processCharacterLoss(invalidUnit, cause);
                    } catch (error) {
                        expect(error).toBeDefined();
                    }
                },
                // Invalid cause data
                async () => {
                    try {
                        const invalidCause = { type: 'invalid', description: '' } as any;
                        await manager.processCharacterLoss(mockUnits[2], invalidCause);
                    } catch (error) {
                        expect(error).toBeDefined();
                    }
                },
                // Duplicate loss processing
                async () => {
                    const unit = mockUnits[3];
                    const cause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 70);

                    // First loss should succeed
                    await manager.processCharacterLoss(unit, cause);

                    // Second loss should be handled gracefully
                    const duplicateLoss = await manager.processCharacterLoss(unit, cause);
                    expect(duplicateLoss.characterId).toBe(unit.id);
                },
                // Corrupted save data
                () => {
                    localStorageMock.setItem(`character_loss_${chapterId}`, 'corrupted data');
                    const loadResult = manager.loadChapterState();
                    expect(loadResult.success).toBe(true); // Should recover gracefully
                },
            ];

            for (const scenario of errorScenarios) {
                await scenario();
            }

            // System should remain functional
            expect(manager.getTotalLosses()).toBeGreaterThan(0);

            console.log('✓ Error handling robustness test passed');
        });

        test('should recover from critical system errors', async () => {
            // Test recovery from critical errors
            const chapterId = 'chapter-critical-errors';
            manager.initializeChapter(chapterId, mockUnits);

            // Simulate critical system errors
            const criticalErrors = [
                // localStorage failure
                () => {
                    const originalSetItem = localStorageMock.setItem;
                    localStorageMock.setItem = jest.fn(() => {
                        throw new Error('Storage quota exceeded');
                    });

                    const saveResult = manager.saveChapterState();
                    expect(saveResult.success).toBe(false);

                    // Restore functionality
                    localStorageMock.setItem = originalSetItem;
                },
                // Memory allocation failure simulation
                () => {
                    const originalGetLostCharacters = manager.getLostCharacters;
                    manager.getLostCharacters = jest.fn(() => {
                        throw new Error('Out of memory');
                    });

                    try {
                        manager.getLostCharacters();
                    } catch (error) {
                        expect(error).toBeDefined();
                    }

                    // Restore functionality
                    manager.getLostCharacters = originalGetLostCharacters;
                },
            ];

            for (const errorSimulation of criticalErrors) {
                errorSimulation();
            }

            // System should still be able to process losses
            const unit = mockUnits[1];
            const cause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 85);
            const lostCharacter = await manager.processCharacterLoss(unit, cause);

            expect(lostCharacter.characterId).toBe(unit.id);

            console.log('✓ Critical error recovery test passed');
        });
    });

    describe('UI/UX Consistency Regression Tests', () => {
        test('should maintain consistent UI behavior across operations', async () => {
            // Test UI consistency
            const chapterId = 'chapter-ui-consistency';
            manager.initializeChapter(chapterId, mockUnits);

            const lossUI = new CharacterLossUI(mockScene);
            manager.setLossUI(lossUI);

            // Track UI events
            const uiEvents: string[] = [];
            manager.on('character-loss-processed', () => uiEvents.push('loss-processed'));
            manager.on('chapter-completed', () => uiEvents.push('chapter-completed'));

            // Process losses and verify UI updates
            const unit1 = mockUnits[1];
            const cause1 = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 85);
            await manager.processCharacterLoss(unit1, cause1);

            const unit2 = mockUnits[2];
            const cause2 = CharacterLossUtils.createCriticalDamageCause('goblin1', 'Goblin Scout', 60);
            await manager.processCharacterLoss(unit2, cause2);

            // Complete chapter
            manager.completeChapter();

            // Verify UI events were triggered consistently
            expect(uiEvents.filter(event => event === 'loss-processed')).toHaveLength(2);

            console.log('✓ UI consistency regression test passed');
        });

        test('should maintain consistent danger level calculations', async () => {
            // Test danger level calculation consistency
            const chapterId = 'chapter-danger-consistency';
            manager.initializeChapter(chapterId, mockUnits);

            // Test danger levels for various HP percentages
            const dangerTests = [
                { hp: 100, expected: DangerLevel.NONE },
                { hp: 75, expected: DangerLevel.LOW },
                { hp: 45, expected: DangerLevel.MEDIUM },
                { hp: 20, expected: DangerLevel.HIGH },
                { hp: 10, expected: DangerLevel.CRITICAL },
                { hp: 5, expected: DangerLevel.CRITICAL },
            ];

            for (const test of dangerTests) {
                const testUnit = { ...mockUnits[0], currentHP: test.hp };
                const dangerLevel = manager.checkDangerState(testUnit);
                expect(dangerLevel).toBe(test.expected);
            }

            console.log('✓ Danger level consistency test passed');
        });
    });

    describe('Memory Management Regression Tests', () => {
        test('should properly cleanup resources after chapter completion', async () => {
            // Test memory cleanup
            const chapterId = 'chapter-memory-cleanup';
            manager.initializeChapter(chapterId, mockUnits);

            // Create some state
            const unit = mockUnits[1];
            const cause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 85);
            await manager.processCharacterLoss(unit, cause);

            // Save state
            manager.saveChapterState();

            // Complete chapter
            const completeResult = manager.completeChapter();
            expect(completeResult.success).toBe(true);

            // Verify cleanup
            expect(manager.hasSaveData(chapterId)).toBe(false);

            console.log('✓ Memory cleanup regression test passed');
        });

        test('should handle memory pressure gracefully', async () => {
            // Test behavior under memory pressure
            const chapterId = 'chapter-memory-pressure';

            // Create large dataset to simulate memory pressure
            const largeUnitSet = Array.from({ length: 200 }, (_, i) =>
                createMockUnit(`memory${i}`, `Memory Unit ${i}`, 100, 'player')
            );

            manager.initializeChapter(chapterId, largeUnitSet);

            // Process many losses
            const lossPromises = largeUnitSet.slice(0, 100).map(unit => {
                const cause = CharacterLossUtils.createBattleDefeatCause('enemy', 'Enemy', 100);
                return manager.processCharacterLoss(unit, cause);
            });

            await Promise.all(lossPromises);

            // Verify system remains stable
            expect(manager.getTotalLosses()).toBe(100);
            expect(manager.getLostCharacters()).toHaveLength(100);

            // Complete chapter to trigger cleanup
            const completeResult = manager.completeChapter();
            expect(completeResult.success).toBe(true);

            console.log('✓ Memory pressure handling test passed');
        });
    });

    describe('Backward Compatibility Regression Tests', () => {
        test('should maintain compatibility with legacy save data formats', async () => {
            // Test backward compatibility with older save formats
            const chapterId = 'chapter-legacy-compatibility';

            // Simulate legacy save data format
            const legacySaveData = {
                chapterId,
                lostCharacters: {
                    'warrior': {
                        characterId: 'warrior',
                        name: 'Warrior',
                        lostAt: Date.now() - 10000,
                        turn: 5,
                        cause: {
                            type: 'battle_defeat',
                            sourceId: 'orc1',
                            sourceName: 'Orc Brute',
                            description: 'Defeated in battle',
                        },
                        level: 3,
                        wasRecruited: false,
                    },
                },
                lossHistory: [],
                chapterStartTime: Date.now() - 60000,
                version: '0.9.0', // Legacy version
            };

            // Save legacy data
            localStorageMock.setItem(
                `character_loss_${chapterId}`,
                JSON.stringify(legacySaveData)
            );

            // Load with current system
            const loadResult = manager.loadChapterState(chapterId);
            expect(loadResult.success).toBe(true);

            // Verify legacy data was loaded correctly
            expect(manager.isCharacterLost('warrior')).toBe(true);
            const lostCharacter = manager.getLostCharacter('warrior');
            expect(lostCharacter).toBeTruthy();
            expect(lostCharacter!.name).toBe('Warrior');

            console.log('✓ Legacy compatibility test passed');
        });

        test('should handle version migration gracefully', async () => {
            // Test version migration handling
            const chapterId = 'chapter-version-migration';
            manager.initializeChapter(chapterId, mockUnits);

            // Create current version data
            const unit = mockUnits[1];
            const cause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 85);
            await manager.processCharacterLoss(unit, cause);

            manager.saveChapterState();

            // Simulate version upgrade by modifying save data
            const saveData = JSON.parse(localStorageMock.getItem(`character_loss_${chapterId}`)!);
            saveData.version = '2.0.0'; // Future version
            localStorageMock.setItem(`character_loss_${chapterId}`, JSON.stringify(saveData));

            // Load should handle version differences gracefully
            const loadResult = manager.loadChapterState(chapterId);
            expect(loadResult.success).toBe(true);

            console.log('✓ Version migration test passed');
        });
    });

    describe('Edge Case Regression Tests', () => {
        test('should handle edge cases that previously caused issues', async () => {
            // Test specific edge cases that have caused problems in the past
            const chapterId = 'chapter-edge-cases';
            manager.initializeChapter(chapterId, mockUnits);

            const edgeCases = [
                // Empty character name
                async () => {
                    const unit = { ...mockUnits[1], name: '' };
                    const cause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 85);
                    const lostCharacter = await manager.processCharacterLoss(unit, cause);
                    expect(lostCharacter.characterId).toBe(unit.id);
                },
                // Zero HP character
                async () => {
                    const unit = { ...mockUnits[2], currentHP: 0 };
                    const cause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 60);
                    const lostCharacter = await manager.processCharacterLoss(unit, cause);
                    expect(lostCharacter.characterId).toBe(unit.id);
                },
                // Negative HP character
                async () => {
                    const unit = { ...mockUnits[3], currentHP: -10 };
                    const cause = CharacterLossUtils.createCriticalDamageCause('goblin1', 'Goblin Scout', 80);
                    const lostCharacter = await manager.processCharacterLoss(unit, cause);
                    expect(lostCharacter.characterId).toBe(unit.id);
                },
                // Very high level character
                async () => {
                    const unit = { ...mockUnits[4], level: 999 };
                    const cause = CharacterLossUtils.createStatusEffectCause('curse', 'Ancient curse');
                    const lostCharacter = await manager.processCharacterLoss(unit, cause);
                    expect(lostCharacter.level).toBe(999);
                },
            ];

            for (const edgeCase of edgeCases) {
                await edgeCase();
            }

            expect(manager.getTotalLosses()).toBe(4);

            console.log('✓ Edge case regression test passed');
        });

        test('should handle boundary conditions correctly', async () => {
            // Test boundary conditions
            const chapterId = 'chapter-boundary-conditions';
            manager.initializeChapter(chapterId, mockUnits);

            // Test HP percentage boundaries for danger levels
            const boundaryTests = [
                { hp: 51, expected: DangerLevel.LOW }, // Just above medium threshold
                { hp: 50, expected: DangerLevel.MEDIUM }, // Exactly at medium threshold
                { hp: 49, expected: DangerLevel.MEDIUM }, // Just below medium threshold
                { hp: 26, expected: DangerLevel.MEDIUM }, // Just above high threshold
                { hp: 25, expected: DangerLevel.HIGH }, // Exactly at high threshold
                { hp: 24, expected: DangerLevel.HIGH }, // Just below high threshold
                { hp: 1, expected: DangerLevel.CRITICAL }, // Minimum HP
            ];

            for (const test of boundaryTests) {
                const testUnit = { ...mockUnits[0], currentHP: test.hp };
                const dangerLevel = manager.checkDangerState(testUnit);
                expect(dangerLevel).toBe(test.expected);
            }

            console.log('✓ Boundary conditions test passed');
        });
    });
});