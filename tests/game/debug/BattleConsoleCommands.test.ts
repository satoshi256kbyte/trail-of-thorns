import { BattleConsoleCommands, CommandResult, MockUnitOptions } from '../../../game/src/debug/BattleConsoleCommands';
import { BattleDebugManager } from '../../../game/src/debug/BattleDebugManager';

// Mock dependencies
jest.mock('../../../game/src/config/GameConfig', () => ({
    GameConfig: jest.fn().mockImplementation(() => ({
        getBattleSystemConfig: () => ({
            damageModifiers: {
                globalDamageMultiplier: 1.0,
                criticalDamageMultiplier: 1.5,
                minimumDamage: 1,
                maximumDamage: 9999,
            },
            balanceSettings: {
                baseCriticalChance: 5,
                baseEvasionChance: 10,
                experienceMultiplier: 1.0,
                durabilityLossRate: 1.0,
            },
            animationConfig: {
                animationSpeed: 1.0,
            },
        }),
        updateBattleSystemConfig: jest.fn(),
    })),
}));

jest.mock('../../../game/src/systems/DamageCalculator', () => ({
    DamageCalculator: jest.fn().mockImplementation(() => ({
        calculateBaseDamage: jest.fn().mockReturnValue(50),
        calculateCritical: jest.fn().mockReturnValue({ isCritical: false, multiplier: 1.5, chance: 5 }),
        calculateEvasion: jest.fn().mockReturnValue(false),
        applyElementalModifier: jest.fn().mockReturnValue(50),
        performCompleteCalculation: jest.fn().mockReturnValue({
            baseDamage: 50,
            finalDamage: 50,
            modifiers: [],
            isCritical: false,
            isEvaded: false,
        }),
    })),
}));

jest.mock('../../../game/src/systems/AttackRangeCalculator', () => ({
    AttackRangeCalculator: jest.fn().mockImplementation(() => ({})),
}));

// Mock BattleDebugManager
const mockDebugManager = {
    getBalanceTool: jest.fn().mockReturnValue({
        recordBattle: jest.fn(),
        simulateBattle: jest.fn().mockReturnValue({
            attacker: { name: 'Test Attacker' },
            target: { name: 'Test Target' },
            simulationCount: 100,
            statistics: {
                averageDamage: 45.5,
                criticalRate: 12.0,
                hitRate: 85.0,
            },
        }),
        getStatistics: jest.fn().mockReturnValue({
            totalBattles: 10,
            averageDamage: 45.5,
            criticalHitRate: 12.0,
            hitRate: 85.0,
        }),
        analyzeBalance: jest.fn().mockReturnValue([
            {
                type: 'damage',
                severity: 'medium',
                description: 'Average damage is slightly high',
                currentValue: 1.0,
                recommendedValue: 0.9,
                reason: 'Damage balance adjustment needed',
            },
        ]),
        resetStatistics: jest.fn(),
    }),
    generateDebugReport: jest.fn().mockReturnValue('Mock debug report'),
    clearDebugInfo: jest.fn(),
    updateDisplayOptions: jest.fn(),
} as any;

describe('BattleConsoleCommands', () => {
    let consoleCommands: BattleConsoleCommands;
    let originalWindow: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock window object
        originalWindow = global.window;
        global.window = { ...global.window } as any;

        consoleCommands = new BattleConsoleCommands(mockDebugManager);
    });

    afterEach(() => {
        consoleCommands.destroy();
        global.window = originalWindow;
    });

    describe('Console Commands Initialization', () => {
        test('should initialize console commands on window object', () => {
            expect((global.window as any).battleCommands).toBeDefined();
            expect(typeof (global.window as any).battleCommands.help).toBe('function');
            expect(typeof (global.window as any).battleCommands.getConfig).toBe('function');
            expect(typeof (global.window as any).battleCommands.createMockUnit).toBe('function');
        });

        test('should log initialization message', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            new BattleConsoleCommands(mockDebugManager);

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('戦闘コンソールコマンドが利用可能です')
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Configuration Commands', () => {
        test('should get current configuration', () => {
            const result = (global.window as any).battleCommands.getConfig();

            expect(result.success).toBe(true);
            expect(result.message).toContain('現在の戦闘システム設定');
            expect(result.data).toHaveProperty('damageMultiplier');
            expect(result.data).toHaveProperty('criticalMultiplier');
            expect(result.data).toHaveProperty('baseCriticalChance');
        });

        test('should set damage multiplier', () => {
            const result = (global.window as any).battleCommands.setDamageMultiplier(1.5);

            expect(result.success).toBe(true);
            expect(result.message).toContain('ダメージ倍率を 1.5 に設定しました');
        });

        test('should reject invalid damage multiplier', () => {
            const result = (global.window as any).battleCommands.setDamageMultiplier(0);

            expect(result.success).toBe(false);
            expect(result.message).toContain('0より大きい値である必要があります');
        });

        test('should set critical chance', () => {
            const result = (global.window as any).battleCommands.setCriticalChance(15);

            expect(result.success).toBe(true);
            expect(result.message).toContain('基本クリティカル率を 15% に設定しました');
        });

        test('should reject invalid critical chance', () => {
            const result = (global.window as any).battleCommands.setCriticalChance(150);

            expect(result.success).toBe(false);
            expect(result.message).toContain('0-100の範囲で設定してください');
        });

        test('should set evasion chance', () => {
            const result = (global.window as any).battleCommands.setEvasionChance(20);

            expect(result.success).toBe(true);
            expect(result.message).toContain('基本回避率を 20% に設定しました');
        });

        test('should set animation speed', () => {
            const result = (global.window as any).battleCommands.setAnimationSpeed(2.0);

            expect(result.success).toBe(true);
            expect(result.message).toContain('アニメーション速度を 2x に設定しました');
        });
    });

    describe('Mock Unit Management', () => {
        test('should create mock unit with default options', () => {
            const result = (global.window as any).battleCommands.createMockUnit('testUnit');

            expect(result.success).toBe(true);
            expect(result.message).toContain("モックユニット 'testUnit' を作成しました");
            expect(result.data).toHaveProperty('id', 'testUnit');
            expect(result.data).toHaveProperty('name', 'MockUnit_testUnit');
            expect(result.data.stats).toHaveProperty('attack', 20);
            expect(result.data.stats).toHaveProperty('defense', 15);
        });

        test('should create mock unit with custom options', () => {
            const options: MockUnitOptions = {
                name: 'Custom Hero',
                level: 10,
                attack: 50,
                defense: 30,
                hp: 150,
                weaponType: 'Magic Staff',
                weaponPower: 40,
            };

            const result = (global.window as any).battleCommands.createMockUnit('hero', options);

            expect(result.success).toBe(true);
            expect(result.data.name).toBe('Custom Hero');
            expect(result.data.stats.level).toBe(10);
            expect(result.data.stats.attack).toBe(50);
            expect(result.data.stats.defense).toBe(30);
            expect(result.data.stats.maxHP).toBe(150);
            expect(result.data.weapon.name).toBe('Magic Staff');
            expect(result.data.weapon.attackPower).toBe(40);
        });

        test('should list mock units', () => {
            (global.window as any).battleCommands.createMockUnit('unit1');
            (global.window as any).battleCommands.createMockUnit('unit2');

            const result = (global.window as any).battleCommands.listMockUnits();

            expect(result.success).toBe(true);
            expect(result.message).toContain('2 個のモックユニットが存在します');
            expect(result.data).toHaveLength(2);
            expect(result.data[0]).toHaveProperty('id', 'unit1');
            expect(result.data[1]).toHaveProperty('id', 'unit2');
        });

        test('should get specific mock unit', () => {
            (global.window as any).battleCommands.createMockUnit('testUnit');

            const result = (global.window as any).battleCommands.getMockUnit('testUnit');

            expect(result.success).toBe(true);
            expect(result.message).toContain("モックユニット 'testUnit' の詳細");
            expect(result.data).toHaveProperty('id', 'testUnit');
        });

        test('should handle getting non-existent mock unit', () => {
            const result = (global.window as any).battleCommands.getMockUnit('nonexistent');

            expect(result.success).toBe(false);
            expect(result.message).toContain("モックユニット 'nonexistent' が見つかりません");
        });

        test('should delete mock unit', () => {
            (global.window as any).battleCommands.createMockUnit('testUnit');

            const deleteResult = (global.window as any).battleCommands.deleteMockUnit('testUnit');
            expect(deleteResult.success).toBe(true);

            const getResult = (global.window as any).battleCommands.getMockUnit('testUnit');
            expect(getResult.success).toBe(false);
        });
    });

    describe('Battle Testing Commands', () => {
        beforeEach(() => {
            (global.window as any).battleCommands.createMockUnit('attacker', { attack: 30 });
            (global.window as any).battleCommands.createMockUnit('target', { defense: 20, hp: 80 });
        });

        test('should test battle between units', () => {
            const result = (global.window as any).battleCommands.testBattle('attacker', 'target');

            expect(result.success).toBe(true);
            expect(result.message).toBe('戦闘テスト完了');
            expect(result.data).toHaveProperty('attacker');
            expect(result.data).toHaveProperty('target');
            expect(result.data).toHaveProperty('baseDamage');
            expect(result.data).toHaveProperty('finalDamage');
            expect(result.data).toHaveProperty('isCritical');
            expect(result.data).toHaveProperty('isEvaded');
        });

        test('should handle battle test with non-existent attacker', () => {
            const result = (global.window as any).battleCommands.testBattle('nonexistent', 'target');

            expect(result.success).toBe(false);
            expect(result.message).toContain("攻撃者 'nonexistent' が見つかりません");
        });

        test('should handle battle test with non-existent target', () => {
            const result = (global.window as any).battleCommands.testBattle('attacker', 'nonexistent');

            expect(result.success).toBe(false);
            expect(result.message).toContain("対象 'nonexistent' が見つかりません");
        });

        test('should simulate battle multiple times', () => {
            const result = (global.window as any).battleCommands.simulateBattle('attacker', 'target', 500);

            expect(result.success).toBe(true);
            expect(result.message).toContain('戦闘シミュレーション完了 (500回)');
            expect(result.data).toHaveProperty('simulationCount', 500);
            expect(result.data.statistics).toHaveProperty('averageDamage');
        });

        test('should test damage calculation details', () => {
            const result = (global.window as any).battleCommands.testDamageCalculation('attacker', 'target');

            expect(result.success).toBe(true);
            expect(result.message).toBe('ダメージ計算詳細');
            expect(result.data).toHaveProperty('attacker');
            expect(result.data).toHaveProperty('target');
            expect(result.data).toHaveProperty('calculations');
            expect(result.data.calculations).toHaveProperty('baseDamage');
            expect(result.data.calculations).toHaveProperty('criticalChance');
        });
    });

    describe('Statistics and Analysis Commands', () => {
        test('should get battle statistics', () => {
            const result = (global.window as any).battleCommands.getStatistics();

            expect(result.success).toBe(true);
            expect(result.message).toBe('戦闘統計データ');
            expect(result.data).toHaveProperty('totalBattles');
            expect(result.data).toHaveProperty('averageDamage');
            expect(result.data).toHaveProperty('criticalHitRate');
        });

        test('should analyze balance', () => {
            const result = (global.window as any).battleCommands.analyzeBalance();

            expect(result.success).toBe(true);
            expect(result.message).toContain('1 個のバランス調整提案があります');
            expect(result.data).toHaveLength(1);
            expect(result.data[0]).toHaveProperty('type', 'damage');
            expect(result.data[0]).toHaveProperty('severity', 'medium');
        });

        test('should generate debug report', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const result = (global.window as any).battleCommands.generateReport();

            expect(result.success).toBe(true);
            expect(result.message).toContain('デバッグレポートをコンソールに出力しました');
            expect(result.data).toBe('Mock debug report');
            expect(consoleSpy).toHaveBeenCalledWith('Mock debug report');

            consoleSpy.mockRestore();
        });

        test('should reset statistics', () => {
            const result = (global.window as any).battleCommands.resetStatistics();

            expect(result.success).toBe(true);
            expect(result.message).toContain('統計データとデバッグ情報をリセットしました');
            expect(mockDebugManager.getBalanceTool().resetStatistics).toHaveBeenCalled();
            expect(mockDebugManager.clearDebugInfo).toHaveBeenCalled();
        });
    });

    describe('Debug Control Commands', () => {
        test('should enable debug mode', () => {
            const result = (global.window as any).battleCommands.enableDebug(true);

            expect(result.success).toBe(true);
            expect(result.message).toContain('デバッグモードを 有効 にしました');
            expect(mockDebugManager.updateDisplayOptions).toHaveBeenCalledWith({
                logToConsole: true,
                logToScreen: true,
                enableDetailedLogging: true,
            });
        });

        test('should disable debug mode', () => {
            const result = (global.window as any).battleCommands.enableDebug(false);

            expect(result.success).toBe(true);
            expect(result.message).toContain('デバッグモードを 無効 にしました');
        });

        test('should toggle attack range debug', () => {
            const result = (global.window as any).battleCommands.showAttackRangeDebug(true);

            expect(result.success).toBe(true);
            expect(result.message).toContain('攻撃範囲デバッグ表示を 有効 にしました');
            expect(mockDebugManager.updateDisplayOptions).toHaveBeenCalledWith({
                showAttackRange: true,
            });
        });

        test('should toggle damage debug', () => {
            const result = (global.window as any).battleCommands.showDamageDebug(false);

            expect(result.success).toBe(true);
            expect(result.message).toContain('ダメージ計算デバッグ表示を 無効 にしました');
            expect(mockDebugManager.updateDisplayOptions).toHaveBeenCalledWith({
                showDamageCalculation: false,
            });
        });

        test('should clear debug info', () => {
            const result = (global.window as any).battleCommands.clearDebugInfo();

            expect(result.success).toBe(true);
            expect(result.message).toBe('デバッグ情報をクリアしました');
            expect(mockDebugManager.clearDebugInfo).toHaveBeenCalled();
        });
    });

    describe('Help Command', () => {
        test('should display help information', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const result = (global.window as any).battleCommands.help();

            expect(result.success).toBe(true);
            expect(result.message).toContain('ヘルプをコンソールに表示しました');
            expect(result.data).toContain('戦闘コンソールコマンド ヘルプ');
            expect(result.data).toContain('設定関連');
            expect(result.data).toContain('ユニット管理');
            expect(result.data).toContain('戦闘テスト');
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('戦闘コンソールコマンド ヘルプ'));

            consoleSpy.mockRestore();
        });
    });

    describe('Cleanup', () => {
        test('should destroy console commands and clean up', () => {
            consoleCommands.destroy();

            expect((global.window as any).battleCommands).toBeUndefined();
        });

        test('should handle missing debug manager gracefully', () => {
            const commandsWithoutDebug = new BattleConsoleCommands();

            const result = (global.window as any).battleCommands.getStatistics();
            expect(result.success).toBe(false);
            expect(result.message).toContain('バランスツールが利用できません');

            commandsWithoutDebug.destroy();
        });
    });
});