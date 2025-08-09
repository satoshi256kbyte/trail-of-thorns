/**
 * Core Battle System Skill Integration Tests
 * 
 * Focused tests for the core integration functionality between battle system and skill system.
 * These tests verify the essential integration points without complex mocking.
 */

import { BattleSystem, SkillAction, SkillActionResult } from '../../../game/src/systems/BattleSystem';
import { Unit, Position } from '../../../game/src/types/gameplay';
import { BattleError } from '../../../game/src/types/battle';

describe('Battle System Skill Integration - Core Functionality', () => {
    let battleSystem: BattleSystem;
    let mockScene: any;
    let playerUnit: Unit;
    let enemyUnit: Unit;

    beforeEach(() => {
        // Minimal mock scene for testing
        mockScene = {
            add: {
                graphics: jest.fn(() => ({ fillStyle: jest.fn(), lineStyle: jest.fn(), fillRect: jest.fn(), strokeRect: jest.fn() })),
                text: jest.fn(() => ({ setOrigin: jest.fn().mockReturnThis(), setVisible: jest.fn().mockReturnThis(), destroy: jest.fn() })),
                container: jest.fn(() => ({ setVisible: jest.fn().mockReturnThis(), setDepth: jest.fn().mockReturnThis(), setScrollFactor: jest.fn().mockReturnThis(), add: jest.fn().mockReturnThis(), destroy: jest.fn() })),
                rectangle: jest.fn(() => ({ setVisible: jest.fn().mockReturnThis(), setStrokeStyle: jest.fn().mockReturnThis(), destroy: jest.fn() })),
                group: jest.fn(() => ({ add: jest.fn(), remove: jest.fn(), clear: jest.fn(), destroy: jest.fn(), children: { entries: [] } })),
                sprite: jest.fn(() => ({ setOrigin: jest.fn().mockReturnThis(), setVisible: jest.fn().mockReturnThis(), destroy: jest.fn() })),
                particles: jest.fn(() => ({ createEmitter: jest.fn(() => ({ setPosition: jest.fn().mockReturnThis(), start: jest.fn(), stop: jest.fn(), destroy: jest.fn() })), destroy: jest.fn() }))
            },
            events: { on: jest.fn(), off: jest.fn(), emit: jest.fn(), once: jest.fn() },
            time: { addEvent: jest.fn(() => ({ remove: jest.fn(), destroy: jest.fn() })) }
        };

        // Create test units
        playerUnit = {
            id: 'player-1',
            name: 'Player Unit',
            position: { x: 1, y: 1 },
            stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
            currentHP: 100,
            currentMP: 50,
            faction: 'player',
            hasActed: false,
            hasMoved: false
        };

        enemyUnit = {
            id: 'enemy-1',
            name: 'Enemy Unit',
            position: { x: 3, y: 1 },
            stats: { maxHP: 80, maxMP: 30, attack: 18, defense: 12, speed: 8, movement: 2 },
            currentHP: 80,
            currentMP: 30,
            faction: 'enemy',
            hasActed: false,
            hasMoved: false
        };

        battleSystem = new BattleSystem(mockScene);
        battleSystem.initialize([playerUnit, enemyUnit]);
    });

    describe('Skill System Integration', () => {
        test('should have skill system integration methods', () => {
            expect(typeof battleSystem.setSkillSystem).toBe('function');
            expect(typeof battleSystem.hasSkillSystem).toBe('function');
            expect(typeof battleSystem.executeSkillAction).toBe('function');
        });

        test('should track skill system integration status', () => {
            expect(battleSystem.hasSkillSystem()).toBe(false);

            const mockSkillSystem = {
                useSkill: jest.fn(),
                registerSkill: jest.fn(),
                getAvailableSkills: jest.fn()
            } as any;

            battleSystem.setSkillSystem(mockSkillSystem);
            expect(battleSystem.hasSkillSystem()).toBe(true);
        });
    });

    describe('executeSkillAction - Core Logic', () => {
        test('should reject skill action when skill system not integrated', async () => {
            const action: SkillAction = {
                skillId: 'test-skill',
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(false);
            expect(result.error?.error).toBe(BattleError.BATTLE_SYSTEM_ERROR);
            expect(result.error?.message).toContain('Skill system not integrated');
        });

        test('should reject invalid caster', async () => {
            const mockSkillSystem = { useSkill: jest.fn() } as any;
            battleSystem.setSkillSystem(mockSkillSystem);

            const invalidUnit = { ...playerUnit, currentHP: 0 }; // Defeated unit

            const action: SkillAction = {
                skillId: 'test-skill',
                caster: invalidUnit,
                targetPosition: enemyUnit.position
            };

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('Invalid or defeated caster');
        });

        test('should reject caster who has already acted', async () => {
            const mockSkillSystem = { useSkill: jest.fn() } as any;
            battleSystem.setSkillSystem(mockSkillSystem);

            playerUnit.hasActed = true;

            const action: SkillAction = {
                skillId: 'test-skill',
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('already acted');
        });

        test('should allow forced execution even when caster has acted', async () => {
            const mockSkillSystem = {
                useSkill: jest.fn().mockResolvedValue({
                    success: true,
                    result: {
                        success: true,
                        targets: [enemyUnit.id],
                        effects: [{ targetId: enemyUnit.id, effectType: 'damage', actualValue: 30, success: true }],
                        mpCost: 10
                    }
                })
            } as any;
            battleSystem.setSkillSystem(mockSkillSystem);

            playerUnit.hasActed = true;

            const action: SkillAction = {
                skillId: 'test-skill',
                caster: playerUnit,
                targetPosition: enemyUnit.position,
                options: { forceBattle: true }
            };

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(true);
            expect(mockSkillSystem.useSkill).toHaveBeenCalled();
        });

        test('should handle skill execution success', async () => {
            const mockSkillResult = {
                success: true,
                targets: [enemyUnit.id],
                effects: [{ targetId: enemyUnit.id, effectType: 'damage', actualValue: 30, success: true }],
                mpCost: 10
            };

            const mockSkillSystem = {
                useSkill: jest.fn().mockResolvedValue({
                    success: true,
                    result: mockSkillResult
                })
            } as any;
            battleSystem.setSkillSystem(mockSkillSystem);

            const action: SkillAction = {
                skillId: 'test-skill',
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(true);
            expect(result.skillResult).toEqual(mockSkillResult);
            expect(result.battleResults).toHaveLength(1);
            expect(result.additionalInfo?.affectedUnits).toHaveLength(1);
            expect(result.additionalInfo?.totalDamageDealt).toBeGreaterThan(0);
        });

        test('should handle skill execution failure', async () => {
            const mockSkillSystem = {
                useSkill: jest.fn().mockResolvedValue({
                    success: false,
                    error: { type: 'insufficient_mp', message: 'Not enough MP', phase: 'validation' }
                })
            } as any;
            battleSystem.setSkillSystem(mockSkillSystem);

            const action: SkillAction = {
                skillId: 'test-skill',
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('Skill execution failed');
        });

        test('should handle skill system exceptions', async () => {
            const mockSkillSystem = {
                useSkill: jest.fn().mockRejectedValue(new Error('Skill system error'))
            } as any;
            battleSystem.setSkillSystem(mockSkillSystem);

            const action: SkillAction = {
                skillId: 'test-skill',
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('Skill action execution error');
        });
    });

    describe('Skill Effect Processing', () => {
        test('should process damage effects', async () => {
            const mockSkillResult = {
                success: true,
                targets: [enemyUnit.id],
                effects: [{ targetId: enemyUnit.id, effectType: 'damage', actualValue: 40, success: true, isCritical: true }],
                mpCost: 10
            };

            const mockSkillSystem = {
                useSkill: jest.fn().mockResolvedValue({ success: true, result: mockSkillResult })
            } as any;
            battleSystem.setSkillSystem(mockSkillSystem);

            const action: SkillAction = {
                skillId: 'test-skill',
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(true);
            expect(result.battleResults[0].finalDamage).toBeGreaterThan(0);
            expect(result.additionalInfo?.totalDamageDealt).toBeGreaterThan(0);
        });

        test('should process healing effects', async () => {
            const mockSkillResult = {
                success: true,
                targets: [playerUnit.id],
                effects: [{ targetId: playerUnit.id, effectType: 'heal', actualValue: 25, success: true }],
                mpCost: 5
            };

            const mockSkillSystem = {
                useSkill: jest.fn().mockResolvedValue({ success: true, result: mockSkillResult })
            } as any;
            battleSystem.setSkillSystem(mockSkillSystem);

            const action: SkillAction = {
                skillId: 'heal-skill',
                caster: playerUnit,
                targetPosition: playerUnit.position
            };

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(true);
            expect(result.battleResults[0].finalDamage).toBeLessThan(0); // Negative damage = healing
            expect(result.additionalInfo?.totalHealingDone).toBe(25);
        });

        test('should handle failed effects gracefully', async () => {
            const mockSkillResult = {
                success: true,
                targets: [enemyUnit.id],
                effects: [{ targetId: enemyUnit.id, effectType: 'damage', actualValue: 0, success: false, resisted: true }],
                mpCost: 10
            };

            const mockSkillSystem = {
                useSkill: jest.fn().mockResolvedValue({ success: true, result: mockSkillResult })
            } as any;
            battleSystem.setSkillSystem(mockSkillSystem);

            const action: SkillAction = {
                skillId: 'test-skill',
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            const result = await battleSystem.executeSkillAction(action);

            expect(result.success).toBe(true);
            expect(result.battleResults).toHaveLength(0); // No battle results for failed effects
            expect(result.additionalInfo?.totalDamageDealt).toBe(0);
        });
    });

    describe('Battle State Updates', () => {
        test('should mark caster as having acted', async () => {
            expect(playerUnit.hasActed).toBe(false);

            const mockSkillSystem = {
                useSkill: jest.fn().mockResolvedValue({
                    success: true,
                    result: {
                        success: true,
                        targets: [enemyUnit.id],
                        effects: [{ targetId: enemyUnit.id, effectType: 'damage', actualValue: 30, success: true }],
                        mpCost: 10
                    }
                })
            } as any;
            battleSystem.setSkillSystem(mockSkillSystem);

            const action: SkillAction = {
                skillId: 'test-skill',
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            await battleSystem.executeSkillAction(action);

            expect(playerUnit.hasActed).toBe(true);
        });

        test('should calculate comprehensive statistics', async () => {
            const mockSkillResult = {
                success: true,
                targets: [enemyUnit.id, playerUnit.id],
                effects: [
                    { targetId: enemyUnit.id, effectType: 'damage', actualValue: 30, success: true },
                    { targetId: playerUnit.id, effectType: 'heal', actualValue: 15, success: true },
                    { targetId: enemyUnit.id, effectType: 'debuff', actualValue: 5, success: true }
                ],
                mpCost: 20
            };

            const mockSkillSystem = {
                useSkill: jest.fn().mockResolvedValue({ success: true, result: mockSkillResult })
            } as any;
            battleSystem.setSkillSystem(mockSkillSystem);

            const action: SkillAction = {
                skillId: 'multi-effect-skill',
                caster: playerUnit,
                targetPosition: enemyUnit.position
            };

            const result = await battleSystem.executeSkillAction(action);

            expect(result.additionalInfo?.affectedUnits).toHaveLength(2);
            expect(result.additionalInfo?.totalDamageDealt).toBe(30);
            expect(result.additionalInfo?.totalHealingDone).toBe(15);
            expect(result.additionalInfo?.statusEffectsApplied).toBe(1);
            expect(result.additionalInfo?.executionTime).toBeGreaterThan(0);
        });
    });

    describe('Interface Validation', () => {
        test('should have correct SkillAction interface', () => {
            const action: SkillAction = {
                skillId: 'test-skill',
                caster: playerUnit,
                targetPosition: { x: 1, y: 1 },
                options: { skipAnimations: true }
            };

            expect(action.skillId).toBe('test-skill');
            expect(action.caster).toBe(playerUnit);
            expect(action.targetPosition).toEqual({ x: 1, y: 1 });
            expect(action.options?.skipAnimations).toBe(true);
        });

        test('should have correct SkillActionResult interface', () => {
            const result: SkillActionResult = {
                success: true,
                skillResult: {
                    success: true,
                    targets: ['enemy-1'],
                    effects: [{ targetId: 'enemy-1', effectType: 'damage', actualValue: 30, success: true }],
                    mpCost: 10
                },
                battleResults: [],
                additionalInfo: {
                    affectedUnits: [enemyUnit],
                    totalDamageDealt: 30,
                    totalHealingDone: 0,
                    statusEffectsApplied: 0,
                    executionTime: 100
                }
            };

            expect(result.success).toBe(true);
            expect(result.skillResult?.success).toBe(true);
            expect(result.additionalInfo?.totalDamageDealt).toBe(30);
        });
    });
});