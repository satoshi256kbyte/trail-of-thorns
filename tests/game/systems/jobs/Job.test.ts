/**
 * Job基底クラスのテスト
 */

import { Job, WarriorJob, MageJob, ArcherJob, HealerJob, ThiefJob } from '../../../../game/src/systems/jobs';
import { JobCategory, JobData } from '../../../../game/src/types/job';

// テスト用のモックJobDataを作成
const createMockJobData = (id: string, category: JobCategory, maxRank: number = 5): JobData => ({
    id,
    name: `Test ${id}`,
    description: `Test job ${id}`,
    category,
    maxRank,
    statModifiers: {
        1: { hp: 5, mp: 3, attack: 4, defense: 3, speed: 2, skill: 3, luck: 2 },
        2: { hp: 10, mp: 6, attack: 8, defense: 6, speed: 4, skill: 6, luck: 4 },
    },
    availableSkills: {
        1: ['skill1', 'skill2'],
        2: ['skill1', 'skill2', 'skill3'],
    },
    rankUpRequirements: {
        2: {
            roseEssenceCost: 10,
            levelRequirement: 5,
            prerequisiteSkills: ['skill1'],
        },
    },
    growthRateModifiers: {
        1: { hp: 10, mp: 8, attack: 12, defense: 10, speed: 6, skill: 8, luck: 5 },
        2: { hp: 12, mp: 10, attack: 14, defense: 12, speed: 8, skill: 10, luck: 7 },
    },
    jobTraits: [],
    visual: {
        iconPath: 'test-icon.png',
        spriteModifications: [],
        colorScheme: {
            primary: '#FF0000',
            secondary: '#00FF00',
            accent: '#0000FF',
        },
    },
});

describe('Job基底クラス', () => {
    let warriorJobData: JobData;
    let warriorJob: WarriorJob;

    beforeEach(() => {
        warriorJobData = createMockJobData('warrior', JobCategory.WARRIOR);
        warriorJob = new WarriorJob(warriorJobData);
    });

    describe('基本プロパティ', () => {
        test('職業データが正しく設定される', () => {
            expect(warriorJob.id).toBe('warrior');
            expect(warriorJob.name).toBe('Test warrior');
            expect(warriorJob.description).toBe('Test job warrior');
            expect(warriorJob.category).toBe(JobCategory.WARRIOR);
            expect(warriorJob.maxRank).toBe(5);
        });

        test('初期ランクが正しく設定される', () => {
            expect(warriorJob.getCurrentRank()).toBe(1);
        });

        test('カスタム初期ランクが正しく設定される', () => {
            const customWarrior = new WarriorJob(warriorJobData, 3);
            expect(customWarrior.getCurrentRank()).toBe(3);
        });

        test('無効な初期ランクが修正される', () => {
            const invalidLowRank = new WarriorJob(warriorJobData, 0);
            expect(invalidLowRank.getCurrentRank()).toBe(1);

            const invalidHighRank = new WarriorJob(warriorJobData, 10);
            expect(invalidHighRank.getCurrentRank()).toBe(5);
        });
    });

    describe('ランク管理', () => {
        test('ランク設定が正しく動作する', () => {
            warriorJob.setRank(3);
            expect(warriorJob.getCurrentRank()).toBe(3);
        });

        test('無効なランク設定が修正される', () => {
            warriorJob.setRank(0);
            expect(warriorJob.getCurrentRank()).toBe(1);

            warriorJob.setRank(10);
            expect(warriorJob.getCurrentRank()).toBe(5);
        });

        test('最大ランク判定が正しく動作する', () => {
            expect(warriorJob.isMaxRank()).toBe(false);

            warriorJob.setRank(5);
            expect(warriorJob.isMaxRank()).toBe(true);
        });

        test('次ランク存在判定が正しく動作する', () => {
            expect(warriorJob.hasNextRank()).toBe(true);

            warriorJob.setRank(5);
            expect(warriorJob.hasNextRank()).toBe(false);
        });

        test('ランクアップ可能判定が正しく動作する', () => {
            expect(warriorJob.canRankUp()).toBe(true);

            warriorJob.setRank(5);
            expect(warriorJob.canRankUp()).toBe(false);
        });

        test('ランクアップ実行が正しく動作する', () => {
            expect(warriorJob.rankUp()).toBe(true);
            expect(warriorJob.getCurrentRank()).toBe(2);

            warriorJob.setRank(5);
            expect(warriorJob.rankUp()).toBe(false);
            expect(warriorJob.getCurrentRank()).toBe(5);
        });
    });

    describe('能力値とスキル', () => {
        test('能力値修正が取得できる', () => {
            const modifiers = warriorJob.getStatModifiers();
            expect(modifiers).toBeDefined();
            expect(typeof modifiers.hp).toBe('number');
            expect(typeof modifiers.attack).toBe('number');
        });

        test('使用可能スキルが取得できる', () => {
            const skills = warriorJob.getAvailableSkills();
            expect(Array.isArray(skills)).toBe(true);
            expect(skills.length).toBeGreaterThan(0);
        });

        test('職業特性が取得できる', () => {
            const traits = warriorJob.getJobTraits();
            expect(Array.isArray(traits)).toBe(true);
        });

        test('成長率修正が取得できる', () => {
            const growthRates = warriorJob.getGrowthRateModifiers();
            expect(growthRates).toBeDefined();
            expect(typeof growthRates.hp).toBe('number');
        });
    });

    describe('ランク別データ取得', () => {
        test('指定ランクの能力値修正が取得できる', () => {
            const rank1Modifiers = warriorJob.getStatModifiersForRank(1);
            const rank2Modifiers = warriorJob.getStatModifiersForRank(2);

            expect(rank1Modifiers).toBeDefined();
            expect(rank2Modifiers).toBeDefined();
            expect(rank2Modifiers.hp).toBeGreaterThan(rank1Modifiers.hp);
        });

        test('指定ランクのスキルが取得できる', () => {
            const rank1Skills = warriorJob.getAvailableSkillsForRank(1);
            const rank2Skills = warriorJob.getAvailableSkillsForRank(2);

            expect(rank1Skills.length).toBeGreaterThan(0);
            expect(rank2Skills.length).toBeGreaterThanOrEqual(rank1Skills.length);
        });

        test('現在のランクが変更されない', () => {
            const originalRank = warriorJob.getCurrentRank();

            warriorJob.getStatModifiersForRank(3);
            warriorJob.getAvailableSkillsForRank(4);
            warriorJob.getGrowthRateModifiersForRank(2);

            expect(warriorJob.getCurrentRank()).toBe(originalRank);
        });
    });

    describe('ランクアップ要件', () => {
        test('次ランクの要件が取得できる', () => {
            const requirements = warriorJob.getNextRankRequirements();
            expect(requirements).toBeDefined();
            expect(requirements?.roseEssenceCost).toBeGreaterThan(0);
            expect(requirements?.levelRequirement).toBeGreaterThan(0);
        });

        test('最大ランクでは次ランク要件がnull', () => {
            warriorJob.setRank(5);
            const requirements = warriorJob.getNextRankRequirements();
            expect(requirements).toBeNull();
        });

        test('指定ランクの要件が取得できる', () => {
            const requirements = warriorJob.getRankUpRequirements(2);
            expect(requirements).toBeDefined();
            expect(requirements.roseEssenceCost).toBeGreaterThan(0);
        });
    });

    describe('文字列表現とJSON', () => {
        test('toString()が正しい形式を返す', () => {
            const str = warriorJob.toString();
            expect(str).toContain(warriorJob.name);
            expect(str).toContain('Rank');
            expect(str).toContain('1/5');
        });

        test('toJSON()が完全なデータを返す', () => {
            const json = warriorJob.toJSON();
            expect(json).toHaveProperty('id');
            expect(json).toHaveProperty('name');
            expect(json).toHaveProperty('currentRank');
            expect(json).toHaveProperty('statModifiers');
            expect(json).toHaveProperty('availableSkills');
        });
    });
});

describe('具体的な職業クラス', () => {
    describe('WarriorJob（戦士）', () => {
        let warriorJob: WarriorJob;

        beforeEach(() => {
            const jobData = createMockJobData('warrior', JobCategory.WARRIOR);
            warriorJob = new WarriorJob(jobData);
        });

        test('戦士の能力値修正が正しく計算される', () => {
            const modifiers = warriorJob.getStatModifiers();
            expect(modifiers.hp).toBeGreaterThan(0); // HPボーナス
            expect(modifiers.attack).toBeGreaterThan(0); // 攻撃力ボーナス
            expect(modifiers.defense).toBeGreaterThan(0); // 防御力ボーナス
            expect(modifiers.speed).toBeLessThan(0); // 速度ペナルティ
        });

        test('戦士のスキルが正しく設定される', () => {
            const skills = warriorJob.getAvailableSkills();
            expect(skills).toContain('sword_slash');
            expect(skills).toContain('guard');
        });

        test('戦士固有メソッドが動作する', () => {
            const physicalAttack = warriorJob.calculatePhysicalAttackPower(50);
            expect(physicalAttack).toBeGreaterThan(50);

            const physicalDefense = warriorJob.calculatePhysicalDefense(30);
            expect(physicalDefense).toBeGreaterThan(30);

            const criticalRate = warriorJob.calculateCriticalRate(10);
            expect(criticalRate).toBeGreaterThanOrEqual(10);
        });
    });

    describe('MageJob（魔法使い）', () => {
        let mageJob: MageJob;

        beforeEach(() => {
            const jobData = createMockJobData('mage', JobCategory.MAGE);
            mageJob = new MageJob(jobData);
        });

        test('魔法使いの能力値修正が正しく計算される', () => {
            const modifiers = mageJob.getStatModifiers();
            expect(modifiers.mp).toBeGreaterThan(0); // MPボーナス
            expect(modifiers.attack).toBeGreaterThan(0); // 魔法攻撃力ボーナス
            expect(modifiers.skill).toBeGreaterThan(0); // 技術ボーナス
            expect(modifiers.defense).toBeLessThan(0); // 防御力ペナルティ
        });

        test('魔法使いのスキルが正しく設定される', () => {
            const skills = mageJob.getAvailableSkills();
            expect(skills).toContain('fire_bolt');
            expect(skills).toContain('heal');
            expect(skills).toContain('magic_shield');
        });

        test('魔法使い固有メソッドが動作する', () => {
            const magicAttack = mageJob.calculateMagicAttackPower(30, 40);
            expect(magicAttack).toBeGreaterThan(30);

            const healingPower = mageJob.calculateHealingPower(25, 40);
            expect(healingPower).toBeGreaterThan(25);

            const mpCost = mageJob.calculateMPCost(10);
            expect(mpCost).toBeLessThanOrEqual(10);
            expect(mpCost).toBeGreaterThanOrEqual(1);
        });
    });

    describe('ArcherJob（弓使い）', () => {
        let archerJob: ArcherJob;

        beforeEach(() => {
            const jobData = createMockJobData('archer', JobCategory.ARCHER);
            archerJob = new ArcherJob(jobData);
        });

        test('弓使いの能力値修正が正しく計算される', () => {
            const modifiers = archerJob.getStatModifiers();
            expect(modifiers.speed).toBeGreaterThan(0); // 速度ボーナス
            expect(modifiers.skill).toBeGreaterThan(0); // 技術ボーナス
            expect(modifiers.luck).toBeGreaterThan(0); // 運ボーナス
        });

        test('弓使いのスキルが正しく設定される', () => {
            const skills = archerJob.getAvailableSkills();
            expect(skills).toContain('aimed_shot');
            expect(skills).toContain('quick_step');
            expect(skills).toContain('eagle_eye');
        });

        test('弓使い固有メソッドが動作する', () => {
            const rangedAttack = archerJob.calculateRangedAttackPower(40, 35);
            expect(rangedAttack).toBeGreaterThan(40);

            const accuracy = archerJob.calculateAccuracy(80, 35);
            expect(accuracy).toBeGreaterThanOrEqual(80);

            const criticalRate = archerJob.calculateCriticalRate(15, 30);
            expect(criticalRate).toBeGreaterThanOrEqual(15);

            const evasionRate = archerJob.calculateEvasionRate(20, 45);
            expect(evasionRate).toBeGreaterThanOrEqual(20);
        });
    });

    describe('HealerJob（僧侶）', () => {
        let healerJob: HealerJob;

        beforeEach(() => {
            const jobData = createMockJobData('healer', JobCategory.HEALER);
            healerJob = new HealerJob(jobData);
        });

        test('僧侶の能力値修正が正しく計算される', () => {
            const modifiers = healerJob.getStatModifiers();
            expect(modifiers.mp).toBeGreaterThan(0); // MPボーナス
            expect(modifiers.skill).toBeGreaterThan(0); // 技術ボーナス
            expect(modifiers.luck).toBeGreaterThan(0); // 運ボーナス
            expect(modifiers.attack).toBeLessThan(5); // 攻撃力控えめ
        });

        test('僧侶のスキルが正しく設定される', () => {
            const skills = healerJob.getAvailableSkills();
            expect(skills).toContain('heal');
            expect(skills).toContain('cure');
            expect(skills).toContain('bless');
        });

        test('僧侶固有メソッドが動作する', () => {
            const healingPower = healerJob.calculateHealingPower(30, 40);
            expect(healingPower).toBeGreaterThan(30);

            const statusRecovery = healerJob.calculateStatusRecoveryRate(60, 40);
            expect(statusRecovery).toBeGreaterThanOrEqual(60);

            const partyBuff = healerJob.calculatePartyBuffEffect();
            expect(partyBuff).toBeDefined();
        });
    });

    describe('ThiefJob（盗賊）', () => {
        let thiefJob: ThiefJob;

        beforeEach(() => {
            const jobData = createMockJobData('thief', JobCategory.THIEF);
            thiefJob = new ThiefJob(jobData);
        });

        test('盗賊の能力値修正が正しく計算される', () => {
            const modifiers = thiefJob.getStatModifiers();
            expect(modifiers.speed).toBeGreaterThan(0); // 速度ボーナス
            expect(modifiers.skill).toBeGreaterThan(0); // 技術ボーナス
            expect(modifiers.luck).toBeGreaterThan(0); // 運ボーナス
            expect(modifiers.hp).toBeLessThan(10); // HP控えめ
            expect(modifiers.defense).toBeLessThan(5); // 防御力控えめ
        });

        test('盗賊のスキルが正しく設定される', () => {
            const skills = thiefJob.getAvailableSkills();
            expect(skills).toContain('sneak_attack');
            expect(skills).toContain('steal');
            expect(skills).toContain('lockpick');
        });

        test('盗賊固有メソッドが動作する', () => {
            const sneakAttack = thiefJob.calculateSneakAttackPower(35, 45, 40);
            expect(sneakAttack).toBeGreaterThan(35);

            const stealRate = thiefJob.calculateStealSuccessRate(10, 35, 40);
            expect(stealRate).toBeGreaterThan(0);
            expect(stealRate).toBeLessThanOrEqual(95);

            const criticalRate = thiefJob.calculateCriticalRate(20, 40);
            expect(criticalRate).toBeGreaterThanOrEqual(20);

            const initiativeRate = thiefJob.calculateInitiativeRate(45);
            expect(initiativeRate).toBeGreaterThan(30);
        });
    });
});