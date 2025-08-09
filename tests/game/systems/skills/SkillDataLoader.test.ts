/**
 * SkillDataLoaderのユニットテスト
 * 
 * このファイルには以下のテストが含まれます：
 * - スキルデータの読み込み機能のテスト
 * - JSONスキーマ検証のテスト
 * - 参照整合性チェックのテスト
 * - エラーハンドリングのテスト
 * - キャッシュ機能のテスト
 */

import {
    SkillDataLoader,
    SkillDataLoaderError,
    SkillDataLoadResult,
    SchemaValidationResult,
    ReferenceIntegrityResult
} from '../../../../game/src/systems/skills/SkillDataLoader';

import {
    SkillData,
    SkillType,
    TargetType,
    DamageType
} from '../../../../game/src/types/skill';

// モック用のfetch関数
const mockFetch = jest.fn();
global.fetch = mockFetch;

// AbortSignal.timeoutのモック
global.AbortSignal = {
    timeout: jest.fn().mockImplementation((timeout: number) => ({
        aborted: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
    }))
} as any;

describe('SkillDataLoader', () => {
    let loader: SkillDataLoader;

    beforeEach(() => {
        loader = new SkillDataLoader({
            dataFilePath: 'test/skills.json',
            strictValidation: true,
            ignoreWarnings: false,
            useCache: false,
            timeout: 1000,
            retryCount: 1
        });
        mockFetch.mockClear();
    });

    describe('loadSkillData', () => {
        const validSkillData = {
            skills: [
                {
                    id: 'test_skill',
                    name: 'テストスキル',
                    description: 'テスト用のスキル',
                    skillType: 'attack',
                    targetType: 'single_enemy',
                    range: 1,
                    areaOfEffect: {
                        shape: 'single',
                        size: 0
                    },
                    effects: [
                        {
                            type: 'damage',
                            value: 100,
                            damageType: 'physical',
                            successRate: 95
                        }
                    ],
                    usageCondition: {
                        mpCost: 0,
                        cooldown: 0,
                        usageLimit: 0,
                        levelRequirement: 1
                    },
                    learnCondition: {
                        level: 1
                    },
                    animation: {
                        castAnimation: 'test_cast',
                        effectAnimation: 'test_effect',
                        duration: 1000
                    }
                }
            ]
        };

        test('正常なスキルデータを読み込める', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue(JSON.stringify(validSkillData))
            });

            const result = await loader.loadSkillData();

            expect(result.success).toBe(true);
            expect(result.skills).toHaveLength(1);
            expect(result.skills![0].id).toBe('test_skill');
            expect(result.skills![0].name).toBe('テストスキル');
        });

        test('ファイルが見つからない場合はエラーを返す', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found'
            });

            const result = await loader.loadSkillData();

            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillDataLoaderError.FILE_LOAD_ERROR);
            expect(result.message).toContain('HTTP 404');
        });

        test('無効なJSONの場合はエラーを返す', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue('invalid json {')
            });

            const result = await loader.loadSkillData();

            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillDataLoaderError.JSON_PARSE_ERROR);
            expect(result.message).toContain('JSONの解析に失敗');
        });

        test('空のファイルの場合はエラーを返す', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue('')
            });

            const result = await loader.loadSkillData();

            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillDataLoaderError.FILE_LOAD_ERROR);
            expect(result.message).toContain('ファイルが空です');
        });

        test('タイムアウトの場合はエラーを返す', async () => {
            const timeoutError = new Error('Timeout');
            timeoutError.name = 'AbortError';
            mockFetch.mockRejectedValueOnce(timeoutError);

            const result = await loader.loadSkillData();

            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillDataLoaderError.NETWORK_ERROR);
            expect(result.message).toContain('タイムアウト');
        });

        test('リトライ機能が動作する', async () => {
            // 最初の2回は失敗、3回目は成功
            mockFetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    text: jest.fn().mockResolvedValue(JSON.stringify(validSkillData))
                });

            const result = await loader.loadSkillData();

            expect(result.success).toBe(true);
            expect(mockFetch).toHaveBeenCalledTimes(3);
        });

        test('配列形式のスキルデータも読み込める', async () => {
            const arraySkillData = validSkillData.skills;

            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue(JSON.stringify(arraySkillData))
            });

            const result = await loader.loadSkillData();

            expect(result.success).toBe(true);
            expect(result.skills).toHaveLength(1);
        });
    });

    describe('スキーマ検証', () => {
        test('必須フィールドが不足している場合はエラーを返す', async () => {
            const invalidData = {
                skills: [
                    {
                        id: 'test_skill',
                        name: 'テストスキル'
                        // 他の必須フィールドが不足
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue(JSON.stringify(invalidData))
            });

            const result = await loader.loadSkillData();

            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillDataLoaderError.SCHEMA_VALIDATION_ERROR);
            expect(result.details).toContain('必須フィールド');
        });

        test('無効なスキル種別の場合はエラーを返す', async () => {
            const invalidData = {
                skills: [
                    {
                        id: 'test_skill',
                        name: 'テストスキル',
                        description: 'テスト用のスキル',
                        skillType: 'invalid_type', // 無効な種別
                        targetType: 'single_enemy',
                        range: 1,
                        areaOfEffect: { shape: 'single', size: 0 },
                        effects: [{ type: 'damage', value: 100 }],
                        usageCondition: { mpCost: 0, cooldown: 0, usageLimit: 0, levelRequirement: 1 },
                        learnCondition: { level: 1 },
                        animation: { castAnimation: 'test', effectAnimation: 'test', duration: 1000 }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue(JSON.stringify(invalidData))
            });

            const result = await loader.loadSkillData();

            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillDataLoaderError.SCHEMA_VALIDATION_ERROR);
            expect(result.details).toContain('無効なスキル種別');
        });

        test('無効な射程の場合はエラーを返す', async () => {
            const invalidData = {
                skills: [
                    {
                        id: 'test_skill',
                        name: 'テストスキル',
                        description: 'テスト用のスキル',
                        skillType: 'attack',
                        targetType: 'single_enemy',
                        range: -1, // 無効な射程
                        areaOfEffect: { shape: 'single', size: 0 },
                        effects: [{ type: 'damage', value: 100 }],
                        usageCondition: { mpCost: 0, cooldown: 0, usageLimit: 0, levelRequirement: 1 },
                        learnCondition: { level: 1 },
                        animation: { castAnimation: 'test', effectAnimation: 'test', duration: 1000 }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue(JSON.stringify(invalidData))
            });

            const result = await loader.loadSkillData();

            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillDataLoaderError.SCHEMA_VALIDATION_ERROR);
            expect(result.details).toContain('射程は0-20の数値');
        });

        test('効果が空の場合はエラーを返す', async () => {
            const invalidData = {
                skills: [
                    {
                        id: 'test_skill',
                        name: 'テストスキル',
                        description: 'テスト用のスキル',
                        skillType: 'attack',
                        targetType: 'single_enemy',
                        range: 1,
                        areaOfEffect: { shape: 'single', size: 0 },
                        effects: [], // 空の効果配列
                        usageCondition: { mpCost: 0, cooldown: 0, usageLimit: 0, levelRequirement: 1 },
                        learnCondition: { level: 1 },
                        animation: { castAnimation: 'test', effectAnimation: 'test', duration: 1000 }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue(JSON.stringify(invalidData))
            });

            const result = await loader.loadSkillData();

            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillDataLoaderError.SCHEMA_VALIDATION_ERROR);
            expect(result.details).toContain('効果は空でない配列');
        });
    });

    describe('参照整合性チェック', () => {
        test('存在しない前提スキルがある場合はエラーを返す', async () => {
            const invalidData = {
                skills: [
                    {
                        id: 'advanced_skill',
                        name: '上級スキル',
                        description: '上級者向けのスキル',
                        skillType: 'attack',
                        targetType: 'single_enemy',
                        range: 1,
                        areaOfEffect: { shape: 'single', size: 0 },
                        effects: [{ type: 'damage', value: 150 }],
                        usageCondition: { mpCost: 10, cooldown: 1, usageLimit: 0, levelRequirement: 5 },
                        learnCondition: {
                            level: 5,
                            prerequisiteSkills: ['nonexistent_skill'] // 存在しないスキル
                        },
                        animation: { castAnimation: 'test', effectAnimation: 'test', duration: 1000 }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue(JSON.stringify(invalidData))
            });

            const result = await loader.loadSkillData();

            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillDataLoaderError.REFERENCE_INTEGRITY_ERROR);
            expect(result.details).toContain('前提スキル「nonexistent_skill」が見つかりません');
        });

        test('循環参照がある場合はエラーを返す', async () => {
            const invalidData = {
                skills: [
                    {
                        id: 'skill_a',
                        name: 'スキルA',
                        description: 'スキルA',
                        skillType: 'attack',
                        targetType: 'single_enemy',
                        range: 1,
                        areaOfEffect: { shape: 'single', size: 0 },
                        effects: [{ type: 'damage', value: 100 }],
                        usageCondition: { mpCost: 5, cooldown: 0, usageLimit: 0, levelRequirement: 1 },
                        learnCondition: {
                            level: 1,
                            prerequisiteSkills: ['skill_b'] // skill_bを前提とする
                        },
                        animation: { castAnimation: 'test', effectAnimation: 'test', duration: 1000 }
                    },
                    {
                        id: 'skill_b',
                        name: 'スキルB',
                        description: 'スキルB',
                        skillType: 'attack',
                        targetType: 'single_enemy',
                        range: 1,
                        areaOfEffect: { shape: 'single', size: 0 },
                        effects: [{ type: 'damage', value: 100 }],
                        usageCondition: { mpCost: 5, cooldown: 0, usageLimit: 0, levelRequirement: 1 },
                        learnCondition: {
                            level: 1,
                            prerequisiteSkills: ['skill_a'] // skill_aを前提とする（循環参照）
                        },
                        animation: { castAnimation: 'test', effectAnimation: 'test', duration: 1000 }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue(JSON.stringify(invalidData))
            });

            const result = await loader.loadSkillData();

            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillDataLoaderError.REFERENCE_INTEGRITY_ERROR);
            expect(result.details).toContain('循環参照が検出されました');
        });

        test('正常な前提スキル関係の場合は成功する', async () => {
            const validData = {
                skills: [
                    {
                        id: 'basic_skill',
                        name: '基本スキル',
                        description: '基本的なスキル',
                        skillType: 'attack',
                        targetType: 'single_enemy',
                        range: 1,
                        areaOfEffect: { shape: 'single', size: 0 },
                        effects: [{ type: 'damage', value: 100 }],
                        usageCondition: { mpCost: 0, cooldown: 0, usageLimit: 0, levelRequirement: 1 },
                        learnCondition: { level: 1 },
                        animation: { castAnimation: 'test', effectAnimation: 'test', duration: 1000 }
                    },
                    {
                        id: 'advanced_skill',
                        name: '上級スキル',
                        description: '上級者向けのスキル',
                        skillType: 'attack',
                        targetType: 'single_enemy',
                        range: 1,
                        areaOfEffect: { shape: 'single', size: 0 },
                        effects: [{ type: 'damage', value: 150 }],
                        usageCondition: { mpCost: 10, cooldown: 1, usageLimit: 0, levelRequirement: 5 },
                        learnCondition: {
                            level: 5,
                            prerequisiteSkills: ['basic_skill'] // 正常な前提スキル
                        },
                        animation: { castAnimation: 'test', effectAnimation: 'test', duration: 1000 }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue(JSON.stringify(validData))
            });

            const result = await loader.loadSkillData();

            expect(result.success).toBe(true);
            expect(result.skills).toHaveLength(2);
        });
    });

    describe('重複IDチェック', () => {
        test('重複するスキルIDがある場合はエラーを返す', async () => {
            const invalidData = {
                skills: [
                    {
                        id: 'duplicate_skill',
                        name: 'スキル1',
                        description: 'スキル1',
                        skillType: 'attack',
                        targetType: 'single_enemy',
                        range: 1,
                        areaOfEffect: { shape: 'single', size: 0 },
                        effects: [{ type: 'damage', value: 100 }],
                        usageCondition: { mpCost: 0, cooldown: 0, usageLimit: 0, levelRequirement: 1 },
                        learnCondition: { level: 1 },
                        animation: { castAnimation: 'test', effectAnimation: 'test', duration: 1000 }
                    },
                    {
                        id: 'duplicate_skill', // 重複するID
                        name: 'スキル2',
                        description: 'スキル2',
                        skillType: 'heal',
                        targetType: 'single_ally',
                        range: 2,
                        areaOfEffect: { shape: 'single', size: 0 },
                        effects: [{ type: 'heal', value: 50 }],
                        usageCondition: { mpCost: 5, cooldown: 0, usageLimit: 0, levelRequirement: 1 },
                        learnCondition: { level: 1 },
                        animation: { castAnimation: 'test', effectAnimation: 'test', duration: 1000 }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue(JSON.stringify(invalidData))
            });

            const result = await loader.loadSkillData();

            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillDataLoaderError.DUPLICATE_SKILL_ID_ERROR);
            expect(result.details).toContain('duplicate_skill');
        });
    });

    describe('データ正規化', () => {
        test('デフォルト値が正しく設定される', async () => {
            const minimalData = {
                skills: [
                    {
                        id: 'minimal_skill',
                        name: 'ミニマルスキル',
                        description: 'ミニマルなスキル',
                        skillType: 'attack',
                        targetType: 'single_enemy',
                        range: 1,
                        areaOfEffect: { shape: 'single', size: 0 },
                        effects: [{ type: 'damage', value: 100 }],
                        usageCondition: { mpCost: 0, cooldown: 0, usageLimit: 0, levelRequirement: 1 },
                        learnCondition: { level: 1 },
                        animation: { castAnimation: 'test', effectAnimation: 'test', duration: 1000 }
                        // オプションフィールドは省略
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue(JSON.stringify(minimalData))
            });

            const result = await loader.loadSkillData();

            expect(result.success).toBe(true);
            const skill = result.skills![0];

            // デフォルト値が設定されていることを確認
            expect(skill.icon).toBe('default_skill_icon');
            expect(skill.aiPriority).toBe(50);
            expect(skill.areaOfEffect.minRange).toBe(0);
            expect(skill.effects[0].duration).toBe(0);
            expect(skill.effects[0].successRate).toBe(100);
            expect(skill.usageCondition.weaponRequirement).toEqual([]);
            expect(skill.usageCondition.allowedStatuses).toEqual([]);
            expect(skill.learnCondition.prerequisiteSkills).toEqual([]);
            expect(skill.learnCondition.requiredItems).toEqual([]);
            expect(skill.animation.hitAnimation).toBe('test');
            expect(skill.animation.soundEffect).toBe('default_skill_sound');
        });
    });

    describe('キャッシュ機能', () => {
        test('キャッシュが有効な場合は2回目以降はキャッシュから読み込む', async () => {
            const loaderWithCache = new SkillDataLoader({
                useCache: true
            });

            const validData = {
                skills: [
                    {
                        id: 'cached_skill',
                        name: 'キャッシュスキル',
                        description: 'キャッシュテスト用のスキル',
                        skillType: 'attack',
                        targetType: 'single_enemy',
                        range: 1,
                        areaOfEffect: { shape: 'single', size: 0 },
                        effects: [{ type: 'damage', value: 100 }],
                        usageCondition: { mpCost: 0, cooldown: 0, usageLimit: 0, levelRequirement: 1 },
                        learnCondition: { level: 1 },
                        animation: { castAnimation: 'test', effectAnimation: 'test', duration: 1000 }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue(JSON.stringify(validData))
            });

            // 1回目の読み込み
            const result1 = await loaderWithCache.loadSkillData();
            expect(result1.success).toBe(true);
            expect(mockFetch).toHaveBeenCalledTimes(1);

            // 2回目の読み込み（キャッシュから）
            const result2 = await loaderWithCache.loadSkillData();
            expect(result2.success).toBe(true);
            expect(result2.warnings).toContain('キャッシュからデータを読み込みました');
            expect(mockFetch).toHaveBeenCalledTimes(1); // fetchは1回のみ
        });

        test('forceReloadがtrueの場合はキャッシュを無視する', async () => {
            const loaderWithCache = new SkillDataLoader({
                useCache: true
            });

            const validData = {
                skills: [
                    {
                        id: 'reload_skill',
                        name: 'リロードスキル',
                        description: 'リロードテスト用のスキル',
                        skillType: 'attack',
                        targetType: 'single_enemy',
                        range: 1,
                        areaOfEffect: { shape: 'single', size: 0 },
                        effects: [{ type: 'damage', value: 100 }],
                        usageCondition: { mpCost: 0, cooldown: 0, usageLimit: 0, levelRequirement: 1 },
                        learnCondition: { level: 1 },
                        animation: { castAnimation: 'test', effectAnimation: 'test', duration: 1000 }
                    }
                ]
            };

            mockFetch.mockResolvedValue({
                ok: true,
                text: jest.fn().mockResolvedValue(JSON.stringify(validData))
            });

            // 1回目の読み込み
            await loaderWithCache.loadSkillData();
            expect(mockFetch).toHaveBeenCalledTimes(1);

            // 2回目の読み込み（強制リロード）
            await loaderWithCache.loadSkillData(true);
            expect(mockFetch).toHaveBeenCalledTimes(2); // fetchが2回呼ばれる
        });

        test('キャッシュクリア機能が動作する', async () => {
            const loaderWithCache = new SkillDataLoader({
                useCache: true
            });

            const validData = {
                skills: [
                    {
                        id: 'clear_cache_skill',
                        name: 'キャッシュクリアスキル',
                        description: 'キャッシュクリアテスト用のスキル',
                        skillType: 'attack',
                        targetType: 'single_enemy',
                        range: 1,
                        areaOfEffect: { shape: 'single', size: 0 },
                        effects: [{ type: 'damage', value: 100 }],
                        usageCondition: { mpCost: 0, cooldown: 0, usageLimit: 0, levelRequirement: 1 },
                        learnCondition: { level: 1 },
                        animation: { castAnimation: 'test', effectAnimation: 'test', duration: 1000 }
                    }
                ]
            };

            mockFetch.mockResolvedValue({
                ok: true,
                text: jest.fn().mockResolvedValue(JSON.stringify(validData))
            });

            // データを読み込んでキャッシュに保存
            await loaderWithCache.loadSkillData();
            expect(loaderWithCache.getCachedSkillCount()).toBe(1);

            // キャッシュをクリア
            loaderWithCache.clearCache();
            expect(loaderWithCache.getCachedSkillCount()).toBe(0);
            expect(loaderWithCache.getLastLoadTime()).toBeNull();
        });
    });

    describe('設定管理', () => {
        test('設定を更新できる', () => {
            const newConfig = {
                strictValidation: false,
                timeout: 2000
            };

            loader.updateConfig(newConfig);
            const currentConfig = loader.getConfig();

            expect(currentConfig.strictValidation).toBe(false);
            expect(currentConfig.timeout).toBe(2000);
            expect(currentConfig.dataFilePath).toBe('test/skills.json'); // 他の設定は保持される
        });

        test('現在の設定を取得できる', () => {
            const config = loader.getConfig();

            expect(config.dataFilePath).toBe('test/skills.json');
            expect(config.strictValidation).toBe(true);
            expect(config.ignoreWarnings).toBe(false);
            expect(config.useCache).toBe(false);
            expect(config.timeout).toBe(1000);
            expect(config.retryCount).toBe(1);
        });
    });

    describe('エラーハンドリング', () => {
        test('予期しないエラーが発生した場合は適切にハンドリングする', async () => {
            // fetchが予期しないエラーを投げる
            mockFetch.mockImplementation(() => {
                throw new Error('Unexpected error');
            });

            const result = await loader.loadSkillData();

            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillDataLoaderError.FILE_LOAD_ERROR);
            expect(result.message).toContain('スキルデータの読み込み中にエラーが発生しました');
        });

        test('厳密でない検証モードでは参照整合性エラーを警告として扱う', async () => {
            const loaderNonStrict = new SkillDataLoader({
                strictValidation: false
            });

            const invalidData = {
                skills: [
                    {
                        id: 'skill_with_missing_prerequisite',
                        name: 'スキル',
                        description: 'スキル',
                        skillType: 'attack',
                        targetType: 'single_enemy',
                        range: 1,
                        areaOfEffect: { shape: 'single', size: 0 },
                        effects: [{ type: 'damage', value: 100 }],
                        usageCondition: { mpCost: 0, cooldown: 0, usageLimit: 0, levelRequirement: 1 },
                        learnCondition: {
                            level: 1,
                            prerequisiteSkills: ['nonexistent_skill']
                        },
                        animation: { castAnimation: 'test', effectAnimation: 'test', duration: 1000 }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: jest.fn().mockResolvedValue(JSON.stringify(invalidData))
            });

            const result = await loaderNonStrict.loadSkillData();

            // 厳密でないモードでは成功するが、警告が含まれる
            expect(result.success).toBe(true);
            expect(result.warnings).toBeDefined();
        });
    });
});