/**
 * Character Loss System - Complete Flow E2E Tests
 * 
 * End-to-end tests for the complete character loss flow:
 * Defeat → Loss → Chapter Completion → Reset
 * 
 * This test suite focuses specifically on the complete user journey
 * from character defeat through chapter completion and state reset.
 */

import { CharacterLossManager } from '../../game/src/systems/CharacterLossManager';
import { CharacterLossUI } from '../../game/src/ui/CharacterLossUI';
import { CharacterLossEffects } from '../../game/src/systems/CharacterLossEffects';
import { BattleSystem } from '../../game/src/systems/BattleSystem';
import { GameStateManager } from '../../game/src/systems/GameStateManager';
import {
    CharacterLossUtils,
    LossCauseType,
    DangerLevel
} from '../../game/src/types/characterLoss';
import { Unit } from '../../game/src/types/gameplay';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value.toString(); },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
    };
})();

// Mock Phaser Scene with comprehensive UI support
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
} as any;

// Helper to create mock units with realistic data
const createMockUnit = (
    id: string,
    name: string,
    currentHP: number = 100,
    faction: 'player' | 'enemy' | 'npc' = 'player'
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
});

// Helper to create mock battle system
const createMockBattleSystem = () => ({
    on: jest.fn(),
    emit: jest.fn(),
    processAttack: jest.fn(),
    isUnitDefeated: jest.fn(),
    getCurrentBattleState: jest.fn(() => ({
        phase: 'player_turn',
        currentUnit: null,
        turnCount: 1
    })),
    calculateDamage: jest.fn((attacker, target) => ({
        damage: Math.floor(Math.random() * 50) + 10,
        isCritical: Math.random() > 0.8,
        type: 'physical'
    })),
});

// Helper to create mock game state manager
const createMockGameStateManager = () => ({
    on: jest.fn(),
    emit: jest.fn(),
    updateUnit: jest.fn(() => ({ success: true })),
    getCurrentTurn: jest.fn(() => Math.floor(Math.random() * 10) + 1),
    setGameResult: jest.fn(),
    getGameResult: jest.fn(() => null),
    getAllUnits: jest.fn(() => []),
    getPlayerUnits: jest.fn(() => []),
    getEnemyUnits: jest.fn(() => []),
});

describe('Character Loss System - Complete Flow E2E Tests', () => {
    let manager: CharacterLossManager;
    let lossUI: CharacterLossUI;
    let lossEffects: CharacterLossEffects;
    let battleSystem: any;
    let gameStateManager: any;
    let mockUnits: Unit[];

    beforeEach(() => {
        // Setup localStorage mock
        localStorageMock.clear();
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            writable: true,
        });

        // Create comprehensive unit set
        mockUnits = [
            createMockUnit('hero', 'Hero', 100, 'player'),
            createMockUnit('warrior', 'Warrior', 85, 'player'),
            createMockUnit('mage', 'Mage', 60, 'player'),
            createMockUnit('archer', 'Archer', 70, 'player'),
            createMockUnit('cleric', 'Cleric', 90, 'player'),
            createMockUnit('rogue', 'Rogue', 55, 'player'),
            createMockUnit('goblin1', 'Goblin Scout', 40, 'enemy'),
            createMockUnit('goblin2', 'Goblin Warrior', 60, 'enemy'),
            createMockUnit('orc1', 'Orc Brute', 80, 'enemy'),
            createMockUnit('knight_npc', 'Recruited Knight', 95, 'npc'),
        ];

        // Create system components
        battleSystem = createMockBattleSystem();
        gameStateManager = createMockGameStateManager();
        lossUI = new CharacterLossUI(mockScene);
        lossEffects = new CharacterLossEffects(mockScene);

        // Create manager with full system integration
        manager = new CharacterLossManager(mockScene);
        manager.setSystemDependencies({
            battleSystem,
            gameStateManager,
            lossUI,
            lossEffects,
        });
    });

    afterEach(() => {
        localStorageMock.clear();
    });

    describe('Complete Loss Flow: Single Character', () => {
        test('should handle complete single character loss flow', async () => {
            // Step 1: Initialize chapter
            const chapterId = 'chapter-single-loss-flow';
            const initResult = manager.initializeChapter(chapterId, mockUnits);
            expect(initResult.success).toBe(true);

            // Step 2: Simulate battle leading to character defeat
            const targetUnit = mockUnits.find(u => u.id === 'warrior')!;
            const attackerUnit = mockUnits.find(u => u.id === 'orc1')!;

            // Simulate battle damage
            targetUnit.currentHP = 0;

            // Step 3: Process character loss
            const lossCause = CharacterLossUtils.createBattleDefeatCause(
                attackerUnit.id,
                attackerUnit.name,
                targetUnit.stats.maxHP
            );

            const lostCharacter = await manager.processCharacterLoss(targetUnit, lossCause);

            // Verify loss processing
            expect(lostCharacter.characterId).toBe(targetUnit.id);
            expect(lostCharacter.name).toBe(targetUnit.name);
            expect(lostCharacter.cause.type).toBe(LossCauseType.BATTLE_DEFEAT);
            expect(manager.isCharacterLost(targetUnit.id)).toBe(true);

            // Step 4: Verify UI updates
            expect(manager.getLostCharacters()).toHaveLength(1);
            expect(manager.getTotalLosses()).toBe(1);

            // Step 5: Continue battle and complete chapter
            const chapterSummary = manager.completeChapter();
            expect(chapterSummary.success).toBe(true);
            expect(chapterSummary.summary).toBeDefined();
            expect(chapterSummary.summary!.lostCharacters).toHaveLength(1);
            expect(chapterSummary.summary!.isPerfectClear).toBe(false);

            // Step 6: Verify chapter completion effects
            expect(chapterSummary.summary!.totalCharacters).toBe(mockUnits.length);
            expect(chapterSummary.summary!.survivedCharacters).toHaveLength(mockUnits.length - 1);

            // Step 7: Start new chapter (should reset state)
            const newChapterId = 'chapter-after-reset';
            const newInitResult = manager.initializeChapter(newChapterId, mockUnits);
            expect(newInitResult.success).toBe(true);

            // Step 8: Verify state reset
            expect(manager.getLostCharacters()).toHaveLength(0);
            expect(manager.getTotalLosses()).toBe(0);
            expect(manager.isCharacterLost(targetUnit.id)).toBe(false);

            console.log('✓ Single character complete loss flow test passed');
        });

        test('should handle loss flow with save/load persistence', async () => {
            // Initialize chapter
            const chapterId = 'chapter-persistence-flow';
            manager.initializeChapter(chapterId, mockUnits);

            // Process loss
            const targetUnit = mockUnits.find(u => u.id === 'mage')!;
            const lossCause = CharacterLossUtils.createCriticalDamageCause('goblin1', 'Goblin Scout', 75);
            await manager.processCharacterLoss(targetUnit, lossCause);

            // Save state
            const saveResult = manager.saveChapterState();
            expect(saveResult.success).toBe(true);

            // Simulate game restart - create new manager
            const newManager = new CharacterLossManager(mockScene);
            newManager.setSystemDependencies({
                battleSystem,
                gameStateManager,
                lossUI,
                lossEffects,
            });

            // Load state
            const loadResult = newManager.loadChapterState(chapterId);
            expect(loadResult.success).toBe(true);

            // Verify state was restored
            expect(newManager.isCharacterLost(targetUnit.id)).toBe(true);
            expect(newManager.getLostCharacters()).toHaveLength(1);

            // Complete chapter with restored state
            const completeResult = newManager.completeChapter();
            expect(completeResult.success).toBe(true);
            expect(completeResult.summary!.lostCharacters).toHaveLength(1);

            console.log('✓ Loss flow with persistence test passed');
        });
    });

    describe('Complete Loss Flow: Multiple Characters', () => {
        test('should handle multiple character loss flow in sequence', async () => {
            // Initialize chapter
            const chapterId = 'chapter-multiple-sequential';
            manager.initializeChapter(chapterId, mockUnits);

            // Process multiple losses in sequence
            const lossSequence = [
                { unit: mockUnits.find(u => u.id === 'rogue')!, attacker: 'goblin1' },
                { unit: mockUnits.find(u => u.id === 'archer')!, attacker: 'goblin2' },
                { unit: mockUnits.find(u => u.id === 'warrior')!, attacker: 'orc1' },
            ];

            const lostCharacters = [];
            for (const { unit, attacker } of lossSequence) {
                const attackerUnit = mockUnits.find(u => u.id === attacker)!;
                const lossCause = CharacterLossUtils.createBattleDefeatCause(
                    attackerUnit.id,
                    attackerUnit.name,
                    unit.stats.maxHP
                );

                const lostCharacter = await manager.processCharacterLoss(unit, lossCause);
                lostCharacters.push(lostCharacter);

                // Verify incremental state
                expect(manager.isCharacterLost(unit.id)).toBe(true);
            }

            // Verify final state
            expect(manager.getLostCharacters()).toHaveLength(3);
            expect(manager.getTotalLosses()).toBe(3);

            // Complete chapter
            const completeResult = manager.completeChapter();
            expect(completeResult.success).toBe(true);
            expect(completeResult.summary!.lostCharacters).toHaveLength(3);
            expect(completeResult.summary!.isPerfectClear).toBe(false);

            // Verify loss history order
            const lossHistory = manager.getLossHistory();
            expect(lossHistory).toHaveLength(3);
            expect(lossHistory[0].characterId).toBe('rogue');
            expect(lossHistory[1].characterId).toBe('archer');
            expect(lossHistory[2].characterId).toBe('warrior');

            console.log('✓ Multiple character sequential loss flow test passed');
        });

        test('should handle simultaneous multiple character losses', async () => {
            // Initialize chapter
            const chapterId = 'chapter-multiple-simultaneous';
            manager.initializeChapter(chapterId, mockUnits);

            // Simulate area attack affecting multiple characters
            const affectedUnits = [
                mockUnits.find(u => u.id === 'warrior')!,
                mockUnits.find(u => u.id === 'mage')!,
                mockUnits.find(u => u.id === 'archer')!,
            ];

            // Process simultaneous losses
            const lossPromises = affectedUnits.map(unit => {
                const lossCause = CharacterLossUtils.createCriticalDamageCause(
                    'orc1',
                    'Orc Brute',
                    unit.stats.maxHP + 20 // Overkill damage
                );
                return manager.processCharacterLoss(unit, lossCause);
            });

            const lostCharacters = await Promise.all(lossPromises);

            // Verify all losses were processed
            expect(lostCharacters).toHaveLength(3);
            for (let i = 0; i < affectedUnits.length; i++) {
                expect(lostCharacters[i].characterId).toBe(affectedUnits[i].id);
                expect(manager.isCharacterLost(affectedUnits[i].id)).toBe(true);
            }

            // Complete chapter
            const completeResult = manager.completeChapter();
            expect(completeResult.success).toBe(true);
            expect(completeResult.summary!.lostCharacters).toHaveLength(3);

            console.log('✓ Simultaneous multiple character loss flow test passed');
        });
    });

    describe('Complete Loss Flow: Special Scenarios', () => {
        test('should handle perfect clear chapter flow', async () => {
            // Initialize chapter
            const chapterId = 'chapter-perfect-clear';
            manager.initializeChapter(chapterId, mockUnits);

            // Complete chapter without any losses
            const completeResult = manager.completeChapter();
            expect(completeResult.success).toBe(true);
            expect(completeResult.summary!.isPerfectClear).toBe(true);
            expect(completeResult.summary!.lostCharacters).toHaveLength(0);
            expect(completeResult.summary!.survivedCharacters).toHaveLength(mockUnits.length);

            // Verify perfect clear metrics
            expect(completeResult.summary!.totalCharacters).toBe(mockUnits.length);
            expect(completeResult.summary!.chapterDuration).toBeGreaterThan(0);

            console.log('✓ Perfect clear chapter flow test passed');
        });

        test('should handle game over scenario (all player characters lost)', async () => {
            // Initialize chapter with only player units
            const playerUnits = mockUnits.filter(u => u.faction === 'player');
            const chapterId = 'chapter-game-over';
            manager.initializeChapter(chapterId, playerUnits);

            // Lose all player characters
            const lossPromises = playerUnits.map(unit => {
                const lossCause = CharacterLossUtils.createBattleDefeatCause(
                    'orc1',
                    'Orc Brute',
                    unit.stats.maxHP
                );
                return manager.processCharacterLoss(unit, lossCause);
            });

            await Promise.all(lossPromises);

            // Verify game over condition
            expect(manager.isGameOver()).toBe(true);
            const gameOverInfo = manager.getGameOverInfo();
            expect(gameOverInfo).not.toBeNull();
            expect(gameOverInfo!.reason).toBe('all_characters_lost');
            expect(gameOverInfo!.totalLosses).toBe(playerUnits.length);

            // Complete chapter should still work
            const completeResult = manager.completeChapter();
            expect(completeResult.success).toBe(true);
            expect(completeResult.summary!.lostCharacters).toHaveLength(playerUnits.length);

            console.log('✓ Game over scenario flow test passed');
        });

        test('should handle NPC character loss flow', async () => {
            // Initialize chapter
            const chapterId = 'chapter-npc-loss';
            manager.initializeChapter(chapterId, mockUnits);

            // Lose NPC character
            const npcUnit = mockUnits.find(u => u.id === 'knight_npc')!;
            const lossCause = CharacterLossUtils.createBattleDefeatCause(
                'goblin1',
                'Goblin Scout',
                npcUnit.stats.maxHP
            );

            const lostCharacter = await manager.processCharacterLoss(npcUnit, lossCause);

            // Verify NPC-specific handling
            expect(lostCharacter.characterId).toBe(npcUnit.id);
            expect(lostCharacter.wasRecruited).toBe(true);
            expect(manager.isCharacterLost(npcUnit.id)).toBe(true);

            // Complete chapter
            const completeResult = manager.completeChapter();
            expect(completeResult.success).toBe(true);
            expect(completeResult.summary!.lostCharacters).toHaveLength(1);

            // Verify NPC loss is recorded in summary
            const npcLoss = completeResult.summary!.lostCharacters.find(
                char => char.characterId === npcUnit.id
            );
            expect(npcLoss).toBeDefined();
            expect(npcLoss!.wasRecruited).toBe(true);

            console.log('✓ NPC character loss flow test passed');
        });
    });

    describe('Complete Loss Flow: Error Recovery', () => {
        test('should recover from errors during loss processing', async () => {
            // Initialize chapter
            const chapterId = 'chapter-error-recovery';
            manager.initializeChapter(chapterId, mockUnits);

            // Simulate error during loss processing
            const targetUnit = mockUnits.find(u => u.id === 'mage')!;

            // First, cause an error with invalid data
            try {
                const invalidCause = { type: 'invalid', description: 'Invalid cause' } as any;
                await manager.processCharacterLoss(targetUnit, invalidCause);
                fail('Should have thrown error');
            } catch (error) {
                expect(error).toBeDefined();
            }

            // Verify system is still functional after error
            expect(manager.getLostCharacters()).toHaveLength(0);

            // Process valid loss
            const validCause = CharacterLossUtils.createBattleDefeatCause('goblin1', 'Goblin Scout', 60);
            const lostCharacter = await manager.processCharacterLoss(targetUnit, validCause);

            expect(lostCharacter.characterId).toBe(targetUnit.id);
            expect(manager.isCharacterLost(targetUnit.id)).toBe(true);

            // Complete chapter successfully
            const completeResult = manager.completeChapter();
            expect(completeResult.success).toBe(true);

            console.log('✓ Error recovery during loss flow test passed');
        });

        test('should handle corrupted save data during flow', async () => {
            // Initialize and create some state
            const chapterId = 'chapter-corrupted-save';
            manager.initializeChapter(chapterId, mockUnits);

            const targetUnit = mockUnits.find(u => u.id === 'warrior')!;
            const lossCause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 85);
            await manager.processCharacterLoss(targetUnit, lossCause);

            // Save state
            manager.saveChapterState();

            // Corrupt save data
            localStorageMock.setItem(`character_loss_${chapterId}`, 'corrupted data');

            // Create new manager and try to load
            const newManager = new CharacterLossManager(mockScene);
            newManager.setSystemDependencies({
                battleSystem,
                gameStateManager,
                lossUI,
                lossEffects,
            });

            const loadResult = newManager.loadChapterState(chapterId);

            // Should handle corruption gracefully
            expect(loadResult.success).toBe(true); // Should recover or reset

            // Should be able to continue with flow
            const completeResult = newManager.completeChapter();
            expect(completeResult.success).toBe(true);

            console.log('✓ Corrupted save data recovery test passed');
        });
    });

    describe('Complete Loss Flow: Performance and Stress', () => {
        test('should handle high-volume loss flow efficiently', async () => {
            // Create large unit set
            const largeUnitSet = Array.from({ length: 100 }, (_, i) =>
                createMockUnit(`unit${i}`, `Unit ${i}`, 100, 'player')
            );

            const chapterId = 'chapter-high-volume';
            manager.initializeChapter(chapterId, largeUnitSet);

            const startTime = performance.now();

            // Process many losses
            const lossPromises = largeUnitSet.slice(0, 50).map(unit => {
                const lossCause = CharacterLossUtils.createBattleDefeatCause('enemy', 'Enemy', 100);
                return manager.processCharacterLoss(unit, lossCause);
            });

            await Promise.all(lossPromises);

            // Complete chapter
            const completeResult = manager.completeChapter();

            const endTime = performance.now();
            const totalTime = endTime - startTime;

            // Verify performance and correctness
            expect(totalTime).toBeLessThan(10000); // 10 seconds max
            expect(completeResult.success).toBe(true);
            expect(completeResult.summary!.lostCharacters).toHaveLength(50);

            console.log(`✓ High-volume loss flow test passed: ${totalTime.toFixed(2)}ms`);
        });

        test('should maintain consistency under concurrent operations', async () => {
            const chapterId = 'chapter-concurrent-ops';
            manager.initializeChapter(chapterId, mockUnits);

            // Perform concurrent operations
            const operations = [
                // Loss processing
                manager.processCharacterLoss(
                    mockUnits[1],
                    CharacterLossUtils.createBattleDefeatCause('enemy1', 'Enemy', 80)
                ),
                // Save state
                Promise.resolve(manager.saveChapterState()),
                // More loss processing
                manager.processCharacterLoss(
                    mockUnits[2],
                    CharacterLossUtils.createCriticalDamageCause('enemy2', 'Enemy', 60)
                ),
            ];

            await Promise.all(operations);

            // Verify consistency
            expect(manager.getLostCharacters()).toHaveLength(2);
            expect(manager.isCharacterLost(mockUnits[1].id)).toBe(true);
            expect(manager.isCharacterLost(mockUnits[2].id)).toBe(true);

            // Complete chapter
            const completeResult = manager.completeChapter();
            expect(completeResult.success).toBe(true);
            expect(completeResult.summary!.lostCharacters).toHaveLength(2);

            console.log('✓ Concurrent operations consistency test passed');
        });
    });

    describe('Complete Loss Flow: UI Integration', () => {
        test('should update UI throughout complete loss flow', async () => {
            const chapterId = 'chapter-ui-integration';
            manager.initializeChapter(chapterId, mockUnits);

            // Track UI updates
            const uiUpdates: string[] = [];
            manager.on('character-loss-processed', () => uiUpdates.push('loss-processed'));
            manager.on('chapter-completed', () => uiUpdates.push('chapter-completed'));

            // Process loss
            const targetUnit = mockUnits.find(u => u.id === 'archer')!;
            const lossCause = CharacterLossUtils.createBattleDefeatCause('goblin1', 'Goblin Scout', 70);
            await manager.processCharacterLoss(targetUnit, lossCause);

            // Complete chapter
            const completeResult = manager.completeChapter();
            expect(completeResult.success).toBe(true);

            // Verify UI was updated throughout flow
            expect(uiUpdates).toContain('loss-processed');

            console.log('✓ UI integration throughout loss flow test passed');
        });
    });
});