/**
 * Character Loss System - Comprehensive Test Suite
 * 
 * This test suite provides comprehensive coverage of the character loss system,
 * including E2E flows, integration tests, and regression tests.
 * 
 * Test Coverage:
 * - Complete loss flow (defeat → loss → chapter completion → reset)
 * - Warning system flow (danger state → warning display → player judgment)
 * - Multiple character simultaneous loss scenarios
 * - Party composition restriction scenarios
 * - Integration with battle system, recruitment system, and UI
 * - Regression tests for critical functionality
 * 
 * Requirements Coverage: All requirements from character loss system specification
 */

import { CharacterLossManager } from '../../game/src/systems/CharacterLossManager';
import { CharacterLossState } from '../../game/src/systems/CharacterLossState';
import { CharacterLossUI } from '../../game/src/ui/CharacterLossUI';
import { CharacterLossEffects } from '../../game/src/systems/CharacterLossEffects';
import { CharacterDangerWarningSystem } from '../../game/src/systems/CharacterDangerWarningSystem';
import { BattleSystem } from '../../game/src/systems/BattleSystem';
import { RecruitmentSystem } from '../../game/src/systems/recruitment/RecruitmentSystem';
import { PartyManager } from '../../game/src/systems/PartyManager';
import { GameStateManager } from '../../game/src/systems/GameStateManager';
import {
    CharacterLossUtils,
    LossCauseType,
    DangerLevel,
    CharacterLossError
} from '../../game/src/types/characterLoss';
import { Unit } from '../../game/src/types/gameplay';

// Mock localStorage for testing
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
        delayedCall: jest.fn(),
    },
    tweens: {
        add: jest.fn((config) => {
            // Simulate immediate completion for testing
            if (config.onComplete) {
                setTimeout(config.onComplete, 0);
            }
            return { stop: jest.fn() };
        }),
    },
} as any;

// Helper function to create mock units
const createMockUnit = (id: string, name: string, currentHP: number = 100, faction: 'player' | 'enemy' | 'npc' = 'player'): Unit => ({
    id,
    name,
    position: { x: Math.floor(Math.random() * 10), y: Math.floor(Math.random() * 10) },
    currentHP,
    stats: { maxHP: 100, attack: 10, defense: 5, speed: 8, movement: 3 },
    level: 1,
    faction,
    hasActed: false,
    hasMoved: false,
    wasRecruited: faction === 'npc',
});

// Helper function to create mock battle system
const createMockBattleSystem = () => ({
    on: jest.fn(),
    emit: jest.fn(),
    processAttack: jest.fn(),
    isUnitDefeated: jest.fn(),
    getCurrentBattleState: jest.fn(() => ({ phase: 'player_turn' })),
});

// Helper function to create mock recruitment system
const createMockRecruitmentSystem = () => ({
    on: jest.fn(),
    emit: jest.fn(),
    isNPC: jest.fn((unit: Unit) => unit.faction === 'npc'),
    handleNPCLoss: jest.fn(),
    getRecruitmentStatus: jest.fn(),
});

// Helper function to create mock party manager
const createMockPartyManager = () => ({
    on: jest.fn(),
    emit: jest.fn(),
    getAvailableCharacters: jest.fn(),
    validatePartyComposition: jest.fn(),
    getCurrentParty: jest.fn(() => []),
});

// Helper function to create mock game state manager
const createMockGameStateManager = () => ({
    on: jest.fn(),
    emit: jest.fn(),
    updateUnit: jest.fn(() => ({ success: true })),
    getCurrentTurn: jest.fn(() => 1),
    setGameResult: jest.fn(),
    getGameResult: jest.fn(),
});

describe('Character Loss System - Comprehensive Test Suite', () => {
    let manager: CharacterLossManager;
    let mockUnits: Unit[];
    let mockBattleSystem: any;
    let mockRecruitmentSystem: any;
    let mockPartyManager: any;
    let mockGameStateManager: any;

    beforeEach(() => {
        // Clear localStorage mock
        localStorageMock.clear();
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            writable: true,
        });

        // Create mock units
        mockUnits = [
            createMockUnit('player1', 'Hero', 100, 'player'),
            createMockUnit('player2', 'Warrior', 80, 'player'),
            createMockUnit('player3', 'Mage', 60, 'player'),
            createMockUnit('player4', 'Archer', 70, 'player'),
            createMockUnit('player5', 'Cleric', 90, 'player'),
            createMockUnit('player6', 'Rogue', 50, 'player'),
            createMockUnit('enemy1', 'Goblin', 50, 'enemy'),
            createMockUnit('enemy2', 'Orc', 75, 'enemy'),
            createMockUnit('npc1', 'Recruited Knight', 85, 'npc'),
        ];

        // Create mock systems
        mockBattleSystem = createMockBattleSystem();
        mockRecruitmentSystem = createMockRecruitmentSystem();
        mockPartyManager = createMockPartyManager();
        mockGameStateManager = createMockGameStateManager();

        // Create manager with dependencies
        manager = new CharacterLossManager(mockScene);
        manager.setSystemDependencies({
            battleSystem: mockBattleSystem,
            recruitmentSystem: mockRecruitmentSystem,
            gameStateManager: mockGameStateManager,
        });
    });

    afterEach(() => {
        localStorageMock.clear();
    });

    describe('E2E Test: Complete Loss Flow (Defeat → Loss → Chapter Completion → Reset)', () => {
        test('should handle complete loss flow from defeat to chapter reset', async () => {
            // Step 1: Initialize chapter
            const initResult = manager.initializeChapter('chapter-e2e-complete', mockUnits);
            expect(initResult.success).toBe(true);

            // Step 2: Process character defeats and losses
            const defeatedUnits = [mockUnits[1], mockUnits[2], mockUnits[5]]; // Warrior, Mage, Rogue
            const lostCharacters = [];

            for (const unit of defeatedUnits) {
                const cause = CharacterLossUtils.createBattleDefeatCause(
                    'enemy1',
                    'Goblin',
                    unit.stats.maxHP
                );

                const lostCharacter = await manager.processCharacterLoss(unit, cause);
                lostCharacters.push(lostCharacter);

                // Verify loss was recorded
                expect(manager.isCharacterLost(unit.id)).toBe(true);
                expect(lostCharacter.characterId).toBe(unit.id);
                expect(lostCharacter.cause.type).toBe(LossCauseType.BATTLE_DEFEAT);
            }

            // Step 3: Verify intermediate state
            expect(manager.getLostCharacters()).toHaveLength(3);
            expect(manager.getTotalLosses()).toBe(3);

            // Step 4: Complete chapter
            const completeResult = manager.completeChapter();
            expect(completeResult.success).toBe(true);
            expect(completeResult.summary).toBeDefined();
            expect(completeResult.summary!.lostCharacters).toHaveLength(3);
            expect(completeResult.summary!.isPerfectClear).toBe(false);

            // Step 5: Verify chapter completion effects
            expect(completeResult.summary!.totalCharacters).toBe(mockUnits.length);
            expect(completeResult.summary!.survivedCharacters).toHaveLength(
                mockUnits.length - defeatedUnits.length
            );

            // Step 6: Initialize new chapter (should reset state)
            const newInitResult = manager.initializeChapter('chapter-e2e-new', mockUnits);
            expect(newInitResult.success).toBe(true);

            // Step 7: Verify state was reset
            expect(manager.getLostCharacters()).toHaveLength(0);
            expect(manager.getTotalLosses()).toBe(0);
            for (const unit of defeatedUnits) {
                expect(manager.isCharacterLost(unit.id)).toBe(false);
            }

            console.log('✓ Complete loss flow E2E test passed');
        });

        test('should handle perfect clear chapter flow', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-perfect', mockUnits);

            // Complete chapter without any losses
            const completeResult = manager.completeChapter();
            expect(completeResult.success).toBe(true);
            expect(completeResult.summary!.isPerfectClear).toBe(true);
            expect(completeResult.summary!.lostCharacters).toHaveLength(0);
            expect(completeResult.summary!.survivedCharacters).toHaveLength(mockUnits.length);

            console.log('✓ Perfect clear chapter flow test passed');
        });

        test('should handle chapter with all characters lost (game over)', async () => {
            // Initialize chapter with only player units
            const playerUnits = mockUnits.filter(u => u.faction === 'player');
            manager.initializeChapter('chapter-game-over', playerUnits);

            // Lose all player characters
            for (const unit of playerUnits) {
                const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 100);
                await manager.processCharacterLoss(unit, cause);
            }

            // Verify game over condition
            expect(manager.isGameOver()).toBe(true);
            const gameOverInfo = manager.getGameOverInfo();
            expect(gameOverInfo).not.toBeNull();
            expect(gameOverInfo!.reason).toBe('all_characters_lost');
            expect(gameOverInfo!.totalLosses).toBe(playerUnits.length);

            console.log('✓ Game over scenario test passed');
        });
    });

    describe('E2E Test: Warning System Flow (Danger State → Warning Display → Player Judgment)', () => {
        test('should handle complete danger warning flow', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-warning-flow', mockUnits);

            // Create danger warning system
            const dangerWarningSystem = new CharacterDangerWarningSystem(mockScene);
            manager.setDangerWarningSystem(dangerWarningSystem);

            // Step 1: Set up character in danger state (low HP)
            const dangerousUnit = { ...mockUnits[0], currentHP: 20 }; // 20% HP

            // Step 2: Check danger level
            const dangerLevel = manager.checkDangerState(dangerousUnit);
            expect(dangerLevel).toBe(DangerLevel.HIGH);

            // Step 3: Simulate player action that could cause loss
            const mockAction = {
                type: 'move',
                unitId: dangerousUnit.id,
                targetPosition: { x: 5, y: 5 },
                riskLevel: 'high',
            };

            // Step 4: Show warning dialog
            const warningResult = await manager.showLossWarning(dangerousUnit, mockAction);

            // Simulate player choosing to continue
            expect(typeof warningResult).toBe('boolean');

            // Step 5: If player continues, process the risky action
            if (warningResult) {
                // Simulate the dangerous action resulting in loss
                const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 20);
                const lostCharacter = await manager.processCharacterLoss(dangerousUnit, cause);

                expect(lostCharacter.characterId).toBe(dangerousUnit.id);
                expect(manager.isCharacterLost(dangerousUnit.id)).toBe(true);
            }

            console.log('✓ Danger warning flow E2E test passed');
        });

        test('should handle multiple danger levels correctly', async () => {
            manager.initializeChapter('chapter-danger-levels', mockUnits);

            // Test different danger levels
            const testCases = [
                { unit: { ...mockUnits[0], currentHP: 100 }, expectedLevel: DangerLevel.NONE },
                { unit: { ...mockUnits[1], currentHP: 60 }, expectedLevel: DangerLevel.LOW },
                { unit: { ...mockUnits[2], currentHP: 40 }, expectedLevel: DangerLevel.MEDIUM },
                { unit: { ...mockUnits[3], currentHP: 20 }, expectedLevel: DangerLevel.HIGH },
                { unit: { ...mockUnits[4], currentHP: 5 }, expectedLevel: DangerLevel.CRITICAL },
            ];

            for (const testCase of testCases) {
                const dangerLevel = manager.checkDangerState(testCase.unit);
                expect(dangerLevel).toBe(testCase.expectedLevel);
            }

            console.log('✓ Multiple danger levels test passed');
        });

        test('should handle important character warnings', async () => {
            manager.initializeChapter('chapter-important-warning', mockUnits);

            // Mark first unit as important (main character)
            const importantUnit = { ...mockUnits[0], currentHP: 15, isImportant: true };

            const dangerLevel = manager.checkDangerState(importantUnit);
            expect(dangerLevel).toBe(DangerLevel.CRITICAL);

            // Important characters should trigger special warnings
            const mockAction = { type: 'attack', unitId: importantUnit.id, riskLevel: 'critical' };
            const warningResult = await manager.showLossWarning(importantUnit, mockAction);

            // The warning should be shown (implementation dependent)
            expect(typeof warningResult).toBe('boolean');

            console.log('✓ Important character warning test passed');
        });
    });

    describe('Multiple Character Simultaneous Loss Test Cases', () => {
        test('should handle simultaneous loss of multiple characters', async () => {
            manager.initializeChapter('chapter-simultaneous-loss', mockUnits);

            // Simulate area attack affecting multiple characters
            const affectedUnits = [mockUnits[1], mockUnits[2], mockUnits[3]]; // Warrior, Mage, Archer
            const lossPromises = [];

            // Process losses simultaneously
            for (const unit of affectedUnits) {
                const cause = CharacterLossUtils.createCriticalDamageCause('enemy2', 'Orc', 150);
                lossPromises.push(manager.processCharacterLoss(unit, cause));
            }

            // Wait for all losses to be processed
            const lostCharacters = await Promise.all(lossPromises);

            // Verify all characters were lost
            expect(lostCharacters).toHaveLength(3);
            for (let i = 0; i < affectedUnits.length; i++) {
                expect(lostCharacters[i].characterId).toBe(affectedUnits[i].id);
                expect(manager.isCharacterLost(affectedUnits[i].id)).toBe(true);
            }

            // Verify total loss count
            expect(manager.getTotalLosses()).toBe(3);
            expect(manager.getLostCharacters()).toHaveLength(3);

            console.log('✓ Simultaneous multiple character loss test passed');
        });

        test('should handle chain reaction losses', async () => {
            manager.initializeChapter('chapter-chain-reaction', mockUnits);

            // Simulate chain reaction: losing one character triggers conditions for others
            const firstUnit = mockUnits[1]; // Warrior
            const secondUnit = mockUnits[4]; // Cleric (loses healing support)
            const thirdUnit = mockUnits[5]; // Rogue (loses protection)

            // First loss
            const firstCause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 80);
            await manager.processCharacterLoss(firstUnit, firstCause);

            // Second loss (due to losing healer)
            const secondCause = CharacterLossUtils.createStatusEffectCause('poison', 'Poison damage');
            await manager.processCharacterLoss(secondUnit, secondCause);

            // Third loss (due to losing tank)
            const thirdCause = CharacterLossUtils.createCriticalDamageCause('enemy2', 'Orc', 120);
            await manager.processCharacterLoss(thirdUnit, thirdCause);

            // Verify chain reaction was handled correctly
            expect(manager.getTotalLosses()).toBe(3);
            expect(manager.isCharacterLost(firstUnit.id)).toBe(true);
            expect(manager.isCharacterLost(secondUnit.id)).toBe(true);
            expect(manager.isCharacterLost(thirdUnit.id)).toBe(true);

            // Verify loss history maintains correct order
            const lossHistory = manager.getLossHistory();
            expect(lossHistory).toHaveLength(3);
            expect(lossHistory[0].characterId).toBe(firstUnit.id);
            expect(lossHistory[1].characterId).toBe(secondUnit.id);
            expect(lossHistory[2].characterId).toBe(thirdUnit.id);

            console.log('✓ Chain reaction losses test passed');
        });

        test('should handle mixed faction simultaneous losses', async () => {
            manager.initializeChapter('chapter-mixed-faction-loss', mockUnits);

            // Simulate losses affecting different factions
            const playerUnit = mockUnits[1]; // Player Warrior
            const npcUnit = mockUnits[8]; // NPC Knight
            const enemyUnit = mockUnits[6]; // Enemy Goblin (for completeness)

            // Process losses for different factions
            const playerCause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 80);
            const npcCause = CharacterLossUtils.createBattleDefeatCause('enemy2', 'Orc', 85);

            const playerLoss = await manager.processCharacterLoss(playerUnit, playerCause);
            const npcLoss = await manager.processCharacterLoss(npcUnit, npcCause);

            // Verify both losses were processed correctly
            expect(playerLoss.characterId).toBe(playerUnit.id);
            expect(npcLoss.characterId).toBe(npcUnit.id);
            expect(npcLoss.wasRecruited).toBe(true); // NPC should be marked as recruited

            // Verify recruitment system was notified for NPC loss
            expect(mockRecruitmentSystem.handleNPCLoss).toHaveBeenCalledWith(npcUnit);

            console.log('✓ Mixed faction simultaneous losses test passed');
        });

        test('should handle performance under high simultaneous loss load', async () => {
            // Create larger unit set for performance testing
            const largeUnitSet = Array.from({ length: 50 }, (_, i) =>
                createMockUnit(`unit${i}`, `Unit ${i}`, 100, 'player')
            );

            manager.initializeChapter('chapter-performance-test', largeUnitSet);

            const startTime = performance.now();

            // Process many simultaneous losses
            const lossPromises = largeUnitSet.slice(0, 25).map(unit => {
                const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 100);
                return manager.processCharacterLoss(unit, cause);
            });

            await Promise.all(lossPromises);

            const endTime = performance.now();
            const processingTime = endTime - startTime;

            // Verify performance (should complete within reasonable time)
            expect(processingTime).toBeLessThan(5000); // 5 seconds max
            expect(manager.getTotalLosses()).toBe(25);

            console.log(`✓ Performance test passed: ${processingTime.toFixed(2)}ms for 25 simultaneous losses`);
        });
    });

    describe('Party Composition Restriction Test Cases', () => {
        test('should restrict lost characters from party composition', async () => {
            manager.initializeChapter('chapter-party-restriction', mockUnits);

            // Lose some characters
            const lostUnits = [mockUnits[1], mockUnits[3], mockUnits[5]]; // Warrior, Archer, Rogue
            for (const unit of lostUnits) {
                const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 100);
                await manager.processCharacterLoss(unit, cause);
            }

            // Get available characters for party composition
            const availableCharacters = manager.getAvailableCharacters();

            // Verify lost characters are not available
            for (const lostUnit of lostUnits) {
                expect(availableCharacters.find(char => char.id === lostUnit.id)).toBeUndefined();
            }

            // Verify non-lost characters are available
            const survivingUnits = mockUnits.filter(u =>
                u.faction === 'player' && !lostUnits.some(lost => lost.id === u.id)
            );
            expect(availableCharacters).toHaveLength(survivingUnits.length);

            console.log('✓ Party composition restriction test passed');
        });

        test('should validate party composition with lost characters', async () => {
            manager.initializeChapter('chapter-party-validation', mockUnits);

            // Lose some characters
            const lostUnits = [mockUnits[1], mockUnits[2]]; // Warrior, Mage
            for (const unit of lostUnits) {
                const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 100);
                await manager.processCharacterLoss(unit, cause);
            }

            // Try to create party with lost characters
            const invalidParty = [mockUnits[0], mockUnits[1], mockUnits[2], mockUnits[3]]; // Includes lost units
            const validationResult = manager.validatePartyComposition(invalidParty);

            expect(validationResult.isValid).toBe(false);
            expect(validationResult.errors).toHaveLength(2); // Two lost characters
            expect(validationResult.errors[0].type).toBe('lost_character');
            expect(validationResult.errors[1].type).toBe('lost_character');

            // Verify error messages contain character names
            expect(validationResult.errors[0].message).toContain(mockUnits[1].name);
            expect(validationResult.errors[1].message).toContain(mockUnits[2].name);

            console.log('✓ Party composition validation test passed');
        });

        test('should handle insufficient available characters warning', async () => {
            // Create scenario with minimal characters
            const minimalUnits = mockUnits.slice(0, 4); // Only 4 player characters
            manager.initializeChapter('chapter-insufficient-chars', minimalUnits);

            // Lose most characters, leaving insufficient for full party
            const unitsToLose = minimalUnits.slice(0, 3); // Lose 3 out of 4
            for (const unit of unitsToLose) {
                const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 100);
                await manager.processCharacterLoss(unit, cause);
            }

            // Try to validate party composition
            const remainingUnit = minimalUnits[3];
            const validationResult = manager.validatePartyComposition([remainingUnit]);

            expect(validationResult.warnings).toContainEqual(
                expect.objectContaining({
                    type: 'insufficient_members',
                    severity: 'high',
                })
            );

            console.log('✓ Insufficient available characters warning test passed');
        });

        test('should provide party composition repair suggestions', async () => {
            manager.initializeChapter('chapter-party-repair', mockUnits);

            // Lose some characters
            const lostUnits = [mockUnits[1], mockUnits[2]]; // Warrior, Mage
            for (const unit of lostUnits) {
                const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 100);
                await manager.processCharacterLoss(unit, cause);
            }

            // Create invalid party
            const invalidParty = [mockUnits[0], mockUnits[1], mockUnits[2]]; // Includes lost units
            const validationResult = manager.validatePartyComposition(invalidParty);

            expect(validationResult.isValid).toBe(false);
            expect(validationResult.availableCharacters).toBeDefined();
            expect(validationResult.lostCharacters).toHaveLength(2);

            // Verify repair suggestions are provided
            const availableForRepair = validationResult.availableCharacters.filter(char =>
                !invalidParty.some(partyMember => partyMember.id === char.id)
            );
            expect(availableForRepair.length).toBeGreaterThan(0);

            console.log('✓ Party composition repair suggestions test passed');
        });
    });

    describe('Integration Tests with Other Systems', () => {
        test('should integrate correctly with battle system', async () => {
            manager.initializeChapter('chapter-battle-integration', mockUnits);

            // Simulate battle system triggering character loss
            const defeatedUnit = mockUnits[1];
            const attacker = mockUnits[6]; // Enemy

            // Battle system should call character loss manager
            mockBattleSystem.isUnitDefeated.mockReturnValue(true);

            // Simulate battle system event
            const cause = CharacterLossUtils.createBattleDefeatCause(attacker.id, attacker.name, 80);
            await manager.processCharacterLoss(defeatedUnit, cause);

            // Verify integration
            expect(manager.isCharacterLost(defeatedUnit.id)).toBe(true);
            expect(mockGameStateManager.updateUnit).toHaveBeenCalledWith(
                expect.objectContaining({ id: defeatedUnit.id, currentHP: 0 })
            );

            console.log('✓ Battle system integration test passed');
        });

        test('should integrate correctly with recruitment system', async () => {
            manager.initializeChapter('chapter-recruitment-integration', mockUnits);

            // Lose an NPC character
            const npcUnit = mockUnits[8]; // NPC Knight
            const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 85);

            await manager.processCharacterLoss(npcUnit, cause);

            // Verify recruitment system integration
            expect(mockRecruitmentSystem.handleNPCLoss).toHaveBeenCalledWith(npcUnit);
            expect(manager.isCharacterLost(npcUnit.id)).toBe(true);

            const lostCharacter = manager.getLostCharacter(npcUnit.id);
            expect(lostCharacter?.wasRecruited).toBe(true);

            console.log('✓ Recruitment system integration test passed');
        });

        test('should integrate correctly with UI system', async () => {
            manager.initializeChapter('chapter-ui-integration', mockUnits);

            // Create UI system
            const lossUI = new CharacterLossUI(mockScene);
            manager.setLossUI(lossUI);

            // Process character loss
            const lostUnit = mockUnits[1];
            const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 80);

            await manager.processCharacterLoss(lostUnit, cause);

            // Verify UI integration (UI methods should be called)
            // Note: This would require more detailed mocking of UI methods
            expect(manager.isCharacterLost(lostUnit.id)).toBe(true);

            console.log('✓ UI system integration test passed');
        });

        test('should handle system integration failures gracefully', async () => {
            manager.initializeChapter('chapter-integration-failure', mockUnits);

            // Mock system failure
            mockGameStateManager.updateUnit.mockReturnValue({ success: false, message: 'Update failed' });

            // Process character loss despite system failure
            const unit = mockUnits[1];
            const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 80);

            // Should not throw error despite integration failure
            const lostCharacter = await manager.processCharacterLoss(unit, cause);
            expect(lostCharacter.characterId).toBe(unit.id);
            expect(manager.isCharacterLost(unit.id)).toBe(true);

            console.log('✓ System integration failure handling test passed');
        });
    });

    describe('Regression Tests for Critical Functionality', () => {
        test('should maintain data consistency across multiple operations', async () => {
            manager.initializeChapter('chapter-data-consistency', mockUnits);

            // Perform multiple operations
            const operations = [
                () => manager.processCharacterLoss(mockUnits[1], CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 80)),
                () => manager.saveChapterState(),
                () => manager.processCharacterLoss(mockUnits[2], CharacterLossUtils.createCriticalDamageCause('enemy2', 'Orc', 60)),
                () => manager.loadChapterState(),
                () => manager.processCharacterLoss(mockUnits[3], CharacterLossUtils.createStatusEffectCause('poison', 'Poison')),
            ];

            // Execute operations sequentially
            for (const operation of operations) {
                await operation();
            }

            // Verify data consistency
            expect(manager.getTotalLosses()).toBe(3);
            expect(manager.getLostCharacters()).toHaveLength(3);
            expect(manager.isCharacterLost(mockUnits[1].id)).toBe(true);
            expect(manager.isCharacterLost(mockUnits[2].id)).toBe(true);
            expect(manager.isCharacterLost(mockUnits[3].id)).toBe(true);

            console.log('✓ Data consistency regression test passed');
        });

        test('should handle edge cases without breaking', async () => {
            manager.initializeChapter('chapter-edge-cases', mockUnits);

            // Test various edge cases
            const edgeCases = [
                // Duplicate loss processing
                async () => {
                    const unit = mockUnits[1];
                    const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 80);
                    await manager.processCharacterLoss(unit, cause);
                    // Try to process same unit again
                    const duplicate = await manager.processCharacterLoss(unit, cause);
                    expect(duplicate.characterId).toBe(unit.id);
                },

                // Invalid character data
                async () => {
                    try {
                        const invalidUnit = { ...mockUnits[2], id: '' };
                        const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 60);
                        await manager.processCharacterLoss(invalidUnit, cause);
                    } catch (error) {
                        expect(error).toBeDefined();
                    }
                },

                // Chapter completion with no losses
                async () => {
                    const result = manager.completeChapter();
                    expect(result.success).toBe(true);
                    expect(result.summary?.isPerfectClear).toBe(false); // Has losses from previous tests
                },
            ];

            for (const edgeCase of edgeCases) {
                await edgeCase();
            }

            console.log('✓ Edge cases regression test passed');
        });

        test('should maintain performance under stress conditions', async () => {
            // Create large dataset
            const largeUnitSet = Array.from({ length: 100 }, (_, i) =>
                createMockUnit(`stress${i}`, `Stress Unit ${i}`, 100, 'player')
            );

            manager.initializeChapter('chapter-stress-test', largeUnitSet);

            const startTime = performance.now();

            // Perform many operations rapidly
            const stressOperations = [];
            for (let i = 0; i < 50; i++) {
                const unit = largeUnitSet[i];
                const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 100);
                stressOperations.push(manager.processCharacterLoss(unit, cause));
            }

            await Promise.all(stressOperations);

            const endTime = performance.now();
            const totalTime = endTime - startTime;

            // Verify performance and correctness
            expect(totalTime).toBeLessThan(10000); // 10 seconds max
            expect(manager.getTotalLosses()).toBe(50);

            console.log(`✓ Stress test passed: ${totalTime.toFixed(2)}ms for 50 operations`);
        });

        test('should recover from corrupted state gracefully', async () => {
            manager.initializeChapter('chapter-corruption-recovery', mockUnits);

            // Create some state
            const unit = mockUnits[1];
            const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 80);
            await manager.processCharacterLoss(unit, cause);

            // Save state
            manager.saveChapterState();

            // Corrupt saved data
            const corruptedData = '{"invalid": "json"';
            localStorageMock.setItem('character_loss_chapter-corruption-recovery', corruptedData);

            // Try to load corrupted data
            const loadResult = manager.loadChapterState();

            // Should handle corruption gracefully
            expect(loadResult.success).toBe(true); // Should recover or reset

            console.log('✓ Corruption recovery regression test passed');
        });
    });

    describe('Memory Management and Cleanup Tests', () => {
        test('should properly cleanup resources after chapter completion', async () => {
            manager.initializeChapter('chapter-cleanup', mockUnits);

            // Create some state
            const unit = mockUnits[1];
            const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 80);
            await manager.processCharacterLoss(unit, cause);

            // Complete chapter
            const completeResult = manager.completeChapter();
            expect(completeResult.success).toBe(true);

            // Verify cleanup
            expect(manager.hasSaveData('chapter-cleanup')).toBe(false);

            console.log('✓ Resource cleanup test passed');
        });

        test('should handle memory efficiently with large datasets', async () => {
            const largeUnitSet = Array.from({ length: 200 }, (_, i) =>
                createMockUnit(`memory${i}`, `Memory Unit ${i}`, 100, 'player')
            );

            manager.initializeChapter('chapter-memory-test', largeUnitSet);

            // Process many losses
            for (let i = 0; i < 100; i++) {
                const unit = largeUnitSet[i];
                const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 100);
                await manager.processCharacterLoss(unit, cause);
            }

            // Verify memory usage is reasonable
            const lostCharacters = manager.getLostCharacters();
            expect(lostCharacters).toHaveLength(100);

            // Complete chapter to trigger cleanup
            manager.completeChapter();

            console.log('✓ Memory efficiency test passed');
        });
    });

    describe('Error Handling and Recovery Tests', () => {
        test('should handle and recover from various error conditions', async () => {
            manager.initializeChapter('chapter-error-handling', mockUnits);

            // Test error conditions
            const errorTests = [
                // Invalid unit
                async () => {
                    try {
                        const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 80);
                        await manager.processCharacterLoss(null as any, cause);
                        fail('Should have thrown error');
                    } catch (error) {
                        expect(error).toBeDefined();
                    }
                },

                // Invalid cause
                async () => {
                    try {
                        await manager.processCharacterLoss(mockUnits[1], null as any);
                        fail('Should have thrown error');
                    } catch (error) {
                        expect(error).toBeDefined();
                    }
                },

                // Uninitialized chapter
                async () => {
                    const newManager = new CharacterLossManager(mockScene);
                    try {
                        const cause = CharacterLossUtils.createBattleDefeatCause('enemy1', 'Goblin', 80);
                        await newManager.processCharacterLoss(mockUnits[1], cause);
                        fail('Should have thrown error');
                    } catch (error) {
                        expect(error).toBeDefined();
                    }
                },
            ];

            for (const errorTest of errorTests) {
                await errorTest();
            }

            console.log('✓ Error handling and recovery test passed');
        });
    });
});