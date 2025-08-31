/**
 * JobSystemUserFeedback - 職業システムのユーザーフィードバックシステム
 * 
 * このクラスは職業システムでのユーザーフィードバック、通知、ガイダンス、
 * ヘルプシステムを提供します。エラーハンドラーと連携してユーザー体験を向上させます。
 * 要件1.5, 2.5, 4.5, 8.5に対応した機能を提供します。
 */

import { JobSystemError, JobSystemContext } from '../../types/job';

/**
 * 通知種別
 */
export enum NotificationType {
    SUCCESS = 'success',
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    CRITICAL = 'critical',
}

/**
 * 通知データ
 */
export interface NotificationData {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    details?: string;
    duration?: number;
    persistent?: boolean;
    actions?: NotificationAction[];
    timestamp: Date;
}

/**
 * 通知アクション
 */
export interface NotificationAction {
    id: string;
    text: string;
    action: string;
    style: 'primary' | 'secondary' | 'warning' | 'danger';
    data?: any;
}

/**
 * ダイアログデータ
 */
export interface DialogData {
    id: string;
    title: string;
    message: string;
    details?: string;
    type: 'confirm' | 'alert' | 'prompt' | 'custom';
    buttons: DialogButton[];
    severity: 'info' | 'warning' | 'error' | 'critical';
    modal: boolean;
    closable: boolean;
}

/**
 * ダイアログボタン
 */
export interface DialogButton {
    id: string;
    text: string;
    action: string;
    style: 'primary' | 'secondary' | 'warning' | 'danger';
    data?: any;
}

/**
 * ガイダンスデータ
 */
export interface GuidanceData {
    id: string;
    title: string;
    content: string;
    steps?: GuidanceStep[];
    category: 'job_change' | 'rank_up' | 'rose_essence' | 'skills' | 'general';
    priority: number;
}

/**
 * ガイダンスステップ
 */
export interface GuidanceStep {
    id: string;
    title: string;
    description: string;
    action?: string;
    completed: boolean;
}

/**
 * フィードバック設定
 */
export interface FeedbackConfig {
    enableNotifications: boolean;
    enableDialogs: boolean;
    enableGuidance: boolean;
    enableSoundEffects: boolean;
    notificationDuration: number;
    maxNotifications: number;
    enableAnimations: boolean;
}

/**
 * JobSystemUserFeedbackクラス
 */
export class JobSystemUserFeedback extends Phaser.Events.EventEmitter {
    private config: FeedbackConfig;
    private activeNotifications: Map<string, NotificationData> = new Map();
    private activeDialogs: Map<string, DialogData> = new Map();
    private guidanceData: Map<string, GuidanceData> = new Map();
    private notificationQueue: NotificationData[] = [];

    private static readonly DEFAULT_CONFIG: FeedbackConfig = {
        enableNotifications: true,
        enableDialogs: true,
        enableGuidance: true,
        enableSoundEffects: true,
        notificationDuration: 5000,
        maxNotifications: 5,
        enableAnimations: true,
    };

    /**
     * UserFeedbackインスタンスを作成
     * @param config フィードバック設定
     */
    constructor(config?: Partial<FeedbackConfig>) {
        super();

        this.config = { ...JobSystemUserFeedback.DEFAULT_CONFIG, ...config };
        this.initializeGuidanceData();
    }

    /**
     * 成功通知を表示
     * 
     * @param title タイトル
     * @param message メッセージ
     * @param details 詳細情報
     * @param actions アクション
     */
    public showSuccessNotification(
        title: string,
        message: string,
        details?: string,
        actions?: NotificationAction[]
    ): void {
        this.showNotification({
            type: NotificationType.SUCCESS,
            title,
            message,
            details,
            actions,
        });
    }

    /**
     * 情報通知を表示
     * 
     * @param title タイトル
     * @param message メッセージ
     * @param details 詳細情報
     * @param actions アクション
     */
    public showInfoNotification(
        title: string,
        message: string,
        details?: string,
        actions?: NotificationAction[]
    ): void {
        this.showNotification({
            type: NotificationType.INFO,
            title,
            message,
            details,
            actions,
        });
    }

    /**
     * 警告通知を表示
     * 
     * @param title タイトル
     * @param message メッセージ
     * @param details 詳細情報
     * @param actions アクション
     */
    public showWarningNotification(
        title: string,
        message: string,
        details?: string,
        actions?: NotificationAction[]
    ): void {
        this.showNotification({
            type: NotificationType.WARNING,
            title,
            message,
            details,
            actions,
            persistent: true,
        });
    }

    /**
     * エラー通知を表示
     * 
     * @param title タイトル
     * @param message メッセージ
     * @param details 詳細情報
     * @param actions アクション
     */
    public showErrorNotification(
        title: string,
        message: string,
        details?: string,
        actions?: NotificationAction[]
    ): void {
        this.showNotification({
            type: NotificationType.ERROR,
            title,
            message,
            details,
            actions,
            persistent: true,
        });
    }

    /**
     * 通知を表示
     * 
     * @param data 通知データ
     */
    private showNotification(data: Partial<NotificationData>): void {
        if (!this.config.enableNotifications) return;

        const notification: NotificationData = {
            id: this.generateId(),
            type: data.type || NotificationType.INFO,
            title: data.title || '',
            message: data.message || '',
            details: data.details,
            duration: data.duration || this.config.notificationDuration,
            persistent: data.persistent || false,
            actions: data.actions || [],
            timestamp: new Date(),
        };

        // 通知数制限チェック
        if (this.activeNotifications.size >= this.config.maxNotifications) {
            this.notificationQueue.push(notification);
            return;
        }

        this.activeNotifications.set(notification.id, notification);

        // 通知表示イベントを発行
        this.emit('show_notification', notification);

        // 音効果を再生
        if (this.config.enableSoundEffects) {
            this.playSoundEffect(notification.type);
        }

        // 自動削除タイマー設定
        if (!notification.persistent && notification.duration > 0) {
            setTimeout(() => {
                this.hideNotification(notification.id);
            }, notification.duration);
        }
    }

    /**
     * 通知を非表示
     * 
     * @param notificationId 通知ID
     */
    public hideNotification(notificationId: string): void {
        const notification = this.activeNotifications.get(notificationId);
        if (notification) {
            this.activeNotifications.delete(notificationId);
            this.emit('hide_notification', notification);

            // キューから次の通知を表示
            this.processNotificationQueue();
        }
    }

    /**
     * 通知キューを処理
     */
    private processNotificationQueue(): void {
        if (this.notificationQueue.length > 0 && this.activeNotifications.size < this.config.maxNotifications) {
            const nextNotification = this.notificationQueue.shift();
            if (nextNotification) {
                this.showNotification(nextNotification);
            }
        }
    }

    /**
     * ダイアログを表示
     * 
     * @param data ダイアログデータ
     * @returns ダイアログID
     */
    public showDialog(data: Partial<DialogData>): string {
        if (!this.config.enableDialogs) return '';

        const dialog: DialogData = {
            id: this.generateId(),
            title: data.title || '',
            message: data.message || '',
            details: data.details,
            type: data.type || 'alert',
            buttons: data.buttons || [
                {
                    id: 'ok',
                    text: 'OK',
                    action: 'close',
                    style: 'primary',
                },
            ],
            severity: data.severity || 'info',
            modal: data.modal !== false,
            closable: data.closable !== false,
        };

        this.activeDialogs.set(dialog.id, dialog);
        this.emit('show_dialog', dialog);

        return dialog.id;
    }

    /**
     * ダイアログを非表示
     * 
     * @param dialogId ダイアログID
     * @param result 結果データ
     */
    public hideDialog(dialogId: string, result?: any): void {
        const dialog = this.activeDialogs.get(dialogId);
        if (dialog) {
            this.activeDialogs.delete(dialogId);
            this.emit('hide_dialog', { dialog, result });
        }
    }

    /**
     * 確認ダイアログを表示
     * 
     * @param title タイトル
     * @param message メッセージ
     * @param onConfirm 確認時のコールバック
     * @param onCancel キャンセル時のコールバック
     * @returns ダイアログID
     */
    public showConfirmDialog(
        title: string,
        message: string,
        onConfirm?: () => void,
        onCancel?: () => void
    ): string {
        const dialogId = this.showDialog({
            title,
            message,
            type: 'confirm',
            buttons: [
                {
                    id: 'confirm',
                    text: '確認',
                    action: 'confirm',
                    style: 'primary',
                },
                {
                    id: 'cancel',
                    text: 'キャンセル',
                    action: 'cancel',
                    style: 'secondary',
                },
            ],
        });

        // ダイアログ結果を監視
        const handleDialogResult = (data: any) => {
            if (data.dialog.id === dialogId) {
                if (data.result?.action === 'confirm' && onConfirm) {
                    onConfirm();
                } else if (data.result?.action === 'cancel' && onCancel) {
                    onCancel();
                }
                this.off('hide_dialog', handleDialogResult);
            }
        };

        this.on('hide_dialog', handleDialogResult);
        return dialogId;
    }

    /**
     * ガイダンスを表示
     * 
     * @param category ガイダンスカテゴリ
     * @param context コンテキスト
     */
    public showGuidance(category: string, context?: any): void {
        if (!this.config.enableGuidance) return;

        const guidance = this.guidanceData.get(category);
        if (guidance) {
            this.emit('show_guidance', { guidance, context });
        }
    }

    /**
     * 職業変更ガイダンスを表示
     * 
     * @param characterId キャラクターID
     * @param availableJobs 利用可能職業
     */
    public showJobChangeGuidance(characterId: string, availableJobs: string[]): void {
        const guidance = this.guidanceData.get('job_change');
        if (guidance) {
            const contextualGuidance = {
                ...guidance,
                context: {
                    characterId,
                    availableJobs,
                    steps: guidance.steps?.map(step => ({
                        ...step,
                        completed: false,
                    })),
                },
            };

            this.emit('show_guidance', contextualGuidance);
        }
    }

    /**
     * ランクアップガイダンスを表示
     * 
     * @param characterId キャラクターID
     * @param requiredRoseEssence 必要な薔薇の力
     * @param currentRoseEssence 現在の薔薇の力
     */
    public showRankUpGuidance(
        characterId: string,
        requiredRoseEssence: number,
        currentRoseEssence: number
    ): void {
        const guidance = this.guidanceData.get('rank_up');
        if (guidance) {
            const contextualGuidance = {
                ...guidance,
                context: {
                    characterId,
                    requiredRoseEssence,
                    currentRoseEssence,
                    shortage: requiredRoseEssence - currentRoseEssence,
                },
            };

            this.emit('show_guidance', contextualGuidance);
        }
    }

    /**
     * 薔薇の力ガイダンスを表示
     * 
     * @param currentAmount 現在の薔薇の力
     * @param nextBossReward 次のボス報酬
     */
    public showRoseEssenceGuidance(currentAmount: number, nextBossReward?: number): void {
        const guidance = this.guidanceData.get('rose_essence');
        if (guidance) {
            const contextualGuidance = {
                ...guidance,
                context: {
                    currentAmount,
                    nextBossReward,
                },
            };

            this.emit('show_guidance', contextualGuidance);
        }
    }

    /**
     * 職業システム固有のフィードバックを処理
     * 
     * @param error エラー種別
     * @param context エラーコンテキスト
     */
    public handleJobSystemFeedback(error: JobSystemError, context: JobSystemContext): void {
        switch (error) {
            case JobSystemError.INSUFFICIENT_ROSE_ESSENCE:
                this.handleRoseEssenceShortage(context);
                break;

            case JobSystemError.LEVEL_REQUIREMENT_NOT_MET:
                this.handleLevelRequirement(context);
                break;

            case JobSystemError.PREREQUISITE_SKILLS_MISSING:
                this.handleSkillRequirement(context);
                break;

            case JobSystemError.JOB_NOT_FOUND:
                this.handleJobNotFound(context);
                break;

            case JobSystemError.RANK_UP_NOT_AVAILABLE:
                this.handleRankUpNotAvailable(context);
                break;

            default:
                this.handleGenericError(error, context);
                break;
        }
    }

    /**
     * 薔薇の力不足フィードバック
     */
    private handleRoseEssenceShortage(context: JobSystemContext): void {
        const shortage = (context.requiredRoseEssence || 0) - (context.currentRoseEssence || 0);

        this.showWarningNotification(
            '薔薇の力が不足しています',
            `ランクアップには${shortage}の薔薇の力が必要です`,
            'ボス戦で薔薇の力を獲得できます',
            [
                {
                    id: 'boss_battle',
                    text: 'ボス戦に挑戦',
                    action: 'navigate_to_boss_battle',
                    style: 'primary',
                },
                {
                    id: 'guidance',
                    text: 'ガイドを見る',
                    action: 'show_rose_essence_guidance',
                    style: 'secondary',
                },
            ]
        );

        this.showRoseEssenceGuidance(context.currentRoseEssence || 0);
    }

    /**
     * レベル要件不足フィードバック
     */
    private handleLevelRequirement(context: JobSystemContext): void {
        const levelShortage = (context.requiredLevel || 0) - (context.currentLevel || 0);

        this.showWarningNotification(
            'レベルが不足しています',
            `ランクアップにはレベル${context.requiredLevel}が必要です`,
            `現在のレベル: ${context.currentLevel} (あと${levelShortage}レベル必要)`,
            [
                {
                    id: 'battle',
                    text: '戦闘で経験値獲得',
                    action: 'navigate_to_battle',
                    style: 'primary',
                },
                {
                    id: 'exp_guidance',
                    text: '経験値ガイド',
                    action: 'show_experience_guidance',
                    style: 'secondary',
                },
            ]
        );
    }

    /**
     * スキル要件不足フィードバック
     */
    private handleSkillRequirement(context: JobSystemContext): void {
        const missingSkills = context.missingSkills || [];

        this.showWarningNotification(
            '必要なスキルが不足しています',
            `${missingSkills.length}個のスキルが必要です`,
            `不足スキル: ${missingSkills.join(', ')}`,
            [
                {
                    id: 'skill_guide',
                    text: 'スキル習得方法',
                    action: 'show_skill_guidance',
                    style: 'primary',
                },
            ]
        );

        this.showGuidance('skills', { missingSkills });
    }

    /**
     * 職業が見つからないフィードバック
     */
    private handleJobNotFound(context: JobSystemContext): void {
        this.showErrorNotification(
            '職業が見つかりません',
            '指定された職業が存在しません',
            `職業ID: ${context.targetJobId}`,
            [
                {
                    id: 'job_list',
                    text: '職業一覧を確認',
                    action: 'show_job_list',
                    style: 'primary',
                },
            ]
        );
    }

    /**
     * ランクアップ不可フィードバック
     */
    private handleRankUpNotAvailable(context: JobSystemContext): void {
        this.showWarningNotification(
            'ランクアップできません',
            '現在の状況ではランクアップできません',
            context.reason || '条件を確認してください',
            [
                {
                    id: 'requirements',
                    text: '条件を確認',
                    action: 'show_rank_up_requirements',
                    style: 'primary',
                },
            ]
        );

        this.showRankUpGuidance(
            context.characterId || '',
            context.requiredRoseEssence || 0,
            context.currentRoseEssence || 0
        );
    }

    /**
     * 汎用エラーフィードバック
     */
    private handleGenericError(error: JobSystemError, context: JobSystemContext): void {
        this.showErrorNotification(
            'エラーが発生しました',
            `職業システムでエラーが発生しました: ${error}`,
            context.reason || '詳細は開発者にお問い合わせください',
            [
                {
                    id: 'retry',
                    text: '再試行',
                    action: 'retry_operation',
                    style: 'primary',
                },
            ]
        );
    }

    /**
     * 音効果を再生
     */
    private playSoundEffect(type: NotificationType): void {
        const soundMap = {
            [NotificationType.SUCCESS]: 'notification_success',
            [NotificationType.INFO]: 'notification_info',
            [NotificationType.WARNING]: 'notification_warning',
            [NotificationType.ERROR]: 'notification_error',
            [NotificationType.CRITICAL]: 'notification_critical',
        };

        const soundKey = soundMap[type];
        if (soundKey) {
            this.emit('play_sound', soundKey);
        }
    }

    /**
     * ガイダンスデータを初期化
     */
    private initializeGuidanceData(): void {
        // 職業変更ガイダンス
        this.guidanceData.set('job_change', {
            id: 'job_change',
            title: '職業変更ガイド',
            content: 'キャラクターの職業を変更する方法を説明します。',
            category: 'job_change',
            priority: 1,
            steps: [
                {
                    id: 'select_character',
                    title: 'キャラクターを選択',
                    description: '職業を変更したいキャラクターを選択してください。',
                    completed: false,
                },
                {
                    id: 'open_job_menu',
                    title: '職業メニューを開く',
                    description: 'キャラクター情報から職業メニューを開いてください。',
                    completed: false,
                },
                {
                    id: 'select_new_job',
                    title: '新しい職業を選択',
                    description: '利用可能な職業から新しい職業を選択してください。',
                    completed: false,
                },
                {
                    id: 'confirm_change',
                    title: '変更を確認',
                    description: '職業変更を確認して実行してください。',
                    completed: false,
                },
            ],
        });

        // ランクアップガイダンス
        this.guidanceData.set('rank_up', {
            id: 'rank_up',
            title: 'ランクアップガイド',
            content: '薔薇の力を使用して職業をランクアップする方法を説明します。',
            category: 'rank_up',
            priority: 1,
            steps: [
                {
                    id: 'check_requirements',
                    title: '条件を確認',
                    description: 'ランクアップに必要な薔薇の力とレベルを確認してください。',
                    completed: false,
                },
                {
                    id: 'gather_rose_essence',
                    title: '薔薇の力を獲得',
                    description: 'ボス戦で薔薇の力を獲得してください。',
                    completed: false,
                },
                {
                    id: 'execute_rank_up',
                    title: 'ランクアップ実行',
                    description: 'ランクアップメニューから実行してください。',
                    completed: false,
                },
            ],
        });

        // 薔薇の力ガイダンス
        this.guidanceData.set('rose_essence', {
            id: 'rose_essence',
            title: '薔薇の力ガイド',
            content: '薔薇の力の獲得と使用方法を説明します。',
            category: 'rose_essence',
            priority: 2,
            steps: [
                {
                    id: 'find_boss',
                    title: 'ボスを見つける',
                    description: 'ステージのボスを見つけて戦闘を開始してください。',
                    completed: false,
                },
                {
                    id: 'defeat_boss',
                    title: 'ボスを撃破',
                    description: 'ボスを撃破して薔薇の力を獲得してください。',
                    completed: false,
                },
                {
                    id: 'use_essence',
                    title: '薔薇の力を使用',
                    description: 'ランクアップで薔薇の力を使用してください。',
                    completed: false,
                },
            ],
        });

        // スキルガイダンス
        this.guidanceData.set('skills', {
            id: 'skills',
            title: 'スキル習得ガイド',
            content: 'スキルの習得方法を説明します。',
            category: 'skills',
            priority: 3,
            steps: [
                {
                    id: 'level_up',
                    title: 'レベルアップ',
                    description: '戦闘で経験値を獲得してレベルアップしてください。',
                    completed: false,
                },
                {
                    id: 'rank_up_job',
                    title: '職業ランクアップ',
                    description: '職業をランクアップして新しいスキルを習得してください。',
                    completed: false,
                },
            ],
        });
    }

    /**
     * IDを生成
     */
    private generateId(): string {
        return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * アクティブな通知を取得
     */
    public getActiveNotifications(): NotificationData[] {
        return Array.from(this.activeNotifications.values());
    }

    /**
     * アクティブなダイアログを取得
     */
    public getActiveDialogs(): DialogData[] {
        return Array.from(this.activeDialogs.values());
    }

    /**
     * 全ての通知を非表示
     */
    public hideAllNotifications(): void {
        for (const notificationId of this.activeNotifications.keys()) {
            this.hideNotification(notificationId);
        }
        this.notificationQueue = [];
    }

    /**
     * 全てのダイアログを非表示
     */
    public hideAllDialogs(): void {
        for (const dialogId of this.activeDialogs.keys()) {
            this.hideDialog(dialogId);
        }
    }

    /**
     * 設定を更新
     */
    public updateConfig(newConfig: Partial<FeedbackConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.emit('config_updated', this.config);
    }

    /**
     * リソースを破棄
     */
    public destroy(): void {
        this.hideAllNotifications();
        this.hideAllDialogs();
        this.removeAllListeners();
    }
}