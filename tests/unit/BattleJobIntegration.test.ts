/**
 * 職業システムと戦闘システムの統合機能の単体テスト
 */

// Mock Phaser before importing
global.Phaser = {
    Events: {
        EventEmitter: class MockEventEmitter {
            private events: { [key: string]: Function[] } = {};

            on(event: string, callback: Function) {
                if (!this.events[event]) this.events[event] = [];
                this.events[event].push(callback);
            }

            emit(event: string, ...args: any[]) {
                if (this.events[event]) {
                    this.events[event].forEach(callback => callback(...args));
                }
            }

            removeAllListeners() {
                this.events = {};
            }
        }
    }
} as any;

import { BattleJobIntegration } from '../../game/src/systems/jobs/BattleJobIntegration';

// Mock JobSystem
const mockJobSystem = {
    getCharacterJob: jest.fn(),
    getCharacterJobStats: jest.fn(),
    getCurrentRoseEssence: jest.fn(),
    awardRoseEssence: jest.fn(),
    getRankUpCandidates: jest.fn(),
    showJobAura: jest.fn(),
    hideJobAura: jest.fn()
};

// Mock Scene
const mockScene = {
    cameras: { main: { centerX: 400, centerY: 300 } },
    add: {
        text: jest.fn().mockReturnValue({ setOrigin: jest.fn().mockReturnThis(), destroy: jest.fn() }),
        circle: jest.fn().mockReturnValue({ destroy: jest.fn() })
    },
    tweens: { add: jest.fn() },
    time: { delayedCall: jest.fn() },
    sound: { exists: jest.fn().mockReturnValue(false), play: jest.fn() }
};

describe('BattleJobIntegration', () => {
    let integration: BattleJobIntegration;

    beforeEach(() => {
        jest.clearAllMocks();
        integration = new BattleJobIntegration(mockJobSystem as any, mockScene as any);
    });

    afterEach(() => {
        integration.destroy();
    });

    describe('Boss Defeat Handling', () => {
        test('should handle boss defeat and award rose essence', async () => {
            // Arrange
            const bossInfo = {
                id: 'boss_1',
                name: 'Test Boss',
                type: 'major_boss' as const,
                roseEssenceReward: 15,
                isFirstTimeDefeat: true
            };

            const defeatingUnit = {
                id: 'player_1',
                name: 'Player',
                position: { x: 1, y: 1 }
            };

            mockJobSystem.awardRoseEssence.mockResolvedValue(15);
            mockJobSystem.getRankUpCandidates.mockReturnValue([]);

            // Act
            const result = await integration.handleBossDefeat(bossInfo, defeatingUnit as any);

            // Assert
            expect(result).toBe(15);
            expect(mockJobSystem.awardRoseEssence).toHaveBeenCalledWith(
                15,
                'boss_1',
                { x: 1, y: 1 }
            );
        });

        test('should emit rose essence gained event', async () => {
            // Arrange
            const eventSpy = jest.fn();
            integration.on('rose_essence_gained', eventSpy);

            const bossInfo = {
                id: 'boss_1',
                name: 'Test Boss',
                type: 'minor_boss' as const,
                roseEssenceReward: 10,
                isFirstTimeDefeat: false
            };

            mockJobSystem.awardRoseEssence.mockResolvedValue(10);

            // Act
            await integration.handleBossDefeat(bossInfo);

            // Assert
            expect(eventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    amount: 10,
                    bossInfo: expect.objectContaining({
                        id: 'boss_1',
                        name: 'Test Boss'
                    })
                })
            );
        });
    });

    describe('Job Battle Modifications', () => {
        test('should return default modifications when no job is found', () => {
            // Arrange
            mockJobSystem.getCharacterJob.mockReturnValue(null);

            const unit = { id: 'unit_1', name: 'Unit' };
            const weapon = { type: 'sword' };

            // Act
            const result = integration.applyJobBattleModifications(unit as any, weapon as any);

            // Assert
            expect(result).toEqual({
                statModifiers: {
                    hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, skill: 0, luck: 0
                },
                damageModifiers: [],
                accuracyModifier: 0,
                criticalRateModifier: 0,
                evasionModifier: 0,
                specialEffects: []
            });
        });

        test('should apply job modifications when job is found', () => {
            // Arrange
            const mockJob = {
                name: 'Warrior',
                category: 'warrior',
                rank: 2,
                getJobTraits: jest.fn().mockReturnValue([])
            };

            mockJobSystem.getCharacterJob.mockReturnValue(mockJob);
            mockJobSystem.getCharacterJobStats.mockReturnValue({
                hp: 10, mp: 0, attack: 5, defense: 3, speed: 0, skill: 0, luck: 0
            });

            const unit = { id: 'unit_1', name: 'Unit' };
            const weapon = { type: 'sword' };

            // Act
            const result = integration.applyJobBattleModifications(unit as any, weapon as any);

            // Assert
            expect(result.statModifiers).toEqual({
                hp: 10, mp: 0, attack: 5, defense: 3, speed: 0, skill: 0, luck: 0
            });
            expect(result.damageModifiers.length).toBeGreaterThan(0);
        });
    });

    describe('Job Aura in Battle', () => {
        test('should show and hide job aura', () => {
            // Arrange
            const unit = { id: 'unit_1', name: 'Unit' };

            // Act
            integration.showJobAuraInBattle(unit as any, 1000);

            // Assert
            expect(mockJobSystem.showJobAura).toHaveBeenCalledWith('unit_1');
            expect(mockScene.time.delayedCall).toHaveBeenCalledWith(1000, expect.any(Function));
        });

        test('should emit job aura shown event', () => {
            // Arrange
            const eventSpy = jest.fn();
            integration.on('job_aura_shown_in_battle', eventSpy);

            const unit = { id: 'unit_1', name: 'Unit' };

            // Act
            integration.showJobAuraInBattle(unit as any, 2000);

            // Assert
            expect(eventSpy).toHaveBeenCalledWith({
                unit,
                duration: 2000
            });
        });
    });

    describe('Error Handling', () => {
        test('should handle boss defeat errors gracefully', async () => {
            // Arrange
            const bossInfo = {
                id: 'boss_1',
                name: 'Test Boss',
                type: 'major_boss' as const,
                roseEssenceReward: 15,
                isFirstTimeDefeat: true
            };

            mockJobSystem.awardRoseEssence.mockRejectedValue(new Error('Test error'));

            // Act & Assert
            const result = await integration.handleBossDefeat(bossInfo);
            expect(result).toBe(0); // Should return 0 on error
        });

        test('should emit error event when rose essence gain fails', async () => {
            // Arrange
            const errorSpy = jest.fn();
            integration.on('rose_essence_gain_error', errorSpy);

            const bossInfo = {
                id: 'boss_1',
                name: 'Test Boss',
                type: 'major_boss' as const,
                roseEssenceReward: 15,
                isFirstTimeDefeat: true
            };

            mockJobSystem.awardRoseEssence.mockRejectedValue(new Error('Test error'));

            // Act
            await integration.handleBossDefeat(bossInfo);

            // Assert
            expect(errorSpy).toHaveBeenCalledWith({
                bossInfo,
                error: 'Test error'
            });
        });
    });
});