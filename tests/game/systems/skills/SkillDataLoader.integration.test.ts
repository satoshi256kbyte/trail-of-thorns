/**
 * SkillDataLoaderの統合テスト
 * 実際のskills.jsonファイルを使用したテスト
 */

import { SkillDataLoader } from '../../../../game/src/systems/skills/SkillDataLoader';
import * as fs from 'fs';
import * as path from 'path';

// Node.js環境用のfetchモック
const mockFetchForNodeJS = jest.fn();

describe('SkillDataLoader Integration Tests', () => {
    let loader: SkillDataLoader;

    beforeEach(() => {
        // Node.js環境用のfetchモックを設定
        global.fetch = mockFetchForNodeJS;

        loader = new SkillDataLoader({
            dataFilePath: 'data/skills.json',
            strictValidation: true,
            ignoreWarnings: false,
            useCache: false,
            timeout: 5000,
            retryCount: 1
        });
    });

    test('実際のskills.jsonファイルを読み込める', async () => {
        // 実際のファイルを読み込んでモックに設定
        const skillsJsonPath = path.join(__dirname, '../../../../data/skills.json');
        const skillsJsonContent = fs.readFileSync(skillsJsonPath, 'utf-8');

        mockFetchForNodeJS.mockResolvedValueOnce({
            ok: true,
            text: jest.fn().mockResolvedValue(skillsJsonContent)
        });

        const result = await loader.loadSkillData();

        expect(result.success).toBe(true);
        expect(result.skills).toBeDefined();
        expect(result.skills!.length).toBeGreaterThan(0);

        // 基本的なスキルが含まれていることを確認
        const basicAttack = result.skills!.find(skill => skill.id === 'basic_attack');
        expect(basicAttack).toBeDefined();
        expect(basicAttack!.name).toBe('基本攻撃');
        expect(basicAttack!.skillType).toBe('attack');

        const heal = result.skills!.find(skill => skill.id === 'heal');
        expect(heal).toBeDefined();
        expect(heal!.name).toBe('ヒール');
        expect(heal!.skillType).toBe('heal');
    });

    test('全スキルが正しい構造を持っている', async () => {
        // 実際のファイルを読み込んでモックに設定
        const skillsJsonPath = path.join(__dirname, '../../../../data/skills.json');
        const skillsJsonContent = fs.readFileSync(skillsJsonPath, 'utf-8');

        mockFetchForNodeJS.mockResolvedValueOnce({
            ok: true,
            text: jest.fn().mockResolvedValue(skillsJsonContent)
        });

        const result = await loader.loadSkillData();

        expect(result.success).toBe(true);

        for (const skill of result.skills!) {
            // 必須フィールドの存在確認
            expect(skill.id).toBeDefined();
            expect(skill.name).toBeDefined();
            expect(skill.description).toBeDefined();
            expect(skill.skillType).toBeDefined();
            expect(skill.targetType).toBeDefined();
            expect(skill.range).toBeDefined();
            expect(skill.areaOfEffect).toBeDefined();
            expect(skill.effects).toBeDefined();
            expect(skill.usageCondition).toBeDefined();
            expect(skill.learnCondition).toBeDefined();
            expect(skill.animation).toBeDefined();

            // 効果配列が空でないことを確認
            expect(skill.effects.length).toBeGreaterThan(0);

            // 使用条件の妥当性確認
            expect(skill.usageCondition.mpCost).toBeGreaterThanOrEqual(0);
            expect(skill.usageCondition.cooldown).toBeGreaterThanOrEqual(0);
            expect(skill.usageCondition.levelRequirement).toBeGreaterThanOrEqual(1);

            // アニメーション情報の確認
            expect(skill.animation.castAnimation).toBeDefined();
            expect(skill.animation.effectAnimation).toBeDefined();
            expect(skill.animation.duration).toBeGreaterThan(0);
        }
    });

    test('前提スキルの参照整合性が正しい', async () => {
        // 実際のファイルを読み込んでモックに設定
        const skillsJsonPath = path.join(__dirname, '../../../../data/skills.json');
        const skillsJsonContent = fs.readFileSync(skillsJsonPath, 'utf-8');

        mockFetchForNodeJS.mockResolvedValueOnce({
            ok: true,
            text: jest.fn().mockResolvedValue(skillsJsonContent)
        });

        const result = await loader.loadSkillData();

        expect(result.success).toBe(true);

        const skillIds = new Set(result.skills!.map(skill => skill.id));

        for (const skill of result.skills!) {
            if (skill.learnCondition.prerequisiteSkills) {
                for (const prerequisiteId of skill.learnCondition.prerequisiteSkills) {
                    expect(skillIds.has(prerequisiteId)).toBe(true);
                }
            }
        }
    });

    test('スキルIDに重複がない', async () => {
        // 実際のファイルを読み込んでモックに設定
        const skillsJsonPath = path.join(__dirname, '../../../../data/skills.json');
        const skillsJsonContent = fs.readFileSync(skillsJsonPath, 'utf-8');

        mockFetchForNodeJS.mockResolvedValueOnce({
            ok: true,
            text: jest.fn().mockResolvedValue(skillsJsonContent)
        });

        const result = await loader.loadSkillData();

        expect(result.success).toBe(true);

        const skillIds = result.skills!.map(skill => skill.id);
        const uniqueIds = new Set(skillIds);

        expect(skillIds.length).toBe(uniqueIds.size);
    });

    test('デフォルト値が正しく設定される', async () => {
        // 実際のファイルを読み込んでモックに設定
        const skillsJsonPath = path.join(__dirname, '../../../../data/skills.json');
        const skillsJsonContent = fs.readFileSync(skillsJsonPath, 'utf-8');

        mockFetchForNodeJS.mockResolvedValueOnce({
            ok: true,
            text: jest.fn().mockResolvedValue(skillsJsonContent)
        });

        const result = await loader.loadSkillData();

        expect(result.success).toBe(true);

        for (const skill of result.skills!) {
            // デフォルト値が設定されていることを確認
            expect(skill.icon).toBeDefined();
            expect(skill.aiPriority).toBeDefined();
            expect(skill.areaOfEffect.minRange).toBeDefined();

            for (const effect of skill.effects) {
                expect(effect.duration).toBeDefined();
                expect(effect.successRate).toBeDefined();
            }

            expect(skill.usageCondition.weaponRequirement).toBeDefined();
            expect(skill.usageCondition.allowedStatuses).toBeDefined();
            expect(skill.learnCondition.prerequisiteSkills).toBeDefined();
            expect(skill.learnCondition.requiredItems).toBeDefined();
            expect(skill.animation.hitAnimation).toBeDefined();
            expect(skill.animation.soundEffect).toBeDefined();
        }
    });
});