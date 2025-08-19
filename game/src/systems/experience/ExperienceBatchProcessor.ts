/**
 * ExperienceBatchProcessor - 複数キャラクター経験値処理バッチ処理システム
 * 
 * このクラスは複数キャラクターの経験値処理を効率的にバッチ処理します:
 * - 複数キャラクターの経験値付与を一括処理
 * - レベルアップ処理の最適化
 * - UI更新の最適化
 * - 処理順序の最適化
 * - パフォーマンス監視
 * 
 * 要件: 8.2, 8.3
 * 
 * @version 1.0.0
 * @author Trail of Thorns Development Team
 */

import {
    ExperienceAction,
    ExperienceContext,
    ExperienceCalculationResult,
    LevelUpResult,
    ExperienceSource
} from '../../types/experience';
import { Unit } from '../../types/gameplay';

/**
 * バッチ処理要求
 */
export interface BatchExperienceRequest {
    characterId: string;
    action: ExperienceAction;
    context: ExperienceContext;
    priority: number;
}

/**
 * バッチ処理結果
 */
export interface BatchProcessingResult {
    totalProcessed: number;
    successfulProcessed: number;
    failedProcessed: number;
    experienceResults: Map<string, ExperienceCalculationResult>;
    levelUpResults: Map<string, LevelUpResult[]>;
    processingTime: number;
    errors: Array<{ characterId: string; error: string }>;
}

/**
 * バッチ処理設定
 */
export interface BatchProcessingConfig {
    maxBatchSize: number;
    processingTimeout: number;
    enablePriorityQueue: boolean;
    enableParallelProcessing: boolean;
    maxConcurrentProcessing: number;
    uiUpdateBatchSize: number;
    enableProgressCallback: boolean;
    retryFailedOperations: boolean;
    maxRetries: number;
}

/**
 * バッチ処理統計
 */
export interface BatchProcessingStatistics {
    totalBatches: number;
    totalOperations: number;
    averageBatchSize: number;
    averageProcessingTime: number;
    successRate: number;
    throughputPerSecond: number;
    lastProcessingTime: number;
    peakBatchSize: number;
}

/**
 * 進捗コールバック
 */
export type ProgressCallback = (processed: number, total: number, currentCharacter?: string) => void;

/**
 * ExperienceBatchProcessorクラス
 * 複数キャラクターの経験値処理を効率的にバッチ処理
 */
export class ExperienceBatchProcessor {
    private config: BatchProcessingConfig;
    private statistics: BatchProcessingStatistics;

    // 処理キュー
    private processingQueue: BatchExperienceRequest[] = [];
    private priorityQueue: BatchExperienceRequest[] = [];
    private isProcessing: boolean = false;

    // 処理中の要求追跡
    private activeRequests: Set<string> = new Set();
    private retryCount: Map<string, number> = new Map();

    // コールバック
    private progressCallback?: ProgressCallback;
    private experienceSystem?: any; // ExperienceSystemの参照

    // パフォーマンス測定
    private processingStartTime: number = 0;
    private lastOptimization: number = Date.now();

    constructor(config?: Partial<BatchProcessingConfig>) {
        this.config = { ...this.getDefaultConfig(), ...config };
        this.statistics = this.getInitialStatistics();
    }

    /**
     * 経験値システムを設定
     */
    public setExperienceSystem(experienceSystem: any): void {
        this.experienceSystem = experienceSystem;
    }

    /**
     * 進捗コールバックを設定
     */
    public setProgressCallback(callback: ProgressCallback): void {
        this.progressCallback = callback;
    }

    /**
     * バッチ処理要求を追加
     */
    public addRequest(request: BatchExperienceRequest): void {
        // 重複チェック
        const requestKey = `${request.characterId}_${request.action}_${request.context.timestamp}`;
        if (this.activeRequests.has(requestKey)) {
            return;
        }

        this.activeRequests.add(requestKey);

        if (this.config.enablePriorityQueue && request.priority > 0) {
            this.addToPriorityQueue(request);
        } else {
            this.processingQueue.push(request);
        }

        // バッチサイズに達したら自動処理
        if (this.getTotalQueueSize() >= this.config.maxBatchSize) {
            this.processBatch();
        }
    }

    /**
     * 複数の要求を一括追加
     */
    public addRequests(requests: BatchExperienceRequest[]): void {
        requests.forEach(request => this.addRequest(request));
    }

    /**
     * バッチ処理を実行
     */
    public async processBatch(): Promise<BatchProcessingResult> {
        if (this.isProcessing) {
            console.warn('Batch processing already in progress');
            return this.getEmptyResult();
        }

        if (this.getTotalQueueSize() === 0) {
            return this.getEmptyResult();
        }

        this.isProcessing = true;
        this.processingStartTime = performance.now();

        try {
            const result = await this.executeBatchProcessing();
            this.updateStatistics(result);
            return result;
        } catch (error) {
            console.error('Batch processing failed:', error);
            return this.getErrorResult(error);
        } finally {
            this.isProcessing = false;
            this.activeRequests.clear();
        }
    }

    /**
     * 強制的にバッチ処理を実行（キューサイズに関係なく）
     */
    public async forceProcessBatch(): Promise<BatchProcessingResult> {
        return this.processBatch();
    }

    /**
     * 特定キャラクターの処理を優先実行
     */
    public async processPriorityCharacter(characterId: string): Promise<BatchProcessingResult> {
        // 該当キャラクターの要求を抽出
        const characterRequests = this.extractCharacterRequests(characterId);

        if (characterRequests.length === 0) {
            return this.getEmptyResult();
        }

        // 一時的に別のプロセッサーで処理
        const tempProcessor = new ExperienceBatchProcessor(this.config);
        tempProcessor.setExperienceSystem(this.experienceSystem);
        tempProcessor.addRequests(characterRequests);

        return tempProcessor.processBatch();
    }

    /**
     * キューをクリア
     */
    public clearQueue(): void {
        this.processingQueue.length = 0;
        this.priorityQueue.length = 0;
        this.activeRequests.clear();
        this.retryCount.clear();
    }

    /**
     * 現在のキューサイズを取得
     */
    public getQueueSize(): number {
        return this.getTotalQueueSize();
    }

    /**
     * 統計情報を取得
     */
    public getStatistics(): BatchProcessingStatistics {
        return { ...this.statistics };
    }

    /**
     * 設定を更新
     */
    public updateConfig(newConfig: Partial<BatchProcessingConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * バッチ処理を最適化
     */
    public async optimize(): Promise<void> {
        const beforeTime = this.statistics.averageProcessingTime;

        // キューの最適化
        this.optimizeQueue();

        // 統計の更新
        this.optimizeStatistics();

        const afterTime = this.statistics.averageProcessingTime;
        const improvement = beforeTime - afterTime;

        this.lastOptimization = Date.now();

        console.log(`Batch processor optimized: ${improvement.toFixed(2)}ms improvement`);
    }

    // プライベートメソッド

    /**
     * デフォルト設定を取得
     */
    private getDefaultConfig(): BatchProcessingConfig {
        return {
            maxBatchSize: 50,
            processingTimeout: 5000,
            enablePriorityQueue: true,
            enableParallelProcessing: true,
            maxConcurrentProcessing: 5,
            uiUpdateBatchSize: 10,
            enableProgressCallback: true,
            retryFailedOperations: true,
            maxRetries: 3
        };
    }

    /**
     * 初期統計を取得
     */
    private getInitialStatistics(): BatchProcessingStatistics {
        return {
            totalBatches: 0,
            totalOperations: 0,
            averageBatchSize: 0,
            averageProcessingTime: 0,
            successRate: 1.0,
            throughputPerSecond: 0,
            lastProcessingTime: 0,
            peakBatchSize: 0
        };
    }

    /**
     * 空の結果を取得
     */
    private getEmptyResult(): BatchProcessingResult {
        return {
            totalProcessed: 0,
            successfulProcessed: 0,
            failedProcessed: 0,
            experienceResults: new Map(),
            levelUpResults: new Map(),
            processingTime: 0,
            errors: []
        };
    }

    /**
     * エラー結果を取得
     */
    private getErrorResult(error: any): BatchProcessingResult {
        return {
            totalProcessed: 0,
            successfulProcessed: 0,
            failedProcessed: this.getTotalQueueSize(),
            experienceResults: new Map(),
            levelUpResults: new Map(),
            processingTime: performance.now() - this.processingStartTime,
            errors: [{ characterId: 'batch', error: error.toString() }]
        };
    }

    /**
     * 総キューサイズを取得
     */
    private getTotalQueueSize(): number {
        return this.processingQueue.length + this.priorityQueue.length;
    }

    /**
     * 優先キューに追加
     */
    private addToPriorityQueue(request: BatchExperienceRequest): void {
        // 優先度順に挿入
        let insertIndex = 0;
        for (let i = 0; i < this.priorityQueue.length; i++) {
            if (this.priorityQueue[i].priority < request.priority) {
                insertIndex = i;
                break;
            }
            insertIndex = i + 1;
        }
        this.priorityQueue.splice(insertIndex, 0, request);
    }

    /**
     * バッチ処理を実行
     */
    private async executeBatchProcessing(): Promise<BatchProcessingResult> {
        const result: BatchProcessingResult = {
            totalProcessed: 0,
            successfulProcessed: 0,
            failedProcessed: 0,
            experienceResults: new Map(),
            levelUpResults: new Map(),
            processingTime: 0,
            errors: []
        };

        // 処理する要求を取得
        const requests = this.getRequestsForProcessing();
        result.totalProcessed = requests.length;

        if (requests.length === 0) {
            return result;
        }

        // 並列処理または順次処理
        if (this.config.enableParallelProcessing) {
            await this.processRequestsInParallel(requests, result);
        } else {
            await this.processRequestsSequentially(requests, result);
        }

        result.processingTime = performance.now() - this.processingStartTime;
        return result;
    }

    /**
     * 処理する要求を取得
     */
    private getRequestsForProcessing(): BatchExperienceRequest[] {
        const requests: BatchExperienceRequest[] = [];

        // 優先キューから取得
        while (this.priorityQueue.length > 0 && requests.length < this.config.maxBatchSize) {
            requests.push(this.priorityQueue.shift()!);
        }

        // 通常キューから取得
        while (this.processingQueue.length > 0 && requests.length < this.config.maxBatchSize) {
            requests.push(this.processingQueue.shift()!);
        }

        return requests;
    }

    /**
     * 要求を並列処理
     */
    private async processRequestsInParallel(
        requests: BatchExperienceRequest[],
        result: BatchProcessingResult
    ): Promise<void> {
        const chunks = this.chunkArray(requests, this.config.maxConcurrentProcessing);

        for (const chunk of chunks) {
            const promises = chunk.map(request => this.processRequest(request, result));
            await Promise.allSettled(promises);

            // 進捗コールバック
            if (this.config.enableProgressCallback && this.progressCallback) {
                this.progressCallback(result.successfulProcessed + result.failedProcessed, result.totalProcessed);
            }
        }
    }

    /**
     * 要求を順次処理
     */
    private async processRequestsSequentially(
        requests: BatchExperienceRequest[],
        result: BatchProcessingResult
    ): Promise<void> {
        for (const request of requests) {
            await this.processRequest(request, result);

            // 進捗コールバック
            if (this.config.enableProgressCallback && this.progressCallback) {
                this.progressCallback(
                    result.successfulProcessed + result.failedProcessed,
                    result.totalProcessed,
                    request.characterId
                );
            }
        }
    }

    /**
     * 単一要求を処理
     */
    private async processRequest(
        request: BatchExperienceRequest,
        result: BatchProcessingResult
    ): Promise<void> {
        try {
            if (!this.experienceSystem) {
                throw new Error('Experience system not set');
            }

            // タイムアウト設定
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Processing timeout')), this.config.processingTimeout);
            });

            // 経験値処理
            const processingPromise = this.processExperienceRequest(request);

            const experienceResult = await Promise.race([processingPromise, timeoutPromise]) as ExperienceCalculationResult;

            if (experienceResult) {
                result.experienceResults.set(request.characterId, experienceResult);

                // レベルアップチェック
                const levelUpResult = this.experienceSystem.checkAndProcessLevelUp(request.characterId);
                if (levelUpResult) {
                    const existing = result.levelUpResults.get(request.characterId) || [];
                    existing.push(levelUpResult);
                    result.levelUpResults.set(request.characterId, existing);
                }

                result.successfulProcessed++;
            } else {
                result.failedProcessed++;
                result.errors.push({
                    characterId: request.characterId,
                    error: 'No experience result returned'
                });
            }

        } catch (error) {
            result.failedProcessed++;
            result.errors.push({
                characterId: request.characterId,
                error: error.toString()
            });

            // リトライ処理
            if (this.config.retryFailedOperations) {
                await this.handleRetry(request, result);
            }
        }
    }

    /**
     * 経験値要求を処理
     */
    private async processExperienceRequest(request: BatchExperienceRequest): Promise<ExperienceCalculationResult> {
        return this.experienceSystem.awardExperience(
            request.characterId,
            request.action,
            request.context
        );
    }

    /**
     * リトライを処理
     */
    private async handleRetry(
        request: BatchExperienceRequest,
        result: BatchProcessingResult
    ): Promise<void> {
        const retryKey = `${request.characterId}_${request.action}`;
        const currentRetries = this.retryCount.get(retryKey) || 0;

        if (currentRetries < this.config.maxRetries) {
            this.retryCount.set(retryKey, currentRetries + 1);

            // 少し待ってからリトライ
            await new Promise(resolve => setTimeout(resolve, 100 * (currentRetries + 1)));

            try {
                const experienceResult = await this.processExperienceRequest(request);
                if (experienceResult) {
                    result.experienceResults.set(request.characterId, experienceResult);
                    result.successfulProcessed++;
                    result.failedProcessed--;

                    // エラーリストから削除
                    const errorIndex = result.errors.findIndex(e => e.characterId === request.characterId);
                    if (errorIndex >= 0) {
                        result.errors.splice(errorIndex, 1);
                    }
                }
            } catch (retryError) {
                console.warn(`Retry failed for ${request.characterId}:`, retryError);
            }
        }
    }

    /**
     * 配列をチャンクに分割
     */
    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * 特定キャラクターの要求を抽出
     */
    private extractCharacterRequests(characterId: string): BatchExperienceRequest[] {
        const extracted: BatchExperienceRequest[] = [];

        // 優先キューから抽出
        for (let i = this.priorityQueue.length - 1; i >= 0; i--) {
            if (this.priorityQueue[i].characterId === characterId) {
                extracted.push(this.priorityQueue.splice(i, 1)[0]);
            }
        }

        // 通常キューから抽出
        for (let i = this.processingQueue.length - 1; i >= 0; i--) {
            if (this.processingQueue[i].characterId === characterId) {
                extracted.push(this.processingQueue.splice(i, 1)[0]);
            }
        }

        return extracted;
    }

    /**
     * 統計を更新
     */
    private updateStatistics(result: BatchProcessingResult): void {
        this.statistics.totalBatches++;
        this.statistics.totalOperations += result.totalProcessed;
        this.statistics.lastProcessingTime = result.processingTime;

        if (result.totalProcessed > this.statistics.peakBatchSize) {
            this.statistics.peakBatchSize = result.totalProcessed;
        }

        // 平均バッチサイズを更新
        this.statistics.averageBatchSize = this.statistics.totalOperations / this.statistics.totalBatches;

        // 平均処理時間を更新
        const totalTime = this.statistics.averageProcessingTime * (this.statistics.totalBatches - 1) + result.processingTime;
        this.statistics.averageProcessingTime = totalTime / this.statistics.totalBatches;

        // 成功率を更新
        const totalSuccessful = result.successfulProcessed;
        const totalProcessed = result.totalProcessed;
        if (totalProcessed > 0) {
            this.statistics.successRate = totalSuccessful / totalProcessed;
        }

        // スループットを更新
        if (result.processingTime > 0) {
            this.statistics.throughputPerSecond = (result.totalProcessed / result.processingTime) * 1000;
        }
    }

    /**
     * キューを最適化
     */
    private optimizeQueue(): void {
        // 重複要求を削除
        const seen = new Set<string>();
        this.processingQueue = this.processingQueue.filter(request => {
            const key = `${request.characterId}_${request.action}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });

        // 優先キューも同様に最適化
        seen.clear();
        this.priorityQueue = this.priorityQueue.filter(request => {
            const key = `${request.characterId}_${request.action}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * 統計を最適化
     */
    private optimizeStatistics(): void {
        // 古い統計データをリセット（必要に応じて）
        const now = Date.now();
        const timeSinceLastOptimization = now - this.lastOptimization;

        // 1時間以上経過している場合は統計をリセット
        if (timeSinceLastOptimization > 3600000) {
            this.statistics = this.getInitialStatistics();
        }
    }
}