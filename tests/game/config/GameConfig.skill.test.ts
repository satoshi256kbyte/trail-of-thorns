/**
 * GameConfig スキルシステム設定テストスイート
 * 
 * スキルシステム設定とデバッグツールの統合テスト
 */

import { GameConfig } from '../../../game/src/config/GameConfig';

describe('GameConfig - Skill System Settings', () => {
    let gameConfig: GameConfig;

    beforeEach(() => {
        gameConfig = new GameConfig();
    });

    describe('スキルシステム設定の取得', () => {
        test('スキルシステム設定を取得できる', () => {
            const skillConfig = gameConfig.getSkillSystemConfig();

            expect(skillConfig).toBeDefined();
            expect(skillConfig.enableSkillSystem).toBe(true);
            expect(skillConfig.enableSkillAnimations).toBe(true);
            expect(skillConfig.enableSkillSounds).toBe(true);
            expect(skillConfig.balanceSettings).toBeDefined();
            expect(skillConfig.debugColors).toBeDefined();
            expect(skillConfig.consoleCommands).toBeDefined();
            expect(skillConfig.testingConfig).toBeDefined();
        });

        test('バランス設定を取得できる', () => {
            const balanceSettings = gameConfig.getSkillSystemBalanceSettings();

            expect(balanceSettings).toBeDefined();
            expect(balanceSettings.globalSkillDamageMultiplier).toBe(1.0);
            expect(balanceSettings.globalSkillHealingMultiplier).toBe(1.0);
            expect(balanceSettings.globalMPCostMultiplier).toBe(1.0);
            expect(balanceSettings.globalCooldownMultiplier).toBe(1.0);
            expect(balanceSettings.skillCriticalChanceBonus).toBe(5);
            expect(balanceSettings.maxSkillUsagePerTurn).toBe(3);
        });

        test('デバッグ設定を取得できる', () => {
            const debugSettings = gameConfig.getSkillSystemDebugSettings();

            expect(debugSettings).toBeDefined();
            expect(typeof debugSettings.enableSkillDebug).toBe('boolean');
            expect(typeof debugSettings.showConditionCheckDebug).toBe('boolean');
            expect(typeof debugSettings.showExecutionDebug).toBe('boolean');
            expect(typeof debugSettings.showEffectCalculationDebug).toBe('boolean');
            expect(debugSettings.testingConfig).toBeDefined();
        });
    });

    describe('バランス設定の更新', () => {
        test('グローバルダメージ倍率を更新できる', () => {
            const result = gameConfig.updateSkillSystemBalanceSetting('globalDamageMultiplier', 1.5);

            expect(result).toBe(true);

            const balanceSettings = gameConfig.getSkillSystemBalanceSettings();
            expect(balanceSettings.globalSkillDamageMultiplier).toBe(1.5);
        });

        test('グローバル回復倍率を更新できる', () => {
            const result = gameConfig.updateSkillSystemBalanceSetting('globalHealingMultiplier', 1.2);

            expect(result).toBe(true);

            const balanceSettings = gameConfig.getSkillSystemBalanceSettings();
            expect(balanceSettings.globalSkillHealingMultiplier).toBe(1.2);
        });

        test('MPコスト倍率を更新できる', () => {
            const result = gameConfig.updateSkillSystemBalanceSetting('globalMPCostMultiplier', 0.8);

            expect(result).toBe(true);

            const balanceSettings = gameConfig.getSkillSystemBalanceSettings();
            expect(balanceSettings.globalMPCostMultiplier).toBe(0.8);
        });

        test('クールダウン倍率を更新できる', () => {
            const result = gameConfig.updateSkillSystemBalanceSetting('globalCooldownMultiplier', 1.3);

            expect(result).toBe(true);

            const balanceSettings = gameConfig.getSkillSystemBalanceSettings();
            expect(balanceSettings.globalCooldownMultiplier).toBe(1.3);
        });

        test('スキルクリティカルチャンスボーナスを更新できる', () => {
            const result = gameConfig.updateSkillSystemBalanceSetting('skillCriticalChanceBonus', 10);

            expect(result).toBe(true);

            const balanceSettings = gameConfig.getSkillSystemBalanceSettings();
            expect(balanceSettings.skillCriticalChanceBonus).toBe(10);
        });

        test('ターン毎最大スキル使用回数を更新できる', () => {
            const result = gameConfig.updateSkillSystemBalanceSetting('maxSkillUsagePerTurn', 5);

            expect(result).toBe(true);

            const balanceSettings = gameConfig.getSkillSystemBalanceSettings();
            expect(balanceSettings.maxSkillUsagePerTurn).toBe(5);
        });

        test('無効な値でエラーが発生する', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // 負の値
            let result = gameConfig.updateSkillSystemBalanceSetting('globalDamageMultiplier', -1);
            expect(result).toBe(false);

            // ゼロ
            result = gameConfig.updateSkillSystemBalanceSetting('globalHealingMultiplier', 0);
            expect(result).toBe(false);

            // 範囲外の値（クリティカルチャンス）
            result = gameConfig.updateSkillSystemBalanceSetting('skillCriticalChanceBonus', 150);
            expect(result).toBe(false);

            // 非整数値（最大使用回数）
            result = gameConfig.updateSkillSystemBalanceSetting('maxSkillUsagePerTurn', 2.5);
            expect(result).toBe(false);

            consoleSpy.mockRestore();
        });

        test('存在しない設定キーでエラーが発生する', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = gameConfig.updateSkillSystemBalanceSetting('nonExistentSetting', 1.0);

            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith('Unknown skill balance setting: nonExistentSetting');

            consoleSpy.mockRestore();
        });
    });

    describe('デバッグ設定の更新', () => {
        test('スキルデバッグモードを有効にできる', () => {
            const result = gameConfig.updateSkillSystemDebugSetting('enableSkillDebug', true);

            expect(result).toBe(true);

            const debugSettings = gameConfig.getSkillSystemDebugSettings();
            expect(debugSettings.enableSkillDebug).toBe(true);
        });

        test('条件チェックデバッグを有効にできる', () => {
            const result = gameConfig.updateSkillSystemDebugSetting('showConditionCheckDebug', true);

            expect(result).toBe(true);

            const debugSettings = gameConfig.getSkillSystemDebugSettings();
            expect(debugSettings.showConditionCheckDebug).toBe(true);
        });

        test('実行デバッグを有効にできる', () => {
            const result = gameConfig.updateSkillSystemDebugSetting('showExecutionDebug', true);

            expect(result).toBe(true);

            const debugSettings = gameConfig.getSkillSystemDebugSettings();
            expect(debugSettings.showExecutionDebug).toBe(true);
        });

        test('効果計算デバッグを有効にできる', () => {
            const result = gameConfig.updateSkillSystemDebugSetting('showEffectCalculationDebug', true);

            expect(result).toBe(true);

            const debugSettings = gameConfig.getSkillSystemDebugSettings();
            expect(debugSettings.showEffectCalculationDebug).toBe(true);
        });

        test('詳細ログを有効にできる', () => {
            const result = gameConfig.updateSkillSystemDebugSetting('enableDetailedLogging', true);

            expect(result).toBe(true);

            const debugSettings = gameConfig.getSkillSystemDebugSettings();
            expect(debugSettings.enableDetailedLogging).toBe(true);
        });

        test('テストモードを有効にできる', () => {
            const result = gameConfig.updateSkillSystemDebugSetting('enableTestingMode', true);

            expect(result).toBe(true);

            const debugSettings = gameConfig.getSkillSystemDebugSettings();
            expect(debugSettings.testingConfig.enableTestingMode).toBe(true);
        });

        test('存在しない設定キーでエラーが発生する', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = gameConfig.updateSkillSystemDebugSetting('nonExistentSetting', true);

            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith('Unknown skill debug setting: nonExistentSetting');

            consoleSpy.mockRestore();
        });
    });

    describe('設定のリセット', () => {
        test('スキルシステム設定をデフォルトにリセットできる', () => {
            // 設定を変更
            gameConfig.updateSkillSystemBalanceSetting('globalDamageMultiplier', 2.0);
            gameConfig.updateSkillSystemDebugSetting('enableSkillDebug', true);

            // 変更されたことを確認
            let balanceSettings = gameConfig.getSkillSystemBalanceSettings();
            let debugSettings = gameConfig.getSkillSystemDebugSettings();
            expect(balanceSettings.globalSkillDamageMultiplier).toBe(2.0);
            expect(debugSettings.enableSkillDebug).toBe(true);

            // リセット実行
            gameConfig.resetSkillSystemSettings();

            // デフォルト値に戻ったことを確認
            balanceSettings = gameConfig.getSkillSystemBalanceSettings();
            debugSettings = gameConfig.getSkillSystemDebugSettings();
            expect(balanceSettings.globalSkillDamageMultiplier).toBe(1.0);
            expect(debugSettings.enableSkillDebug).toBe(process.env.NODE_ENV === 'development');
        });
    });

    describe('設定の検証', () => {
        test('スキルシステム設定が正しく検証される', () => {
            const result = gameConfig.validateConfig();
            expect(result).toBe(true);
        });

        test('無効な設定で検証が失敗する', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // 無効な設定を直接設定（通常のAPIでは防がれる）
            const skillConfig = gameConfig.getSkillSystemConfig();
            skillConfig.balanceSettings.globalSkillDamageMultiplier = -1;

            const result = (gameConfig as any).validateSkillSystemConfig();
            expect(result).toBe(false);

            consoleSpy.mockRestore();
        });
    });

    describe('設定の表示', () => {
        test('設定をコンソールに出力できる', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            gameConfig.logConfig();

            expect(consoleSpy).toHaveBeenCalledWith('Game Configuration:');
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Skill System:'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Global Skill Damage Multiplier:'));

            consoleSpy.mockRestore();
        });
    });

    describe('設定の更新通知', () => {
        test('設定更新時にログが出力される', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            gameConfig.updateSkillSystemBalanceSetting('globalDamageMultiplier', 1.5);

            expect(consoleSpy).toHaveBeenCalledWith(
                'GameConfig: Skill balance setting \'globalDamageMultiplier\' updated to 1.5'
            );

            consoleSpy.mockRestore();
        });

        test('デバッグ設定更新時にログが出力される', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            gameConfig.updateSkillSystemDebugSetting('enableSkillDebug', true);

            expect(consoleSpy).toHaveBeenCalledWith(
                'GameConfig: Skill debug setting \'enableSkillDebug\' updated to true'
            );

            consoleSpy.mockRestore();
        });
    });

    describe('エラーハンドリング', () => {
        test('設定更新中のエラーが適切に処理される', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // 内部エラーをシミュレート（実際の実装では発生しにくい）
            const originalMethod = gameConfig.updateSkillSystemBalanceSetting;
            gameConfig.updateSkillSystemBalanceSetting = jest.fn().mockImplementation(() => {
                throw new Error('Test error');
            });

            const result = gameConfig.updateSkillSystemBalanceSetting('globalDamageMultiplier', 1.5);

            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith('Failed to update skill balance setting:', expect.any(Error));

            // 元のメソッドを復元
            gameConfig.updateSkillSystemBalanceSetting = originalMethod;
            consoleSpy.mockRestore();
        });
    });
});