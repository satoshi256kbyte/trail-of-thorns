/**
 * AI システムの型定義
 * 敵キャラクターの自動行動制御に関する型とインターフェースを定義
 */

import { Unit } from './gameplay';
import { Position } from './movement';
import { Skill } from './skill';

// ========================================
// 列挙型定義
// ========================================

/**
 * AI行動の種類
 */
export enum ActionType {
    MOVE = 'move',
    ATTACK = 'attack',
    SKILL = 'skill',
    WAIT = 'wait',
    DEFEND = 'defend'
}

/**
 * AI行動の種類（別名）
 */
export const AIActionType = ActionType;

/**
 * 行動決定木の実行結果
 */
export enum BehaviorResult {
    SUCCESS = 'success',
    FAILURE = 'failure',
    RUNNING = 'running'
}

/**
 * AIエラーの種類
 */
export enum AIErrorType {
    THINKING_TIMEOUT = 'thinking_timeout',
    INVALID_ACTION = 'invalid_action',
    DATA_CORRUPTION = 'data_corruption',
    MEMORY_SHORTAGE = 'memory_shortage',
    UNEXPECTED_ERROR = 'unexpected_error'
}

/**
 * AI性格タイプ
 */
export enum AIPersonalityType {
    AGGRESSIVE = 'aggressive',
    DEFENSIVE = 'defensive',
    SUPPORT = 'support',
    TACTICAL = 'tactical',
    BALANCED = 'balanced'
}

/**
 * 難易度レベル
 */
export enum DifficultyLevel {
    EASY = 1,
    NORMAL = 2,
    HARD = 3,
    EXPERT = 4,
    MASTER = 5
}

// ========================================
// 基本インターフェース
// ========================================

/**
 * AI行動データ
 */
export interface AIAction {
    /** 行動の種類 */
    type: ActionType;
    /** 行動を実行するキャラクター（オプション） */
    character?: Unit;
    /** 攻撃・スキル対象（オプション） */
    target?: Unit;
    /** 移動先座標（オプション） */
    position?: Position;
    /** 移動先座標（別名、後方互換性のため） */
    targetPosition?: Position;
    /** 使用するスキル（オプション） */
    skill?: Skill;
    /** 使用するスキルID（オプション） */
    skillId?: string;
    /** 行動の優先度（0-100） */
    priority: number;
    /** 評価スコア（オプション） */
    evaluationScore?: number;
    /** デバッグ用の理由説明 */
    reasoning?: string;
    /** 実行予想時間（ミリ秒） */
    estimatedExecutionTime?: number;
}

/**
 * AI思考コンテキスト
 */
export interface AIContext {
    /** 現在行動中のキャラクター */
    currentCharacter: Unit;
    /** 現在のユニット（別名） */
    currentUnit?: Unit;
    /** ゲーム状態 */
    gameState: any; // GameStateの型は他のファイルで定義
    /** 視界内の敵キャラクター */
    visibleEnemies: Unit[];
    /** 視界内の味方キャラクター */
    visibleAllies: Unit[];
    /** NPCキャラクター */
    npcs: Unit[];
    /** 使用可能なスキル */
    availableSkills: Skill[];
    /** 地形データ */
    terrainData: any; // TerrainDataの型は他のファイルで定義
    /** マップデータ */
    mapData?: any; // MapDataの型は他のファイルで定義
    /** 現在のターン数 */
    turnNumber: number;
    /** 難易度設定 */
    difficultySettings: DifficultySettings;
    /** 前回の行動履歴 */
    actionHistory: AIAction[];
}

/**
 * AI性格設定
 */
export interface AIPersonality {
    /** 性格タイプ */
    type: AIPersonalityType;
    /** 攻撃性（0-1） */
    aggressiveness: number;
    /** 防御性（0-1） */
    defensiveness: number;
    /** 支援性（0-1） */
    supportiveness: number;
    /** 戦術性（0-1） */
    tacticalness: number;
    /** リスク許容度（0-1） */
    riskTolerance: number;
    /** 行動修正値を取得 */
    getActionModifier(actionType: ActionType): number;
    /** リスクを取るべきかの判定 */
    shouldTakeRisk(riskLevel: number): boolean;
    /** ターゲット優先度修正値を取得 */
    getPriorityModifier(target: Unit): number;
}

/**
 * 難易度設定
 */
export interface DifficultySettings {
    /** 思考深度（1-5） */
    thinkingDepth: number;
    /** ランダム要素（0-1） */
    randomnessFactor: number;
    /** ミス確率（0-1） */
    mistakeProbability: number;
    /** 反応時間（ミリ秒） */
    reactionTime: number;
    /** スキル使用頻度（0-1） */
    skillUsageFrequency: number;
    /** 思考時間制限（ミリ秒） */
    thinkingTimeLimit: number;
}

/**
 * AI評価メトリクス
 */
export interface AIEvaluationMetrics {
    /** 位置的優位性（0-1） */
    positionalAdvantage: number;
    /** 脅威レベル（0-1） */
    threatLevel: number;
    /** 地形ボーナス（0-1） */
    terrainBonus: number;
    /** 味方との連携度（0-1） */
    teamworkScore: number;
    /** 目標達成度（0-1） */
    objectiveScore: number;
}

/**
 * AI思考状態
 */
export interface AIThinkingState {
    /** 思考開始時刻 */
    startTime: number;
    /** 現在の思考段階 */
    currentPhase: 'analyzing' | 'evaluating' | 'deciding' | 'validating';
    /** 候補行動リスト */
    candidateActions: AIAction[];
    /** 現在の最良行動 */
    bestAction?: AIAction;
    /** 思考進捗（0-1） */
    progress: number;
    /** デバッグ情報 */
    debugInfo: string[];
}

/**
 * AIパフォーマンス統計
 */
export interface AIPerformanceStats {
    /** 平均思考時間（ミリ秒） */
    averageThinkingTime: number;
    /** 最大思考時間（ミリ秒） */
    maxThinkingTime: number;
    /** 思考タイムアウト回数 */
    timeoutCount: number;
    /** 総行動回数 */
    totalActions: number;
    /** 成功行動回数 */
    successfulActions: number;
    /** エラー発生回数 */
    errorCount: number;
    /** メモリ使用量（バイト） */
    memoryUsage: number;
}

// ========================================
// 行動決定木関連
// ========================================

/**
 * 行動決定木のノード
 */
export interface BehaviorNode {
    /** ノードID */
    id: string;
    /** ノード名 */
    name: string;
    /** ノードの実行 */
    execute(context: AIContext): BehaviorResult;
    /** 子ノード */
    children?: BehaviorNode[];
    /** 実行条件 */
    condition?: (context: AIContext) => boolean;
}

/**
 * 行動評価器
 */
export interface ActionEvaluator {
    /** 移動行動の評価 */
    evaluateMove(from: Position, to: Position, context: AIContext): number;
    /** 攻撃行動の評価 */
    evaluateAttack(attacker: Unit, target: Unit, context: AIContext): number;
    /** スキル使用の評価 */
    evaluateSkillUse(skill: Skill, targets: Unit[], context: AIContext): number;
    /** 待機行動の評価 */
    evaluateWait(context: AIContext): number;
    /** 位置的優位性の評価 */
    evaluatePositionalAdvantage(position: Position, context: AIContext): number;
    /** 地形ボーナスの評価 */
    evaluateTerrainBonus(position: Position, context: AIContext): number;
    /** 脅威レベルの評価 */
    evaluateThreatLevel(position: Position, context: AIContext): number;
}

// ========================================
// エラーハンドリング関連
// ========================================

/**
 * AIエラー情報
 */
export interface AIErrorInfo {
    /** エラーの種類 */
    type: AIError;
    /** エラーメッセージ */
    message: string;
    /** エラー発生時刻 */
    timestamp: number;
    /** エラー発生キャラクター */
    character: Unit;
    /** エラー発生時のコンテキスト */
    context?: Partial<AIContext>;
    /** スタックトレース */
    stackTrace?: string;
}

/**
 * AI回復行動
 */
export interface AIRecoveryAction {
    /** 回復行動の種類 */
    type: 'fallback' | 'retry' | 'reset';
    /** 実行する行動 */
    action: AIAction;
    /** 回復の説明 */
    description: string;
}

// ========================================
// デバッグ・開発支援関連
// ========================================

/**
 * AIデバッグ情報
 */
export interface AIDebugInfo {
    /** キャラクターID */
    characterId: string;
    /** 思考過程のログ */
    thinkingLog: string[];
    /** 候補行動と評価値 */
    actionEvaluations: Array<{
        action: AIAction;
        score: number;
        reasoning: string;
    }>;
    /** パフォーマンス情報 */
    performance: {
        thinkingTime: number;
        memoryUsage: number;
        cpuUsage: number;
    };
    /** 視覚化データ */
    visualization?: {
        movementRange: Position[];
        attackRange: Position[];
        threatMap: Array<{ position: Position; threat: number }>;
    };
}

/**
 * AI設定オプション
 */
export interface AIConfigOptions {
    /** デバッグモードの有効化 */
    debugMode: boolean;
    /** ログレベル */
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    /** 思考時間制限（ミリ秒） */
    thinkingTimeLimit: number;
    /** 並列処理の有効化 */
    enableParallelProcessing: boolean;
    /** キャッシュの有効化 */
    enableCaching: boolean;
    /** 統計収集の有効化 */
    enableStatistics: boolean;
}

// ========================================
// 型ガード関数
// ========================================

/**
 * AIActionの型ガード
 */
export function isAIAction(obj: any): obj is AIAction {
    return (
        obj &&
        typeof obj === 'object' &&
        Object.values(ActionType).includes(obj.type) &&
        obj.character &&
        typeof obj.priority === 'number' &&
        typeof obj.evaluationScore === 'number'
    );
}

/**
 * AIContextの型ガード
 */
export function isAIContext(obj: any): obj is AIContext {
    return (
        obj &&
        typeof obj === 'object' &&
        obj.currentCharacter &&
        Array.isArray(obj.visibleEnemies) &&
        Array.isArray(obj.visibleAllies) &&
        Array.isArray(obj.npcs) &&
        typeof obj.turnNumber === 'number'
    );
}

/**
 * AIPersonalityの型ガード
 */
export function isAIPersonality(obj: any): obj is AIPersonality {
    return (
        obj &&
        typeof obj === 'object' &&
        Object.values(AIPersonalityType).includes(obj.type) &&
        typeof obj.aggressiveness === 'number' &&
        typeof obj.defensiveness === 'number' &&
        typeof obj.supportiveness === 'number' &&
        typeof obj.tacticalness === 'number' &&
        typeof obj.riskTolerance === 'number'
    );
}

/**
 * DifficultySettingsの型ガード
 */
export function isDifficultySettings(obj: any): obj is DifficultySettings {
    return (
        obj &&
        typeof obj === 'object' &&
        Object.values(DifficultyLevel).includes(obj.level) &&
        typeof obj.thinkingDepth === 'number' &&
        typeof obj.randomnessFactor === 'number' &&
        typeof obj.mistakeProbability === 'number' &&
        typeof obj.reactionTime === 'number' &&
        typeof obj.skillUsageFrequency === 'number' &&
        typeof obj.thinkingTimeLimit === 'number'
    );
}

// ========================================
// 追加の型定義（AIControllerとの互換性のため）
// ========================================

/**
 * AIコントローラー設定
 */
export interface AIControllerConfig {
    /** 思考時間制限（ミリ秒） */
    thinkingTimeLimit: number;
    /** ランダム要素の強さ */
    randomFactor: number;
    /** NPC攻撃優先度の倍率 */
    npcPriorityMultiplier: number;
    /** AIログの有効化 */
    enableAILogging: boolean;
}

/**
 * AIシステム統合インターフェース
 */
export interface AISystemIntegration {
    /** 戦闘システム */
    battleSystem?: {
        canAttack: (attacker: Unit, target: Unit) => boolean;
        calculateDamage: (attacker: Unit, target: Unit) => number;
    };
    /** 移動システム */
    movementSystem?: {
        calculateMovementRange: (unit: Unit, mapData: any) => Position[];
        canMoveTo: (unit: Unit, position: Position, mapData: any) => boolean;
    };
    /** スキルシステム */
    skillSystem?: {
        getAvailableSkills: (unit: Unit) => string[];
        canUseSkill: (unit: Unit, skillId: string) => boolean;
    };
    /** 仲間化システム */
    recruitmentSystem?: {
        isNPC: (unit: Unit) => boolean;
    };
}

/**
 * AIパフォーマンスメトリクス
 */
export interface AIPerformanceMetrics {
    /** 平均思考時間 */
    averageThinkingTime: number;
    /** 最大思考時間 */
    maxThinkingTime: number;
    /** 最小思考時間 */
    minThinkingTime: number;
    /** 総決定回数 */
    totalDecisions: number;
    /** タイムアウト回数 */
    timeoutCount: number;
    /** エラー回数 */
    errorCount: number;
    /** メモリ使用量 */
    memoryUsage: number;
    /** 行動タイプ別分布 */
    actionTypeDistribution: Record<ActionType, number>;
}



// ========================================
// AIシステム統合関連
// ========================================

/**
 * AIシステムマネージャー設定
 */
export interface AISystemManagerConfig {
    /** 思考時間制限（ミリ秒） */
    thinkingTimeLimit: number;
    /** デバッグログ有効化 */
    enableDebugLogging: boolean;
    /** 視覚的フィードバック有効化 */
    enableVisualFeedback: boolean;
    /** ランダム要素 */
    randomFactor: number;
    /** NPC攻撃優先度倍率 */
    npcPriorityMultiplier: number;
    /** デフォルト難易度設定 */
    defaultDifficulty?: Partial<DifficultySettings>;
}

/**
 * AI実行結果
 */
export interface AIExecutionResult {
    /** 実行成功フラグ */
    success: boolean;
    /** 結果メッセージ */
    message: string;
    /** 実行された行動 */
    action: AIAction;
    /** 実行時間（ミリ秒） */
    executionTime?: number;
    /** エラー情報 */
    error?: AIErrorInfo;
}

/**
 * AI思考状態（簡易版）
 */
export interface AIThinkingState {
    /** 思考中フラグ */
    isThinking: boolean;
    /** 現在思考中のユニット */
    currentUnit?: Unit;
    /** 思考時間（ミリ秒） */
    thinkingTime: number;
}

/**
 * AIコントローラー設定
 */
export interface AIControllerConfig {
    /** 思考時間制限（ミリ秒） */
    thinkingTimeLimit: number;
    /** AIログ有効化 */
    enableAILogging: boolean;
    /** ランダム要素 */
    randomFactor: number;
    /** NPC攻撃優先度倍率 */
    npcPriorityMultiplier: number;
}

/**
 * AIシステム統合インターフェース
 */
export interface AISystemIntegration {
    /** 移動システム */
    movementSystem?: any;
    /** 戦闘システム */
    battleSystem?: any;
    /** スキルシステム */
    skillSystem?: any;
    /** 仲間化システム */
    recruitmentSystem?: any;
}

/**
 * AIパフォーマンスメトリクス
 */
export interface AIPerformanceMetrics {
    /** 平均思考時間 */
    averageThinkingTime: number;
    /** 最大思考時間 */
    maxThinkingTime: number;
    /** 最小思考時間 */
    minThinkingTime: number;
    /** 総決定回数 */
    totalDecisions: number;
    /** タイムアウト回数 */
    timeoutCount: number;
    /** エラー回数 */
    errorCount: number;
    /** メモリ使用量 */
    memoryUsage: number;
    /** 行動タイプ別分布 */
    actionTypeDistribution: Record<ActionType, number>;
}

/**
 * AI行動ターゲット
 */
export interface AITarget {
    /** ターゲットユニット */
    unit?: Unit;
    /** ターゲット位置 */
    position?: Position;
    /** ターゲット範囲 */
    area?: Position[];
}

/**
 * AI行動タイプ（別名）
 */
export type AIBehaviorType = AIPersonalityType;

// ========================================
// エラークラス
// ========================================

/**
 * AI基底エラークラス
 */
export abstract class AIError extends Error {
    public readonly type: AIErrorType;
    public readonly timestamp: number;

    constructor(type: AIErrorType, message: string) {
        super(message);
        this.type = type;
        this.timestamp = Date.now();
        this.name = 'AIError';
    }

    /** 回復行動を取得 */
    abstract getRecoveryAction(): AIAction;
}

/**
 * AI思考タイムアウトエラー
 */
export class AIThinkingTimeoutError extends AIError {
    constructor(message: string) {
        super(AIErrorType.THINKING_TIMEOUT, message);
        this.name = 'AIThinkingTimeoutError';
    }

    getRecoveryAction(): AIAction {
        return {
            type: ActionType.WAIT,
            priority: 0,
            reasoning: 'Thinking timeout - using safe fallback action',
        };
    }
}

/**
 * 無効な行動エラー
 */
export class InvalidActionError extends AIError {
    constructor(message: string) {
        super(AIErrorType.INVALID_ACTION, message);
        this.name = 'InvalidActionError';
    }

    getRecoveryAction(): AIAction {
        return {
            type: ActionType.WAIT,
            priority: 0,
            reasoning: 'Invalid action - using safe fallback',
        };
    }
}

/**
 * AIデータ破損エラー
 */
export class AIDataCorruptionError extends AIError {
    constructor(message: string) {
        super(AIErrorType.DATA_CORRUPTION, message);
        this.name = 'AIDataCorruptionError';
    }

    getRecoveryAction(): AIAction {
        return {
            type: ActionType.WAIT,
            priority: 0,
            reasoning: 'Data corruption - using basic fallback pattern',
        };
    }
}