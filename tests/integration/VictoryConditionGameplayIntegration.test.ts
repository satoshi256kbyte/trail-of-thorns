import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VictoryConditionSystem } from '../../game/src/systems/victory/VictoryConditionSystem';
import { Unit } from '../../game/src/types/character';
import { Position } from '../../game/src/types/common';
import { VictoryStageData } from '../../game/src/types/victory';
import { BossData } from '../../game/src/types/boss';

/**
 * Integration tests for VictoryConditionSystem with GameplayScene
 * Tests the key integration points:
 * - Stage initialization (Requirement 1.1, 2.1)
 * - Damage/healing recording (Requirement 3.7, 3.8)
 * - Boss defeat processing (Requirement 4.6)
 * - Victory/defeat detection (Requirement 10.7)
 */
describe('VictoryConditionSystem GameplayScene Integration', () => {
    let victorySystem: VictoryConditionSystem;
    let mockStageData: VictoryStageData;
    let playerUnit: Unit;
    let enemyUnit: Unit;
    let bossUnit: Unit;
    let bossData: BossData;

    beforeEach(() => {
        // Create mock units
        playerUnit = createMockUnit('player-1', 'Player', 'player', { x: 0, y: 0 });
        enemyUnit = createMockUnit('enemy-1', 'Enemy', 'enemy', { x: 5, y: 5 });
        bossUnit = createMockUnit('boss-1', 'Boss', 'enemy', { x: 10, y: 10 }, true);

        // Create boss data
        bossData = {
            id: 'boss-1',
            name: 'Boss',
            roseEssenceReward: 10,
            specialAbilities: []
        };

        // Create mock stage data for VictoryConditionSystem
        mockStageData = {
            id: 'test-stage',
            name: 'Test Stage',
            description: 'Test stage for integration testing',
            objectives: [
                {
                    id: 'defeat-all',
                    type: 'defeat_all_enemies',
                    description: 'Defeat all enemies',
                    required: true,
                    progress: 0,
                    target: 2,
                    completed: false
                }
            ],
            victoryConditions: [
                {
                    id: 'victory-1',
                    type: 'all_objectives_complete',
                    description: 'Complete all objectives'
                }
            ],
            defeatConditions: [
                {
                    id: 'defeat-1',
                    type: 'all_player_units_defeated',
                    description: 'All player units defeated'
                }
            ],
            playerUnits: [playerUnit],
            enemyUnits: [enemyUnit, bossUnit],
            bosses: [bossUnit]
        };

        // Create mock Phaser scene
        const mockScene = {
            events: {
                on: vi.fn(),
                off: vi.fn(),
                emit: vi.fn()
            },
            add: {
                text: vi.fn().mockReturnValue({
                    setOrigin: vi.fn().mockReturnThis(),
                    setDepth: vi.fn().mockReturnThis(),
                    setVisible: vi.fn().mockReturnThis(),
                    destroy: vi.fn()
                }),
                graphics: vi.fn().mockReturnValue({
                    clear: vi.fn(),
                    fillStyle: vi.fn(),
                    fillRect: vi.fn(),
                    lineStyle: vi.fn(),
                    strokeRect: vi.fn(),
                    destroy: vi.fn()
                }),
                container: vi.fn().mockReturnValue({
                    add: vi.fn(),
                    setVisible: vi.fn().mockReturnThis(),
                    destroy: vi.fn()
                })
            },
            time: {
                addEvent: vi.fn()
            }
        } as any;

        // Create victory system with mock scene
        victorySystem = new VictoryConditionSystem(mockScene);
    });

    describe('Requirement 1.1, 2.1: Stage Initialization', () => {
        it('should initialize victory conditions and objectives on stage load', () => {
            // Initialize victory system
            const result = victorySystem.initialize(mockStageData);

            // Verify initialization succeeded
            expect(result.success).toBe(true);
            expect(result.objectivesRegistered).toBeGreaterThan(0);
            expect(victorySystem.isSystemInitialized()).toBe(true);

            // Verify objectives are accessible
            const objectives = victorySystem.getObjectiveManager().getAllObjectives();
            expect(objectives.length).toBeGreaterThan(0);
        });

        it('should register boss units after initialization', () => {
            // Initialize system
            victorySystem.initialize(mockStageData);
            
            // Register boss
            victorySystem.registerBossUnit(bossUnit, bossData);

            // Verify boss is registered
            const bossSystem = victorySystem.getBossSystem();
            const registeredBoss = bossSystem.getBoss(bossUnit.id);
            expect(registeredBoss).toBeDefined();
            expect(registeredBoss?.id).toBe('boss-1');
        });
    });

    describe('Requirement 3.7, 3.8: Damage and Healing Recording', () => {
        beforeEach(() => {
            victorySystem.initialize(mockStageData);
        });

        it('should record damage dealt and taken', () => {
            // Record damage
            victorySystem.recordDamage(50, 10);

            // Verify damage is recorded
            const performance = victorySystem.getStagePerformance();
            expect(performance.damageDealt).toBe(50);
            expect(performance.damageTaken).toBe(10);
        });

        it('should record healing done', () => {
            // Record healing
            victorySystem.recordHealing(30);

            // Verify healing is recorded
            const performance = victorySystem.getStagePerformance();
            expect(performance.healingDone).toBe(30);
        });

        it('should accumulate multiple damage and healing records', () => {
            // Record multiple actions
            victorySystem.recordDamage(50, 10);
            victorySystem.recordDamage(30, 5);
            victorySystem.recordHealing(20);
            victorySystem.recordHealing(15);

            // Verify accumulated values
            const performance = victorySystem.getStagePerformance();
            expect(performance.damageDealt).toBe(80);
            expect(performance.damageTaken).toBe(15);
            expect(performance.healingDone).toBe(35);
        });
    });

    describe('Requirement 4.6: Boss Defeat Processing', () => {
        beforeEach(() => {
            victorySystem.initialize(mockStageData);
            victorySystem.registerBossUnit(bossUnit, bossData);
        });

        it('should handle boss defeat and award rose essence', async () => {
            // Handle boss defeat
            const result = await victorySystem.handleBossDefeat(bossUnit);

            // Verify boss defeat was processed
            expect(result.success).toBe(true);
            expect(result.roseEssenceAwarded).toBe(10);

            // Verify boss is marked as defeated
            const bossSystem = victorySystem.getBossSystem();
            const boss = bossSystem.getBoss(bossUnit.id);
            expect(boss?.defeated).toBe(true);
        });
    });

    describe('Requirement 10.7: Victory/Defeat Detection', () => {
        beforeEach(() => {
            victorySystem.initialize(mockStageData);
        });

        it('should detect victory when all objectives are complete', () => {
            // Manually complete all objectives
            const objectives = victorySystem.getObjectiveManager().getAllObjectives();
            objectives.forEach(obj => {
                victorySystem.updateObjectiveProgress(obj.id, obj.target || 1, obj.target || 1);
            });

            // Check victory conditions
            const result = victorySystem.checkVictoryConditions();
            expect(result.victory).toBe(true);
        });

        it('should not detect victory with incomplete objectives', () => {
            // Don't complete objectives
            
            // Check victory conditions
            const result = victorySystem.checkVictoryConditions();
            expect(result.victory).toBe(false);
        });
    });

    describe('Complete Integration Flow', () => {
        it('should handle complete gameplay flow from start to victory', async () => {
            // 1. Initialize stage
            const initResult = victorySystem.initialize(mockStageData);
            expect(initResult.success).toBe(true);

            // 2. Register boss
            victorySystem.registerBossUnit(bossUnit, bossData);

            // 3. Simulate gameplay - record damage
            victorySystem.recordDamage(100, 20);
            
            // 4. Defeat enemy
            victorySystem.recordEnemyDefeat(enemyUnit.id);

            // 5. Defeat boss
            const bossDefeatResult = await victorySystem.handleBossDefeat(bossUnit);
            expect(bossDefeatResult.success).toBe(true);
            expect(bossDefeatResult.roseEssenceAwarded).toBe(10);

            // 6. Record boss defeat
            victorySystem.recordEnemyDefeat(bossUnit.id);

            // 7. Check victory (objectives should be complete)
            const victoryResult = victorySystem.checkVictoryConditions();
            expect(victoryResult.victory).toBe(true);

            // 8. Verify performance was tracked
            const performance = victorySystem.getStagePerformance();
            expect(performance.damageDealt).toBe(100);
            expect(performance.damageTaken).toBe(20);
            expect(performance.enemiesDefeated).toBe(2);
        });
    });
});

/**
 * Helper function to create mock units
 */
function createMockUnit(
    id: string,
    name: string,
    faction: 'player' | 'enemy',
    position: Position,
    isBoss: boolean = false
): Unit {
    return {
        id,
        name,
        faction,
        position,
        stats: {
            maxHP: 100,
            maxMP: 50,
            attack: 20,
            defense: 15,
            speed: 10,
            movement: 3,
            attackRange: { min: 1, max: 1 }
        },
        currentHP: 100,
        currentMP: 50,
        level: 1,
        experience: 0,
        hasActed: false,
        hasMoved: false,
        statusEffects: [],
        equipment: {
            weapon: null,
            armor: null,
            accessory: null
        },
        skills: [],
        metadata: isBoss ? { isBoss: true } : undefined
    } as Unit;
}
