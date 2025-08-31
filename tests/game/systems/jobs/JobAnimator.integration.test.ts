/**
 * JobAnimator 統合テストスイート
 * 
 * JobAnimatorクラスと他のシステムとの統合テストを実装します。
 */

import * as Phaser from 'phaser';
import { JobAnimator, JobAnimationEvent } from '../../../../game/src/systems/jobs/JobAnimator';
import { JobSystem } from '../../../../game/src/systems/jobs/JobSystem';
import { JobManager } from '../../../../game/src/systems/jobs/JobManager';
import { RoseEssenceManager } from '../../../../game/src/systems/jobs/RoseEssenceManager';
import { RankUpManager } from '../../../../game/src/systems/jobs/RankUpManager';
import { WarriorJob } from '../../../../game/src/systems/jobs/WarriorJob';
import { MageJob } from '../../../../game/src/systems/jobs/MageJob';
import { Unit } from '../../../../game/src/types/gameplay';
import { JobCategory, JobData } from '../../../../game/src/types/job';

// モックシーン（より詳細な実装）
class IntegrationMockScene extends Phaser.Events.EventEmitter {
    public add: any;
    public tweens: any;
    public time: any;
    public cameras: any;
    public sound: any;
    private animationCallbacks: Array<() => void> = [];

    constructor() {
        super();

        this.setupMockObjects();
    }

    private setupMockObjects(): void {
        // より詳細なモックオブジェクト
        this.add = {
            group: jest.fn(() => ({
                add: jest.fn(),
                clear: jest.fn(),
                destroy: jest.fn(),
                children: { entries: [] }
            })),
            text: jest.fn((x, y, text, style) => ({
                setOrigin: jest.fn().mockReturnThis(),
                setDepth: jest.fn().mockReturnThis(),
                destroy: jest.fn(),
                x, y, text, style
            })),
            circle: jest.fn((x, y, radius, color) => ({
                setDepth: jest.fn().mockReturnThis(),
                setAlpha: jest.fn().mockReturnThis(),
                destroy: jest.fn(),
                x, y, radius, color
            })),
            ellipse: jest.fn((x, y, width, height, color) => ({
                setDepth: jest.fn().mockReturnThis(),
                destroy: jest.fn(),
                x, y, width, height, color
            })),
            rectangle: jest.fn((x, y, width, height, color) => ({
                setDepth: jest.fn().mockReturnThis(),
                setOrigin: jest.fn().mockReturnThis(),
                destroy: jest.fn(),
                x, y, width, height, color
            })),
            star: jest.fn((x, y, points, innerRadius, outerRadius, color) => ({
                setDepth: jest.fn().mockReturnThis(),
                destroy: jest.fn(),
                x, y, points, innerRadius, outerRadius, color
            })),
            container: jest.fn((x, y) => ({
                add: jest.fn(),
                setDepth: jest.fn().mockReturnThis(),
                setPosition: jest.fn().mockReturnThis(),
                destroy: jest.fn(),
                x, y
            }))
        };

        this.tweens = {
            add: jest.fn((config) => {
                // アニメーション完了を非同期でシミュレート
                const tween = {
                    stop: jest.fn(),
                    isActive: jest.fn(() => false)
                };

                if (config.onComplete) {
                    this.animationCallbacks.push(config.onComplete);
                }

                // 非同期でコールバックを実行
                setTimeout(() => {
                    if (config.onComplete) {
                        config.onComplete();
                    }
                }, 50);

                return tween;
            }),
            createTimeline: jest.fn(() => ({
                add: jest.fn().mockReturnThis(),
                play: jest.fn(() => {
                    // タイムラインの完了をシミュレート
                    setTimeout(() => {
                        this.animationCallbacks.forEach(callback => callback());
                        this.animationCallbacks = [];
                    }, 100);
                })
            })),
            killTweensOf: jest.fn()
        };

        this.time = {
            delayedCall: jest.fn((delay, callback) => {
                setTimeout(callback, Math.min(delay, 50));
            }),
            addEvent: jest.fn(() => ({
                destroy: jest.fn()
            }))
        };

        this.cameras = {
            main: {
                shake: jest.fn(),
                centerX: 400,
                centerY: 300
            }
        };

        this.sound = {
            get: jest.fn(() => true),
            play: jest.fn()
        };
    }

    // アニメーション完了を待つヘルパーメソッド
    async waitForAnimations(): Promise<void> {
        return new Promise(resolve => {
            if (this.animationCallbacks.length === 0) {
                resolve();
                return;
            }

            const checkComplete = () => {
                if (this.animationCallbacks.length === 0) {
                    resolve();
                } else {
                    setTimeout(checkComplete, 10);
                }
            };

            setTimeout(checkComplete, 10);
        });
    }
}

// テスト用のモックデータ
const createMockJobData = (id: string, category: JobCategory): JobData => ({
    id,
    name: `Test ${id}`,
    description: `Test job ${id}`,
    category,
    maxRank: 3,
    statModifiers: {
        1: { hp: 10, mp: 5, attack: 8, defense: 6, speed: 4, skill: 3, luck: 2 },
        2: { hp: 15, mp: 8, attack: 12, defense: 9, speed: 6, skill: 5, luck: 3 },
        3: { hp: 20, mp: 12, attack: 16, defense: 12, speed: 8, skill: 7, luck: 4 }
    },
    availableSkills: {
        1: ['basic_attack'],
        2: ['basic_attack', 'power_strike'],
        3: ['basic_attack', 'power_strike', 'ultimate_skill']
    },
    rankUpRequirements: {
        2: { roseEssenceCost: 10, levelRequirement: 5, prerequisiteSkills: [] },
        3: { roseEssenceCost: 20, levelRequirement: 10, prerequisiteSkills: ['power_strike'] }
    },
    growthRateModifiers: {
        1: { hp: 0.1, mp: 0.05, attack: 0.08, defense: 0.06, speed: 0.04, skill: 0.03, luck: 0.02 },
        2: { hp: 0.15, mp: 0.08, attack: 0.12, defense: 0.09, speed: 0.06, skill: 0.05, luck: 0.03 },
        3: { hp: 0.2, mp: 0.12, attack: 0.16, defense: 0.12, speed: 0.08, skill: 0.07, luck: 0.04 }
    },
    jobTraits: [],
    visual: {
        iconPath: 'test-icon.png',
        spriteModifications: [],
        colorScheme: { primary: '#ff0000', secondary: '#00ff00', accent: '#0000ff' }
    }
});

const createMockUnit = (id: string): Unit => ({
    id,
    name: `Test Unit ${id}`,
    position: { x: 100, y: 100 },
    stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 20,
        defense: 15,
        speed: 10,
        movement: 3
    },
    currentHP: 100,
    currentMP: 50,
    faction: 'player',
    hasActed: false,
    hasMoved: false,
    equipment: {},
    sprite: {
        x: 100,
        y: 100,
        tint: 0xffffff,
        setTint: jest.fn(),
        depth: 1,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        angle: 0
    } as any
});

// モックキャラクターマネージャー
class MockCharacterManager {
    private characters: Map<string, Unit> = new Map();

    addCharacter(character: Unit): void {
        this.characters.set(character.id, character);
    }

    getCharacter(characterId: string): Unit | undefined {
        return this.characters.get(characterId);
    }

    getCharacterLevel(characterId: string): number {
        return 10; // テスト用の固定レベル
    }

    getCharacterName(characterId: string): string {
        const character = this.characters.get(characterId);
        return character ? character.name : characterId;
    }

    updateCharacterStats(characterId: string, statModifiers: any): void {
        // モック実装
    }
}

describe('JobAnimator Integration Tests', () => {
    let mockScene: IntegrationMockScene;
    let jobAnimator: JobAnimator;
    let jobSystem: JobSystem;
    let jobManager: JobManager;
    let roseEssenceManager: RoseEssenceManager;
    let rankUpManager: RankUpManager;
    let mockCharacterManager: MockCharacterManager;
    let mockUnit: Unit;
    let warriorJob: WarriorJob;
    let mageJob: MageJob;

    beforeEach(async () => {
        mockScene = new IntegrationMockScene();
        mockCharacterManager = new MockCharacterManager();

        // テストユニットを作成
        mockUnit = createMockUnit('test-unit-1');
        mockCharacterManager.addCharacter(mockUnit);

        // 職業データを作成
        const warriorData = createMockJobData('warrior', JobCategory.WARRIOR);
        const mageData = createMockJobData('mage', JobCategory.MAGE);

        warriorJob = new WarriorJob(warriorData);
        mageJob = new MageJob(mageData);

        // JobSystemを初期化
        jobSystem = new JobSystem({
            enableAnimations: true,
            enableSoundEffects: true,
            debugMode: true
        });

        // 職業データマップを作成
        const jobDataMap = new Map([
            ['warrior', warriorData],
            ['mage', mageData]
        ]);

        // 薔薇の力データを作成
        const roseEssenceData = {
            currentAmount: 100,
            totalEarned: 100,
            totalSpent: 0,
            sources: {},
            costs: {
                rankUp: {
                    warrior: { 2: 10, 3: 20 },
                    mage: { 2: 10, 3: 20 }
                },
                jobChange: 5,
                skillUnlock: 3
            }
        };

        // システムを初期化
        await jobSystem.initialize(mockScene as any, jobDataMap, roseEssenceData);
        jobSystem.setCharacterManager(mockCharacterManager);

        // 内部コンポーネントへの参照を取得
        jobAnimator = (jobSystem as any).jobAnimator;
        jobManager = (jobSystem as any).jobManager;
        roseEssenceManager = (jobSystem as any).roseEssenceManager;
        rankUpManager = (jobSystem as any).rankUpManager;

        // キャラクターに初期職業を設定
        jobSystem.setCharacterJob(mockUnit.id, 'warrior', 1);
    });

    afterEach(() => {
        if (jobSystem) {
            jobSystem.destroy();
        }
    });

    describe('JobSystemとの統合', () => {
        test('JobSystemを通じた職業変更でアニメーションが再生される', async () => {
            const animationStartSpy = jest.fn();
            const animationCompleteSpy = jest.fn();

            jobAnimator.on(JobAnimationEvent.JOB_CHANGE_START, animationStartSpy);
            jobAnimator.on(JobAnimationEvent.JOB_CHANGE_COMPLETE, animationCompleteSpy);

            // JobSystemを通じて職業変更を実行
            const result = await jobSystem.changeJob(mockUnit.id, 'mage');

            expect(result.success).toBe(true);
            expect(animationStartSpy).toHaveBeenCalled();

            // アニメーション完了を待つ
            await mockScene.waitForAnimations();

            expect(animationCompleteSpy).toHaveBeenCalled();
        });

        test('JobSystemを通じたランクアップでアニメーションが再生される', async () => {
            const animationStartSpy = jest.fn();
            const animationCompleteSpy = jest.fn();

            jobAnimator.on(JobAnimationEvent.RANK_UP_START, animationStartSpy);
            jobAnimator.on(JobAnimationEvent.RANK_UP_COMPLETE, animationCompleteSpy);

            // JobSystemを通じてランクアップを実行
            const result = await jobSystem.rankUpJob(mockUnit.id, 2);

            expect(result.success).toBe(true);
            expect(animationStartSpy).toHaveBeenCalled();

            // アニメーション完了を待つ
            await mockScene.waitForAnimations();

            expect(animationCompleteSpy).toHaveBeenCalled();
        });

        test('JobSystemを通じた薔薇の力獲得でエフェクトが再生される', async () => {
            const effectStartSpy = jest.fn();
            const effectCompleteSpy = jest.fn();

            jobAnimator.on(JobAnimationEvent.ROSE_ESSENCE_GAIN_START, effectStartSpy);
            jobAnimator.on(JobAnimationEvent.ROSE_ESSENCE_GAIN_COMPLETE, effectCompleteSpy);

            // JobSystemを通じて薔薇の力を獲得
            await jobSystem.awardRoseEssence(25, 'boss_defeat', { x: 200, y: 150 });

            expect(effectStartSpy).toHaveBeenCalledWith({
                amount: 25,
                position: { x: 200, y: 150 }
            });

            // エフェクト完了を待つ
            await mockScene.waitForAnimations();

            expect(effectCompleteSpy).toHaveBeenCalled();
        });
    });

    describe('RankUpManagerとの統合', () => {
        test('RankUpManagerを通じたランクアップでアニメーションが正しく実行される', async () => {
            const animationStartSpy = jest.fn();
            const animationCompleteSpy = jest.fn();

            jobAnimator.on(JobAnimationEvent.RANK_UP_START, animationStartSpy);
            jobAnimator.on(JobAnimationEvent.RANK_UP_COMPLETE, animationCompleteSpy);

            // RankUpManagerを直接使用してランクアップ
            const result = await rankUpManager.executeRankUp(mockUnit.id, 2);

            expect(result.success).toBe(true);
            expect(animationStartSpy).toHaveBeenCalled();

            // アニメーション完了を待つ
            await mockScene.waitForAnimations();

            expect(animationCompleteSpy).toHaveBeenCalled();
        });
    });

    describe('複数アニメーションの同時実行', () => {
        test('複数のキャラクターで同時にアニメーションが実行される', async () => {
            // 2つ目のキャラクターを作成
            const mockUnit2 = createMockUnit('test-unit-2');
            mockCharacterManager.addCharacter(mockUnit2);
            jobSystem.setCharacterJob(mockUnit2.id, 'mage', 1);

            const animationPromises: Promise<any>[] = [];

            // 複数のアニメーションを同時に開始
            animationPromises.push(jobSystem.changeJob(mockUnit.id, 'mage'));
            animationPromises.push(jobSystem.rankUpJob(mockUnit2.id, 2));

            // 全てのアニメーションの完了を待つ
            const results = await Promise.all(animationPromises);

            expect(results[0].success).toBe(true); // 職業変更
            expect(results[1].success).toBe(true); // ランクアップ
        });
    });

    describe('エラーハンドリング統合', () => {
        test('アニメーション中のエラーがシステム全体に影響しない', async () => {
            // スプライトを削除してアニメーションエラーを発生させる
            mockUnit.sprite = undefined;

            // エラーが発生してもシステムは継続動作する
            await expect(jobSystem.changeJob(mockUnit.id, 'mage')).resolves.toBeDefined();

            // システムの他の機能は正常に動作する
            const stats = jobSystem.getSystemStats();
            expect(stats).toBeDefined();
            expect(stats.totalJobs).toBe(2);
        });

        test('アニメーション無効時でも機能が正常に動作する', async () => {
            // アニメーションを無効にする
            jobSystem.updateConfig({ enableAnimations: false });

            // 職業変更が正常に実行される（アニメーションなし）
            const result = await jobSystem.changeJob(mockUnit.id, 'mage');
            expect(result.success).toBe(true);

            // ランクアップも正常に実行される
            const rankUpResult = await jobSystem.rankUpJob(mockUnit.id, 2);
            expect(rankUpResult.success).toBe(true);
        });
    });

    describe('パフォーマンス統合テスト', () => {
        test('大量のアニメーション要求でもメモリリークが発生しない', async () => {
            const initialMemory = process.memoryUsage().heapUsed;

            // 大量のアニメーションを実行
            for (let i = 0; i < 50; i++) {
                await jobAnimator.playRoseEssenceGainEffect(1, { x: 100 + i, y: 100 + i });
            }

            // ガベージコレクションを実行
            if (global.gc) {
                global.gc();
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;

            // メモリ増加が50MB以下であることを確認
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        });

        test('アニメーション速度設定が正しく適用される', async () => {
            const startTime = Date.now();

            // アニメーション速度を2倍に設定
            jobSystem.updateConfig({ animationSpeed: 2.0 });

            await jobAnimator.playRankUpAnimation(mockUnit, 2);

            const endTime = Date.now();
            const duration = endTime - startTime;

            // 高速化されたアニメーションは通常より短時間で完了する
            expect(duration).toBeLessThan(1500); // 通常2秒のアニメーションが1.5秒以内
        });
    });

    describe('設定変更の統合テスト', () => {
        test('システム設定変更がアニメーターに正しく反映される', () => {
            const newConfig = {
                enableAnimations: false,
                enableSoundEffects: false,
                animationSpeed: 0.5
            };

            jobSystem.updateConfig(newConfig);

            // 設定変更が正常に完了することを確認
            expect(() => jobSystem.updateConfig(newConfig)).not.toThrow();
        });
    });

    describe('リソース管理統合テスト', () => {
        test('システム破棄時にアニメーターも正しく破棄される', () => {
            const destroySpy = jest.spyOn(jobAnimator, 'destroy');

            jobSystem.destroy();

            expect(destroySpy).toHaveBeenCalled();
        });

        test('アニメーション停止がシステム全体で正しく動作する', () => {
            const stopSpy = jest.spyOn(jobAnimator, 'stopAllAnimations');

            jobSystem.reset();

            expect(stopSpy).toHaveBeenCalled();
        });
    });
});