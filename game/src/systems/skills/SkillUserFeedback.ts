/**
 * スキルユーザーフィードバックシステム
 * 
 * このファイルには以下のクラスが含まれます：
 * - SkillUserFeedback: エラー通知とガイダンス表示を管理するクラス
 * - エラーメッセージの視覚的表示
 * - ユーザーガイダンスの表示
 * - 通知システムとの統合
 */

import * as Phaser from 'phaser';
import {
    SkillError,
    ErrorSeverity,
    SkillErrorDetails
} from './SkillErrorHandler';

/**
 * 通知種別
 */
export enum NotificationType {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    SUCCESS = 'success'
}

/**
 * 通知設定
 */
export interface NotificationConfig {
    /** 表示位置 */
    position: 'top' | 'center' | 'bottom';
    /** 表示時間（ミリ秒） */
    duration: number;
    /** フェードアニメーション時間 */
    fadeTime: number;
    /** 最大表示数 */
    maxNotifications: number;
    /** 音響効果を有効にするか */
    enableSound: boolean;
}

/**
 * 通知データ
 */
export interface NotificationData {
    /** 通知ID */
    id: string;
    /** メッセージ */
    message: string;
    /** 種別 */
    type: NotificationType;
    /** 表示時間 */
    duration: number;
    /** 推奨アクション */
    actions?: string[];
    /** 詳細情報 */
    details?: any;
}

/**
 * ガイダンス情報
 */
export interface GuidanceInfo {
    /** タイトル */
    title: string;
    /** 推奨アクション */
    actions: string[];
    /** エラー種別 */
    error: SkillError;
    /** 詳細説明 */
    description?: string;
}

/**
 * スキルユーザーフィードバック
 * エラー通知とユーザーガイダンスの表示を管理する
 */
export class SkillUserFeedback extends Phaser.Events.EventEmitter {
    private scene: Phaser.Scene;
    private config: NotificationConfig;

    /** 通知コンテナ */
    private notificationContainer: Phaser.GameObjects.Container;

    /** アクティブな通知 */
    private activeNotifications: Map<string, Phaser.GameObjects.Container> = new Map();

    /** ガイダンスパネル */
    private guidancePanel: Phaser.GameObjects.Container | null = null;

    /** 通知カウンター */
    private notificationCounter = 0;

    /** デフォルト設定 */
    private static readonly DEFAULT_CONFIG: NotificationConfig = {
        position: 'top',
        duration: 3000,
        fadeTime: 300,
        maxNotifications: 3,
        enableSound: true
    };

    /** エラー種別と通知種別のマッピング */
    private static readonly ERROR_TO_NOTIFICATION_TYPE: Record<ErrorSeverity, NotificationType> = {
        [ErrorSeverity.INFO]: NotificationType.INFO,
        [ErrorSeverity.WARNING]: NotificationType.WARNING,
        [ErrorSeverity.ERROR]: NotificationType.ERROR,
        [ErrorSeverity.CRITICAL]: NotificationType.ERROR
    };

    /** 通知種別の色設定 */
    private static readonly NOTIFICATION_COLORS = {
        [NotificationType.INFO]: 0x3498db,
        [NotificationType.WARNING]: 0xf39c12,
        [NotificationType.ERROR]: 0xe74c3c,
        [NotificationType.SUCCESS]: 0x27ae60
    };

    /**
     * SkillUserFeedbackを作成する
     * @param scene Phaserシーン
     * @param config 通知設定
     */
    constructor(scene: Phaser.Scene, config?: Partial<NotificationConfig>) {
        super();

        this.scene = scene;
        this.config = { ...SkillUserFeedback.DEFAULT_CONFIG, ...config };

        this.createNotificationContainer();
        this.setupEventListeners();

        this.log('SkillUserFeedback initialized', { config: this.config });
    }

    /**
     * 通知コンテナを作成する
     */
    private createNotificationContainer(): void {
        this.notificationContainer = this.scene.add.container(0, 0);
        this.notificationContainer.setDepth(1000); // 最前面に表示

        // 画面サイズに応じて位置を調整
        this.updateContainerPosition();

        // 画面リサイズ時の対応
        this.scene.scale.on('resize', this.updateContainerPosition, this);
    }

    /**
     * コンテナ位置を更新する
     */
    private updateContainerPosition(): void {
        const { width, height } = this.scene.scale;

        switch (this.config.position) {
            case 'top':
                this.notificationContainer.setPosition(width / 2, 100);
                break;
            case 'center':
                this.notificationContainer.setPosition(width / 2, height / 2);
                break;
            case 'bottom':
                this.notificationContainer.setPosition(width / 2, height - 100);
                break;
        }
    }

    /**
     * エラー通知を表示する
     * @param errorDetails エラー詳細情報
     */
    showErrorNotification(errorDetails: SkillErrorDetails): void {
        const notificationType = SkillUserFeedback.ERROR_TO_NOTIFICATION_TYPE[errorDetails.severity];

        const notificationData: NotificationData = {
            id: this.generateNotificationId(),
            message: errorDetails.userMessage,
            type: notificationType,
            duration: this.config.duration,
            actions: errorDetails.suggestedActions,
            details: errorDetails
        };

        this.showNotification(notificationData);
    }

    /**
     * 通知を表示する
     * @param data 通知データ
     */
    showNotification(data: NotificationData): void {
        // 最大表示数をチェック
        if (this.activeNotifications.size >= this.config.maxNotifications) {
            this.removeOldestNotification();
        }

        // 通知UIを作成
        const notificationUI = this.createNotificationUI(data);

        // コンテナに追加
        this.notificationContainer.add(notificationUI);
        this.activeNotifications.set(data.id, notificationUI);

        // 位置を調整
        this.arrangeNotifications();

        // 表示アニメーション
        this.playShowAnimation(notificationUI);

        // 音響効果
        if (this.config.enableSound) {
            this.playNotificationSound(data.type);
        }

        // 自動削除タイマー
        if (data.duration > 0) {
            this.scene.time.delayedCall(data.duration, () => {
                this.hideNotification(data.id);
            });
        }

        this.log('Notification shown', {
            id: data.id,
            type: data.type,
            message: data.message
        });

        this.emit('notification-shown', data);
    }

    /**
     * 通知UIを作成する
     * @param data 通知データ
     * @returns 通知UI
     */
    private createNotificationUI(data: NotificationData): Phaser.GameObjects.Container {
        const container = this.scene.add.container(0, 0);

        // 背景
        const background = this.scene.add.rectangle(
            0, 0, 400, 80,
            SkillUserFeedback.NOTIFICATION_COLORS[data.type],
            0.9
        );
        background.setStrokeStyle(2, 0xffffff, 0.8);
        container.add(background);

        // アイコン
        const icon = this.createNotificationIcon(data.type);
        icon.setPosition(-180, 0);
        container.add(icon);

        // メッセージテキスト
        const messageText = this.scene.add.text(-150, -10, data.message, {
            fontSize: '16px',
            color: '#ffffff',
            fontFamily: 'Arial',
            wordWrap: { width: 280 }
        });
        messageText.setOrigin(0, 0.5);
        container.add(messageText);

        // アクションボタン（推奨アクションがある場合）
        if (data.actions && data.actions.length > 0) {
            const actionText = this.scene.add.text(-150, 15, `💡 ${data.actions[0]}`, {
                fontSize: '12px',
                color: '#ffffff',
                fontFamily: 'Arial',
                alpha: 0.8
            });
            actionText.setOrigin(0, 0.5);
            container.add(actionText);
        }

        // 閉じるボタン
        const closeButton = this.scene.add.text(180, -30, '×', {
            fontSize: '20px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        closeButton.setOrigin(0.5);
        closeButton.setInteractive({ useHandCursor: true });
        closeButton.on('pointerdown', () => {
            this.hideNotification(data.id);
        });
        container.add(closeButton);

        // ホバー効果
        background.setInteractive();
        background.on('pointerover', () => {
            background.setAlpha(1.0);
        });
        background.on('pointerout', () => {
            background.setAlpha(0.9);
        });

        // 詳細表示（クリック時）
        background.on('pointerdown', () => {
            if (data.details) {
                this.showDetailedInfo(data.details);
            }
        });

        return container;
    }

    /**
     * 通知アイコンを作成する
     * @param type 通知種別
     * @returns アイコン
     */
    private createNotificationIcon(type: NotificationType): Phaser.GameObjects.Text {
        let iconText: string;

        switch (type) {
            case NotificationType.INFO:
                iconText = 'ℹ️';
                break;
            case NotificationType.WARNING:
                iconText = '⚠️';
                break;
            case NotificationType.ERROR:
                iconText = '❌';
                break;
            case NotificationType.SUCCESS:
                iconText = '✅';
                break;
            default:
                iconText = 'ℹ️';
        }

        return this.scene.add.text(0, 0, iconText, {
            fontSize: '24px'
        }).setOrigin(0.5);
    }

    /**
     * 通知を非表示にする
     * @param notificationId 通知ID
     */
    hideNotification(notificationId: string): void {
        const notification = this.activeNotifications.get(notificationId);
        if (!notification) return;

        // 非表示アニメーション
        this.playHideAnimation(notification, () => {
            // コンテナから削除
            this.notificationContainer.remove(notification);
            notification.destroy();
            this.activeNotifications.delete(notificationId);

            // 残りの通知の位置を調整
            this.arrangeNotifications();

            this.log('Notification hidden', { id: notificationId });
            this.emit('notification-hidden', notificationId);
        });
    }

    /**
     * 最も古い通知を削除する
     */
    private removeOldestNotification(): void {
        const oldestId = this.activeNotifications.keys().next().value;
        if (oldestId) {
            this.hideNotification(oldestId);
        }
    }

    /**
     * 通知の配置を調整する
     */
    private arrangeNotifications(): void {
        let yOffset = 0;
        const spacing = 90;

        for (const notification of this.activeNotifications.values()) {
            notification.setY(yOffset);
            yOffset += spacing;
        }
    }

    /**
     * 表示アニメーションを再生する
     * @param notification 通知UI
     */
    private playShowAnimation(notification: Phaser.GameObjects.Container): void {
        notification.setAlpha(0);
        notification.setScale(0.8);

        this.scene.tweens.add({
            targets: notification,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: this.config.fadeTime,
            ease: 'Back.easeOut'
        });
    }

    /**
     * 非表示アニメーションを再生する
     * @param notification 通知UI
     * @param onComplete 完了コールバック
     */
    private playHideAnimation(
        notification: Phaser.GameObjects.Container,
        onComplete: () => void
    ): void {
        this.scene.tweens.add({
            targets: notification,
            alpha: 0,
            scaleX: 0.8,
            scaleY: 0.8,
            x: notification.x + 100,
            duration: this.config.fadeTime,
            ease: 'Back.easeIn',
            onComplete
        });
    }

    /**
     * 通知音を再生する
     * @param type 通知種別
     */
    private playNotificationSound(type: NotificationType): void {
        let soundKey: string;

        switch (type) {
            case NotificationType.INFO:
                soundKey = 'notification_info';
                break;
            case NotificationType.WARNING:
                soundKey = 'notification_warning';
                break;
            case NotificationType.ERROR:
                soundKey = 'notification_error';
                break;
            case NotificationType.SUCCESS:
                soundKey = 'notification_success';
                break;
            default:
                soundKey = 'notification_info';
        }

        // 音響効果を再生（実際の実装では適切な音響システムを使用）
        this.emit('play-notification-sound', { soundKey, volume: 0.6 });
    }

    /**
     * ユーザーガイダンスを表示する
     * @param guidance ガイダンス情報
     */
    showGuidance(guidance: GuidanceInfo): void {
        // 既存のガイダンスパネルを削除
        if (this.guidancePanel) {
            this.hideGuidance();
        }

        // ガイダンスパネルを作成
        this.guidancePanel = this.createGuidancePanel(guidance);

        // シーンに追加
        this.scene.add.existing(this.guidancePanel);

        // 表示アニメーション
        this.playGuidanceShowAnimation();

        this.log('Guidance shown', {
            title: guidance.title,
            actionsCount: guidance.actions.length
        });

        this.emit('guidance-shown', guidance);
    }

    /**
     * ガイダンスパネルを作成する
     * @param guidance ガイダンス情報
     * @returns ガイダンスパネル
     */
    private createGuidancePanel(guidance: GuidanceInfo): Phaser.GameObjects.Container {
        const { width, height } = this.scene.scale;
        const container = this.scene.add.container(width / 2, height / 2);
        container.setDepth(1100);

        // 背景オーバーレイ
        const overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.5);
        overlay.setInteractive();
        overlay.on('pointerdown', () => {
            this.hideGuidance();
        });
        container.add(overlay);

        // パネル背景
        const panelWidth = 500;
        const panelHeight = Math.min(400, 100 + guidance.actions.length * 40);
        const panel = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x2c3e50, 0.95);
        panel.setStrokeStyle(3, 0x3498db, 1.0);
        container.add(panel);

        // タイトル
        const title = this.scene.add.text(0, -panelHeight / 2 + 40, guidance.title, {
            fontSize: '20px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        title.setOrigin(0.5);
        container.add(title);

        // 説明文（ある場合）
        let yOffset = -panelHeight / 2 + 80;
        if (guidance.description) {
            const description = this.scene.add.text(0, yOffset, guidance.description, {
                fontSize: '14px',
                color: '#bdc3c7',
                fontFamily: 'Arial',
                wordWrap: { width: panelWidth - 40 }
            });
            description.setOrigin(0.5, 0);
            container.add(description);
            yOffset += 60;
        }

        // アクションリスト
        guidance.actions.forEach((action, index) => {
            const actionText = this.scene.add.text(0, yOffset, `${index + 1}. ${action}`, {
                fontSize: '16px',
                color: '#ffffff',
                fontFamily: 'Arial',
                wordWrap: { width: panelWidth - 40 }
            });
            actionText.setOrigin(0.5, 0);
            container.add(actionText);
            yOffset += 35;
        });

        // 閉じるボタン
        const closeButton = this.scene.add.text(panelWidth / 2 - 20, -panelHeight / 2 + 20, '×', {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        closeButton.setOrigin(0.5);
        closeButton.setInteractive({ useHandCursor: true });
        closeButton.on('pointerdown', () => {
            this.hideGuidance();
        });
        container.add(closeButton);

        return container;
    }

    /**
     * ガイダンス表示アニメーションを再生する
     */
    private playGuidanceShowAnimation(): void {
        if (!this.guidancePanel) return;

        this.guidancePanel.setAlpha(0);
        this.guidancePanel.setScale(0.8);

        this.scene.tweens.add({
            targets: this.guidancePanel,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
    }

    /**
     * ガイダンスを非表示にする
     */
    hideGuidance(): void {
        if (!this.guidancePanel) return;

        this.scene.tweens.add({
            targets: this.guidancePanel,
            alpha: 0,
            scaleX: 0.8,
            scaleY: 0.8,
            duration: 200,
            ease: 'Back.easeIn',
            onComplete: () => {
                if (this.guidancePanel) {
                    this.guidancePanel.destroy();
                    this.guidancePanel = null;
                }
            }
        });

        this.log('Guidance hidden');
        this.emit('guidance-hidden');
    }

    /**
     * 詳細情報を表示する
     * @param details 詳細情報
     */
    private showDetailedInfo(details: SkillErrorDetails): void {
        // 詳細情報パネルを表示
        this.emit('show-detailed-info', {
            error: details.error,
            message: details.message,
            context: details.context,
            severity: details.severity,
            recoverable: details.recoverable
        });
    }

    /**
     * 通知IDを生成する
     * @returns 通知ID
     */
    private generateNotificationId(): string {
        return `notification_${++this.notificationCounter}_${Date.now()}`;
    }

    /**
     * イベントリスナーを設定する
     */
    private setupEventListeners(): void {
        // 画面リサイズ時の対応は既にcreateNotificationContainerで設定済み
    }

    /**
     * ログ出力
     * @param message メッセージ
     * @param data 追加データ
     */
    private log(message: string, data?: any): void {
        console.log(`[SkillUserFeedback] ${message}`, data || '');
    }

    /**
     * 全ての通知をクリアする
     */
    clearAllNotifications(): void {
        for (const notificationId of this.activeNotifications.keys()) {
            this.hideNotification(notificationId);
        }
    }

    /**
     * 設定を更新する
     * @param config 新しい設定
     */
    updateConfig(config: Partial<NotificationConfig>): void {
        this.config = { ...this.config, ...config };
        this.updateContainerPosition();
        this.log('Configuration updated', this.config);
    }

    /**
     * アクティブな通知数を取得する
     * @returns アクティブな通知数
     */
    getActiveNotificationCount(): number {
        return this.activeNotifications.size;
    }

    /**
     * ガイダンスが表示中かどうかを取得する
     * @returns ガイダンス表示中かどうか
     */
    isGuidanceVisible(): boolean {
        return this.guidancePanel !== null;
    }

    /**
     * リソースを破棄する
     */
    destroy(): void {
        this.clearAllNotifications();
        this.hideGuidance();

        if (this.notificationContainer) {
            this.notificationContainer.destroy();
        }

        this.scene.scale.off('resize', this.updateContainerPosition, this);
        this.removeAllListeners();

        this.log('SkillUserFeedback destroyed');
    }
}