/**
 * 薔薇の力システム用デバッグマネージャー
 * 
 * 薔薇の力システムの開発・テスト支援機能を提供します。
 */

import { RoseEssenceManager, BossType } from '../systems/jobs/RoseEssenceManager';
import { RoseEssenceConsoleCommands } from './RoseEssenceConsoleCommands';
import { RoseEssenceSource, RoseEssenceSourceType } from '../types/job';

/**
 * 薔薇の力デバッグマネージャー
 */
export class RoseEssenceDebugManager {
    private roseEssenceManager: RoseEssenceManager;
    private consoleCommands: RoseEssenceConsoleCommands;
    private isDebugMode: boolean = false;

    constructor(roseEssenceManager: RoseEssenceManager) {
        this.roseEssenceManager = roseEssenceManager;
        this.consoleCommands = new RoseEssenceConsoleCommands(roseEssenceManager);
    }

    /**
     * デバッグモードを有効化
     */
    enableDebugMode(): void {
        if (process.env.NODE_ENV === 'development') {
            this.isDebugMode = true;
            this.consoleCommands.registerCommands();
            this.setupDebugUI();
            console.log('薔薇の力デバッグモードが有効になりました');
        }
    }

    /**
     * デバッグモードを無効化
     */
    disableDebugMode(): void {
        this.isDebugMode = false;
        this.removeDebugUI();
        console.log('薔薇の力デバッグモードが無効になりました');
    }

    /**
     * デバッグUIをセットアップ
     */
    private setupDebugUI(): void {
        if (typeof document === 'undefined') return;

        // デバッグパネルを作成
        const debugPanel = document.createElement('div');
        debugPanel.id = 'rose-essence-debug-panel';
        debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            display: none;
        `;

        // 薔薇の力表示
        const essenceDisplay = document.createElement('div');
        essenceDisplay.id = 'rose-essence-display';
        essenceDisplay.innerHTML = `薔薇の力: ${this.roseEssenceManager.getCurrentRoseEssence()}`;
        debugPanel.appendChild(essenceDisplay);

        // ボタンコンテナ
        const buttonContainer = document.createElement('div');
        buttonContainer.style.marginTop = '10px';

        // 薔薇の力追加ボタン
        const addButton = this.createButton('薔薇の力+10', () => {
            const source: RoseEssenceSource = {
                type: RoseEssenceSourceType.SPECIAL_EVENT,
                sourceId: 'debug_add',
                eventId: 'debug_event'
            };
            this.roseEssenceManager.addRoseEssence(10, source);
            this.updateDebugDisplay();
        });
        buttonContainer.appendChild(addButton);

        // ボス撃破シミュレーションボタン
        const bossButton = this.createButton('ボス撃破', () => {
            const source: RoseEssenceSource = {
                type: BossType.MAJOR_BOSS,
                sourceId: 'debug_boss',
                bossId: 'debug_major_boss'
            };
            const predicted = this.roseEssenceManager.predictEssenceGain(BossType.MAJOR_BOSS);
            this.roseEssenceManager.addRoseEssence(predicted, source);
            this.updateDebugDisplay();
        });
        buttonContainer.appendChild(bossButton);

        // ランクアップシミュレーションボタン
        const rankUpButton = this.createButton('ランクアップ', () => {
            const success = this.roseEssenceManager.consumeRoseEssence(20, 'rank_up', 'debug_character');
            if (success) {
                this.updateDebugDisplay();
            }
        });
        buttonContainer.appendChild(rankUpButton);

        // リセットボタン
        const resetButton = this.createButton('リセット', () => {
            this.roseEssenceManager.reset();
            this.updateDebugDisplay();
        });
        buttonContainer.appendChild(resetButton);

        debugPanel.appendChild(buttonContainer);

        // 履歴表示
        const historyContainer = document.createElement('div');
        historyContainer.id = 'rose-essence-history';
        historyContainer.style.cssText = `
            margin-top: 10px;
            max-height: 200px;
            overflow-y: auto;
            border-top: 1px solid #666;
            padding-top: 5px;
        `;
        debugPanel.appendChild(historyContainer);

        document.body.appendChild(debugPanel);

        // トグルキー（F12）を設定
        document.addEventListener('keydown', (event) => {
            if (event.key === 'F12' && event.ctrlKey) {
                event.preventDefault();
                this.toggleDebugPanel();
            }
        });

        this.updateDebugDisplay();
    }

    /**
     * デバッグUIを削除
     */
    private removeDebugUI(): void {
        if (typeof document === 'undefined') return;

        const debugPanel = document.getElementById('rose-essence-debug-panel');
        if (debugPanel) {
            debugPanel.remove();
        }
    }

    /**
     * ボタンを作成
     */
    private createButton(text: string, onClick: () => void): HTMLButtonElement {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
            margin: 2px;
            padding: 5px 10px;
            background: #333;
            color: white;
            border: 1px solid #666;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        `;
        button.addEventListener('click', onClick);
        return button;
    }

    /**
     * デバッグパネルの表示/非表示を切り替え
     */
    private toggleDebugPanel(): void {
        const debugPanel = document.getElementById('rose-essence-debug-panel');
        if (debugPanel) {
            debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
        }
    }

    /**
     * デバッグ表示を更新
     */
    private updateDebugDisplay(): void {
        if (!this.isDebugMode) return;

        // 薔薇の力表示を更新
        const essenceDisplay = document.getElementById('rose-essence-display');
        if (essenceDisplay) {
            const stats = this.roseEssenceManager.getEssenceStatistics();
            essenceDisplay.innerHTML = `
                薔薇の力: ${stats.current}<br>
                総獲得: ${stats.totalEarned} | 総消費: ${stats.totalSpent}<br>
                取引回数: ${stats.transactionCount}
            `;
        }

        // 履歴表示を更新
        const historyContainer = document.getElementById('rose-essence-history');
        if (historyContainer) {
            const history = this.roseEssenceManager.getEssenceHistory(5);
            historyContainer.innerHTML = '<strong>最近の取引:</strong><br>';

            if (history.length === 0) {
                historyContainer.innerHTML += '履歴なし';
            } else {
                history.forEach(transaction => {
                    const type = transaction.type === 'gain' ? '獲得' : '消費';
                    const sign = transaction.type === 'gain' ? '+' : '-';
                    const time = transaction.timestamp.toLocaleTimeString();

                    historyContainer.innerHTML += `
                        <div style="font-size: 10px; margin: 2px 0;">
                            [${time}] ${type}: ${sign}${transaction.amount}
                        </div>
                    `;
                });
            }
        }
    }

    /**
     * テストシナリオを実行
     */
    runTestScenario(scenarioName: string): void {
        if (!this.isDebugMode) {
            console.warn('デバッグモードが有効でないため、テストシナリオを実行できません');
            return;
        }

        console.log(`テストシナリオ「${scenarioName}」を実行中...`);

        switch (scenarioName) {
            case 'basic_flow':
                this.runBasicFlowScenario();
                break;
            case 'boss_progression':
                this.runBossProgressionScenario();
                break;
            case 'rank_up_cycle':
                this.runRankUpCycleScenario();
                break;
            case 'insufficient_essence':
                this.runInsufficientEssenceScenario();
                break;
            default:
                console.warn(`未知のテストシナリオ: ${scenarioName}`);
        }
    }

    /**
     * 基本フローテストシナリオ
     */
    private runBasicFlowScenario(): void {
        console.log('=== 基本フローテスト ===');

        // 初期状態確認
        console.log(`初期薔薇の力: ${this.roseEssenceManager.getCurrentRoseEssence()}`);

        // マイナーボス撃破
        const minorBossSource: RoseEssenceSource = {
            type: BossType.MINOR_BOSS,
            sourceId: 'test_minor_boss',
            bossId: 'test_minor_001'
        };
        const minorGain = this.roseEssenceManager.predictEssenceGain(BossType.MINOR_BOSS, true);
        this.roseEssenceManager.addRoseEssence(minorGain, minorBossSource, true);
        console.log(`マイナーボス撃破後: ${this.roseEssenceManager.getCurrentRoseEssence()}`);

        // ランクアップ実行
        const rankUpSuccess = this.roseEssenceManager.consumeRoseEssence(10, 'rank_up', 'test_character');
        console.log(`ランクアップ${rankUpSuccess ? '成功' : '失敗'}: ${this.roseEssenceManager.getCurrentRoseEssence()}`);

        this.updateDebugDisplay();
    }

    /**
     * ボス進行テストシナリオ
     */
    private runBossProgressionScenario(): void {
        console.log('=== ボス進行テスト ===');

        const bossTypes = [BossType.MINOR_BOSS, BossType.MAJOR_BOSS, BossType.CHAPTER_BOSS, BossType.FINAL_BOSS];

        bossTypes.forEach((bossType, index) => {
            const source: RoseEssenceSource = {
                type: bossType,
                sourceId: `test_${bossType}`,
                bossId: `test_${bossType}_${index}`
            };

            const predicted = this.roseEssenceManager.predictEssenceGain(bossType, true);
            this.roseEssenceManager.addRoseEssence(predicted, source, true);

            console.log(`${bossType}撃破後: ${this.roseEssenceManager.getCurrentRoseEssence()}`);
        });

        this.updateDebugDisplay();
    }

    /**
     * ランクアップサイクルテストシナリオ
     */
    private runRankUpCycleScenario(): void {
        console.log('=== ランクアップサイクルテスト ===');

        // 十分な薔薇の力を獲得
        const source: RoseEssenceSource = {
            type: BossType.FINAL_BOSS,
            sourceId: 'test_final_boss',
            bossId: 'test_final_001'
        };
        const finalGain = this.roseEssenceManager.predictEssenceGain(BossType.FINAL_BOSS, true);
        this.roseEssenceManager.addRoseEssence(finalGain, source, true);
        console.log(`ファイナルボス撃破後: ${this.roseEssenceManager.getCurrentRoseEssence()}`);

        // 複数回のランクアップ
        const rankUpCosts = [10, 20, 40, 80];
        rankUpCosts.forEach((cost, index) => {
            const success = this.roseEssenceManager.consumeRoseEssence(cost, 'rank_up', `character_${index + 1}`);
            console.log(`ランク${index + 2}アップ${success ? '成功' : '失敗'}: ${this.roseEssenceManager.getCurrentRoseEssence()}`);
        });

        this.updateDebugDisplay();
    }

    /**
     * 薔薇の力不足テストシナリオ
     */
    private runInsufficientEssenceScenario(): void {
        console.log('=== 薔薇の力不足テスト ===');

        // 少量の薔薇の力を獲得
        const source: RoseEssenceSource = {
            type: BossType.MINOR_BOSS,
            sourceId: 'test_minor_boss',
            bossId: 'test_minor_001'
        };
        const minorGain = this.roseEssenceManager.predictEssenceGain(BossType.MINOR_BOSS);
        this.roseEssenceManager.addRoseEssence(minorGain, source);
        console.log(`マイナーボス撃破後: ${this.roseEssenceManager.getCurrentRoseEssence()}`);

        // 高コストなランクアップを試行
        const success = this.roseEssenceManager.consumeRoseEssence(100, 'rank_up', 'test_character');
        console.log(`高コストランクアップ${success ? '成功' : '失敗'}: ${this.roseEssenceManager.getCurrentRoseEssence()}`);

        // 不足チェック
        const hasEnough = this.roseEssenceManager.hasEnoughEssence(100);
        console.log(`薔薇の力100は${hasEnough ? '十分' : '不足'}`);

        this.updateDebugDisplay();
    }

    /**
     * パフォーマンステストを実行
     */
    runPerformanceTest(): void {
        if (!this.isDebugMode) return;

        console.log('=== パフォーマンステスト開始 ===');
        const startTime = performance.now();

        // 大量の取引を実行
        const source: RoseEssenceSource = {
            type: RoseEssenceSourceType.SPECIAL_EVENT,
            sourceId: 'performance_test',
            eventId: 'perf_test'
        };

        for (let i = 0; i < 1000; i++) {
            this.roseEssenceManager.addRoseEssence(1, source);
            if (i % 2 === 0) {
                this.roseEssenceManager.consumeRoseEssence(1, 'test');
            }
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        console.log(`1000回の取引処理時間: ${duration.toFixed(2)}ms`);
        console.log(`平均処理時間: ${(duration / 1000).toFixed(4)}ms/取引`);

        const stats = this.roseEssenceManager.getEssenceStatistics();
        console.log(`最終統計: 現在=${stats.current}, 取引回数=${stats.transactionCount}`);

        this.updateDebugDisplay();
    }
}