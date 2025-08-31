/**
 * JobSelectionUI - 職業選択・変更UI
 * 
 * このクラスは利用可能職業一覧表示、職業詳細情報表示、
 * 職業変更確認ダイアログ、職業比較表示を提供します。
 */

import { Job } from '../systems/jobs/Job';
import { Unit } from '../types/gameplay';
import { JobChangeResult } from '../types/job';
import { DesignSystem, Colors, Typography, Spacing, Animation } from './DesignGuidelines';
import { MenuButton } from './MenuButton';

/**
 * 職業選択UIの設定
 */
export interface JobSelectionUIConfig {
    maxJobsPerPage: number;
    showJobDetails: boolean;
    enableJobComparison: boolean;
    allowJobChange: boolean;
}

/**
 * 職業比較データ
 */
export interface JobComparison {
    currentJob: Job;
    targetJob: Job;
    statDifferences: { [key: string]: number };
    skillDifferences: { lost: string[]; gained: string[] };
}

/**
 * JobSelectionUIクラス
 */
export class JobSelectionUI {
    private scene: Phaser.Scene;
    private config: JobSelectionUIConfig;
    private container: Phaser.GameObjects.Container;
    private selectedCharacter: Unit | null = null;
    private availableJobs: Map<string, Job> = new Map();
    private selectedJob: Job | null = null;
    private currentJobComparison: JobComparison | null = null;

    // UI要素
    private jobListContainer: Phaser.GameObjects.Container;
    private jobDetailContainer: Phaser.GameObjects.Container;
    private comparisonContainer: Phaser.GameObjects.Container;
    private jobButtons: MenuButton[] = [];

    // コールバック
    private onJobSelectedCallback?: (job: Job) => void;
    private onJobChangeCallback?: (characterId: string, newJobId: string) => Promise<JobChangeResult>;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        width: number,
        height: number,
        config: JobSelectionUIConfig
    ) {
        this.scene = scene;
        this.config = config;

        this.container = scene.add.container(x, y);
        this.createUI(width, height);
    }

    /**
     * UIを作成
     */
    private createUI(width: number, height: number): void {
        // 背景
        const background = DesignSystem.DesignUtils.createPanelBackground(
            this.scene,
            width,
            height,
            Colors.BACKGROUND_SEMI,
            Colors.BORDER_DEFAULT