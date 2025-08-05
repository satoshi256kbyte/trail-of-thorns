import { BattleBalanceTool, BattleStatistics, BattleSimulationResult, BalanceRecommendation } from '../../../game/src/debug/BattleBalanceTool';
import { Unit } from '../../../game/src/types/battle';

// Mock GameConfig
jest.mock('../../../game/src/config/GameConfig', () => ({
    GameConfig: jest.fn().mockImplementation(() => ({
        getBattleSystemConfig: () => ({
            balanceSettings: {
                baseCriticalChance: 5,
                baseEvasionChance: 10,
            },
            damageModifiers: {
                criticalDamageMultiplier: 1.5,
                globalDamageMultiplier: 1.0,
            },
            showBattleStatistics: true,
        }),
    })),
}));

// Mock DamageCalculator
jest.mock('../../../game/src/systems/DamageCalculator', () => ({
    DamageCalculator: jest.fn().mockImplementation(() => ({
        calculateBaseDamage: jest.fn().mockReturnValue(50),
        calculateCritical: jest.fn().mockReturnValue({ isCritical: false, multiplier: 1.5, chance: 5 }),
        calculateEvasion: jest.fn().mockReturnValue(false),
        applyElementalModifier: jest.fn().mockReturnValue(50),
    })),
}));

// Mock AttackRangeCalculator
jest.mock('../../../game/src/systems/AttackRangeCalculator', () => ({
    AttackRangeCalculator: jest.fn().mockImplementation(() => ({})),
}));

describe('BattleBalanceTool', () => {
    let balanceTool: BattleBalanceTool;
    let mockAttacker: Unit;
    let mockTarget: Unit;

    beforeEach(() => {
        balanceTool = new BattleBalanceTool();

        mockAttacker = {
            id: 'attacker1',
            name: 'Test Attacker',
            position: { x: 0, y: 0 },
            stats: {
                level: 5,
                maxHP: 100,
                maxMP: 50,
                attack: 30,
                defense: 20,
                speed: 15,
                movement: 3,
                luck: 10,
            },
            currentHP: 100,
            currentMP: 50,
            faction: 'player',
            hasActed: false,
            hasMoved: false,
            weapon: {
                id: 'sword1',
                name: 'Test Sword',
                type: 'sword',
                attackPower: 25,
                range: 1,
                rangePattern: { type: 'single', range: 1, pattern: [{ x: 0, y: 0 }] },
                element: 'none',
                criticalRate: 5,
                accuracy: 90,
                specialEffects: [],
            },
        };

        mockTarget = {
            id: 'target1',
            name: 'Test Target',
            position: { x: 1, y: 0 },
            stats: {
                level: 3,
                maxHP: 80,
                maxMP: 30,
                attack: 20,
                defense: 15,
                speed: 10,
                movement: 2,
                agility: 8,
            },
            currentHP: 80,
            currentMP: 30,
            faction: 'enemy',
            hasActed: false,
            hasMoved: false,
            weapon: {
                id: 'club1',
                name: 'Test Club',
                type: 'club',
                attackPower: 20,
                range: 1,
                rangePattern: { type: 'single', range: 1, pattern: [{ x: 0, y: 0 }] },
                element: 'none',
                criticalRate: 3,
                accuracy: 85,
                specialEffects: [],
            },
        };
    });

    describe('Statistics Management', () => {
        test('should initialize with empty statistics', () => {
            const stats = balanceTool.getStatistics();

            expect(stats.totalBattles).toBe(0);
            expect(stats.totalDamageDealt).toBe(0);
            expect(stats.criticalHits).toBe(0);
            expect(stats.missedAttacks).toBe(0);
            expect(stats.averageDamage).toBe(0);
            expect(stats.criticalHitRate).toBe(0);
            expect(stats.hitRate).toBe(0);
        });

        test('should record battle results correctly', () => {
            balanceTool.recordBattle(mockAttacker, mockTarget, 45, false, false, 1000);

            const stats = balanceTool.getStatistics();
            expect(stats.totalBattles).toBe(1);
            expect(stats.totalDamageDealt).toBe(45);
            expect(stats.averageDamage).toBe(45);
            expect(stats.criticalHits).toBe(0);
            expect(stats.missedAttacks).toBe(0);
            expect(stats.hitRate).toBe(100);
            expect(stats.criticalHitRate).toBe(0);
        });

        test('should record critical hits correctly', () => {
            balanceTool.recordBattle(mockAttacker, mockTarget, 75, true, false, 1200);

            const stats = balanceTool.getStatistics();
            expect(stats.criticalHits).toBe(1);
            expect(stats.criticalHitRate).toBe(100);
        });

        test('should record missed attacks correctly', () => {
            balanceTool.recordBattle(mockAttacker, mockTarget, 0, false, true, 800);

            const stats = balanceTool.getStatistics();
            expect(stats.missedAttacks).toBe(1);
            expect(stats.hitRate).toBe(0);
        });

        test('should calculate average statistics correctly', () => {
            balanceTool.recordBattle(mockAttacker, mockTarget, 40, false, false, 1000);
            balanceTool.recordBattle(mockAttacker, mockTarget, 60, true, false, 1200);
            balanceTool.recordBattle(mockAttacker, mockTarget, 0, false, true, 800);

            const stats = balanceTool.getStatistics();
            expect(stats.totalBattles).toBe(3);
            expect(stats.averageDamage).toBe((40 + 60 + 0) / 3);
            expect(stats.criticalHitRate).toBe((1 / 3) * 100);
            expect(stats.hitRate).toBe((2 / 3) * 100);
            expect(stats.averageBattleDuration).toBe((1000 + 1200 + 800) / 3);
        });

        test('should reset statistics correctly', () => {
            balanceTool.recordBattle(mockAttacker, mockTarget, 50, false, false, 1000);
            balanceTool.resetStatistics();

            const stats = balanceTool.getStatistics();
            expect(stats.totalBattles).toBe(0);
            expect(stats.totalDamageDealt).toBe(0);
            expect(stats.averageDamage).toBe(0);

            const history = balanceTool.getBattleHistory();
            expect(history).toHaveLength(0);
        });
    });

    describe('Battle Simulation', () => {
        test('should simulate battles correctly', () => {
            const result = balanceTool.simulateBattle(mockAttacker, mockTarget, 100);

            expect(result.attacker).toBe(mockAttacker);
            expect(result.target).toBe(mockTarget);
            expect(result.simulationCount).toBe(100);
            expect(result.statistics.totalDamage).toBeGreaterThan(0);
            expect(result.statistics.averageDamage).toBeGreaterThan(0);
            expect(result.expectedDamage).toBeGreaterThan(0);
        });

        test('should handle different simulation counts', () => {
            const result1 = balanceTool.simulateBattle(mockAttacker, mockTarget, 10);
            const result2 = balanceTool.simulateBattle(mockAttacker, mockTarget, 1000);

            expect(result1.simulationCount).toBe(10);
            expect(result2.simulationCount).toBe(1000);
            expect(result2.statistics.totalDamage).toBeGreaterThan(result1.statistics.totalDamage);
        });

        test('should calculate hit and critical rates correctly', () => {
            const result = balanceTool.simulateBattle(mockAttacker, mockTarget, 1000);

            expect(result.hitChance).toBeGreaterThan(0);
            expect(result.hitChance).toBeLessThanOrEqual(100);
            expect(result.criticalChance).toBeGreaterThan(0);
            expect(result.criticalChance).toBeLessThanOrEqual(100);
            expect(result.evasionChance).toBeGreaterThanOrEqual(0);
            expect(result.evasionChance).toBeLessThan(100);
        });
    });

    describe('Balance Analysis', () => {
        test('should provide no recommendations for balanced stats', () => {
            // Record balanced battle results
            for (let i = 0; i < 10; i++) {
                balanceTool.recordBattle(mockAttacker, mockTarget, 50, i < 1, i < 1, 1000);
            }

            const recommendations = balanceTool.analyzeBalance();
            expect(recommendations).toHaveLength(0);
        });

        test('should recommend damage reduction for high damage', () => {
            // Record high damage battles
            for (let i = 0; i < 10; i++) {
                balanceTool.recordBattle(mockAttacker, mockTarget, 150, false, false, 1000);
            }

            const recommendations = balanceTool.analyzeBalance();
            const damageRec = recommendations.find(r => r.type === 'damage');

            expect(damageRec).toBeDefined();
            expect(damageRec!.severity).toBe('high');
            expect(damageRec!.recommendedValue).toBeLessThan(damageRec!.currentValue);
        });

        test('should recommend damage increase for low damage', () => {
            // Record low damage battles
            for (let i = 0; i < 10; i++) {
                balanceTool.recordBattle(mockAttacker, mockTarget, 10, false, false, 1000);
            }

            const recommendations = balanceTool.analyzeBalance();
            const damageRec = recommendations.find(r => r.type === 'damage');

            expect(damageRec).toBeDefined();
            expect(damageRec!.severity).toBe('medium');
            expect(damageRec!.recommendedValue).toBeGreaterThan(damageRec!.currentValue);
        });

        test('should recommend critical rate adjustment for high critical rate', () => {
            // Record high critical rate battles
            for (let i = 0; i < 10; i++) {
                balanceTool.recordBattle(mockAttacker, mockTarget, 50, i < 3, false, 1000); // 30% critical rate
            }

            const recommendations = balanceTool.analyzeBalance();
            const criticalRec = recommendations.find(r => r.type === 'critical');

            expect(criticalRec).toBeDefined();
            expect(criticalRec!.recommendedValue).toBeLessThan(criticalRec!.currentValue);
        });

        test('should recommend evasion adjustment for low hit rate', () => {
            // Record low hit rate battles
            for (let i = 0; i < 10; i++) {
                balanceTool.recordBattle(mockAttacker, mockTarget, i < 6 ? 50 : 0, false, i >= 6, 1000); // 60% hit rate
            }

            const recommendations = balanceTool.analyzeBalance();
            const evasionRec = recommendations.find(r => r.type === 'evasion');

            expect(evasionRec).toBeDefined();
            expect(evasionRec!.severity).toBe('high');
        });
    });

    describe('Battle History', () => {
        test('should maintain battle history', () => {
            balanceTool.recordBattle(mockAttacker, mockTarget, 45, false, false, 1000);
            balanceTool.recordBattle(mockAttacker, mockTarget, 60, true, false, 1200);

            const history = balanceTool.getBattleHistory();
            expect(history).toHaveLength(2);
            expect(history[0].damage).toBe(45);
            expect(history[1].damage).toBe(60);
            expect(history[1].isCritical).toBe(true);
        });

        test('should limit battle history when requested', () => {
            for (let i = 0; i < 20; i++) {
                balanceTool.recordBattle(mockAttacker, mockTarget, i * 5, false, false, 1000);
            }

            const limitedHistory = balanceTool.getBattleHistory(5);
            expect(limitedHistory).toHaveLength(5);

            const fullHistory = balanceTool.getBattleHistory();
            expect(fullHistory).toHaveLength(20);
        });
    });

    describe('Report Generation', () => {
        test('should generate CSV export', () => {
            balanceTool.recordBattle(mockAttacker, mockTarget, 45, false, false, 1000);
            balanceTool.recordBattle(mockAttacker, mockTarget, 60, true, false, 1200);

            const csv = balanceTool.exportStatisticsCSV();
            const lines = csv.split('\n');

            expect(lines[0]).toContain('timestamp,attacker,target,damage,isCritical,isEvaded,duration');
            expect(lines).toHaveLength(3); // header + 2 data rows
            expect(lines[1]).toContain('attacker1,target1,45,false,false,1000');
            expect(lines[2]).toContain('attacker1,target1,60,true,false,1200');
        });

        test('should generate comprehensive battle report', () => {
            // Add some battle data
            balanceTool.recordBattle(mockAttacker, mockTarget, 45, false, false, 1000);
            balanceTool.recordBattle(mockAttacker, mockTarget, 60, true, false, 1200);
            balanceTool.recordBattle(mockAttacker, mockTarget, 0, false, true, 800);

            const report = balanceTool.generateBattleReport();

            expect(report).toContain('戦闘システム分析レポート');
            expect(report).toContain('基本統計');
            expect(report).toContain('総戦闘回数: 3');
            expect(report).toContain('バランス調整提案');
            expect(report).toContain('最近の戦闘履歴');
        });

        test('should show no recommendations when balance is good', () => {
            // Add balanced battle data
            for (let i = 0; i < 20; i++) {
                const damage = 50 + (Math.random() - 0.5) * 20; // 40-60 damage range
                const isCritical = Math.random() < 0.1; // 10% critical rate
                const isEvaded = Math.random() < 0.15; // 15% evasion rate
                balanceTool.recordBattle(mockAttacker, mockTarget, damage, isCritical, isEvaded, 1000);
            }

            const report = balanceTool.generateBattleReport();
            expect(report).toContain('現在のバランスは適切です');
        });
    });
});