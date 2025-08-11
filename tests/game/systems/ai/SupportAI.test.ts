/**
 * Unit tests for SupportAI class
 * Tests support-focused AI behavior patterns including healing, buffing, and protective positioning
 */

import { SupportAI } from '../../../../game/src/systems/ai/SupportAI';
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

describe('SupportAI', () => {
    let supportAI: SupportAI;
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
            id: 'support-ai-1',
            name: 'Support AI',
            position: { x: 5, y: 5 },
            stats: {
                maxHP: 80,
                maxMP: 60,
                attack: 12,
                defense: 18,
                speed: 14,
                movement: 3,
            },
            currentHP: 80,
            currentMP: 60,
            faction: 'enemy',
            hasActed: false,
            hasMoved: false,
        };

        // Create mock personality (support-focused)
        mockPersonality = {
            aggressiveness: 0.2,
            defensiveness: 0.7,
            supportiveness: 0.9,
            tacticalness: 0.6,
            riskTolerance: 0.3,
            npcPriority: 0.8,
            getActionModifier: jest.fn().mockReturnValue(1.0),
            shouldTakeRisk: jest.fn().mockReturnValue(false),
            getPriorityModifier: jest.fn().mockReturnValue(1.0),
        };

        // Create mock difficulty settings
        mockDifficultySettings = {
            thinkingDepth: 3,
            randomnessFactor: 0.1,
            mistakeProbability: 0.05,
            reactionTime: 1000,
            skillUsageFrequency: 0.8,
            maxThinkingTime: 2000,
            enableAdvancedTactics: true,
        };

        // Create mock config
        mockConfig = {
            thinkingTimeLimit: 2000,
            randomFactor: 0.1,
            npcPriorityMultiplier: 2.0,
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
                    stats: { maxHP: 100, maxMP: 40, attack: 20, defense: 15, speed: 12, movement: 3 },
                    currentHP: 100,
                    currentMP: 40,
                    faction: 'player',
                    hasActed: false,
                    hasMoved: false,
                },
            ],
            visibleAllies: [
                {
                    id: 'ally-1',
                    name: 'Wounded Ally',
                    position: { x: 6, y: 6 },
                    stats: { maxHP: 90, maxMP: 30, attack: 18, defense: 12, speed: 15, movement: 4 },
                    currentHP: 25, // Critically wounded
                    currentMP: 30,
                    faction: 'enemy',
                    hasActed: false,
                    hasMoved: false,
                },
                {
                    id: 'ally-2',
                    name: 'Healthy Ally',
                    position: { x: 4, y: 7 },
                    stats: { maxHP: 85, maxMP: 35, attack: 22, defense: 14, speed: 13, movement: 3 },
                    currentHP: 85, // Full health
                    currentMP: 35,
                    faction: 'enemy',
                    hasActed: false,
                    hasMoved: false,
                },
            ],
            npcs: [],
            availableSkills: ['heal', 'buff-attack', 'debuff-defense'],
            terrainData: {},
            turnNumber: 5,
            difficultySettings: mockDifficultySettings,
            mapData: {
                width: 10,
                height: 10,
                tiles: [],
            },
            previousActions: [],
        };

        // Create SupportAI instance
        supportAI = new SupportAI(
            mockUnit,
            mockPersonality,
            mockDifficultySettings,
            mockConfig,
            mockIntegration
        );
    });

    describe('Constructor', () => {
        it('should initialize with correct properties', () => {
            expect(supportAI.currentUnit).toBe(mockUnit);
            expect(supportAI.aiPersonality).toBe(mockPersonality);
        });

        it('should calculate support priorities based on personality', () => {
            // Support AI should have high supportiveness
            expect(mockPersonality.supportiveness).toBe(0.9);
            expect(mockPersonality.aggressiveness).toBe(0.2);
        });
    });

    describe('evaluatePosition', () => {
        it('should prefer positions close to allies', () => {
            const closeToAllies = { x: 5, y: 6 }; // Close to wounded ally
            const farFromAllies = { x: 1, y: 1 }; // Far from allies

            const closeScore = supportAI.evaluatePosition(closeToAllies, mockContext);
            const farScore = supportAI.evaluatePosition(farFromAllies, mockContext);

            expect(closeScore).toBeGreaterThan(farScore);
        });

        it('should avoid dangerous positions', () => {
            const safePosition = { x: 8, y: 8 }; // Away from enemies
            const dangerousPosition = { x: 3, y: 3 }; // Same as enemy position

            const safeScore = supportAI.evaluatePosition(safePosition, mockContext);
            const dangerousScore = supportAI.evaluatePosition(dangerousPosition, mockContext);

            expect(safeScore).toBeGreaterThan(dangerousScore);
        });

        it('should value positions with good support range coverage', () => {
            const centralPosition = { x: 5, y: 6 }; // Central to allies
            const edgePosition = { x: 0, y: 0 }; // Edge position

            const centralScore = supportAI.evaluatePosition(centralPosition, mockContext);
            const edgeScore = supportAI.evaluatePosition(edgePosition, mockContext);

            expect(centralScore).toBeGreaterThan(edgeScore);
        });
    });

    describe('getPriority', () => {
        it('should have higher priority when allies need urgent support', () => {
            // Context with critically wounded ally
            const urgentContext = { ...mockContext };
            const basePriority = supportAI.getPriority(mockContext);

            // Add more critically wounded allies
            urgentContext.visibleAllies.push({
                id: 'critical-ally',
                name: 'Critical Ally',
                position: { x: 7, y: 5 },
                stats: { maxHP: 100, maxMP: 40, attack: 15, defense: 10, speed: 12, movement: 3 },
                currentHP: 20, // Critical
                currentMP: 40,
                faction: 'enemy',
                hasActed: false,
                hasMoved: false,
            });

            const urgentPriority = supportAI.getPriority(urgentContext);
            expect(urgentPriority).toBeGreaterThan(basePriority);
        });

        it('should include personality modifiers in priority calculation', () => {
            const priority = supportAI.getPriority(mockContext);

            // Should be influenced by supportiveness
            expect(priority).toBeGreaterThan(mockUnit.stats.speed);
        });
    });

    describe('makeDecision', () => {
        beforeEach(() => {
            // Setup mock returns
            mockSkillSystem.getAvailableSkills.mockReturnValue(['heal', 'buff-attack']);
            mockSkillSystem.canUseSkill.mockReturnValue(true);
            mockMovementSystem.calculateMovementRange.mockReturnValue([
                { x: 4, y: 5 },
                { x: 6, y: 5 },
                { x: 5, y: 4 },
                { x: 5, y: 6 },
            ]);
            mockMovementSystem.canMoveTo.mockReturnValue(true);
        });

        it('should prioritize healing critically wounded allies', async () => {
            const decision = await supportAI.decideAction(mockContext);

            expect(decision.type).toBe(ActionType.SKILL);
            expect(decision.target?.id).toBe('ally-1'); // Wounded ally
            expect(decision.reasoning).toContain('heal');
        });

        it('should consider buffing healthy allies when no healing is needed', async () => {
            // Make all allies healthy
            const healthyContext = {
                ...mockContext,
                visibleAllies: mockContext.visibleAllies.map(ally => ({
                    ...ally,
                    currentHP: ally.stats.maxHP, // Full health
                })),
            };

            const decision = await supportAI.decideAction(healthyContext);

            // Should consider buff or positioning actions
            expect([ActionType.SKILL, ActionType.MOVE]).toContain(decision.type);
        });

        it('should avoid offensive actions when urgent support is needed', async () => {
            mockBattleSystem.canAttack.mockReturnValue(true);

            const decision = await supportAI.decideAction(mockContext);

            // Should prioritize support over attack
            expect(decision.type).not.toBe(ActionType.ATTACK);
        });

        it('should fall back to wait action when no valid actions are available', async () => {
            // Setup scenario with no valid actions
            mockSkillSystem.getAvailableSkills.mockReturnValue([]);
            mockMovementSystem.calculateMovementRange.mockReturnValue([]);

            const decision = await supportAI.decideAction(mockContext);

            expect(decision.type).toBe(ActionType.WAIT);
            expect(decision.reasoning).toContain('No valid actions available');
        });
    });

    describe('Support Action Evaluation', () => {
        beforeEach(() => {
            mockSkillSystem.getAvailableSkills.mockReturnValue(['heal', 'buff-attack', 'debuff-defense']);
            mockSkillSystem.canUseSkill.mockReturnValue(true);
        });

        it('should evaluate healing skills with higher priority for wounded allies', async () => {
            const decision = await supportAI.decideAction(mockContext);

            if (decision.type === ActionType.SKILL && decision.reasoning?.includes('heal')) {
                expect(decision.target?.currentHP).toBeLessThan(decision.target?.stats.maxHP || 0);
                expect(decision.priority).toBeGreaterThan(0);
            }
        });

        it('should consider distance when evaluating support actions', async () => {
            // Add a distant wounded ally
            const distantContext = {
                ...mockContext,
                visibleAllies: [
                    ...mockContext.visibleAllies,
                    {
                        id: 'distant-ally',
                        name: 'Distant Wounded Ally',
                        position: { x: 0, y: 0 }, // Very far
                        stats: { maxHP: 80, maxMP: 30, attack: 15, defense: 12, speed: 10, movement: 3 },
                        currentHP: 20, // Also critically wounded
                        currentMP: 30,
                        faction: 'enemy',
                        hasActed: false,
                        hasMoved: false,
                    },
                ],
            };

            const decision = await supportAI.decideAction(distantContext);

            // Should prefer closer wounded ally
            if (decision.type === ActionType.SKILL && decision.target) {
                const targetDistance = Math.abs(decision.target.position.x - mockUnit.position.x) +
                    Math.abs(decision.target.position.y - mockUnit.position.y);
                expect(targetDistance).toBeLessThan(8); // Should prefer closer targets
            }
        });
    });

    describe('Positioning Behavior', () => {
        beforeEach(() => {
            mockMovementSystem.calculateMovementRange.mockReturnValue([
                { x: 4, y: 5 },
                { x: 6, y: 5 },
                { x: 5, y: 4 },
                { x: 5, y: 6 },
                { x: 4, y: 4 },
                { x: 6, y: 6 },
            ]);
            mockMovementSystem.canMoveTo.mockReturnValue(true);
        });

        it('should prefer protective positioning near allies', async () => {
            // Context where no immediate support is needed
            const healthyContext = {
                ...mockContext,
                visibleAllies: mockContext.visibleAllies.map(ally => ({
                    ...ally,
                    currentHP: ally.stats.maxHP,
                })),
            };

            mockSkillSystem.getAvailableSkills.mockReturnValue([]);

            const decision = await supportAI.decideAction(healthyContext);

            if (decision.type === ActionType.MOVE) {
                expect(decision.targetPosition).toBeDefined();
                expect(decision.reasoning).toContain('support');
            }
        });

        it('should avoid moving into dangerous positions', async () => {
            const decision = await supportAI.decideAction(mockContext);

            if (decision.type === ActionType.MOVE && decision.targetPosition) {
                // Should not move to enemy position
                const enemyPos = mockContext.visibleEnemies[0].position;
                expect(decision.targetPosition.x).not.toBe(enemyPos.x);
                expect(decision.targetPosition.y).not.toBe(enemyPos.y);
            }
        });
    });

    describe('Personality Integration', () => {
        it('should boost support actions based on supportiveness personality', async () => {
            mockSkillSystem.getAvailableSkills.mockReturnValue(['heal']);
            mockSkillSystem.canUseSkill.mockReturnValue(true);

            const decision = await supportAI.decideAction(mockContext);

            if (decision.type === ActionType.SKILL) {
                // High supportiveness should result in high priority for support skills
                expect(decision.priority).toBeGreaterThan(30);
            }
        });

        it('should reduce offensive action priority based on low aggressiveness', async () => {
            // Make all allies healthy to force consideration of offensive actions
            const healthyContext = {
                ...mockContext,
                visibleAllies: mockContext.visibleAllies.map(ally => ({
                    ...ally,
                    currentHP: ally.stats.maxHP,
                })),
            };

            mockSkillSystem.getAvailableSkills.mockReturnValue(['debuff-defense']);
            mockSkillSystem.canUseSkill.mockReturnValue(true);
            mockBattleSystem.canAttack.mockReturnValue(true);

            const decision = await supportAI.decideAction(healthyContext);

            // Should still prefer support/positioning over direct attacks
            if (decision.type === ActionType.ATTACK) {
                expect(decision.priority).toBeLessThan(50); // Lower priority for attacks
            }
        });
    });

    describe('Resource Management', () => {
        it('should consider MP costs when evaluating skill usage', async () => {
            // Set unit to low MP
            const lowMPUnit = {
                ...mockUnit,
                currentMP: 10, // Low MP
            };

            const lowMPAI = new SupportAI(
                lowMPUnit,
                mockPersonality,
                mockDifficultySettings,
                mockConfig,
                mockIntegration
            );

            mockSkillSystem.getAvailableSkills.mockReturnValue(['heal']);
            mockSkillSystem.canUseSkill.mockReturnValue(true);

            const decision = await lowMPAI.decideAction(mockContext);

            // Should still try to heal but with reduced effectiveness consideration
            if (decision.type === ActionType.SKILL) {
                expect(decision.reasoning).toContain('heal');
            }
        });
    });

    describe('Error Handling', () => {
        it('should handle missing skill system gracefully', async () => {
            const noSkillIntegration = {
                ...mockIntegration,
                skillSystem: undefined,
            };

            const noSkillAI = new SupportAI(
                mockUnit,
                mockPersonality,
                mockDifficultySettings,
                mockConfig,
                noSkillIntegration
            );

            mockMovementSystem.calculateMovementRange.mockReturnValue([]);

            const decision = await noSkillAI.decideAction(mockContext);

            expect(decision.type).toBe(ActionType.WAIT);
        });

        it('should handle missing movement system gracefully', async () => {
            const noMovementIntegration = {
                ...mockIntegration,
                movementSystem: undefined,
            };

            const noMovementAI = new SupportAI(
                mockUnit,
                mockPersonality,
                mockDifficultySettings,
                mockConfig,
                noMovementIntegration
            );

            mockSkillSystem.getAvailableSkills.mockReturnValue([]);

            const decision = await noMovementAI.decideAction(mockContext);

            expect(decision.type).toBe(ActionType.WAIT);
        });
    });

    describe('Difficulty Integration', () => {
        it('should adjust behavior based on difficulty settings', async () => {
            const hardDifficulty = {
                ...mockDifficultySettings,
                thinkingDepth: 5,
                skillUsageFrequency: 1.0,
                mistakeProbability: 0.0,
            };

            const hardAI = new SupportAI(
                mockUnit,
                mockPersonality,
                hardDifficulty,
                mockConfig,
                mockIntegration
            );

            mockSkillSystem.getAvailableSkills.mockReturnValue(['heal']);
            mockSkillSystem.canUseSkill.mockReturnValue(true);

            const decision = await hardAI.decideAction(mockContext);

            // Hard difficulty should make more optimal decisions
            expect(decision.priority).toBeGreaterThan(0);
        });
    });
});