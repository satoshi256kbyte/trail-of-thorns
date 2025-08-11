/**
 * DifficultyManager のユニットテスト
 */

import { DifficultyManager, PlayerLevelInfo, AdaptiveDifficultyConfig, PerformanceStats } from '../../../../game/src/systems/ai/DifficultyManager';
import { DifficultyLevel, DifficultySettings, AIContext } from '../../../../game/src/types/ai';

describe('DifficultyManager', () => {
    let difficultyManager: DifficultyManager;

    beforeEach(() => {
        difficultyManager = new DifficultyManager();
    });

    describe('基本機能', () => {
        test('初期化時はNORMAL難易度に設定される', () => {
            expect(difficultyManager.getCurrentDifficultyLevel()).toBe(DifficultyLevel.NORMAL);
        });

        test('初期設定が正しく設定される', () => {
            const settings = difficultyManager.getCurrentSettings();
            expect(settings.thinkingDepth).toBe(3);
            expect(settings.randomnessFactor).toBe(0.2);
            expect(settings.mistakeProbability).toBe(0.1);
            expect(settings.reactionTime).toBe(1000);
            expect(settings.skillUsageFrequency).toBe(0.7);
            expect(settings.thinkingTimeLimit).toBe(2000);
        });
    });

    describe('難易度レベル設定', () => {
        test('有効な難易度レベルを設定できる', () => {
            difficultyManager.setDifficultyLevel(DifficultyLevel.HARD);
            expect(difficultyManager.getCurrentDifficultyLevel()).toBe(DifficultyLevel.HARD);

            const settings = difficultyManager.getCurrentSettings();
            expect(settings.thinkingDepth).toBe(4);
            expect(settings.randomnessFactor).toBe(0.1);
            expect(settings.mistakeProbability).toBe(0.05);
        });

        test('EASY難易度の設定が正しい', () => {
            difficultyManager.setDifficultyLevel(DifficultyLevel.EASY);
            const settings = difficultyManager.getCurrentSettings();

            expect(settings.thinkingDepth).toBe(2);
            expect(settings.randomnessFactor).toBe(0.4);
            expect(settings.mistakeProbability).toBe(0.2);
            expect(settings.reactionTime).toBe(1500);
            expect(settings.skillUsageFrequency).toBe(0.5);
        });

        test('EXPERT難易度の設定が正しい', () => {
            difficultyManager.setDifficultyLevel(DifficultyLevel.EXPERT);
            const settings = difficultyManager.getCurrentSettings();

            expect(settings.thinkingDepth).toBe(5);
            expect(settings.randomnessFactor).toBe(0.05);
            expect(settings.mistakeProbability).toBe(0.02);
            expect(settings.reactionTime).toBe(200);
            expect(settings.skillUsageFrequency).toBe(0.9);
        });

        test('MASTER難易度の設定が正しい', () => {
            difficultyManager.setDifficultyLevel(DifficultyLevel.MASTER);
            const settings = difficultyManager.getCurrentSettings();

            expect(settings.thinkingDepth).toBe(5);
            expect(settings.randomnessFactor).toBe(0.02);
            expect(settings.mistakeProbability).toBe(0.01);
            expect(settings.reactionTime).toBe(100);
            expect(settings.skillUsageFrequency).toBe(0.95);
        });
    });

    describe('個別設定の調整', () => {
        test('思考深度を設定できる', () => {
            difficultyManager.setThinkingDepth(4);
            const settings = difficultyManager.getCurrentSettings();
            expect(settings.thinkingDepth).toBe(4);
        });

        test('思考深度の範囲外の値は無視される', () => {
            const originalDepth = difficultyManager.getCurrentSettings().thinkingDepth;

            difficultyManager.setThinkingDepth(0);
            expect(difficultyManager.getCurrentSettings().thinkingDepth).toBe(originalDepth);

            difficultyManager.setThinkingDepth(6);
            expect(difficultyManager.getCurrentSettings().thinkingDepth).toBe(originalDepth);
        });

        test('ランダム要素を設定できる', () => {
            difficultyManager.setRandomnessFactor(0.3);
            const settings = difficultyManager.getCurrentSettings();
            expect(settings.randomnessFactor).toBe(0.3);
        });

        test('ランダム要素の範囲外の値は無視される', () => {
            const originalFactor = difficultyManager.getCurrentSettings().randomnessFactor;

            difficultyManager.setRandomnessFactor(-0.1);
            expect(difficultyManager.getCurrentSettings().randomnessFactor).toBe(originalFactor);

            difficultyManager.setRandomnessFactor(1.1);
            expect(difficultyManager.getCurrentSettings().randomnessFactor).toBe(originalFactor);
        });

        test('ミス確率を設定できる', () => {
            difficultyManager.setMistakeProbability(0.15);
            const settings = difficultyManager.getCurrentSettings();
            expect(settings.mistakeProbability).toBe(0.15);
        });

        test('スキル使用頻度を設定できる', () => {
            difficultyManager.setSkillUsageFrequency(0.8);
            const settings = difficultyManager.getCurrentSettings();
            expect(settings.skillUsageFrequency).toBe(0.8);
        });
    });

    describe('プレイヤーレベルに応じた動的調整', () => {
        test('プレイヤーレベルが高い場合、AIが強化される', () => {
            const playerLevelInfo: PlayerLevelInfo = {
                averageLevel: 20,
                maxLevel: 25,
                minLevel: 15,
                partySize: 4
            };

            const adjustedSettings = difficultyManager.adjustForPlayerLevel(playerLevelInfo);
            const baseSettings = difficultyManager.getCurrentSettings();

            expect(adjustedSettings.thinkingDepth).toBeGreaterThanOrEqual(baseSettings.thinkingDepth);
            expect(adjustedSettings.randomnessFactor).toBeLessThanOrEqual(baseSettings.randomnessFactor);
            expect(adjustedSettings.mistakeProbability).toBeLessThanOrEqual(baseSettings.mistakeProbability);
            expect(adjustedSettings.skillUsageFrequency).toBeGreaterThanOrEqual(baseSettings.skillUsageFrequency);
        });

        test('プレイヤーレベルが低い場合、AIが弱化される', () => {
            const playerLevelInfo: PlayerLevelInfo = {
                averageLevel: 5,
                maxLevel: 8,
                minLevel: 2,
                partySize: 2
            };

            const adjustedSettings = difficultyManager.adjustForPlayerLevel(playerLevelInfo);
            const baseSettings = difficultyManager.getCurrentSettings();

            expect(adjustedSettings.randomnessFactor).toBeGreaterThanOrEqual(baseSettings.randomnessFactor);
            expect(adjustedSettings.mistakeProbability).toBeGreaterThanOrEqual(baseSettings.mistakeProbability);
        });

        test('パーティサイズが大きい場合、AIが強化される', () => {
            const smallParty: PlayerLevelInfo = {
                averageLevel: 10,
                maxLevel: 10,
                minLevel: 10,
                partySize: 2
            };

            const largeParty: PlayerLevelInfo = {
                averageLevel: 10,
                maxLevel: 10,
                minLevel: 10,
                partySize: 6
            };

            const smallPartySettings = difficultyManager.adjustForPlayerLevel(smallParty);
            const largePartySettings = difficultyManager.adjustForPlayerLevel(largeParty);

            expect(largePartySettings.thinkingDepth).toBeGreaterThanOrEqual(smallPartySettings.thinkingDepth);
            expect(largePartySettings.skillUsageFrequency).toBeGreaterThanOrEqual(smallPartySettings.skillUsageFrequency);
        });

        test('プレイヤーレベルスケーリングを無効化できる', () => {
            difficultyManager.setPlayerLevelScaling(false);

            const playerLevelInfo: PlayerLevelInfo = {
                averageLevel: 50,
                maxLevel: 60,
                minLevel: 40,
                partySize: 6
            };

            const adjustedSettings = difficultyManager.adjustForPlayerLevel(playerLevelInfo);
            const baseSettings = difficultyManager.getCurrentSettings();

            expect(adjustedSettings).toEqual(baseSettings);
        });
    });

    describe('動的難易度調整', () => {
        test('動的難易度調整を有効化できる', () => {
            difficultyManager.setAdaptiveDifficulty(true);
            const stats = difficultyManager.getStatistics();
            expect(stats.adaptiveConfig.enabled).toBe(true);
        });

        test('動的難易度調整設定を更新できる', () => {
            const newConfig: Partial<AdaptiveDifficultyConfig> = {
                adjustmentRate: 0.2,
                targetWinRate: 0.7,
                performanceWindow: 15
            };

            difficultyManager.updateAdaptiveConfig(newConfig);
            const stats = difficultyManager.getStatistics();

            expect(stats.adaptiveConfig.adjustmentRate).toBe(0.2);
            expect(stats.adaptiveConfig.targetWinRate).toBe(0.7);
            expect(stats.adaptiveConfig.performanceWindow).toBe(15);
        });

        test('パフォーマンス統計を記録できる', () => {
            const performanceStats: PerformanceStats = {
                wins: 3,
                losses: 7,
                averageBattleLength: 15,
                playerDamageRate: 0.6,
                aiSuccessRate: 0.8
            };

            difficultyManager.recordPerformance(performanceStats);
            const stats = difficultyManager.getStatistics();

            expect(stats.performanceHistory).toHaveLength(1);
            expect(stats.performanceHistory[0]).toEqual(performanceStats);
        });

        test('勝率が低い場合、難易度が下がる', () => {
            difficultyManager.setAdaptiveDifficulty(true);

            // 低い勝率のデータを複数回記録
            for (let i = 0; i < 10; i++) {
                difficultyManager.recordPerformance({
                    wins: 1,
                    losses: 9,
                    averageBattleLength: 20,
                    playerDamageRate: 0.8,
                    aiSuccessRate: 0.9
                });
            }

            const settings = difficultyManager.getCurrentSettings();
            // 難易度が下がっていることを確認（ランダム要素が増加、ミス確率が増加など）
            expect(settings.randomnessFactor).toBeGreaterThan(0.2);
        });
    });

    describe('リアルタイム設定変更', () => {
        test('部分的な設定を更新できる', () => {
            const partialSettings: Partial<DifficultySettings> = {
                thinkingDepth: 4,
                randomnessFactor: 0.15
            };

            difficultyManager.updateSettings(partialSettings);
            const settings = difficultyManager.getCurrentSettings();

            expect(settings.thinkingDepth).toBe(4);
            expect(settings.randomnessFactor).toBe(0.15);
            // 他の設定は変更されていないことを確認
            expect(settings.mistakeProbability).toBe(0.1);
            expect(settings.skillUsageFrequency).toBe(0.7);
        });

        test('無効な設定値は無視される', () => {
            const originalSettings = difficultyManager.getCurrentSettings();

            const invalidSettings: Partial<DifficultySettings> = {
                thinkingDepth: 10,
                randomnessFactor: 2.0,
                mistakeProbability: -0.5
            };

            difficultyManager.updateSettings(invalidSettings);
            const settings = difficultyManager.getCurrentSettings();

            expect(settings.thinkingDepth).toBe(originalSettings.thinkingDepth);
            expect(settings.randomnessFactor).toBe(originalSettings.randomnessFactor);
            expect(settings.mistakeProbability).toBe(originalSettings.mistakeProbability);
        });
    });

    describe('設定の保存と復元', () => {
        test('現在の設定を基本設定として保存できる', () => {
            difficultyManager.setThinkingDepth(5);
            difficultyManager.setRandomnessFactor(0.05);

            difficultyManager.saveCurrentAsBase();

            // 設定を変更
            difficultyManager.setThinkingDepth(2);
            difficultyManager.setRandomnessFactor(0.5);

            // 基本設定にリセット
            difficultyManager.resetToBase();

            const settings = difficultyManager.getCurrentSettings();
            expect(settings.thinkingDepth).toBe(5);
            expect(settings.randomnessFactor).toBe(0.05);
        });

        test('設定をJSONとしてエクスポートできる', () => {
            const jsonString = difficultyManager.exportSettings();
            expect(() => JSON.parse(jsonString)).not.toThrow();

            const parsed = JSON.parse(jsonString);
            expect(parsed.currentDifficulty).toBeDefined();
            expect(parsed.currentSettings).toBeDefined();
            expect(parsed.baseDifficultySettings).toBeDefined();
        });

        test('JSONから設定をインポートできる', () => {
            const originalSettings = difficultyManager.exportSettings();

            // 設定を変更
            difficultyManager.setDifficultyLevel(DifficultyLevel.HARD);
            difficultyManager.setThinkingDepth(5);

            // 元の設定をインポート
            const success = difficultyManager.importSettings(originalSettings);
            expect(success).toBe(true);

            expect(difficultyManager.getCurrentDifficultyLevel()).toBe(DifficultyLevel.NORMAL);
        });

        test('無効なJSONのインポートは失敗する', () => {
            const success = difficultyManager.importSettings('invalid json');
            expect(success).toBe(false);
        });
    });

    describe('コンテキスト依存の調整', () => {
        test('ターン数に応じて設定が調整される', () => {
            const mockContext: AIContext = {
                currentCharacter: {} as any,
                gameState: {
                    playerUnits: [
                        { level: 10 } as any,
                        { level: 12 } as any
                    ]
                },
                visibleEnemies: [],
                visibleAllies: [],
                npcs: [],
                availableSkills: [],
                terrainData: {},
                turnNumber: 20,
                difficultySettings: difficultyManager.getCurrentSettings(),
                actionHistory: []
            };

            const adjustedSettings = difficultyManager.getAdjustedSettings(mockContext);
            const baseSettings = difficultyManager.getCurrentSettings();

            expect(adjustedSettings.thinkingDepth).toBeGreaterThanOrEqual(baseSettings.thinkingDepth);
            expect(adjustedSettings.skillUsageFrequency).toBeGreaterThanOrEqual(baseSettings.skillUsageFrequency);
        });

        test('プレイヤーユニット情報がない場合でも動作する', () => {
            const mockContext: AIContext = {
                currentCharacter: {} as any,
                gameState: {},
                visibleEnemies: [],
                visibleAllies: [],
                npcs: [],
                availableSkills: [],
                terrainData: {},
                turnNumber: 5,
                difficultySettings: difficultyManager.getCurrentSettings(),
                actionHistory: []
            };

            const adjustedSettings = difficultyManager.getAdjustedSettings(mockContext);
            expect(adjustedSettings).toBeDefined();
            expect(adjustedSettings.thinkingDepth).toBeGreaterThan(0);
        });
    });

    describe('統計情報', () => {
        test('統計情報を取得できる', () => {
            const stats = difficultyManager.getStatistics();

            expect(stats.currentDifficulty).toBeDefined();
            expect(stats.currentSettings).toBeDefined();
            expect(stats.adaptiveConfig).toBeDefined();
            expect(stats.performanceHistory).toBeDefined();
            expect(typeof stats.playerLevelScaling).toBe('boolean');
        });

        test('統計情報は元のデータを変更しない', () => {
            const stats = difficultyManager.getStatistics();

            // 統計情報を変更
            stats.currentSettings.thinkingDepth = 999;
            stats.adaptiveConfig.enabled = !stats.adaptiveConfig.enabled;

            // 元のデータは変更されていないことを確認
            const originalSettings = difficultyManager.getCurrentSettings();
            expect(originalSettings.thinkingDepth).not.toBe(999);
        });
    });

    describe('エラーハンドリング', () => {
        test('無効な難易度レベルは無視される', () => {
            const originalLevel = difficultyManager.getCurrentDifficultyLevel();

            // 無効な値を設定しようとする
            difficultyManager.setDifficultyLevel(999 as DifficultyLevel);

            expect(difficultyManager.getCurrentDifficultyLevel()).toBe(originalLevel);
        });

        test('範囲外の設定値は適切に制限される', () => {
            const partialSettings: Partial<DifficultySettings> = {
                thinkingDepth: -5,
                randomnessFactor: 10,
                mistakeProbability: -1,
                skillUsageFrequency: 5
            };

            const originalSettings = difficultyManager.getCurrentSettings();
            difficultyManager.updateSettings(partialSettings);
            const newSettings = difficultyManager.getCurrentSettings();

            // 無効な値は無視され、元の値が保持される
            expect(newSettings.thinkingDepth).toBe(originalSettings.thinkingDepth);
            expect(newSettings.randomnessFactor).toBe(originalSettings.randomnessFactor);
            expect(newSettings.mistakeProbability).toBe(originalSettings.mistakeProbability);
            expect(newSettings.skillUsageFrequency).toBe(originalSettings.skillUsageFrequency);
        });
    });
});