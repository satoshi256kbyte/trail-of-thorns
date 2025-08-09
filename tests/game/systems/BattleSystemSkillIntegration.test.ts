/**
 * Battle System Skill Integration Tests
 * 
 * Comprehensive tests for the integration between the battle system and skill system,
 * covering all aspects of skill execution within the battle context.
 */

import { BattleSystem, SkillAction, SkillActionResult } from '../../../game/src/systems/BattleSystem';
import { SkillSystem } from '../../../game/src/systems/skills/SkillSystem';
import { Unit, Position } from '../../../game/src/types/gameplay';
import { SkillResult, SkillType, TargetType, SkillData } from '../../../game/src/types/skill';
import { BattleError } from '../../../game/src/types/battle';
import { CharacterLossManager } from '../../../game/src/systems/CharacterLossManager';

// Mock Phaser scene
const mockScene = {
    add: {
        graphics: jest.fn(() => ({
            fillStyle: jest.fn(),
            lineStyle: jest.fn(),
            fillRect: jest.fn(),
            strokeRect: jest.fn()
        })),
        text: jest.fn(() => ({
            setOrigin: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setText: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            setTint: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        })),
        sprite: jest.fn(() => ({
            setOrigin: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            setTint: jest.fn().mockReturnThis(),
            play: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        })),
        particles: jest.fn(() => ({
            createEmitter: jest.fn(() => ({
                setPosition: jest.fn().mockReturnThis(),
                start: jest.fn(),
                stop: jest.fn(),
                destroy: jest.fn()
            })),
            destroy: jest.fn()
        })),
        container: jest.fn(() => ({
            setVisible: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            add: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        })),
        rectangle: jest.fn(() => ({
            setVisible: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setStrokeStyle: jest.fn().mockReturnThis(),
            setFillStyle: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        })),
        group: jest.fn(() => ({
            add: jest.fn(),
            remove: jest.fn(),
            clear: jest.fn(),
            destroy: jest.fn(),
            children: {
                entries: []
            }
        }))
    },
    events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        once: jest.fn()
    },
    time: {
        addEvent: jest.fn(() => ({
            remove: jest.fn(),
            destroy: jest.fn()
        }))
    }
} as any;

// Mock units for testing
const createMockUnit = (overrides: Partial<Unit> = {}): Unit => ({
    id: 'test-unit-' + Math.random().toString(36).substr(2, 9),
    name: 'Test Unit',
    position: { x: 0, y: 0 },
    stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 20,
        defense: 15,
        speed: 10,
        movement: 3
    },
    currentHP: 100,
    currentMP: 50,
    faction: 'player',
    hasActed: false,
    hasMoved: false,
    ...overrides
});

// Mock skill data
const createMockSkillData = (overrides: Partial<SkillData> = {}): SkillData => ({
    id: 'test-skill',
    name: 'Test Skill',
    description: 'A test skill',
    skillType: SkillType.ATTACK,
    targetType: TargetType.SINGLE_ENEMY,
    range: 2,
    areaOfEffect: {
        shape: 'single',
        size: 1
    },
    effects: [{
        type: 'damage',
        value: 30,
        damageType: 'physical' as any
    }],
    usageCondition: {
        mpCost: 10,
        cooldown: 0,
        usageLimit: 0,
        levelRequirement: 1
    },
    learnCondition: {
        level: 1
    },
    animation: {
        castAnimation: 'cast',
        effectAnimation: 'effect',
        duration: 1000
    },
    ...overrides
});

describe('BattleSystem Skill Integration', () => {
    let battleSystem: BattleSystem;
    let skillSystem: SkillSystem;
    let characterLossManager: CharacterLossManager;
    let playerUnit: Unit;
    let enemyUnit: Unit;
    let mockSkillData: SkillData;

    beforeEach(() => {
        // Create systems
        battleSystem = new BattleSystem(mockScene);
        skillSystem = new SkillSystem(mockScene);
        characterLossManager = new CharacterLossManager();

        // Create test units
        playerUnit = createMockUnit({
            id: 'player-1',
            name: 'Player Unit',
            faction: 'player',
            position: { x: 1, y: 1 }
        });

        enemyUnit = createMockUnit({
            id: 'enemy-1',
            name: 'Enemy Unit',
            faction: 'enemy',
            position: { x: 3, y: 1 }
        });

        // Create test skill
        mockSkillData = createMockSkillData();

        // Initialize systems
        battleSystem.initialize([playerUnit, enemyUnit]);
        battleSystem.setSkillSystem(skillSystem);
        battleSystem.setCharacterLossManager(characterLossManager);

        // Register test skill
        skillSystem.registerSkill(mockSkillData);
        skillSystem.learnSkill(playerUnit.id, mockSkillData.id, playerUnit);
    });

    describe('System Integration', () => {
        test('should integrate skill system with battle system', () => {
            expect(battleSystem.hasSkillSystem()).toBe(true);
        });

        test('should integrate character loss manager with battle system', () => {
            expect(battleSystem.hasCharacterLossManager()).toBe(true);
        });

        test('should handle missing skill system gracefully', async () => {
            const battleSystemWithoutSkills = new BattleSystem(mockScene);
            battleSystemWithoutSkills.initialize([playerUnit, enemyUnit]);

            const action: SkillAction = {
                skillId: mockSkillData.id,
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            const result = await battleSystemWithoutSkills.executeSkillAction(action);

            expect(result.success).toBe(false);
            expect(result.error?.error).toBe(BattleError.BATTLE_SYSTEM_ERROR);
            expect(result.error?.message).toContain('Skill system not integrated');
        });
    });

    describe('executeSkillAction', () => {
        test('should execute skill action successfully', async () => {
            const action: SkillAction = {
                skillId: mockSkillData.id,
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            // Mock skill system to return successful result
            const mockSkillResult: SkillResult = {
                success: true,
                targets: [enemyUnit.id],
                effects: [{
                    targetId: enemyUnit.id,
                    effectType: 'damage',
                    actualValue: 30,
                    success: true
                }],
                mpCost: 10
            };

            jest.spyOn(skillSystem, 'useSkill').mockResolvedValue({
                success: true,
                result: mockSkillResult
            });

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(true);
            expect(result.skillResult).toBeDefined();
            expect(result.battleResults).toHaveLength(1);
            expect(result.additionalInfo?.affectedUnits).toHaveLength(1);
            expect(result.additionalInfo?.totalDamageDealt).toBe(30);
        });

        test('should handle invalid caster', async () => {
            const invalidUnit = createMockUnit({
                currentHP: 0 // Defeated unit
            });

            const action: SkillAction = {
                skillId: mockSkillData.id,
                caster: invalidUnit,
                targetPosition: enemyUnit.position
            };

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('Invalid or defeated caster');
        });

        test('should handle caster who has already acted', async () => {
            playerUnit.hasActed = true;

            const action: SkillAction = {
                skillId: mockSkillData.id,
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('already acted');
        });

        test('should allow forced execution even when caster has acted', async () => {
            playerUnit.hasActed = true;

            const action: SkillAction = {
                skillId: mockSkillData.id,
                caster: playerUnit,
                targetPosition: enemyUnit.position,
                options: { forceBattle: true }
            };

            // Mock successful skill execution
            jest.spyOn(skillSystem, 'useSkill').mockResolvedValue({
                success: true,
                result: {
                    success: true,
                    targets: [enemyUnit.id],
                    effects: [{
                        targetId: enemyUnit.id,
                        effectType: 'damage',
                        actualValue: 30,
                        success: true
                    }],
                    mpCost: 10
                }
            });

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(true);
        });

        test('should handle skill execution failure', async () => {
            const action: SkillAction = {
                skillId: mockSkillData.id,
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            // Mock skill system to return failure
            jest.spyOn(skillSystem, 'useSkill').mockResolvedValue({
                success: false,
                error: {
                    type: 'insufficient_mp',
                    message: 'Not enough MP',
                    phase: 'validation'
                }
            });

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('Skill execution failed');
        });

        test('should handle skill system exceptions', async () => {
            const action: SkillAction = {
                skillId: mockSkillData.id,
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            // Mock skill system to throw exception
            jest.spyOn(skillSystem, 'useSkill').mockRejectedValue(new Error('Skill system error'));

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('Skill action execution error');
        });
    });

    describe('Skill Effect Processing', () => {
        test('should process damage effects correctly', async () => {
            const action: SkillAction = {
                skillId: mockSkillData.id,
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            const mockSkillResult: SkillResult = {
                success: true,
                targets: [enemyUnit.id],
                effects: [{
                    targetId: enemyUnit.id,
                    effectType: 'damage',
                    actualValue: 40,
                    success: true,
                    isCritical: true
                }],
                mpCost: 10
            };

            jest.spyOn(skillSystem, 'useSkill').mockResolvedValue({
                success: true,
                result: mockSkillResult
            });

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(true);
            expect(result.battleResults[0].finalDamage).toBeGreaterThan(0);
            expect(result.battleResults[0].isCritical).toBe(true);
            expect(result.additionalInfo?.totalDamageDealt).toBeGreaterThan(0);
        });

        test('should process healing effects correctly', async () => {
            const healSkillData = createMockSkillData({
                id: 'heal-skill',
                skillType: SkillType.HEAL,
                targetType: TargetType.SINGLE_ALLY,
                effects: [{
                    type: 'heal',
                    value: 25,
                    healType: 'fixed' as any
                }]
            });

            // Damage the player unit first
            playerUnit.currentHP = 50;

            const action: SkillAction = {
                skillId: healSkillData.id,
                caster: playerUnit,
                targetPosition: playerUnit.position
            };

            const mockSkillResult: SkillResult = {
                success: true,
                targets: [playerUnit.id],
                effects: [{
                    targetId: playerUnit.id,
                    effectType: 'heal',
                    actualValue: 25,
                    success: true
                }],
                mpCost: 5
            };

            jest.spyOn(skillSystem, 'useSkill').mockResolvedValue({
                success: true,
                result: mockSkillResult
            });

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(true);
            expect(result.battleResults[0].finalDamage).toBeLessThan(0); // Negative damage = healing
            expect(result.additionalInfo?.totalHealingDone).toBe(25);
        });

        test('should process multiple effects correctly', async () => {
            const multiEffectSkillData = createMockSkillData({
                id: 'multi-effect-skill',
                effects: [
                    { type: 'damage', value: 20 },
                    { type: 'buff', value: 5, buffType: 'attack_up' as any }
                ]
            });

            const action: SkillAction = {
                skillId: multiEffectSkillData.id,
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            const mockSkillResult: SkillResult = {
                success: true,
                targets: [enemyUnit.id],
                effects: [
                    {
                        targetId: enemyUnit.id,
                        effectType: 'damage',
                        actualValue: 20,
                        success: true
                    },
                    {
                        targetId: enemyUnit.id,
                        effectType: 'buff',
                        actualValue: 5,
                        success: true
                    }
                ],
                mpCost: 15
            };

            jest.spyOn(skillSystem, 'useSkill').mockResolvedValue({
                success: true,
                result: mockSkillResult
            });

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(true);
            expect(result.battleResults).toHaveLength(2);
            expect(result.additionalInfo?.statusEffectsApplied).toBe(1);
        });

        test('should handle failed effects gracefully', async () => {
            const action: SkillAction = {
                skillId: mockSkillData.id,
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            const mockSkillResult: SkillResult = {
                success: true,
                targets: [enemyUnit.id],
                effects: [{
                    targetId: enemyUnit.id,
                    effectType: 'damage',
                    actualValue: 0,
                    success: false, // Effect failed
                    resisted: true
                }],
                mpCost: 10
            };

            jest.spyOn(skillSystem, 'useSkill').mockResolvedValue({
                success: true,
                result: mockSkillResult
            });

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(true);
            expect(result.battleResults).toHaveLength(0); // No battle results for failed effects
            expect(result.additionalInfo?.totalDamageDealt).toBe(0);
        });
    });

    describe('Character Loss Integration', () => {
        test('should process character loss when target is defeated', async () => {
            // Set enemy HP low so it will be defeated
            enemyUnit.currentHP = 10;
            enemyUnit.faction = 'player'; // Make it a player unit so loss is processed

            const action: SkillAction = {
                skillId: mockSkillData.id,
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            const mockSkillResult: SkillResult = {
                success: true,
                targets: [enemyUnit.id],
                effects: [{
                    targetId: enemyUnit.id,
                    effectType: 'damage',
                    actualValue: 50, // Enough to defeat
                    success: true
                }],
                mpCost: 10
            };

            jest.spyOn(skillSystem, 'useSkill').mockResolvedValue({
                success: true,
                result: mockSkillResult
            });

            // Mock character loss manager
            const processLossSpy = jest.spyOn(characterLossManager, 'processCharacterLoss')
                .mockResolvedValue();

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(true);
            expect(result.battleResults[0].targetDefeated).toBe(true);
            expect(processLossSpy).toHaveBeenCalledWith(
                enemyUnit,
                expect.objectContaining({
                    type: 'battle_defeat',
                    sourceId: playerUnit.id,
                    sourceName: playerUnit.name
                })
            );
        });

        test('should handle character loss processing errors gracefully', async () => {
            enemyUnit.currentHP = 10;
            enemyUnit.faction = 'player';

            const action: SkillAction = {
                skillId: mockSkillData.id,
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            const mockSkillResult: SkillResult = {
                success: true,
                targets: [enemyUnit.id],
                effects: [{
                    targetId: enemyUnit.id,
                    effectType: 'damage',
                    actualValue: 50,
                    success: true
                }],
                mpCost: 10
            };

            jest.spyOn(skillSystem, 'useSkill').mockResolvedValue({
                success: true,
                result: mockSkillResult
            });

            // Mock character loss manager to throw error
            jest.spyOn(characterLossManager, 'processCharacterLoss')
                .mockRejectedValue(new Error('Loss processing failed'));

            const result = await battleSystem.executeSkillAction(action);

            // Should still succeed even if loss processing fails
            expect(result.success).toBe(true);
            expect(result.battleResults[0].targetDefeated).toBe(true);
        });
    });

    describe('Battle State Updates', () => {
        test('should mark caster as having acted', async () => {
            expect(playerUnit.hasActed).toBe(false);

            const action: SkillAction = {
                skillId: mockSkillData.id,
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            jest.spyOn(skillSystem, 'useSkill').mockResolvedValue({
                success: true,
                result: {
                    success: true,
                    targets: [enemyUnit.id],
                    effects: [{
                        targetId: enemyUnit.id,
                        effectType: 'damage',
                        actualValue: 30,
                        success: true
                    }],
                    mpCost: 10
                }
            });

            await battleSystem.executeSkillAction(action);

            expect(playerUnit.hasActed).toBe(true);
        });

        test('should grant experience to caster', async () => {
            const initialExperience = playerUnit.stats.experience || 0;

            const action: SkillAction = {
                skillId: mockSkillData.id,
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            jest.spyOn(skillSystem, 'useSkill').mockResolvedValue({
                success: true,
                result: {
                    success: true,
                    targets: [enemyUnit.id],
                    effects: [{
                        targetId: enemyUnit.id,
                        effectType: 'damage',
                        actualValue: 30,
                        success: true
                    }],
                    mpCost: 10
                }
            });

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(true);
            expect(result.battleResults[0].experienceGained).toBeGreaterThan(0);
        });

        test('should update battle history', async () => {
            const initialHistoryLength = (battleSystem as any).battleHistory.length;

            const action: SkillAction = {
                skillId: mockSkillData.id,
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            jest.spyOn(skillSystem, 'useSkill').mockResolvedValue({
                success: true,
                result: {
                    success: true,
                    targets: [enemyUnit.id],
                    effects: [{
                        targetId: enemyUnit.id,
                        effectType: 'damage',
                        actualValue: 30,
                        success: true
                    }],
                    mpCost: 10
                }
            });

            await battleSystem.executeSkillAction(action);

            const finalHistoryLength = (battleSystem as any).battleHistory.length;
            expect(finalHistoryLength).toBeGreaterThan(initialHistoryLength);
        });
    });

    describe('Event Emission', () => {
        test('should emit skill-action-completed event on success', async () => {
            const emitSpy = jest.spyOn(battleSystem, 'emit');

            const action: SkillAction = {
                skillId: mockSkillData.id,
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            jest.spyOn(skillSystem, 'useSkill').mockResolvedValue({
                success: true,
                result: {
                    success: true,
                    targets: [enemyUnit.id],
                    effects: [{
                        targetId: enemyUnit.id,
                        effectType: 'damage',
                        actualValue: 30,
                        success: true
                    }],
                    mpCost: 10
                }
            });

            await battleSystem.executeSkillAction(action);

            expect(emitSpy).toHaveBeenCalledWith('skill-action-completed', expect.objectContaining({
                action,
                result: expect.objectContaining({ success: true }),
                executionTime: expect.any(Number)
            }));
        });

        test('should emit skill-action-error event on failure', async () => {
            const emitSpy = jest.spyOn(battleSystem, 'emit');

            const action: SkillAction = {
                skillId: mockSkillData.id,
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            jest.spyOn(skillSystem, 'useSkill').mockRejectedValue(new Error('Test error'));

            await battleSystem.executeSkillAction(action);

            expect(emitSpy).toHaveBeenCalledWith('skill-action-error', expect.objectContaining({
                action,
                error: expect.objectContaining({
                    error: BattleError.BATTLE_SYSTEM_ERROR
                }),
                executionTime: expect.any(Number)
            }));
        });
    });

    describe('Performance and Metrics', () => {
        test('should track execution time', async () => {
            const action: SkillAction = {
                skillId: mockSkillData.id,
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            jest.spyOn(skillSystem, 'useSkill').mockResolvedValue({
                success: true,
                result: {
                    success: true,
                    targets: [enemyUnit.id],
                    effects: [{
                        targetId: enemyUnit.id,
                        effectType: 'damage',
                        actualValue: 30,
                        success: true
                    }],
                    mpCost: 10
                }
            });

            const result = await battleSystem.executeSkillAction(action);

            expect(result.additionalInfo?.executionTime).toBeGreaterThan(0);
        });

        test('should calculate comprehensive statistics', async () => {
            const action: SkillAction = {
                skillId: mockSkillData.id,
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            jest.spyOn(skillSystem, 'useSkill').mockResolvedValue({
                success: true,
                result: {
                    success: true,
                    targets: [enemyUnit.id],
                    effects: [
                        {
                            targetId: enemyUnit.id,
                            effectType: 'damage',
                            actualValue: 30,
                            success: true
                        },
                        {
                            targetId: playerUnit.id,
                            effectType: 'heal',
                            actualValue: 15,
                            success: true
                        },
                        {
                            targetId: enemyUnit.id,
                            effectType: 'debuff',
                            actualValue: 5,
                            success: true
                        }
                    ],
                    mpCost: 20
                }
            });

            const result = await battleSystem.executeSkillAction(action);

            expect(result.additionalInfo?.affectedUnits).toHaveLength(2);
            expect(result.additionalInfo?.totalDamageDealt).toBe(30);
            expect(result.additionalInfo?.totalHealingDone).toBe(15);
            expect(result.additionalInfo?.statusEffectsApplied).toBe(1);
        });
    });
});