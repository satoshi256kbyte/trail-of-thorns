/**
 * JobUI - 職業システムのUI表示クラス
 * 
 * このクラスは職業選択・変更UI、ランクアップUI、職業情報パネル、
 * 薔薇の力残量表示、ランクアップ効果プレビューを提供します。
 * 要件3.1-3.5に対応した機能を実装します。
 */

import {
    JobData,
    CharacterJobData,
    RankUpAvailability,
    RankUpResult,
    JobChangeResult,
    CharacterRankUpInfo,
    StatModifiers,
    JobTrait,
    RankUpRequirements
} from '../types/job';
import { Unit } from '../types/gameplay';
import { Job } from '../systems/jobs/Job';
import { DesignSystem, Colors, Typography, Spacing, Animation, Depth } from './DesignGuidelines';
import { MenuButton } from './MenuButton';

/**
 * 職業選択UI設定
 */
export interface JobSelectionConfig {
    maxJobsPerPage: number;
    showJobDetails: boolean;
    enableJobComparison: boolean;
    allowJobChange: boolean;
}

/**
 * ランクアップUI設定
 */
export interface RankUpUIConfig {
    showPreview: boolean;
    showCostBreakdown: boolean;
    enableBatchRankUp: boolean;
    confirmationRequired: boolean;
}

/**
 * 職業情報パネル設定
 */
export interface JobInfoConfig {
    showStatModifiers: boolean;
    showSkillList: boolean;
    showJobTraits: boolean;
    showRankProgress: boolean;
    compactMode: boolean;
}

/**
 * JobUIの設定オプション
 */
export interface JobUIConfig {
    jobSelection: JobSelectionConfig;
    rankUp: RankUpUIConfig;
    jobInfo: JobInfoConfig;
    enableAnimations: boolean;
    enableSoundEffects: boolean;
}

/**
 * UI要素の参照を管理するインターフェース
 */
export interface JobUIElements {
    // 職業選択・変更UI
    jobSelectionPanel: Phaser.GameObjects.Container;
    jobListContainer: Phaser.GameObjects.Container;
    jobDetailPanel: Phaser.GameObjects.Container;
    jobComparisonPanel: Phaser.GameObjects.Container;

    // ランクアップUI
    rankUpPanel: Phaser.GameObjects.Container;
    rankUpCandidatesList: Phaser.GameObjects.Container;
    rankUpPreviewPanel: Phaser.GameObjects.Container;

    // 職業情報パネル
    jobInfoPanel: Phaser.GameObjects.Container;
    statModifiersDisplay: Phaser.GameObjects.Container;
    skillListDisplay: Phaser.GameObjects.Container;
    jobTraitsDisplay: Phaser.GameObjects.Container;

    // 薔薇の力残量表示
    roseEssenceDisplay: Phaser.GameObjects.Container;
    roseEssenceText: Phaser.GameObjects.Text;
    roseEssenceIcon: Phaser.GameObjects.Graphics;

    // 共通UI要素
    backgroundOverlay: Phaser.GameObjects.Graphics;
    closeButton: MenuButton;
    confirmButton: MenuButton;
    cancelButton: MenuButton;
}

/**
 * JobUIクラス - 職業システムのUI表示を管理
 */
export class JobUI {
    private scene: Phaser.Scene;
    private config: JobUIConfig;
    private uiElements: Partial<JobUIElements> = {};
    private isVisible: boolean = false;
    private currentMode: 'job_selection' | 'rank_up' | 'job_info' | null = null;
    private selectedCharacter: Unit | null = null;
    private availableJobs: Map<string, Job> = new Map();
    private rankUpCandidates: CharacterRankUpInfo[] = [];
    private currentRoseEssence: number = 0;

    // イベントコールバック
    private onJobChangeCallback?: (characterId: string, newJobId: string) => Promise<JobChangeResult>;
    private onRankUpCallback?: (characterId: string, targetRank?: number) => Promise<RankUpResult>;
    private onCloseCallback?: () => void;

    private static readonly DEFAULT_CONFIG: JobUIConfig = {
        jobSelection: {
            maxJobsPerPage: 6,
            showJobDetails: true,
            enableJobComparison: true,
            allowJobChange: true,
        },
        rankUp: {
            showPreview: true,
            showCostBreakdown: true,
            enableBatchRankUp: false,
            confirmationRequired: true,
        },
        jobInfo: {
            showStatModifiers: true,
            showSkillList: true,
            showJobTraits: true,
            showRankProgress: true,
            compactMode: false,
        },
        enableAnimations: true,
        enableSoundEffects: true,
    };

    constructor(scene: Phaser.Scene, config?: Partial<JobUIConfig>) {
        this.scene = scene;
        this.config = { ...JobUI.DEFAULT_CONFIG, ...config };

        this.createUI();
        this.setupEventHandlers();
    }

    /**
     * UI要素を作成
     */
    private createUI(): void {
        this.createBackgroundOverlay();
        this.createRoseEssenceDisplay();
        this.createJobSelectionUI();
        this.createRankUpUI();
        this.createJobInfoPanel();
        this.createCommonButtons();

        // 初期状態では全て非表示
        this.hideAllPanels();
    }

    /**
     * 背景オーバーレイを作成
     */
    private createBackgroundOverlay(): void {
        const camera = this.scene.cameras.main;

        this.uiElements.backgroundOverlay = this.scene.add
            .graphics()
            .fillStyle(Colors.BACKGROUND_OVERLAY, 0.7)
            .fillRect(0, 0, camera.width, camera.height)
            .setScrollFactor(0)
            .setDepth(Depth.UI_OVERLAYS)
            .setInteractive()
            .on('pointerdown', (event: Phaser.Input.Pointer) => {
                // 背景クリックでUI閉じる
                event.stopPropagation();
                this.hide();
            });
    }

    /**
     * 薔薇の力残量表示を作成
     * 要件3.4: 薔薇の力残量表示
     */
    private createRoseEssenceDisplay(): void {
        const camera = this.scene.cameras.main;
        const x = camera.width - 200;
        const y = 20;

        this.uiElements.roseEssenceDisplay = this.scene.add
            .container(x, y)
            .setScrollFactor(0)
            .setDepth(Depth.UI_ELEMENTS);

        // 背景パネル
        const background = DesignSystem.DesignUtils.createPanelBackground(
            this.scene,
            180,
            60,
            Colors.BACKGROUND_SEMI,
            Colors.BORDER_DEFAULT
        );

        // 薔薇の力アイコン
        this.uiElements.roseEssenceIcon = this.scene.add
            .graphics()
            .fillStyle(0xff69b4, 1) // ピンク色で薔薇を表現
            .fillCircle(25, 30, 12)
            .lineStyle(2, 0xff1493, 1)
            .strokeCircle(25, 30, 12);

        // 薔薇の力テキスト
        this.uiElements.roseEssenceText = this.scene.add
            .text(50, 30, '薔薇の力: 0', {
                ...Typography.BODY,
                color: Colors.TEXT_PRIMARY,
            })
            .setOrigin(0, 0.5);

        this.uiElements.roseEssenceDisplay.add([
            background,
            this.uiElements.roseEssenceIcon,
            this.uiElements.roseEssenceText
        ]);
    }

    /**
     * 職業選択・変更UIを作成
     * 要件3.1: 職業選択・変更UI
     */
    private createJobSelectionUI(): void {
        const camera = this.scene.cameras.main;
        const panelWidth = 800;
        const panelHeight = 600;
        const x = camera.width / 2 - panelWidth / 2;
        const y = camera.height / 2 - panelHeight / 2;

        this.uiElements.jobSelectionPanel = this.scene.add
            .container(x, y)
            .setScrollFactor(0)
            .setDepth(Depth.UI_PANELS);

        // メインパネル背景
        const background = DesignSystem.DesignUtils.createPanelBackground(
            this.scene,
            panelWidth,
            panelHeight,
            Colors.BACKGROUND_SEMI,
            Colors.BORDER_DEFAULT
        );

        // タイトル
        const title = this.scene.add
            .text(panelWidth / 2, 30, '職業選択', Typography.TITLE)
            .setOrigin(0.5, 0);

        // 職業リストコンテナ
        this.uiElements.jobListContainer = this.scene.add
            .container(20, 80)
            .setSize(panelWidth / 2 - 30, panelHeight - 120);

        // 職業詳細パネル
        this.uiElements.jobDetailPanel = this.scene.add
            .container(panelWidth / 2 + 10, 80)
            .setSize(panelWidth / 2 - 30, panelHeight - 120);

        // 職業比較パネル（必要時に表示）
        this.uiElements.jobComparisonPanel = this.scene.add
            .container(20, panelHeight - 150)
            .setSize(panelWidth - 40, 100);

        this.uiElements.jobSelectionPanel.add([
            background,
            title,
            this.uiElements.jobListContainer,
            this.uiElements.jobDetailPanel,
            this.uiElements.jobComparisonPanel
        ]);
    }

    /**
     * ランクアップUIを作成
     * 要件3.2: ランクアップUI
     */
    private createRankUpUI(): void {
        const camera = this.scene.cameras.main;
        const panelWidth = 900;
        const panelHeight = 700;
        const x = camera.width / 2 - panelWidth / 2;
        const y = camera.height / 2 - panelHeight / 2;

        this.uiElements.rankUpPanel = this.scene.add
            .container(x, y)
            .setScrollFactor(0)
            .setDepth(Depth.UI_PANELS);

        // メインパネル背景
        const background = DesignSystem.DesignUtils.createPanelBackground(
            this.scene,
            panelWidth,
            panelHeight,
            Colors.BACKGROUND_SEMI,
            Colors.BORDER_DEFAULT
        );

        // タイトル
        const title = this.scene.add
            .text(panelWidth / 2, 30, 'ランクアップ', Typography.TITLE)
            .setOrigin(0.5, 0);

        // ランクアップ候補リスト
        this.uiElements.rankUpCandidatesList = this.scene.add
            .container(20, 80)
            .setSize(panelWidth / 2 - 30, panelHeight - 120);

        // ランクアップ効果プレビューパネル
        this.uiElements.rankUpPreviewPanel = this.scene.add
            .container(panelWidth / 2 + 10, 80)
            .setSize(panelWidth / 2 - 30, panelHeight - 120);

        this.uiElements.rankUpPanel.add([
            background,
            title,
            this.uiElements.rankUpCandidatesList,
            this.uiElements.rankUpPreviewPanel
        ]);
    }

    /**
     * 職業情報パネルを作成
     * 要件3.3: 職業情報パネル
     */
    private createJobInfoPanel(): void {
        const camera = this.scene.cameras.main;
        const panelWidth = 400;
        const panelHeight = 500;
        const x = camera.width - panelWidth - 20;
        const y = 100;

        this.uiElements.jobInfoPanel = this.scene.add
            .container(x, y)
            .setScrollFactor(0)
            .setDepth(Depth.UI_PANELS);

        // メインパネル背景
        const background = DesignSystem.DesignUtils.createPanelBackground(
            this.scene,
            panelWidth,
            panelHeight,
            Colors.BACKGROUND_SEMI,
            Colors.BORDER_DEFAULT
        );

        // タイトル
        const title = this.scene.add
            .text(panelWidth / 2, 20, '職業情報', Typography.SUBTITLE)
            .setOrigin(0.5, 0);

        // 能力値修正表示
        this.uiElements.statModifiersDisplay = this.scene.add
            .container(20, 60)
            .setSize(panelWidth - 40, 120);

        // スキル一覧表示
        this.uiElements.skillListDisplay = this.scene.add
            .container(20, 200)
            .setSize(panelWidth - 40, 150);

        // 職業特性表示
        this.uiElements.jobTraitsDisplay = this.scene.add
            .container(20, 370)
            .setSize(panelWidth - 40, 100);

        this.uiElements.jobInfoPanel.add([
            background,
            title,
            this.uiElements.statModifiersDisplay,
            this.uiElements.skillListDisplay,
            this.uiElements.jobTraitsDisplay
        ]);
    }

    /**
     * 共通ボタンを作成
     */
    private createCommonButtons(): void {
        const camera = this.scene.cameras.main;

        // 閉じるボタン
        this.uiElements.closeButton = new MenuButton(
            this.scene,
            camera.width - 100,
            camera.height - 60,
            '閉じる',
            () => this.hide(),
            80,
            40
        );
        this.uiElements.closeButton
            .setScrollFactor(0)
            .setDepth(Depth.UI_ELEMENTS);

        // 確認ボタン
        this.uiElements.confirmButton = new MenuButton(
            this.scene,
            camera.width - 200,
            camera.height - 60,
            '確認',
            () => this.handleConfirm(),
            80,
            40
        );
        this.uiElements.confirmButton
            .setScrollFactor(0)
            .setDepth(Depth.UI_ELEMENTS);

        // キャンセルボタン
        this.uiElements.cancelButton = new MenuButton(
            this.scene,
            camera.width - 300,
            camera.height - 60,
            'キャンセル',
            () => this.handleCancel(),
            80,
            40
        );
        this.uiElements.cancelButton
            .setScrollFactor(0)
            .setDepth(Depth.UI_ELEMENTS);
    }

    /**
     * イベントハンドラーを設定
     */
    private setupEventHandlers(): void {
        // キーボードイベント
        this.scene.input.keyboard?.on('keydown-ESC', () => {
            if (this.isVisible) {
                this.hide();
            }
        });

        // リサイズイベント
        this.scene.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
            this.handleResize(gameSize.width, gameSize.height);
        });
    }

    /**
     * 職業選択UIを表示
     * 要件3.1: 職業選択・変更UI
     * 
     * @param character 対象キャラクター
     * @param availableJobs 利用可能な職業
     */
    public showJobSelection(character: Unit, availableJobs: Map<string, Job>): void {
        this.selectedCharacter = character;
        this.availableJobs = availableJobs;
        this.currentMode = 'job_selection';

        this.hideAllPanels();
        this.showPanel(this.uiElements.jobSelectionPanel);
        this.updateJobSelectionContent();
        this.show();
    }

    /**
     * ランクアップUIを表示
     * 要件3.2: ランクアップUI
     * 
     * @param candidates ランクアップ可能キャラクター一覧
     * @param currentRoseEssence 現在の薔薇の力
     */
    public showRankUpUI(candidates: CharacterRankUpInfo[], currentRoseEssence: number): void {
        this.rankUpCandidates = candidates;
        this.currentRoseEssence = currentRoseEssence;
        this.currentMode = 'rank_up';

        this.hideAllPanels();
        this.showPanel(this.uiElements.rankUpPanel);
        this.updateRankUpContent();
        this.show();
    }

    /**
     * 職業情報パネルを表示
     * 要件3.3: 職業情報パネル
     * 
     * @param character 対象キャラクター
     * @param job 職業情報
     */
    public showJobInfo(character: Unit, job: Job): void {
        this.selectedCharacter = character;
        this.currentMode = 'job_info';

        this.hideAllPanels();
        this.showPanel(this.uiElements.jobInfoPanel);
        this.updateJobInfoContent(job);
        this.show();
    }

    /**
     * ランクアップ効果プレビューを表示
     * 要件3.5: ランクアップ効果プレビュー
     * 
     * @param character 対象キャラクター
     * @param currentJob 現在の職業
     * @param targetRank 目標ランク
     * @param requirements ランクアップ要件
     */
    public showRankUpPreview(
        character: Unit,
        currentJob: Job,
        targetRank: number,
        requirements: RankUpRequirements
    ): void {
        if (!this.uiElements.rankUpPreviewPanel) return;

        // プレビューパネルをクリア
        this.uiElements.rankUpPreviewPanel.removeAll(true);

        const panelWidth = 400;
        let yOffset = 0;

        // タイトル
        const title = this.scene.add
            .text(panelWidth / 2, yOffset, 'ランクアップ効果プレビュー', Typography.SUBTITLE)
            .setOrigin(0.5, 0);
        yOffset += 40;

        // キャラクター情報
        const characterInfo = this.scene.add
            .text(20, yOffset, `${character.name} (${currentJob.name})`, Typography.BODY)
            .setOrigin(0, 0);
        yOffset += 30;

        // ランク変更情報
        const rankInfo = this.scene.add
            .text(20, yOffset, `ランク ${currentJob.getCurrentRank()} → ${targetRank}`, Typography.BODY)
            .setOrigin(0, 0);
        yOffset += 40;

        // 能力値変更プレビュー
        const currentStats = currentJob.getStatModifiers();
        currentJob.setRank(targetRank);
        const newStats = currentJob.getStatModifiers();
        currentJob.setRank(currentJob.getCurrentRank()); // 元に戻す

        const statChanges = this.calculateStatDifference(currentStats, newStats);
        const statsTitle = this.scene.add
            .text(20, yOffset, '能力値変化:', Typography.SMALL)
            .setOrigin(0, 0);
        yOffset += 25;

        Object.entries(statChanges).forEach(([stat, change]) => {
            if (change !== 0) {
                const color = change > 0 ? Colors.TEXT_SUCCESS : Colors.TEXT_ERROR;
                const sign = change > 0 ? '+' : '';
                const statText = this.scene.add
                    .text(40, yOffset, `${stat.toUpperCase()}: ${sign}${change}`, {
                        ...Typography.SMALL,
                        color: color,
                    })
                    .setOrigin(0, 0);
                yOffset += 20;
            }
        });

        // 新スキル習得
        const currentSkills = currentJob.getAvailableSkills();
        currentJob.setRank(targetRank);
        const newSkills = currentJob.getAvailableSkills();
        currentJob.setRank(currentJob.getCurrentRank()); // 元に戻す

        const gainedSkills = newSkills.filter(skill => !currentSkills.includes(skill));
        if (gainedSkills.length > 0) {
            yOffset += 10;
            const skillsTitle = this.scene.add
                .text(20, yOffset, '新習得スキル:', Typography.SMALL)
                .setOrigin(0, 0);
            yOffset += 25;

            gainedSkills.forEach(skill => {
                const skillText = this.scene.add
                    .text(40, yOffset, `• ${skill}`, {
                        ...Typography.SMALL,
                        color: Colors.TEXT_SUCCESS,
                    })
                    .setOrigin(0, 0);
                yOffset += 20;
            });
        }

        // コスト情報
        yOffset += 20;
        const costTitle = this.scene.add
            .text(20, yOffset, 'ランクアップコスト:', Typography.SMALL)
            .setOrigin(0, 0);
        yOffset += 25;

        const costText = this.scene.add
            .text(40, yOffset, `薔薇の力: ${requirements.roseEssenceCost}`, {
                ...Typography.SMALL,
                color: this.currentRoseEssence >= requirements.roseEssenceCost ?
                    Colors.TEXT_SUCCESS : Colors.TEXT_ERROR,
            })
            .setOrigin(0, 0);

        this.uiElements.rankUpPreviewPanel.add([
            title,
            characterInfo,
            rankInfo,
            statsTitle,
            skillsTitle,
            costTitle,
            costText
        ]);
    }

    /**
     * 薔薇の力残量を更新
     * 要件3.4: 薔薇の力残量表示
     * 
     * @param amount 現在の薔薇の力
     */
    public updateRoseEssenceDisplay(amount: number): void {
        this.currentRoseEssence = amount;

        if (this.uiElements.roseEssenceText) {
            this.uiElements.roseEssenceText.setText(`薔薇の力: ${amount}`);

            // アニメーション効果
            if (this.config.enableAnimations) {
                this.scene.tweens.add({
                    targets: this.uiElements.roseEssenceText,
                    scaleX: 1.1,
                    scaleY: 1.1,
                    duration: Animation.DURATION_FAST,
                    yoyo: true,
                    ease: Animation.EASE_OUT,
                });
            }
        }
    }

    /**
     * UIを表示
     */
    public show(): void {
        if (this.isVisible) return;

        this.isVisible = true;
        this.showPanel(this.uiElements.backgroundOverlay);
        this.showPanel(this.uiElements.roseEssenceDisplay);
        this.showPanel(this.uiElements.closeButton);

        // モードに応じてボタンを表示
        if (this.currentMode === 'job_selection' || this.currentMode === 'rank_up') {
            this.showPanel(this.uiElements.confirmButton);
            this.showPanel(this.uiElements.cancelButton);
        }

        // アニメーション
        if (this.config.enableAnimations) {
            this.playShowAnimation();
        }
    }

    /**
     * UIを非表示
     */
    public hide(): void {
        if (!this.isVisible) return;

        if (this.config.enableAnimations) {
            this.playHideAnimation(() => {
                this.completeHide();
            });
        } else {
            this.completeHide();
        }
    }

    /**
     * 非表示処理を完了
     */
    private completeHide(): void {
        this.isVisible = false;
        this.hideAllPanels();
        this.currentMode = null;
        this.selectedCharacter = null;

        if (this.onCloseCallback) {
            this.onCloseCallback();
        }
    }

    /**
     * 全パネルを非表示
     */
    private hideAllPanels(): void {
        Object.values(this.uiElements).forEach(element => {
            if (element && element.setVisible) {
                element.setVisible(false);
            }
        });
    }

    /**
     * パネルを表示
     */
    private showPanel(panel?: Phaser.GameObjects.GameObject): void {
        if (panel && panel.setVisible) {
            panel.setVisible(true);
        }
    }

    /**
     * 職業選択UIの内容を更新
     */
    private updateJobSelectionContent(): void {
        if (!this.uiElements.jobListContainer || !this.selectedCharacter) return;

        // 職業リストをクリア
        this.uiElements.jobListContainer.removeAll(true);

        let yOffset = 0;
        const jobArray = Array.from(this.availableJobs.values());

        jobArray.forEach((job, index) => {
            const jobButton = new MenuButton(
                this.scene,
                0,
                yOffset,
                `${job.name} (ランク${job.maxRank}まで)`,
                () => this.selectJob(job),
                300,
                40
            );

            this.uiElements.jobListContainer!.add(jobButton);
            yOffset += 50;
        });
    }

    /**
     * ランクアップUIの内容を更新
     */
    private updateRankUpContent(): void {
        if (!this.uiElements.rankUpCandidatesList) return;

        // 候補リストをクリア
        this.uiElements.rankUpCandidatesList.removeAll(true);

        let yOffset = 0;

        this.rankUpCandidates.forEach(candidate => {
            const canRankUp = candidate.canRankUp &&
                this.currentRoseEssence >= candidate.roseEssenceCost;

            const buttonColor = canRankUp ? Colors.SUCCESS : Colors.BUTTON_DISABLED;
            const textColor = canRankUp ? Colors.TEXT_PRIMARY : Colors.TEXT_DISABLED;

            const candidateButton = new MenuButton(
                this.scene,
                0,
                yOffset,
                `${candidate.characterName} (${candidate.currentJob} ランク${candidate.currentRank})`,
                () => canRankUp ? this.selectRankUpCandidate(candidate) : null,
                400,
                40
            );

            candidateButton.setEnabled(canRankUp);
            this.uiElements.rankUpCandidatesList.add(candidateButton);
            yOffset += 50;
        });
    }

    /**
     * 職業情報パネルの内容を更新
     */
    private updateJobInfoContent(job: Job): void {
        if (!this.uiElements.statModifiersDisplay ||
            !this.uiElements.skillListDisplay ||
            !this.uiElements.jobTraitsDisplay) return;

        // 能力値修正表示を更新
        this.updateStatModifiersDisplay(job);

        // スキル一覧表示を更新
        this.updateSkillListDisplay(job);

        // 職業特性表示を更新
        this.updateJobTraitsDisplay(job);
    }

    /**
     * 能力値修正表示を更新
     */
    private updateStatModifiersDisplay(job: Job): void {
        if (!this.uiElements.statModifiersDisplay) return;

        this.uiElements.statModifiersDisplay.removeAll(true);

        const title = this.scene.add
            .text(0, 0, '能力値修正', Typography.SMALL)
            .setOrigin(0, 0);

        let yOffset = 25;
        const statModifiers = job.getStatModifiers();

        Object.entries(statModifiers).forEach(([stat, value]) => {
            if (value !== 0) {
                const sign = value > 0 ? '+' : '';
                const color = value > 0 ? Colors.TEXT_SUCCESS : Colors.TEXT_ERROR;

                const statText = this.scene.add
                    .text(20, yOffset, `${stat.toUpperCase()}: ${sign}${value}`, {
                        ...Typography.SMALL,
                        color: color,
                    })
                    .setOrigin(0, 0);

                yOffset += 20;
            }
        });

        this.uiElements.statModifiersDisplay.add(title);
    }

    /**
     * スキル一覧表示を更新
     */
    private updateSkillListDisplay(job: Job): void {
        if (!this.uiElements.skillListDisplay) return;

        this.uiElements.skillListDisplay.removeAll(true);

        const title = this.scene.add
            .text(0, 0, '使用可能スキル', Typography.SMALL)
            .setOrigin(0, 0);

        let yOffset = 25;
        const skills = job.getAvailableSkills();

        skills.forEach(skill => {
            const skillText = this.scene.add
                .text(20, yOffset, `• ${skill}`, Typography.SMALL)
                .setOrigin(0, 0);

            yOffset += 18;
        });

        this.uiElements.skillListDisplay.add(title);
    }

    /**
     * 職業特性表示を更新
     */
    private updateJobTraitsDisplay(job: Job): void {
        if (!this.uiElements.jobTraitsDisplay) return;

        this.uiElements.jobTraitsDisplay.removeAll(true);

        const title = this.scene.add
            .text(0, 0, '職業特性', Typography.SMALL)
            .setOrigin(0, 0);

        let yOffset = 25;
        const traits = job.getJobTraits();

        traits.forEach(trait => {
            const traitText = this.scene.add
                .text(20, yOffset, `• ${trait.name}`, Typography.SMALL)
                .setOrigin(0, 0);

            yOffset += 18;
        });

        this.uiElements.jobTraitsDisplay.add(title);
    }

    /**
     * 職業を選択
     */
    private selectJob(job: Job): void {
        if (!this.selectedCharacter) return;

        // 職業詳細を表示
        this.showJobDetails(job);
    }

    /**
     * ランクアップ候補を選択
     */
    private selectRankUpCandidate(candidate: CharacterRankUpInfo): void {
        // ランクアップ効果プレビューを表示
        // TODO: 実際の職業インスタンスを取得してプレビューを表示
        console.log('ランクアップ候補選択:', candidate);
    }

    /**
     * 職業詳細を表示
     */
    private showJobDetails(job: Job): void {
        if (!this.uiElements.jobDetailPanel) return;

        this.uiElements.jobDetailPanel.removeAll(true);

        const title = this.scene.add
            .text(0, 0, job.name, Typography.SUBTITLE)
            .setOrigin(0, 0);

        const description = this.scene.add
            .text(0, 40, job.description, {
                ...Typography.SMALL,
                wordWrap: { width: 350 },
            })
            .setOrigin(0, 0);

        this.uiElements.jobDetailPanel.add([title, description]);
    }

    /**
     * 確認ボタンの処理
     */
    private async handleConfirm(): Promise<void> {
        if (this.currentMode === 'job_selection' && this.selectedCharacter) {
            // 職業変更の実行
            // TODO: 選択された職業での職業変更処理
        } else if (this.currentMode === 'rank_up') {
            // ランクアップの実行
            // TODO: 選択されたキャラクターのランクアップ処理
        }
    }

    /**
     * キャンセルボタンの処理
     */
    private handleCancel(): void {
        this.hide();
    }

    /**
     * 表示アニメーションを再生
     */
    private playShowAnimation(): void {
        const panels = [
            this.uiElements.jobSelectionPanel,
            this.uiElements.rankUpPanel,
            this.uiElements.jobInfoPanel
        ].filter(panel => panel && panel.visible);

        panels.forEach(panel => {
            if (panel) {
                panel.setAlpha(0);
                panel.setScale(0.8);

                this.scene.tweens.add({
                    targets: panel,
                    alpha: 1,
                    scaleX: 1,
                    scaleY: 1,
                    duration: Animation.DURATION_NORMAL,
                    ease: Animation.EASE_BACK_OUT,
                });
            }
        });
    }

    /**
     * 非表示アニメーションを再生
     */
    private playHideAnimation(onComplete: () => void): void {
        const panels = [
            this.uiElements.jobSelectionPanel,
            this.uiElements.rankUpPanel,
            this.uiElements.jobInfoPanel
        ].filter(panel => panel && panel.visible);

        if (panels.length === 0) {
            onComplete();
            return;
        }

        let completedCount = 0;
        const totalPanels = panels.length;

        panels.forEach(panel => {
            if (panel) {
                this.scene.tweens.add({
                    targets: panel,
                    alpha: 0,
                    scaleX: 0.8,
                    scaleY: 0.8,
                    duration: Animation.DURATION_FAST,
                    ease: Animation.EASE_IN,
                    onComplete: () => {
                        completedCount++;
                        if (completedCount >= totalPanels) {
                            onComplete();
                        }
                    },
                });
            }
        });
    }

    /**
     * リサイズ処理
     */
    private handleResize(width: number, height: number): void {
        // 背景オーバーレイのサイズを更新
        if (this.uiElements.backgroundOverlay) {
            this.uiElements.backgroundOverlay
                .clear()
                .fillStyle(Colors.BACKGROUND_OVERLAY, 0.7)
                .fillRect(0, 0, width, height);
        }

        // 各パネルの位置を更新
        if (this.uiElements.jobSelectionPanel) {
            this.uiElements.jobSelectionPanel.setPosition(
                width / 2 - 400,
                height / 2 - 300
            );
        }

        if (this.uiElements.rankUpPanel) {
            this.uiElements.rankUpPanel.setPosition(
                width / 2 - 450,
                height / 2 - 350
            );
        }

        if (this.uiElements.jobInfoPanel) {
            this.uiElements.jobInfoPanel.setPosition(
                width - 420,
                100
            );
        }

        if (this.uiElements.roseEssenceDisplay) {
            this.uiElements.roseEssenceDisplay.setPosition(width - 200, 20);
        }

        // ボタンの位置を更新
        if (this.uiElements.closeButton) {
            this.uiElements.closeButton.setPosition(width - 100, height - 60);
        }

        if (this.uiElements.confirmButton) {
            this.uiElements.confirmButton.setPosition(width - 200, height - 60);
        }

        if (this.uiElements.cancelButton) {
            this.uiElements.cancelButton.setPosition(width - 300, height - 60);
        }
    }

    /**
     * 能力値の差分を計算
     */
    private calculateStatDifference(oldStats: StatModifiers, newStats: StatModifiers): StatModifiers {
        return {
            hp: newStats.hp - oldStats.hp,
            mp: newStats.mp - oldStats.mp,
            attack: newStats.attack - oldStats.attack,
            defense: newStats.defense - oldStats.defense,
            speed: newStats.speed - oldStats.speed,
            skill: newStats.skill - oldStats.skill,
            luck: newStats.luck - oldStats.luck,
        };
    }

    /**
     * コールバック関数を設定
     */
    public setCallbacks(callbacks: {
        onJobChange?: (characterId: string, newJobId: string) => Promise<JobChangeResult>;
        onRankUp?: (characterId: string, targetRank?: number) => Promise<RankUpResult>;
        onClose?: () => void;
    }): void {
        this.onJobChangeCallback = callbacks.onJobChange;
        this.onRankUpCallback = callbacks.onRankUp;
        this.onCloseCallback = callbacks.onClose;
    }

    /**
     * 現在の表示状態を取得
     */
    public isUIVisible(): boolean {
        return this.isVisible;
    }

    /**
     * 現在のモードを取得
     */
    public getCurrentMode(): string | null {
        return this.currentMode;
    }

    /**
     * リソースを破棄
     */
    public destroy(): void {
        // イベントリスナーを削除
        this.scene.input.keyboard?.off('keydown-ESC');
        this.scene.scale.off('resize');

        // UI要素を破棄
        Object.values(this.uiElements).forEach(element => {
            if (element && element.destroy) {
                element.destroy();
            }
        });

        this.uiElements = {};
        this.selectedCharacter = null;
        this.availableJobs.clear();
        this.rankUpCandidates = [];
    }
}