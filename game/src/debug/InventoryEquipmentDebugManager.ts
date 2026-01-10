/**
 * InventoryEquipmentDebugManager - インベントリ・装備システム統合デバッグマネージャー
 * 
 * インベントリ・装備システムのデバッグ機能を統合管理：
 * - コンソールコマンド管理
 * - デバッグUI表示
 * - 状態監視
 * - パフォーマンス測定
 */

import * as Phaser from 'phaser';
import { InventoryManager } from '../systems/InventoryManager';
import { EquipmentManager } from '../systems/EquipmentManager';
import { InventoryConsoleCommands } from './InventoryConsoleCommands';
import { EquipmentConsoleCommands } from './EquipmentConsoleCommands';

/**
 * デバッグ設定
 */
export interface InventoryEquipmentDebugConfig {
    /** デバッグモードを有効にする */
    enabled: boolean;
    /** デバッグUI表示を有効にする */
    showDebugUI: boolean;
    /** 詳細ログ出力を有効にする */
    enableDetailedLogging: boolean;
    /** パフォーマンス監視を有効にする */
    enablePerformanceMonitoring: boolean;
    /** UI更新間隔（ミリ秒） */
    uiUpdateInterval: number;
}

/**
 * インベントリ・装備デバッグマネージャー
 */
export class InventoryEquipmentDebugManager extends Phaser.Events.EventEmitter {
    private scene: Phaser.Scene;
    private inventoryManager: InventoryManager;
    private equipmentManager: EquipmentManager;
    private inventoryCommands: InventoryConsoleCommands;
    private equipmentCommands: EquipmentConsoleCommands;
    private config: InventoryEquipmentDebugConfig;
    private isEnabled: boolean = false;

    // デバッグUI要素
    private debugContainer?: Phaser.GameObjects.Container;
    private inventoryStatusText?: Phaser.GameObjects.Text;
    private equipmentStatusText?: Phaser.GameObjects.Text;
    private performanceText?: Phaser.GameObjects.Text;

    // パフォーマンス監視
    private performanceMetrics: Map<string, number> = new Map();
    private lastUpdateTime: number = 0;

    // デフォルト設定
    private static readonly DEFAULT_CONFIG: InventoryEquipmentDebugConfig = {
        enabled: false,
        showDebugUI: true,
        enableDetailedLogging: true,
        enablePerformanceMonitoring: true,
        uiUpdateInterval: 1000
    };

    /**
     * コンストラクタ
     * @param scene Phaserシーン
     * @param inventoryManager インベントリマネージャー
     * @param equipmentManager 装備マネージャー
     * @param config デバッグ設定
     */
    constructor(
        scene: Phaser.Scene,
        inventoryManager: InventoryManager,
        equipmentManager: EquipmentManager,
        config?: Partial<InventoryEquipmentDebugConfig>
    ) {
        super();

        this.scene = scene;
        this.inventoryManager = inventoryManager;
        this.equipmentManager = equipmentManager;
        this.config = { ...InventoryEquipmentDebugManager.DEFAULT_CONFIG, ...config };

        // コンソールコマンドを初期化
        this.inventoryCommands = new InventoryConsoleCommands(inventoryManager);
        this.equipmentCommands = new EquipmentConsoleCommands(equipmentManager);

        // グローバルコマンドを登録
        this.registerGlobalCommands();

        // キーボードショートカットを設定
        this.setupKeyboardShortcuts();

        if (this.config.enabled) {
            this.enableDebugMode();
        }

        this.log('info', 'InventoryEquipmentDebugManager initialized');
    }

    /**
     * デバッグモードを有効にする
     */
    enableDebugMode(): void {
        if (this.isEnabled) {
            return;
        }

        this.isEnabled = true;
        this.log('info', 'Inventory/Equipment debug mode enabled');

        // デバッグUIを作成
        if (this.config.showDebugUI) {
            this.createDebugUI();
        }

        // パフォーマンス監視を開始
        if (this.config.enablePerformanceMonitoring) {
            this.startPerformanceMonitoring();
        }

        this.emit('debug-mode-enabled');
    }

    /**
     * デバッグモードを無効にする
     */
    disableDebugMode(): void {
        if (!this.isEnabled) {
            return;
        }

        this.isEnabled = false;
        this.log('info', 'Inventory/Equipment debug mode disabled');

        // デバッグUIを削除
        this.destroyDebugUI();

        // パフォーマンス監視を停止
        this.stopPerformanceMonitoring();

        this.emit('debug-mode-disabled');
    }

    /**
     * デバッグUIを作成
     */
    private createDebugUI(): void {
        // コンテナを作成
        this.debugContainer = this.scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(10000);

        // インベントリ状態表示
        this.inventoryStatusText = this.scene.add.text(10, 10, '', {
            fontSize: '12px',
            color: '#00ff00',
            fontFamily: 'monospace',
            backgroundColor: 'rgba(0,0,0,0.8)',
            padding: { x: 5, y: 5 }
        }).setScrollFactor(0);
        this.debugContainer.add(this.inventoryStatusText);

        // 装備状態表示
        this.equipmentStatusText = this.scene.add.text(10, 150, '', {
            fontSize: '12px',
            color: '#00ffff',
            fontFamily: 'monospace',
            backgroundColor: 'rgba(0,0,0,0.8)',
            padding: { x: 5, y: 5 }
        }).setScrollFactor(0);
        this.debugContainer.add(this.equipmentStatusText);

        // パフォーマンス表示
        if (this.config.enablePerformanceMonitoring) {
            this.performanceText = this.scene.add.text(10, 300, '', {
                fontSize: '12px',
                color: '#ffff00',
                fontFamily: 'monospace',
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding: { x: 5, y: 5 }
            }).setScrollFactor(0);
            this.debugContainer.add(this.performanceText);
        }

        // UI更新タイマーを開始
        this.scene.time.addEvent({
            delay: this.config.uiUpdateInterval,
            callback: this.updateDebugUI,
            callbackScope: this,
            loop: true
        });

        this.log('info', 'Debug UI created');
    }

    /**
     * デバッグUIを削除
     */
    private destroyDebugUI(): void {
        if (this.debugContainer) {
            this.debugContainer.destroy();
            this.debugContainer = undefined;
        }

        this.inventoryStatusText = undefined;
        this.equipmentStatusText = undefined;
        this.performanceText = undefined;

        this.log('info', 'Debug UI destroyed');
    }

    /**
     * デバッグUIを更新
     */
    private updateDebugUI(): void {
        if (!this.isEnabled || !this.debugContainer) {
            return;
        }

        // インベントリ状態を更新
        if (this.inventoryStatusText) {
            const inventoryDebugInfo = this.inventoryManager.getDebugInfo();
            const inventoryLines = [
                '=== Inventory Status ===',
                `Used Slots: ${inventoryDebugInfo.usedSlots}/${inventoryDebugInfo.maxSlots}`,
                `Available: ${inventoryDebugInfo.availableSlots}`,
                `Total Items: ${inventoryDebugInfo.totalItems}`,
                `Unique Items: ${inventoryDebugInfo.uniqueItems}`
            ];
            this.inventoryStatusText.setText(inventoryLines.join('\n'));
        }

        // 装備状態を更新
        if (this.equipmentStatusText) {
            const equipmentDebugInfo = this.equipmentManager.getDebugInfo();
            const equipmentLines = [
                '=== Equipment Status ===',
                `Total Characters: ${equipmentDebugInfo.totalCharacters}`,
                `With Equipment: ${equipmentDebugInfo.charactersWithEquipment}`
            ];
            this.equipmentStatusText.setText(equipmentLines.join('\n'));
        }

        // パフォーマンス情報を更新
        if (this.performanceText && this.config.enablePerformanceMonitoring) {
            const performanceLines = ['=== Performance ==='];
            this.performanceMetrics.forEach((value, key) => {
                performanceLines.push(`${key}: ${value.toFixed(2)}ms`);
            });
            this.performanceText.setText(performanceLines.join('\n'));
        }
    }

    /**
     * グローバルコマンドを登録
     */
    private registerGlobalCommands(): void {
        // グローバルオブジェクトにコマンドを登録
        if (typeof window !== 'undefined') {
            (window as any).inventoryDebug = {
                // インベントリコマンド
                inventory: this.inventoryCommands,
                
                // 装備コマンド
                equipment: this.equipmentCommands,
                
                // デバッグモード切り替え
                enable: () => this.enableDebugMode(),
                disable: () => this.disableDebugMode(),
                
                // UI表示切り替え
                showUI: () => {
                    this.config.showDebugUI = true;
                    if (this.isEnabled && !this.debugContainer) {
                        this.createDebugUI();
                    }
                },
                hideUI: () => {
                    this.config.showDebugUI = false;
                    this.destroyDebugUI();
                },
                
                // ヘルプ表示
                help: () => {
                    console.log('=== Inventory/Equipment Debug Commands ===');
                    console.log('inventoryDebug.inventory.help() - Show inventory commands');
                    console.log('inventoryDebug.equipment.help() - Show equipment commands');
                    console.log('inventoryDebug.enable() - Enable debug mode');
                    console.log('inventoryDebug.disable() - Disable debug mode');
                    console.log('inventoryDebug.showUI() - Show debug UI');
                    console.log('inventoryDebug.hideUI() - Hide debug UI');
                    console.log('inventoryDebug.getMetrics() - Get performance metrics');
                },
                
                // メトリクス取得
                getMetrics: () => {
                    return {
                        inventory: this.inventoryManager.getDebugInfo(),
                        equipment: this.equipmentManager.getDebugInfo(),
                        performance: Object.fromEntries(this.performanceMetrics)
                    };
                }
            };

            this.log('info', 'Global commands registered: window.inventoryDebug');
        }
    }

    /**
     * キーボードショートカットを設定
     */
    private setupKeyboardShortcuts(): void {
        if (!this.scene.input.keyboard) {
            return;
        }

        // F7: デバッグモード切り替え
        this.scene.input.keyboard.on('keydown-F7', () => {
            if (this.isEnabled) {
                this.disableDebugMode();
            } else {
                this.enableDebugMode();
            }
        });

        // F8: デバッグUI表示切り替え
        this.scene.input.keyboard.on('keydown-F8', () => {
            if (this.isEnabled) {
                if (this.debugContainer) {
                    this.destroyDebugUI();
                } else {
                    this.createDebugUI();
                }
            }
        });

        this.log('info', 'Keyboard shortcuts configured (F7: toggle debug, F8: toggle UI)');
    }

    /**
     * パフォーマンス監視を開始
     */
    private startPerformanceMonitoring(): void {
        this.lastUpdateTime = performance.now();

        // 定期的にパフォーマンスメトリクスを更新
        this.scene.time.addEvent({
            delay: 1000,
            callback: this.updatePerformanceMetrics,
            callbackScope: this,
            loop: true
        });

        this.log('info', 'Performance monitoring started');
    }

    /**
     * パフォーマンス監視を停止
     */
    private stopPerformanceMonitoring(): void {
        this.performanceMetrics.clear();
        this.log('info', 'Performance monitoring stopped');
    }

    /**
     * パフォーマンスメトリクスを更新
     */
    private updatePerformanceMetrics(): void {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;

        // フレームレートを計算
        const fps = 1000 / deltaTime;
        this.performanceMetrics.set('fps', fps);

        // メモリ使用量（利用可能な場合）
        if ((performance as any).memory) {
            const memory = (performance as any).memory;
            this.performanceMetrics.set('heapUsed', memory.usedJSHeapSize / 1024 / 1024);
            this.performanceMetrics.set('heapTotal', memory.totalJSHeapSize / 1024 / 1024);
        }
    }

    /**
     * ログ出力
     * @param level ログレベル
     * @param message メッセージ
     * @param data 追加データ
     */
    private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
        if (!this.config.enableDetailedLogging && level === 'debug') {
            return;
        }

        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [InventoryEquipmentDebug] ${message}`;

        switch (level) {
            case 'debug':
                console.debug(logMessage, data || '');
                break;
            case 'info':
                console.info(logMessage, data || '');
                break;
            case 'warn':
                console.warn(logMessage, data || '');
                break;
            case 'error':
                console.error(logMessage, data || '');
                break;
        }
    }

    /**
     * リソースを破棄
     */
    destroy(): void {
        this.disableDebugMode();
        this.removeAllListeners();
        
        // グローバルコマンドを削除
        if (typeof window !== 'undefined') {
            delete (window as any).inventoryDebug;
        }

        this.log('info', 'InventoryEquipmentDebugManager destroyed');
    }
}
