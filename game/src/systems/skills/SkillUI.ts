/**
 * スキル選択・表示システム
 * 
 * このファイルには以下のクラスが含まれます：
 * - SkillUI: スキル選択UIとスキル情報表示を管理するメインクラス
 * - スキル選択メニューの表示・操作機能
 * - スキル効果範囲の視覚表示機能
 * - スキル詳細情報の表示機能
 * - 使用不可理由の表示機能
 * - キーボードナビゲーション対応
 */

import {
    Skill,
    SkillData,
    SkillUsabilityResult,
    Position,
    TargetType,
    SkillType,
    SkillUsabilityError
} from '../../types/skill';

import { ExtendedSkillUsabilityResult } from './SkillConditionChecker';

/**
 * スキルUI設定インターフェース
 */
export interface SkillUIConfig {
    /** スキル選択メニューの表示位置 */
    menuPosition: { x: number; y: number };
    /** スキル選択メニューのサイズ */
    menuSize: { width: number; height: number };
    /** 効果範囲表示の色設定 */
    rangeColors: {
        valid: number;
        invalid: number;
        selected: number;
        area: number;
    };
    /** アニメーション設定 */
    animations: {
        menuFadeIn: number;
        menuFadeOut: number;
        rangeDisplay: number;
    };
    /** キーボードナビゲーション設定 */
    keyboard: {
        enabled: boolean;
        repeatDelay: number;
        repeatRate: number;
    };
    /** 詳細情報パネルの設定 */
    detailPanel: {
        width: number;
        height: number;
        position: { x: number; y: number };
    };
}

/**
 * スキル選択項目
 */
export interface SkillMenuItem {
    /** スキル */
    skill: Skill;
    /** 使用可能性結果 */
    usability: ExtendedSkillUsabilityResult;
    /** 表示テキスト */
    displayText: string;
    /** 有効フラグ */
    enabled: boolean;
    /** 推奨度（0-100） */
    recommendation?: number;
}

/**
 * スキル選択結果
 */
export interface SkillSelectionResult {
    /** 選択されたスキル */
    skill: Skill;
    /** 選択された対象位置 */
    targetPosition?: Position;
    /** キャンセルフラグ */
    cancelled: boolean;
}

/**
 * 効果範囲表示情報
 */
export interface RangeDisplayInfo {
    /** 射程範囲の位置 */
    rangePositions: Position[];
    /** 効果範囲の位置 */
    areaPositions: Position[];
    /** 有効な対象位置 */
    validTargets: Position[];
    /** 推奨対象位置 */
    recommendedTargets: Position[];
}

/**
 * スキルUI表示状態
 */
export enum SkillUIState {
    /** 非表示 */
    HIDDEN = 'hidden',
    /** スキル選択中 */
    SKILL_SELECTION = 'skill_selection',
    /** 対象選択中 */
    TARGET_SELECTION = 'target_selection',
    /** 詳細表示中 */
    DETAIL_DISPLAY = 'detail_display',
    /** 使用不可情報表示中 */
    USABILITY_INFO = 'usability_info'
}

/**
 * スキル選択・表示システム
 * スキルの選択UI、効果範囲表示、詳細情報表示を管理する
 */
export class SkillUI {
    private scene: Phaser.Scene;
    private config: SkillUIConfig;
    private events: Phaser.Events.EventEmitter;

    // UI要素
    private skillMenuContainer?: Phaser.GameObjects.Container;
    private skillMenuBackground?: Phaser.GameObjects.Graphics;
    private skillMenuItems: Phaser.GameObjects.Text[] = [];
    private skillDetailPanel?: Phaser.GameObjects.Container;
    private usabilityInfoPanel?: Phaser.GameObjects.Container;
    private rangeDisplayGraphics?: Phaser.GameObjects.Graphics;

    // 状態管理
    private currentState: SkillUIState = SkillUIState.HIDDEN;
    private availableSkills: SkillMenuItem[] = [];
    private selectedSkillIndex: number = 0;
    private selectedSkill?: Skill;
    private currentCaster?: string;
    private currentRangeDisplay?: RangeDisplayInfo;

    // キーボードナビゲーション
    private keyboardEnabled: boolean = false;
    private keyRepeatTimer?: Phaser.Time.TimerEvent;
    private lastKeyTime: number = 0;

    // コールバック
    private onSkillSelected?: (skill: Skill) => void;
    private onTargetSelected?: (skill: Skill, position: Position) => void;
    private onSelectionCancelled?: () => void;

    // UI深度設定
    private readonly UI_DEPTH = 2000;
    private readonly PANEL_DEPTH = 2001;
    private readonly TEXT_DEPTH = 2002;
    private readonly RANGE_DEPTH = 1500;

    /**
     * コンストラクタ
     * @param scene Phaserシーン
     * @param config UI設定
     * @param events イベントエミッター
     */
    constructor(
        scene: Phaser.Scene,
        config: Partial<SkillUIConfig> = {},
        events?: Phaser.Events.EventEmitter
    ) {
        this.scene = scene;
        this.events = events || scene.events;
        this.config = this.mergeConfig(config);

        this.initialize();
    }

    /**
     * 設定をマージする
     */
    private mergeConfig(config: Partial<SkillUIConfig>): SkillUIConfig {
        const defaultConfig: SkillUIConfig = {
            menuPosition: { x: 100, y: 100 },
            menuSize: { width: 300, height: 400 },
            rangeColors: {
                valid: 0x00ff00,
                invalid: 0xff0000,
                selected: 0xffff00,
                area: 0x0088ff
            },
            animations: {
                menuFadeIn: 300,
                menuFadeOut: 200,
                rangeDisplay: 150
            },
            keyboard: {
                enabled: true,
                repeatDelay: 500,
                repeatRate: 150
            },
            detailPanel: {
                width: 350,
                height: 250,
                position: { x: 450, y: 100 }
            }
        };

        return { ...defaultConfig, ...config };
    }

    /**
     * 初期化
     */
    private initialize(): void {
        this.createUIElements();
        this.setupKeyboardInput();
        this.setupEventListeners();
    }

    /**
     * UI要素を作成する
     */
    private createUIElements(): void {
        // スキル選択メニューコンテナ
        this.skillMenuContainer = this.scene.add
            .container(this.config.menuPosition.x, this.config.menuPosition.y)
            .setScrollFactor(0)
            .setDepth(this.UI_DEPTH)
            .setVisible(false);

        // メニュー背景
        this.skillMenuBackground = this.scene.add
            .graphics()
            .fillStyle(0x000000, 0.9)
            .fillRoundedRect(0, 0, this.config.menuSize.width, this.config.menuSize.height, 12)
            .lineStyle(2, 0xffffff, 1)
            .strokeRoundedRect(0, 0, this.config.menuSize.width, this.config.menuSize.height, 12);

        this.skillMenuContainer.add(this.skillMenuBackground);

        // タイトル
        const titleText = this.scene.add
            .text(this.config.menuSize.width / 2, 20, 'スキル選択', {
                fontSize: '20px',
                color: '#ffffff',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            })
            .setOrigin(0.5);

        this.skillMenuContainer.add(titleText);

        // スキル詳細パネル
        this.createDetailPanel();

        // 使用不可情報パネル
        this.createUsabilityInfoPanel();

        // 効果範囲表示用グラフィックス
        this.rangeDisplayGraphics = this.scene.add
            .graphics()
            .setScrollFactor(0)
            .setDepth(this.RANGE_DEPTH)
            .setVisible(false);
    }

    /**
     * 詳細パネルを作成する
     */
    private createDetailPanel(): void {
        const { width, height, position } = this.config.detailPanel;

        this.skillDetailPanel = this.scene.add
            .container(position.x, position.y)
            .setScrollFactor(0)
            .setDepth(this.PANEL_DEPTH)
            .setVisible(false);

        // 背景
        const background = this.scene.add
            .graphics()
            .fillStyle(0x000000, 0.9)
            .fillRoundedRect(0, 0, width, height, 10)
            .lineStyle(2, 0x00aaff, 1)
            .strokeRoundedRect(0, 0, width, height, 10);

        this.skillDetailPanel.add(background);

        // タイトル
        const titleText = this.scene.add
            .text(width / 2, 20, 'スキル詳細', {
                fontSize: '18px',
                color: '#ffffff',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            })
            .setOrigin(0.5);

        this.skillDetailPanel.add(titleText);
    }

    /**
     * 使用不可情報パネルを作成する
     */
    private createUsabilityInfoPanel(): void {
        const width = 320;
        const height = 150;
        const x = this.config.menuPosition.x + this.config.menuSize.width + 20;
        const y = this.config.menuPosition.y;

        this.usabilityInfoPanel = this.scene.add
            .container(x, y)
            .setScrollFactor(0)
            .setDepth(this.PANEL_DEPTH)
            .setVisible(false);

        // 背景
        const background = this.scene.add
            .graphics()
            .fillStyle(0x440000, 0.9)
            .fillRoundedRect(0, 0, width, height, 10)
            .lineStyle(2, 0xff4444, 1)
            .strokeRoundedRect(0, 0, width, height, 10);

        this.usabilityInfoPanel.add(background);

        // タイトル
        const titleText = this.scene.add
            .text(width / 2, 20, '使用不可理由', {
                fontSize: '16px',
                color: '#ffffff',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            })
            .setOrigin(0.5);

        this.usabilityInfoPanel.add(titleText);
    }

    /**
     * キーボード入力を設定する
     */
    private setupKeyboardInput(): void {
        if (!this.config.keyboard.enabled) {
            return;
        }

        // キーボードイベントリスナーを設定
        this.scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            this.handleKeyboardInput(event);
        });

        this.keyboardEnabled = true;
    }

    /**
     * イベントリスナーを設定する
     */
    private setupEventListeners(): void {
        // マウスクリックイベント
        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.handleMouseClick(pointer);
        });

        // シーンのリサイズイベント
        this.scene.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
            this.handleResize(gameSize.width, gameSize.height);
        });
    }

    /**
     * スキル選択UIを表示する
     * @param skills 利用可能なスキル配列
     * @param casterId 使用者ID
     * @param onSkillSelected スキル選択コールバック
     * @param onCancelled キャンセルコールバック
     */
    public showSkillSelection(
        skills: SkillMenuItem[],
        casterId: string,
        onSkillSelected?: (skill: Skill) => void,
        onCancelled?: () => void
    ): void {
        console.log(`SkillUI: Showing skill selection for ${casterId} with ${skills.length} skills`);

        // 状態を更新
        this.currentState = SkillUIState.SKILL_SELECTION;
        this.availableSkills = skills;
        this.currentCaster = casterId;
        this.selectedSkillIndex = 0;
        this.onSkillSelected = onSkillSelected;
        this.onSelectionCancelled = onCancelled;

        // スキルメニュー項目を作成
        this.createSkillMenuItems();

        // メニューを表示
        if (this.skillMenuContainer) {
            this.skillMenuContainer.setVisible(true);
            this.skillMenuContainer.setAlpha(0);

            // フェードインアニメーション
            this.scene.tweens.add({
                targets: this.skillMenuContainer,
                alpha: 1,
                duration: this.config.animations.menuFadeIn,
                ease: 'Power2.easeOut'
            });
        }

        // 最初のスキルを選択状態にする
        if (skills.length > 0) {
            this.selectSkillByIndex(0);
        }

        // イベントを発火
        this.events.emit('skill-selection-shown', {
            casterId,
            skillCount: skills.length
        });
    }

    /**
     * スキル効果範囲を表示する
     * @param skill スキル
     * @param casterPosition 使用者位置
     * @param targetPosition 対象位置（オプション）
     * @param rangeInfo 範囲表示情報
     */
    public showSkillRange(
        skill: Skill,
        casterPosition: Position,
        targetPosition?: Position,
        rangeInfo?: RangeDisplayInfo
    ): void {
        console.log(`SkillUI: Showing skill range for ${skill.name}`);

        if (!this.rangeDisplayGraphics) {
            return;
        }

        // 現在の範囲表示をクリア
        this.clearRangeDisplay();

        // 範囲情報を計算または使用
        const displayInfo = rangeInfo || this.calculateRangeDisplay(skill, casterPosition, targetPosition);
        this.currentRangeDisplay = displayInfo;

        // グラフィックスをクリア
        this.rangeDisplayGraphics.clear();

        // 射程範囲を表示
        this.drawRangePositions(displayInfo.rangePositions, this.config.rangeColors.valid);

        // 効果範囲を表示（対象位置が指定されている場合）
        if (targetPosition) {
            this.drawAreaPositions(displayInfo.areaPositions, this.config.rangeColors.area);
        }

        // 有効な対象位置をハイライト
        this.drawTargetPositions(displayInfo.validTargets, this.config.rangeColors.valid);

        // 推奨対象位置を特別にハイライト
        this.drawTargetPositions(displayInfo.recommendedTargets, this.config.rangeColors.selected);

        // 範囲表示を可視化
        this.rangeDisplayGraphics.setVisible(true);

        // フェードインアニメーション
        this.rangeDisplayGraphics.setAlpha(0);
        this.scene.tweens.add({
            targets: this.rangeDisplayGraphics,
            alpha: 0.7,
            duration: this.config.animations.rangeDisplay,
            ease: 'Power2.easeOut'
        });

        // イベントを発火
        this.events.emit('skill-range-shown', {
            skillId: skill.id,
            casterPosition,
            targetPosition,
            rangeCount: displayInfo.rangePositions.length,
            validTargetCount: displayInfo.validTargets.length
        });
    }

    /**
     * スキル詳細情報を表示する
     * @param skill スキル
     * @param usability 使用可能性情報
     * @param casterData 使用者データ（オプション）
     */
    public showSkillDetails(
        skill: Skill,
        usability?: ExtendedSkillUsabilityResult,
        casterData?: any
    ): void {
        console.log(`SkillUI: Showing skill details for ${skill.name}`);

        if (!this.skillDetailPanel) {
            return;
        }

        // 既存の詳細情報をクリア
        this.clearDetailPanel();

        // 詳細情報を作成
        this.createDetailContent(skill, usability, casterData);

        // パネルを表示
        this.skillDetailPanel.setVisible(true);
        this.skillDetailPanel.setAlpha(0);

        // フェードインアニメーション
        this.scene.tweens.add({
            targets: this.skillDetailPanel,
            alpha: 1,
            duration: this.config.animations.menuFadeIn,
            ease: 'Power2.easeOut'
        });

        // 状態を更新
        this.currentState = SkillUIState.DETAIL_DISPLAY;

        // イベントを発火
        this.events.emit('skill-details-shown', {
            skillId: skill.id,
            canUse: usability?.canUse || false
        });
    }

    /**
     * 使用不可理由を表示する
     * @param skill スキル
     * @param usability 使用可能性結果
     * @param duration 表示時間（ミリ秒、0で手動非表示）
     */
    public showUsabilityInfo(
        skill: Skill,
        usability: ExtendedSkillUsabilityResult,
        duration: number = 5000
    ): void {
        console.log(`SkillUI: Showing usability info for ${skill.name}`);

        if (!this.usabilityInfoPanel || usability.canUse) {
            return;
        }

        // 既存の情報をクリア
        this.clearUsabilityInfoPanel();

        // 使用不可情報を作成
        this.createUsabilityContent(skill, usability);

        // パネルを表示
        this.usabilityInfoPanel.setVisible(true);
        this.usabilityInfoPanel.setAlpha(0);

        // フェードインアニメーション
        this.scene.tweens.add({
            targets: this.usabilityInfoPanel,
            alpha: 1,
            duration: this.config.animations.menuFadeIn,
            ease: 'Power2.easeOut'
        });

        // 状態を更新
        this.currentState = SkillUIState.USABILITY_INFO;

        // 自動非表示タイマー
        if (duration > 0) {
            this.scene.time.delayedCall(duration, () => {
                this.hideUsabilityInfo();
            });
        }

        // イベントを発火
        this.events.emit('skill-usability-info-shown', {
            skillId: skill.id,
            error: usability.error,
            message: usability.message
        });
    }

    /**
     * スキル選択UIを非表示にする
     */
    public hideSkillSelection(): void {
        console.log('SkillUI: Hiding skill selection');

        if (!this.skillMenuContainer) {
            return;
        }

        // フェードアウトアニメーション
        this.scene.tweens.add({
            targets: this.skillMenuContainer,
            alpha: 0,
            duration: this.config.animations.menuFadeOut,
            ease: 'Power2.easeIn',
            onComplete: () => {
                this.skillMenuContainer?.setVisible(false);
                this.clearSkillMenuItems();
            }
        });

        // 関連UIも非表示
        this.hideSkillDetails();
        this.hideUsabilityInfo();
        this.clearRangeDisplay();

        // 状態をリセット
        this.currentState = SkillUIState.HIDDEN;
        this.selectedSkill = undefined;
        this.currentCaster = undefined;

        // イベントを発火
        this.events.emit('skill-selection-hidden');
    }

    /**
     * スキル詳細を非表示にする
     */
    public hideSkillDetails(): void {
        if (!this.skillDetailPanel) {
            return;
        }

        this.scene.tweens.add({
            targets: this.skillDetailPanel,
            alpha: 0,
            duration: this.config.animations.menuFadeOut,
            ease: 'Power2.easeIn',
            onComplete: () => {
                this.skillDetailPanel?.setVisible(false);
            }
        });
    }

    /**
     * 使用不可情報を非表示にする
     */
    public hideUsabilityInfo(): void {
        if (!this.usabilityInfoPanel) {
            return;
        }

        this.scene.tweens.add({
            targets: this.usabilityInfoPanel,
            alpha: 0,
            duration: this.config.animations.menuFadeOut,
            ease: 'Power2.easeIn',
            onComplete: () => {
                this.usabilityInfoPanel?.setVisible(false);
            }
        });

        if (this.currentState === SkillUIState.USABILITY_INFO) {
            this.currentState = SkillUIState.SKILL_SELECTION;
        }
    }

    /**
     * 効果範囲表示をクリアする
     */
    public clearRangeDisplay(): void {
        if (this.rangeDisplayGraphics) {
            this.rangeDisplayGraphics.clear();
            this.rangeDisplayGraphics.setVisible(false);
        }
        this.currentRangeDisplay = undefined;
    }

    /**
     * スキルメニュー項目を作成する
     */
    private createSkillMenuItems(): void {
        this.clearSkillMenuItems();

        const startY = 50;
        const itemHeight = 35;
        const padding = 10;

        this.availableSkills.forEach((skillItem, index) => {
            const y = startY + index * itemHeight;
            const skill = skillItem.skill;

            // スキル名とMP消費量
            const skillText = `${skill.name} (MP:${skill.usageCondition.mpCost})`;

            // 色を決定
            let color = '#ffffff';
            if (!skillItem.enabled) {
                color = '#666666';
            } else if (skillItem.recommendation && skillItem.recommendation > 70) {
                color = '#ffff00'; // 推奨スキル
            }

            const menuItem = this.scene.add
                .text(padding, y, skillText, {
                    fontSize: '16px',
                    color: color,
                    fontFamily: 'Arial'
                })
                .setInteractive();

            // クリックイベント
            if (skillItem.enabled) {
                menuItem.on('pointerdown', () => {
                    this.selectSkillByIndex(index);
                    this.confirmSkillSelection();
                });

                menuItem.on('pointerover', () => {
                    this.selectSkillByIndex(index);
                });
            }

            this.skillMenuItems.push(menuItem);
            this.skillMenuContainer?.add(menuItem);
        });

        // 操作説明を追加
        const instructionY = startY + this.availableSkills.length * itemHeight + 20;
        const instructionText = this.scene.add
            .text(padding, instructionY, '↑↓: 選択  Enter: 決定  Esc: キャンセル', {
                fontSize: '12px',
                color: '#cccccc',
                fontFamily: 'Arial'
            });

        this.skillMenuItems.push(instructionText);
        this.skillMenuContainer?.add(instructionText);
    }

    /**
     * スキルメニュー項目をクリアする
     */
    private clearSkillMenuItems(): void {
        this.skillMenuItems.forEach(item => {
            item.destroy();
        });
        this.skillMenuItems = [];
    }

    /**
     * インデックスでスキルを選択する
     */
    private selectSkillByIndex(index: number): void {
        if (index < 0 || index >= this.availableSkills.length) {
            return;
        }

        // 前の選択をクリア
        if (this.selectedSkillIndex >= 0 && this.selectedSkillIndex < this.skillMenuItems.length) {
            const prevItem = this.skillMenuItems[this.selectedSkillIndex];
            if (prevItem) {
                const skillItem = this.availableSkills[this.selectedSkillIndex];
                let color = '#ffffff';
                if (!skillItem.enabled) {
                    color = '#666666';
                } else if (skillItem.recommendation && skillItem.recommendation > 70) {
                    color = '#ffff00';
                }
                prevItem.setColor(color);
            }
        }

        // 新しい選択を設定
        this.selectedSkillIndex = index;
        const skillItem = this.availableSkills[index];
        this.selectedSkill = skillItem.skill;

        // 選択されたアイテムをハイライト
        const currentItem = this.skillMenuItems[index];
        if (currentItem) {
            currentItem.setColor('#00ff00');
        }

        // スキル詳細を表示
        this.showSkillDetails(skillItem.skill, skillItem.usability);

        // 使用不可の場合は理由を表示
        if (!skillItem.usability.canUse) {
            this.showUsabilityInfo(skillItem.skill, skillItem.usability, 0);
        } else {
            this.hideUsabilityInfo();
        }

        // イベントを発火
        this.events.emit('skill-selected-in-menu', {
            skillId: skillItem.skill.id,
            index: index,
            canUse: skillItem.usability.canUse
        });
    }

    /**
     * スキル選択を確定する
     */
    private confirmSkillSelection(): void {
        if (!this.selectedSkill || this.selectedSkillIndex < 0) {
            return;
        }

        const skillItem = this.availableSkills[this.selectedSkillIndex];
        if (!skillItem.enabled || !skillItem.usability.canUse) {
            // 使用不可スキルの場合は理由を表示
            this.showUsabilityInfo(skillItem.skill, skillItem.usability, 3000);
            return;
        }

        console.log(`SkillUI: Skill confirmed: ${this.selectedSkill.name}`);

        // コールバックを呼び出し
        if (this.onSkillSelected) {
            this.onSkillSelected(this.selectedSkill);
        }

        // イベントを発火
        this.events.emit('skill-confirmed', {
            skillId: this.selectedSkill.id,
            casterId: this.currentCaster
        });
    }

    /**
     * 選択をキャンセルする
     */
    private cancelSelection(): void {
        console.log('SkillUI: Selection cancelled');

        // コールバックを呼び出し
        if (this.onSelectionCancelled) {
            this.onSelectionCancelled();
        }

        // UIを非表示
        this.hideSkillSelection();

        // イベントを発火
        this.events.emit('skill-selection-cancelled');
    }

    /**
     * キーボード入力を処理する
     */
    private handleKeyboardInput(event: KeyboardEvent): void {
        if (this.currentState === SkillUIState.HIDDEN || !this.keyboardEnabled) {
            return;
        }

        const currentTime = Date.now();
        const timeSinceLastKey = currentTime - this.lastKeyTime;

        // キーリピート制御
        if (timeSinceLastKey < this.config.keyboard.repeatDelay) {
            return;
        }

        this.lastKeyTime = currentTime;

        switch (event.code) {
            case 'ArrowUp':
                event.preventDefault();
                this.navigateUp();
                break;

            case 'ArrowDown':
                event.preventDefault();
                this.navigateDown();
                break;

            case 'Enter':
            case 'Space':
                event.preventDefault();
                this.confirmSkillSelection();
                break;

            case 'Escape':
                event.preventDefault();
                this.cancelSelection();
                break;

            case 'Tab':
                event.preventDefault();
                this.toggleDetailDisplay();
                break;
        }
    }

    /**
     * 上方向ナビゲーション
     */
    private navigateUp(): void {
        if (this.availableSkills.length === 0) {
            return;
        }

        let newIndex = this.selectedSkillIndex - 1;
        if (newIndex < 0) {
            newIndex = this.availableSkills.length - 1;
        }

        this.selectSkillByIndex(newIndex);
    }

    /**
     * 下方向ナビゲーション
     */
    private navigateDown(): void {
        if (this.availableSkills.length === 0) {
            return;
        }

        let newIndex = this.selectedSkillIndex + 1;
        if (newIndex >= this.availableSkills.length) {
            newIndex = 0;
        }

        this.selectSkillByIndex(newIndex);
    }

    /**
     * 詳細表示を切り替える
     */
    private toggleDetailDisplay(): void {
        if (!this.skillDetailPanel) {
            return;
        }

        if (this.skillDetailPanel.visible) {
            this.hideSkillDetails();
        } else if (this.selectedSkill) {
            const skillItem = this.availableSkills[this.selectedSkillIndex];
            this.showSkillDetails(skillItem.skill, skillItem.usability);
        }
    }

    /**
     * マウスクリックを処理する
     */
    private handleMouseClick(pointer: Phaser.Input.Pointer): void {
        // スキル選択メニュー外をクリックした場合はキャンセル
        if (this.currentState === SkillUIState.SKILL_SELECTION && this.skillMenuContainer?.visible) {
            const bounds = this.skillMenuContainer.getBounds();
            if (!bounds.contains(pointer.x, pointer.y)) {
                this.cancelSelection();
            }
        }
    }

    /**
     * 画面リサイズを処理する
     */
    private handleResize(width: number, height: number): void {
        // UI要素の位置を調整
        const centerX = width / 2;
        const centerY = height / 2;

        // メニュー位置を中央に調整
        if (this.skillMenuContainer) {
            this.skillMenuContainer.setPosition(
                centerX - this.config.menuSize.width / 2,
                centerY - this.config.menuSize.height / 2
            );
        }

        // 詳細パネル位置を調整
        if (this.skillDetailPanel) {
            this.skillDetailPanel.setPosition(
                centerX + this.config.menuSize.width / 2 + 20,
                centerY - this.config.detailPanel.height / 2
            );
        }
    }

    /**
     * 範囲表示情報を計算する
     */
    private calculateRangeDisplay(
        skill: Skill,
        casterPosition: Position,
        targetPosition?: Position
    ): RangeDisplayInfo {
        const rangePositions: Position[] = [];
        const areaPositions: Position[] = [];
        const validTargets: Position[] = [];
        const recommendedTargets: Position[] = [];

        // 射程範囲を計算
        const range = skill.range;
        for (let x = casterPosition.x - range; x <= casterPosition.x + range; x++) {
            for (let y = casterPosition.y - range; y <= casterPosition.y + range; y++) {
                const distance = Math.abs(casterPosition.x - x) + Math.abs(casterPosition.y - y);
                if (distance <= range && distance > 0) {
                    rangePositions.push({ x, y });
                }
            }
        }

        // 効果範囲を計算（対象位置が指定されている場合）
        if (targetPosition) {
            const affectedPositions = skill.getAffectedPositions(targetPosition);
            areaPositions.push(...affectedPositions);
        }

        // 有効な対象位置は実際のゲーム状態に依存するため、
        // ここでは射程内の全ての位置を有効とする
        validTargets.push(...rangePositions);

        return {
            rangePositions,
            areaPositions,
            validTargets,
            recommendedTargets
        };
    }

    /**
     * 射程位置を描画する
     */
    private drawRangePositions(positions: Position[], color: number): void {
        if (!this.rangeDisplayGraphics) {
            return;
        }

        this.rangeDisplayGraphics.lineStyle(2, color, 0.8);
        this.rangeDisplayGraphics.fillStyle(color, 0.2);

        positions.forEach(pos => {
            const worldX = pos.x * 32; // タイルサイズを仮定
            const worldY = pos.y * 32;
            this.rangeDisplayGraphics!.strokeRect(worldX, worldY, 32, 32);
            this.rangeDisplayGraphics!.fillRect(worldX, worldY, 32, 32);
        });
    }

    /**
     * 効果範囲位置を描画する
     */
    private drawAreaPositions(positions: Position[], color: number): void {
        if (!this.rangeDisplayGraphics) {
            return;
        }

        this.rangeDisplayGraphics.lineStyle(3, color, 1.0);
        this.rangeDisplayGraphics.fillStyle(color, 0.4);

        positions.forEach(pos => {
            const worldX = pos.x * 32;
            const worldY = pos.y * 32;
            this.rangeDisplayGraphics!.strokeRect(worldX, worldY, 32, 32);
            this.rangeDisplayGraphics!.fillRect(worldX, worldY, 32, 32);
        });
    }

    /**
     * 対象位置を描画する
     */
    private drawTargetPositions(positions: Position[], color: number): void {
        if (!this.rangeDisplayGraphics) {
            return;
        }

        this.rangeDisplayGraphics.lineStyle(4, color, 1.0);

        positions.forEach(pos => {
            const worldX = pos.x * 32;
            const worldY = pos.y * 32;
            const centerX = worldX + 16;
            const centerY = worldY + 16;

            // 十字マークを描画
            this.rangeDisplayGraphics!.beginPath();
            this.rangeDisplayGraphics!.moveTo(centerX - 8, centerY);
            this.rangeDisplayGraphics!.lineTo(centerX + 8, centerY);
            this.rangeDisplayGraphics!.moveTo(centerX, centerY - 8);
            this.rangeDisplayGraphics!.lineTo(centerX, centerY + 8);
            this.rangeDisplayGraphics!.strokePath();
        });
    }

    /**
     * 詳細パネルをクリアする
     */
    private clearDetailPanel(): void {
        if (!this.skillDetailPanel) {
            return;
        }

        // タイトル以外の子要素を削除
        const children = this.skillDetailPanel.list.slice();
        children.forEach((child, index) => {
            if (index > 1) { // 背景とタイトルは残す
                child.destroy();
            }
        });
    }

    /**
     * 詳細コンテンツを作成する
     */
    private createDetailContent(
        skill: Skill,
        usability?: ExtendedSkillUsabilityResult,
        casterData?: any
    ): void {
        if (!this.skillDetailPanel) {
            return;
        }

        const { width } = this.config.detailPanel;
        let currentY = 50;
        const lineHeight = 20;
        const padding = 15;

        // スキル名
        const nameText = this.scene.add
            .text(padding, currentY, skill.name, {
                fontSize: '18px',
                color: '#ffffff',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            });
        this.skillDetailPanel.add(nameText);
        currentY += lineHeight + 5;

        // スキル説明
        const descText = this.scene.add
            .text(padding, currentY, skill.description, {
                fontSize: '14px',
                color: '#cccccc',
                fontFamily: 'Arial',
                wordWrap: { width: width - padding * 2 }
            });
        this.skillDetailPanel.add(descText);
        currentY += descText.height + 10;

        // 基本情報
        const infoText = [
            `種別: ${this.getSkillTypeText(skill.skillType)}`,
            `対象: ${this.getTargetTypeText(skill.targetType)}`,
            `射程: ${skill.range}`,
            `MP消費: ${skill.usageCondition.mpCost}`,
            `クールダウン: ${skill.usageCondition.cooldown}ターン`
        ].join('\n');

        const infoDisplay = this.scene.add
            .text(padding, currentY, infoText, {
                fontSize: '12px',
                color: '#ffffff',
                fontFamily: 'Arial'
            });
        this.skillDetailPanel.add(infoDisplay);
        currentY += infoDisplay.height + 10;

        // 使用可能性情報
        if (usability) {
            const statusColor = usability.canUse ? '#00ff00' : '#ff4444';
            const statusText = usability.canUse ? '使用可能' : '使用不可';

            const statusDisplay = this.scene.add
                .text(padding, currentY, `状態: ${statusText}`, {
                    fontSize: '14px',
                    color: statusColor,
                    fontFamily: 'Arial',
                    fontStyle: 'bold'
                });
            this.skillDetailPanel.add(statusDisplay);
        }
    }

    /**
     * 使用不可情報パネルをクリアする
     */
    private clearUsabilityInfoPanel(): void {
        if (!this.usabilityInfoPanel) {
            return;
        }

        // タイトル以外の子要素を削除
        const children = this.usabilityInfoPanel.list.slice();
        children.forEach((child, index) => {
            if (index > 1) { // 背景とタイトルは残す
                child.destroy();
            }
        });
    }

    /**
     * 使用不可コンテンツを作成する
     */
    private createUsabilityContent(skill: Skill, usability: ExtendedSkillUsabilityResult): void {
        if (!this.usabilityInfoPanel) {
            return;
        }

        const width = 320;
        let currentY = 50;
        const padding = 15;

        // エラーメッセージ
        const messageText = this.scene.add
            .text(padding, currentY, usability.message || '使用できません', {
                fontSize: '14px',
                color: '#ffffff',
                fontFamily: 'Arial',
                wordWrap: { width: width - padding * 2 }
            });
        this.usabilityInfoPanel.add(messageText);
        currentY += messageText.height + 10;

        // 詳細な条件情報
        if (usability.conditionDetails) {
            const failedConditions = usability.conditionDetails.filter(detail => !detail.passed);

            failedConditions.forEach(condition => {
                if (condition.message) {
                    const conditionText = this.scene.add
                        .text(padding, currentY, `• ${condition.message}`, {
                            fontSize: '12px',
                            color: '#ffaaaa',
                            fontFamily: 'Arial',
                            wordWrap: { width: width - padding * 2 }
                        });
                    this.usabilityInfoPanel.add(conditionText);
                    currentY += conditionText.height + 5;
                }
            });
        }
    }

    /**
     * スキル種別のテキストを取得する
     */
    private getSkillTypeText(skillType: SkillType): string {
        switch (skillType) {
            case SkillType.ATTACK: return '攻撃';
            case SkillType.HEAL: return '回復';
            case SkillType.BUFF: return '強化';
            case SkillType.DEBUFF: return '弱体';
            case SkillType.STATUS: return '状態異常';
            case SkillType.SPECIAL: return '特殊';
            default: return '不明';
        }
    }

    /**
     * 対象種別のテキストを取得する
     */
    private getTargetTypeText(targetType: TargetType): string {
        switch (targetType) {
            case TargetType.SELF: return '自分';
            case TargetType.SINGLE_ENEMY: return '敵単体';
            case TargetType.SINGLE_ALLY: return '味方単体';
            case TargetType.SINGLE_ANY: return '単体';
            case TargetType.AREA_ENEMY: return '敵範囲';
            case TargetType.AREA_ALLY: return '味方範囲';
            case TargetType.AREA_ANY: return '範囲';
            case TargetType.ALL_ENEMIES: return '敵全体';
            case TargetType.ALL_ALLIES: return '味方全体';
            case TargetType.ALL_ANY: return '全体';
            default: return '不明';
        }
    }

    /**
     * 現在の状態を取得する
     */
    public getCurrentState(): SkillUIState {
        return this.currentState;
    }

    /**
     * 選択中のスキルを取得する
     */
    public getSelectedSkill(): Skill | undefined {
        return this.selectedSkill;
    }

    /**
     * 利用可能なスキル一覧を取得する
     */
    public getAvailableSkills(): SkillMenuItem[] {
        return [...this.availableSkills];
    }

    /**
     * 現在の範囲表示情報を取得する
     */
    public getCurrentRangeDisplay(): RangeDisplayInfo | undefined {
        return this.currentRangeDisplay;
    }

    /**
     * UIを破棄する
     */
    public destroy(): void {
        console.log('SkillUI: Destroying UI');

        // タイマーをクリア
        if (this.keyRepeatTimer) {
            this.keyRepeatTimer.destroy();
        }

        // UI要素を破棄
        this.skillMenuContainer?.destroy();
        this.skillDetailPanel?.destroy();
        this.usabilityInfoPanel?.destroy();
        this.rangeDisplayGraphics?.destroy();

        // 配列をクリア
        this.skillMenuItems = [];
        this.availableSkills = [];

        // 状態をリセット
        this.currentState = SkillUIState.HIDDEN;
        this.selectedSkill = undefined;
        this.currentCaster = undefined;
        this.currentRangeDisplay = undefined;

        // コールバックをクリア
        this.onSkillSelected = undefined;
        this.onTargetSelected = undefined;
        this.onSelectionCancelled = undefined;

        console.log('SkillUI: UI destroyed');
    }
}