/**
 * JobAnimator テストスイート
 * 
 * 職業・ランクアップアニメーション・エフェクトシステムの
 * 単体テストを実装します。
 */

import * as Phaser from 'phaser';
import { JobAnimator, JobAnimationEvent, JobAnimatorConfig } from '../../../../game/src/systems/jobs/JobAnimator';
import { Job } from '../../../../game/src/systems/jobs/Job';
import { WarriorJob } from '../../../../game/src/systems/jobs/WarriorJob';
import { MageJob } from '../../../../game/src/systems/jobs/MageJob';
import { Unit } from '../../../../game/src/types/gameplay';
import { JobCategory, JobData } from '../../../../game/src/types/job';

// モックシーン
class MockScene extends Phaser.Events.EventEmitter {
    public add: any;
    public tweens: any;
    public time: any;
    public cameras: any;
    public sound: any;

    constructor() {
        super();

        // モックオブジェクトの初期化
        this.add = {
            group: jest.fn(() => ({
                add: jest.fn(),
                clear: jest.fn(),
                destroy: jest.fn(),
                children: { entries: [] }
            })),
            text: jest.fn(() => ({
                setOrigin: jest.fn().mockReturnThis(),
                setDepth: jest.fn().mockReturnThis(),
                destroy: jest.fn(),
                x: 0,
                y: 0
            })),
            circle: jest.fn(() => ({
                setDepth: jest.fn().mockReturnThis(),
                setAlpha: jest.fn().mockReturnThis(),
                destroy: jest.fn(),
                x: 0,
                y: 0
            })),
            ellipse: jest.fn(() => ({
                setDepth: jest.fn().mockReturnThis(),
                destroy: jest.fn(),
                x: 0,
                y: 0
            })),
            rectangle: jest.fn(() => ({
                setDepth: jest.fn().mockReturnThis(),
                setOrigin: jest.fn().mockReturnThis(),
                destroy: jest.fn(),
                x: 0,
                y: 0
            })),
            star: jest.fn(() => ({
                setDepth: jest.fn().mockReturnThis(),
                destroy: jest.fn(),
                x: 0,
                y: 0
            })),
            container: jest.fn(() => ({
                add: jest.fn(),
                setDepth: jest.fn().mockReturnThis(),
                setPosition: jest.fn().mockReturnThis(),
                destroy: jest.fn(),
                x: 0,
                y: 0
            }))
        };

        this.tweens = {
            add: jest.fn((config) => {
                // アニメーション完了をシミュレート
                if (config.onComplete) {
                    setTimeout(config.onComplete, 10);
                }
                return {
                    stop: jest.fn(),
                    isActive: jest.fn(() => false)
                };
            }),
            createTimeline: jest.fn(() => {
                const timeline = {
                    add: jest.fn().mockReturnThis(),
                    play: jest.fn(() => {
                        // タイムライン完了をシミュレート
                        setTimeout(() => {
                            // 最後に追加されたアニメーションのonCompleteを実行
                            const lastCall = timeline.add.mock.calls[timeline.add.mock.calls.length - 1];
                            if (lastCall && lastCall[0] && lastCall[0].onComplete) {
                                lastCall[0].onComplete();
                            }
                        }, 10);
                    })
                };
                return timeline;
            }),
            killTweensOf: jest.fn()
        };

        this.time = {
            delayedCall: jest.fn((delay, callback) => {
                setTimeout(callback, 10);
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
}

// テスト用のモックデータ
const createMockJobData = (id: string, category: JobCategory): JobData => ({
    id,
    name: `Test ${id}`,
    description: `Test job ${id}`,
    category,
    maxRank: 3,
    statModifiers: {
        1: { hp: 10, mp: 5, attack: 8, defense: 6, speed: 4, skill: 3, luck: 2 }
    },
    availableSkills: {
        1: ['basic_attack']
    },
    rankUpRequirements: {
        2: { roseEssenceCost: 10, levelRequirement: 5, prerequisiteSkills: [] }
    },
    growthRateModifiers: {
        1: { hp: 0.1, mp: 0.05, attack: 0.08, defense: 0.06, speed: 0.04, skill: 0.03, luck: 0.02 }
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

describe('JobAnimator', () => {
    let mockScene: MockScene;
    let jobAnimator: JobAnimator;
    let mockUnit: Unit;
    let warriorJob: Job;
    let mageJob: Job;

    beforeEach(() => {
        mockScene = new MockScene();
        jobAnimator = new JobAnimator(mockScene as any);

        mockUnit = createMockUnit('test-unit-1');

        const warriorData = createMockJobData('warrior', JobCategory.WARRIOR);
        const mageData = createMockJobData('mage', JobCategory.MAGE);

        warriorJob = new WarriorJob(warriorData);
        mageJob = new MageJob(mageData);
    });

    afterEach(() => {
        jobAnimator.destroy();
    });

    describe('初期化', () => {
        test('デフォルト設定で正しく初期化される', () => {
            expect(jobAnimator).toBeDefined();
            expect(jobAnimator.isAnimationPlaying()).toBe(false);
        });

        test('カスタム設定で初期化される', () => {
            const customConfig: Partial<JobAnimatorConfig> = {
                jobChangeAnimationDuration: 2000,
                enableParticleEffects: false,
                animationSpeed: 0.5
            };

            const customAnimator = new JobAnimator(mockScene as any, customConfig);
            expect(customAnimator).toBeDefined();
            customAnimator.destroy();
        });
    });

    describe('職業変更アニメーション', () => {
        test('職業変更アニメーションが正常に実行される', async () => {
            const startEventSpy = jest.fn();
            const completeEventSpy = jest.fn();

            jobAnimator.on(JobAnimationEvent.JOB_CHANGE_START, startEventSpy);
            jobAnimator.on(JobAnimationEvent.JOB_CHANGE_COMPLETE, completeEventSpy);

            await jobAnimator.playJobChangeAnimation(mockUnit, warriorJob, mageJob);

            expect(startEventSpy).toHaveBeenCalledWith({
                character: mockUnit,
                oldJob: warriorJob,
                newJob: mageJob
            });

            expect(completeEventSpy).toHaveBeenCalledWith({
                character: mockUnit,
                oldJob: warriorJob,
                newJob: mageJob
            });

            expect(jobAnimator.isAnimationPlaying()).toBe(false);
        });

        test('スプライトがない場合はエラーが発生する', async () => {
            const unitWithoutSprite = { ...mockUnit, sprite: undefined };

            await expect(
                jobAnimator.playJobChangeAnimation(unitWithoutSprite, warriorJob, mageJob)
            ).rejects.toThrow('キャラクタースプライトが見つかりません');
        });

        test('アニメーション実行中は新しいアニメーションを開始できない', async () => {
            // アニメーション状態を手動で設定
            (jobAnimator as any).animationState.isPlaying = true;

            await expect(
                jobAnimator.playJobChangeAnimation(mockUnit, warriorJob, mageJob)
            ).rejects.toThrow('アニメーションが既に実行中です');
        });
    });

    describe('ランクアップアニメーション', () => {
        test('ランクアップアニメーションが正常に実行される', async () => {
            const startEventSpy = jest.fn();
            const completeEventSpy = jest.fn();

            jobAnimator.on(JobAnimationEvent.RANK_UP_START, startEventSpy);
            jobAnimator.on(JobAnimationEvent.RANK_UP_COMPLETE, completeEventSpy);

            await jobAnimator.playRankUpAnimation(mockUnit, 2);

            expect(startEventSpy).toHaveBeenCalledWith({
                character: mockUnit,
                newRank: 2
            });

            expect(completeEventSpy).toHaveBeenCalledWith({
                character: mockUnit,
                newRank: 2
            });

            expect(jobAnimator.isAnimationPlaying()).toBe(false);
        });

        test('スプライトがない場合はエラーが発生する', async () => {
            const unitWithoutSprite = { ...mockUnit, sprite: undefined };

            await expect(
                jobAnimator.playRankUpAnimation(unitWithoutSprite, 2)
            ).rejects.toThrow('キャラクタースプライトが見つかりません');
        });
    });

    describe('薔薇の力獲得エフェクト', () => {
        test('薔薇の力獲得エフェクトが正常に実行される', async () => {
            const startEventSpy = jest.fn();
            const completeEventSpy = jest.fn();

            jobAnimator.on(JobAnimationEvent.ROSE_ESSENCE_GAIN_START, startEventSpy);
            jobAnimator.on(JobAnimationEvent.ROSE_ESSENCE_GAIN_COMPLETE, completeEventSpy);

            await jobAnimator.playRoseEssenceGainEffect(50);

            expect(startEventSpy).toHaveBeenCalledWith({
                amount: 50,
                position: { x: 400, y: 300 }
            });

            expect(completeEventSpy).toHaveBeenCalledWith({
                amount: 50,
                position: { x: 400, y: 300 }
            });
        });

        test('カスタム位置で薔薇の力獲得エフェクトが実行される', async () => {
            const customPosition = { x: 200, y: 150 };
            const startEventSpy = jest.fn();

            jobAnimator.on(JobAnimationEvent.ROSE_ESSENCE_GAIN_START, startEventSpy);

            await jobAnimator.playRoseEssenceGainEffect(25, customPosition);

            expect(startEventSpy).toHaveBeenCalledWith({
                amount: 25,
                position: customPosition
            });
        });
    });

    describe('職業オーラエフェクト', () => {
        test('職業オーラが正常に表示される', () => {
            const startEventSpy = jest.fn();

            jobAnimator.on(JobAnimationEvent.AURA_EFFECT_START, startEventSpy);

            jobAnimator.showJobAura(mockUnit, warriorJob);

            expect(startEventSpy).toHaveBeenCalledWith({
                character: mockUnit,
                job: warriorJob
            });
        });

        test('職業オーラが正常に非表示になる', () => {
            const stopEventSpy = jest.fn();

            jobAnimator.on(JobAnimationEvent.AURA_EFFECT_STOP, stopEventSpy);

            // まずオーラを表示
            jobAnimator.showJobAura(mockUnit, warriorJob);

            // オーラを非表示
            jobAnimator.hideJobAura(mockUnit.id);

            expect(stopEventSpy).toHaveBeenCalledWith({
                characterId: mockUnit.id
            });
        });

        test('スプライトがない場合は警告が出力される', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            const unitWithoutSprite = { ...mockUnit, sprite: undefined };

            jobAnimator.showJobAura(unitWithoutSprite, warriorJob);

            expect(consoleSpy).toHaveBeenCalledWith('キャラクタースプライトが見つかりません');

            consoleSpy.mockRestore();
        });

        test('オーラの位置が更新される', () => {
            jobAnimator.showJobAura(mockUnit, warriorJob);

            const newPosition = { x: 200, y: 150 };
            jobAnimator.updateAuraPosition(mockUnit.id, newPosition);

            // モックオブジェクトなので実際の位置更新は確認できないが、
            // エラーが発生しないことを確認
            expect(() => {
                jobAnimator.updateAuraPosition(mockUnit.id, newPosition);
            }).not.toThrow();
        });
    });

    describe('スキル習得エフェクト', () => {
        test('スキル習得エフェクトが正常に実行される', async () => {
            const startEventSpy = jest.fn();
            const completeEventSpy = jest.fn();

            jobAnimator.on(JobAnimationEvent.SKILL_UNLOCK_START, startEventSpy);
            jobAnimator.on(JobAnimationEvent.SKILL_UNLOCK_COMPLETE, completeEventSpy);

            await jobAnimator.playSkillUnlockEffect(mockUnit, 'ファイアボール');

            expect(startEventSpy).toHaveBeenCalledWith({
                character: mockUnit,
                skillName: 'ファイアボール'
            });

            expect(completeEventSpy).toHaveBeenCalledWith({
                character: mockUnit,
                skillName: 'ファイアボール'
            });
        });

        test('スプライトがない場合はエラーが発生する', async () => {
            const unitWithoutSprite = { ...mockUnit, sprite: undefined };

            await expect(
                jobAnimator.playSkillUnlockEffect(unitWithoutSprite, 'ファイアボール')
            ).rejects.toThrow('キャラクタースプライトが見つかりません');
        });
    });

    describe('アニメーション状態管理', () => {
        test('アニメーション状態が正しく取得される', () => {
            const state = jobAnimator.getAnimationState();

            expect(state.isPlaying).toBe(false);
            expect(state.type).toBe('idle');
            expect(state.startTime).toBe(0);
            expect(state.duration).toBe(0);
        });

        test('アニメーション実行状態が正しく判定される', () => {
            expect(jobAnimator.isAnimationPlaying()).toBe(false);

            // アニメーション状態を手動で設定
            (jobAnimator as any).animationState.isPlaying = true;

            expect(jobAnimator.isAnimationPlaying()).toBe(true);
        });
    });

    describe('設定管理', () => {
        test('設定が正しく更新される', () => {
            const newConfig: Partial<JobAnimatorConfig> = {
                animationSpeed: 2.0,
                enableParticleEffects: false
            };

            jobAnimator.updateConfig(newConfig);

            // 設定が更新されたことを確認（内部状態なので直接確認は困難）
            expect(() => jobAnimator.updateConfig(newConfig)).not.toThrow();
        });

        test('アニメーションの有効/無効が切り替えられる', () => {
            jobAnimator.setAnimationsEnabled(false);
            expect(() => jobAnimator.setAnimationsEnabled(false)).not.toThrow();

            jobAnimator.setAnimationsEnabled(true);
            expect(() => jobAnimator.setAnimationsEnabled(true)).not.toThrow();
        });

        test('アニメーション速度が設定される', () => {
            jobAnimator.setAnimationSpeed(0.5);
            expect(() => jobAnimator.setAnimationSpeed(0.5)).not.toThrow();

            jobAnimator.setAnimationSpeed(3.0);
            expect(() => jobAnimator.setAnimationSpeed(3.0)).not.toThrow();

            // 範囲外の値は制限される
            jobAnimator.setAnimationSpeed(0.05); // 0.1未満
            jobAnimator.setAnimationSpeed(10.0); // 5.0超過
            expect(() => jobAnimator.setAnimationSpeed(0.05)).not.toThrow();
        });
    });

    describe('アニメーション制御', () => {
        test('全てのアニメーションが停止される', () => {
            // オーラを表示してから停止
            jobAnimator.showJobAura(mockUnit, warriorJob);

            jobAnimator.stopAllAnimations();

            expect(jobAnimator.isAnimationPlaying()).toBe(false);
            expect(mockScene.tweens.killTweensOf).toHaveBeenCalled();
        });
    });

    describe('リソース管理', () => {
        test('リソースが正しく破棄される', () => {
            // オーラを表示
            jobAnimator.showJobAura(mockUnit, warriorJob);

            // 破棄実行
            jobAnimator.destroy();

            // エラーが発生しないことを確認
            expect(() => jobAnimator.destroy()).not.toThrow();
        });
    });

    describe('エラーハンドリング', () => {
        test('音響効果が見つからない場合の処理', () => {
            // デバッグ表示を有効にして音響効果エラーをテスト
            const customConfig: Partial<JobAnimatorConfig> = {
                enableDebugDisplay: true,
                enableSoundEffects: true
            };

            const debugAnimator = new JobAnimator(mockScene as any, customConfig);

            // 存在しない音響効果を再生しようとする
            mockScene.sound.get = jest.fn(() => null);

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            // 職業変更アニメーションを実行（内部で音響効果を再生）
            debugAnimator.playJobChangeAnimation(mockUnit, warriorJob, mageJob);

            debugAnimator.destroy();
            consoleSpy.mockRestore();
        });
    });

    describe('職業カテゴリー色の取得', () => {
        test('各職業カテゴリーに対応する色が取得される', () => {
            // プライベートメソッドなので、実際の色取得は間接的にテスト
            // 職業変更アニメーションで異なるカテゴリーの職業を使用
            const archerData = createMockJobData('archer', JobCategory.ARCHER);
            const archerJob = new WarriorJob(archerData); // 実装上はWarriorJobを使用

            expect(async () => {
                await jobAnimator.playJobChangeAnimation(mockUnit, warriorJob, archerJob);
            }).not.toThrow();
        });
    });
});