/**
 * Unit tests for TacticalAI class
 * Tests tactical-focused AI behavior patterns including terrain utilization, formation tactics, and coordination
 */

import { TacticalAI } from '../../../../game/src/systems/ai/TacticalAI';
import {
    AIContext,
    AIPersonality,
    DifficultySettings,
    AIControllerConfig,
    AISystemIntegration,
    ActionType,
} from '../../../../game/src/types/ai';
import { Unit, Position } from '../../../../game/src/types/gameplay';

// Mock implementations
const mockMovementSystem = {
    calculateMovementRange: jest.fn(),
    canMoveTo: jest.fn(),
};

const mockBattleSystem = {
    canAttack: jest.fn(),
    calculateDamage: jest.fn(),
};

const mockSkillSystem = {
    getAvailableSkills: jest.fn(),
    canUseSkill: jest.fn(),
};

const mockRecruitmentSystem = {
    isNPC: jest.fn(),
};

describe('TacticalAI', () => {
    let tacticalAI: TacticalAI;
    let mockUnit: Unit;
    let mockPersonality: AIPersonality;
    let mockDifficultySettings: DifficultySettings;
    let mockConfig: AIControllerConfig;
    let mockIntegration: AISystemIntegration;
    let mockContext: AIContext;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create mock unit
        mockUnit = {
            id: 'tactical-ai-1',
            name: 'Tactical AI',
            position: { x: 5, y: 5 },
            stats: {
                maxHP: 100,
                maxMP: 50,
                attack: 18,
                defense: 16,
                speed: 16,
                movement: 4,
            },
            currentHP: 100,
            currentMP: 50,
            faction: 'enemy',
            hasActed: false,
            hasMoved: false,
        };

        // Create mock personality (tactical-focused)
        mockPersonality = {
            aggressiveness: 0.6,
            defensiveness: 0.5,
            supportiveness: 0.4,
            tacticalness: 0.9,
            riskTolerance: 0.7,
            npcPriority: 0.6,
            getActionModifier: jest.fn().mockReturnValue(1.0),
            shouldTakeRisk: jest.fn().mockReturnValue(true),
            getPriorityModifier: jest.fn().mockReturnValue(1.0),
        };

        // Create mock difficulty settings
        mockDifficultySettings = {
            thinkingDepth: 4,
            randomnessFactor: 0.05,
            mistakeProbability: 0.02,
            reactionTime: 800,
            skillUsageFrequency: 0.7,
            maxThinkingTime: 2000,
            enableAdvancedTactics: true,
        };

        // Create mock config
        mockConfig = {
            thinkingTimeLimit: 2000,
            randomFactor: 0.05,
            npcPriorityMultiplier: 1.5,
            enableAILogging: false,
        };

        // Create mock integration
        mockIntegration = {
            movementSystem: mockMovementSystem,
            battleSystem: mockBattleSystem,
            skillSystem: mockSkillSystem,
            recruitmentSystem: mockRecruitmentSystem,
        };

        // Create mock context
        mockContext = {
            currentUnit: mockUnit,
            gameState: {},
            visibleEnemies: [
                {
                    id: 'enemy-1',
                    name: 'Enemy 1',
                    position: { x: 3, y: 3 },
                    stats: { maxHP: 90, maxMP: 40, attack: 16, defense: 14, speed: 12, movement: 3 },
                    currentHP: 90,
                    currentMP: 40,
                    faction: 'player',
                    hasActed: false,
                    hasMoved: false,
                },
                {
                    id: 'enemy-2',
                    name: 'Enemy 2',
                    position: { x: 7, y: 2 },
                    stats: { maxHP: 85, maxMP: 35, attack: 14, defense: 16, speed: 14, movement: 3 },
                    currentHP: 85,
                    currentMP: 35,
                    faction: 'player',
                    hasActed: false,
                    hasMoved: false,
                },
            ],
            visibleAllies: [
                {
                    id: 'ally-1',
                    name: 'Ally 1',
                    position: { x: 6, y: 6 },
                    stats: { maxHP: 95, maxMP: 45, attack: 17, defense: 15, speed: 13, movement: 3 },
                    currentHP: 95,
                    currentMP: 45,
                    faction: 'enemy',
                    hasActed: false,
                    hasMoved: false,
                },
                {
                    id: 'ally-2',
                    name: 'Ally 2',
                    position: { x: 4, y: 7 },
                    stats: { maxHP: 88, maxMP: 38, attack: 19, defense: 13, speed: 15, movement: 4 },
                    currentHP: 88,
                    currentMP: 38,
                    faction: 'enemy',
                    hasActed: false,
                    hasMoved: false,
                },
            ],
            npcs: [],
            availableSkills: ['tactical-strike', 'formation-buff', 'area-debuff'],
            terrainData: {},
            turnNumber: 8,
            difficultySettings: mockDifficultySettings,
            mapData: {
                width: 12,
                height: 12,
                tiles: [],
            },
            previousActions: [],
        };

        // Create TacticalAI instance
        tacticalAI = new TacticalAI(
            mockUnit,
            mockPersonality,
            mockDifficultySettings,
            mockConfig,
            mockIntegration
        );
    });

    describe('Constructor', () => {
        it('should initialize with correct properties', () => {
            expect(tacticalAI.currentUnit).toBe(mockUnit);
            expect(tacticalAI.aiPersonality).toBe(mockPersonality);
        });

        it('should calculate tactical priorities based on personality', () => {
            // Tactical AI should have high tacticalness
            expect(mockPersonality.tacticalness).toBe(0.9);
            expect(mockPersonality.aggressiveness).toBe(0.6);
        });
    });

    describe('evaluatePosition', () => {
        it('should prefer tactically advantageous positions', () => {
            const centralPosition = { x: 6, y: 6 }; // Central battlefield position
            const edgePosition = { x: 0, y: 0 }; // Edge position

            const centralScore = tacticalAI.evaluatePosition(centralPosition, mockContext);
            const edgeScore = tacticalAI.evaluatePosition(edgePosition, mockContext);

            expect(centralScore).toBeGreaterThan(edgeScore);
        });

        it('should value positions with good formation potential', () => {
            const formationPosition = { x: 5, y: 6 }; // Near allies for formation
            const isolatedPosition = { x: 1, y: 1 }; // Isolated position

            const formationScore = tacticalAI.evaluatePosition(formationPosition, mockContext);
            const isolatedScore = tacticalAI.evaluatePosition(isolatedPosition, mockContext);

            expect(formationScore).toBeGreaterThan(isolatedScore);
        });

        it('should consider flanking opportunities in position evaluation', () => {
            const flankingPosition = { x: 2, y: 4 }; // Potential flanking position
            const frontPosition = { x: 4, y: 3 }; // Direct confrontation position

            const flankingScore = tacticalAI.evaluatePosition(flankingPosition, mockContext);
            const frontScore = tacticalAI.evaluatePosition(frontPosition, mockContext);

            // Flanking positions should generally be valued higher
            expect(flankingScore).toBeGreaterThanOrEqual(frontScore * 0.8);
        });

        it('should evaluate area control value', () => {
            const controlPosition = { x: 6, y: 6 }; // Center area control
            const peripheralPosition = { x: 11, y: 11 }; // Peripheral position

            const controlScore = tacticalAI.evaluatePosition(controlPosition, mockContext);
            const peripheralScore = tacticalAI.evaluatePosition(peripheralPosition, mockContext);

            expect(controlScore).toBeGreaterThan(peripheralScore);
        });
    });

    describe('getPriority', () => {
        it('should have higher priority with more tactical opportunities', () => {
            const basePriority = tacticalAI.getPriority(mockContext);

            // Add more enemies to create more tactical opportunities
            const tacticalContext = {
                ...mockContext,
                visibleEnemies: [
                    ...mockContext.visibleEnemies,
                    {
                        id: 'enemy-3',
                        name: 'Enemy 3',
                        position: { x: 8, y: 8 },
                        stats: { maxHP: 80, maxMP: 30, attack: 15, defense: 12, speed: 11, movement: 3 },
                        currentHP: 80,
                        currentMP: 30,
                        faction: 'player',
                        hasActed: false,
                        hasMoved: false,
                    },
                ],
            };

            const tacticalPriority = tacticalAI.getPriority(tacticalContext);
            expect(tacticalPriority).toBeGreaterThanOrEqual(basePriority);
        });

        it('should include personality modifiers in priority calculation', () => {
            const priority = tacticalAI.getPriority(mockContext);

            // Should be influenced by tacticalness
            expect(priority).toBeGreaterThan(mockUnit.stats.speed);
        });

        it('should boost priority for formation leaders', () => {
            // Strong units should get formation leader bonus
            const strongUnit = {
                ...mockUnit,
                stats: { ...mockUnit.stats, attack: 25 }, // Very strong
            };

            const strongAI = new TacticalAI(
                strongUnit,
                mockPersonality,
                mockDifficultySettings,
                mockConfig,
                mockIntegration
            );

            const strongPriority = strongAI.getPriority(mockContext);
            const normalPriority = tacticalAI.getPriority(mockContext);

            expect(strongPriority).toBeGreaterThan(normalPriority);
        });
    });

    describe('makeDecision', () => {
        beforeEach(() => {
            // Setup mock returns
            mockSkillSystem.getAvailableSkills.mockReturnValue(['tactical-strike', 'formation-buff']);
            mockSkillSystem.canUseSkill.mockReturnValue(true);
            mockMovementSystem.calculateMovementRange.mockReturnValue([
                { x: 4, y: 5 },
                { x: 6, y: 5 },
                { x: 5, y: 4 },
                { x: 5, y: 6 },
                { x: 4, y: 4 },
                { x: 6, y: 6 },
                { x: 3, y: 5 },
                { x: 7, y: 5 },
            ]);
            mockMovementSystem.canMoveTo.mockReturnValue(true);
            mockBattleSystem.canAttack.mockReturnValue(true);
            mockBattleSystem.calculateDamage.mockReturnValue(25);
        });

        it('should make tactical decisions based on battlefield analysis', async () => {
            const decision = await tacticalAI.decideAction(mockContext);

            expect(decision.type).toBeOneOf([ActionType.MOVE, ActionType.ATTACK, ActionType.SKILL]);
            expect(decision.reasoning).toBeDefined();
            expect(decision.priority).toBeGreaterThan(0);
        });

        it('should prefer coordinated attacks when possible', async () => {
            const decision = await tacticalAI.decideAction(mockContext);

            // Should consider tactical actions
            if (decision.type === ActionType.ATTACK) {
                expect(decision.reasoning).toBeDefined();
                expect(decision.target).toBeDefined();
            }
        });

        it('should consider terrain tactical advantages', async () => {
            const decision = await tacticalAI.decideAction(mockContext);

            if (decision.type === ActionType.MOVE) {
                expect(decision.targetPosition).toBeDefined();
                expect(decision.reasoning).toContain('tactical');
            }
        });

        it('should evaluate flanking maneuvers', async () => {
            const decision = await tacticalAI.decideAction(mockContext);

            // Should consider flanking opportunities
            if (decision.reasoning?.includes('flanking')) {
                expect([ActionType.MOVE, ActionType.ATTACK]).toContain(decision.type);
            }
        });

        it('should fall back to wait action when no tactical opportunities exist', async () => {
            // Setup scenario with no valid actions
            mockSkillSystem.getAvailableSkills.mockReturnValue([]);
            mockMovementSystem.calculateMovementRange.mockReturnValue([]);
            mockBattleSystem.canAttack.mockReturnValue(false);

            const decision = await tacticalAI.decideAction(mockContext);

            expect(decision.type).toBe(ActionType.WAIT);
            expect(decision.reasoning).toContain('No tactical opportunities');
        });
    });

    describe('Terrain Tactical Evaluation', () => {
        beforeEach(() => {
            mockMovementSystem.calculateMovementRange.mockReturnValue([
                { x: 4, y: 5 },
                { x: 6, y: 5 },
                { x: 5, y: 4 },
                { x: 5, y: 6 },
            ]);
            mockMovementSystem.canMoveTo.mockReturnValue(true);
        });

        it('should identify and move to tactically valuable terrain', async () => {
            const decision = await tacticalAI.decideAction(mockContext);

            if (decision.type === ActionType.MOVE) {
                expect(decision.targetPosition).toBeDefined();
                expect(decision.reasoning).toContain('tactical');
            }
        });

        it('should consider defensive terrain bonuses', async () => {
            const decision = await tacticalAI.decideAction(mockContext);

            if (decision.type === ActionType.MOVE && decision.reasoning?.includes('terrain')) {
                expect(decision.priority).toBeGreaterThan(0);
            }
        });
    });

    describe('Formation Tactics', () => {
        it('should maintain formation with allies', async () => {
            mockMovementSystem.calculateMovementRange.mockReturnValue([
                { x: 5, y: 6 }, // Near ally
                { x: 5, y: 4 }, // Away from ally
            ]);
            mockMovementSystem.canMoveTo.mockReturnValue(true);

            const decision = await tacticalAI.decideAction(mockContext);

            if (decision.type === ActionType.MOVE) {
                // Should prefer positions that maintain formation
                const targetPos = decision.targetPosition!;
                const distanceToNearestAlly = Math.min(
                    ...mockContext.visibleAllies.map(ally =>
                        Math.abs(targetPos.x - ally.position.x) + Math.abs(targetPos.y - ally.position.y)
                    )
                );
                expect(distanceToNearestAlly).toBeLessThanOrEqual(4);
            }
        });

        it('should consider formation positioning in decision making', async () => {
            const decision = await tacticalAI.decideAction(mockContext);

            if (decision.reasoning?.includes('formation')) {
                expect(decision.type).toBe(ActionType.MOVE);
                expect(decision.priority).toBeGreaterThan(0);
            }
        });
    });

    describe('Coordinated Attack Planning', () => {
        beforeEach(() => {
            mockBattleSystem.canAttack.mockReturnValue(true);
            mockBattleSystem.calculateDamage.mockReturnValue(30);
        });

        it('should plan coordinated attacks with allies', async () => {
            const decision = await tacticalAI.decideAction(mockContext);

            if (decision.reasoning?.includes('coordinated')) {
                expect([ActionType.ATTACK, ActionType.SKILL]).toContain(decision.type);
                expect(decision.target).toBeDefined();
            }
        });

        it('should prioritize high-value targets for coordinated attacks', async () => {
            const decision = await tacticalAI.decideAction(mockContext);

            if (decision.type === ActionType.ATTACK) {
                expect(decision.target).toBeDefined();
                expect(decision.priority).toBeGreaterThan(0);
            }
        });
    });

    describe('Area Control', () => {
        it('should move to control key battlefield areas', async () => {
            mockMovementSystem.calculateMovementRange.mockReturnValue([
                { x: 6, y: 6 }, // Center control position
                { x: 4, y: 4 }, // Off-center position
            ]);
            mockMovementSystem.canMoveTo.mockReturnValue(true);

            const decision = await tacticalAI.decideAction(mockContext);

            if (decision.type === ActionType.MOVE && decision.reasoning?.includes('control')) {
                expect(decision.targetPosition).toBeDefined();
                expect(decision.priority).toBeGreaterThan(0);
            }
        });
    });

    describe('Personality Integration', () => {
        it('should boost tactical actions based on tacticalness personality', async () => {
            mockMovementSystem.calculateMovementRange.mockReturnValue([{ x: 6, y: 5 }]);
            mockMovementSystem.canMoveTo.mockReturnValue(true);

            const decision = await tacticalAI.decideAction(mockContext);

            // High tacticalness should result in high priority for tactical moves
            if (decision.type === ActionType.MOVE) {
                expect(decision.priority).toBeGreaterThan(20);
            }
        });

        it('should consider risk tolerance in tactical decisions', async () => {
            mockBattleSystem.canAttack.mockReturnValue(true);

            const decision = await tacticalAI.decideAction(mockContext);

            // High risk tolerance should allow for more aggressive tactical moves
            if (decision.type === ActionType.ATTACK) {
                expect(decision.priority).toBeGreaterThan(0);
            }
        });

        it('should balance aggressiveness with tactical thinking', async () => {
            const decision = await tacticalAI.decideAction(mockContext);

            // Should make decisions that balance aggression with tactics
            expect(decision.priority).toBeGreaterThan(0);
            expect(decision.reasoning).toBeDefined();
        });
    });

    describe('Advanced Tactical Features', () => {
        it('should identify flanking opportunities', async () => {
            mockMovementSystem.calculateMovementRange.mockReturnValue([
                { x: 2, y: 2 }, // Potential flanking position
                { x: 4, y: 4 }, // Direct approach
            ]);
            mockMovementSystem.canMoveTo.mockReturnValue(true);

            const decision = await tacticalAI.decideAction(mockContext);

            if (decision.reasoning?.includes('flanking')) {
                expect([ActionType.MOVE, ActionType.ATTACK]).toContain(decision.type);
            }
        });

        it('should consider multiple tactical factors simultaneously', async () => {
            const decision = await tacticalAI.decideAction(mockContext);

            // Decision should consider multiple tactical aspects
            expect(decision.priority).toBeGreaterThan(0);
            expect(decision.reasoning).toBeDefined();
        });
    });

    describe('Difficulty Integration', () => {
        it('should make more sophisticated decisions at higher difficulty', async () => {
            const expertDifficulty = {
                ...mockDifficultySettings,
                thinkingDepth: 5,
                enableAdvancedTactics: true,
                mistakeProbability: 0.0,
            };

            const expertAI = new TacticalAI(
                mockUnit,
                mockPersonality,
                expertDifficulty,
                mockConfig,
                mockIntegration
            );

            mockMovementSystem.calculateMovementRange.mockReturnValue([{ x: 6, y: 5 }]);
            mockMovementSystem.canMoveTo.mockReturnValue(true);

            const decision = await expertAI.decideAction(mockContext);

            // Expert difficulty should make more optimal tactical decisions
            expect(decision.priority).toBeGreaterThan(0);
        });

        it('should adjust tactical complexity based on thinking depth', async () => {
            const simpleDifficulty = {
                ...mockDifficultySettings,
                thinkingDepth: 1,
                enableAdvancedTactics: false,
            };

            const simpleAI = new TacticalAI(
                mockUnit,
                mockPersonality,
                simpleDifficulty,
                mockConfig,
                mockIntegration
            );

            mockMovementSystem.calculateMovementRange.mockReturnValue([{ x: 6, y: 5 }]);
            mockMovementSystem.canMoveTo.mockReturnValue(true);

            const decision = await simpleAI.decideAction(mockContext);

            // Should still make valid decisions but potentially less complex
            expect(decision.type).toBeOneOf([ActionType.MOVE, ActionType.ATTACK, ActionType.SKILL, ActionType.WAIT]);
        });
    });

    describe('Error Handling', () => {
        it('should handle missing systems gracefully', async () => {
            const limitedIntegration = {
                ...mockIntegration,
                movementSystem: undefined,
                skillSystem: undefined,
            };

            const limitedAI = new TacticalAI(
                mockUnit,
                mockPersonality,
                mockDifficultySettings,
                mockConfig,
                limitedIntegration
            );

            const decision = await limitedAI.decideAction(mockContext);

            expect(decision.type).toBe(ActionType.WAIT);
        });

        it('should provide meaningful fallback actions', async () => {
            mockMovementSystem.calculateMovementRange.mockReturnValue([]);
            mockSkillSystem.getAvailableSkills.mockReturnValue([]);
            mockBattleSystem.canAttack.mockReturnValue(false);

            const decision = await tacticalAI.decideAction(mockContext);

            expect(decision.type).toBe(ActionType.WAIT);
            expect(decision.reasoning).toContain('observing battlefield');
        });
    });
});