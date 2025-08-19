/**
 * LevelUpProcessor のユニットテスト
 * レベルアップ処理の完全性とデータ整合性を検証
 */

import { LevelUpProcessor } from '../../../../game/src/systems/experience/LevelUpProcessor';
import { GrowthCalculator } from '../../../../game/src/systems/experience/GrowthCalculator';
import { ExperienceManager } from '../../../../game/src/systems/experience/ExperienceManager';
import { ExperienceDataLoader } from '../../../../game/src/systems/experience/ExperienceDataLoader';
import {
    LevelUpResult,
    StatGrowthResult,
    GrowthRates,
    UnitStats,
    ExperienceSource,
    ExperienceError,
    GrowthRateData
} from '../../../../game/src/types/experience';
import { Unit } from '../../../../game/src/types/gameplay';

// モックイベントエミッター
class MockEventEmitter {
    private events: Map<string, any[]> = new Map();

    emit(event: string, data: any): void {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(data);
    }

    getEvents(event: string): any[] {
        return this.events.get(event) || [];
    }

    clearEvents(): void {
        this.events.clear();
    }
}

// テスト用データ
const mockGrowthRateData: GrowthRateData = {
    characterGrowthRates: {
        'test-character': {
            hp: 80,
            mp: 60,
            attack: 70,
            defense: 65,
            speed: 55,
            skill: 75,
            luck: 50
        }
    },
    jobClassGrowthRates: {
        'warrior': {
            hp: 85,
            mp: 40,
            attack: 75,
            defense: 80,
            speed: 50,
            skill: 60,
            luck: 45
        }
    },
    statLimits: {
        maxHP: 999,
        maxMP: 999,
        attack: 99,
        defense: 99,
        speed: 99,
        skill: 99,
        luck: 99
    }
};

const mockExperienceTableData = {
    levelRequirements: [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3250],
    experienceGains: {
        attackHit: 5,
        enemyDefeat: 25,
        allySupport: 10,
        healing: 8
    },
    maxLevel: 10
};

function createMockUnit(overrides: Partial<Unit> = {}): Unit {
    return {
        id: 'test-character',
        name: 'Test Character',
        position: { x: 0, y: 0 },
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
        ...overrides
    };
}

describe('LevelUpProcessor', () => {
    let levelUpProcessor: LevelUpProcessor;
    let growthCalculator: GrowthCalculator;
    let experienceManager: ExperienceManager;
    let experienceDataLoader: ExperienceDataLoader;
    let mockEventEmitter: MockEventEmitter;
    let mockUnit: Unit;

    beforeEach(() => {
        mockEventEmitter = new MockEventEmitter();

        // ExperienceDataLoader のセットアップ
        experienceDataLoader = new ExperienceDataLoader();
        // 直接データを設定（fetchを使わない）
        (experienceDataLoader as any).experienceTable = mockExperienceTableData;
        (experienceDataLoader as any).isLoaded = true;

        // GrowthCalculator のセットアップ
        growthCalculator = new GrowthCalculator();
        growthCalculator.loadGrowthRateData(mockGrowthRateData);

        // ExperienceManager のセットアップ
        experienceManager = new ExperienceManager(
            experienceDataLoader,
            mockEventEmitter as any
        );

        // LevelUpProcessor のセットアップ
        levelUpProcessor = new LevelUpProcessor(
            growthCalculator,
            experienceManager,
            mockEventEmitter as any
        );

        // テスト用キャラクター
        mockUnit = createMockUnit();
        experienceManager.initializeCharacterExperience(mockUnit.id, 1, 100); // レベル1で100経験値
    });

    afterEach(() => {
        mockEventEmitter.clearEvents();
    });

    describe('processLevelUp', () => {
        test('正常なレベルアップ処理', () => {
            // キャラクターを手動でレベルアップ可能な状態にする
            // 経験値は250（レベル2相当）だが、レベルは1のままにする
            experienceManager.setExperience(mockUnit.id, 250, false); // レベル更新しない

            const result = levelUpProcessor.processLevelUp(mockUnit);

            expect(result).toBeDefined();
            expect(result.characterId).toBe(mockUnit.id);
            expect(result.newLevel).toBeGreaterThan(result.oldLevel);
            expect(result.levelsGained).toBe(1);
            expect(result.timestamp).toBeGreaterThan(0);
            expect(result.statGrowth).toBeDefined();
            expect(result.oldStats).toBeDefined();
            expect(result.newStats).toBeDefined();
        });

        test('レベルアップ不可能な場合はエラー', () => {
            // レベルアップ不可能な状態
            expect(() => {
                levelUpProcessor.processLevelUp(mockUnit);
            }).toThrow(ExperienceError.LEVEL_UP_FAILED);
        });

        test('無効なキャラクターの場合はエラー', () => {
            const invalidUnit = createMockUnit({ id: 'invalid-character' });

            expect(() => {
                levelUpProcessor.processLevelUp(invalidUnit);
            }).toThrow(ExperienceError.INVALID_CHARACTER);
        });

        test('nullキャラクターの場合はエラー', () => {
            expect(() => {
                levelUpProcessor.processLevelUp(null as any);
            }).toThrow(ExperienceError.INVALID_CHARACTER);
        });

        test('職業クラス指定でのレベルアップ', () => {
            experienceManager.setExperience(mockUnit.id, 250, false);

            const result = levelUpProcessor.processLevelUp(mockUnit, 'warrior');

            expect(result).toBeDefined();
            expect(result.characterId).toBe(mockUnit.id);
            expect(result.newLevel).toBeGreaterThan(result.oldLevel);
        });

        test('レベルアップイベントが発行される', () => {
            experienceManager.setExperience(mockUnit.id, 250, false);

            levelUpProcessor.processLevelUp(mockUnit);

            const events = mockEventEmitter.getEvents('level-up-processed');
            expect(events).toHaveLength(1);
            expect(events[0].character).toBe(mockUnit);
            expect(events[0].result).toBeDefined();
        });
    });

    describe('processStatGrowth', () => {
        test('正常な能力値成長計算', () => {
            const growthRates: GrowthRates = {
                hp: 100, // 100%成長率
                mp: 100,
                attack: 100,
                defense: 100,
                speed: 100,
                skill: 100,
                luck: 100
            };

            const result = levelUpProcessor.processStatGrowth(mockUnit, growthRates);

            expect(result).toBeDefined();
            expect(result.hp).toBe(1); // 100%なので必ず1成長
            expect(result.mp).toBe(1);
            expect(result.attack).toBe(1);
            expect(result.defense).toBe(1);
            expect(result.speed).toBe(1);
            expect(result.skill).toBe(1);
            expect(result.luck).toBe(1);
        });

        test('0%成長率での成長計算', () => {
            const growthRates: GrowthRates = {
                hp: 0,
                mp: 0,
                attack: 0,
                defense: 0,
                speed: 0,
                skill: 0,
                luck: 0
            };

            const result = levelUpProcessor.processStatGrowth(mockUnit, growthRates);

            expect(result.hp).toBe(0);
            expect(result.mp).toBe(0);
            expect(result.attack).toBe(0);
            expect(result.defense).toBe(0);
            expect(result.speed).toBe(0);
            expect(result.skill).toBe(0);
            expect(result.luck).toBe(0);
        });

        test('無効なキャラクターの場合はエラー', () => {
            const growthRates: GrowthRates = {
                hp: 50, mp: 50, attack: 50, defense: 50, speed: 50, skill: 50, luck: 50
            };

            expect(() => {
                levelUpProcessor.processStatGrowth(null as any, growthRates);
            }).toThrow(ExperienceError.INVALID_CHARACTER);
        });

        test('無効な成長率の場合はエラー', () => {
            expect(() => {
                levelUpProcessor.processStatGrowth(mockUnit, null as any);
            }).toThrow(ExperienceError.GROWTH_RATE_INVALID);
        });

        test('成長計算イベントが発行される', () => {
            const growthRates: GrowthRates = {
                hp: 50, mp: 50, attack: 50, defense: 50, speed: 50, skill: 50, luck: 50
            };

            levelUpProcessor.processStatGrowth(mockUnit, growthRates);

            const events = mockEventEmitter.getEvents('stat-growth-calculated');
            expect(events).toHaveLength(1);
            expect(events[0].characterId).toBe(mockUnit.id);
            expect(events[0].growthRates).toBe(growthRates);
        });
    });

    describe('adjustCurrentStats', () => {
        test('HP/MP比例調整の正常動作', () => {
            const oldMaxHP = 100;
            const oldMaxMP = 50;

            // 現在HP/MPを半分に設定
            mockUnit.currentHP = 50;
            mockUnit.currentMP = 25;

            // 最大HP/MPを増加
            mockUnit.stats.maxHP = 120;
            mockUnit.stats.maxMP = 60;

            levelUpProcessor.adjustCurrentStats(mockUnit, oldMaxHP, oldMaxMP);

            // 比例調整されているかチェック
            expect(mockUnit.currentHP).toBe(60); // 50/100 * 120 = 60
            expect(mockUnit.currentMP).toBe(30); // 25/50 * 60 = 30
        });

        test('最大値を超えない制限', () => {
            const oldMaxHP = 100;
            const oldMaxMP = 50;

            // 現在HP/MPを最大値に設定
            mockUnit.currentHP = 100;
            mockUnit.currentMP = 50;

            // 最大HP/MPを増加
            mockUnit.stats.maxHP = 110;
            mockUnit.stats.maxMP = 55;

            levelUpProcessor.adjustCurrentStats(mockUnit, oldMaxHP, oldMaxMP);

            // 新しい最大値を超えないかチェック
            expect(mockUnit.currentHP).toBeLessThanOrEqual(mockUnit.stats.maxHP);
            expect(mockUnit.currentMP).toBeLessThanOrEqual(mockUnit.stats.maxMP);
        });

        test('0未満にならない制限', () => {
            const oldMaxHP = 100;
            const oldMaxMP = 50;

            // 現在HP/MPを0に設定
            mockUnit.currentHP = 0;
            mockUnit.currentMP = 0;

            levelUpProcessor.adjustCurrentStats(mockUnit, oldMaxHP, oldMaxMP);

            expect(mockUnit.currentHP).toBeGreaterThanOrEqual(0);
            expect(mockUnit.currentMP).toBeGreaterThanOrEqual(0);
        });

        test('無効なキャラクターの場合はエラー', () => {
            expect(() => {
                levelUpProcessor.adjustCurrentStats(null as any, 100, 50);
            }).toThrow(ExperienceError.INVALID_CHARACTER);
        });

        test('無効な旧最大値の場合はエラー', () => {
            expect(() => {
                levelUpProcessor.adjustCurrentStats(mockUnit, 0, 50);
            }).toThrow('Invalid old max stats');

            expect(() => {
                levelUpProcessor.adjustCurrentStats(mockUnit, 100, -1);
            }).toThrow('Invalid old max stats');
        });

        test('調整イベントが発行される', () => {
            const oldMaxHP = 100;
            const oldMaxMP = 50;

            mockUnit.stats.maxHP = 110;
            mockUnit.stats.maxMP = 55;

            levelUpProcessor.adjustCurrentStats(mockUnit, oldMaxHP, oldMaxMP);

            const events = mockEventEmitter.getEvents('current-stats-adjusted');
            expect(events).toHaveLength(1);
            expect(events[0].characterId).toBe(mockUnit.id);
            expect(events[0].oldMaxHP).toBe(oldMaxHP);
            expect(events[0].oldMaxMP).toBe(oldMaxMP);
        });
    });

    describe('updateCharacterLevel', () => {
        test('正常なレベル更新', () => {
            const newLevel = levelUpProcessor.updateCharacterLevel(mockUnit);

            expect(typeof newLevel).toBe('number');
            expect(newLevel).toBeGreaterThan(0);
        });

        test('無効なキャラクターの場合はエラー', () => {
            expect(() => {
                levelUpProcessor.updateCharacterLevel(null as any);
            }).toThrow(ExperienceError.INVALID_CHARACTER);
        });

        test('未登録キャラクターの場合はエ���ー', () => {
            const unregisteredUnit = createMockUnit({ id: 'unregistered' });

            expect(() => {
                levelUpProcessor.updateCharacterLevel(unregisteredUnit);
            }).toThrow(ExperienceError.INVALID_CHARACTER);
        });

        test('レベル更新イベントが発行される', () => {
            levelUpProcessor.updateCharacterLevel(mockUnit);

            const events = mockEventEmitter.getEvents('character-level-updated');
            expect(events).toHaveLength(1);
            expect(events[0].characterId).toBe(mockUnit.id);
            expect(events[0].newLevel).toBeDefined();
        });
    });

    describe('processMultipleLevelUps', () => {
        test('複数レベルアップの処理', () => {
            // 複数レベルアップ可能な経験値を設定（レベル3相当だがレベル1のまま）
            experienceManager.setExperience(mockUnit.id, 450, false);

            const results = levelUpProcessor.processMultipleLevelUps(mockUnit);

            expect(results.length).toBeGreaterThan(0);
            expect(results.every(result => result.levelsGained >= 1)).toBe(true);
        });

        test('レベルアップ不可能な場合は空配列', () => {
            const results = levelUpProcessor.processMultipleLevelUps(mockUnit);

            expect(results).toHaveLength(0);
        });

        test('無限ループ防止', () => {
            // 大量の経験値を付与
            experienceManager.addExperience(mockUnit.id, 10000, ExperienceSource.ENEMY_DEFEAT);

            const results = levelUpProcessor.processMultipleLevelUps(mockUnit);

            // 最大10回までの制限
            expect(results.length).toBeLessThanOrEqual(10);
        });

        test('複数レベルアップイベントが発行される', () => {
            experienceManager.addExperience(mockUnit.id, 500, ExperienceSource.ENEMY_DEFEAT);

            const results = levelUpProcessor.processMultipleLevelUps(mockUnit);

            if (results.length > 0) {
                const events = mockEventEmitter.getEvents('multiple-level-ups-processed');
                expect(events).toHaveLength(1);
                expect(events[0].characterId).toBe(mockUnit.id);
                expect(events[0].results).toBe(results);
            }
        });
    });

    describe('canProcessLevelUp', () => {
        test('レベルアップ可能な場合はtrue', () => {
            experienceManager.setExperience(mockUnit.id, 250, false);

            const canLevelUp = levelUpProcessor.canProcessLevelUp(mockUnit);

            expect(canLevelUp).toBe(true);
        });

        test('レベルアップ不可能な場合はfalse', () => {
            const canLevelUp = levelUpProcessor.canProcessLevelUp(mockUnit);

            expect(canLevelUp).toBe(false);
        });

        test('無効なキャラクターの場合はfalse', () => {
            const canLevelUp = levelUpProcessor.canProcessLevelUp(null as any);

            expect(canLevelUp).toBe(false);
        });

        test('未登録キャラクターの場合はfalse', () => {
            const unregisteredUnit = createMockUnit({ id: 'unregistered' });

            const canLevelUp = levelUpProcessor.canProcessLevelUp(unregisteredUnit);

            expect(canLevelUp).toBe(false);
        });
    });

    describe('predictLevelUp', () => {
        test('レベルアップ予測の正常動作', () => {
            // キャラクターを50経験値（レベル0相当）に設定し、200追加で250（レベル2）にする
            experienceManager.setExperience(mockUnit.id, 50, false);

            const prediction = levelUpProcessor.predictLevelUp(mockUnit, 200);

            expect(prediction).toBeDefined();
            expect(prediction!.characterId).toBe(mockUnit.id);
            expect(prediction!.newLevel).toBeGreaterThan(prediction!.oldLevel);
        });

        test('レベルアップしない場合はnull', () => {
            const prediction = levelUpProcessor.predictLevelUp(mockUnit, 10);

            expect(prediction).toBeNull();
        });

        test('無効な追加経験値の場合はnull', () => {
            const prediction = levelUpProcessor.predictLevelUp(mockUnit, -10);

            expect(prediction).toBeNull();
        });

        test('無効なキャラクターの場合はnull', () => {
            const prediction = levelUpProcessor.predictLevelUp(null as any, 100);

            expect(prediction).toBeNull();
        });

        test('予測後に元の状態に戻る', () => {
            const originalExperience = experienceManager.getCurrentExperience(mockUnit.id);
            const originalLevel = experienceManager.getCurrentLevel(mockUnit.id);

            levelUpProcessor.predictLevelUp(mockUnit, 100);

            // 元の状態に戻っているかチェック
            expect(experienceManager.getCurrentExperience(mockUnit.id)).toBe(originalExperience);
            expect(experienceManager.getCurrentLevel(mockUnit.id)).toBe(originalLevel);
        });
    });

    describe('isInitialized', () => {
        test('正常に初期化されている場合はtrue', () => {
            const initialized = levelUpProcessor.isInitialized();

            expect(initialized).toBe(true);
        });

        test('GrowthCalculatorが初期化されていない場合はfalse', () => {
            const uninitializedGrowthCalculator = new GrowthCalculator();
            const uninitializedProcessor = new LevelUpProcessor(
                uninitializedGrowthCalculator,
                experienceManager
            );

            const initialized = uninitializedProcessor.isInitialized();

            expect(initialized).toBe(false);
        });
    });

    describe('getDebugInfo', () => {
        test('デバッグ情報の取得', () => {
            const debugInfo = levelUpProcessor.getDebugInfo();

            expect(debugInfo).toBeDefined();
            expect(typeof debugInfo.initialized).toBe('boolean');
            expect(typeof debugInfo.growthCalculatorReady).toBe('boolean');
            expect(typeof debugInfo.experienceManagerReady).toBe('boolean');
            expect(debugInfo.statLimits).toBeDefined();
        });
    });

    describe('destroy', () => {
        test('リソース解放', () => {
            levelUpProcessor.destroy();

            const events = mockEventEmitter.getEvents('level-up-processor-destroyed');
            expect(events).toHaveLength(1);
        });
    });

    describe('データ整合性テスト', () => {
        test('レベルアップ後の能力値整合性', () => {
            experienceManager.setExperience(mockUnit.id, 250, false);

            const oldStats = { ...mockUnit.stats };
            const result = levelUpProcessor.processLevelUp(mockUnit);

            // 能力値が適切に増加しているかチェック
            expect(mockUnit.stats.maxHP).toBeGreaterThanOrEqual(oldStats.maxHP);
            expect(mockUnit.stats.maxMP).toBeGreaterThanOrEqual(oldStats.maxMP);
            expect(mockUnit.stats.attack).toBeGreaterThanOrEqual(oldStats.attack);
            expect(mockUnit.stats.defense).toBeGreaterThanOrEqual(oldStats.defense);
            expect(mockUnit.stats.speed).toBeGreaterThanOrEqual(oldStats.speed);

            // 成長結果と実際の能力値変化が一致するかチェック
            expect(mockUnit.stats.maxHP - oldStats.maxHP).toBe(result.statGrowth.hp);
            expect(mockUnit.stats.maxMP - oldStats.maxMP).toBe(result.statGrowth.mp);
            expect(mockUnit.stats.attack - oldStats.attack).toBe(result.statGrowth.attack);
            expect(mockUnit.stats.defense - oldStats.defense).toBe(result.statGrowth.defense);
            expect(mockUnit.stats.speed - oldStats.speed).toBe(result.statGrowth.speed);
        });

        test('現在HP/MPの整合性', () => {
            const oldMaxHP = mockUnit.stats.maxHP;
            const oldMaxMP = mockUnit.stats.maxMP;
            const oldCurrentHP = mockUnit.currentHP;
            const oldCurrentMP = mockUnit.currentMP;

            experienceManager.setExperience(mockUnit.id, 250, false);
            levelUpProcessor.processLevelUp(mockUnit);

            // 現在HP/MPが最大値を超えていないかチェック
            expect(mockUnit.currentHP).toBeLessThanOrEqual(mockUnit.stats.maxHP);
            expect(mockUnit.currentMP).toBeLessThanOrEqual(mockUnit.stats.maxMP);

            // 現在HP/MPが0未満でないかチェック
            expect(mockUnit.currentHP).toBeGreaterThanOrEqual(0);
            expect(mockUnit.currentMP).toBeGreaterThanOrEqual(0);

            // 最大値が増加した場合、現在値も比例して増加しているかチェック
            if (mockUnit.stats.maxHP > oldMaxHP) {
                const expectedHP = Math.floor((oldCurrentHP / oldMaxHP) * mockUnit.stats.maxHP);
                expect(mockUnit.currentHP).toBeGreaterThanOrEqual(Math.min(expectedHP, mockUnit.stats.maxHP));
            }

            if (mockUnit.stats.maxMP > oldMaxMP) {
                const expectedMP = Math.floor((oldCurrentMP / oldMaxMP) * mockUnit.stats.maxMP);
                expect(mockUnit.currentMP).toBeGreaterThanOrEqual(Math.min(expectedMP, mockUnit.stats.maxMP));
            }
        });

        test('レベルアップ結果の整合性', () => {
            experienceManager.setExperience(mockUnit.id, 250, false);

            const oldLevel = experienceManager.getCurrentLevel(mockUnit.id);
            const result = levelUpProcessor.processLevelUp(mockUnit);

            // レベルアップ結果の基本整合性
            expect(result.newLevel).toBeGreaterThan(result.oldLevel);
            expect(result.levelsGained).toBe(result.newLevel - result.oldLevel);
            expect(result.levelsGained).toBeGreaterThan(0);

            // 新しい能力値が旧能力値 + 成長値と一致するかチェック
            expect(result.newStats.maxHP).toBe(result.oldStats.maxHP + result.statGrowth.hp);
            expect(result.newStats.maxMP).toBe(result.oldStats.maxMP + result.statGrowth.mp);
            expect(result.newStats.attack).toBe(result.oldStats.attack + result.statGrowth.attack);
            expect(result.newStats.defense).toBe(result.oldStats.defense + result.statGrowth.defense);
            expect(result.newStats.speed).toBe(result.oldStats.speed + result.statGrowth.speed);
        });
    });
});