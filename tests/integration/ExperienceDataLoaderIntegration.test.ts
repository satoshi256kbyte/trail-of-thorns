/**
 * ExperienceDataLoader 統合テスト
 * 実際のJSONファイルとの連携をテスト
 */

import { ExperienceDataLoader } from '../../game/src/systems/experience/ExperienceDataLoader';
import { ExperienceSource } from '../../game/src/types/experience';
import * as fs from 'fs';
import * as path from 'path';

// Node.js環境でのfetchポリフィル
global.fetch = jest.fn();

describe('ExperienceDataLoader Integration', () => {
    let dataLoader: ExperienceDataLoader;
    let realJsonData: any;

    beforeAll(() => {
        // 実際のJSONファイルを読み込み
        const jsonPath = path.join(process.cwd(), 'data/experience-table.json');
        realJsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    });

    beforeEach(() => {
        dataLoader = new ExperienceDataLoader();
        jest.clearAllMocks();
    });

    describe('Real JSON file integration', () => {
        test('should load and validate real experience table JSON', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => realJsonData
            });

            const result = await dataLoader.loadExperienceTable('data/experience-table.json');

            expect(result).toBe(true);
            expect(dataLoader.isDataLoaded()).toBe(true);
        });

        test('should provide correct experience values from real data', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => realJsonData
            });

            await dataLoader.loadExperienceTable('data/experience-table.json');

            // 実際のJSONファイルの値をテスト
            expect(dataLoader.getMaxLevel()).toBe(49); // 配列長50 - 1 = 49
            expect(dataLoader.getRequiredExperience(0)).toBe(0);
            expect(dataLoader.getRequiredExperience(1)).toBe(100);
            expect(dataLoader.getRequiredExperience(2)).toBe(250);
            expect(dataLoader.getRequiredExperience(49)).toBe(63700);

            // 経験値獲得量のテスト
            expect(dataLoader.getExperienceGain(ExperienceSource.ATTACK_HIT)).toBe(5);
            expect(dataLoader.getExperienceGain(ExperienceSource.ENEMY_DEFEAT)).toBe(25);
            expect(dataLoader.getExperienceGain(ExperienceSource.ALLY_SUPPORT)).toBe(10);
            expect(dataLoader.getExperienceGain(ExperienceSource.HEALING)).toBe(8);
        });

        test('should correctly calculate levels and experience requirements', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => realJsonData
            });

            await dataLoader.loadExperienceTable('data/experience-table.json');

            // レベル計算のテスト
            expect(dataLoader.calculateLevelFromExperience(0)).toBe(0);
            expect(dataLoader.calculateLevelFromExperience(99)).toBe(0);
            expect(dataLoader.calculateLevelFromExperience(100)).toBe(1);
            expect(dataLoader.calculateLevelFromExperience(249)).toBe(1);
            expect(dataLoader.calculateLevelFromExperience(250)).toBe(2);
            expect(dataLoader.calculateLevelFromExperience(63700)).toBe(49); // 最大レベル

            // 次レベルまでの経験値計算のテスト
            expect(dataLoader.getExperienceToNextLevel(0)).toBe(100);
            expect(dataLoader.getExperienceToNextLevel(50)).toBe(50);
            expect(dataLoader.getExperienceToNextLevel(100)).toBe(150);
            expect(dataLoader.getExperienceToNextLevel(200)).toBe(50);
            expect(dataLoader.getExperienceToNextLevel(63700)).toBe(0); // 最大レベル
        });

        test('should handle experience progression realistically', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => realJsonData
            });

            await dataLoader.loadExperienceTable('data/experience-table.json');

            // 実際のゲームプレイシナリオをシミュレート
            let currentExp = 0;

            // 攻撃命中を20回
            for (let i = 0; i < 20; i++) {
                currentExp += dataLoader.getExperienceGain(ExperienceSource.ATTACK_HIT);
            }
            expect(currentExp).toBe(100); // 5 * 20 = 100
            expect(dataLoader.calculateLevelFromExperience(currentExp)).toBe(1);

            // 敵を5体撃破
            for (let i = 0; i < 5; i++) {
                currentExp += dataLoader.getExperienceGain(ExperienceSource.ENEMY_DEFEAT);
            }
            expect(currentExp).toBe(225); // 100 + (25 * 5) = 225
            expect(dataLoader.calculateLevelFromExperience(currentExp)).toBe(1);

            // 味方支援を3回
            for (let i = 0; i < 3; i++) {
                currentExp += dataLoader.getExperienceGain(ExperienceSource.ALLY_SUPPORT);
            }
            expect(currentExp).toBe(255); // 225 + (10 * 3) = 255
            expect(dataLoader.calculateLevelFromExperience(currentExp)).toBe(2);

            // 次のレベルまでの経験値を確認
            const expToNext = dataLoader.getExperienceToNextLevel(currentExp);
            expect(expToNext).toBe(195); // 450 - 255 = 195
        });

        test('should validate experience table structure', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => realJsonData
            });

            await dataLoader.loadExperienceTable('data/experience-table.json');

            const tableData = dataLoader.getExperienceTableData();
            expect(tableData).not.toBeNull();

            if (tableData) {
                // レベル要件が単調増加であることを確認
                for (let i = 1; i < tableData.levelRequirements.length; i++) {
                    expect(tableData.levelRequirements[i]).toBeGreaterThan(tableData.levelRequirements[i - 1]);
                }

                // 最初のレベルは0経験値
                expect(tableData.levelRequirements[0]).toBe(0);

                // 最大レベルが配列の長さ - 1と一致
                expect(tableData.maxLevel).toBe(tableData.levelRequirements.length - 1);

                // 経験値獲得量が正の値
                expect(tableData.experienceGains.attackHit).toBeGreaterThan(0);
                expect(tableData.experienceGains.enemyDefeat).toBeGreaterThan(0);
                expect(tableData.experienceGains.allySupport).toBeGreaterThan(0);
                expect(tableData.experienceGains.healing).toBeGreaterThan(0);
            }
        });
    });

    describe('Error handling with real environment', () => {
        test('should gracefully handle missing file in real environment', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            const result = await dataLoader.loadExperienceTable('data/nonexistent-file.json');

            // ファイルが見つからない場合でもデフォルト値で動作する
            expect(result).toBe(true);
            expect(dataLoader.isDataLoaded()).toBe(true);
            expect(dataLoader.getMaxLevel()).toBe(49); // デフォルト値の配列長50 - 1
        });
    });

    describe('Real JSON file validation', () => {
        test('should validate that real JSON file matches expected structure', () => {
            // 実際のJSONファイルの構造をテスト
            expect(realJsonData).toHaveProperty('levelRequirements');
            expect(realJsonData).toHaveProperty('experienceGains');
            expect(realJsonData).toHaveProperty('maxLevel');

            expect(Array.isArray(realJsonData.levelRequirements)).toBe(true);
            expect(realJsonData.levelRequirements.length).toBe(50);
            expect(realJsonData.levelRequirements[0]).toBe(0);
            expect(realJsonData.maxLevel).toBe(49);

            expect(realJsonData.experienceGains).toHaveProperty('attackHit');
            expect(realJsonData.experienceGains).toHaveProperty('enemyDefeat');
            expect(realJsonData.experienceGains).toHaveProperty('allySupport');
            expect(realJsonData.experienceGains).toHaveProperty('healing');
        });
    });
});