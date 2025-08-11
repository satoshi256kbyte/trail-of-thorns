import * as Phaser from 'phaser';
import { TerrainCost, MovementAnimationConfig } from '../types/movement';
import { BattleAnimationConfig } from '../types/battle';
import { RecruitmentAnimationConfig } from '../types/recruitment';
import { DifficultySettings } from '../types/ai';

/**
 * Movement system configuration options
 */
export interface MovementSystemConfig {
    /** Enable visual feedback for movement range and paths */
    enableVisualFeedback: boolean;
    /** Enable path preview when hovering over destinations */
    enablePathPreview: boolean;
    /** Enable smooth movement animations */
    enableMovementAnimation: boolean;
    /** Enable debug visualization for movement calculations */
    enableMovementDebug: boolean;
    /** Show movement range calculations in debug mode */
    showMovementRangeDebug: boolean;
    /** Show pathfinding algorithm steps in debug mode */
    showPathfindingDebug: boolean;
    /** Show movement cost calculations in debug mode */
    showMovementCostDebug: boolean;
    /** Terrain cost configuration */
    terrainCosts: TerrainCost;
    /** Movement animation configuration */
    animationConfig: MovementAnimationConfig;
    /** Debug visualization colors */
    debugColors: {
        movementRange: number;
        pathfinding: number;
        movementCost: number;
        blockedTiles: number;
        alternativePaths: number;
    };
}

/**
 * Recruitment system configuration options
 */
export interface RecruitmentSystemConfig {
    /** Enable recruitment system */
    enableRecruitmentSystem: boolean;
    /** Enable recruitment condition display */
    enableConditionDisplay: boolean;
    /** Enable recruitment progress indicators */
    enableProgressIndicators: boolean;
    /** Enable NPC state visual indicators */
    enableNPCIndicators: boolean;
    /** Enable recruitment animations */
    enableRecruitmentAnimations: boolean;
    /** Enable recruitment debug visualization */
    enableRecruitmentDebug: boolean;
    /** Show recruitment condition checks in debug mode */
    showConditionCheckDebug: boolean;
    /** Show NPC state management debug info */
    showNPCStateDebug: boolean;
    /** Show recruitment statistics */
    showRecruitmentStatistics: boolean;
    /** Enable detailed recruitment logging */
    enableDetailedLogging: boolean;
    /** Recruitment animation configuration */
    animationConfig: RecruitmentAnimationConfig;
    /** Recruitment balance settings */
    balanceSettings: {
        /** Default NPC survival bonus (affects AI targeting) */
        npcSurvivalBonus: number;
        /** Recruitment condition display duration (ms) */
        conditionDisplayDuration: number;
        /** NPC indicator fade duration (ms) */
        npcIndicatorFadeDuration: number;
        /** Recruitment success celebration duration (ms) */
        successCelebrationDuration: number;
    };
    /** Debug visualization colors */
    debugColors: {
        recruitableTarget: number;
        conditionMet: number;
        conditionNotMet: number;
        npcState: number;
        recruitmentSuccess: number;
        recruitmentFailure: number;
    };
    /** Console command settings */
    consoleCommands: {
        /** Enable recruitment console commands */
        enableCommands: boolean;
        /** Command prefix for recruitment commands */
        commandPrefix: string;
        /** Enable recruitment simulation commands */
        enableSimulation: boolean;
        /** Enable balance testing commands */
        enableBalanceTesting: boolean;
    };
}

/**
 * AI system configuration options
 */
export interface AISystemConfig {
    /** Enable AI system */
    enableAISystem: boolean;
    /** Enable AI debug visualization */
    enableAIDebug: boolean;
    /** Show AI thinking process in debug mode */
    showThinkingDebug: boolean;
    /** Show AI action evaluation in debug mode */
    showActionEvaluationDebug: boolean;
    /** Show AI behavior tree execution in debug mode */
    showBehaviorTreeDebug: boolean;
    /** Show AI performance metrics */
    showPerformanceMetrics: boolean;
    /** Enable detailed AI logging */
    enableDetailedLogging: boolean;
    /** AI difficulty settings */
    difficultySettings: DifficultySettings;
    /** AI performance settings */
    performanceSettings: {
        /** Maximum thinking time per AI (ms) */
        maxThinkingTime: number;
        /** Maximum memory usage per AI (MB) */
        maxMemoryUsage: number;
        /** Enable AI action caching */
        enableActionCaching: boolean;
        /** Cache size limit */
        cacheSize: number;
        /** Enable parallel AI processing */
        enableParallelProcessing: boolean;
        /** Maximum concurrent AI processes */
        maxConcurrentProcesses: number;
    };
    /** AI balance settings */
    balanceSettings: {
        /** Global AI intelligence multiplier */
        globalIntelligenceMultiplier: number;
        /** AI mistake probability (0-1) */
        mistakeProbability: number;
        /** AI reaction delay (ms) */
        reactionDelay: number;
        /** NPC protection priority multiplier */
        npcProtectionPriority: number;
        /** Skill usage frequency (0-1) */
        skillUsageFrequency: number;
        /** Aggressive behavior weight */
        aggressiveBehaviorWeight: number;
        /** Defensive behavior weight */
        defensiveBehaviorWeight: number;
        /** Support behavior weight */
        supportBehaviorWeight: number;
        /** Tactical behavior weight */
        tacticalBehaviorWeight: number;
    };
    /** Debug visualization colors */
    debugColors: {
        aiThinking: number;
        actionEvaluation: number;
        behaviorTree: number;
        pathfinding: number;
        targetSelection: number;
        skillUsage: number;
        npcProtection: number;
        performanceWarning: number;
        performanceError: number;
    };
    /** Console command settings */
    consoleCommands: {
        /** Enable AI console commands */
        enableCommands: boolean;
        /** Command prefix for AI commands */
        commandPrefix: string;
        /** Enable AI testing commands */
        enableTesting: boolean;
        /** Enable AI simulation commands */
        enableSimulation: boolean;
        /** Enable balance adjustment commands */
        enableBalanceAdjustment: boolean;
    };
    /** AI testing configuration */
    testingConfig: {
        /** Enable AI testing mode */
        enableTestingMode: boolean;
        /** Auto-execute AI actions in testing mode */
        autoExecuteActions: boolean;
        /** Log all AI decisions */
        logAllDecisions: boolean;
        /** Generate AI statistics */
        generateStatistics: boolean;
        /** Test AI behavior patterns */
        testBehaviorPatterns: boolean;
        /** Enable AI vs AI simulation */
        enableAIvsAISimulation: boolean;
    };
    /** AI statistics collection settings */
    statisticsConfig: {
        /** Enable statistics collection */
        enableStatistics: boolean;
        /** Statistics collection interval (ms) */
        collectionInterval: number;
        /** Maximum statistics history size */
        maxHistorySize: number;
        /** Enable performance tracking */
        enablePerformanceTracking: boolean;
        /** Enable decision tracking */
        enableDecisionTracking: boolean;
        /** Enable success rate tracking */
        enableSuccessRateTracking: boolean;
    };
}

/**
 * Skill system configuration options
 */
export interface SkillSystemConfig {
    /** Enable skill system */
    enableSkillSystem: boolean;
    /** Enable skill animations */
    enableSkillAnimations: boolean;
    /** Enable skill sound effects */
    enableSkillSounds: boolean;
    /** Enable skill debug visualization */
    enableSkillDebug: boolean;
    /** Show skill condition checks in debug mode */
    showConditionCheckDebug: boolean;
    /** Show skill execution details in debug mode */
    showExecutionDebug: boolean;
    /** Show skill effect calculations in debug mode */
    showEffectCalculationDebug: boolean;
    /** Show skill statistics */
    showSkillStatistics: boolean;
    /** Enable detailed skill logging */
    enableDetailedLogging: boolean;
    /** Skill animation configuration */
    animationConfig: {
        /** Cast animation duration (ms) */
        castAnimationDuration: number;
        /** Effect animation duration (ms) */
        effectAnimationDuration: number;
        /** Hit animation duration (ms) */
        hitAnimationDuration: number;
        /** Skill UI display duration (ms) */
        skillUIDisplayDuration: number;
        /** Animation speed multiplier */
        animationSpeed: number;
        /** Enable particle effects */
        enableParticleEffects: boolean;
        /** Enable screen effects */
        enableScreenEffects: boolean;
    };
    /** Skill balance settings */
    balanceSettings: {
        /** Global skill damage multiplier */
        globalSkillDamageMultiplier: number;
        /** Global skill healing multiplier */
        globalSkillHealingMultiplier: number;
        /** Global MP cost multiplier */
        globalMPCostMultiplier: number;
        /** Global cooldown multiplier */
        globalCooldownMultiplier: number;
        /** Skill critical hit chance bonus */
        skillCriticalChanceBonus: number;
        /** Maximum skill usage per turn */
        maxSkillUsagePerTurn: number;
    };
    /** Debug visualization colors */
    debugColors: {
        skillRange: number;
        skillAreaOfEffect: number;
        validTargets: number;
        invalidTargets: number;
        skillExecution: number;
        skillSuccess: number;
        skillFailure: number;
        mpCost: number;
        cooldown: number;
    };
    /** Console command settings */
    consoleCommands: {
        /** Enable skill console commands */
        enableCommands: boolean;
        /** Command prefix for skill commands */
        commandPrefix: string;
        /** Enable skill testing commands */
        enableTesting: boolean;
        /** Enable balance adjustment commands */
        enableBalanceAdjustment: boolean;
        /** Enable skill simulation commands */
        enableSimulation: boolean;
    };
    /** Skill testing configuration */
    testingConfig: {
        /** Enable skill testing mode */
        enableTestingMode: boolean;
        /** Auto-execute skills in testing mode */
        autoExecuteSkills: boolean;
        /** Log all skill executions */
        logAllExecutions: boolean;
        /** Generate skill statistics */
        generateStatistics: boolean;
        /** Test skill combinations */
        testSkillCombinations: boolean;
    };
}

/**
 * Battle system configuration options
 */
export interface BattleSystemConfig {
    /** Enable battle animations */
    enableBattleAnimations: boolean;
    /** Enable battle sound effects */
    enableBattleSounds: boolean;
    /** Enable battle debug visualization */
    enableBattleDebug: boolean;
    /** Show damage calculations in debug mode */
    showDamageCalculationDebug: boolean;
    /** Show attack range calculations in debug mode */
    showAttackRangeDebug: boolean;
    /** Show target selection debug info */
    showTargetSelectionDebug: boolean;
    /** Show battle statistics */
    showBattleStatistics: boolean;
    /** Battle animation configuration */
    animationConfig: BattleAnimationConfig;
    /** Damage calculation modifiers */
    damageModifiers: {
        /** Global damage multiplier */
        globalDamageMultiplier: number;
        /** Critical hit damage multiplier */
        criticalDamageMultiplier: number;
        /** Minimum damage guarantee */
        minimumDamage: number;
        /** Maximum damage cap */
        maximumDamage: number;
    };
    /** Battle balance settings */
    balanceSettings: {
        /** Base critical hit chance */
        baseCriticalChance: number;
        /** Base evasion chance */
        baseEvasionChance: number;
        /** Experience gain multiplier */
        experienceMultiplier: number;
        /** Weapon durability loss rate */
        durabilityLossRate: number;
    };
    /** Debug visualization colors */
    debugColors: {
        attackRange: number;
        validTargets: number;
        invalidTargets: number;
        damagePreview: number;
        criticalHit: number;
        missedAttack: number;
    };
}

/**
 * ゲーム設定の検証用インターフェース
 */
export interface IGameConfigValidation {
    readonly GAME_WIDTH: number;
    readonly GAME_HEIGHT: number;
    readonly BACKGROUND_COLOR: string;
    readonly TARGET_FPS: number;
    readonly PHYSICS_DEBUG: boolean;
    readonly MOVEMENT_SYSTEM: MovementSystemConfig;
    readonly BATTLE_SYSTEM: BattleSystemConfig;
    readonly RECRUITMENT_SYSTEM: RecruitmentSystemConfig;
    readonly SKILL_SYSTEM: SkillSystemConfig;
    readonly AI_SYSTEM: AISystemConfig;
}

/**
 * ゲーム設定の型定義
 */
export interface IGameConfig extends IGameConfigValidation {
    getConfig(): Phaser.Types.Core.GameConfig;
    validateConfig(): boolean;
    getMovementSystemConfig(): MovementSystemConfig;
    updateMovementSystemConfig(config: Partial<MovementSystemConfig>): void;
    getBattleSystemConfig(): BattleSystemConfig;
    updateBattleSystemConfig(config: Partial<BattleSystemConfig>): void;
    getRecruitmentSystemConfig(): RecruitmentSystemConfig;
    updateRecruitmentSystemConfig(config: Partial<RecruitmentSystemConfig>): void;
    getSkillSystemConfig(): SkillSystemConfig;
    updateSkillSystemConfig(config: Partial<SkillSystemConfig>): void;
    getAISystemConfig(): AISystemConfig;
    updateAISystemConfig(config: Partial<AISystemConfig>): void;
}

/**
 * TypeScript型付きGameConfigクラス
 * ゲームの基本設定を管理し、Phaserに適切な設定を提供する
 */
export class GameConfig implements IGameConfig {
    // 静的設定定数
    public static readonly GAME_WIDTH = 1920;
    public static readonly GAME_HEIGHT = 1080;
    public static readonly BACKGROUND_COLOR = '#2c3e50';
    public static readonly TARGET_FPS = 60;
    public static readonly PHYSICS_DEBUG = false;

    // Movement system configuration
    public static readonly MOVEMENT_SYSTEM: MovementSystemConfig = {
        enableVisualFeedback: true,
        enablePathPreview: true,
        enableMovementAnimation: true,
        enableMovementDebug: process.env.NODE_ENV === 'development',
        showMovementRangeDebug: false,
        showPathfindingDebug: false,
        showMovementCostDebug: false,
        terrainCosts: {
            grass: { movementCost: 1, isPassable: true },
            forest: { movementCost: 2, isPassable: true },
            mountain: { movementCost: 3, isPassable: true },
            water: { movementCost: 999, isPassable: false },
            wall: { movementCost: 999, isPassable: false },
            road: { movementCost: 0.5, isPassable: true },
            bridge: { movementCost: 1, isPassable: true },
        },
        animationConfig: {
            moveSpeed: 200, // pixels per second
            turnSpeed: Math.PI * 2, // radians per second (full rotation per second)
            easing: 'Power2',
            stepDelay: 100, // milliseconds between tile movements
        },
        debugColors: {
            movementRange: 0x00ff00,
            pathfinding: 0xff0000,
            movementCost: 0x0000ff,
            blockedTiles: 0xff00ff,
            alternativePaths: 0xffff00,
        },
    };

    // Recruitment system configuration
    public static readonly RECRUITMENT_SYSTEM: RecruitmentSystemConfig = {
        enableRecruitmentSystem: true,
        enableConditionDisplay: true,
        enableProgressIndicators: true,
        enableNPCIndicators: true,
        enableRecruitmentAnimations: true,
        enableRecruitmentDebug: process.env.NODE_ENV === 'development',
        showConditionCheckDebug: false,
        showNPCStateDebug: false,
        showRecruitmentStatistics: false,
        enableDetailedLogging: process.env.NODE_ENV === 'development',
        animationConfig: {
            conditionDisplayDuration: 2000,
            npcConversionDuration: 1500,
            recruitmentSuccessDuration: 3000,
            recruitmentFailureDuration: 2000,
            progressUpdateDuration: 500,
            enableParticleEffects: true,
            enableScreenEffects: true,
            animationSpeed: 1.0,
        },
        balanceSettings: {
            npcSurvivalBonus: 100,
            conditionDisplayDuration: 3000,
            npcIndicatorFadeDuration: 1000,
            successCelebrationDuration: 4000,
        },
        debugColors: {
            recruitableTarget: 0x00ff88,
            conditionMet: 0x44ff44,
            conditionNotMet: 0xff4444,
            npcState: 0x8844ff,
            recruitmentSuccess: 0x44ff88,
            recruitmentFailure: 0xff8844,
        },
        consoleCommands: {
            enableCommands: process.env.NODE_ENV === 'development',
            commandPrefix: 'recruitment',
            enableSimulation: true,
            enableBalanceTesting: true,
        },
    };

    // Battle system configuration
    public static readonly BATTLE_SYSTEM: BattleSystemConfig = {
        enableBattleAnimations: true,
        enableBattleSounds: true,
        enableBattleDebug: process.env.NODE_ENV === 'development',
        showDamageCalculationDebug: false,
        showAttackRangeDebug: false,
        showTargetSelectionDebug: false,
        showBattleStatistics: false,
        animationConfig: {
            attackAnimationDuration: 800,
            damageEffectDuration: 600,
            hpBarAnimationDuration: 400,
            defeatAnimationDuration: 1000,
            effectDisplayDuration: 300,
            enableParticleEffects: true,
            enableScreenShake: true,
            animationSpeed: 1.0,
        },
        damageModifiers: {
            globalDamageMultiplier: 1.0,
            criticalDamageMultiplier: 1.5,
            minimumDamage: 1,
            maximumDamage: 9999,
        },
        balanceSettings: {
            baseCriticalChance: 5,
            baseEvasionChance: 5,
            experienceMultiplier: 1.0,
            durabilityLossRate: 1.0,
        },
        debugColors: {
            attackRange: 0xff4444,
            validTargets: 0x44ff44,
            invalidTargets: 0x888888,
            damagePreview: 0xffff44,
            criticalHit: 0xff8844,
            missedAttack: 0x4444ff,
        },
    };

    // AI system configuration
    public static readonly AI_SYSTEM: AISystemConfig = {
        enableAISystem: true,
        enableAIDebug: process.env.NODE_ENV === 'development',
        showThinkingDebug: false,
        showActionEvaluationDebug: false,
        showBehaviorTreeDebug: false,
        showPerformanceMetrics: false,
        enableDetailedLogging: process.env.NODE_ENV === 'development',
        difficultySettings: {
            thinkingDepth: 3,
            randomnessFactor: 0.2,
            mistakeProbability: 0.1,
            reactionTime: 1000,
            skillUsageFrequency: 0.7,
        },
        performanceSettings: {
            maxThinkingTime: 2000,
            maxMemoryUsage: 50,
            enableActionCaching: true,
            cacheSize: 1000,
            enableParallelProcessing: true,
            maxConcurrentProcesses: 4,
        },
        balanceSettings: {
            globalIntelligenceMultiplier: 1.0,
            mistakeProbability: 0.1,
            reactionDelay: 500,
            npcProtectionPriority: 2.0,
            skillUsageFrequency: 0.7,
            aggressiveBehaviorWeight: 1.0,
            defensiveBehaviorWeight: 1.0,
            supportBehaviorWeight: 1.0,
            tacticalBehaviorWeight: 1.0,
        },
        debugColors: {
            aiThinking: 0xffff00,
            actionEvaluation: 0x00ffff,
            behaviorTree: 0xff00ff,
            pathfinding: 0x00ff00,
            targetSelection: 0xff0000,
            skillUsage: 0x0000ff,
            npcProtection: 0xff8800,
            performanceWarning: 0xffaa00,
            performanceError: 0xff0000,
        },
        consoleCommands: {
            enableCommands: process.env.NODE_ENV === 'development',
            commandPrefix: 'ai',
            enableTesting: true,
            enableSimulation: true,
            enableBalanceAdjustment: true,
        },
        testingConfig: {
            enableTestingMode: process.env.NODE_ENV === 'development',
            autoExecuteActions: false,
            logAllDecisions: true,
            generateStatistics: true,
            testBehaviorPatterns: false,
            enableAIvsAISimulation: false,
        },
        statisticsConfig: {
            enableStatistics: true,
            collectionInterval: 1000,
            maxHistorySize: 1000,
            enablePerformanceTracking: true,
            enableDecisionTracking: true,
            enableSuccessRateTracking: true,
        },
    };

    // Skill system configuration
    public static readonly SKILL_SYSTEM: SkillSystemConfig = {
        enableSkillSystem: true,
        enableSkillAnimations: true,
        enableSkillSounds: true,
        enableSkillDebug: process.env.NODE_ENV === 'development',
        showConditionCheckDebug: false,
        showExecutionDebug: false,
        showEffectCalculationDebug: false,
        showSkillStatistics: false,
        enableDetailedLogging: process.env.NODE_ENV === 'development',
        animationConfig: {
            castAnimationDuration: 1000,
            effectAnimationDuration: 800,
            hitAnimationDuration: 600,
            skillUIDisplayDuration: 3000,
            animationSpeed: 1.0,
            enableParticleEffects: true,
            enableScreenEffects: true,
        },
        balanceSettings: {
            globalSkillDamageMultiplier: 1.0,
            globalSkillHealingMultiplier: 1.0,
            globalMPCostMultiplier: 1.0,
            globalCooldownMultiplier: 1.0,
            skillCriticalChanceBonus: 5,
            maxSkillUsagePerTurn: 3,
        },
        debugColors: {
            skillRange: 0x00ffff,
            skillAreaOfEffect: 0xff00ff,
            validTargets: 0x00ff00,
            invalidTargets: 0xff0000,
            skillExecution: 0xffff00,
            skillSuccess: 0x00ff88,
            skillFailure: 0xff8800,
            mpCost: 0x8888ff,
            cooldown: 0xff8888,
        },
        consoleCommands: {
            enableCommands: process.env.NODE_ENV === 'development',
            commandPrefix: 'skill',
            enableTesting: true,
            enableBalanceAdjustment: true,
            enableSimulation: true,
        },
        testingConfig: {
            enableTestingMode: process.env.NODE_ENV === 'development',
            autoExecuteSkills: false,
            logAllExecutions: true,
            generateStatistics: true,
            testSkillCombinations: false,
        },
    };

    // インスタンス用のプロパティ（インターフェース実装のため）
    public readonly GAME_WIDTH = GameConfig.GAME_WIDTH;
    public readonly GAME_HEIGHT = GameConfig.GAME_HEIGHT;
    public readonly BACKGROUND_COLOR = GameConfig.BACKGROUND_COLOR;
    public readonly TARGET_FPS = GameConfig.TARGET_FPS;
    public readonly PHYSICS_DEBUG = GameConfig.PHYSICS_DEBUG;
    public readonly MOVEMENT_SYSTEM = GameConfig.MOVEMENT_SYSTEM;
    public readonly BATTLE_SYSTEM = GameConfig.BATTLE_SYSTEM;
    public readonly RECRUITMENT_SYSTEM = GameConfig.RECRUITMENT_SYSTEM;
    public readonly SKILL_SYSTEM = GameConfig.SKILL_SYSTEM;
    public readonly AI_SYSTEM = GameConfig.AI_SYSTEM;

    // Mutable movement system configuration for runtime updates
    private movementSystemConfig: MovementSystemConfig;
    // Mutable battle system configuration for runtime updates
    private battleSystemConfig: BattleSystemConfig;
    // Mutable recruitment system configuration for runtime updates
    private recruitmentSystemConfig: RecruitmentSystemConfig;
    // Mutable skill system configuration for runtime updates
    private skillSystemConfig: SkillSystemConfig;
    // Mutable AI system configuration for runtime updates
    private aiSystemConfig: AISystemConfig;

    /**
     * Constructor - Initialize mutable configuration
     */
    constructor() {
        // Deep clone the static configuration for runtime modifications
        this.movementSystemConfig = JSON.parse(JSON.stringify(GameConfig.MOVEMENT_SYSTEM));
        this.battleSystemConfig = JSON.parse(JSON.stringify(GameConfig.BATTLE_SYSTEM));
        this.recruitmentSystemConfig = JSON.parse(JSON.stringify(GameConfig.RECRUITMENT_SYSTEM));
        this.skillSystemConfig = JSON.parse(JSON.stringify(GameConfig.SKILL_SYSTEM));
        this.aiSystemConfig = JSON.parse(JSON.stringify(GameConfig.AI_SYSTEM));
    }

    /**
     * Get current movement system configuration
     * @returns Movement system configuration
     */
    public getMovementSystemConfig(): MovementSystemConfig {
        return { ...this.movementSystemConfig };
    }

    /**
     * Update movement system configuration
     * @param config - Partial configuration to update
     */
    public updateMovementSystemConfig(config: Partial<MovementSystemConfig>): void {
        this.movementSystemConfig = { ...this.movementSystemConfig, ...config };
        console.log('GameConfig: Movement system configuration updated:', config);
    }

    /**
     * Get current battle system configuration
     * @returns Battle system configuration
     */
    public getBattleSystemConfig(): BattleSystemConfig {
        return { ...this.battleSystemConfig };
    }

    /**
     * Update battle system configuration
     * @param config - Partial configuration to update
     */
    public updateBattleSystemConfig(config: Partial<BattleSystemConfig>): void {
        this.battleSystemConfig = { ...this.battleSystemConfig, ...config };
        console.log('GameConfig: Battle system configuration updated:', config);
    }

    /**
     * Get current recruitment system configuration
     * @returns Recruitment system configuration
     */
    public getRecruitmentSystemConfig(): RecruitmentSystemConfig {
        return { ...this.recruitmentSystemConfig };
    }

    /**
     * Update recruitment system configuration
     * @param config - Partial configuration to update
     */
    public updateRecruitmentSystemConfig(config: Partial<RecruitmentSystemConfig>): void {
        this.recruitmentSystemConfig = { ...this.recruitmentSystemConfig, ...config };
        console.log('GameConfig: Recruitment system configuration updated:', config);
    }

    /**
     * Get current skill system configuration
     * @returns Skill system configuration
     */
    public getSkillSystemConfig(): SkillSystemConfig {
        return { ...this.skillSystemConfig };
    }

    /**
     * Update skill system configuration
     * @param config - Partial configuration to update
     */
    public updateSkillSystemConfig(config: Partial<SkillSystemConfig>): void {
        this.skillSystemConfig = { ...this.skillSystemConfig, ...config };
        console.log('GameConfig: Skill system configuration updated:', config);
    }

    /**
     * Get current AI system configuration
     * @returns AI system configuration
     */
    public getAISystemConfig(): AISystemConfig {
        return { ...this.aiSystemConfig };
    }

    /**
     * Update AI system configuration
     * @param config - Partial configuration to update
     */
    public updateAISystemConfig(config: Partial<AISystemConfig>): void {
        this.aiSystemConfig = { ...this.aiSystemConfig, ...config };
        console.log('GameConfig: AI system configuration updated:', config);
    }

    /**
     * 適切に型付けされたPhaser.Types.Core.GameConfigを返す
     * @returns Phaserゲーム設定オブジェクト
     */
    public getConfig(): Phaser.Types.Core.GameConfig {
        return {
            type: Phaser.AUTO,
            width: GameConfig.GAME_WIDTH,
            height: GameConfig.GAME_HEIGHT,
            parent: 'game-container',
            backgroundColor: GameConfig.BACKGROUND_COLOR,
            fps: {
                target: GameConfig.TARGET_FPS,
                forceSetTimeOut: true,
            },
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                width: GameConfig.GAME_WIDTH,
                height: GameConfig.GAME_HEIGHT,
                min: {
                    width: 800,
                    height: 600,
                },
                max: {
                    width: GameConfig.GAME_WIDTH,
                    height: GameConfig.GAME_HEIGHT,
                },
            },
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { x: 0, y: 0 },
                    debug: GameConfig.PHYSICS_DEBUG,
                },
            },
            scene: [], // シーンは後で追加される
        };
    }

    /**
     * 設定値の検証を行う
     * @returns 設定が有効な場合はtrue、無効な場合はfalse
     */
    public validateConfig(): boolean {
        try {
            // 画面サイズの検証
            if (GameConfig.GAME_WIDTH <= 0 || GameConfig.GAME_HEIGHT <= 0) {
                console.error('Invalid screen dimensions');
                return false;
            }

            // 背景色の検証（16進数カラーコード）
            const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
            if (!colorRegex.test(GameConfig.BACKGROUND_COLOR)) {
                console.error('Invalid background color format');
                return false;
            }

            // FPSの検証
            if (GameConfig.TARGET_FPS <= 0 || GameConfig.TARGET_FPS > 120) {
                console.error('Invalid target FPS');
                return false;
            }

            // Movement system configuration validation
            if (!this.validateMovementSystemConfig()) {
                return false;
            }

            // Battle system configuration validation
            if (!this.validateBattleSystemConfig()) {
                return false;
            }

            // Recruitment system configuration validation
            if (!this.validateRecruitmentSystemConfig()) {
                return false;
            }

            // Skill system configuration validation
            if (!this.validateSkillSystemConfig()) {
                return false;
            }

            // AI system configuration validation
            if (!this.validateAISystemConfig()) {
                return false;
            }

            return true;
        } catch (error) {
            console.error('Config validation error:', error);
            return false;
        }
    }

    /**
     * Validate movement system configuration
     * @returns True if valid, false otherwise
     */
    private validateMovementSystemConfig(): boolean {
        const config = this.movementSystemConfig;

        // Validate animation configuration
        if (config.animationConfig.moveSpeed <= 0) {
            console.error('Invalid movement animation speed');
            return false;
        }

        if (config.animationConfig.turnSpeed <= 0) {
            console.error('Invalid movement turn speed');
            return false;
        }

        if (config.animationConfig.stepDelay < 0) {
            console.error('Invalid movement step delay');
            return false;
        }

        // Validate terrain costs
        for (const [terrainType, terrainData] of Object.entries(config.terrainCosts)) {
            if (terrainData.movementCost < 0) {
                console.error(
                    `Invalid movement cost for terrain ${terrainType}: ${terrainData.movementCost}`
                );
                return false;
            }
        }

        // Validate debug colors (should be valid hex colors)
        for (const [colorName, colorValue] of Object.entries(config.debugColors)) {
            if (typeof colorValue !== 'number' || colorValue < 0 || colorValue > 0xffffff) {
                console.error(`Invalid debug color ${colorName}: ${colorValue}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Validate battle system configuration
     * @returns True if valid, false otherwise
     */
    private validateBattleSystemConfig(): boolean {
        const config = this.battleSystemConfig;

        // Validate animation configuration
        if (config.animationConfig.attackAnimationDuration < 0) {
            console.error('Invalid attack animation duration');
            return false;
        }

        if (config.animationConfig.damageEffectDuration < 0) {
            console.error('Invalid damage effect duration');
            return false;
        }

        if (config.animationConfig.hpBarAnimationDuration < 0) {
            console.error('Invalid HP bar animation duration');
            return false;
        }

        if (config.animationConfig.defeatAnimationDuration < 0) {
            console.error('Invalid defeat animation duration');
            return false;
        }

        if (config.animationConfig.animationSpeed <= 0) {
            console.error('Invalid animation speed multiplier');
            return false;
        }

        // Validate damage modifiers
        if (config.damageModifiers.globalDamageMultiplier <= 0) {
            console.error('Invalid global damage multiplier');
            return false;
        }

        if (config.damageModifiers.criticalDamageMultiplier <= 0) {
            console.error('Invalid critical damage multiplier');
            return false;
        }

        if (config.damageModifiers.minimumDamage < 0) {
            console.error('Invalid minimum damage');
            return false;
        }

        if (config.damageModifiers.maximumDamage <= config.damageModifiers.minimumDamage) {
            console.error('Maximum damage must be greater than minimum damage');
            return false;
        }

        // Validate balance settings
        if (
            config.balanceSettings.baseCriticalChance < 0 ||
            config.balanceSettings.baseCriticalChance > 100
        ) {
            console.error('Invalid base critical chance (must be 0-100)');
            return false;
        }

        if (
            config.balanceSettings.baseEvasionChance < 0 ||
            config.balanceSettings.baseEvasionChance > 100
        ) {
            console.error('Invalid base evasion chance (must be 0-100)');
            return false;
        }

        if (config.balanceSettings.experienceMultiplier <= 0) {
            console.error('Invalid experience multiplier');
            return false;
        }

        if (config.balanceSettings.durabilityLossRate < 0) {
            console.error('Invalid durability loss rate');
            return false;
        }

        // Validate debug colors (should be valid hex colors)
        for (const [colorName, colorValue] of Object.entries(config.debugColors)) {
            if (typeof colorValue !== 'number' || colorValue < 0 || colorValue > 0xffffff) {
                console.error(`Invalid debug color ${colorName}: ${colorValue}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Validate recruitment system configuration
     * @returns True if valid, false otherwise
     */
    private validateRecruitmentSystemConfig(): boolean {
        const config = this.recruitmentSystemConfig;

        // Validate animation configuration
        if (config.animationConfig.conditionDisplayDuration < 0) {
            console.error('Invalid condition display duration');
            return false;
        }

        if (config.animationConfig.npcConversionDuration < 0) {
            console.error('Invalid NPC conversion duration');
            return false;
        }

        if (config.animationConfig.recruitmentSuccessDuration < 0) {
            console.error('Invalid recruitment success duration');
            return false;
        }

        if (config.animationConfig.recruitmentFailureDuration < 0) {
            console.error('Invalid recruitment failure duration');
            return false;
        }

        if (config.animationConfig.progressUpdateDuration < 0) {
            console.error('Invalid progress update duration');
            return false;
        }

        if (config.animationConfig.animationSpeed <= 0) {
            console.error('Invalid recruitment animation speed multiplier');
            return false;
        }

        // Validate balance settings
        if (config.balanceSettings.npcSurvivalBonus < 0) {
            console.error('Invalid NPC survival bonus');
            return false;
        }

        if (config.balanceSettings.conditionDisplayDuration < 0) {
            console.error('Invalid condition display duration');
            return false;
        }

        if (config.balanceSettings.npcIndicatorFadeDuration < 0) {
            console.error('Invalid NPC indicator fade duration');
            return false;
        }

        if (config.balanceSettings.successCelebrationDuration < 0) {
            console.error('Invalid success celebration duration');
            return false;
        }

        // Validate debug colors (should be valid hex colors)
        for (const [colorName, colorValue] of Object.entries(config.debugColors)) {
            if (typeof colorValue !== 'number' || colorValue < 0 || colorValue > 0xffffff) {
                console.error(`Invalid recruitment debug color ${colorName}: ${colorValue}`);
                return false;
            }
        }

        // Validate console command settings
        if (
            typeof config.consoleCommands.commandPrefix !== 'string' ||
            config.consoleCommands.commandPrefix.length === 0
        ) {
            console.error('Invalid console command prefix');
            return false;
        }

        return true;
    }

    /**
     * Validate skill system configuration
     * @returns True if valid, false otherwise
     */
    private validateSkillSystemConfig(): boolean {
        const config = this.skillSystemConfig;

        // Validate animation configuration
        if (config.animationConfig.castAnimationDuration < 0) {
            console.error('Invalid cast animation duration');
            return false;
        }

        if (config.animationConfig.effectAnimationDuration < 0) {
            console.error('Invalid effect animation duration');
            return false;
        }

        if (config.animationConfig.hitAnimationDuration < 0) {
            console.error('Invalid hit animation duration');
            return false;
        }

        if (config.animationConfig.skillUIDisplayDuration < 0) {
            console.error('Invalid skill UI display duration');
            return false;
        }

        if (config.animationConfig.animationSpeed <= 0) {
            console.error('Invalid skill animation speed multiplier');
            return false;
        }

        // Validate balance settings
        if (config.balanceSettings.globalSkillDamageMultiplier <= 0) {
            console.error('Invalid global skill damage multiplier');
            return false;
        }

        if (config.balanceSettings.globalSkillHealingMultiplier <= 0) {
            console.error('Invalid global skill healing multiplier');
            return false;
        }

        if (config.balanceSettings.globalMPCostMultiplier <= 0) {
            console.error('Invalid global MP cost multiplier');
            return false;
        }

        if (config.balanceSettings.globalCooldownMultiplier <= 0) {
            console.error('Invalid global cooldown multiplier');
            return false;
        }

        if (config.balanceSettings.skillCriticalChanceBonus < 0 || config.balanceSettings.skillCriticalChanceBonus > 100) {
            console.error('Invalid skill critical chance bonus (must be 0-100)');
            return false;
        }

        if (config.balanceSettings.maxSkillUsagePerTurn <= 0) {
            console.error('Invalid max skill usage per turn');
            return false;
        }

        // Validate debug colors (should be valid hex colors)
        for (const [colorName, colorValue] of Object.entries(config.debugColors)) {
            if (typeof colorValue !== 'number' || colorValue < 0 || colorValue > 0xffffff) {
                console.error(`Invalid skill debug color ${colorName}: ${colorValue}`);
                return false;
            }
        }

        // Validate console command settings
        if (
            typeof config.consoleCommands.commandPrefix !== 'string' ||
            config.consoleCommands.commandPrefix.length === 0
        ) {
            console.error('Invalid skill console command prefix');
            return false;
        }

        return true;
    }

    /**
     * Validate AI system configuration
     * @returns True if valid, false otherwise
     */
    private validateAISystemConfig(): boolean {
        const config = this.aiSystemConfig;

        // Validate difficulty settings
        if (config.difficultySettings.thinkingDepth < 1 || config.difficultySettings.thinkingDepth > 10) {
            console.error('Invalid AI thinking depth (must be 1-10)');
            return false;
        }

        if (config.difficultySettings.randomnessFactor < 0 || config.difficultySettings.randomnessFactor > 1) {
            console.error('Invalid AI randomness factor (must be 0-1)');
            return false;
        }

        if (config.difficultySettings.mistakeProbability < 0 || config.difficultySettings.mistakeProbability > 1) {
            console.error('Invalid AI mistake probability (must be 0-1)');
            return false;
        }

        if (config.difficultySettings.reactionTime < 0) {
            console.error('Invalid AI reaction time');
            return false;
        }

        if (config.difficultySettings.skillUsageFrequency < 0 || config.difficultySettings.skillUsageFrequency > 1) {
            console.error('Invalid AI skill usage frequency (must be 0-1)');
            return false;
        }

        // Validate performance settings
        if (config.performanceSettings.maxThinkingTime <= 0) {
            console.error('Invalid AI max thinking time');
            return false;
        }

        if (config.performanceSettings.maxMemoryUsage <= 0) {
            console.error('Invalid AI max memory usage');
            return false;
        }

        if (config.performanceSettings.cacheSize <= 0) {
            console.error('Invalid AI cache size');
            return false;
        }

        if (config.performanceSettings.maxConcurrentProcesses <= 0) {
            console.error('Invalid AI max concurrent processes');
            return false;
        }

        // Validate balance settings
        if (config.balanceSettings.globalIntelligenceMultiplier <= 0) {
            console.error('Invalid AI global intelligence multiplier');
            return false;
        }

        if (config.balanceSettings.mistakeProbability < 0 || config.balanceSettings.mistakeProbability > 1) {
            console.error('Invalid AI mistake probability (must be 0-1)');
            return false;
        }

        if (config.balanceSettings.reactionDelay < 0) {
            console.error('Invalid AI reaction delay');
            return false;
        }

        if (config.balanceSettings.npcProtectionPriority <= 0) {
            console.error('Invalid AI NPC protection priority');
            return false;
        }

        if (config.balanceSettings.skillUsageFrequency < 0 || config.balanceSettings.skillUsageFrequency > 1) {
            console.error('Invalid AI skill usage frequency (must be 0-1)');
            return false;
        }

        // Validate behavior weights
        const behaviorWeights = [
            config.balanceSettings.aggressiveBehaviorWeight,
            config.balanceSettings.defensiveBehaviorWeight,
            config.balanceSettings.supportBehaviorWeight,
            config.balanceSettings.tacticalBehaviorWeight,
        ];

        for (const weight of behaviorWeights) {
            if (weight < 0) {
                console.error('Invalid AI behavior weight (must be non-negative)');
                return false;
            }
        }

        // Validate debug colors (should be valid hex colors)
        for (const [colorName, colorValue] of Object.entries(config.debugColors)) {
            if (typeof colorValue !== 'number' || colorValue < 0 || colorValue > 0xffffff) {
                console.error(`Invalid AI debug color ${colorName}: ${colorValue}`);
                return false;
            }
        }

        // Validate console command settings
        if (
            typeof config.consoleCommands.commandPrefix !== 'string' ||
            config.consoleCommands.commandPrefix.length === 0
        ) {
            console.error('Invalid AI console command prefix');
            return false;
        }

        // Validate statistics settings
        if (config.statisticsConfig.collectionInterval <= 0) {
            console.error('Invalid AI statistics collection interval');
            return false;
        }

        if (config.statisticsConfig.maxHistorySize <= 0) {
            console.error('Invalid AI statistics max history size');
            return false;
        }

        return true;
    }

    /**
     * Update skill system balance settings dynamically
     * @param setting - Setting key
     * @param value - New value
     * @returns Success status
     */
    public updateSkillSystemBalanceSetting(setting: string, value: number): boolean {
        try {
            switch (setting.toLowerCase()) {
                case 'globalskillmultiplier':
                case 'globaldamagemultiplier':
                    if (value <= 0) {
                        console.error('Global skill damage multiplier must be positive');
                        return false;
                    }
                    this.skillSystemConfig.balanceSettings.globalSkillDamageMultiplier = value;
                    break;
                case 'globalskillhealingmultiplier':
                case 'globalhealingmultiplier':
                    if (value <= 0) {
                        console.error('Global skill healing multiplier must be positive');
                        return false;
                    }
                    this.skillSystemConfig.balanceSettings.globalSkillHealingMultiplier = value;
                    break;
                case 'globalmpcostmultiplier':
                    if (value <= 0) {
                        console.error('Global MP cost multiplier must be positive');
                        return false;
                    }
                    this.skillSystemConfig.balanceSettings.globalMPCostMultiplier = value;
                    break;
                case 'globalcooldownmultiplier':
                    if (value <= 0) {
                        console.error('Global cooldown multiplier must be positive');
                        return false;
                    }
                    this.skillSystemConfig.balanceSettings.globalCooldownMultiplier = value;
                    break;
                case 'skillcriticalchancebonus':
                    if (value < 0 || value > 100) {
                        console.error('Skill critical chance bonus must be between 0 and 100');
                        return false;
                    }
                    this.skillSystemConfig.balanceSettings.skillCriticalChanceBonus = value;
                    break;
                case 'maxskillsperturn':
                case 'maxskillsusageperturn':
                case 'maxskillsageperturn':
                    if (value <= 0 || !Number.isInteger(value)) {
                        console.error('Max skills per turn must be a positive integer');
                        return false;
                    }
                    this.skillSystemConfig.balanceSettings.maxSkillUsagePerTurn = value;
                    break;
                default:
                    console.error(`Unknown skill balance setting: ${setting}`);
                    return false;
            }

            console.log(`GameConfig: Skill balance setting '${setting}' updated to ${value}`);
            return true;

        } catch (error) {
            console.error('Failed to update skill balance setting:', error);
            return false;
        }
    }

    /**
     * Update skill system debug settings
     * @param setting - Setting key
     * @param value - New value
     * @returns Success status
     */
    public updateSkillSystemDebugSetting(setting: string, value: boolean): boolean {
        try {
            switch (setting.toLowerCase()) {
                case 'enableskilldebug':
                    this.skillSystemConfig.enableSkillDebug = value;
                    break;
                case 'showconditioncheckdebug':
                    this.skillSystemConfig.showConditionCheckDebug = value;
                    break;
                case 'showexecutiondebug':
                    this.skillSystemConfig.showExecutionDebug = value;
                    break;
                case 'showeffectcalculationdebug':
                    this.skillSystemConfig.showEffectCalculationDebug = value;
                    break;
                case 'showskillstatistics':
                    this.skillSystemConfig.showSkillStatistics = value;
                    break;
                case 'enabledetailedlogging':
                    this.skillSystemConfig.enableDetailedLogging = value;
                    break;
                case 'enabletestingmode':
                    this.skillSystemConfig.testingConfig.enableTestingMode = value;
                    break;
                case 'autoexecuteskills':
                    this.skillSystemConfig.testingConfig.autoExecuteSkills = value;
                    break;
                case 'logallexecutions':
                    this.skillSystemConfig.testingConfig.logAllExecutions = value;
                    break;
                case 'generatestatistics':
                    this.skillSystemConfig.testingConfig.generateStatistics = value;
                    break;
                default:
                    console.error(`Unknown skill debug setting: ${setting}`);
                    return false;
            }

            console.log(`GameConfig: Skill debug setting '${setting}' updated to ${value}`);
            return true;

        } catch (error) {
            console.error('Failed to update skill debug setting:', error);
            return false;
        }
    }

    /**
     * Get current skill system balance settings
     * @returns Balance settings object
     */
    public getSkillSystemBalanceSettings(): any {
        return { ...this.skillSystemConfig.balanceSettings };
    }

    /**
     * Get current skill system debug settings
     * @returns Debug settings object
     */
    public getSkillSystemDebugSettings(): any {
        return {
            enableSkillDebug: this.skillSystemConfig.enableSkillDebug,
            showConditionCheckDebug: this.skillSystemConfig.showConditionCheckDebug,
            showExecutionDebug: this.skillSystemConfig.showExecutionDebug,
            showEffectCalculationDebug: this.skillSystemConfig.showEffectCalculationDebug,
            showSkillStatistics: this.skillSystemConfig.showSkillStatistics,
            enableDetailedLogging: this.skillSystemConfig.enableDetailedLogging,
            testingConfig: { ...this.skillSystemConfig.testingConfig }
        };
    }

    /**
     * Reset skill system settings to defaults
     */
    public resetSkillSystemSettings(): void {
        this.skillSystemConfig = JSON.parse(JSON.stringify(GameConfig.SKILL_SYSTEM));
        console.log('GameConfig: Skill system settings reset to defaults');
    }

    /**
     * 設定値をコンソールに出力する（デバッグ用）
     */
    public logConfig(): void {
        console.log('Game Configuration:');
        console.log(`- Screen Size: ${GameConfig.GAME_WIDTH}x${GameConfig.GAME_HEIGHT}`);
        console.log(`- Background Color: ${GameConfig.BACKGROUND_COLOR}`);
        console.log(`- Target FPS: ${GameConfig.TARGET_FPS}`);
        console.log(`- Physics Debug: ${GameConfig.PHYSICS_DEBUG}`);
        console.log('- Movement System:');
        console.log(`  - Visual Feedback: ${this.movementSystemConfig.enableVisualFeedback}`);
        console.log(`  - Path Preview: ${this.movementSystemConfig.enablePathPreview}`);
        console.log(`  - Movement Animation: ${this.movementSystemConfig.enableMovementAnimation}`);
        console.log(`  - Movement Debug: ${this.movementSystemConfig.enableMovementDebug}`);
        console.log(`  - Animation Speed: ${this.movementSystemConfig.animationConfig.moveSpeed}px/s`);
        console.log(`  - Turn Speed: ${this.movementSystemConfig.animationConfig.turnSpeed}rad/s`);
        console.log(`  - Step Delay: ${this.movementSystemConfig.animationConfig.stepDelay}ms`);
        console.log(
            `  - Terrain Types: ${Object.keys(this.movementSystemConfig.terrainCosts).join(', ')}`
        );
        console.log('- Battle System:');
        console.log(`  - Battle Animations: ${this.battleSystemConfig.enableBattleAnimations}`);
        console.log(`  - Battle Sounds: ${this.battleSystemConfig.enableBattleSounds}`);
        console.log(`  - Battle Debug: ${this.battleSystemConfig.enableBattleDebug}`);
        console.log(
            `  - Global Damage Multiplier: ${this.battleSystemConfig.damageModifiers.globalDamageMultiplier}`
        );
        console.log(
            `  - Critical Damage Multiplier: ${this.battleSystemConfig.damageModifiers.criticalDamageMultiplier}`
        );
        console.log(
            `  - Base Critical Chance: ${this.battleSystemConfig.balanceSettings.baseCriticalChance}%`
        );
        console.log(
            `  - Base Evasion Chance: ${this.battleSystemConfig.balanceSettings.baseEvasionChance}%`
        );
        console.log(
            `  - Experience Multiplier: ${this.battleSystemConfig.balanceSettings.experienceMultiplier}`
        );
        console.log(
            `  - Attack Animation Duration: ${this.battleSystemConfig.animationConfig.attackAnimationDuration}ms`
        );
        console.log(`  - Animation Speed: ${this.battleSystemConfig.animationConfig.animationSpeed}x`);
        console.log('- Recruitment System:');
        console.log(
            `  - Recruitment System Enabled: ${this.recruitmentSystemConfig.enableRecruitmentSystem}`
        );
        console.log(`  - Condition Display: ${this.recruitmentSystemConfig.enableConditionDisplay}`);
        console.log(
            `  - Progress Indicators: ${this.recruitmentSystemConfig.enableProgressIndicators}`
        );
        console.log(`  - NPC Indicators: ${this.recruitmentSystemConfig.enableNPCIndicators}`);
        console.log(
            `  - Recruitment Animations: ${this.recruitmentSystemConfig.enableRecruitmentAnimations}`
        );
        console.log(`  - Recruitment Debug: ${this.recruitmentSystemConfig.enableRecruitmentDebug}`);
        console.log(`  - Detailed Logging: ${this.recruitmentSystemConfig.enableDetailedLogging}`);
        console.log(
            `  - NPC Survival Bonus: ${this.recruitmentSystemConfig.balanceSettings.npcSurvivalBonus}`
        );
        console.log(
            `  - Condition Display Duration: ${this.recruitmentSystemConfig.balanceSettings.conditionDisplayDuration}ms`
        );
        console.log(
            `  - Console Commands: ${this.recruitmentSystemConfig.consoleCommands.enableCommands}`
        );
        console.log(
            `  - Command Prefix: ${this.recruitmentSystemConfig.consoleCommands.commandPrefix}`
        );
        console.log(
            `  - Animation Speed: ${this.recruitmentSystemConfig.animationConfig.animationSpeed}x`
        );
        console.log('- Skill System:');
        console.log(`  - Skill System Enabled: ${this.skillSystemConfig.enableSkillSystem}`);
        console.log(`  - Skill Animations: ${this.skillSystemConfig.enableSkillAnimations}`);
        console.log(`  - Skill Sounds: ${this.skillSystemConfig.enableSkillSounds}`);
        console.log(`  - Skill Debug: ${this.skillSystemConfig.enableSkillDebug}`);
        console.log(`  - Detailed Logging: ${this.skillSystemConfig.enableDetailedLogging}`);
        console.log(
            `  - Global Skill Damage Multiplier: ${this.skillSystemConfig.balanceSettings.globalSkillDamageMultiplier}`
        );
        console.log(
            `  - Global Skill Healing Multiplier: ${this.skillSystemConfig.balanceSettings.globalSkillHealingMultiplier}`
        );
        console.log(
            `  - Global MP Cost Multiplier: ${this.skillSystemConfig.balanceSettings.globalMPCostMultiplier}`
        );
        console.log(
            `  - Max Skills Per Turn: ${this.skillSystemConfig.balanceSettings.maxSkillUsagePerTurn}`
        );
        console.log(
            `  - Cast Animation Duration: ${this.skillSystemConfig.animationConfig.castAnimationDuration}ms`
        );
        console.log(
            `  - Effect Animation Duration: ${this.skillSystemConfig.animationConfig.effectAnimationDuration}ms`
        );
        console.log(`  - Console Commands: ${this.skillSystemConfig.consoleCommands.enableCommands}`);
        console.log(`  - Command Prefix: ${this.skillSystemConfig.consoleCommands.commandPrefix}`);
        console.log(`  - Testing Mode: ${this.skillSystemConfig.testingConfig.enableTestingMode}`);
        console.log(
            `  - Animation Speed: ${this.skillSystemConfig.animationConfig.animationSpeed}x`
        );
    }
}
