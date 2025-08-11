/**
 * DifficultyManager integration tests
 * Tests the integration between DifficultyManager and AI system components
 */

import { PlayerLevelInfo, PerformanceStats, difficultyManager } from '../../game/src/systems/ai/DifficultyManager';
import { AISystemManager } from '../../game/src/systems/ai/AISystemManager';
import { ActionEvaluator } from '../../game/src/systems/ActionEvaluator';
import { DifficultyLevel, DifficultySettings, AIContext, AISystemIntegration } from '../../game/src/types/ai';
import { Unit } from '../../game/src/types/gameplay';

// Mock dependencies
const mockScene = {
    add: {
        container: jest.fn().mockReturnValue({
            setVisible: jest.fn(),
            destroy: jest.fn(),
        }),
        graphics: jest.fn().mockReturnValue({
            clear: jest.fn(),
            fillStyle: jest.fn(),
            fillRect: jest.fn(),
        }),
        text: jest.fn().mockReturnValue({
            setOrigin: jest.fn(),
        }),
    },
} as any;

const mockEventEmitter = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
} as any;

const mockConfig = {
    thinkingTimeLimit: 2000,
    enableDebugLogging: false,
    enableVisualFeedback: true,
    randomFactor: 0.2,
    npcPriorityMultiplier: 3.0,
} as any;

const mockGameStateManager = {
    getCurrentPlayer: jest.fn().mockReturnValue('enemy'),
    getGameState: jest.fn().mockReturnValue({
        currentTurn: 1,
        turnOrder: [],
        playerUnits: [],
        enemyUnits: [],
    }),
} as any;

const mockMovementSystem = {
    calculateMovementRange: jest.fn().mockReturnValue([]),
    canMoveTo: jest.fn().mockReturnValue(true),
} as any;

const mockBattleSystem = {
    canAttack: jest.fn().mockReturnValue(true),
    calculateDamage: jest.fn().mockReturnValue(50),
} as any;

const mockSkillSystem = {
    getAvailableSkills: jest.fn().mockReturnValue([]),
    canUseSkill: jest.fn().mockReturnValue(true),
} as any;

const mockRecruitmentSystem = {
    isNPC: jest.fn().mockReturnValue(false),
} as unknown;

describe('DifficultyManager Integration', () => {
    let aiSystemManager: AISystemManager;
    let actionEvaluator: ActionEvaluator;

    beforeEach(() => {
        // Reset the singleton difficulty manager to default state
        difficultyManager.setDifficultyLevel(DifficultyLevel.NORMAL);
        difficultyManager.setAdaptiveDifficulty(false);
        difficultyManager.setPlayerLevelScaling(true);

        aiSystemManager = new AISystemManager(mockScene, mockConfig, mockEventEmitter);

        // Initialize AI system
        aiSystemManager.initialize(
            mockGameStateManager,
            mockMovementSystem,
            mockBattleSystem,
            mockSkillSystem,
            mockRecruitmentSystem
        );

        const integration: AISystemIntegration = {
            movementSystem: mockMovementSystem,
            battleSystem: mockBattleSystem,
            skillSystem: mockSkillSystem,
            recruitmentSystem: mockRecruitmentSystem,
        };

        actionEvaluator = new ActionEvaluator(integration, difficultyManager.getCurrentSettings());
    });

    describe('AISystemManager Integration', () => {
        test('AISystemManager can set difficulty level', () => {
            aiSystemManager.setDifficultyLevel(DifficultyLevel.HARD);
            expect(aiSystemManager.getCurrentDifficultyLevel()).toBe(DifficultyLevel.HARD);
        });

        test('AISystemManager can update difficulty settings in real-time', () => {
            const partialSettings: Partial<DifficultySettings> = {
                thinkingDepth: 4,
                randomnessFactor: 0.15,
            };

            aiSystemManager.updateDifficultySettings(partialSettings);

            const currentSettings = difficultyManager.getCurrentSettings();
            expect(currentSettings.thinkingDepth).toBe(4);
            expect(currentSettings.randomnessFactor).toBe(0.15);
        });

        test('AISystemManager can enable adaptive difficulty', () => {
            aiSystemManager.setAdaptiveDifficulty(true);

            const stats = difficultyManager.getStatistics();
            expect(stats.adaptiveConfig.enabled).toBe(true);
        });

        test('AISystemManager can record performance for adaptive difficulty', () => {
            const performanceStats: PerformanceStats = {
                wins: 5,
                losses: 5,
                averageBattleLength: 12,
                playerDamageRate: 0.4,
                aiSuccessRate: 0.7,
            };

            aiSystemManager.recordPerformance(performanceStats);

            const stats = difficultyManager.getStatistics();
            expect(stats.performanceHistory).toHaveLength(1);
            expect(stats.performanceHistory[0]).toEqual(performanceStats);
        });
    });

    describe('ActionEvaluator Integration', () => {
        test('ActionEvaluator can update difficulty settings', () => {
            const newSettings: DifficultySettings = {
                thinkingDepth: 4,
                randomnessFactor: 0.1,
                mistakeProbability: 0.05,
                reactionTime: 500,
                skillUsageFrequency: 0.8,
                thinkingTimeLimit: 2000,
            };

            actionEvaluator.updateDifficultySettings(newSettings);

            const currentSettings = actionEvaluator.getDifficultySettings();
            expect(currentSettings).toEqual(newSettings);
        });
    });

    describe('Player Level Scaling Integration', () => {
        test('Difficulty scaling can be disabled', () => {
            difficultyManager.setPlayerLevelScaling(false);

            const playerLevelInfo: PlayerLevelInfo = {
                averageLevel: 50,
                maxLevel: 60,
                minLevel: 40,
                partySize: 6,
            };

            const baseSettings = difficultyManager.getCurrentSettings();
            const adjustedSettings = difficultyManager.adjustForPlayerLevel(playerLevelInfo);

            expect(adjustedSettings).toEqual(baseSettings);
        });
    });

    describe('Adaptive Difficulty Integration', () => {
        test('Adaptive difficulty adjusts based on performance history', () => {
            difficultyManager.setAdaptiveDifficulty(true);

            // Record poor performance (player losing frequently)
            for (let i = 0; i < 10; i++) {
                difficultyManager.recordPerformance({
                    wins: 1,
                    losses: 9,
                    averageBattleLength: 25,
                    playerDamageRate: 0.8,
                    aiSuccessRate: 0.9,
                });
            }

            const adjustedSettings = difficultyManager.getCurrentSettings();

            // Difficulty should have decreased (more randomness, higher mistake probability)
            expect(adjustedSettings.randomnessFactor).toBeGreaterThan(0.2);
        });

        test('Performance statistics are properly tracked', () => {
            const performanceStats: PerformanceStats = {
                wins: 3,
                losses: 7,
                averageBattleLength: 18,
                playerDamageRate: 0.6,
                aiSuccessRate: 0.8,
            };

            difficultyManager.recordPerformance(performanceStats);

            const statistics = difficultyManager.getStatistics();
            expect(statistics.performanceHistory).toContain(performanceStats);
        });
    });

    describe('Real-time Adjustment Integration', () => {
        test('Settings can be adjusted during gameplay', () => {
            const originalSettings = difficultyManager.getCurrentSettings();

            // Simulate mid-game difficulty adjustment
            difficultyManager.updateSettings({
                thinkingDepth: originalSettings.thinkingDepth + 1,
                randomnessFactor: originalSettings.randomnessFactor * 0.5,
            });

            const newSettings = difficultyManager.getCurrentSettings();
            expect(newSettings.thinkingDepth).toBe(originalSettings.thinkingDepth + 1);
            expect(newSettings.randomnessFactor).toBe(originalSettings.randomnessFactor * 0.5);
        });

        test('Invalid real-time adjustments are rejected', () => {
            const originalSettings = difficultyManager.getCurrentSettings();

            // Try to set invalid values
            difficultyManager.updateSettings({
                thinkingDepth: 10, // Invalid: max is 5
                randomnessFactor: 2.0, // Invalid: max is 1.0
                mistakeProbability: -0.5, // Invalid: min is 0
            });

            const newSettings = difficultyManager.getCurrentSettings();
            expect(newSettings).toEqual(originalSettings);
        });
    });
});