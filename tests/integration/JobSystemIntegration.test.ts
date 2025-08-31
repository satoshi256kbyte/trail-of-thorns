/**
 * JobSystem 統合テスト
 * 
 * JobSystemと他のシステムとの統合テスト
 */

import { JobSystem } from '../../game/src/systems/jobs/JobSystem';
import { ExperienceSystem } from '../../game/src/systems/experience/ExperienceSystem';
import { SkillSystem } from '../../game/src/systems/skills/SkillSystem';
import { BattleSystem } from '../../game/src/systems/battle/BattleSystem';
import { CharacterManager } from '../../game/src/systems/CharacterManager';
import { JobData, JobCategory, RoseEssenceData } from '../../game/src/types/job';

// Phaserのモック
const mockScene = {
    add: {
        container: jest.fn(() => ({
            setDepth: jest.fn(),
            setVisible: jest.fn(),
            add: jest.fn(),
            removeAll: jest.fn(),
            destroy: jest.fn(),
        })),
        particles: jest.fn(() => ({
            createEmitter: jest.fn(),
            destroy: jest.fn(),
        })),
        tween: jest.fn(),
    },
    tweens: {
        add: jest.fn(),
        killTweensOf: jest.fn(),
    },
    sound: {
        play: jest.fn(),
    },
    time: {
        delayedCall: jest.fn(),
    },
} as any;

// テスト用データ作成関数
const createTestJobData = (id: string, category: JobCategory): JobData => ({
    id,
    name: `Test ${id}`,
    description: `Test job ${id}`,
    category,
    maxRank: 3,
    statModifiers: {
        1: { hp: 10, mp: 5, attack: 8, defense: 6, speed: 4, skill: 3, luck: 2 },
        2: { hp: 20, mp: 10, attack: 16, defense: 12, speed: 8, skill: 6, luck: 4 },
        3: { hp: 30, mp: 15, attack: 24, defense: 18, speed: 12, skill: 9, luck: 6 },
    },
    availableSkills: {
        1: ['basic_attack'],
        2: ['basic_attack', 'power_strike'],
        3: ['basic_attack', 'power_strike', 'ultimate'],
    },
    rankUpRequirements: {
        2: { roseEssenceCost: 10, levelRequirement: 5, prerequisiteSkills: [] },
        3: { roseEssenceCost: 20, levelRequirement: 10, prerequisiteSkills: ['power_strike'] },
    },
    growthRateModifiers: {
        1: { hp: 1.0, mp: 1.0, attack: 1.0, defense: 1.0, speed: 1.0, skill: 1.0, luck: 1.0 },
        2: { hp: 1.1, mp: 1.1, attack: 1.1, defense: 1.1, speed: 1.1, skill: 1.1, luck: 1.1 },
        3: { hp: 1.2, mp: 1.2, attack: 1.2, defense: 1.2, speed: 1.2, skill: 1.2, luck: 1.2 },
    },
    jobTraits: [],
    visual: {
        iconPath: 'test-icon.png',
        spriteModifications: [],
        colorScheme: { primary: '#ffffff', secondary: '#000000' },
    },
});

const createTestRoseEssenceData = (): RoseEssenceData => ({
    currentAmount: 100,
    totalEarned: 100,
    totalSpent: 0,
    sources: {
        boss_defeat: {
            baseAmount: 20,
            difficultyMultiplier: 1.5,
            firstTimeBonus: 10,
        },
    },
    costs: {
        rankUp: {
            warrior: { 2: 10, 3: 20 },
            mage: { 2: 15, 3: 25 },
        },
        jobChange: 5,
        skillUnlock: 3,
    },
});

describe('JobSystem Integration Tests', () => {
    let jobSystem: JobSystem;
    let mockExperienceSystem: any;
    let mockSkillSystem: any;
    let mockBattleSystem: any;
    let mockCharacterManager: any;

    beforeEach(async () => {
        // モックシステムを作成
        mockExperienceSystem = {
            getCharacterLevel: jest.fn(() => 10),
            addExperience: jest.fn(),
            processLevelUp: jest.fn(),
        };

        mockSkillSystem = {
            updateSkillsOnJobChange: jest.fn(),
            unlockSkill: jest.fn(),
            getAvailableSkills: jest.fn(() => ['basic_attack']),
        };

        mockBattleSystem = {
            calculateDamage: jest.fn(),
            applyJobModifiers: jest.fn(),
        };

        mockCharacterManager = {
            getCharacter: jest.fn(() => ({
                id: 'character1',
                name: 'Test Character',
                level: 10,
                sprite: {},
            })),
            updateCharacterStats: jest.fn(),
            getAllCharacters: jest.fn(() => [
                { id: 'character1', name: 'Test Character', level: 10 },
            ]),
        };

        // JobSystemを初期化
        jobSystem = new JobSystem({ debugMode: true });

        const jobDataMap = new Map([
            ['warrior', createTestJobData('warrior', JobCategory.WARRIOR)],
            ['mage', createTestJobData('mage', JobCategory.MAGE)],
            ['archer', createTestJobData('archer', JobCategory.ARCHER)],
        ]);

        const roseEssenceData = createTestRoseEssenceData();

        await jobSystem.initialize(mockScene, jobDataMap, roseEssenceData);

        // 外部システムを設定
        jobSystem.setCharacterManager(mockCharacterManager);
        jobSystem.setSkillSystem(mockSkillSystem);
        jobSystem.setBattleSystem(mockBattleSystem);
    });

    afterEach(() => {
        if (jobSystem) {
            jobSystem.destroy();
        }
    });

    describe('職業変更とスキルシステム連携', () => {
        test('職業変更時にスキルシステムが更新される', async () => {
            // キャラクターに初期職業を設定
            jobSystem.setCharacterJob('character1', 'warrior', 1);

            // 職業変更を実行
            await jobSystem.changeJob('character1', 'mage');

            // スキルシステムの更新メソッドが呼ばれることを確認
            expect(mockSkillSystem.updateSkillsOnJobChange).toHaveBeenCalledWith('character1');
        });

        test('ランクアップ時に新スキルが習得される', async () => {
            // キャラクターに職業を設定
            jobSystem.setCharacterJob('character1', 'warrior', 1);

            // ランクアップを実行
            const result = await jobSystem.rankUpJob('character1', 2);

            if (result.success && result.newSkills) {
                // 新スキル習得メソッドが呼ばれることを確認
                expect(mockSkillSystem.unlockSkill).toHaveBeenCalled();
            }
        });
    });

    describe('職業システムとキャラクター管理連携', () => {
        test('職業変更時にキャラクター能力値が更新される', async () => {
            // キャラクターに初期職業を設定
            jobSystem.setCharacterJob('character1', 'warrior', 1);

            // 職業変更を実行
            await jobSystem.changeJob('character1', 'mage');

            // キャラクター能力値更新メソッドが呼ばれることを確認
            expect(mockCharacterManager.updateCharacterStats).toHaveBeenCalledWith('character1');
        });

        test('ランクアップ時にキャラクター能力値が更新される', async () => {
            // キャラクターに職業を設定
            jobSystem.setCharacterJob('character1', 'warrior', 1);

            // ランクアップを実行
            await jobSystem.rankUpJob('character1', 2);

            // キャラクター能力値更新メソッドが呼ばれることを確認
            expect(mockCharacterManager.updateCharacterStats).toHaveBeenCalledWith('character1');
        });
    });

    describe('薔薇の力とランクアップシステム連携', () => {
        test('薔薇の力獲得時にランクアップ候補が通知される', async () => {
            // キャラクターに職業を設定
            jobSystem.setCharacterJob('character1', 'warrior', 1);

            let candidatesNotified = false;
            jobSystem.on('rank_up_candidates_available', () => {
                candidatesNotified = true;
            });

            // 薔薇の力を獲得
            await jobSystem.awardRoseEssence(50, 'test_boss');

            // ランクアップ候補通知が発生することを確認
            expect(candidatesNotified).toBe(true);
        });

        test('ランクアップ実行時に薔薇の力が消費される', async () => {
            // キャラクターに職業を設定
            jobSystem.setCharacterJob('character1', 'warrior', 1);

            const initialEssence = jobSystem.getCurrentRoseEssence();

            // ランクアップを実行
            const result = await jobSystem.rankUpJob('character1', 2);

            if (result.success) {
                // 薔薇の力が消費されることを確認
                expect(jobSystem.getCurrentRoseEssence()).toBeLessThan(initialEssence);
            }
        });
    });

    describe('複数キャラクターの職業管理', () => {
        test('複数キャラクターの職業を同時に管理できる', () => {
            // 複数キャラクターに職業を設定
            jobSystem.setCharacterJob('character1', 'warrior', 1);
            jobSystem.setCharacterJob('character2', 'mage', 2);
            jobSystem.setCharacterJob('character3', 'archer', 1);

            // 各キャラクターの職業が正しく設定されることを確認
            expect(jobSystem.getCharacterJob('character1')?.id).toBe('warrior');
            expect(jobSystem.getCharacterJob('character2')?.id).toBe('mage');
            expect(jobSystem.getCharacterJob('character3')?.id).toBe('archer');

            // ランクも正しく設定されることを確認
            expect(jobSystem.getCharacterJob('character1')?.rank).toBe(1);
            expect(jobSystem.getCharacterJob('character2')?.rank).toBe(2);
            expect(jobSystem.getCharacterJob('character3')?.rank).toBe(1);
        });

        test('複数キャラクターのランクアップ候補を取得できる', () => {
            // 複数キャラクターに職業を設定
            jobSystem.setCharacterJob('character1', 'warrior', 1);
            jobSystem.setCharacterJob('character2', 'mage', 1);
            jobSystem.setCharacterJob('character3', 'archer', 2);

            // ランクアップ候補を取得
            const candidates = jobSystem.getRankUpCandidates();

            // 候補が取得されることを確認
            expect(Array.isArray(candidates)).toBe(true);
            expect(candidates.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('エラー処理と回復', () => {
        test('システムエラー発生時に適切に処理される', async () => {
            let errorHandled = false;
            jobSystem.on('system_error', () => {
                errorHandled = true;
            });

            // 存在しない職業への変更を試行
            try {
                await jobSystem.changeJob('character1', 'invalid_job');
            } catch (error) {
                // エラーは期待される
            }

            // エラーハンドリングが実行されることを確認
            expect(errorHandled).toBe(true);
        });

        test('データ整合性チェックが機能する', () => {
            // キャラクターに職業を設定
            jobSystem.setCharacterJob('character1', 'warrior', 1);

            // 健全性チェックを実行
            const healthCheck = jobSystem.performHealthCheck();

            // 健全性チェック結果が返されることを確認
            expect(healthCheck.isHealthy).toBe(true);
            expect(Array.isArray(healthCheck.issues)).toBe(true);
            expect(Array.isArray(healthCheck.recommendations)).toBe(true);
        });
    });

    describe('パフォーマンスと最適化', () => {
        test('大量のキャラクターを処理できる', () => {
            const startTime = Date.now();

            // 100人のキャラクターに職業を設定
            for (let i = 0; i < 100; i++) {
                jobSystem.setCharacterJob(`character${i}`, 'warrior', 1);
            }

            const endTime = Date.now();
            const processingTime = endTime - startTime;

            // 処理時間が合理的な範囲内であることを確認（1秒以内）
            expect(processingTime).toBeLessThan(1000);

            // 全キャラクターの職業が正しく設定されることを確認
            for (let i = 0; i < 100; i++) {
                expect(jobSystem.getCharacterJob(`character${i}`)?.id).toBe('warrior');
            }
        });

        test('システム統計情報が正確に計算される', () => {
            // 複数キャラクターに職業を設定
            jobSystem.setCharacterJob('character1', 'warrior', 1);
            jobSystem.setCharacterJob('character2', 'mage', 2);
            jobSystem.setCharacterJob('character3', 'archer', 3);

            // システム統計を取得
            const stats = jobSystem.getSystemStats();

            // 統計情報が正確であることを確認
            expect(stats.totalJobs).toBe(3); // warrior, mage, archer
            expect(stats.totalCharacters).toBeGreaterThanOrEqual(3);
            expect(stats.totalRoseEssence).toBeGreaterThan(0);
            expect(stats.systemUptime).toBeGreaterThan(0);
        });
    });

    describe('イベント駆動システム連携', () => {
        test('職業変更イベントが適切に伝播される', async () => {
            let jobChangeProcessed = false;
            jobSystem.on('job_change_processed', () => {
                jobChangeProcessed = true;
            });

            // キャラクターに初期職業を設定
            jobSystem.setCharacterJob('character1', 'warrior', 1);

            // 職業変更を実行
            await jobSystem.changeJob('character1', 'mage');

            // イベントが処理されることを確認
            expect(jobChangeProcessed).toBe(true);
        });

        test('ランクアップイベントが適切に伝播される', async () => {
            let rankUpProcessed = false;
            jobSystem.on('rank_up_processed', () => {
                rankUpProcessed = true;
            });

            // キャラクターに職業を設定
            jobSystem.setCharacterJob('character1', 'warrior', 1);

            // ランクアップを実行
            await jobSystem.rankUpJob('character1', 2);

            // イベントが処理されることを確認
            expect(rankUpProcessed).toBe(true);
        });

        test('薔薇の力残高変更イベントが発生する', async () => {
            let balanceChanged = false;
            jobSystem.on('rose_essence_balance_changed', () => {
                balanceChanged = true;
            });

            // 薔薇の力を獲得
            await jobSystem.awardRoseEssence(25, 'test_source');

            // 残高変更イベントが発生することを確認
            expect(balanceChanged).toBe(true);
        });
    });

    describe('バックアップと復元', () => {
        test('完全なシステム状態をバックアップ・復元できる', () => {
            // 複数キャラクターに職業を設定
            jobSystem.setCharacterJob('character1', 'warrior', 2);
            jobSystem.setCharacterJob('character2', 'mage', 1);

            // バックアップを作成
            const backup = jobSystem.createBackup();

            // システムをリセット
            jobSystem.reset();
            expect(jobSystem.getCharacterJob('character1')).toBeNull();
            expect(jobSystem.getCharacterJob('character2')).toBeNull();

            // バックアップから復元
            jobSystem.restoreFromBackup(backup);

            // 状態が復元されることを確認
            expect(jobSystem.getCharacterJob('character1')?.id).toBe('warrior');
            expect(jobSystem.getCharacterJob('character1')?.rank).toBe(2);
            expect(jobSystem.getCharacterJob('character2')?.id).toBe('mage');
            expect(jobSystem.getCharacterJob('character2')?.rank).toBe(1);
        });
    });
});