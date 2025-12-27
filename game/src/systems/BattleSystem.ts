/**
 * BattleSystem - Main controller class for the battle system
 *
 * This class orchestrates the entire battle flow by coordinating all battle subsystems:
 * - AttackRangeCalculator for range calculations
 * - TargetSelector for target selection
 * - DamageCalculator for damage calculations
 * - BattleAnimator for visual effects
 * - BattleStateManager for state management
 *
 * Implements requirements 1.1, 2.1, 3.1, 4.1, 5.1 from the battle system specification
 */

import * as Phaser from 'phaser';
import { Unit, Position, MapData } from '../types/gameplay';
import {
    Weapon,
    BattleResult,
    BattleError,
    BattleContext,
    BattleErrorDetails,
    TargetSelectionResult,
    AttackRangeResult,
    DamageType,
    WeaponType,
    Element,
} from '../types/battle';
import { AttackRangeCalculator } from './AttackRangeCalculator';
import { TargetSelector } from './TargetSelector';
import { DamageCalculator } from './DamageCalculator';
import { BattleAnimator } from './BattleAnimator';
import { BattleStateManager } from './BattleStateManager';
import { BattleErrorHandler, ErrorRecoveryResult } from './BattleErrorHandler';
import { BattlePerformanceManager } from './BattlePerformanceManager';
import { BattlePerformanceMonitor } from './BattlePerformanceMonitor';
import { BattleResourceManager } from './BattleResourceManager';
import { BattleEffectPool } from './BattleEffectPool';
import { BattleDebugManager } from '../debug/BattleDebugManager';
import { BattleConsoleCommands } from '../debug/BattleConsoleCommands';
import { RecruitmentSystem } from './recruitment/RecruitmentSystem';
import { RecruitmentResult, RecruitmentAction, RecruitmentError } from '../types/recruitment';
import { CharacterLossManager } from './CharacterLossManager';
import { LossCause, LossCauseType, CharacterLossUtils } from '../types/characterLoss';
import { SkillSystem } from './skills/SkillSystem';
import { SkillResult, SkillExecutionContext, SkillUsabilityError } from '../types/skill';
import { ExperienceSystem } from './experience/ExperienceSystem';
import { ExperienceAction, ExperienceSource, ExperienceContext, BattleContext as ExpBattleContext } from '../types/experience';

/**
 * Battle system configuration
 */
export interface BattleSystemConfig {
    /** Enable automatic battle animations */
    enableAnimations: boolean;
    /** Enable battle sound effects */
    enableSoundEffects: boolean;
    /** Battle processing speed multiplier */
    battleSpeed: number;
    /** Enable detailed battle logging */
    enableBattleLogging: boolean;
    /** Maximum time to wait for animations (ms) */
    animationTimeout: number;
    /** Enable battle result caching */
    enableResultCaching: boolean;
}

/**
 * Battle system state tracking
 */
export interface BattleSystemState {
    /** Current battle phase */
    phase:
    | 'idle'
    | 'range_display'
    | 'target_selection'
    | 'battle_execution'
    | 'animation'
    | 'cleanup';
    /** Currently selected attacker */
    currentAttacker: Unit | null;
    /** Currently equipped weapon */
    currentWeapon: Weapon | null;
    /** Currently selected target */
    currentTarget: Unit | null;
    /** Whether battle system is active */
    isActive: boolean;
    /** Whether animations are playing */
    isAnimating: boolean;
    /** Last battle result */
    lastBattleResult: BattleResult | null;
}

/**
 * Battle execution options
 */
export interface BattleExecutionOptions {
    /** Skip animations for faster execution */
    skipAnimations?: boolean;
    /** Force battle even if normally invalid */
    forceBattle?: boolean;
    /** Custom damage modifiers to apply */
    customModifiers?: import('../types/battle').DamageModifier[];
    /** Callback for battle completion */
    onComplete?: (result: BattleResult) => void;
    /** Callback for battle error */
    onError?: (error: BattleErrorDetails) => void;
}

/**
 * Skill action data for battle system integration
 */
export interface SkillAction {
    /** Skill ID to execute */
    skillId: string;
    /** Character using the skill */
    caster: Unit;
    /** Target position for the skill */
    targetPosition: Position;
    /** Optional execution options */
    options?: BattleExecutionOptions;
}

/**
 * Skill action result from battle system
 */
export interface SkillActionResult {
    /** Whether the skill action was successful */
    success: boolean;
    /** Skill execution result */
    skillResult?: SkillResult;
    /** Battle results for affected units */
    battleResults: BattleResult[];
    /** Error information if failed */
    error?: BattleErrorDetails;
    /** Additional information */
    additionalInfo?: {
        affectedUnits: Unit[];
        totalDamageDealt: number;
        totalHealingDone: number;
        statusEffectsApplied: number;
        executionTime: number;
    };
}

/**
 * Main BattleSystem controller class
 * Coordinates all battle subsystems to provide complete battle functionality
 */
export class BattleSystem extends Phaser.Events.EventEmitter {
    private scene: Phaser.Scene;
    private config: BattleSystemConfig;
    private state: BattleSystemState;

    // Battle subsystems
    private attackRangeCalculator: AttackRangeCalculator;
    private targetSelector: TargetSelector;
    private damageCalculator: DamageCalculator;
    private battleAnimator: BattleAnimator;
    private battleStateManager: BattleStateManager;
    private errorHandler: BattleErrorHandler;

    // Performance optimization systems
    private performanceManager: BattlePerformanceManager;
    private performanceMonitor: BattlePerformanceMonitor;
    private resourceManager: BattleResourceManager;
    private effectPool: BattleEffectPool;

    // Debug systems
    private debugManager: BattleDebugManager;
    private consoleCommands: BattleConsoleCommands;

    // Recruitment system integration
    private recruitmentSystem: RecruitmentSystem | null = null;

    // Character loss system integration
    private characterLossManager: CharacterLossManager | null = null;

    // Skill system integration
    private skillSystem: SkillSystem | null = null;

    // AI system integration
    private aiSystemManager: any = null;

    // Experience system integration
    private experienceSystem: ExperienceSystem | null = null;

    // Job system integration
    private jobSystem: any = null;
    private battleJobIntegration: any = null;

    // Victory condition system integration
    private victoryConditionSystem: any = null;

    // Battle data
    private allUnits: Unit[] = [];
    private mapData: MapData | null = null;
    private battleHistory: BattleResult[] = [];

    // Visual feedback
    private rangeHighlights: Phaser.GameObjects.Graphics[] = [];
    private targetHighlights: Phaser.GameObjects.Graphics[] = [];

    // Default configuration
    private static readonly DEFAULT_CONFIG: BattleSystemConfig = {
        enableAnimations: true,
        enableSoundEffects: true,
        battleSpeed: 1.0,
        enableBattleLogging: true,
        animationTimeout: 5000,
        enableResultCaching: false,
    };

    /**
     * Creates a new BattleSystem instance
     * @param scene - Phaser scene for rendering and events
     * @param config - Battle system configuration
     */
    constructor(scene: Phaser.Scene, config?: Partial<BattleSystemConfig>) {
        super();

        this.scene = scene;
        this.config = { ...BattleSystem.DEFAULT_CONFIG, ...config };

        // Initialize state
        this.state = {
            phase: 'idle',
            currentAttacker: null,
            currentWeapon: null,
            currentTarget: null,
            isActive: false,
            isAnimating: false,
            lastBattleResult: null,
        };

        // Initialize performance optimization systems
        this.performanceManager = new BattlePerformanceManager();
        this.performanceMonitor = new BattlePerformanceMonitor();
        this.resourceManager = new BattleResourceManager(scene);
        this.effectPool = new BattleEffectPool(scene);

        // Initialize debug systems
        this.debugManager = new BattleDebugManager(scene);
        this.consoleCommands = new BattleConsoleCommands(this.debugManager);

        // Initialize subsystems
        this.attackRangeCalculator = new AttackRangeCalculator();
        this.targetSelector = new TargetSelector(this.attackRangeCalculator);
        this.damageCalculator = new DamageCalculator();
        this.battleAnimator = new BattleAnimator(scene);
        this.battleStateManager = new BattleStateManager(this);
        this.errorHandler = new BattleErrorHandler(scene);

        // Start performance monitoring
        this.performanceMonitor.startMonitoring();

        this.setupEventListeners();
    }

    /**
     * Set recruitment system for integration
     * @param recruitmentSystem - Recruitment system instance
     */
    public setRecruitmentSystem(recruitmentSystem: RecruitmentSystem): void {
        this.recruitmentSystem = recruitmentSystem;
        this.log('Recruitment system integrated with battle system');
    }

    /**
     * Check if recruitment system is integrated
     * @returns True if recruitment system is available
     */
    public hasRecruitmentSystem(): boolean {
        return this.recruitmentSystem !== null;
    }

    /**
     * Set character loss manager for integration
     * @param characterLossManager - Character loss manager instance
     */
    public setCharacterLossManager(characterLossManager: CharacterLossManager): void {
        this.characterLossManager = characterLossManager;
        this.log('Character loss manager integrated with battle system');
    }

    /**
     * Check if character loss manager is integrated
     * @returns True if character loss manager is available
     */
    public hasCharacterLossManager(): boolean {
        return this.characterLossManager !== null;
    }

    /**
     * Set skill system for integration
     * @param skillSystem - Skill system instance
     */
    public setSkillSystem(skillSystem: SkillSystem): void {
        this.skillSystem = skillSystem;
        this.log('Skill system integrated with battle system');
    }

    /**
     * Check if skill system is integrated
     * @returns True if skill system is available
     */
    public hasSkillSystem(): boolean {
        return this.skillSystem !== null;
    }

    /**
     * Set AI system manager for integration
     * @param aiSystemManager - AI system manager instance
     */
    public setAISystemManager(aiSystemManager: any): void {
        this.aiSystemManager = aiSystemManager;
        this.log('AI system manager integrated with battle system');
    }

    /**
     * Check if AI system manager is integrated
     * @returns True if AI system manager is available
     */
    public hasAISystemManager(): boolean {
        return this.aiSystemManager !== null;
    }

    /**
     * Set experience system for integration
     * @param experienceSystem - Experience system instance
     */
    public setExperienceSystem(experienceSystem: ExperienceSystem): void {
        this.experienceSystem = experienceSystem;
        this.log('Experience system integrated with battle system');
    }

    /**
     * Check if experience system is integrated
     * @returns True if experience system is available
     */
    public hasExperienceSystem(): boolean {
        return this.experienceSystem !== null;
    }

    /**
     * Set job system for integration
     * @param jobSystem - Job system instance
     */
    public setJobSystem(jobSystem: any): void {
        this.jobSystem = jobSystem;

        // Initialize battle-job integration
        if (this.jobSystem) {
            const { BattleJobIntegration } = require('../systems/jobs/BattleJobIntegration');
            this.battleJobIntegration = new BattleJobIntegration(this.jobSystem, this.scene);

            // Set up event listeners for job system integration
            this.setupJobSystemEventListeners();
        }

        this.log('Job system integrated with battle system');
    }

    /**
     * Check if job system is integrated
     * @returns True if job system is available
     */
    public hasJobSystem(): boolean {
        return this.jobSystem !== null;
    }

    /**
     * Set victory condition system for integration
     * @param victoryConditionSystem - Victory condition system instance
     */
    public setVictoryConditionSystem(victoryConditionSystem: any): void {
        this.victoryConditionSystem = victoryConditionSystem;
        this.log('Victory condition system integrated with battle system');
    }

    /**
     * Check if victory condition system is integrated
     * @returns True if victory condition system is available
     */
    public hasVictoryConditionSystem(): boolean {
        return this.victoryConditionSystem !== null;
    }

    /**
     * Get recruitment conditions for a target unit
     * @param target - Target unit to check
     * @returns Array of recruitment conditions or empty array
     */
    public getRecruitmentConditions(target: Unit): any[] {
        if (!this.recruitmentSystem) {
            return [];
        }
        try {
            return this.recruitmentSystem.getRecruitmentConditions(target);
        } catch (error) {
            this.log('Error getting recruitment conditions', { error: error.message });
            return [];
        }
    }

    /**
     * Check if a unit can be recruited
     * @param attacker - Attacking unit
     * @param target - Target unit
     * @returns True if target can potentially be recruited
     */
    public canRecruit(attacker: Unit, target: Unit): boolean {
        if (!this.recruitmentSystem || target.faction !== 'enemy') {
            return false;
        }

        try {
            const conditions = this.recruitmentSystem.getRecruitmentConditions(target);
            return conditions.length > 0;
        } catch (error) {
            this.log('Error checking recruitment eligibility', { error: error.message });
            return false;
        }
    }

    /**
     * Setup event listeners for battle system coordination
     */
    private setupEventListeners(): void {
        // Listen to animator events
        this.battleAnimator.on('attack_complete', this.onAttackAnimationComplete.bind(this));
        this.battleAnimator.on('damage_applied', this.onDamageAnimationComplete.bind(this));
        this.battleAnimator.on('hp_change_complete', this.onHPChangeComplete.bind(this));
        this.battleAnimator.on('defeat_complete', this.onDefeatAnimationComplete.bind(this));

        // Listen to state manager events (if it's an EventEmitter)
        if (typeof this.battleStateManager.on === 'function') {
            this.battleStateManager.on('unit-defeated', this.onUnitDefeated.bind(this));
            this.battleStateManager.on('experience-granted', this.onExperienceGranted.bind(this));
            this.battleStateManager.on('battle-result-recorded', this.onBattleResultRecorded.bind(this));
        }

        // Listen to error handler events
        this.errorHandler.on('error-handled', this.onErrorHandled.bind(this));
        this.errorHandler.on('retry-requested', this.onRetryRequested.bind(this));
        this.errorHandler.on('cancel-requested', this.onCancelRequested.bind(this));
        this.errorHandler.on('reset-requested', this.onResetRequested.bind(this));
    }

    /**
     * Setup event listeners for job system integration
     */
    private setupJobSystemEventListeners(): void {
        if (!this.battleJobIntegration) return;

        // Listen to job system integration events
        this.battleJobIntegration.on('rose_essence_gained', (data: any) => {
            this.emit('rose_essence_gained', data);
            this.log('Rose essence gained from boss defeat', {
                amount: data.amount,
                boss: data.bossInfo.name
            });
        });

        this.battleJobIntegration.on('rank_up_available', (data: any) => {
            this.emit('rank_up_available', data);
            this.log('Rank up candidates available', {
                candidates: data.candidates.length
            });
        });

        this.battleJobIntegration.on('job_battle_modification_applied', (data: any) => {
            this.log('Job battle modifications applied', {
                unit: data.unit.name,
                job: data.job.name,
                modifiers: data.modification.damageModifiers.length
            });
        });

        this.battleJobIntegration.on('job_effects_applied_to_battle', (data: any) => {
            this.log('Job effects applied to battle result', {
                attacker: data.attackerJob?.name || 'none',
                defender: data.targetJob?.name || 'none'
            });
        });
    }

    /**
     * Initialize battle system with units and map data
     * @param units - All units in the battle
     * @param mapData - Map data for range calculations
     */
    public initialize(units: Unit[], mapData?: MapData): void {
        this.allUnits = [...units];
        this.mapData = mapData || null;

        // Update subsystems with new data
        // Note: MapRenderer integration would be handled in a full implementation
        // For now, we skip setting the map renderer to avoid compatibility issues

        this.log('BattleSystem initialized', { unitCount: units.length, hasMapData: !!mapData });
    }

    /**
     * Initiate attack flow for a unit with their weapon
     * @param attacker - Unit performing the attack
     * @param weapon - Weapon being used (optional, will use unit's equipped weapon)
     * @returns Promise that resolves when attack flow is ready
     */
    public async initiateAttack(attacker: Unit, weapon?: Weapon): Promise<void> {
        const debugTimestamp = this.debugManager.logBattlePhaseStart('range_calculation', attacker);

        try {
            // Validate attack initiation
            const validation = this.validateAttackInitiation(attacker, weapon);
            if (!validation.success) {
                throw new Error(`${validation.error}: ${validation.message}`);
            }

            // Get weapon (use provided weapon or unit's equipped weapon)
            const attackWeapon = weapon || this.getUnitWeapon(attacker);
            if (!attackWeapon) {
                throw new Error(`${BattleError.NO_WEAPON_EQUIPPED}: Unit has no weapon equipped`);
            }

            // Update state
            this.state.phase = 'range_display';
            this.state.currentAttacker = attacker;
            this.state.currentWeapon = attackWeapon;
            this.state.currentTarget = null;
            this.state.isActive = true;

            // Initialize target selection
            const selectionResult = this.targetSelector.initializeSelection(
                attacker,
                attackWeapon,
                this.allUnits,
                this.mapData || undefined
            );

            // Show attack range
            this.showAttackRange(attacker, attackWeapon, selectionResult.attackRange);

            // Update state to target selection
            this.state.phase = 'target_selection';

            this.emit('attack-initiated', {
                attacker,
                weapon: attackWeapon,
                validTargets: selectionResult.validTargets,
                attackRange: selectionResult.attackRange,
            });

            this.log('Attack initiated', {
                attacker: attacker.name,
                weapon: attackWeapon.name,
                validTargetCount: selectionResult.validTargets.length,
            });

            // Log debug completion
            this.debugManager.logBattlePhaseEnd(debugTimestamp, {
                baseDamage: 0, // Not calculated yet
                hitChance: 0,
                criticalChance: 0,
                evasionChance: 0,
            });
        } catch (error) {
            this.debugManager.logBattlePhaseEnd(
                debugTimestamp,
                undefined,
                undefined,
                (error as Error).message
            );
            this.handleBattleError(error as Error, {
                attacker,
                weapon,
                phase: 'range_calculation',
            });
            throw error;
        }
    }

    /**
     * Show attack range with visual highlights
     * @param attacker - Unit performing the attack
     * @param weapon - Weapon being used
     * @param attackRange - Positions within attack range
     */
    public showAttackRange(attacker: Unit, weapon: Weapon, attackRange?: Position[]): void {
        try {
            // Clear existing highlights
            this.clearRangeHighlights();

            // Calculate attack range if not provided (with caching)
            let rangePositions = attackRange;
            if (!rangePositions) {
                const operationId = `${attacker.id}_${weapon.id}`;
                this.performanceMonitor.startOperation('rangeCalculation', operationId);

                const rangeResult = this.performanceManager.getCachedAttackRange(
                    attacker,
                    weapon,
                    this.mapData || undefined,
                    (a, w, m) => this.attackRangeCalculator.calculateAttackRange(a, w, m)
                );

                this.performanceMonitor.endOperation('rangeCalculation', operationId);

                rangePositions = rangeResult?.validPositions || [];
            }

            // Create visual highlights for attack range
            const graphics = this.scene.add.graphics();
            graphics.fillStyle(0x00ff00, 0.3); // Green with transparency
            graphics.lineStyle(2, 0x00ff00, 0.8);

            for (const position of rangePositions) {
                const screenX = position.x * 32; // Assuming 32px tile size
                const screenY = position.y * 32;

                graphics.fillRect(screenX, screenY, 32, 32);
                graphics.strokeRect(screenX, screenY, 32, 32);
            }

            this.rangeHighlights.push(graphics);

            this.emit('attack-range-shown', {
                attacker,
                weapon,
                rangePositions,
                rangeCount: rangePositions.length,
            });

            this.log('Attack range displayed', {
                attacker: attacker.name,
                weapon: weapon.name,
                rangeCount: rangePositions.length,
            });

            // Show attack range debug if enabled
            if (this.debugManager) {
                const validTargets = this.allUnits
                    .filter(unit => unit.faction !== attacker.faction && unit.currentHP > 0)
                    .filter(unit =>
                        rangePositions.some(pos => pos.x === unit.position.x && pos.y === unit.position.y)
                    )
                    .map(unit => unit.position);

                const invalidTargets = this.allUnits
                    .filter(unit => unit.faction !== attacker.faction && unit.currentHP > 0)
                    .filter(
                        unit =>
                            !rangePositions.some(pos => pos.x === unit.position.x && pos.y === unit.position.y)
                    )
                    .map(unit => unit.position);

                this.debugManager.showAttackRangeDebug(
                    attacker.position,
                    rangePositions,
                    validTargets,
                    invalidTargets
                );
            }
        } catch (error) {
            this.handleBattleError(error as Error, {
                attacker,
                weapon,
                phase: 'range_calculation',
            });
        }
    }

    /**
     * Select target and execute battle
     * @param target - Unit to target
     * @param options - Battle execution options
     * @returns Promise that resolves with battle result
     */
    public async selectTarget(target: Unit, options?: BattleExecutionOptions): Promise<BattleResult> {
        const debugTimestamp = this.debugManager.logBattlePhaseStart(
            'target_selection',
            this.state.currentAttacker!,
            target
        );

        try {
            // Validate target selection
            if (this.state.phase !== 'target_selection') {
                throw new Error(`${BattleError.BATTLE_SYSTEM_ERROR}: Invalid phase for target selection`);
            }

            if (!this.state.currentAttacker || !this.state.currentWeapon) {
                throw new Error(`${BattleError.BATTLE_SYSTEM_ERROR}: No active attack in progress`);
            }

            // Select target using target selector
            const selectionSuccess = this.targetSelector.selectTarget(target);
            if (!selectionSuccess) {
                throw new Error(`${BattleError.INVALID_TARGET}: Target selection failed`);
            }

            // Update state
            this.state.currentTarget = target;
            this.state.phase = 'battle_execution';

            // Show target highlights
            this.showTargetHighlights(target);

            // Execute battle
            const battleResult = await this.executeBattle(
                this.state.currentAttacker,
                target,
                this.state.currentWeapon,
                options
            );

            this.emit('target-selected', {
                attacker: this.state.currentAttacker,
                target,
                weapon: this.state.currentWeapon,
                battleResult,
            });

            // Log debug completion
            this.debugManager.logBattlePhaseEnd(debugTimestamp, undefined, battleResult);

            return battleResult;
        } catch (error) {
            this.debugManager.logBattlePhaseEnd(
                debugTimestamp,
                undefined,
                undefined,
                (error as Error).message
            );
            this.handleBattleError(error as Error, {
                attacker: this.state.currentAttacker || undefined,
                target,
                weapon: this.state.currentWeapon || undefined,
                phase: 'target_selection',
            });
            throw error;
        }
    }

    /**
     * Cancel current attack and reset state
     */
    public cancelAttack(): void {
        try {
            const wasActive = this.state.isActive;
            const currentAttacker = this.state.currentAttacker;

            // Clear visual highlights
            this.clearRangeHighlights();
            this.clearTargetHighlights();

            // Clear target selection
            this.targetSelector.clearSelection();

            // Reset state
            this.state = {
                phase: 'idle',
                currentAttacker: null,
                currentWeapon: null,
                currentTarget: null,
                isActive: false,
                isAnimating: false,
                lastBattleResult: this.state.lastBattleResult,
            };

            if (wasActive) {
                this.emit('attack-cancelled', {
                    attacker: currentAttacker,
                    reason: 'user_cancelled',
                });

                this.log('Attack cancelled', {
                    attacker: currentAttacker?.name || 'unknown',
                });
            }
        } catch (error) {
            this.handleBattleError(error as Error, {
                phase: 'cleanup',
            });
        }
    }

    /**
     * Execute skill action through battle system integration
     * @param action - Skill action to execute
     * @returns Promise that resolves with skill action result
     */
    public async executeSkillAction(action: SkillAction): Promise<SkillActionResult> {
        const executionStartTime = performance.now();
        const debugTimestamp = this.debugManager.logBattlePhaseStart(
            'skill_execution',
            action.caster,
            undefined
        );

        try {
            this.log('Executing skill action', {
                skillId: action.skillId,
                caster: action.caster.name,
                targetPosition: action.targetPosition
            });

            // Validate skill system integration
            if (!this.skillSystem) {
                throw new Error('Skill system not integrated with battle system');
            }

            // Validate caster
            if (!action.caster || action.caster.currentHP <= 0) {
                throw new Error('Invalid or defeated caster');
            }

            // Check if caster has already acted
            if (action.caster.hasActed && !action.options?.forceBattle) {
                throw new Error('Caster has already acted this turn');
            }

            // Create skill execution context
            const context: SkillExecutionContext = {
                caster: action.caster.id,
                skillId: action.skillId,
                targetPosition: action.targetPosition,
                battlefieldState: this.createBattlefieldState(),
                currentTurn: this.getCurrentTurn(),
                executionTime: new Date()
            };

            // Execute skill through skill system
            const skillResult = await this.skillSystem.useSkill(
                action.skillId,
                action.caster.id,
                action.targetPosition,
                true // Skip UI for battle system integration
            );

            if (!skillResult.success) {
                return {
                    success: false,
                    battleResults: [],
                    error: {
                        error: BattleError.BATTLE_SYSTEM_ERROR,
                        message: skillResult.error?.message || 'Skill execution failed',
                        context: {
                            attacker: action.caster,
                            phase: 'skill_execution'
                        },
                        timestamp: Date.now(),
                        recoverable: true,
                        suggestedAction: 'Try again or select different skill'
                    }
                };
            }

            // Process skill results and integrate with battle system
            const battleResults = await this.processSkillResults(
                action,
                skillResult.result!,
                action.options
            );

            // Update battle state based on skill effects
            await this.updateBattleStateFromSkill(action, skillResult.result!, battleResults);

            // Calculate additional information
            const additionalInfo = this.calculateSkillActionInfo(
                skillResult.result!,
                battleResults,
                executionStartTime
            );

            const finalResult: SkillActionResult = {
                success: true,
                skillResult: skillResult.result!,
                battleResults,
                additionalInfo
            };

            // Log debug completion
            this.debugManager.logBattlePhaseEnd(debugTimestamp, undefined, finalResult);

            // Emit skill action completed event
            this.emit('skill-action-completed', {
                action,
                result: finalResult,
                executionTime: additionalInfo.executionTime
            });

            this.log('Skill action completed successfully', {
                skillId: action.skillId,
                caster: action.caster.name,
                affectedUnits: additionalInfo.affectedUnits.length,
                totalDamage: additionalInfo.totalDamageDealt,
                executionTime: additionalInfo.executionTime
            });

            return finalResult;

        } catch (error) {
            const errorResult: SkillActionResult = {
                success: false,
                battleResults: [],
                error: {
                    error: BattleError.BATTLE_SYSTEM_ERROR,
                    message: `Skill action execution error: ${(error as Error).message}`,
                    context: {
                        attacker: action.caster,
                        phase: 'skill_execution'
                    },
                    timestamp: Date.now(),
                    recoverable: true,
                    suggestedAction: 'Check skill conditions and try again'
                }
            };

            this.debugManager.logBattlePhaseEnd(
                debugTimestamp,
                undefined,
                undefined,
                (error as Error).message
            );

            this.emit('skill-action-error', {
                action,
                error: errorResult.error,
                executionTime: performance.now() - executionStartTime
            });

            this.log('Skill action execution failed', {
                error: (error as Error).message,
                skillId: action.skillId,
                caster: action.caster.name
            });

            return errorResult;
        }
    }

    /**
     * Handle boss defeat and rose essence gain
     * @param defeatedUnit - The defeated boss unit
     * @param defeatingUnit - The unit that defeated the boss
     * @returns Promise that resolves when boss defeat processing is complete
     */
    public async handleBossDefeat(defeatedUnit: Unit, defeatingUnit: Unit): Promise<void> {
        if (!this.battleJobIntegration) {
            this.log('Job system not integrated, skipping boss defeat processing');
            return;
        }

        try {
            // Check if the defeated unit is a boss
            if (!this.isBossUnit(defeatedUnit)) {
                return;
            }

            // Create boss info from defeated unit
            const bossInfo = this.createBossInfo(defeatedUnit);

            // Handle boss defeat through job integration
            const gainedRoseEssence = await this.battleJobIntegration.handleBossDefeat(
                bossInfo,
                defeatingUnit
            );

            // Emit boss defeat event
            this.emit('boss_defeated', {
                boss: defeatedUnit,
                defeater: defeatingUnit,
                roseEssenceGained: gainedRoseEssence,
                bossInfo
            });

            this.log('Boss defeat processed', {
                boss: defeatedUnit.name,
                defeater: defeatingUnit.name,
                roseEssence: gainedRoseEssence
            });

        } catch (error) {
            this.log('Error processing boss defeat', { error: error.message });
            this.handleBattleError(error as Error, {
                attacker: defeatingUnit,
                target: defeatedUnit,
                phase: 'result'
            });
        }
    }

    /**
     * Apply job modifications to battle calculation
     * @param attacker - Attacking unit
     * @param target - Target unit
     * @param weapon - Weapon being used
     * @returns Modified battle parameters
     */
    public applyJobModificationsToBattle(
        attacker: Unit,
        target: Unit,
        weapon: Weapon
    ): {
        attackerMods: any;
        defenderMods: any;
        modifiedWeapon: Weapon
    } {
        let attackerMods = null;
        let defenderMods = null;
        let modifiedWeapon = { ...weapon };

        if (this.battleJobIntegration) {
            try {
                // Apply attacker job modifications
                attackerMods = this.battleJobIntegration.applyJobBattleModifications(
                    attacker,
                    weapon,
                    target
                );

                // Apply defender job modifications (for defensive bonuses)
                defenderMods = this.battleJobIntegration.applyJobBattleModifications(
                    target,
                    weapon,
                    attacker
                );

                // Modify weapon stats based on job compatibility
                if (attackerMods?.accuracyModifier) {
                    modifiedWeapon.accuracy = Math.max(0, Math.min(100,
                        weapon.accuracy + attackerMods.accuracyModifier
                    ));
                }

                if (attackerMods?.criticalRateModifier) {
                    modifiedWeapon.criticalRate = Math.max(0, Math.min(100,
                        weapon.criticalRate + attackerMods.criticalRateModifier
                    ));
                }

            } catch (error) {
                this.log('Error applying job modifications', { error: error.message });
            }
        }

        return { attackerMods, defenderMods, modifiedWeapon };
    }

    /**
     * Apply job effects to battle result
     * @param battleResult - The battle result to modify
     * @returns Modified battle result
     */
    public applyJobEffectsToBattleResult(battleResult: BattleResult): BattleResult {
        if (!this.battleJobIntegration) {
            return battleResult;
        }

        try {
            return this.battleJobIntegration.applyJobEffectsToBattleResult(battleResult);
        } catch (error) {
            this.log('Error applying job effects to battle result', { error: error.message });
            return battleResult;
        }
    }

    /**
     * Show job aura effect during battle
     * @param unit - Unit to show aura for
     * @param duration - Duration in milliseconds
     */
    public showJobAuraInBattle(unit: Unit, duration: number = 3000): void {
        if (this.battleJobIntegration) {
            this.battleJobIntegration.showJobAuraInBattle(unit, duration);
        }
    }

    // =============================================================================
    // Private helper methods for job system integration
    // =============================================================================

    /**
     * Get boss data for AI system integration
     * @param unitId - Unit ID to check
     * @returns Boss data if unit is a boss, null otherwise
     */
    public getBossDataForAI(unitId: string): any | null {
        if (!this.victoryConditionSystem) {
            return null;
        }

        try {
            const bossSystem = this.victoryConditionSystem.getBossSystem();
            if (bossSystem && bossSystem.isBoss(unitId)) {
                return bossSystem.getBossData(unitId);
            }
        } catch (error) {
            this.log('Error getting boss data for AI', {
                error: error.message,
                unitId
            });
        }

        return null;
    }

    /**
     * Check if a unit is a boss (for AI system)
     * @param unitId - Unit ID to check
     * @returns True if unit is a boss
     */
    public isBossForAI(unitId: string): boolean {
        if (!this.victoryConditionSystem) {
            return this.isBossUnit({ id: unitId } as Unit);
        }

        try {
            const bossSystem = this.victoryConditionSystem.getBossSystem();
            return bossSystem ? bossSystem.isBoss(unitId) : false;
        } catch (error) {
            this.log('Error checking if unit is boss for AI', {
                error: error.message,
                unitId
            });
            return false;
        }
    }

    /**
     * Check if a unit is a boss
     * @param unit - Unit to check
     * @returns True if unit is a boss
     */
    private isBossUnit(unit: Unit): boolean {
        // Check various indicators that a unit is a boss
        return (
            unit.name.toLowerCase().includes('boss') ||
            unit.name.toLowerCase().includes('魔性の薔薇') ||
            (unit as any).isBoss === true ||
            (unit as any).bossType !== undefined ||
            unit.stats.maxHP > 200 // Simple heuristic for boss detection
        );
    }

    /**
     * Create boss info from a defeated unit
     * @param unit - The defeated boss unit
     * @returns Boss info object
     */
    private createBossInfo(unit: Unit): any {
        // Determine boss type based on unit properties
        let bossType = 'minor_boss';
        let roseEssenceReward = 10;

        if (unit.name.toLowerCase().includes('final') || unit.name.toLowerCase().includes('最終')) {
            bossType = 'final_boss';
            roseEssenceReward = 50;
        } else if (unit.name.toLowerCase().includes('chapter') || unit.name.toLowerCase().includes('章')) {
            bossType = 'chapter_boss';
            roseEssenceReward = 25;
        } else if (unit.stats.maxHP > 300) {
            bossType = 'major_boss';
            roseEssenceReward = 15;
        }

        // Check if this is first time defeat (simplified implementation)
        const isFirstTimeDefeat = !(unit as any).hasBeenDefeatedBefore;

        return {
            id: unit.id,
            name: unit.name,
            type: bossType,
            roseEssenceReward,
            isFirstTimeDefeat,
            stageId: (unit as any).stageId,
            chapterId: (unit as any).chapterId
        };
    }

    /**
     * Execute AI action through battle system
     * @param action - AI action to execute
     * @returns Promise that resolves with battle result
     */
    public async executeAIAction(action: any): Promise<BattleResult | null> {
        try {
            this.log('Executing AI action', {
                type: action.type,
                character: action.character?.name || 'unknown',
                target: action.target?.name || 'none'
            });

            switch (action.type) {
                case 'attack':
                    if (action.character && action.target) {
                        // Set up battle state for AI action
                        this.state.currentAttacker = action.character;
                        this.state.currentTarget = action.target;
                        this.state.currentWeapon = this.getUnitWeapon(action.character);
                        this.state.phase = 'battle_execution';
                        this.state.isActive = true;

                        // Execute battle directly
                        const battleResult = await this.executeBattle(
                            action.character,
                            action.target,
                            this.state.currentWeapon!,
                            { skipAnimations: false }
                        );

                        // Reset battle state
                        this.resetBattleState();

                        return battleResult;
                    }
                    break;

                case 'skill':
                    if (action.character && action.skillId) {
                        const skillAction = {
                            skillId: action.skillId,
                            caster: action.character,
                            targetPosition: action.targetPosition || action.target?.position || action.character.position,
                            options: { skipAnimations: false }
                        };

                        const skillResult = await this.executeSkillAction(skillAction);

                        // Return the first battle result if available
                        return skillResult.battleResults.length > 0 ? skillResult.battleResults[0] : null;
                    }
                    break;

                case 'move':
                    // Movement is handled by the movement system, not battle system
                    this.log('Move action delegated to movement system');
                    return null;

                case 'wait':
                    // Wait action doesn't require battle system processing
                    this.log('Wait action - no battle system processing needed');
                    return null;

                default:
                    this.log('Unknown AI action type', { type: action.type });
                    return null;
            }

            return null;
        } catch (error) {
            this.log('Error executing AI action', {
                error: (error as Error).message,
                action: action.type
            });
            throw error;
        }
    }

    /**
     * Reset battle state after AI action
     */
    private resetBattleState(): void {
        this.state = {
            phase: 'idle',
            currentAttacker: null,
            currentWeapon: null,
            currentTarget: null,
            isActive: false,
            isAnimating: false,
            lastBattleResult: this.state.lastBattleResult,
        };
    }

    /**
     * Notify battle system of AI action completion
     * @param action - Completed AI action
     * @param result - Action result
     */
    public notifyAIActionComplete(action: any, result: any): void {
        this.emit('ai-action-completed', {
            action,
            result,
            timestamp: Date.now()
        });

        this.log('AI action completed', {
            type: action.type,
            character: action.character?.name || 'unknown',
            success: result?.success !== false
        });
    }

    /**
     * Check if a unit can attack
     * @param attacker - Unit to check
     * @param weapon - Weapon to use (optional)
     * @returns True if unit can attack
     */
    public canAttack(attacker: Unit, weapon?: Weapon): boolean {
        try {
            // Basic validation
            if (!attacker) {
                return false;
            }

            // Check if unit is alive
            if (attacker.currentHP <= 0) {
                return false;
            }

            // Check if unit has already acted
            if (attacker.hasActed) {
                return false;
            }

            // Check weapon availability
            const attackWeapon = weapon || this.getUnitWeapon(attacker);
            if (!attackWeapon) {
                return false;
            }

            // Check weapon durability if applicable
            if (attackWeapon.durability !== undefined && attackWeapon.durability <= 0) {
                return false;
            }

            // Check if there are valid targets
            const rangeResult = this.attackRangeCalculator.calculateAttackRange(
                attacker,
                attackWeapon,
                this.mapData || undefined
            );

            // Temporarily initialize target selector to check for valid targets
            const tempSelectionResult = this.targetSelector.initializeSelection(
                attacker,
                attackWeapon,
                this.allUnits,
                this.mapData || undefined
            );
            const validTargets = tempSelectionResult.validTargets;

            // Clear the temporary selection
            this.targetSelector.clearSelection();
            if (validTargets.length === 0) {
                return false;
            }

            return true;
        } catch (error) {
            this.log('Error checking attack capability', { error: error.message });
            return false;
        }
    }

    /**
     * Create battlefield state for skill system integration
     * @returns Battlefield state object
     */
    private createBattlefieldState(): any {
        return {
            getCharacter: (characterId: string) => {
                return this.allUnits.find(unit => unit.id === characterId);
            },
            getCharacterAt: (position: Position) => {
                return this.allUnits.find(unit =>
                    unit.position.x === position.x && unit.position.y === position.y
                );
            },
            getCurrentPlayer: () => {
                // This would be provided by the game state manager in full implementation
                return 'player';
            },
            getCurrentTurn: () => {
                return this.getCurrentTurn();
            },
            updateCharacterState: (characterId: string, updates: any) => {
                const character = this.allUnits.find(unit => unit.id === characterId);
                if (character) {
                    Object.assign(character, updates);
                }
            },
            applyDamage: (targetId: string, damage: number) => {
                const target = this.allUnits.find(unit => unit.id === targetId);
                if (target) {
                    target.currentHP = Math.max(0, target.currentHP - damage);
                    return true;
                }
                return false;
            },
            applyHealing: (targetId: string, healing: number) => {
                const target = this.allUnits.find(unit => unit.id === targetId);
                if (target) {
                    target.currentHP = Math.min(target.stats.maxHP, target.currentHP + healing);
                    return true;
                }
                return false;
            },
            applyStatusEffect: (targetId: string, effect: any) => {
                // Status effect application would be handled by a status effect manager
                // For now, just return success
                return true;
            },
            removeStatusEffect: (targetId: string, effectId: string) => {
                // Status effect removal would be handled by a status effect manager
                return true;
            }
        };
    }

    /**
     * Get current turn number
     * @returns Current turn number
     */
    private getCurrentTurn(): number {
        // This would be provided by the turn manager in full implementation
        return 1;
    }

    /**
     * Create game state for victory/defeat condition checking
     * @returns Game state object
     */
    private createGameStateForConditionCheck(): any {
        return {
            currentTurn: this.getCurrentTurn(),
            activePlayer: 'player', // This would come from turn manager
            phase: 'select',
            gameResult: null,
            turnOrder: this.allUnits.filter(u => u.currentHP > 0),
            activeUnitIndex: 0,
        };
    }

    /**
     * Process skill results and create corresponding battle results
     * @param action - Original skill action
     * @param skillResult - Result from skill execution
     * @param options - Execution options
     * @returns Array of battle results
     */
    private async processSkillResults(
        action: SkillAction,
        skillResult: SkillResult,
        options?: BattleExecutionOptions
    ): Promise<BattleResult[]> {
        const battleResults: BattleResult[] = [];

        // Process each effect result
        for (const effect of skillResult.effects) {
            if (!effect.success) {
                continue;
            }

            const target = this.allUnits.find(unit => unit.id === effect.targetId);
            if (!target) {
                continue;
            }

            // Create battle result based on effect type
            const battleResult: BattleResult = {
                attacker: action.caster,
                target,
                weapon: this.createSkillWeapon(action.skillId, effect),
                baseDamage: effect.actualValue,
                finalDamage: effect.actualValue,
                modifiers: [],
                isCritical: effect.isCritical || false,
                isEvaded: false,
                experienceGained: this.calculateSkillExperience(effect),
                targetDefeated: target.currentHP <= 0,
                effectsApplied: [],
                timestamp: Date.now()
            };

            // Apply damage calculation integration if it's a damage effect
            if (effect.effectType === 'damage') {
                await this.integrateSkillDamageCalculation(battleResult, effect);
            }

            // Apply healing integration if it's a heal effect
            if (effect.effectType === 'heal') {
                await this.integrateSkillHealingCalculation(battleResult, effect);
            }

            // Process character loss if target was defeated
            if (battleResult.targetDefeated && target.faction === 'player' && this.characterLossManager) {
                try {
                    const lossCause = CharacterLossUtils.createSkillDefeatCause(
                        action.caster.id,
                        action.caster.name,
                        action.skillId,
                        effect.actualValue
                    );
                    await this.characterLossManager.processCharacterLoss(target, lossCause);
                } catch (error) {
                    this.log('Error processing character loss from skill', {
                        error: (error as Error).message,
                        target: target.name,
                        skill: action.skillId
                    });
                }
            }

            battleResults.push(battleResult);
        }

        return battleResults;
    }

    /**
     * Update battle state based on skill effects
     * @param action - Original skill action
     * @param skillResult - Skill execution result
     * @param battleResults - Generated battle results
     */
    private async updateBattleStateFromSkill(
        action: SkillAction,
        skillResult: SkillResult,
        battleResults: BattleResult[]
    ): Promise<void> {
        // Mark caster as having acted
        action.caster.hasActed = true;

        // Update battle state manager with skill results
        for (const battleResult of battleResults) {
            this.battleStateManager.recordBattleResult(battleResult);

            // Grant experience to caster through experience system integration
            if (battleResult.experienceGained > 0) {
                // Process skill experience through experience system
                const skillExperience = this.processSkillExperience(
                    action.caster,
                    action.skillId,
                    [battleResult.target],
                    {
                        totalDamage: battleResult.finalDamage,
                        totalHealing: battleResult.effectsApplied.length > 0 ? battleResult.finalDamage : 0,
                        effectsApplied: battleResult.effectsApplied.length
                    }
                );

                // Update battle result with actual experience gained
                battleResult.experienceGained = skillExperience;

                // Also use legacy system for compatibility
                this.battleStateManager.grantExperience(
                    action.caster,
                    skillExperience,
                    battleResult
                );
            }
        }

        // Update post-battle state
        this.battleStateManager.updatePostBattle(
            battleResults[0] || this.createDefaultBattleResult(action),
            this.allUnits
        );

        // Add to battle history
        this.battleHistory.push(...battleResults);
    }

    /**
     * Calculate additional information for skill action result
     * @param skillResult - Skill execution result
     * @param battleResults - Generated battle results
     * @param startTime - Execution start time
     * @returns Additional information object
     */
    private calculateSkillActionInfo(
        skillResult: SkillResult,
        battleResults: BattleResult[],
        startTime: number
    ): SkillActionResult['additionalInfo'] {
        const affectedUnits = battleResults.map(result => result.target);
        const totalDamageDealt = battleResults
            .filter(result => result.finalDamage > 0)
            .reduce((total, result) => total + result.finalDamage, 0);
        const totalHealingDone = battleResults
            .filter(result => result.finalDamage < 0) // Negative damage = healing
            .reduce((total, result) => total + Math.abs(result.finalDamage), 0);
        const statusEffectsApplied = skillResult.effects
            .filter(effect => effect.success && ['buff', 'debuff', 'status'].includes(effect.effectType))
            .length;

        return {
            affectedUnits,
            totalDamageDealt,
            totalHealingDone,
            statusEffectsApplied,
            executionTime: performance.now() - startTime
        };
    }

    /**
     * Create a weapon representation for skill effects
     * @param skillId - Skill ID
     * @param effect - Skill effect result
     * @returns Weapon object for battle result
     */
    private createSkillWeapon(skillId: string, effect: any): Weapon {
        return {
            id: `skill_${skillId}`,
            name: `Skill: ${skillId}`,
            type: WeaponType.STAFF, // Default to staff for skills
            attackPower: effect.actualValue,
            range: 1,
            rangePattern: {
                type: 'single',
                range: 1,
                pattern: [{ x: 0, y: 0 }]
            },
            element: Element.NONE,
            criticalRate: 0,
            accuracy: 100,
            specialEffects: [],
            description: `Skill effect: ${effect.effectType}`
        };
    }

    /**
     * Calculate experience gained from skill effect
     * @param effect - Skill effect result
     * @returns Experience points
     */
    private calculateSkillExperience(effect: any): number {
        // This method now serves as a fallback when experience system is not integrated
        // The actual experience calculation is handled by processSkillExperience method
        if (this.experienceSystem) {
            // Experience system will handle the calculation
            return 0;
        }

        // Fallback calculation when experience system is not available
        switch (effect.effectType) {
            case 'damage':
                return Math.floor(effect.actualValue * 0.1);
            case 'heal':
                return Math.floor(effect.actualValue * 0.05);
            case 'buff':
            case 'debuff':
            case 'status':
                return 5;
            default:
                return 1;
        }
    }

    /**
     * Integrate skill damage with existing damage calculation system
     * @param battleResult - Battle result to modify
     * @param effect - Skill effect
     */
    private async integrateSkillDamageCalculation(
        battleResult: BattleResult,
        effect: any
    ): Promise<void> {
        // Apply damage calculation modifiers if available
        const damageContext = this.damageCalculator.performCompleteCalculation(
            battleResult.attacker,
            battleResult.target,
            battleResult.weapon
        );

        // Update battle result with calculated values
        battleResult.baseDamage = damageContext.baseDamage;
        battleResult.finalDamage = Math.max(effect.actualValue, damageContext.finalDamage);
        battleResult.modifiers = damageContext.modifiers;
        battleResult.isCritical = effect.isCritical || damageContext.isCritical;
        battleResult.isEvaded = damageContext.isEvaded;
    }

    /**
     * Integrate skill healing with battle system
     * @param battleResult - Battle result to modify
     * @param effect - Skill effect
     */
    private async integrateSkillHealingCalculation(
        battleResult: BattleResult,
        effect: any
    ): Promise<void> {
        // For healing, use negative damage to represent healing
        battleResult.finalDamage = -Math.abs(effect.actualValue);
        battleResult.baseDamage = battleResult.finalDamage;
        battleResult.targetDefeated = false; // Healing can't defeat
    }

    /**
     * Create default battle result for skill actions
     * @param action - Skill action
     * @returns Default battle result
     */
    private createDefaultBattleResult(action: SkillAction): BattleResult {
        return {
            attacker: action.caster,
            target: action.caster, // Self-target as default
            weapon: this.createSkillWeapon(action.skillId, { actualValue: 0, effectType: 'none' }),
            baseDamage: 0,
            finalDamage: 0,
            modifiers: [],
            isCritical: false,
            isEvaded: false,
            experienceGained: 0,
            targetDefeated: false,
            effectsApplied: [],
            timestamp: Date.now()
        };
    }

    /**
     * Execute battle between attacker and target
     * @param attacker - Attacking unit
     * @param target - Target unit
     * @param weapon - Weapon being used
     * @param options - Battle execution options
     * @returns Promise that resolves with battle result
     */
    private async executeBattle(
        attacker: Unit,
        target: Unit,
        weapon: Weapon,
        options?: BattleExecutionOptions
    ): Promise<BattleResult> {
        const debugTimestamp = this.debugManager.logBattlePhaseStart(
            'damage_calculation',
            attacker,
            target
        );

        try {
            this.state.phase = 'battle_execution';
            const battleStartTime = performance.now();
            const battleId = `${attacker.id}_vs_${target.id}_${Date.now()}`;

            // Start performance monitoring for battle execution
            this.performanceMonitor.startOperation('totalBattleTime', battleId);
            this.performanceMonitor.startOperation('damageCalculation', battleId);

            // Apply job modifications to battle parameters
            const jobMods = this.applyJobModificationsToBattle(attacker, target, weapon);
            const modifiedWeapon = jobMods.modifiedWeapon;

            // Combine custom modifiers with job modifiers
            const allModifiers = [
                ...(options?.customModifiers || []),
                ...(jobMods.attackerMods?.damageModifiers || []),
                ...(jobMods.defenderMods?.damageModifiers || [])
            ];

            // Calculate damage with job modifications
            const damageContext = this.damageCalculator.performCompleteCalculation(
                attacker,
                target,
                modifiedWeapon,
                allModifiers
            );

            this.performanceMonitor.endOperation('damageCalculation', battleId);

            // Create battle result
            let battleResult: BattleResult = {
                attacker,
                target,
                weapon: modifiedWeapon,
                baseDamage: damageContext.baseDamage,
                finalDamage: damageContext.finalDamage,
                modifiers: damageContext.modifiers,
                isCritical: damageContext.isCritical,
                isEvaded: damageContext.isEvaded,
                experienceGained: 0, // Will be calculated later
                targetDefeated: false, // Will be determined after damage application
                effectsApplied: [],
                timestamp: Date.now(),
            };

            // Apply job effects to battle result
            battleResult = this.applyJobEffectsToBattleResult(battleResult);

            // Play animations if enabled
            if (this.config.enableAnimations && !options?.skipAnimations) {
                this.state.isAnimating = true;
                this.state.phase = 'animation';

                this.performanceMonitor.startOperation('animationExecution', battleId);

                // Show job aura for attacker during attack
                this.showJobAuraInBattle(attacker, 2000);

                await this.battleAnimator.playAttackAnimation(attacker, target, modifiedWeapon);

                if (!damageContext.isEvaded) {
                    const damageType = damageContext.isCritical ? DamageType.CRITICAL : DamageType.PHYSICAL;
                    await this.battleAnimator.showDamageEffect(target, damageContext.finalDamage, damageType);
                }

                this.performanceMonitor.endOperation('animationExecution', battleId);
            }

            // Apply damage if not evaded
            if (!damageContext.isEvaded) {
                this.performanceMonitor.startOperation('stateUpdate', battleId);

                const oldHP = target.currentHP;

                // Check recruitment eligibility before applying damage
                let recruitmentResult: RecruitmentResult | null = null;
                if (this.recruitmentSystem && target.faction === 'enemy') {
                    try {
                        recruitmentResult = this.recruitmentSystem.checkRecruitmentEligibility(
                            attacker,
                            target,
                            {
                                damage: damageContext.finalDamage,
                                turn: 1, // This would come from game state in full implementation
                                battleResult: battleResult,
                            }
                        );
                    } catch (error) {
                        this.log('Error checking recruitment eligibility', { error: error.message });
                        recruitmentResult = null;
                    }
                }

                const damageResult = this.battleStateManager.applyDamage(target, damageContext.finalDamage);

                if (!damageResult.success) {
                    throw new Error(`Failed to apply damage: ${damageResult.message}`);
                }

                // Check if target was defeated
                battleResult.targetDefeated = target.currentHP <= 0;

                // Handle boss defeat if target was defeated and is a boss
                if (battleResult.targetDefeated && this.isBossUnit(target)) {
                    try {
                        await this.handleBossDefeat(target, attacker);
                        
                        // Notify victory condition system of boss defeat
                        if (this.victoryConditionSystem) {
                            try {
                                await this.victoryConditionSystem.handleBossDefeat(target);
                                this.log('Victory condition system notified of boss defeat', {
                                    boss: target.name,
                                    bossId: target.id
                                });
                            } catch (vcError) {
                                this.log('Error notifying victory condition system of boss defeat', {
                                    error: vcError.message,
                                    boss: target.name
                                });
                            }
                        }
                    } catch (error) {
                        this.log('Error handling boss defeat', { error: error.message });
                        // Don't throw - battle should continue even if boss defeat handling fails
                    }
                }

                // Notify victory condition system of enemy defeat
                if (battleResult.targetDefeated && target.faction === 'enemy' && this.victoryConditionSystem) {
                    try {
                        this.victoryConditionSystem.recordEnemyDefeat(target.id);
                        this.log('Victory condition system notified of enemy defeat', {
                            enemy: target.name,
                            enemyId: target.id
                        });
                    } catch (vcError) {
                        this.log('Error notifying victory condition system of enemy defeat', {
                            error: vcError.message,
                            enemy: target.name
                        });
                    }
                }

                // Process recruitment if target was defeated and conditions are met
                if (
                    battleResult.targetDefeated &&
                    recruitmentResult?.success &&
                    recruitmentResult.nextAction === RecruitmentAction.CONVERT_TO_NPC
                ) {
                    try {
                        const recruitmentAttemptResult = this.recruitmentSystem!.processRecruitmentAttempt(
                            attacker,
                            target,
                            damageContext.finalDamage,
                            battleResult,
                            1 // Current turn - would come from game state
                        );

                        if (
                            recruitmentAttemptResult.success &&
                            recruitmentAttemptResult.nextAction === RecruitmentAction.CONVERT_TO_NPC
                        ) {
                            // Target was converted to NPC - restore HP to 1 and change faction
                            target.currentHP = 1;
                            target.faction = 'npc' as any; // NPC faction
                            battleResult.targetDefeated = false; // Target is now NPC, not defeated

                            this.log('Target converted to NPC during battle', {
                                attacker: attacker.name,
                                target: target.name,
                                recruitmentId: recruitmentAttemptResult.npcState?.recruitmentId,
                            });

                            // Emit recruitment conversion event
                            this.emit('recruitment-conversion', {
                                attacker,
                                target,
                                weapon,
                                recruitmentResult: recruitmentAttemptResult,
                                battleResult,
                            });
                        }
                    } catch (recruitmentError) {
                        this.log('Error processing recruitment attempt', {
                            error: recruitmentError.message,
                            attacker: attacker.name,
                            target: target.name,
                        });
                        // Continue with normal battle flow if recruitment fails
                    }
                }

                this.performanceMonitor.endOperation('stateUpdate', battleId);

                // Animate HP change
                if (this.config.enableAnimations && !options?.skipAnimations) {
                    await this.battleAnimator.animateHPChange(target, oldHP, target.currentHP);
                }

                // Check for boss phase change if target is a boss and still alive
                if (!battleResult.targetDefeated && this.isBossUnit(target) && this.victoryConditionSystem) {
                    try {
                        const bossSystem = this.victoryConditionSystem.getBossSystem();
                        if (bossSystem && bossSystem.isBoss(target.id)) {
                            const phaseChanged = bossSystem.checkPhaseChange(target);
                            if (phaseChanged) {
                                this.log('Boss phase changed during battle', {
                                    boss: target.name,
                                    currentHP: target.currentHP,
                                    maxHP: target.stats.maxHP
                                });
                                
                                this.emit('boss-phase-changed-in-battle', {
                                    boss: target,
                                    battleResult,
                                    timestamp: Date.now()
                                });
                            }
                        }
                    } catch (phaseError) {
                        this.log('Error checking boss phase change', {
                            error: phaseError.message,
                            boss: target.name
                        });
                    }
                }

                // Play defeat animation if target was defeated
                if (
                    battleResult.targetDefeated &&
                    this.config.enableAnimations &&
                    !options?.skipAnimations
                ) {
                    await this.battleAnimator.playDefeatedAnimation(target);
                }

                // Process character loss if target was defeated and is a player character
                if (
                    battleResult.targetDefeated &&
                    target.faction === 'player' &&
                    this.characterLossManager
                ) {
                    try {
                        // Create loss cause based on battle result
                        const lossCause: LossCause = damageContext.isCritical
                            ? CharacterLossUtils.createCriticalDamageCause(
                                attacker.id,
                                attacker.name,
                                damageContext.finalDamage
                            )
                            : CharacterLossUtils.createBattleDefeatCause(
                                attacker.id,
                                attacker.name,
                                damageContext.finalDamage
                            );

                        // Process character loss
                        await this.characterLossManager.processCharacterLoss(target, lossCause);

                        this.log('Character loss processed for defeated unit', {
                            target: target.name,
                            attacker: attacker.name,
                            damage: damageContext.finalDamage,
                            critical: damageContext.isCritical,
                        });

                        // Notify victory condition system of unit lost
                        if (this.victoryConditionSystem) {
                            try {
                                this.victoryConditionSystem.recordUnitLost(target.id);
                                this.log('Victory condition system notified of unit lost', {
                                    unit: target.name,
                                    unitId: target.id
                                });
                            } catch (vcError) {
                                this.log('Error notifying victory condition system of unit lost', {
                                    error: vcError.message,
                                    unit: target.name
                                });
                            }
                        }

                        // Emit character loss event
                        this.emit('character-lost', {
                            unit: target,
                            cause: lossCause,
                            battleResult,
                        });
                    } catch (lossError) {
                        this.log('Error processing character loss', {
                            error: lossError.message,
                            target: target.name,
                            attacker: attacker.name,
                        });
                        // Don't throw - battle should continue even if loss processing fails
                    }
                }
            }

            // Grant experience to attacker through experience system integration
            battleResult.experienceGained = this.processExperienceGain(
                attacker,
                target,
                battleResult,
                weapon
            );

            // Record damage dealt and taken for victory condition system
            if (this.victoryConditionSystem && !damageContext.isEvaded) {
                try {
                    const damageDealt = attacker.faction === 'player' ? damageContext.finalDamage : 0;
                    const damageTaken = target.faction === 'player' ? damageContext.finalDamage : 0;
                    this.victoryConditionSystem.recordDamage(damageDealt, damageTaken);
                } catch (vcError) {
                    this.log('Error recording damage to victory condition system', {
                        error: vcError.message
                    });
                }
            }

            // Record battle result
            this.battleStateManager.recordBattleResult(battleResult);
            this.battleHistory.push(battleResult);

            // Update post-battle state
            this.battleStateManager.updatePostBattle(battleResult, this.allUnits);

            // Check victory and defeat conditions after battle
            if (this.victoryConditionSystem) {
                try {
                    // Create game state for condition checking
                    const gameState = this.createGameStateForConditionCheck();
                    
                    // Check victory conditions
                    const victoryResult = this.victoryConditionSystem.checkVictoryConditions(gameState);
                    if (victoryResult.isVictory) {
                        this.log('Victory conditions met after battle', {
                            attacker: attacker.name,
                            target: target.name
                        });
                        
                        this.emit('victory-conditions-met-after-battle', {
                            battleResult,
                            victoryResult,
                            timestamp: Date.now()
                        });
                    }
                    
                    // Check defeat conditions
                    const defeatResult = this.victoryConditionSystem.checkDefeatConditions(gameState);
                    if (defeatResult.isDefeat) {
                        this.log('Defeat conditions met after battle', {
                            attacker: attacker.name,
                            target: target.name,
                            reason: defeatResult.message
                        });
                        
                        this.emit('defeat-conditions-met-after-battle', {
                            battleResult,
                            defeatResult,
                            timestamp: Date.now()
                        });
                    }
                } catch (vcError) {
                    this.log('Error checking victory/defeat conditions after battle', {
                        error: vcError.message
                    });
                }
            }

            // Update system state
            this.state.lastBattleResult = battleResult;
            this.state.isAnimating = false;
            this.state.phase = 'cleanup';

            // Clean up visual elements
            this.clearRangeHighlights();
            this.clearTargetHighlights();

            // Clean up battle-specific resources
            this.resourceManager.cleanupBattleResources(battleId);

            // Reset state
            this.state.phase = 'idle';
            this.state.isActive = false;
            this.state.currentAttacker = null;
            this.state.currentWeapon = null;
            this.state.currentTarget = null;

            // End performance monitoring and record battle completion
            const totalBattleTime = this.performanceMonitor.endOperation('totalBattleTime', battleId);
            this.performanceMonitor.recordBattleCompletion(battleResult, totalBattleTime);

            // Update system load metrics
            this.performanceMonitor.updateSystemLoad({
                activeUnits: this.allUnits.filter(u => u.currentHP > 0).length,
                activeAnimations: this.state.isAnimating ? 1 : 0,
                activeEffects: 0, // Would be tracked by effect pool
                queuedOperations: 0,
            });

            // Call completion callback if provided
            if (options?.onComplete) {
                options.onComplete(battleResult);
            }

            this.emit('battle-complete', {
                battleResult,
                attacker,
                target,
                weapon,
            });

            this.log('Battle executed successfully', {
                attacker: attacker.name,
                target: target.name,
                damage: battleResult.finalDamage,
                defeated: battleResult.targetDefeated,
                critical: battleResult.isCritical,
                evaded: battleResult.isEvaded,
            });

            // Log debug completion with detailed calculations
            this.debugManager.logBattlePhaseEnd(
                debugTimestamp,
                {
                    baseDamage: battleResult.baseDamage,
                    finalDamage: battleResult.finalDamage,
                    modifiers: battleResult.modifiers,
                    hitChance: battleResult.isEvaded ? 0 : 100,
                    criticalChance: battleResult.isCritical ? 100 : 0,
                    evasionChance: battleResult.isEvaded ? 100 : 0,
                },
                battleResult
            );

            // Show damage calculation debug if enabled
            if (this.debugManager) {
                this.debugManager.showDamageCalculationDebug(
                    target,
                    battleResult.baseDamage,
                    battleResult.modifiers,
                    battleResult.finalDamage
                );
            }

            return battleResult;
        } catch (error) {
            this.debugManager.logBattlePhaseEnd(
                debugTimestamp,
                undefined,
                undefined,
                (error as Error).message
            );

            this.state.isAnimating = false;
            this.state.phase = 'idle';
            this.state.isActive = false;

            if (options?.onError) {
                const errorDetails = this.createErrorDetails(
                    BattleError.BATTLE_SYSTEM_ERROR,
                    error.message,
                    { attacker, target, weapon, phase: 'battle_execution' }
                );
                options.onError(errorDetails);
            }

            throw error;
        }
    }

    /**
     * Show target highlights for selected target
     * @param target - Target to highlight
     */
    private showTargetHighlights(target: Unit): void {
        this.clearTargetHighlights();

        const graphics = this.scene.add.graphics();
        graphics.lineStyle(3, 0xff0000, 1.0); // Red highlight

        const screenX = target.position.x * 32;
        const screenY = target.position.y * 32;

        graphics.strokeRect(screenX, screenY, 32, 32);
        this.targetHighlights.push(graphics);
    }

    /**
     * Clear attack range highlights
     */
    private clearRangeHighlights(): void {
        this.rangeHighlights.forEach(graphics => graphics.destroy());
        this.rangeHighlights = [];
    }

    /**
     * Clear target highlights
     */
    private clearTargetHighlights(): void {
        this.targetHighlights.forEach(graphics => graphics.destroy());
        this.targetHighlights = [];
    }

    /**
     * Get weapon for a unit (placeholder implementation)
     * @param unit - Unit to get weapon for
     * @returns Unit's weapon or null
     */
    private getUnitWeapon(unit: Unit): Weapon | null {
        // This is a placeholder implementation
        // In a full game, this would check the unit's equipped weapon
        return {
            id: 'default-sword',
            name: 'Iron Sword',
            type: 'sword' as any,
            attackPower: 10,
            range: 1,
            rangePattern: {
                type: 'single',
                range: 1,
                pattern: [
                    { x: 0, y: -1 },
                    { x: 1, y: 0 },
                    { x: 0, y: 1 },
                    { x: -1, y: 0 },
                ],
            },
            element: 'none' as any,
            criticalRate: 10,
            accuracy: 90,
            specialEffects: [],
            description: 'A basic iron sword',
        };
    }

    /**
     * Validate attack initiation
     * @param attacker - Unit attempting to attack
     * @param weapon - Weapon to use
     * @returns Validation result
     */
    private validateAttackInitiation(
        attacker: Unit,
        weapon?: Weapon
    ): { success: boolean; error?: BattleError; message?: string } {
        if (!attacker) {
            return {
                success: false,
                error: BattleError.INVALID_ATTACKER,
                message: 'Attacker is null or undefined',
            };
        }

        if (attacker.currentHP <= 0) {
            return {
                success: false,
                error: BattleError.INVALID_ATTACKER,
                message: 'Attacker is defeated',
            };
        }

        if (attacker.hasActed) {
            return {
                success: false,
                error: BattleError.ALREADY_ACTED,
                message: 'Attacker has already acted this turn',
            };
        }

        if (this.state.isActive) {
            return {
                success: false,
                error: BattleError.BATTLE_SYSTEM_ERROR,
                message: 'Another battle is already in progress',
            };
        }

        return { success: true };
    }

    /**
     * Handle battle system errors using the comprehensive error handler
     * @param error - Error that occurred
     * @param context - Battle context
     */
    private async handleBattleError(error: Error, context: Partial<BattleContext>): Promise<void> {
        try {
            // Determine the specific battle error type
            const battleError = this.classifyError(error, context);

            // Create complete battle context
            const battleContext: BattleContext = {
                attacker: context.attacker || this.state.currentAttacker!,
                target: context.target || this.state.currentTarget || undefined,
                weapon: context.weapon || this.state.currentWeapon || undefined,
                phase: context.phase || (this.state.phase as any),
                errorDetails: error.message,
            };

            // Handle recruitment system errors if they occur during battle
            if (this.recruitmentSystem && error.message.includes('recruitment')) {
                this.log('Recruitment system error during battle', {
                    error: error.message,
                    attacker: battleContext.attacker?.name,
                    target: battleContext.target?.name,
                    phase: battleContext.phase,
                });

                // Emit recruitment error event
                this.emit('recruitment-error', {
                    error: error.message,
                    context: battleContext,
                    timestamp: Date.now(),
                });
            }

            // Use error handler for comprehensive error processing
            const recoveryResult = await this.errorHandler.handleError(
                battleError,
                battleContext,
                error.message
            );

            // Execute recovery actions based on result
            await this.executeErrorRecovery(recoveryResult, battleContext);

            // Emit battle error event with recovery information
            this.emit('battle-error', {
                error: battleError,
                context: battleContext,
                recoveryResult,
                originalError: error,
            });

            this.log('Battle system error handled', {
                error: error.message,
                battleError,
                context: battleContext,
                recoveryResult,
                stack: error.stack,
            });
        } catch (handlingError) {
            // Fallback error handling if error handler itself fails
            console.error('Critical error in battle error handling:', handlingError);

            this.emit('critical-error', {
                originalError: error,
                handlingError,
                context,
            });

            // Force reset state as last resort
            this.forceReset();
        }
    }

    /**
     * Create error details for error reporting
     * @param error - Battle error type
     * @param message - Error message
     * @param context - Battle context
     * @returns Battle error details
     */
    private createErrorDetails(
        error: BattleError,
        message: string,
        context: Partial<BattleContext>
    ): BattleErrorDetails {
        const battleContext: BattleContext = {
            attacker: context.attacker || this.state.currentAttacker!,
            target: context.target || this.state.currentTarget || undefined,
            weapon: context.weapon || this.state.currentWeapon || undefined,
            phase: context.phase || (this.state.phase as any),
            errorDetails: message,
        };

        return {
            error,
            message,
            context: battleContext,
            timestamp: Date.now(),
            recoverable: true,
            suggestedAction: this.getSuggestedAction(error),
        };
    }

    /**
     * Get suggested action for error recovery
     * @param error - Battle error type
     * @returns Suggested action string
     */
    private getSuggestedAction(error: BattleError): string {
        switch (error) {
            case BattleError.INVALID_ATTACKER:
                return 'Select a different unit or wait for unit to recover';
            case BattleError.INVALID_TARGET:
                return 'Select a valid target within range';
            case BattleError.OUT_OF_RANGE:
                return 'Move closer to target or select a different target';
            case BattleError.ALREADY_ACTED:
                return 'End turn or select a different unit';
            case BattleError.NO_WEAPON_EQUIPPED:
                return 'Equip a weapon before attacking';
            case BattleError.WEAPON_BROKEN:
                return 'Repair or replace the weapon';
            default:
                return 'Cancel current action and try again';
        }
    }

    /**
     * Log battle system events
     * @param message - Log message
     * @param data - Additional data to log
     */
    private log(message: string, data?: any): void {
        if (this.config.enableBattleLogging) {
            console.log(`[BattleSystem] ${message}`, data || '');
        }
    }

    // Event handlers for subsystem coordination

    private onAttackAnimationComplete(data: any): void {
        this.emit('attack-animation-complete', data);
    }

    private onDamageAnimationComplete(data: any): void {
        this.emit('damage-animation-complete', data);
    }

    private onHPChangeComplete(data: any): void {
        this.emit('hp-change-complete', data);
    }

    private onDefeatAnimationComplete(data: any): void {
        this.emit('defeat-animation-complete', data);
    }

    private onUnitDefeated(data: any): void {
        this.emit('unit-defeated', data);
    }

    private onExperienceGranted(data: any): void {
        this.emit('experience-granted', data);
    }

    private onBattleResultRecorded(data: any): void {
        this.emit('battle-result-recorded', data);
    }

    private onErrorHandled(data: any): void {
        this.emit('error-handled', data);
    }

    private onRetryRequested(data: any): void {
        this.emit('retry-requested', data);
        // Reset to allow retry
        this.cancelAttack();
    }

    private onCancelRequested(data: any): void {
        this.emit('cancel-requested', data);
        this.cancelAttack();
    }

    private onResetRequested(data: any): void {
        this.emit('reset-requested', data);
        this.forceReset();
    }

    /**
     * Classify error type from generic error
     * @param error - Generic error
     * @param context - Battle context
     * @returns Specific battle error type
     */
    private classifyError(error: Error, context: Partial<BattleContext>): BattleError {
        const message = error.message.toLowerCase();

        // Check for specific error patterns
        if (message.includes('invalid_attacker') || message.includes('attacker')) {
            return BattleError.INVALID_ATTACKER;
        }
        if (message.includes('invalid_target') || message.includes('target')) {
            return BattleError.INVALID_TARGET;
        }
        if (message.includes('out_of_range') || message.includes('range')) {
            return BattleError.OUT_OF_RANGE;
        }
        if (message.includes('already_acted') || message.includes('acted')) {
            return BattleError.ALREADY_ACTED;
        }
        if (message.includes('insufficient_mp') || message.includes('mp')) {
            return BattleError.INSUFFICIENT_MP;
        }
        if (message.includes('weapon_broken') || message.includes('broken')) {
            return BattleError.WEAPON_BROKEN;
        }
        if (message.includes('target_unreachable') || message.includes('unreachable')) {
            return BattleError.TARGET_UNREACHABLE;
        }
        if (message.includes('no_weapon_equipped') || message.includes('weapon')) {
            return BattleError.NO_WEAPON_EQUIPPED;
        }
        if (message.includes('animation')) {
            return BattleError.ANIMATION_FAILED;
        }
        if (message.includes('damage') || message.includes('calculation')) {
            return BattleError.DAMAGE_CALCULATION_ERROR;
        }

        // Default to general battle system error
        return BattleError.BATTLE_SYSTEM_ERROR;
    }

    /**
     * Execute error recovery actions
     * @param recoveryResult - Recovery result from error handler
     * @param context - Battle context
     */
    private async executeErrorRecovery(
        recoveryResult: ErrorRecoveryResult,
        context: BattleContext
    ): Promise<void> {
        switch (recoveryResult.action) {
            case 'cancel':
                this.cancelAttack();
                break;

            case 'reset':
                this.forceReset();
                break;

            case 'retry':
                // Allow user to retry by resetting to previous state
                this.cancelAttack();
                break;

            case 'fallback':
                // Implement fallback behavior
                await this.executeFallbackBehavior(context);
                break;

            case 'ignore':
                // Continue with current operation
                break;
        }
    }

    /**
     * Execute fallback behavior for recoverable errors
     * @param context - Battle context
     */
    private async executeFallbackBehavior(context: BattleContext): Promise<void> {
        // Clear current state but maintain some context for user guidance
        this.clearRangeHighlights();
        this.clearTargetHighlights();

        // Reset to idle state but keep error information available
        this.state.phase = 'idle';
        this.state.isActive = false;
        this.state.currentTarget = null;

        // Keep attacker and weapon for potential retry
        // this.state.currentAttacker and this.state.currentWeapon remain
    }

    /**
     * Force reset the entire battle system state
     */
    private forceReset(): void {
        try {
            // Stop all animations
            this.scene.tweens.killAll();

            // Clear all visual elements
            this.clearRangeHighlights();
            this.clearTargetHighlights();

            // Clear battle animator effects
            this.battleAnimator.clearBattleEffects();

            // Clear target selection
            this.targetSelector.clearSelection();

            // Reset state completely
            this.state = {
                phase: 'idle',
                currentAttacker: null,
                currentWeapon: null,
                currentTarget: null,
                isActive: false,
                isAnimating: false,
                lastBattleResult: this.state.lastBattleResult,
            };

            this.emit('system-reset', {
                timestamp: Date.now(),
                reason: 'force_reset',
            });

            this.log('Battle system force reset completed');
        } catch (resetError) {
            console.error('Error during force reset:', resetError);
            // Last resort - emit critical error
            this.emit('critical-error', {
                originalError: new Error('Force reset failed'),
                handlingError: resetError,
                context: { phase: 'force_reset' },
            });
        }
    }

    /**
     * Get current battle system state for debugging
     * @returns Current system state
     */
    public getSystemState(): BattleSystemState {
        return { ...this.state };
    }

    /**
     * Get battle history for analysis
     * @param limit - Maximum number of battles to return
     * @returns Recent battle history
     */
    public getBattleHistory(limit?: number): BattleResult[] {
        const historyLimit = limit || this.battleHistory.length;
        return this.battleHistory.slice(-historyLimit);
    }

    /**
     * Clear battle history
     */
    public clearBattleHistory(): void {
        this.battleHistory = [];
    }

    /**
     * Get error statistics from error handler
     * @returns Error statistics
     */
    public getErrorStatistics(): any {
        return this.errorHandler.getStatistics();
    }

    /**
     * Validate battle system integrity
     * @returns Validation result
     */
    public validateSystemIntegrity(): { valid: boolean; issues: string[] } {
        const issues: string[] = [];

        // Check subsystem initialization
        if (!this.attackRangeCalculator) {
            issues.push('AttackRangeCalculator not initialized');
        }
        if (!this.targetSelector) {
            issues.push('TargetSelector not initialized');
        }
        if (!this.damageCalculator) {
            issues.push('DamageCalculator not initialized');
        }
        if (!this.battleAnimator) {
            issues.push('BattleAnimator not initialized');
        }
        if (!this.battleStateManager) {
            issues.push('BattleStateManager not initialized');
        }
        if (!this.errorHandler) {
            issues.push('BattleErrorHandler not initialized');
        }

        // Check state consistency
        if (this.state.isActive && !this.state.currentAttacker) {
            issues.push('System is active but no attacker selected');
        }
        if (this.state.phase === 'target_selection' && !this.state.currentWeapon) {
            issues.push('In target selection phase but no weapon selected');
        }
        if (this.state.isAnimating && this.state.phase === 'idle') {
            issues.push('Animations playing but system is idle');
        }

        // Check data integrity
        if (this.allUnits.length === 0) {
            issues.push('No units available for battle');
        }

        return {
            valid: issues.length === 0,
            issues,
        };
    }

    /**
     * Destroy the battle system and clean up resources
     */
    public destroy(): void {
        try {
            // Stop all ongoing operations
            this.forceReset();

            // Destroy subsystems
            if (this.battleAnimator) {
                this.battleAnimator.destroy();
            }
            if (this.errorHandler) {
                this.errorHandler.destroy();
            }

            // Clear data
            this.allUnits = [];
            this.battleHistory = [];
            this.mapData = null;

            // Remove all event listeners
            this.removeAllListeners();

            this.log('Battle system destroyed');
        } catch (error) {
            console.error('Error during battle system destruction:', error);
        }
    }

    private onHPChangeComplete(data: any): void {
        this.emit('hp-change-complete', data);
    }

    private onDefeatAnimationComplete(data: any): void {
        this.emit('defeat-animation-complete', data);
    }

    private onUnitDefeated(data: any): void {
        this.emit('unit-defeated', data);
    }

    private onExperienceGranted(data: any): void {
        this.emit('experience-granted', data);
    }

    private onBattleResultRecorded(data: any): void {
        this.emit('battle-result-recorded', data);
    }

    // Error handler event handlers

    private onErrorHandled(data: any): void {
        this.emit('error-handled', data);
        this.log('Error handled by error handler', data);
    }

    private onRetryRequested(data: any): void {
        this.log('Retry requested for battle operation', data);
        // The specific retry logic would be implemented based on the context
        // For now, we emit the event for external handling
        this.emit('retry-requested', data);
    }

    private onCancelRequested(data: any): void {
        this.log('Cancel requested for battle operation', data);
        this.cancelAttack();
        this.emit('cancel-requested', data);
    }

    private onResetRequested(data: any): void {
        this.log('Reset requested for battle system', data);
        this.forceReset();
        this.emit('reset-requested', data);
    }

    // Public getters for system state

    /**
     * Get current battle system state
     * @returns Current state
     */
    public getState(): BattleSystemState {
        return { ...this.state };
    }

    /**
     * Get battle history
     * @returns Array of battle results
     */
    public getBattleHistory(): BattleResult[] {
        return [...this.battleHistory];
    }

    /**
     * Get current configuration
     * @returns Current configuration
     */
    public getConfig(): BattleSystemConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     * @param newConfig - New configuration values
     */
    public updateConfig(newConfig: Partial<BattleSystemConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.emit('config-updated', this.config);
    }

    /**
     * Check if battle system is currently active
     * @returns True if active
     */
    public isActive(): boolean {
        return this.state.isActive;
    }

    /**
     * Check if animations are currently playing
     * @returns True if animating
     */
    public isAnimating(): boolean {
        return this.state.isAnimating;
    }

    /**
     * Classify error into specific battle error type
     * @param error - The original error
     * @param context - Battle context
     * @returns Classified battle error
     */
    private classifyError(error: Error, context: Partial<BattleContext>): BattleError {
        const message = error.message.toLowerCase();

        // Check for specific error patterns
        if (message.includes('invalid_attacker') || message.includes('attacker is null')) {
            return BattleError.INVALID_ATTACKER;
        }
        if (message.includes('invalid_target') || message.includes('target selection failed')) {
            return BattleError.INVALID_TARGET;
        }
        if (message.includes('out_of_range') || message.includes('outside weapon attack range')) {
            return BattleError.OUT_OF_RANGE;
        }
        if (message.includes('already_acted') || message.includes('already acted this turn')) {
            return BattleError.ALREADY_ACTED;
        }
        if (message.includes('insufficient_mp') || message.includes('not enough mp')) {
            return BattleError.INSUFFICIENT_MP;
        }
        if (message.includes('weapon_broken') || message.includes('weapon durability')) {
            return BattleError.WEAPON_BROKEN;
        }
        if (message.includes('target_unreachable') || message.includes('path to target is blocked')) {
            return BattleError.TARGET_UNREACHABLE;
        }
        if (message.includes('no_weapon_equipped') || message.includes('no weapon equipped')) {
            return BattleError.NO_WEAPON_EQUIPPED;
        }
        if (
            message.includes('invalid_weapon_type') ||
            message.includes('weapon type is not recognized')
        ) {
            return BattleError.INVALID_WEAPON_TYPE;
        }
        if (message.includes('animation_failed') || message.includes('animation failed')) {
            return BattleError.ANIMATION_FAILED;
        }
        if (message.includes('damage_calculation_error') || message.includes('damage calculation')) {
            return BattleError.DAMAGE_CALCULATION_ERROR;
        }

        // Default to general battle system error
        return BattleError.BATTLE_SYSTEM_ERROR;
    }

    /**
     * Force reset the battle system to a safe state
     */
    private forceReset(): void {
        try {
            // Clear all visual elements
            this.clearRangeHighlights();
            this.clearTargetHighlights();

            // Clear target selection
            this.targetSelector.clearSelection();

            // Stop any animations
            if (this.battleAnimator) {
                this.battleAnimator.clearBattleEffects();
            }

            // Reset state to idle
            this.state = {
                phase: 'idle',
                currentAttacker: null,
                currentWeapon: null,
                currentTarget: null,
                isActive: false,
                isAnimating: false,
                lastBattleResult: this.state.lastBattleResult,
            };

            this.log('Battle system force reset completed');
        } catch (resetError) {
            console.error('Error during force reset:', resetError);
            // Even if reset fails, ensure state is cleared
            this.state.isActive = false;
            this.state.isAnimating = false;
            this.state.phase = 'idle';
        }
    }

    /**
     * Get error handler instance for external access
     * @returns Battle error handler
     */
    public getErrorHandler(): BattleErrorHandler {
        return this.errorHandler;
    }

    /**
     * Manually trigger error handling for testing or external error reporting
     * @param error - Battle error to handle
     * @param context - Battle context
     * @returns Promise that resolves with recovery result
     */
    public async handleManualError(
        error: BattleError,
        context?: Partial<BattleContext>
    ): Promise<ErrorRecoveryResult> {
        const battleContext: BattleContext = {
            attacker: context?.attacker || this.state.currentAttacker!,
            target: context?.target || this.state.currentTarget || undefined,
            weapon: context?.weapon || this.state.currentWeapon || undefined,
            phase: context?.phase || (this.state.phase as any),
            errorDetails: context?.errorDetails || 'Manual error trigger',
        };

        return await this.errorHandler.handleError(error, battleContext);
    }

    /**
     * Check if battle system can recover from current error state
     * @returns True if system can recover
     */
    public canRecover(): boolean {
        // System can recover if it's not in a critical error state
        return this.state.phase !== 'cleanup' && !this.state.isAnimating;
    }

    /**
     * Get current error statistics from error handler
     * @returns Error statistics
     */
    public getErrorStatistics() {
        return this.errorHandler.getErrorStatistics();
    }

    /**
     * Get performance metrics from the battle system
     */
    public getPerformanceMetrics() {
        return {
            cache: this.performanceManager.getPerformanceMetrics(),
            monitor: this.performanceMonitor.getPerformanceSummary(),
            resources: this.resourceManager.getHealthReport(),
            effects: this.effectPool.getStatistics(),
        };
    }

    /**
     * Force cleanup of all battle system resources
     */
    public forceCleanup(): void {
        this.performanceManager.clearAll();
        this.resourceManager.cleanup();
        this.effectPool.clearAll();
        this.performanceManager.forceGarbageCollection();
    }

    /**
     * Destroy the battle system and clean up resources
     */
    public destroy(): void {
        // Cancel any active battle
        this.cancelAttack();

        // Stop performance monitoring
        this.performanceMonitor.stopMonitoring();

        // Clear visual elements
        this.clearRangeHighlights();
        this.clearTargetHighlights();

        // Destroy performance optimization systems
        if (this.performanceManager) {
            this.performanceManager.destroy();
        }
        if (this.performanceMonitor) {
            this.performanceMonitor.destroy();
        }
        if (this.resourceManager) {
            this.resourceManager.destroy();
        }
        if (this.effectPool) {
            this.effectPool.destroy();
        }

        // Destroy error handler
        if (this.errorHandler) {
            this.errorHandler.destroy();
        }

        // Destroy debug systems
        if (this.debugManager) {
            this.debugManager.clearDebugInfo();
        }
        if (this.consoleCommands) {
            this.consoleCommands.destroy();
        }

        // Destroy subsystems
        this.battleAnimator.destroy();
        this.battleStateManager.destroy();

        // Clear data
        this.allUnits = [];
        this.mapData = null;
        this.battleHistory = [];

        // Remove all listeners
        this.removeAllListeners();

        this.log('BattleSystem destroyed');
    }

    // Debug system accessors
    /**
     * Get the debug manager for external access
     */
    public getDebugManager(): BattleDebugManager {
        return this.debugManager;
    }

    /**
     * Get the console commands for external access
     */
    public getConsoleCommands(): BattleConsoleCommands {
        return this.consoleCommands;
    }

    /**
     * Enable or disable debug mode
     */
    public setDebugMode(enabled: boolean): void {
        this.debugManager.updateDisplayOptions({
            logToConsole: enabled,
            logToScreen: enabled,
            enableDetailedLogging: enabled,
            showAttackRange: enabled,
            showDamageCalculation: enabled,
            showBattleStatistics: enabled,
        });
    }

    /**
     * Generate a comprehensive debug report
     */
    public generateDebugReport(): string {
        return this.debugManager.generateDebugReport();
    }

    /**
     * Update battle system configuration
     * @param newConfig - Partial configuration to update
     */
    public updateConfig(newConfig: Partial<BattleSystemConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // Update subsystem configurations if needed
        if (newConfig.enableAnimations !== undefined) {
            this.battleAnimator.setAnimationsEnabled(newConfig.enableAnimations);
        }

        if (newConfig.battleSpeed !== undefined) {
            this.battleAnimator.setAnimationSpeed(newConfig.battleSpeed);
        }

        this.log('Battle system configuration updated', { config: this.config });
    }

    /**
     * Destroy battle system and clean up resources
     */
    public destroy(): void {
        try {
            // Clear visual elements
            this.clearRangeHighlights();
            this.clearTargetHighlights();

            // Stop performance monitoring
            this.performanceMonitor.stopMonitoring();

            // Clean up subsystems
            this.battleAnimator.destroy();
            this.resourceManager.cleanup();
            this.effectPool.destroy();

            // Clear data
            this.allUnits = [];
            this.battleHistory = [];
            this.mapData = null;

            // Reset state
            this.state = {
                phase: 'idle',
                currentAttacker: null,
                currentWeapon: null,
                currentTarget: null,
                isActive: false,
                isAnimating: false,
                lastBattleResult: null,
            };

            // Remove all event listeners
            this.removeAllListeners();

            this.log('Battle system destroyed');

        } catch (error) {
            console.error('Error destroying battle system:', error);
        }
    }

    /**
     * Process experience gain for battle actions
     * Integrates with experience system to award experience for various battle actions
     * 
     * @param attacker - Unit performing the action
     * @param target - Target of the action
     * @param battleResult - Result of the battle
     * @param weapon - Weapon used in the action
     * @returns Total experience gained
     */
    private processExperienceGain(
        attacker: Unit,
        target: Unit,
        battleResult: BattleResult,
        weapon: Weapon
    ): number {
        if (!this.experienceSystem) {
            // Fallback to basic experience calculation if experience system not integrated
            return battleResult.targetDefeated ? 50 : 10;
        }

        let totalExperience = 0;

        try {
            // Create battle context for experience system
            const battleContext: ExpBattleContext = {
                battleId: `${attacker.id}_vs_${target.id}_${Date.now()}`,
                turnNumber: 1, // Would come from game state in full implementation
                attackerId: attacker.id,
                defenderId: target.id,
                damageDealt: battleResult.finalDamage,
                healingAmount: 0,
                skillId: undefined
            };

            // Award experience for attack hit (if not evaded)
            if (!battleResult.isEvaded) {
                const hitContext: ExperienceContext = {
                    source: ExperienceSource.ATTACK_HIT,
                    action: ExperienceAction.ATTACK,
                    targetId: target.id,
                    multiplier: battleResult.isCritical ? 1.5 : 1.0, // Bonus for critical hits
                    timestamp: Date.now(),
                    battleContext,
                    metadata: {
                        weaponType: weapon.type,
                        damageDealt: battleResult.finalDamage,
                        isCritical: battleResult.isCritical
                    }
                };

                const hitResult = this.experienceSystem.awardExperience(
                    attacker.id,
                    ExperienceAction.ATTACK,
                    hitContext
                );

                if (hitResult) {
                    totalExperience += hitResult.finalAmount;
                    this.log('Experience awarded for attack hit', {
                        attacker: attacker.name,
                        target: target.name,
                        experience: hitResult.finalAmount,
                        critical: battleResult.isCritical
                    });
                }
            }

            // Award experience for enemy defeat
            if (battleResult.targetDefeated && target.faction === 'enemy') {
                const defeatContext: ExperienceContext = {
                    source: ExperienceSource.ENEMY_DEFEAT,
                    action: ExperienceAction.DEFEAT,
                    targetId: target.id,
                    multiplier: 1.0,
                    timestamp: Date.now(),
                    battleContext,
                    metadata: {
                        targetLevel: target.stats?.level || 1,
                        targetType: target.name,
                        overkillDamage: Math.max(0, battleResult.finalDamage - target.stats.maxHP)
                    }
                };

                const defeatResult = this.experienceSystem.awardExperience(
                    attacker.id,
                    ExperienceAction.DEFEAT,
                    defeatContext
                );

                if (defeatResult) {
                    totalExperience += defeatResult.finalAmount;
                    this.log('Experience awarded for enemy defeat', {
                        attacker: attacker.name,
                        target: target.name,
                        experience: defeatResult.finalAmount
                    });
                }
            }

            // Check for level up after experience gain
            if (totalExperience > 0) {
                const levelUpResult = this.experienceSystem.checkAndProcessLevelUp(attacker.id);
                if (levelUpResult) {
                    // Apply level up immediately in battle
                    this.applyBattleLevelUp(attacker, levelUpResult);

                    this.emit('battle-level-up', {
                        unit: attacker,
                        levelUpResult,
                        battleContext
                    });

                    this.log('Level up occurred during battle', {
                        character: attacker.name,
                        oldLevel: levelUpResult.oldLevel,
                        newLevel: levelUpResult.newLevel,
                        statGrowth: levelUpResult.statGrowth
                    });
                }
            }

        } catch (error) {
            this.log('Error processing experience gain', {
                error: error.message,
                attacker: attacker.name,
                target: target.name
            });
            // Return fallback experience on error
            return battleResult.targetDefeated ? 50 : 10;
        }

        return totalExperience;
    }

    /**
     * Process experience gain for support actions (healing, buffs, etc.)
     * 
     * @param supporter - Unit performing the support action
     * @param target - Target of the support action
     * @param actionType - Type of support action
     * @param healingAmount - Amount of healing done (if applicable)
     * @param skillId - ID of skill used (if applicable)
     * @returns Experience gained
     */
    public processSupportExperience(
        supporter: Unit,
        target: Unit,
        actionType: 'heal' | 'buff' | 'debuff',
        healingAmount?: number,
        skillId?: string
    ): number {
        if (!this.experienceSystem) {
            return 0;
        }

        try {
            const battleContext: ExpBattleContext = {
                battleId: `support_${supporter.id}_${target.id}_${Date.now()}`,
                turnNumber: 1, // Would come from game state in full implementation
                attackerId: supporter.id,
                defenderId: target.id,
                damageDealt: 0,
                healingAmount: healingAmount || 0,
                skillId
            };

            let experienceAction: ExperienceAction;
            let experienceSource: ExperienceSource;

            switch (actionType) {
                case 'heal':
                    experienceAction = ExperienceAction.HEAL;
                    experienceSource = ExperienceSource.HEALING;
                    break;
                case 'buff':
                    experienceAction = ExperienceAction.BUFF_APPLY;
                    experienceSource = ExperienceSource.ALLY_SUPPORT;
                    break;
                case 'debuff':
                    experienceAction = ExperienceAction.DEBUFF_APPLY;
                    experienceSource = ExperienceSource.ALLY_SUPPORT;
                    break;
                default:
                    experienceAction = ExperienceAction.SUPPORT;
                    experienceSource = ExperienceSource.ALLY_SUPPORT;
            }

            const supportContext: ExperienceContext = {
                source: experienceSource,
                action: experienceAction,
                targetId: target.id,
                multiplier: 1.0,
                timestamp: Date.now(),
                battleContext,
                metadata: {
                    actionType,
                    healingAmount: healingAmount || 0,
                    skillId,
                    targetFaction: target.faction
                }
            };

            const result = this.experienceSystem.awardExperience(
                supporter.id,
                experienceAction,
                supportContext
            );

            if (result) {
                this.log('Experience awarded for support action', {
                    supporter: supporter.name,
                    target: target.name,
                    actionType,
                    experience: result.finalAmount,
                    healingAmount
                });

                // Check for level up
                const levelUpResult = this.experienceSystem.checkAndProcessLevelUp(supporter.id);
                if (levelUpResult) {
                    this.applyBattleLevelUp(supporter, levelUpResult);

                    this.emit('battle-level-up', {
                        unit: supporter,
                        levelUpResult,
                        battleContext
                    });
                }

                return result.finalAmount;
            }

        } catch (error) {
            this.log('Error processing support experience', {
                error: error.message,
                supporter: supporter.name,
                target: target.name,
                actionType
            });
        }

        return 0;
    }

    /**
     * Apply level up effects immediately during battle
     * Updates unit stats and current HP/MP proportionally
     * 
     * @param unit - Unit that leveled up
     * @param levelUpResult - Level up result from experience system
     */
    private applyBattleLevelUp(unit: Unit, levelUpResult: LevelUpResult): void {
        try {
            // Store old max values for proportional adjustment
            const oldMaxHP = unit.stats.maxHP;
            const oldMaxMP = unit.stats.maxMP;

            // Apply new stats
            unit.stats = { ...levelUpResult.newStats };

            // Adjust current HP/MP proportionally
            if (oldMaxHP > 0) {
                const hpRatio = unit.currentHP / oldMaxHP;
                unit.currentHP = Math.floor(unit.stats.maxHP * hpRatio);
            }

            if (oldMaxMP > 0 && 'currentMP' in unit) {
                const mpRatio = (unit as any).currentMP / oldMaxMP;
                (unit as any).currentMP = Math.floor(unit.stats.maxMP * mpRatio);
            }

            this.log('Battle level up applied', {
                unit: unit.name,
                oldLevel: levelUpResult.oldLevel,
                newLevel: levelUpResult.newLevel,
                oldHP: `${unit.currentHP}/${oldMaxHP}`,
                newHP: `${unit.currentHP}/${unit.stats.maxHP}`,
                statGrowth: levelUpResult.statGrowth
            });

        } catch (error) {
            this.log('Error applying battle level up', {
                error: error.message,
                unit: unit.name,
                levelUpResult
            });
        }
    }

    /**
     * Process experience gain for skill usage
     * 
     * @param caster - Unit casting the skill
     * @param skillId - ID of the skill used
     * @param targets - Targets affected by the skill
     * @param skillResult - Result of skill execution
     * @returns Experience gained
     */
    public processSkillExperience(
        caster: Unit,
        skillId: string,
        targets: Unit[],
        skillResult: any
    ): number {
        if (!this.experienceSystem) {
            return 0;
        }

        try {
            const battleContext: ExpBattleContext = {
                battleId: `skill_${caster.id}_${skillId}_${Date.now()}`,
                turnNumber: 1, // Would come from game state in full implementation
                attackerId: caster.id,
                defenderId: targets[0]?.id,
                damageDealt: skillResult.totalDamage || 0,
                healingAmount: skillResult.totalHealing || 0,
                skillId
            };

            const skillContext: ExperienceContext = {
                source: ExperienceSource.SKILL_USE,
                action: ExperienceAction.SKILL_CAST,
                targetId: targets[0]?.id,
                multiplier: 1.0,
                timestamp: Date.now(),
                battleContext,
                metadata: {
                    skillId,
                    targetCount: targets.length,
                    totalDamage: skillResult.totalDamage || 0,
                    totalHealing: skillResult.totalHealing || 0,
                    effectsApplied: skillResult.effectsApplied || 0
                }
            };

            const result = this.experienceSystem.awardExperience(
                caster.id,
                ExperienceAction.SKILL_CAST,
                skillContext
            );

            if (result) {
                this.log('Experience awarded for skill usage', {
                    caster: caster.name,
                    skillId,
                    targetCount: targets.length,
                    experience: result.finalAmount
                });

                // Check for level up
                const levelUpResult = this.experienceSystem.checkAndProcessLevelUp(caster.id);
                if (levelUpResult) {
                    this.applyBattleLevelUp(caster, levelUpResult);

                    this.emit('battle-level-up', {
                        unit: caster,
                        levelUpResult,
                        battleContext
                    });
                }

                return result.finalAmount;
            }

        } catch (error) {
            this.log('Error processing skill experience', {
                error: error.message,
                caster: caster.name,
                skillId
            });
        }

        return 0;
    }

    /**
     * Get battle statistics
     */
    public getBattleStatistics() {
        return this.debugManager.getBalanceTool().getStatistics();
    }

    /**
     * Reset all debug data
     */
    public resetDebugData(): void {
        this.debugManager.clearDebugInfo();
        this.debugManager.getBalanceTool().resetStatistics();
    }
}
