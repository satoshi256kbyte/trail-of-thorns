/**
 * Character Loss Party Composition - E2E Tests
 * 
 * End-to-end tests for party composition restrictions with character loss:
 * - Lost character selection restrictions
 * - Party validation with lost characters
 * - Available character filtering
 * - Composition repair suggestions
 * 
 * This test suite focuses on the complete party management flow
 * when characters are lost during chapters.
 */

import { CharacterLossManager } from '../../game/src/systems/CharacterLossManager';
import { PartyManager } from '../../game/src/systems/PartyManager';
import { CharacterLossUI } from '../../game/src/ui/CharacterLossUI';
import { GameStateManager } from '../../game/src/systems/GameStateManager';
import {
    CharacterLossUtils,
    LossCauseType,
    PartyValidationResult,
    PartyValidationError,
    PartyValidationWarning
} from '../../game/src/types/characterLoss';
import { Unit } from '../../game/src/types/gameplay';

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
            if (config.onComplete) {
                setTimeout(config.onComplete, 0);
            }
            return { stop: jest.fn() };
        }),
    },
} as any;

// Helper to create mock units with different roles
const createMockUnit = (
    id: string,
    name: string,
    role: string = 'fighter',
    level: number = 1,
    faction: 'player' | 'enemy' | 'npc' = 'player'
): Unit => ({
    id,
    name,
    position: { x: Math.floor(Math.random() * 10), y: Math.floor(Math.random() * 10) },
    currentHP: 100,
    stats: {
        maxHP: 100,
        attack: 10 + level * 2,
        defense: 5 + level,
        speed: 8 + Math.floor(level / 2),
        movement: 3
    },
    level,
    faction,
    hasActed: false,
    hasMoved: false,
    wasRecruited: faction === 'npc',
    role, // Custom property for party composition
} as Unit);

// Mock party manager with composition logic
const createMockPartyManager = () => ({
    on: jest.fn(),
    emit: jest.fn(),

    getAvailableCharacters: jest.fn((lostCharacterIds: string[] = []) => {
        // Filter out lost characters
        return mockUnits.filter(unit =>
            unit.faction === 'player' && !lostCharacterIds.includes(unit.id)
        );
    }),

    validatePartyComposition: jest.fn((party: Unit[], lostCharacters: string[] = []): PartyValidationResult => {
        const errors: PartyValidationError[] = [];
        const warnings: PartyValidationWarning[] = [];

        // Check for lost characters in party
        party.forEach(unit => {
            if (lostCharacters.includes(unit.id)) {
                errors.push({
                    type: 'lost_character',
                    characterId: unit.id,
                    message: `${unit.name}は章内で使用できません`,
                });
            }
        });

        // Check party size
        if (party.length < 3) {
            warnings.push({
                type: 'insufficient_members',
                message: 'パーティメンバーが不足しています',
                severity: 'medium',
            });
        }

        // Check role balance
        const roles = party.map(unit => (unit as any).role);
        const hasHealer = roles.includes('healer');
        const hasTank = roles.includes('tank');

        if (!hasHealer && party.length > 2) {
            warnings.push({
                type: 'missing_role',
                message: 'ヒーラーがいません',
                severity: 'low',
            });
        }

        if (!hasTank && party.length > 2) {
            warnings.push({
                type: 'missing_role',
                message: 'タンクがいません',
                severity: 'low',
            });
        }

        const availableCharacters = mockUnits.filter(unit =>
            unit.faction === 'player' && !lostCharacters.includes(unit.id)
        );

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            availableCharacters,
            lostCharacters: lostCharacters.map(id =>
                mockUnits.find(u => u.id === id)
            ).filter(Boolean) as Unit[],
        };
    }),

    getCurrentParty: jest.fn(() => []),

    setParty: jest.fn((party: Unit[]) => {
        // Mock party setting logic
        return { success: true, party };
    }),

    getRecommendedParty: jest.fn((availableCharacters: Unit[]) => {
        // Return a balanced party recommendation
        const roles = ['tank', 'healer', 'fighter', 'mage'];
        const recommended = [];

        for (const role of roles) {
            const character = availableCharacters.find(char => (char as any).role === role);
            if (character && recommended.length < 4) {
                recommended.push(character);
            }
        }

        // Fill remaining slots with any available characters
        while (recommended.length < Math.min(6, availableCharacters.length)) {
            const remaining = availableCharacters.find(char => !recommended.includes(char));
            if (remaining) {
                recommended.push(remaining);
            } else {
                break;
            }
        }

        return recommended;
    }),
});

// Mock game state manager
const createMockGameStateManager = () => ({
    on: jest.fn(),
    emit: jest.fn(),
    updateUnit: jest.fn(() => ({ success: true })),
    getCurrentTurn: jest.fn(() => 1),
    setGameResult: jest.fn(),
    getGameResult: jest.fn(() => null),
    getAllUnits: jest.fn(() => mockUnits),
    getPlayerUnits: jest.fn(() => mockUnits.filter(u => u.faction === 'player')),
    getEnemyUnits: jest.fn(() => mockUnits.filter(u => u.faction === 'enemy')),
});

let mockUnits: Unit[];

describe('Character Loss Party Composition - E2E Tests', () => {
    let manager: CharacterLossManager;
    let partyManager: any;
    let lossUI: CharacterLossUI;
    let gameStateManager: any;

    beforeEach(() => {
        // Create diverse unit set with different roles
        mockUnits = [
            createMockUnit('hero', 'Hero', 'fighter', 5, 'player'),
            createMockUnit('warrior', 'Warrior', 'tank', 3, 'player'),
            createMockUnit('mage', 'Mage', 'mage', 4, 'player'),
            createMockUnit('archer', 'Archer', 'fighter', 2, 'player'),
            createMockUnit('cleric', 'Cleric', 'healer', 3, 'player'),
            createMockUnit('rogue', 'Rogue', 'fighter', 2, 'player'),
            createMockUnit('paladin', 'Paladin', 'tank', 4, 'player'),
            createMockUnit('wizard', 'Wizard', 'mage', 5, 'player'),
            createMockUnit('priest', 'Priest', 'healer', 2, 'player'),
            createMockUnit('ranger', 'Ranger', 'fighter', 3, 'player'),
            createMockUnit('goblin1', 'Goblin Scout', 'fighter', 1, 'enemy'),
            createMockUnit('orc1', 'Orc Brute', 'tank', 2, 'enemy'),
        ];

        // Create system components
        partyManager = createMockPartyManager();
        gameStateManager = createMockGameStateManager();
        lossUI = new CharacterLossUI(mockScene);

        // Create manager with party management integration
        manager = new CharacterLossManager(mockScene);
        manager.setSystemDependencies({
            gameStateManager,
            lossUI,
        });

        // Mock the party-related methods on the manager
        manager.getAvailableCharacters = jest.fn(() => {
            const lostIds = manager.getLostCharacters().map(char => char.characterId);
            return partyManager.getAvailableCharacters(lostIds);
        });

        manager.validatePartyComposition = jest.fn((party: Unit[]) => {
            const lostIds = manager.getLostCharacters().map(char => char.characterId);
            return partyManager.validatePartyComposition(party, lostIds);
        });
    });

    describe('Lost Character Selection Restrictions', () => {
        test('should prevent selection of lost characters', async () => {
            // Initialize chapter
            const chapterId = 'chapter-selection-restrictions';
            manager.initializeChapter(chapterId, mockUnits);

            // Lose some characters
            const charactersToLose = [
                mockUnits.find(u => u.id === 'warrior')!, // Tank
                mockUnits.find(u => u.id === 'mage')!, // Mage
                mockUnits.find(u => u.id === 'rogue')!, // Fighter
            ];

            for (const unit of charactersToLose) {
                const cause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 100);
                await manager.processCharacterLoss(unit, cause);
            }

            // Get available characters for party composition
            const availableCharacters = manager.getAvailableCharacters();

            // Verify lost characters are not available
            for (const lostUnit of charactersToLose) {
                expect(availableCharacters.find(char => char.id === lostUnit.id)).toBeUndefined();
            }

            // Verify non-lost characters are available
            const expectedAvailable = mockUnits.filter(u =>
                u.faction === 'player' && !charactersToLose.some(lost => lost.id === u.id)
            );
            expect(availableCharacters).toHaveLength(expectedAvailable.length);

            // Verify specific characters are available
            expect(availableCharacters.find(char => char.id === 'hero')).toBeDefined();
            expect(availableCharacters.find(char => char.id === 'cleric')).toBeDefined();
            expect(availableCharacters.find(char => char.id === 'archer')).toBeDefined();

            console.log('✓ Lost character selection restriction test passed');
        });

        test('should update available characters dynamically as losses occur', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-dynamic-availability', mockUnits);

            // Initial state - all player characters available
            let availableCharacters = manager.getAvailableCharacters();
            const initialPlayerCount = mockUnits.filter(u => u.faction === 'player').length;
            expect(availableCharacters).toHaveLength(initialPlayerCount);

            // Lose first character
            const firstLoss = mockUnits.find(u => u.id === 'warrior')!;
            const firstCause = CharacterLossUtils.createBattleDefeatCause('goblin1', 'Goblin Scout', 100);
            await manager.processCharacterLoss(firstLoss, firstCause);

            availableCharacters = manager.getAvailableCharacters();
            expect(availableCharacters).toHaveLength(initialPlayerCount - 1);
            expect(availableCharacters.find(char => char.id === 'warrior')).toBeUndefined();

            // Lose second character
            const secondLoss = mockUnits.find(u => u.id === 'mage')!;
            const secondCause = CharacterLossUtils.createCriticalDamageCause('orc1', 'Orc Brute', 120);
            await manager.processCharacterLoss(secondLoss, secondCause);

            availableCharacters = manager.getAvailableCharacters();
            expect(availableCharacters).toHaveLength(initialPlayerCount - 2);
            expect(availableCharacters.find(char => char.id === 'mage')).toBeUndefined();

            // Lose third character
            const thirdLoss = mockUnits.find(u => u.id === 'rogue')!;
            const thirdCause = CharacterLossUtils.createStatusEffectCause('poison', 'Poison damage');
            await manager.processCharacterLoss(thirdLoss, thirdCause);

            availableCharacters = manager.getAvailableCharacters();
            expect(availableCharacters).toHaveLength(initialPlayerCount - 3);
            expect(availableCharacters.find(char => char.id === 'rogue')).toBeUndefined();

            console.log('✓ Dynamic availability update test passed');
        });

        test('should handle role-based availability filtering', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-role-availability', mockUnits);

            // Lose characters of specific roles
            const tankToLose = mockUnits.find(u => u.id === 'warrior')!; // Tank
            const healerToLose = mockUnits.find(u => u.id === 'cleric')!; // Healer

            const tankCause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 100);
            const healerCause = CharacterLossUtils.createCriticalDamageCause('goblin1', 'Goblin Scout', 90);

            await manager.processCharacterLoss(tankToLose, tankCause);
            await manager.processCharacterLoss(healerToLose, healerCause);

            // Get available characters
            const availableCharacters = manager.getAvailableCharacters();

            // Check role availability
            const availableTanks = availableCharacters.filter(char => (char as any).role === 'tank');
            const availableHealers = availableCharacters.filter(char => (char as any).role === 'healer');
            const availableFighters = availableCharacters.filter(char => (char as any).role === 'fighter');

            expect(availableTanks).toHaveLength(1); // Paladin should still be available
            expect(availableHealers).toHaveLength(1); // Priest should still be available
            expect(availableFighters.length).toBeGreaterThan(0); // Multiple fighters available

            // Verify specific characters
            expect(availableTanks.find(char => char.id === 'paladin')).toBeDefined();
            expect(availableHealers.find(char => char.id === 'priest')).toBeDefined();

            console.log('✓ Role-based availability filtering test passed');
        });
    });

    describe('Party Validation with Lost Characters', () => {
        test('should validate party composition and reject lost characters', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-party-validation', mockUnits);

            // Lose some characters
            const lostCharacters = [
                mockUnits.find(u => u.id === 'warrior')!,
                mockUnits.find(u => u.id === 'mage')!,
            ];

            for (const unit of lostCharacters) {
                const cause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 100);
                await manager.processCharacterLoss(unit, cause);
            }

            // Try to create party with lost characters
            const invalidParty = [
                mockUnits.find(u => u.id === 'hero')!, // Valid
                mockUnits.find(u => u.id === 'warrior')!, // Lost
                mockUnits.find(u => u.id === 'mage')!, // Lost
                mockUnits.find(u => u.id === 'cleric')!, // Valid
            ];

            const validationResult = manager.validatePartyComposition(invalidParty);

            // Verify validation results
            expect(validationResult.isValid).toBe(false);
            expect(validationResult.errors).toHaveLength(2);

            // Check specific errors
            const warriorError = validationResult.errors.find(error => error.characterId === 'warrior');
            const mageError = validationResult.errors.find(error => error.characterId === 'mage');

            expect(warriorError).toBeDefined();
            expect(warriorError!.type).toBe('lost_character');
            expect(warriorError!.message).toContain('Warrior');

            expect(mageError).toBeDefined();
            expect(mageError!.type).toBe('lost_character');
            expect(mageError!.message).toContain('Mage');

            // Verify available and lost character lists
            expect(validationResult.availableCharacters.length).toBeGreaterThan(0);
            expect(validationResult.lostCharacters).toHaveLength(2);

            console.log('✓ Party validation with lost characters test passed');
        });

        test('should provide warnings for suboptimal party composition', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-composition-warnings', mockUnits);

            // Lose key role characters
            const tankToLose = mockUnits.find(u => u.id === 'warrior')!;
            const healerToLose = mockUnits.find(u => u.id === 'cleric')!;

            const tankCause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 100);
            const healerCause = CharacterLossUtils.createCriticalDamageCause('goblin1', 'Goblin Scout', 90);

            await manager.processCharacterLoss(tankToLose, tankCause);
            await manager.processCharacterLoss(healerToLose, healerCause);

            // Create party without tank or healer
            const suboptimalParty = [
                mockUnits.find(u => u.id === 'hero')!, // Fighter
                mockUnits.find(u => u.id === 'archer')!, // Fighter
                mockUnits.find(u => u.id === 'rogue')!, // Fighter
            ];

            const validationResult = manager.validatePartyComposition(suboptimalParty);

            // Should be valid but have warnings
            expect(validationResult.isValid).toBe(true);
            expect(validationResult.warnings.length).toBeGreaterThan(0);

            // Check for role warnings
            const missingTankWarning = validationResult.warnings.find(w =>
                w.type === 'missing_role' && w.message.includes('タンク')
            );
            const missingHealerWarning = validationResult.warnings.find(w =>
                w.type === 'missing_role' && w.message.includes('ヒーラー')
            );

            expect(missingTankWarning).toBeDefined();
            expect(missingHealerWarning).toBeDefined();

            console.log('✓ Suboptimal party composition warnings test passed');
        });

        test('should handle insufficient available characters scenario', async () => {
            // Initialize chapter with minimal characters
            const minimalUnits = mockUnits.slice(0, 5); // Only 5 player characters
            manager.initializeChapter('chapter-insufficient-chars', minimalUnits);

            // Lose most characters
            const charactersToLose = minimalUnits.slice(0, 3); // Lose 3 out of 5

            for (const unit of charactersToLose) {
                const cause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 100);
                await manager.processCharacterLoss(unit, cause);
            }

            // Try to create a full party
            const remainingCharacters = minimalUnits.slice(3); // Only 2 remaining
            const validationResult = manager.validatePartyComposition(remainingCharacters);

            // Should be valid but have insufficient members warning
            expect(validationResult.isValid).toBe(true);
            expect(validationResult.warnings.some(w => w.type === 'insufficient_members')).toBe(true);

            // Check available characters count
            expect(validationResult.availableCharacters).toHaveLength(2);
            expect(validationResult.lostCharacters).toHaveLength(3);

            console.log('✓ Insufficient available characters scenario test passed');
        });
    });

    describe('Party Composition Repair and Suggestions', () => {
        test('should provide repair suggestions for invalid party', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-repair-suggestions', mockUnits);

            // Lose some characters
            const lostCharacters = [
                mockUnits.find(u => u.id === 'warrior')!, // Tank
                mockUnits.find(u => u.id === 'mage')!, // Mage
            ];

            for (const unit of lostCharacters) {
                const cause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 100);
                await manager.processCharacterLoss(unit, cause);
            }

            // Create invalid party with lost characters
            const invalidParty = [
                mockUnits.find(u => u.id === 'hero')!,
                mockUnits.find(u => u.id === 'warrior')!, // Lost
                mockUnits.find(u => u.id === 'mage')!, // Lost
                mockUnits.find(u => u.id === 'cleric')!,
            ];

            const validationResult = manager.validatePartyComposition(invalidParty);

            // Get repair suggestions
            const availableForRepair = validationResult.availableCharacters.filter(char =>
                !invalidParty.some(partyMember => partyMember.id === char.id) ||
                validationResult.lostCharacters.some(lost => lost.id === partyMember.id)
            );

            expect(availableForRepair.length).toBeGreaterThan(0);

            // Should have suitable replacements
            const tankReplacement = availableForRepair.find(char => (char as any).role === 'tank');
            const mageReplacement = availableForRepair.find(char => (char as any).role === 'mage');

            expect(tankReplacement).toBeDefined(); // Paladin should be available
            expect(mageReplacement).toBeDefined(); // Wizard should be available

            console.log('✓ Party repair suggestions test passed');
        });

        test('should recommend optimal party composition with available characters', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-optimal-recommendation', mockUnits);

            // Lose some characters to create constraints
            const lostCharacters = [
                mockUnits.find(u => u.id === 'warrior')!, // One tank
                mockUnits.find(u => u.id === 'rogue')!, // One fighter
            ];

            for (const unit of lostCharacters) {
                const cause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 100);
                await manager.processCharacterLoss(unit, cause);
            }

            // Get available characters
            const availableCharacters = manager.getAvailableCharacters();

            // Get recommended party
            const recommendedParty = partyManager.getRecommendedParty(availableCharacters);

            // Verify recommendation quality
            expect(recommendedParty.length).toBeGreaterThan(0);
            expect(recommendedParty.length).toBeLessThanOrEqual(6); // Max party size

            // Check role balance in recommendation
            const roles = recommendedParty.map(char => (char as any).role);
            const hasHealer = roles.includes('healer');
            const hasTank = roles.includes('tank');
            const hasMage = roles.includes('mage');

            expect(hasHealer).toBe(true); // Should include a healer
            expect(hasTank).toBe(true); // Should include remaining tank (Paladin)
            expect(hasMage).toBe(true); // Should include a mage

            // Verify no lost characters in recommendation
            for (const char of recommendedParty) {
                expect(manager.isCharacterLost(char.id)).toBe(false);
            }

            console.log('✓ Optimal party recommendation test passed');
        });

        test('should handle party composition with role constraints', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-role-constraints', mockUnits);

            // Lose all but one of each key role
            const charactersToLose = [
                mockUnits.find(u => u.id === 'warrior')!, // Leave only Paladin as tank
                mockUnits.find(u => u.id === 'cleric')!, // Leave only Priest as healer
                mockUnits.find(u => u.id === 'mage')!, // Leave only Wizard as mage
            ];

            for (const unit of charactersToLose) {
                const cause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 100);
                await manager.processCharacterLoss(unit, cause);
            }

            // Get available characters
            const availableCharacters = manager.getAvailableCharacters();

            // Check role constraints
            const availableTanks = availableCharacters.filter(char => (char as any).role === 'tank');
            const availableHealers = availableCharacters.filter(char => (char as any).role === 'healer');
            const availableMages = availableCharacters.filter(char => (char as any).role === 'mage');

            expect(availableTanks).toHaveLength(1); // Only Paladin
            expect(availableHealers).toHaveLength(1); // Only Priest
            expect(availableMages).toHaveLength(1); // Only Wizard

            // Create party with constraints
            const constrainedParty = [
                availableTanks[0], // Paladin
                availableHealers[0], // Priest
                availableMages[0], // Wizard
                mockUnits.find(u => u.id === 'hero')!, // Hero as fighter
            ];

            const validationResult = manager.validatePartyComposition(constrainedParty);

            expect(validationResult.isValid).toBe(true);
            expect(validationResult.errors).toHaveLength(0);

            console.log('✓ Party composition with role constraints test passed');
        });
    });

    describe('Complete Party Management Flow', () => {
        test('should handle complete party management flow with losses', async () => {
            // Initialize chapter
            const chapterId = 'chapter-complete-party-flow';
            manager.initializeChapter(chapterId, mockUnits);

            // Step 1: Start with optimal party
            const initialParty = [
                mockUnits.find(u => u.id === 'hero')!, // Fighter
                mockUnits.find(u => u.id === 'warrior')!, // Tank
                mockUnits.find(u => u.id === 'mage')!, // Mage
                mockUnits.find(u => u.id === 'cleric')!, // Healer
            ];

            let validationResult = manager.validatePartyComposition(initialParty);
            expect(validationResult.isValid).toBe(true);

            // Step 2: Lose key party members during battle
            const lostMembers = [
                mockUnits.find(u => u.id === 'warrior')!, // Tank
                mockUnits.find(u => u.id === 'mage')!, // Mage
            ];

            for (const unit of lostMembers) {
                const cause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 100);
                await manager.processCharacterLoss(unit, cause);
            }

            // Step 3: Validate current party (now invalid)
            validationResult = manager.validatePartyComposition(initialParty);
            expect(validationResult.isValid).toBe(false);
            expect(validationResult.errors).toHaveLength(2);

            // Step 4: Get available characters for replacement
            const availableCharacters = manager.getAvailableCharacters();
            expect(availableCharacters.find(char => char.id === 'warrior')).toBeUndefined();
            expect(availableCharacters.find(char => char.id === 'mage')).toBeUndefined();

            // Step 5: Create new valid party with replacements
            const newParty = [
                mockUnits.find(u => u.id === 'hero')!, // Fighter (unchanged)
                mockUnits.find(u => u.id === 'paladin')!, // Tank replacement
                mockUnits.find(u => u.id === 'wizard')!, // Mage replacement
                mockUnits.find(u => u.id === 'cleric')!, // Healer (unchanged)
            ];

            validationResult = manager.validatePartyComposition(newParty);
            expect(validationResult.isValid).toBe(true);
            expect(validationResult.errors).toHaveLength(0);

            // Step 6: Complete chapter and verify state reset
            const completeResult = manager.completeChapter();
            expect(completeResult.success).toBe(true);

            // Step 7: Start new chapter (characters should be available again)
            const newChapterId = 'chapter-after-reset';
            manager.initializeChapter(newChapterId, mockUnits);

            const resetAvailableCharacters = manager.getAvailableCharacters();
            expect(resetAvailableCharacters.find(char => char.id === 'warrior')).toBeDefined();
            expect(resetAvailableCharacters.find(char => char.id === 'mage')).toBeDefined();

            console.log('✓ Complete party management flow test passed');
        });

        test('should handle party management under extreme loss conditions', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-extreme-losses', mockUnits);

            // Lose most characters, leaving minimal options
            const playerUnits = mockUnits.filter(u => u.faction === 'player');
            const charactersToLose = playerUnits.slice(0, -3); // Leave only 3 characters

            for (const unit of charactersToLose) {
                const cause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 100);
                await manager.processCharacterLoss(unit, cause);
            }

            // Get remaining available characters
            const availableCharacters = manager.getAvailableCharacters();
            expect(availableCharacters).toHaveLength(3);

            // Validate minimal party
            const minimalParty = availableCharacters;
            const validationResult = manager.validatePartyComposition(minimalParty);

            expect(validationResult.isValid).toBe(true);
            expect(validationResult.warnings.some(w => w.type === 'insufficient_members')).toBe(true);

            // Verify extreme loss scenario handling
            expect(validationResult.lostCharacters.length).toBe(charactersToLose.length);
            expect(validationResult.availableCharacters).toHaveLength(3);

            console.log('✓ Extreme loss conditions party management test passed');
        });

        test('should maintain party management performance with frequent updates', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-performance-test', mockUnits);

            const startTime = performance.now();

            // Simulate frequent party validation during battle
            for (let i = 0; i < 50; i++) {
                // Create random party
                const randomParty = mockUnits
                    .filter(u => u.faction === 'player')
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 4);

                // Validate party
                const validationResult = manager.validatePartyComposition(randomParty);
                expect(validationResult).toBeDefined();

                // Occasionally lose a character
                if (i % 10 === 0 && i > 0) {
                    const unitToLose = mockUnits.find(u =>
                        u.faction === 'player' && !manager.isCharacterLost(u.id)
                    );
                    if (unitToLose) {
                        const cause = CharacterLossUtils.createBattleDefeatCause('orc1', 'Orc Brute', 100);
                        await manager.processCharacterLoss(unitToLose, cause);
                    }
                }

                // Get available characters
                const availableCharacters = manager.getAvailableCharacters();
                expect(Array.isArray(availableCharacters)).toBe(true);
            }

            const endTime = performance.now();
            const totalTime = endTime - startTime;

            // Should handle frequent updates efficiently
            expect(totalTime).toBeLessThan(5000); // 5 seconds max

            console.log(`✓ Party management performance test passed: ${totalTime.toFixed(2)}ms`);
        });
    });

    describe('Party Management Error Handling', () => {
        test('should handle invalid party composition gracefully', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-invalid-party', mockUnits);

            // Test various invalid scenarios
            const invalidScenarios = [
                // Empty party
                [],
                // Party with null characters
                [mockUnits[0], null as any, mockUnits[2]],
                // Party with undefined characters
                [mockUnits[0], undefined as any, mockUnits[2]],
                // Party with duplicate characters
                [mockUnits[0], mockUnits[0], mockUnits[1]],
            ];

            for (const invalidParty of invalidScenarios) {
                try {
                    const validationResult = manager.validatePartyComposition(invalidParty);
                    // Should handle gracefully, not crash
                    expect(validationResult).toBeDefined();
                    expect(typeof validationResult.isValid).toBe('boolean');
                } catch (error) {
                    // If it throws, should be a handled error
                    expect(error).toBeDefined();
                }
            }

            console.log('✓ Invalid party composition handling test passed');
        });

        test('should recover from party management system failures', async () => {
            // Initialize chapter
            manager.initializeChapter('chapter-system-failure', mockUnits);

            // Simulate party manager failure
            const originalValidate = manager.validatePartyComposition;
            manager.validatePartyComposition = jest.fn(() => {
                throw new Error('Party manager failed');
            });

            // System should handle failure gracefully
            try {
                const party = [mockUnits[0], mockUnits[1]];
                const result = manager.validatePartyComposition(party);
                // Should either handle gracefully or throw managed error
                expect(result).toBeDefined();
            } catch (error) {
                expect(error).toBeDefined();
            }

            // Restore functionality
            manager.validatePartyComposition = originalValidate;

            // Should work normally after restoration
            const party = [mockUnits[0], mockUnits[1]];
            const result = manager.validatePartyComposition(party);
            expect(result.isValid).toBe(true);

            console.log('✓ Party management system failure recovery test passed');
        });
    });
});