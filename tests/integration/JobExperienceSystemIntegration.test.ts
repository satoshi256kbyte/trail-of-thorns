/**
 * 職業システムと経験値システムの統合テスト
 * 
 * このテストファイルは職業システムと経験値システムの統合機能をテストします:
 * - レベルアップ時の職業成長率修正適用
 * - 職業による経験値獲得修正
 * - 職業変更時の経験値処理
 * - 成長計算への職業効果統合
 */

import { JobExperienceIntegration } from '../../game/src/systems/experience/JobExperienceIntegration';
import { ExperienceAction, ExperienceSource, GrowthRates, StatGrowthResult } from '../../game/src/types/experience';
import { JobCategory, StatModifiers, GrowthRateModifiers } from '../../game/src/types/job';

// モック職業クラス
class MockJob {
    public id: string;
    public name: string;
    public category: string;
    public rank: number;

    constructor(id: string, name: string, category: string, rank: number = 1) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.rank = rank;
    }

    getGrowthRateModifiers(): GrowthRateModifiers {
        return {
            hp: this.rank * 5,
            mp: this.rank * 3,
            attack: this.rank * 4,
            defense: this.rank * 3,
            speed: this.rank * 2,
            skill: this.rank * 3,
            luck: this.rank * 1,
        };
    }

    getStatModifiers(): StatModifiers {
        return {
            hp: this.rank * 10,
            mp: this.rank * 5,
            attack: this.rank * 3,
            defense: this.rank * 2,
            speed: this.rank * 1,
            skill: this.rank * 2,
            luck: this.rank * 1,
        };
    }
}

// モック職業システム
class MockJobSystem {
    private characterJobs: Map<string, MockJob> = new Map();

    getCharacterJob(characterId: string): MockJob | null {
        return this.characterJobs.get(characterId) || null;
    }

    setCharacterJob(characterId: string, jobId: string, rank: number = 1): void {
        const job = new MockJob(jobId, jobId, jobId, rank);
        this.characterJobs.set(characterId, job);
    }
}

// モック経験値システム
class MockExperienceSystem {
    awardExperience(characterId: string, action: ExperienceAction, context: any): any {
        return {
            baseAmount: 10,
            multipliedAmount: 10,
            bonusAmount: 0,
            finalAmount: 10,
            source: context.source,
            action,
            context
        };
    }

    getExperienceInfo(characterId: string): any {
        return {
            characterId,
            currentLevel: 5,
            currentExperience: 100,
            experienceToNextLevel: 50,
            totalExperience: 100,
            canLevelUp: false,
            isMaxLevel: false,
            experienceProgress: 0.67
        };
    }
}

describe('JobExperienceSystemIntegration', () => {
    let jobIntegration: JobExperienceIntegration;
    let mockJobSystem: MockJobSystem;
    let mockExperienceSystem: MockExperienceSystem;
    let testCharacterId: string;

    beforeEach(() => {
        // 統合システムを初期化
        jobIntegration = new JobExperienceIntegration();

        // モックシステムを作成
        mockJobSystem = new MockJobSystem();
        mockExperienceSystem = new MockExperienceSystem();

        // 統合システムに設定
        jobIntegration.setJobSystem(mockJobSystem);
        jobIntegration.setExperienceSystem(mockExperienceSystem);

        // テスト用キャラクターID
        testCharacterId = 'test-character-001';

        // キャラクターに職業を設定
        mockJobSystem.setCharacterJob(testCharacterId, 'warrior', 1);
    });

    afterEach(() => {
        // クリーンアップは特に必要なし（モックオブジェクト）
    });

    describe('職業成長率修正の適用', () => {
        test('レベルアップ時に職業の成長率修正が適用される', () => {
            // 基本成長率を設定
            const baseGrowthRates: GrowthRates = {
                hp: 50,
                mp: 40,
                attack: 60,
                defense: 45,
                speed: 35,
                skill: 55,
                luck: 30,
            };

            // 職業成長率修正を適用
            const modifiedGrowthRates = jobIntegration.applyJobGrowthRateModifiers(
                testCharacterId,
                baseGrowthRates,
                1
            );

            // 戦士職業（ランク1）の修正が適用されていることを確認
            expect(modifiedGrowthRates.hp).toBe(55); // 50 + 5
            expect(modifiedGrowthRates.attack).toBe(64); // 60 + 4
            expect(modifiedGrowthRates.defense).toBe(48); // 45 + 3
        });

        test('職業ランクが高いほど成長率修正が大きくなる', () => {
            const baseGrowthRates: GrowthRates = {
                hp: 50, mp: 40, attack: 60, defense: 45, speed: 35, skill: 55, luck: 30,
            };

            // ランク1での修正
            const rank1Rates = jobIntegration.applyJobGrowthRateModifiers(
                testCharacterId,
                baseGrowthRates,
                1
            );

            // ランク2に変更
            mockJobSystem.setCharacterJob(testCharacterId, 'warrior', 2);

            // ランク2での修正
            const rank2Rates = jobIntegration.applyJobGrowthRateModifiers(
                testCharacterId,
                baseGrowthRates,
                1
            );

            // ランク2の方が修正値が大きいことを確認
            expect(rank2Rates.hp).toBeGreaterThan(rank1Rates.hp);
            expect(rank2Rates.attack).toBeGreaterThan(rank1Rates.attack);
        });
    });

    describe('職業による経験値獲得修正', () => {
        test('戦士職業は攻撃・撃破で経験値ボーナスを得る', () => {
            const baseResult = {
                baseAmount: 10,
                multipliedAmount: 10,
                bonusAmount: 0,
                finalAmount: 10,
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                context: {
                    source: ExperienceSource.ATTACK_HIT,
                    action: ExperienceAction.ATTACK,
                    timestamp: Date.now()
                }
            };

            // 戦士職業での攻撃経験値修正を適用
            const modifiedResult = jobIntegration.applyJobExperienceModifiers(
                testCharacterId,
                baseResult,
                ExperienceAction.ATTACK,
                baseResult.context
            );

            // 戦士は攻撃で1.1 * 1.1 = 1.21倍のボーナスがあることを確認
            expect(modifiedResult.finalAmount).toBe(12); // 10 * 1.1 * 1.1 = 12.1 → 12
        });

        test('魔法使い職業はスキル使用で経験値ボーナスを得る', () => {
            // 職業を魔法使いに変更
            mockJobSystem.setCharacterJob(testCharacterId, 'mage', 1);

            const baseResult = {
                baseAmount: 10,
                multipliedAmount: 10,
                bonusAmount: 0,
                finalAmount: 10,
                source: ExperienceSource.SKILL_USE,
                action: ExperienceAction.SKILL_CAST,
                context: {
                    source: ExperienceSource.SKILL_USE,
                    action: ExperienceAction.SKILL_CAST,
                    timestamp: Date.now()
                }
            };

            const modifiedResult = jobIntegration.applyJobExperienceModifiers(
                testCharacterId,
                baseResult,
                ExperienceAction.SKILL_CAST,
                baseResult.context
            );

            // 魔法使いはスキル使用で1.2 * 1.2 = 1.44倍のボーナスがあることを確認
            expect(modifiedResult.finalAmount).toBe(14); // 10 * 1.2 * 1.2 = 14.4 → 14
        });

        test('僧侶職業は回復・支援で経験値ボーナスを得る', () => {
            // 職業を僧侶に変更
            mockJobSystem.setCharacterJob(testCharacterId, 'healer', 1);

            const healResult = {
                baseAmount: 10,
                multipliedAmount: 10,
                bonusAmount: 0,
                finalAmount: 10,
                source: ExperienceSource.HEALING,
                action: ExperienceAction.HEAL,
                context: {
                    source: ExperienceSource.HEALING,
                    action: ExperienceAction.HEAL,
                    timestamp: Date.now()
                }
            };

            const modifiedHealResult = jobIntegration.applyJobExperienceModifiers(
                testCharacterId,
                healResult,
                ExperienceAction.HEAL,
                healResult.context
            );

            // 僧侶は回復で1.3 * 1.3 = 1.69倍のボーナスがあることを確認
            expect(modifiedHealResult.finalAmount).toBe(16); // 10 * 1.3 * 1.3 = 16.9 → 16
        });
    });

    describe('職業変更時の経験値処理', () => {
        test('職業変更時に経験値処理が正常に実行される', () => {
            const oldJobId = 'warrior';
            const newJobId = 'mage';

            // モック職業変更結果
            const jobChangeResult = {
                success: true,
                characterId: testCharacterId,
                oldJobId,
                newJobId,
                oldRank: 1,
                newRank: 1,
                statChanges: { hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, skill: 0, luck: 0 },
                skillChanges: { lost: [], gained: [] }
            };

            // 経験値処理を実行
            const experienceResult = jobIntegration.processJobChangeExperience(
                testCharacterId,
                oldJobId,
                newJobId,
                jobChangeResult
            );

            // 現在の実装では職業変更による経験値調整は0なので、成功するが調整なし
            expect(experienceResult.success).toBe(true);
            expect(experienceResult.experienceAdjustment).toBe(0);
        });

        test('職業変更後の経験値獲得が新職業の修正を反映する', () => {
            // 戦士での攻撃経験値
            const baseResult = {
                baseAmount: 10,
                multipliedAmount: 10,
                bonusAmount: 0,
                finalAmount: 10,
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                context: {
                    source: ExperienceSource.ATTACK_HIT,
                    action: ExperienceAction.ATTACK,
                    timestamp: Date.now()
                }
            };

            const warriorResult = jobIntegration.applyJobExperienceModifiers(
                testCharacterId,
                baseResult,
                ExperienceAction.ATTACK,
                baseResult.context
            );

            // 魔法使いに職業変更
            mockJobSystem.setCharacterJob(testCharacterId, 'mage', 1);

            // 魔法使いでのスキル経験値
            const skillResult = {
                ...baseResult,
                source: ExperienceSource.SKILL_USE,
                action: ExperienceAction.SKILL_CAST,
                context: {
                    source: ExperienceSource.SKILL_USE,
                    action: ExperienceAction.SKILL_CAST,
                    timestamp: Date.now()
                }
            };

            const mageResult = jobIntegration.applyJobExperienceModifiers(
                testCharacterId,
                skillResult,
                ExperienceAction.SKILL_CAST,
                skillResult.context
            );

            // 魔法使いはスキル使用でより高いボーナスがあることを確認
            expect(mageResult.finalAmount).toBeGreaterThan(warriorResult.finalAmount);
        });
    });

    describe('成長計算への職業効果統合', () => {
        test('職業ランクに応じたレベルアップボーナスが適用される', () => {
            const baseStatGrowth: StatGrowthResult = {
                hp: 2, mp: 1, attack: 1, defense: 1, speed: 0, skill: 1, luck: 0,
            };

            // ランク1での職業効果統合
            const rank1Growth = jobIntegration.integrateJobEffectsIntoGrowth(
                testCharacterId,
                baseStatGrowth,
                2
            );

            // ランク11に変更（より明確なボーナスのため）
            mockJobSystem.setCharacterJob(testCharacterId, 'warrior', 11);

            // ランク11での職業効果統合
            const rank11Growth = jobIntegration.integrateJobEffectsIntoGrowth(
                testCharacterId,
                baseStatGrowth,
                2
            );

            // ランク11の方が成長値が高いことを確認
            const rank1Total = Object.values(rank1Growth).reduce((a, b) => a + b, 0);
            const rank11Total = Object.values(rank11Growth).reduce((a, b) => a + b, 0);

            // ランク11では(11-1)*0.1 = 1.0の倍率でボーナスが追加される
            // Math.floor(1.0 * 2) = 2, Math.floor(1.0 * 1) = 1, etc.
            expect(rank11Total).toBeGreaterThan(rank1Total);
        });

        test('特定レベル（5の倍数）で追加ボーナスが適用される', () => {
            const baseStatGrowth: StatGrowthResult = {
                hp: 2, mp: 1, attack: 1, defense: 1, speed: 0, skill: 1, luck: 0,
            };

            // レベル4での職業効果統合
            const level4Growth = jobIntegration.integrateJobEffectsIntoGrowth(
                testCharacterId,
                baseStatGrowth,
                4
            );

            // レベル5での職業効果統合（5の倍数）
            const level5Growth = jobIntegration.integrateJobEffectsIntoGrowth(
                testCharacterId,
                baseStatGrowth,
                5
            );

            // レベル5の方が成長値が高いことを確認（5の倍数ボーナス）
            const level4Total = Object.values(level4Growth).reduce((a, b) => a + b, 0);
            const level5Total = Object.values(level5Growth).reduce((a, b) => a + b, 0);

            expect(level5Total).toBeGreaterThan(level4Total);
        });
    });

    describe('エラーハンドリング', () => {
        test('職業システムが利用できない場合でも統合システムは動作する', () => {
            // 職業システムの参照を削除
            jobIntegration.setJobSystem(null);

            const baseGrowthRates: GrowthRates = {
                hp: 50, mp: 40, attack: 60, defense: 45, speed: 35, skill: 55, luck: 30,
            };

            // 職業システムがない場合でも基本成長率がそのまま返されることを確認
            const result = jobIntegration.applyJobGrowthRateModifiers(
                testCharacterId,
                baseGrowthRates,
                1
            );

            expect(result).toEqual(baseGrowthRates);
        });

        test('無効なキャラクターIDでも適切にエラーハンドリングされる', () => {
            const baseResult = {
                baseAmount: 10,
                multipliedAmount: 10,
                bonusAmount: 0,
                finalAmount: 10,
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                context: {
                    source: ExperienceSource.ATTACK_HIT,
                    action: ExperienceAction.ATTACK,
                    timestamp: Date.now()
                }
            };

            // 無効なキャラクターIDでも基本結果がそのまま返されることを確認
            const result = jobIntegration.applyJobExperienceModifiers(
                'invalid-character-id',
                baseResult,
                ExperienceAction.ATTACK,
                baseResult.context
            );

            expect(result).toEqual(baseResult);
        });
    });
});