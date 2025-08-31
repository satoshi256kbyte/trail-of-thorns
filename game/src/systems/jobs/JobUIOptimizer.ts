/**
 * JobUIOptimizer - 職業システムのUI更新最適化
 * 
 * このクラスはUI更新の最適化、バッチ処理、
 * レンダリングパフォーマンスの向上を行います。
 * 要件8.2に対応した機能を提供します。
 */

import { Unit } from '../../types/gameplay';
import { JobData, CharacterJobData } from '../../types/job';

/**
 * UI更新の種類
 */
export enum UIUpdateType {
    STATS = 'stats',
    SKILLS = 'skills',
    JOB_INFO = 'job_info',
    RANK_INFO = 'rank_info',
    ROSE_ESSENCE = 'rose_essence',
    RANK_UP_BUTTON = 'rank_up_button',
    JOB_CHANGE_BUTTON = 'job_change_button',
    PROGRESS_BAR = 'progress_bar',
    ANIMATION = 'animation'
}

/**
 * UI更新の優先度
 */
export enum UIUpdatePriority {
    IMMEDIATE = 0,    // 即座に実行
    HIGH = 1,         // 高優先度
    NORMAL = 2,       // 通常優先度
    LOW = 3,          // 低優先度
    BACKGROUND = 4    // バックグラウンド
}

/**
 * UI更新リクエスト
 */
export interface UIUpdateRequest {
    id: string;
    characterId: string;
    updateType: UIUpdateType;
    priority: UIUpdatePriority;
    data: any;
    timestamp: number;
    dependencies: string[];
    callback?: () => void;
}

/**
 * UI更新バッチ
 */
interface UIUpdateBatch {
    id: string;
    requests: UIUpdateRequest[];
    priority: UIUpdatePriority;
    scheduledTime: number;
    estimatedDuration: number;
}

/**
 * UI要素の状態
 */
interface UIElementState {
    elementId: string;
    lastUpdateTime: number;
    updateCount: number;
    isDirty: boolean;
    isVisible: boolean;
    renderCost: number;
}

/**
 * レンダリング統計
 */
export interface RenderingStats {
    totalUpdates: number;
    batchedUpdates: number;
    skippedUpdates: number;
    averageBatchSize: number;
    averageRenderTime: number;
    frameDrops: number;
    lastFrameTime: number;
}

/**
 * UI最適化設定
 */
export interface UIOptimizerConfig {
    maxBatchSize: number;
    batchTimeoutMs: number;
    maxFrameTime: number;
    enableVirtualization: boolean;
    enableDirtyChecking: boolean;
    enableRequestAnimationFrame: boolean;
    priorityThresholds: {
        immediate: number;
        high: number;
        normal: number;
        low: number;
    };
}

/**
 * 職業システムUI最適化クラス
 */
export class JobUIOptimizer {
    private config: UIOptimizerConfig;
    private updateQueue: UIUpdateRequest[] = [];
    private batchQueue: UIUpdateBatch[] = [];
    private elementStates: Map<string, UIElementState> = new Map();
    private stats: RenderingStats;
    private rafId: number | null = null;
    private batchTimer: NodeJS.Timeout | null = null;
    private frameStartTime: number = 0;
    private isProcessing: boolean = false;

    constructor(config: Partial<UIOptimizerConfig> = {}) {
        this.config = {
            maxBatchSize: 10,
            batchTimeoutMs: 16, // ~60fps
            maxFrameTime: 16.67, // 60fps target
            enableVirtualization: true,
            enableDirtyChecking: true,
            enableRequestAnimationFrame: true,
            priorityThresholds: {
                immediate: 0,
                high: 16,
                normal: 33,
                low: 100
            },
            ...config
        };

        this.stats = {
            totalUpdates: 0,
            batchedUpdates: 0,
            skippedUpdates: 0,
            averageBatchSize: 0,
            averageRenderTime: 0,
            frameDrops: 0,
            lastFrameTime: 0
        };

        this.startProcessing();
    }

    /**
     * 処理を開始
     */
    private startProcessing(): void {
        if (this.config.enableRequestAnimationFrame) {
            this.scheduleNextFrame();
        } else {
            this.batchTimer = setInterval(() => {
                this.processBatches();
            }, this.config.batchTimeoutMs);
        }
    }

    /**
     * 次のフレームをスケジュール
     */
    private scheduleNextFrame(): void {
        if (this.rafId) {
            return;
        }

        this.rafId = requestAnimationFrame((timestamp) => {
            this.frameStartTime = timestamp;
            this.processBatches();
            this.rafId = null;

            // 継続的に処理をスケジュール
            if (this.updateQueue.length > 0 || this.batchQueue.length > 0) {
                this.scheduleNextFrame();
            }
        });
    }

    /**
     * UI更新をリクエスト
     * 要件8.2: 職業変更の処理時間1秒以内
     */
    requestUpdate(request: Omit<UIUpdateRequest, 'id' | 'timestamp'>): string {
        const id = this.generateRequestId();
        const fullRequest: UIUpdateRequest = {
            id,
            timestamp: Date.now(),
            ...request
        };

        // 即座に実行する必要がある場合
        if (request.priority === UIUpdatePriority.IMMEDIATE) {
            this.executeUpdate(fullRequest);
            return id;
        }

        // ダーティチェックが有効な場合、不要な更新をスキップ
        if (this.config.enableDirtyChecking && this.shouldSkipUpdate(fullRequest)) {
            this.stats.skippedUpdates++;
            return id;
        }

        this.updateQueue.push(fullRequest);
        this.updateElementState(fullRequest);

        // 高優先度の場合は即座にバッチ処理を開始
        if (request.priority === UIUpdatePriority.HIGH) {
            this.processBatches();
        }

        return id;
    }

    /**
     * 更新をスキップすべきかチェック
     */
    private shouldSkipUpdate(request: UIUpdateRequest): boolean {
        const elementId = `${request.characterId}-${request.updateType}`;
        const state = this.elementStates.get(elementId);

        if (!state) {
            return false;
        }

        // 非表示要素の更新をスキップ
        if (!state.isVisible && request.updateType !== UIUpdateType.ANIMATION) {
            return true;
        }

        // 短時間での重複更新をスキップ
        const timeSinceLastUpdate = Date.now() - state.lastUpdateTime;
        if (timeSinceLastUpdate < 16 && !state.isDirty) { // 16ms以内の重複
            return true;
        }

        return false;
    }

    /**
     * UI要素の状態を更新
     */
    private updateElementState(request: UIUpdateRequest): void {
        const elementId = `${request.characterId}-${request.updateType}`;
        const state = this.elementStates.get(elementId) || {
            elementId,
            lastUpdateTime: 0,
            updateCount: 0,
            isDirty: false,
            isVisible: true,
            renderCost: this.estimateRenderCost(request.updateType)
        };

        state.isDirty = true;
        state.updateCount++;
        this.elementStates.set(elementId, state);
    }

    /**
     * レンダリングコストを推定
     */
    private estimateRenderCost(updateType: UIUpdateType): number {
        const costs = {
            [UIUpdateType.STATS]: 2,
            [UIUpdateType.SKILLS]: 3,
            [UIUpdateType.JOB_INFO]: 2,
            [UIUpdateType.RANK_INFO]: 1,
            [UIUpdateType.ROSE_ESSENCE]: 1,
            [UIUpdateType.RANK_UP_BUTTON]: 1,
            [UIUpdateType.JOB_CHANGE_BUTTON]: 1,
            [UIUpdateType.PROGRESS_BAR]: 2,
            [UIUpdateType.ANIMATION]: 5
        };

        return costs[updateType] || 1;
    }

    /**
     * バッチを処理
     * 要件8.2: 職業変更の処理時間1秒以内
     */
    private processBatches(): void {
        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;
        const startTime = performance.now();

        try {
            // 新しいバッチを作成
            this.createBatches();

            // バッチを実行
            this.executeBatches();

            // 統計を更新
            const endTime = performance.now();
            this.updateRenderingStats(endTime - startTime);

        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * バッチを作成
     */
    private createBatches(): void {
        if (this.updateQueue.length === 0) {
            return;
        }

        // 優先度でソート
        this.updateQueue.sort((a, b) => a.priority - b.priority);

        // 依存関係を解決
        const resolvedRequests = this.resolveDependencies(this.updateQueue);

        // バッチに分割
        const batches = this.groupIntoBatches(resolvedRequests);
        this.batchQueue.push(...batches);

        // 処理済みリクエストをクリア
        this.updateQueue.length = 0;
    }

    /**
     * 依存関係を解決
     */
    private resolveDependencies(requests: UIUpdateRequest[]): UIUpdateRequest[] {
        const resolved: UIUpdateRequest[] = [];
        const pending = [...requests];
        const processing = new Set<string>();

        while (pending.length > 0) {
            const request = pending.shift()!;

            // 依存関係がすべて解決されているかチェック
            const dependenciesMet = request.dependencies.every(depId =>
                resolved.some(r => r.id === depId) || processing.has(depId)
            );

            if (dependenciesMet) {
                resolved.push(request);
                processing.add(request.id);
            } else {
                // 依存関係が未解決の場合は後回し
                pending.push(request);
            }

            // 無限ループ防止
            if (pending.length > 100) {
                console.warn('Dependency resolution limit reached');
                resolved.push(...pending);
                break;
            }
        }

        return resolved;
    }

    /**
     * リクエストをバッチにグループ化
     */
    private groupIntoBatches(requests: UIUpdateRequest[]): UIUpdateBatch[] {
        const batches: UIUpdateBatch[] = [];
        let currentBatch: UIUpdateRequest[] = [];
        let currentPriority = requests[0]?.priority;

        for (const request of requests) {
            // 優先度が変わるか、バッチサイズ上限に達した場合は新しいバッチを作成
            if (request.priority !== currentPriority ||
                currentBatch.length >= this.config.maxBatchSize) {

                if (currentBatch.length > 0) {
                    batches.push(this.createBatch(currentBatch, currentPriority));
                    currentBatch = [];
                }
                currentPriority = request.priority;
            }

            currentBatch.push(request);
        }

        // 最後のバッチを追加
        if (currentBatch.length > 0) {
            batches.push(this.createBatch(currentBatch, currentPriority));
        }

        return batches;
    }

    /**
     * バッチを作成
     */
    private createBatch(requests: UIUpdateRequest[], priority: UIUpdatePriority): UIUpdateBatch {
        const estimatedDuration = requests.reduce((sum, request) => {
            const elementId = `${request.characterId}-${request.updateType}`;
            const state = this.elementStates.get(elementId);
            return sum + (state?.renderCost || 1);
        }, 0);

        return {
            id: this.generateBatchId(),
            requests,
            priority,
            scheduledTime: Date.now(),
            estimatedDuration
        };
    }

    /**
     * バッチを実行
     */
    private executeBatches(): void {
        const availableTime = this.config.maxFrameTime;
        let usedTime = 0;

        while (this.batchQueue.length > 0 && usedTime < availableTime) {
            const batch = this.batchQueue.shift()!;
            const batchStartTime = performance.now();

            // バッチ内のリクエストを実行
            batch.requests.forEach(request => {
                this.executeUpdate(request);
            });

            const batchTime = performance.now() - batchStartTime;
            usedTime += batchTime;

            this.stats.batchedUpdates++;
            this.stats.averageBatchSize =
                (this.stats.averageBatchSize * (this.stats.batchedUpdates - 1) + batch.requests.length) /
                this.stats.batchedUpdates;
        }

        // フレーム時間を超過した場合
        if (usedTime > availableTime) {
            this.stats.frameDrops++;
        }
    }

    /**
     * 個別の更新を実行
     */
    private executeUpdate(request: UIUpdateRequest): void {
        const startTime = performance.now();

        try {
            switch (request.updateType) {
                case UIUpdateType.STATS:
                    this.updateStatsUI(request);
                    break;
                case UIUpdateType.SKILLS:
                    this.updateSkillsUI(request);
                    break;
                case UIUpdateType.JOB_INFO:
                    this.updateJobInfoUI(request);
                    break;
                case UIUpdateType.RANK_INFO:
                    this.updateRankInfoUI(request);
                    break;
                case UIUpdateType.ROSE_ESSENCE:
                    this.updateRoseEssenceUI(request);
                    break;
                case UIUpdateType.RANK_UP_BUTTON:
                    this.updateRankUpButtonUI(request);
                    break;
                case UIUpdateType.JOB_CHANGE_BUTTON:
                    this.updateJobChangeButtonUI(request);
                    break;
                case UIUpdateType.PROGRESS_BAR:
                    this.updateProgressBarUI(request);
                    break;
                case UIUpdateType.ANIMATION:
                    this.updateAnimationUI(request);
                    break;
            }

            // 要素状態を更新
            const elementId = `${request.characterId}-${request.updateType}`;
            const state = this.elementStates.get(elementId);
            if (state) {
                state.lastUpdateTime = Date.now();
                state.isDirty = false;
            }

            // コールバック実行
            if (request.callback) {
                request.callback();
            }

            this.stats.totalUpdates++;

        } catch (error) {
            console.error('UI update failed:', error, request);
        }

        const endTime = performance.now();
        this.updateAverageRenderTime(endTime - startTime);
    }

    /**
     * 能力値UIを更新
     */
    private updateStatsUI(request: UIUpdateRequest): void {
        const { characterId, data } = request;
        // 実際のUI更新処理
        console.log(`Updating stats UI for character ${characterId}`, data);
    }

    /**
     * スキルUIを更新
     */
    private updateSkillsUI(request: UIUpdateRequest): void {
        const { characterId, data } = request;
        // 実際のUI更新処理
        console.log(`Updating skills UI for character ${characterId}`, data);
    }

    /**
     * 職業情報UIを更新
     */
    private updateJobInfoUI(request: UIUpdateRequest): void {
        const { characterId, data } = request;
        // 実際のUI更新処理
        console.log(`Updating job info UI for character ${characterId}`, data);
    }

    /**
     * ランク情報UIを更新
     */
    private updateRankInfoUI(request: UIUpdateRequest): void {
        const { characterId, data } = request;
        // 実際のUI更新処理
        console.log(`Updating rank info UI for character ${characterId}`, data);
    }

    /**
     * 薔薇の力UIを更新
     */
    private updateRoseEssenceUI(request: UIUpdateRequest): void {
        const { data } = request;
        // 実際のUI更新処理
        console.log(`Updating rose essence UI`, data);
    }

    /**
     * ランクアップボタンUIを更新
     */
    private updateRankUpButtonUI(request: UIUpdateRequest): void {
        const { characterId, data } = request;
        // 実際のUI更新処理
        console.log(`Updating rank up button UI for character ${characterId}`, data);
    }

    /**
     * 職業変更ボタンUIを更新
     */
    private updateJobChangeButtonUI(request: UIUpdateRequest): void {
        const { characterId, data } = request;
        // 実際のUI更新処理
        console.log(`Updating job change button UI for character ${characterId}`, data);
    }

    /**
     * プログレスバーUIを更新
     */
    private updateProgressBarUI(request: UIUpdateRequest): void {
        const { characterId, data } = request;
        // 実際のUI更新処理
        console.log(`Updating progress bar UI for character ${characterId}`, data);
    }

    /**
     * アニメーションUIを更新
     */
    private updateAnimationUI(request: UIUpdateRequest): void {
        const { characterId, data } = request;
        // 実際のUI更新処理
        console.log(`Updating animation UI for character ${characterId}`, data);
    }

    /**
     * 平均レンダリング時間を更新
     */
    private updateAverageRenderTime(renderTime: number): void {
        const alpha = 0.1;
        this.stats.averageRenderTime =
            this.stats.averageRenderTime * (1 - alpha) + renderTime * alpha;
    }

    /**
     * レンダリング統計を更新
     */
    private updateRenderingStats(frameTime: number): void {
        this.stats.lastFrameTime = frameTime;
    }

    /**
     * UI要素の可視性を設定
     */
    setElementVisibility(characterId: string, updateType: UIUpdateType, visible: boolean): void {
        const elementId = `${characterId}-${updateType}`;
        const state = this.elementStates.get(elementId);
        if (state) {
            state.isVisible = visible;
        }
    }

    /**
     * 複数のUI更新をバッチリクエスト
     */
    batchUpdate(characterId: string, updates: Array<{
        updateType: UIUpdateType;
        data: any;
        priority?: UIUpdatePriority;
    }>): string[] {
        const requestIds: string[] = [];

        updates.forEach(update => {
            const id = this.requestUpdate({
                characterId,
                updateType: update.updateType,
                priority: update.priority || UIUpdatePriority.NORMAL,
                data: update.data,
                dependencies: []
            });
            requestIds.push(id);
        });

        return requestIds;
    }

    /**
     * リクエストIDを生成
     */
    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * バッチIDを生成
     */
    private generateBatchId(): string {
        return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * レンダリング統計を取得
     */
    getRenderingStats(): RenderingStats {
        return { ...this.stats };
    }

    /**
     * UI最適化レポートを生成
     */
    generateOptimizationReport(): string {
        let report = '=== Job UI Optimizer Report ===\n';
        report += `Total Updates: ${this.stats.totalUpdates}\n`;
        report += `Batched Updates: ${this.stats.batchedUpdates}\n`;
        report += `Skipped Updates: ${this.stats.skippedUpdates}\n`;
        report += `Average Batch Size: ${this.stats.averageBatchSize.toFixed(2)}\n`;
        report += `Average Render Time: ${this.stats.averageRenderTime.toFixed(2)}ms\n`;
        report += `Frame Drops: ${this.stats.frameDrops}\n`;
        report += `Last Frame Time: ${this.stats.lastFrameTime.toFixed(2)}ms\n`;
        report += `Tracked Elements: ${this.elementStates.size}\n`;
        report += `Pending Updates: ${this.updateQueue.length}\n`;
        report += `Pending Batches: ${this.batchQueue.length}\n`;

        return report;
    }

    /**
     * キューをクリア
     */
    clearQueues(): void {
        this.updateQueue.length = 0;
        this.batchQueue.length = 0;
    }

    /**
     * システムを破棄
     */
    dispose(): void {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        if (this.batchTimer) {
            clearInterval(this.batchTimer);
            this.batchTimer = null;
        }

        this.clearQueues();
        this.elementStates.clear();

        console.log('JobUIOptimizer disposed');
    }
}