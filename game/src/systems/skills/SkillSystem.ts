/**
 * スキルシステムメインコントローラー
 * 
 * このファイルには以下のクラスが含まれます：
 * - SkillSystem: スキルシステム全体を統合管理するメインコントローラー
 * - 各サブシステム（Manager、Executor、UI等）の統合
 * - スキル使用のメインフロー管理
 * - 使用可能スキル取得機能
 * - スキルシステム全体の状態管理
 */

import * as Phaser from 'phaser';
import {
    Skill,
    SkillData,
    SkillResult,
    SkillExecutionContext,
    SkillUsabilityResult,
    Position,
    CharacterSkillData,
    SkillFilter,
    SkillStatistics,
    SkillUsabilityError
} from '../../types/skill';

import { SkillManager, SkillManagerResult } from './SkillManager';
import { SkillExecutor, SkillExecutionConfig } from './SkillExecutor';
import { SkillConditionChecker, ExtendedSkillUsabilityResult } from './SkillConditionChecker';
import { SkillUI, SkillUIConfig, SkillMenuItem, SkillSelectionResult } from './SkillUI';

/**
 * スキルシステム設定
 */
export interface SkillSystemConfig {
    /** スキル実行設定 */
    execution: Partial<SkillExecutionConfig>;
    /** UI設定 */
    ui: Partial<SkillUIConfig>;
    /** デバッグモード */
    debugMode: boolean;
    /** 自動保存設定 */
    autoSave: boolean;
    /** パフォーマンス監視 */
    performanceMonitoring: boolean;
    /** エラー自動回復 */
    autoErrorRecovery: boolean;
}

/**
 * スキルシステム状態
 */
export interface SkillSystemState {
    /** 初期化済みフラグ */
    initialized: boolean;
    /** 現在のフェーズ */
    currentPhase: 'idle' | 'skill_selection' | 'target_selection' | 'execution' | 'animation' | 'cleanup';
    /** アクティブなスキル使用者 */
    activeCaster?: string;
    /** 選択中のスキル */
    selectedSkill?: Skill;
    /** 対象位置 */
    targetPosition?: Position;
    /** 実行中フラグ */
    isExecuting: boolean;
    /** 最後の実行結果 */
    lastExecutionResult?: SkillResult;
    /** エラー状態 */
    errorState?: {
        hasError: boolean;
        errorType: string;
        errorMessage: string;
        timestamp: Date;
    };
}

/**
 * スキル使用フロー結果
 */
export interface SkillUsageFlowResult {
    /** 成功フラグ */
    success: boolean;
    /** 実行結果 */
    result?: SkillResult;
    /** エラー情報 */
    error?: {
        type: string;
        message: string;
        phase: string;
    };
    /** フロー統計 */
    flowStats?: {
        totalTime: number;
        selectionTime: number;
        executionTime: number;
        animationTime: number;
    };
}

/**
 * スキルシステムメインコントローラー
 * 全てのスキル関連サブシステムを統合し、統一されたインターフェースを提供する
 */
export class SkillSystem extends Phaser.Events.EventEmitter {
    private scene: Phaser.Scene;
    private config: SkillSystemConfig;
    private state: SkillSystemState;

    // サブシステム
    private skillManager: SkillManager;
    private skillExecutor: SkillExecutor;
    private conditionChecker: SkillConditionChecker;
    private skillUI: SkillUI;

    // 戦場状態（外部から注入される）
    private battlefieldState: any = null;

    // パフォーマンス監視
    private performanceMetrics: Map<string, number> = new Map();
    private executionHistory: SkillUsageFlowResult[] = [];

    // フロー制御
    private currentFlowPromise?: Promise<SkillUsageFlowResult>;
    private flowStartTime: number = 0;
    private selectionStartTime: number = 0;
    private executionStartTime: number = 0;

    // デフォルト設定
    private static readonly DEFAULT_CONFIG: SkillSystemConfig = {
        execution: {
            enableAnimations: true,
            enableSoundEffects: true,
            executionSpeed: 1.0,
            animationTimeout: 5000,
            enableDebugLogging: true,
            enableAutoRecovery: true
        },
        ui: {
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
        },
        debugMode: false,
        autoSave: true,
        performanceMonitoring: true,
        autoErrorRecovery: true
    };

    /**
     * SkillSystemを作成する
     * @param scene Phaserシーン
     * @param config システム設定
     */
    constructor(scene: Phaser.Scene, config?: Partial<SkillSystemConfig>) {
        super();

        this.scene = scene;
        this.config = this.mergeConfig(config || {});

        // 状態を初期化
        this.state = {
            initialized: false,
            currentPhase: 'idle',
            isExecuting: false
        };

        // サブシステムを初期化
        this.initializeSubsystems();

        this.log('SkillSystem created');
    }

    /**
     * 設定をマージする
     */
    private mergeConfig(config: Partial<SkillSystemConfig>): SkillSystemConfig {
        return {
            execution: { ...SkillSystem.DEFAULT_CONFIG.execution, ...config.execution },
            ui: { ...SkillSystem.DEFAULT_CONFIG.ui, ...config.ui },
            debugMode: config.debugMode ?? SkillSystem.DEFAULT_CONFIG.debugMode,
            autoSave: config.autoSave ?? SkillSystem.DEFAULT_CONFIG.autoSave,
            performanceMonitoring: config.performanceMonitoring ?? SkillSystem.DEFAULT_CONFIG.performanceMonitoring,
            autoErrorRecovery: config.autoErrorRecovery ?? SkillSystem.DEFAULT_CONFIG.autoErrorRecovery
        };
    }

    /**
     * サブシステムを初期化する
     */
    private initializeSubsystems(): void {
        // スキル管理システム
        this.skillManager = new SkillManager();

        // 条件チェッカー
        this.conditionChecker = new SkillConditionChecker();

        // スキル実行システム
        this.skillExecutor = new SkillExecutor(
            this.scene,
            this.skillManager,
            this.conditionChecker,
            this.config.execution
        );

        // スキルUI
        this.skillUI = new SkillUI(
            this.scene,
            this.config.ui,
            this
        );

        // イベントリスナーを設定
        this.setupEventListeners();

        this.state.initialized = true;
        this.log('Subsystems initialized');
    }

    /**
     * イベントリスナーを設定する
     */
    private setupEventListeners(): void {
        // スキル実行システムのイベント
        this.skillExecutor.on('skill-executed', (data) => {
            this.handleSkillExecuted(data);
        });

        this.skillExecutor.on('skill-execution-error', (data) => {
            this.handleSkillExecutionError(data);
        });

        // スキルUIのイベント
        this.skillUI.on('skill-confirmed', (data) => {
            this.handleSkillConfirmed(data);
        });

        this.skillUI.on('skill-selection-cancelled', () => {
            this.handleSkillSelectionCancelled();
        });

        // 戦闘システム統合イベント
        this.skillExecutor.on('battle-system-update', (data) => {
            this.emit('battle-system-update', data);
        });

        this.skillExecutor.on('turn-system-update', (data) => {
            this.emit('turn-system-update', data);
        });
    }

    /**
     * 戦場状態を設定する
     * @param battlefieldState 戦場状態
     */
    setBattlefieldState(battlefieldState: any): void {
        this.battlefieldState = battlefieldState;
        this.log('Battlefield state set');
    }

    /**
     * スキルを使用する（メインフロー）
     * @param skillId スキルID
     * @param casterId 使用者ID
     * @param targetPosition 対象位置
     * @param skipUI UI選択をスキップするか
     * @returns 使用結果
     */
    async useSkill(
        skillId: string,
        casterId: string,
        targetPosition: Position,
        skipUI: boolean = false
    ): Promise<SkillUsageFlowResult> {
        this.flowStartTime = performance.now();

        try {
            this.log('Starting skill usage flow', {
                skillId,
                casterId,
                targetPosition,
                skipUI
            });

            // 既に実行中の場合はエラー
            if (this.state.isExecuting) {
                return {
                    success: false,
                    error: {
                        type: 'system_busy',
                        message: 'スキルシステムは既に実行中です',
                        phase: 'validation'
                    }
                };
            }

            // 状態を更新
            this.state.isExecuting = true;
            this.state.currentPhase = 'skill_selection';
            this.state.activeCaster = casterId;

            // スキルの存在チェック
            const skill = this.skillManager.getSkill(skillId);
            if (!skill) {
                return this.createErrorResult('skill_not_found', `スキル「${skillId}」が見つかりません`, 'validation');
            }

            this.state.selectedSkill = skill;
            this.state.targetPosition = targetPosition;

            // UIをスキップする場合は直接実行
            if (skipUI) {
                return await this.executeSkillDirectly(skill, casterId, targetPosition);
            }

            // UI選択フローを開始
            return await this.startSkillSelectionFlow(casterId);

        } catch (error) {
            this.log('Skill usage flow error', { error: error.message });
            return this.createErrorResult('unexpected_error', `予期しないエラー: ${error.message}`, 'unknown');
        } finally {
            this.state.isExecuting = false;
            this.state.currentPhase = 'idle';
        }
    }

    /**
     * 使用可能なスキルを取得する
     * @param casterId 使用者ID
     * @param filter フィルター条件（オプション）
     * @returns 使用可能なスキル配列
     */
    getAvailableSkills(casterId: string, filter?: SkillFilter): SkillMenuItem[] {
        this.log('Getting available skills', { casterId, filter });

        // キャラクターのスキルを取得
        const characterSkills = this.skillManager.getCharacterSkills(casterId);
        const characterSkillData = this.conditionChecker.getCharacterSkillData(casterId);

        const availableSkills: SkillMenuItem[] = [];

        for (const skill of characterSkills) {
            // フィルター条件をチェック
            if (filter && !this.matchesFilter(skill, filter)) {
                continue;
            }

            // 使用可能性をチェック
            const usability = this.conditionChecker.canUseSkill(
                skill,
                casterId,
                this.state.targetPosition || { x: 0, y: 0 }, // 仮の位置
                this.battlefieldState,
                characterSkillData
            );

            // スキルメニュー項目を作成
            const menuItem: SkillMenuItem = {
                skill,
                usability,
                displayText: this.createSkillDisplayText(skill, usability),
                enabled: usability.canUse,
                recommendation: this.calculateSkillRecommendation(skill, casterId, usability)
            };

            availableSkills.push(menuItem);
        }

        // 推奨度でソート
        availableSkills.sort((a, b) => {
            if (a.enabled !== b.enabled) {
                return a.enabled ? -1 : 1; // 使用可能なスキルを優先
            }
            return (b.recommendation || 0) - (a.recommendation || 0);
        });

        this.log('Available skills retrieved', {
            casterId,
            totalSkills: characterSkills.length,
            availableSkills: availableSkills.length,
            usableSkills: availableSkills.filter(s => s.enabled).length
        });

        return availableSkills;
    }

    /**
     * スキル選択フローを開始する
     */
    private async startSkillSelectionFlow(casterId: string): Promise<SkillUsageFlowResult> {
        this.selectionStartTime = performance.now();

        return new Promise((resolve) => {
            // 使用可能なスキルを取得
            const availableSkills = this.getAvailableSkills(casterId);

            if (availableSkills.length === 0) {
                resolve(this.createErrorResult('no_skills_available', '使用可能なスキルがありません', 'skill_selection'));
                return;
            }

            // スキル選択UIを表示
            this.skillUI.showSkillSelection(
                availableSkills,
                casterId,
                async (skill: Skill) => {
                    // スキルが選択された
                    const result = await this.handleSkillSelected(skill, casterId);
                    resolve(result);
                },
                () => {
                    // キャンセルされた
                    resolve(this.createCancelledResult());
                }
            );

            // 選択タイムアウト（オプション）
            if (this.config.execution.animationTimeout) {
                setTimeout(() => {
                    if (this.state.currentPhase === 'skill_selection') {
                        this.skillUI.hideSkillSelection();
                        resolve(this.createErrorResult('selection_timeout', 'スキル選択がタイムアウトしました', 'skill_selection'));
                    }
                }, this.config.execution.animationTimeout);
            }
        });
    }

    /**
     * スキルが選択された時の処理
     */
    private async handleSkillSelected(skill: Skill, casterId: string): Promise<SkillUsageFlowResult> {
        this.log('Skill selected', { skillId: skill.id, casterId });

        this.state.selectedSkill = skill;
        this.state.currentPhase = 'target_selection';

        // 対象位置が既に設定されている場合は直接実行
        if (this.state.targetPosition) {
            return await this.executeSkillDirectly(skill, casterId, this.state.targetPosition);
        }

        // 対象選択が必要な場合の処理（現在は簡略化）
        // 実際の実装では、対象選択UIを表示する
        const defaultTarget = { x: 0, y: 0 }; // 仮の対象位置
        return await this.executeSkillDirectly(skill, casterId, defaultTarget);
    }

    /**
     * スキルを直接実行する
     */
    private async executeSkillDirectly(
        skill: Skill,
        casterId: string,
        targetPosition: Position
    ): Promise<SkillUsageFlowResult> {
        this.executionStartTime = performance.now();
        this.state.currentPhase = 'execution';

        try {
            // 実行コンテキストを作成
            const context: SkillExecutionContext = {
                caster: casterId,
                skillId: skill.id,
                targetPosition,
                battlefieldState: this.battlefieldState,
                currentTurn: this.battlefieldState?.getCurrentTurn?.() || 0,
                executionTime: new Date()
            };

            // スキルを実行
            const result = await this.skillExecutor.executeSkill(context);

            // 結果を記録
            this.state.lastExecutionResult = result;

            // 成功結果を作成
            const flowResult: SkillUsageFlowResult = {
                success: result.success,
                result,
                flowStats: this.calculateFlowStats()
            };

            if (!result.success) {
                flowResult.error = {
                    type: result.error?.toString() || 'execution_failed',
                    message: result.errorMessage || 'スキル実行に失敗しました',
                    phase: 'execution'
                };
            }

            // 統計を更新
            this.updatePerformanceMetrics(flowResult);

            return flowResult;

        } catch (error) {
            this.log('Skill execution error', { error: error.message });
            return this.createErrorResult('execution_error', `実行エラー: ${error.message}`, 'execution');
        }
    }

    /**
     * スキル実行完了イベントハンドラー
     */
    private handleSkillExecuted(data: any): void {
        this.log('Skill executed event received', data);

        // UIを非表示
        this.skillUI.hideSkillSelection();

        // 状態をクリーンアップ
        this.state.currentPhase = 'cleanup';

        // イベントを転送
        this.emit('skill-executed', {
            ...data,
            systemState: this.getSystemState()
        });
    }

    /**
     * スキル実行エラーイベントハンドラー
     */
    private handleSkillExecutionError(data: any): void {
        this.log('Skill execution error event received', data);

        // エラー状態を設定
        this.state.errorState = {
            hasError: true,
            errorType: data.error?.name || 'unknown_error',
            errorMessage: data.error?.message || 'Unknown error occurred',
            timestamp: new Date()
        };

        // 自動回復を試行
        if (this.config.autoErrorRecovery) {
            this.attemptErrorRecovery(data);
        }

        // イベントを転送
        this.emit('skill-execution-error', {
            ...data,
            systemState: this.getSystemState()
        });
    }

    /**
     * スキル確定イベントハンドラー
     */
    private handleSkillConfirmed(data: any): void {
        this.log('Skill confirmed event received', data);
        // 実際の処理は handleSkillSelected で行われる
    }

    /**
     * スキル選択キャンセルイベントハンドラー
     */
    private handleSkillSelectionCancelled(): void {
        this.log('Skill selection cancelled');

        // 状態をリセット
        this.resetState();

        // イベントを発火
        this.emit('skill-selection-cancelled', {
            casterId: this.state.activeCaster,
            systemState: this.getSystemState()
        });
    }

    /**
     * フィルター条件に一致するかチェック
     */
    private matchesFilter(skill: Skill, filter: SkillFilter): boolean {
        if (filter.skillType && skill.skillType !== filter.skillType) {
            return false;
        }

        if (filter.targetType && skill.targetType !== filter.targetType) {
            return false;
        }

        if (filter.minLevel && skill.usageCondition.levelRequirement < filter.minLevel) {
            return false;
        }

        if (filter.maxLevel && skill.usageCondition.levelRequirement > filter.maxLevel) {
            return false;
        }

        if (filter.jobRequirement && skill.usageCondition.jobRequirement !== filter.jobRequirement) {
            return false;
        }

        return true;
    }

    /**
     * スキル表示テキストを作成
     */
    private createSkillDisplayText(skill: Skill, usability: ExtendedSkillUsabilityResult): string {
        let text = `${skill.name} (MP:${skill.usageCondition.mpCost})`;

        if (!usability.canUse) {
            text += ' [使用不可]';
        } else if (usability.remainingUses !== undefined && usability.remainingUses > 0) {
            text += ` [残り${usability.remainingUses}回]`;
        }

        return text;
    }

    /**
     * スキル推奨度を計算
     */
    private calculateSkillRecommendation(
        skill: Skill,
        casterId: string,
        usability: ExtendedSkillUsabilityResult
    ): number {
        if (!usability.canUse) {
            return 0;
        }

        let score = 50; // 基本スコア

        // スキル種別による調整
        switch (skill.skillType) {
            case 'attack':
                score += 20;
                break;
            case 'heal':
                score += 15;
                break;
            case 'buff':
                score += 10;
                break;
            case 'debuff':
                score += 10;
                break;
            case 'status':
                score += 5;
                break;
        }

        // MP効率による調整
        const mpEfficiency = skill.usageCondition.mpCost > 0 ? 100 / skill.usageCondition.mpCost : 100;
        score += Math.min(mpEfficiency, 30);

        // 使用回数制限による調整
        if (usability.remainingUses !== undefined) {
            if (usability.remainingUses <= 1) {
                score -= 20; // 最後の使用は慎重に
            } else if (usability.remainingUses <= 3) {
                score -= 10;
            }
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * エラー結果を作成
     */
    private createErrorResult(type: string, message: string, phase: string): SkillUsageFlowResult {
        return {
            success: false,
            error: {
                type,
                message,
                phase
            },
            flowStats: this.calculateFlowStats()
        };
    }

    /**
     * キャンセル結果を作成
     */
    private createCancelledResult(): SkillUsageFlowResult {
        return {
            success: false,
            error: {
                type: 'cancelled',
                message: 'スキル選択がキャンセルされました',
                phase: 'skill_selection'
            },
            flowStats: this.calculateFlowStats()
        };
    }

    /**
     * フロー統計を計算
     */
    private calculateFlowStats(): any {
        const currentTime = performance.now();
        return {
            totalTime: currentTime - this.flowStartTime,
            selectionTime: this.selectionStartTime > 0 ? this.executionStartTime - this.selectionStartTime : 0,
            executionTime: this.executionStartTime > 0 ? currentTime - this.executionStartTime : 0,
            animationTime: 0 // アニメーション時間は別途計測
        };
    }

    /**
     * パフォーマンスメトリクスを更新
     */
    private updatePerformanceMetrics(result: SkillUsageFlowResult): void {
        if (!this.config.performanceMonitoring) {
            return;
        }

        const stats = result.flowStats;
        if (stats) {
            this.performanceMetrics.set('avg_total_time',
                (this.performanceMetrics.get('avg_total_time') || 0) * 0.9 + stats.totalTime * 0.1);
            this.performanceMetrics.set('avg_execution_time',
                (this.performanceMetrics.get('avg_execution_time') || 0) * 0.9 + stats.executionTime * 0.1);
        }

        // 実行履歴に追加
        this.executionHistory.push(result);
        if (this.executionHistory.length > 100) {
            this.executionHistory.shift(); // 古い履歴を削除
        }
    }

    /**
     * エラー回復を試行
     */
    private attemptErrorRecovery(errorData: any): void {
        this.log('Attempting error recovery', errorData);

        // 基本的な状態リセット
        this.resetState();

        // UIをクリーンアップ
        this.skillUI.hideSkillSelection();
        this.skillUI.clearRangeDisplay();

        // エラー状態をクリア
        this.state.errorState = undefined;

        this.log('Error recovery completed');
    }

    /**
     * 状態をリセット
     */
    private resetState(): void {
        this.state.currentPhase = 'idle';
        this.state.activeCaster = undefined;
        this.state.selectedSkill = undefined;
        this.state.targetPosition = undefined;
        this.state.isExecuting = false;
    }

    /**
     * システム状態を取得
     */
    getSystemState(): SkillSystemState {
        return { ...this.state };
    }

    /**
     * パフォーマンスメトリクスを取得
     */
    getPerformanceMetrics(): Map<string, number> {
        return new Map(this.performanceMetrics);
    }

    /**
     * 実行履歴を取得
     */
    getExecutionHistory(limit?: number): SkillUsageFlowResult[] {
        if (limit) {
            return this.executionHistory.slice(-limit);
        }
        return [...this.executionHistory];
    }

    /**
     * スキル統計を取得
     */
    getSkillStatistics(skillId: string): SkillStatistics | null {
        return this.skillManager.getSkillStatistics(skillId);
    }

    /**
     * スキルを登録
     */
    registerSkill(skillData: SkillData): SkillManagerResult {
        return this.skillManager.registerSkill(skillData);
    }

    /**
     * キャラクターにスキルを習得させる
     */
    learnSkill(characterId: string, skillId: string, characterData: any): any {
        return this.skillManager.learnSkill(characterId, skillId, characterData);
    }

    /**
     * ログ出力
     */
    private log(message: string, data?: any): void {
        if (this.config.debugMode) {
            console.log(`[SkillSystem] ${message}`, data || '');
        }
    }

    /**
     * システムをリセット
     */
    reset(): void {
        this.resetState();
        this.skillManager.clear();
        this.conditionChecker.clear();
        this.skillExecutor.reset();
        this.skillUI.hideSkillSelection();
        this.skillUI.clearRangeDisplay();
        this.performanceMetrics.clear();
        this.executionHistory.length = 0;

        this.log('SkillSystem reset');
    }

    /**
     * リソースを破棄
     */
    destroy(): void {
        this.reset();
        this.skillExecutor.destroy();
        this.removeAllListeners();

        this.log('SkillSystem destroyed');
    }
}