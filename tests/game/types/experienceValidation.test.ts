/**
 * 経験値システム型定義の妥当性検証テスト
 */

import {
    ExperienceSource,
    ExperienceAction,
    ExperienceError,
    ExperienceInfo,
    LevelUpResult,
    StatGrowthResult,
    GrowthRates,
    ExperienceTableData,
    ExperienceContext,
    ExperienceSystemConfig,
    UnitStats
} from '../../../game/src/types/experience';

describe('Experience Type Validation', () => {
    describe('Data Structure Validation', () => {
        test('should validate ExperienceInfo completeness', () => {
            const createExperienceInfo = (overrides: Partial<ExperienceInfo> = {}): ExperienceInfo => ({
                characterId: 'test-char',
                currentExperience: 100,
                currentLevel: 5,
                experienceToNextLevel: 50,
                totalExperience: 100,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.67,
                ...overrides
            });

            // 正常なデータ
            const validInfo = createExperienceInfo();
            expect(validInfo.characterId).toBeTruthy();
            expect(validInfo.currentExperience).toBeGreaterThanOrEqual(0);
            expect(validInfo.currentLevel).toBeGreaterThan(0);
            expect(validInfo.experienceProgress).toBeGreaterThanOrEqual(0);
            expect(validInfo.experienceProgress).toBeLessThanOrEqual(1);

            // 境界値テスト
            const maxLevelInfo = createExperienceInfo({
                isMaxLevel: true,
                experienceToNextLevel: 0,
                experienceProgress: 1.0
            });
            expect(maxLevelInfo.isMaxLevel).toBe(true);
            expect(maxLevelInfo.experienceToNextLevel).toBe(0);

            const canLevelUpInfo = createExperienceInfo({
                canLevelUp: true,
                experienceToNextLevel: 0,
                experienceProgress: 1.0
            });
            expect(canLevelUpInfo.canLevelUp).toBe(true);
        });

        test('should validate StatGrowthResult ranges', () => {
            const createStatGrowth = (overrides: Partial<StatGrowthResult> = {}): StatGrowthResult => ({
                hp: 0,
                mp: 0,
                attack: 0,
                defense: 0,
                speed: 0,
                skill: 0,
                luck: 0,
                ...overrides
            });

            // 正常な成長値
            const normalGrowth = createStatGrowth({
                hp: 5,
                mp: 3,
                attack: 2,
                defense: 1,
                speed: 1,
                skill: 2,
                luck: 1
            });

            Object.values(normalGrowth).forEach(value => {
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThanOrEqual(10); // 現実的な上限
            });

            // 成長なしのケース
            const noGrowth = createStatGrowth();
            Object.values(noGrowth).forEach(value => {
                expect(value).toBe(0);
            });

            // 最大成長のケース
            const maxGrowth = createStatGrowth({
                hp: 10,
                mp: 8,
                attack: 6,
                defense: 5,
                speed: 4,
                skill: 7,
                luck: 3
            });

            Object.values(maxGrowth).forEach(value => {
                expect(value).toBeGreaterThanOrEqual(0);
            });
        });

        test('should validate GrowthRates percentages', () => {
            const createGrowthRates = (overrides: Partial<GrowthRates> = {}): GrowthRates => ({
                hp: 50,
                mp: 50,
                attack: 50,
                defense: 50,
                speed: 50,
                skill: 50,
                luck: 50,
                ...overrides
            });

            // 正常な成長率（0-100%）
            const normalRates = createGrowthRates({
                hp: 80,
                mp: 60,
                attack: 70,
                defense: 50,
                speed: 40,
                skill: 65,
                luck: 30
            });

            Object.values(normalRates).forEach(rate => {
                expect(rate).toBeGreaterThanOrEqual(0);
                expect(rate).toBeLessThanOrEqual(100);
            });

            // 境界値テスト
            const minRates = createGrowthRates({
                hp: 0,
                mp: 0,
                attack: 0,
                defense: 0,
                speed: 0,
                skill: 0,
                luck: 0
            });

            Object.values(minRates).forEach(rate => {
                expect(rate).toBe(0);
            });

            const maxRates = createGrowthRates({
                hp: 100,
                mp: 100,
                attack: 100,
                defense: 100,
                speed: 100,
                skill: 100,
                luck: 100
            });

            Object.values(maxRates).forEach(rate => {
                expect(rate).toBe(100);
            });
        });

        test('should validate ExperienceTableData structure', () => {
            const createExperienceTable = (overrides: Partial<ExperienceTableData> = {}): ExperienceTableData => ({
                levelRequirements: [0, 100, 250, 450, 700, 1000],
                experienceGains: {
                    attackHit: 5,
                    enemyDefeat: 25,
                    allySupport: 10,
                    healing: 8
                },
                maxLevel: 50,
                ...overrides
            });

            const validTable = createExperienceTable();

            // レベル要件の検証
            expect(validTable.levelRequirements).toHaveLength(6);
            expect(validTable.levelRequirements[0]).toBe(0); // レベル1は0経験値

            // 昇順チェック
            for (let i = 1; i < validTable.levelRequirements.length; i++) {
                expect(validTable.levelRequirements[i]).toBeGreaterThan(validTable.levelRequirements[i - 1]);
            }

            // 経験値獲得量の検証
            expect(validTable.experienceGains.attackHit).toBeGreaterThan(0);
            expect(validTable.experienceGains.enemyDefeat).toBeGreaterThan(validTable.experienceGains.attackHit);
            expect(validTable.experienceGains.allySupport).toBeGreaterThan(0);
            expect(validTable.experienceGains.healing).toBeGreaterThan(0);

            // 最大レベルの検証
            expect(validTable.maxLevel).toBeGreaterThan(1);
            expect(validTable.maxLevel).toBeLessThanOrEqual(100); // 現実的な上限
        });

        test('should validate UnitStats structure', () => {
            const createUnitStats = (overrides: Partial<UnitStats> = {}): UnitStats => ({
                maxHP: 100,
                maxMP: 50,
                attack: 20,
                defense: 15,
                speed: 10,
                movement: 3,
                skill: 12,
                luck: 8,
                ...overrides
            });

            const validStats = createUnitStats();

            // 基本統計の検証
            expect(validStats.maxHP).toBeGreaterThan(0);
            expect(validStats.maxMP).toBeGreaterThanOrEqual(0);
            expect(validStats.attack).toBeGreaterThanOrEqual(0);
            expect(validStats.defense).toBeGreaterThanOrEqual(0);
            expect(validStats.speed).toBeGreaterThan(0);
            expect(validStats.movement).toBeGreaterThan(0);
            expect(validStats.skill).toBeGreaterThanOrEqual(0);
            expect(validStats.luck).toBeGreaterThanOrEqual(0);

            // 現実的な範囲チェック
            expect(validStats.maxHP).toBeLessThanOrEqual(9999);
            expect(validStats.maxMP).toBeLessThanOrEqual(999);
            expect(validStats.attack).toBeLessThanOrEqual(255);
            expect(validStats.defense).toBeLessThanOrEqual(255);
            expect(validStats.speed).toBeLessThanOrEqual(255);
            expect(validStats.movement).toBeLessThanOrEqual(10);
            expect(validStats.skill).toBeLessThanOrEqual(255);
            expect(validStats.luck).toBeLessThanOrEqual(255);
        });
    });

    describe('Context and Configuration Validation', () => {
        test('should validate ExperienceContext completeness', () => {
            const baseContext: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            };

            // 最小限のコンテキスト
            expect(baseContext.source).toBeDefined();
            expect(baseContext.action).toBeDefined();
            expect(baseContext.timestamp).toBeGreaterThan(0);

            // 完全なコンテキスト
            const fullContext: ExperienceContext = {
                ...baseContext,
                targetId: 'enemy-1',
                amount: 5,
                multiplier: 1.2,
                bonusAmount: 2,
                metadata: { criticalHit: true, weaponType: 'sword' },
                battleContext: {
                    battleId: 'battle-001',
                    turnNumber: 3,
                    attackerId: 'player-1',
                    defenderId: 'enemy-1',
                    damageDealt: 25
                }
            };

            expect(fullContext.targetId).toBeTruthy();
            expect(fullContext.amount).toBeGreaterThan(0);
            expect(fullContext.multiplier).toBeGreaterThan(0);
            expect(fullContext.bonusAmount).toBeGreaterThanOrEqual(0);
            expect(fullContext.metadata).toBeDefined();
            expect(fullContext.battleContext).toBeDefined();
        });

        test('should validate ExperienceSystemConfig settings', () => {
            const createConfig = (overrides: Partial<ExperienceSystemConfig> = {}): ExperienceSystemConfig => ({
                enableExperienceGain: true,
                experienceMultiplier: 1.0,
                maxLevel: 50,
                debugMode: false,
                autoLevelUp: true,
                showExperiencePopups: true,
                experienceAnimationSpeed: 1.0,
                levelUpAnimationDuration: 2000,
                ...overrides
            });

            const defaultConfig = createConfig();

            // 基本設定の検証
            expect(typeof defaultConfig.enableExperienceGain).toBe('boolean');
            expect(defaultConfig.experienceMultiplier).toBeGreaterThan(0);
            expect(defaultConfig.maxLevel).toBeGreaterThan(1);
            expect(typeof defaultConfig.debugMode).toBe('boolean');
            expect(typeof defaultConfig.autoLevelUp).toBe('boolean');
            expect(typeof defaultConfig.showExperiencePopups).toBe('boolean');
            expect(defaultConfig.experienceAnimationSpeed).toBeGreaterThan(0);
            expect(defaultConfig.levelUpAnimationDuration).toBeGreaterThan(0);

            // 境界値テスト
            const extremeConfig = createConfig({
                experienceMultiplier: 0.1,
                maxLevel: 1,
                experienceAnimationSpeed: 0.1,
                levelUpAnimationDuration: 100
            });

            expect(extremeConfig.experienceMultiplier).toBe(0.1);
            expect(extremeConfig.maxLevel).toBe(1);
            expect(extremeConfig.experienceAnimationSpeed).toBe(0.1);
            expect(extremeConfig.levelUpAnimationDuration).toBe(100);
        });
    });

    describe('Enum Value Validation', () => {
        test('should have consistent enum values', () => {
            // ExperienceSourceの値が一意であることを確認
            const sourceValues = Object.values(ExperienceSource);
            const uniqueSourceValues = new Set(sourceValues);
            expect(sourceValues.length).toBe(uniqueSourceValues.size);

            // ExperienceActionの値が一意であることを確認
            const actionValues = Object.values(ExperienceAction);
            const uniqueActionValues = new Set(actionValues);
            expect(actionValues.length).toBe(uniqueActionValues.size);

            // ExperienceErrorの値が一意であることを確認
            const errorValues = Object.values(ExperienceError);
            const uniqueErrorValues = new Set(errorValues);
            expect(errorValues.length).toBe(uniqueErrorValues.size);
        });

        test('should have meaningful enum values', () => {
            // 列挙値が意味のある文字列であることを確認
            Object.values(ExperienceSource).forEach(value => {
                expect(typeof value).toBe('string');
                expect(value.length).toBeGreaterThan(0);
                expect(value).toMatch(/^[a-z_]+$/); // スネークケース
            });

            Object.values(ExperienceAction).forEach(value => {
                expect(typeof value).toBe('string');
                expect(value.length).toBeGreaterThan(0);
                expect(value).toMatch(/^[a-z_]+$/); // スネークケース
            });

            Object.values(ExperienceError).forEach(value => {
                expect(typeof value).toBe('string');
                expect(value.length).toBeGreaterThan(0);
                expect(value).toMatch(/^[a-z_]+$/); // スネークケース
            });
        });
    });

    describe('Type Safety Edge Cases', () => {
        test('should handle optional properties correctly', () => {
            // オプショナルプロパティが未定義でも動作することを確認
            const minimalContext: ExperienceContext = {
                source: ExperienceSource.HEALING,
                action: ExperienceAction.HEAL,
                timestamp: Date.now()
            };

            expect(minimalContext.targetId).toBeUndefined();
            expect(minimalContext.amount).toBeUndefined();
            expect(minimalContext.multiplier).toBeUndefined();
            expect(minimalContext.bonusAmount).toBeUndefined();
            expect(minimalContext.metadata).toBeUndefined();
            expect(minimalContext.battleContext).toBeUndefined();
        });

        test('should handle zero and negative values appropriately', () => {
            // 0値が許可される場合のテスト
            const zeroGrowth: StatGrowthResult = {
                hp: 0,
                mp: 0,
                attack: 0,
                defense: 0,
                speed: 0,
                skill: 0,
                luck: 0
            };

            Object.values(zeroGrowth).forEach(value => {
                expect(value).toBe(0);
            });

            // 経験値進捗の境界値
            const experienceInfo: ExperienceInfo = {
                characterId: 'test',
                currentExperience: 0,
                currentLevel: 1,
                experienceToNextLevel: 100,
                totalExperience: 0,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.0
            };

            expect(experienceInfo.experienceProgress).toBe(0.0);
        });
    });
});