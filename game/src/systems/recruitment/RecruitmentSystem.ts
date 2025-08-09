/**
 * RecruitmentSystem - Main controller for the character recruitment system
 * 
 * This class serves as the central coordinator for all recruitment-related functionality:
 * - Initializes recruitment data from stage information
 * - Manages recruitment eligibility and condition checking
 * - Processes recruitment attempts and NPC conversion
 * - Handles stage completion and final recruitment
 * - Integrates with battle system and other game systems
 */

import {
    RecruitmentCondition,
    RecruitmentContext,
    RecruitmentResult,
    RecruitmentStatus,
    RecruitmentAction,
    RecruitmentError,
    RecruitmentProgress,
    RecruitableCharacter,
    RecruitmentSystemConfig,
    RecruitmentUtils,
    RecruitmentTypeValidators,
    NPCState
} from '../../types/recruitment';
import { Unit, StageData, GameplayError, GameplayErrorResult } from '../../types/gameplay';
import { BattleResult } from '../../types/battle';
import { NPCStateManager, NPCConversionResult } from './NPCStateManager';
import { RecruitmentConditionFactory, RecruitmentConditionUtils } from './RecruitmentCondition';
import { RecruitmentDataManager, RecruitedCharacterSaveData } from '../RecruitmentDataManager';
import { RecruitmentErrorHandler, RecruitmentErrorRecoveryResult } from './RecruitmentErrorHandler';
import { RecruitmentConditionCache } from './RecruitmentConditionCache';
import { RecruitmentPerformanceMonitor } from './RecruitmentPerformanceMonitor';
import { RecruitmentResourceManager } from './RecruitmentResourceManager';

export interface RecruitmentSystemEvents {
    'recruitment-initialized': { stageId: string; recruitableCount: number };
    'recruitment-eligibility-checked': { unitId: string; eligible: boolean; progress: RecruitmentProgress };
    'recruitment-attempt-processed': { unitId: string; result: RecruitmentResult };
    'character-converted-to-npc': { unitId: string; npcState: NPCState };
    'recruitment-completed': { unitId: string; success: boolean };
    'recruitment-failed': { unitId: string; reason: RecruitmentError };
    'stage-recruitment-completed': { recruitedUnits: Unit[]; failedUnits: string[] };
}

export interface RecruitedUnit {
    unit: Unit;
    recruitmentId: string;
    recruitedAt: number;
    conditions: RecruitmentCondition[];
}

/**
 * Main controller class for the recruitment system
 */
export class RecruitmentSystem {
    private recruitableCharacters: Map<string, RecruitableCharacter>;
    private npcStateManager: NPCStateManager;
    private config: RecruitmentSystemConfig;
    private currentStageId: string | null;
    private currentChapterId: string | null;
    private eventEmitter?: Phaser.Events.EventEmitter;
    private scene?: Phaser.Scene;
    private isInitialized: boolean;
    private dataManager: RecruitmentDataManager;
    private errorHandler: RecruitmentErrorHandler;
    private conditionCache: RecruitmentConditionCache;
    private performanceMonitor: RecruitmentPerformanceMonitor;
    private resourceManager: RecruitmentResourceManager;

    constructor(
        scene?: Phaser.Scene,
        config?: Partial<RecruitmentSystemConfig>,
        eventEmitter?: Phaser.Events.EventEmitter
    ) {
        this.recruitableCharacters = new Map();
        this.npcStateManager = new NPCStateManager(scene, undefined, eventEmitter);
        this.config = { ...RecruitmentUtils.createDefaultSystemConfig(), ...config };
        this.currentStageId = null;
        this.currentChapterId = null;
        this.eventEmitter = eventEmitter;
        this.scene = scene;
        this.isInitialized = false;
        this.dataManager = new RecruitmentDataManager(eventEmitter);
        this.errorHandler = new RecruitmentErrorHandler(scene, {
            showUserMessages: true,
            showRecruitmentHints: true,
            enableErrorAnimations: true
        });
        this.conditionCache = new RecruitmentConditionCache();
        this.performanceMonitor = new RecruitmentPerformanceMonitor();
        this.resourceManager = new RecruitmentResourceManager(scene);
    }

    /**
     * Initialize the recruitment system with stage data
     * Identifies recruitable characters and sets up their conditions
     * 
     * @param stageData Stage data containing character and recruitment information
     * @returns Success result with initialization details
     */
    async initialize(stageData: StageData): Promise<GameplayErrorResult> {
        try {
            // Validate stage data
            if (!stageData || typeof stageData !== 'object') {
                const errorResult = await this.errorHandler.handleRecruitmentError(
                    RecruitmentError.INVALID_STAGE,
                    this.createMinimalContext(),
                    'Invalid stage data provided for recruitment initialization'
                );

                return {
                    success: false,
                    error: GameplayError.INVALID_STAGE_DATA,
                    message: errorResult.message
                };
            }

            if (!stageData.id || typeof stageData.id !== 'string') {
                return {
                    success: false,
                    error: GameplayError.INVALID_STAGE_DATA,
                    message: 'Stage data must have a valid ID'
                };
            }

            // Check if recruitment is enabled
            if (!this.config.enableRecruitment) {
                this.isInitialized = true;
                return {
                    success: true,
                    message: 'Recruitment system initialized but disabled by configuration'
                };
            }

            // Clear previous recruitment data
            this.recruitableCharacters.clear();
            this.npcStateManager.clearAllNPCStates();
            this.currentStageId = stageData.id;

            // Extract chapter ID from stage data if available
            if (stageData.chapterId) {
                this.currentChapterId = stageData.chapterId;
            }

            // Process enemy units to identify recruitable characters
            let recruitableCount = 0;

            if (stageData.enemyUnits && Array.isArray(stageData.enemyUnits)) {
                for (const enemyUnit of stageData.enemyUnits) {
                    const recruitmentData = this.extractRecruitmentData(enemyUnit, stageData);
                    if (recruitmentData) {
                        this.recruitableCharacters.set(enemyUnit.id, recruitmentData);
                        recruitableCount++;
                    }
                }
            }

            // Validate recruitment data integrity
            const validationErrors = this.validateRecruitmentData();
            if (validationErrors.length > 0) {
                console.warn('Recruitment data validation warnings:', validationErrors);
            }

            this.isInitialized = true;

            // Emit initialization event
            this.eventEmitter?.emit('recruitment-initialized', {
                stageId: stageData.id,
                recruitableCount: recruitableCount
            });

            return {
                success: true,
                message: `Recruitment system initialized with ${recruitableCount} recruitable characters`,
                details: { recruitableCount, stageId: stageData.id }
            };

        } catch (error) {
            this.isInitialized = false;

            const errorResult = await this.errorHandler.handleRecruitmentError(
                RecruitmentError.SYSTEM_ERROR,
                this.createMinimalContext(),
                `Unexpected error during recruitment system initialization: ${error instanceof Error ? error.message : String(error)}`
            );

            return {
                success: false,
                error: GameplayError.INVALID_STAGE_DATA,
                message: errorResult.message,
                details: { error: error instanceof Error ? error.message : String(error) }
            };
        }
    }

    /**
     * Extract recruitment data from a unit and stage data
     * This method would typically read from unit metadata or stage configuration
     * 
     * @param unit Enemy unit to check for recruitment data
     * @param stageData Stage data for context
     * @returns Recruitable character data or null if not recruitable
     */
    private extractRecruitmentData(unit: Unit, stageData: StageData): RecruitableCharacter | null {
        try {
            // Check if unit has recruitment metadata
            // In a real implementation, this would read from unit.metadata.recruitment or similar
            const unitMetadata = (unit as any).metadata?.recruitment;

            if (!unitMetadata || !unitMetadata.conditions) {
                return null; // Unit is not recruitable
            }

            // Create recruitment conditions from metadata
            const conditions: RecruitmentCondition[] = [];

            for (const conditionData of unitMetadata.conditions) {
                try {
                    const condition = RecruitmentConditionFactory.createCondition(conditionData);
                    conditions.push(condition);
                } catch (error) {
                    console.warn(`Failed to create recruitment condition for unit ${unit.id}:`, error);
                    continue;
                }
            }

            if (conditions.length === 0) {
                return null; // No valid conditions found
            }

            // Create recruitable character data
            const recruitableCharacter: RecruitableCharacter = {
                characterId: unit.id,
                conditions: conditions,
                recruitmentStatus: RecruitmentStatus.AVAILABLE,
                priority: unitMetadata.priority || 50,
                description: unitMetadata.description || `Recruit ${unit.name}`,
                rewards: unitMetadata.rewards || []
            };

            // Validate the created recruitable character
            if (!RecruitmentTypeValidators.isValidRecruitableCharacter(recruitableCharacter)) {
                console.warn(`Invalid recruitable character data for unit ${unit.id}`);
                return null;
            }

            return recruitableCharacter;

        } catch (error) {
            console.error(`Error extracting recruitment data for unit ${unit.id}:`, error);
            return null;
        }
    }

    /**
     * Check if a character is eligible for recruitment
     * Evaluates all recruitment conditions and returns detailed progress
     * 
     * @param attacker Unit attempting the recruitment
     * @param target Target unit to be recruited
     * @param context Additional context for condition evaluation
     * @returns Recruitment eligibility result with progress details
     */
    async checkRecruitmentEligibility(
        attacker: Unit,
        target: Unit,
        context?: Partial<RecruitmentContext>
    ): Promise<RecruitmentResult> {
        try {
            // Validate system state
            if (!this.isInitialized) {
                const errorResult = await this.errorHandler.handleRecruitmentError(
                    RecruitmentError.SYSTEM_ERROR,
                    this.createMinimalContext(attacker, target),
                    'Recruitment system not initialized'
                );

                return {
                    success: false,
                    conditionsMet: [],
                    nextAction: RecruitmentAction.CONTINUE_BATTLE,
                    error: RecruitmentError.SYSTEM_ERROR,
                    message: errorResult.message
                };
            }

            // Validate input parameters
            if (!attacker || !target) {
                const errorResult = await this.errorHandler.handleRecruitmentError(
                    RecruitmentError.INVALID_TARGET,
                    this.createMinimalContext(attacker, target),
                    'Invalid attacker or target provided'
                );

                return {
                    success: false,
                    conditionsMet: [],
                    nextAction: RecruitmentAction.CONTINUE_BATTLE,
                    error: RecruitmentError.INVALID_TARGET,
                    message: errorResult.message
                };
            }

            // Check if target is recruitable
            const recruitableData = this.recruitableCharacters.get(target.id);
            if (!recruitableData) {
                const errorResult = await this.errorHandler.handleRecruitmentError(
                    RecruitmentError.INVALID_TARGET,
                    this.createRecruitmentContext(attacker, target, context),
                    `Unit ${target.name || target.id} is not recruitable`
                );

                return {
                    success: false,
                    conditionsMet: [],
                    nextAction: RecruitmentAction.CONTINUE_BATTLE,
                    error: RecruitmentError.INVALID_TARGET,
                    message: errorResult.message
                };
            }

            // Check if target is already recruited or in NPC state
            if (recruitableData.recruitmentStatus === RecruitmentStatus.RECRUITED) {
                return {
                    success: false,
                    conditionsMet: [],
                    nextAction: RecruitmentAction.CONTINUE_BATTLE,
                    error: RecruitmentError.INVALID_TARGET,
                    message: `Unit ${target.id} is already recruited`
                };
            }

            if (recruitableData.recruitmentStatus === RecruitmentStatus.FAILED) {
                return {
                    success: false,
                    conditionsMet: [],
                    nextAction: RecruitmentAction.CONTINUE_BATTLE,
                    error: RecruitmentError.RECRUITMENT_FAILED,
                    message: `Recruitment of unit ${target.id} has already failed`
                };
            }

            // Create recruitment context
            const recruitmentContext: RecruitmentContext = {
                attacker: attacker,
                target: target,
                damage: context?.damage || 0,
                turn: context?.turn || 1,
                battleResult: context?.battleResult,
                stageData: context?.stageData,
                alliedUnits: context?.alliedUnits || [],
                enemyUnits: context?.enemyUnits || [],
                npcUnits: context?.npcUnits || []
            };

            // Validate recruitment context
            if (!RecruitmentTypeValidators.isValidRecruitmentContext(recruitmentContext)) {
                return {
                    success: false,
                    conditionsMet: [],
                    nextAction: RecruitmentAction.CONTINUE_BATTLE,
                    error: RecruitmentError.SYSTEM_ERROR,
                    message: 'Invalid recruitment context'
                };
            }

            // Check all recruitment conditions with caching
            const conditionResults: boolean[] = [];
            const conditionCheckStart = performance.now();

            for (const condition of recruitableData.conditions) {
                // Try to get from cache first
                let result = this.conditionCache.get(target.id, condition, recruitmentContext);

                if (result === null) {
                    // Not in cache, evaluate condition
                    result = condition.checkCondition(recruitmentContext);
                    // Store in cache
                    this.conditionCache.set(target.id, condition, recruitmentContext, result);
                }

                conditionResults.push(result);
            }

            // Record performance metrics
            this.performanceMonitor.recordConditionCheckTime(performance.now() - conditionCheckStart);

            // Calculate progress
            const progress = RecruitmentUtils.calculateProgress(conditionResults);
            const allConditionsMet = RecruitmentUtils.areAllConditionsMet(conditionResults);

            // Determine next action
            let nextAction: RecruitmentAction;
            let success = false;

            if (allConditionsMet) {
                // All conditions met - ready for recruitment
                nextAction = RecruitmentAction.CONVERT_TO_NPC;
                success = true;
            } else {
                // Conditions not met - continue battle
                nextAction = RecruitmentAction.CONTINUE_BATTLE;
                success = false;
            }

            // Create progress object for event emission
            const recruitmentProgress: RecruitmentProgress = {
                characterId: target.id,
                conditions: recruitableData.conditions,
                conditionProgress: conditionResults,
                overallProgress: progress,
                isEligible: allConditionsMet
            };

            // Emit eligibility check event
            this.eventEmitter?.emit('recruitment-eligibility-checked', {
                unitId: target.id,
                eligible: allConditionsMet,
                progress: recruitmentProgress
            });

            return {
                success: success,
                conditionsMet: conditionResults,
                nextAction: nextAction,
                message: allConditionsMet
                    ? `All recruitment conditions met for ${target.name}`
                    : `Recruitment conditions not yet satisfied (${progress}% complete)`
            };

        } catch (error) {
            return {
                success: false,
                conditionsMet: [],
                nextAction: RecruitmentAction.CONTINUE_BATTLE,
                error: RecruitmentError.SYSTEM_ERROR,
                message: 'Unexpected error during recruitment eligibility check',
            };
        }
    }

    /**
     * Process a recruitment attempt
     * Handles the actual recruitment logic when conditions are met
     * 
     * @param attacker Unit attempting the recruitment
     * @param target Target unit to be recruited
     * @param damage Damage dealt in the attack
     * @param battleResult Complete battle result for context
     * @param currentTurn Current game turn
     * @returns Result of the recruitment attempt
     */
    async processRecruitmentAttempt(
        attacker: Unit,
        target: Unit,
        damage: number,
        battleResult?: BattleResult,
        currentTurn: number = 1
    ): Promise<RecruitmentResult> {
        try {
            // Validate system state
            if (!this.isInitialized) {
                return {
                    success: false,
                    conditionsMet: [],
                    nextAction: RecruitmentAction.CONTINUE_BATTLE,
                    error: RecruitmentError.SYSTEM_ERROR,
                    message: 'Recruitment system not initialized'
                };
            }

            // Check recruitment eligibility first
            const eligibilityResult = this.checkRecruitmentEligibility(attacker, target, {
                damage: damage,
                turn: currentTurn,
                battleResult: battleResult
            });

            // If not eligible, return the eligibility result
            if (!eligibilityResult.success || eligibilityResult.nextAction !== RecruitmentAction.CONVERT_TO_NPC) {
                return eligibilityResult;
            }

            // Get recruitable character data
            const recruitableData = this.recruitableCharacters.get(target.id);
            if (!recruitableData) {
                return {
                    success: false,
                    conditionsMet: [],
                    nextAction: RecruitmentAction.CONTINUE_BATTLE,
                    error: RecruitmentError.INVALID_TARGET,
                    message: 'Recruitable character data not found'
                };
            }

            // Check if target would be defeated by this attack
            const wouldBeDefeated = (target.currentHP - damage) <= 0;

            if (!wouldBeDefeated) {
                // Target survives but conditions are met - this shouldn't happen in normal gameplay
                return {
                    success: false,
                    conditionsMet: eligibilityResult.conditionsMet,
                    nextAction: RecruitmentAction.CONTINUE_BATTLE,
                    error: RecruitmentError.CONDITIONS_NOT_MET,
                    message: 'Target must be defeated to trigger recruitment'
                };
            }

            // Attempt to convert to NPC
            const conversionResult = this.convertToNPC(target, currentTurn);
            if (!conversionResult.success) {
                // Conversion failed - mark recruitment as failed
                recruitableData.recruitmentStatus = RecruitmentStatus.FAILED;

                return {
                    success: false,
                    conditionsMet: eligibilityResult.conditionsMet,
                    nextAction: RecruitmentAction.RECRUITMENT_FAILED,
                    error: conversionResult.error || RecruitmentError.SYSTEM_ERROR,
                    message: conversionResult.message || 'Failed to convert character to NPC'
                };
            }

            // Update recruitment status
            recruitableData.recruitmentStatus = RecruitmentStatus.NPC_STATE;
            recruitableData.npcState = conversionResult.npcState;

            // Emit recruitment attempt processed event
            const result: RecruitmentResult = {
                success: true,
                conditionsMet: eligibilityResult.conditionsMet,
                nextAction: RecruitmentAction.CONVERT_TO_NPC,
                message: `${target.name} has been converted to NPC state and can be recruited`,
                npcState: conversionResult.npcState
            };

            this.eventEmitter?.emit('recruitment-attempt-processed', {
                unitId: target.id,
                result: result
            });

            return result;

        } catch (error) {
            return {
                success: false,
                conditionsMet: [],
                nextAction: RecruitmentAction.RECRUITMENT_FAILED,
                error: RecruitmentError.SYSTEM_ERROR,
                message: 'Unexpected error during recruitment attempt processing'
            };
        }
    }

    /**
     * Convert a character to NPC state
     * Integrates with NPCStateManager to handle the conversion
     * 
     * @param unit Unit to convert to NPC
     * @param currentTurn Current game turn
     * @returns Result of the NPC conversion
     */
    convertToNPC(unit: Unit, currentTurn: number): NPCConversionResult {
        try {
            // Validate input
            if (!unit || typeof unit !== 'object') {
                return {
                    success: false,
                    error: RecruitmentError.INVALID_TARGET,
                    message: 'Invalid unit provided for NPC conversion'
                };
            }

            // Check if unit is recruitable
            const recruitableData = this.recruitableCharacters.get(unit.id);
            if (!recruitableData) {
                return {
                    success: false,
                    error: RecruitmentError.INVALID_TARGET,
                    message: 'Unit is not recruitable'
                };
            }

            // Generate recruitment ID
            const recruitmentId = RecruitmentUtils.generateRecruitmentId(
                unit.id,
                this.currentStageId || 'unknown'
            );

            // Use NPCStateManager to perform the conversion
            const conversionResult = this.npcStateManager.convertToNPC(unit, recruitmentId, currentTurn);

            if (conversionResult.success && conversionResult.npcState) {
                // Emit character converted to NPC event
                this.eventEmitter?.emit('character-converted-to-npc', {
                    unitId: unit.id,
                    npcState: conversionResult.npcState
                });
            }

            return conversionResult;

        } catch (error) {
            return {
                success: false,
                error: RecruitmentError.SYSTEM_ERROR,
                message: 'Unexpected error during NPC conversion'
            };
        }
    }

    /**
     * Complete recruitment process at stage clear
     * Converts surviving NPCs to recruited characters
     * 
     * @param allUnits All units currently in the stage
     * @returns Array of successfully recruited units
     */
    completeRecruitment(allUnits: Unit[]): RecruitedUnit[] {
        const recruitedUnits: RecruitedUnit[] = [];
        const failedUnits: string[] = [];

        try {
            // Validate system state
            if (!this.isInitialized) {
                console.warn('Recruitment system not initialized - cannot complete recruitment');
                return recruitedUnits;
            }

            // Get all current NPCs
            const npcUnitIds = this.npcStateManager.getNPCUnitIds();

            for (const unitId of npcUnitIds) {
                try {
                    // Find the unit in the provided units array
                    const unit = allUnits.find(u => u.id === unitId);
                    if (!unit) {
                        console.warn(`NPC unit ${unitId} not found in provided units array`);
                        failedUnits.push(unitId);
                        continue;
                    }

                    // Check if NPC is still alive
                    if (unit.currentHP <= 0) {
                        console.log(`NPC ${unit.name} was defeated - recruitment failed`);
                        failedUnits.push(unitId);

                        // Update recruitment status
                        const recruitableData = this.recruitableCharacters.get(unitId);
                        if (recruitableData) {
                            recruitableData.recruitmentStatus = RecruitmentStatus.FAILED;
                        }

                        // Remove NPC state since recruitment failed
                        this.npcStateManager.removeNPCState(unit);

                        // Emit recruitment failed event
                        this.eventEmitter?.emit('recruitment-failed', {
                            unitId: unitId,
                            reason: RecruitmentError.NPC_ALREADY_DEFEATED
                        });

                        continue;
                    }

                    // Get recruitment data
                    const recruitableData = this.recruitableCharacters.get(unitId);
                    if (!recruitableData) {
                        console.warn(`Recruitment data not found for NPC ${unitId}`);
                        failedUnits.push(unitId);
                        continue;
                    }

                    // Create recruited unit
                    const recruitedUnit: RecruitedUnit = {
                        unit: unit,
                        recruitmentId: recruitableData.npcState?.recruitmentId ||
                            RecruitmentUtils.generateRecruitmentId(unitId, this.currentStageId || 'unknown'),
                        recruitedAt: Date.now(),
                        conditions: recruitableData.conditions
                    };

                    // Update unit properties for recruited state
                    unit.faction = 'player'; // Ensure unit is now on player side
                    unit.hasActed = false;   // Reset action state for next stage
                    unit.hasMoved = false;   // Reset movement state for next stage

                    // Update recruitment status
                    recruitableData.recruitmentStatus = RecruitmentStatus.RECRUITED;

                    // Remove NPC state (no longer needed)
                    this.npcStateManager.removeNPCState(unit);

                    recruitedUnits.push(recruitedUnit);

                    // Emit recruitment completed event
                    this.eventEmitter?.emit('recruitment-completed', {
                        unitId: unitId,
                        success: true
                    });

                    console.log(`Successfully recruited ${unit.name}`);

                } catch (error) {
                    console.error(`Error processing recruitment for unit ${unitId}:`, error);
                    failedUnits.push(unitId);
                }
            }

            // Emit stage recruitment completed event
            this.eventEmitter?.emit('stage-recruitment-completed', {
                recruitedUnits: recruitedUnits.map(ru => ru.unit),
                failedUnits: failedUnits
            });

            console.log(`Recruitment completed: ${recruitedUnits.length} recruited, ${failedUnits.length} failed`);

            return recruitedUnits;

        } catch (error) {
            console.error('Unexpected error during recruitment completion:', error);
            return recruitedUnits;
        }
    }

    /**
     * Get performance metrics from the recruitment system
     */
    getPerformanceMetrics() {
        return {
            cache: this.conditionCache.getStatistics(),
            performance: this.performanceMonitor.getMetrics(),
            resources: this.resourceManager.getStatistics()
        };
    }

    /**
     * Optimize system performance
     */
    optimizePerformance(): void {
        this.conditionCache.optimize();
        this.performanceMonitor.getPerformanceSummary();
    }

    /**
     * Get recruitable character data by ID
     * @param characterId - Character ID to get data for
     * @returns Recruitable character data or null if not found
     */
    getRecruitableCharacter(characterId: string): RecruitableCharacter | null {
        return this.recruitableCharacters.get(characterId) || null;
    }

    /**
     * Get recruitment conditions for a character
     * @param unit - Unit to get conditions for
     * @returns Array of recruitment conditions
     */
    getRecruitmentConditions(unit: Unit): RecruitmentCondition[] {
        const recruitableData = this.recruitableCharacters.get(unit.id);
        return recruitableData ? recruitableData.conditions : [];
    }

    /**
     * Check if a unit is in NPC state
     * @param unitId - Unit ID to check
     * @returns True if unit is in NPC state
     */
    isNPC(unitId: string): boolean {
        return this.npcStateManager.isNPC(unitId);
    }

    /**
     * Save current recruitment progress to persistent storage
     * @returns Save operation result
     */
    async saveRecruitmentProgress(): Promise<GameplayErrorResult> {
        try {
            if (!this.isInitialized) {
                return {
                    success: false,
                    error: GameplayError.SYSTEM_ERROR,
                    message: 'Recruitment system not initialized'
                };
            }

            // Get current recruited characters from data manager
            const currentSaveData = this.dataManager.getCurrentSaveData();
            if (!currentSaveData) {
                return {
                    success: false,
                    error: GameplayError.INVALID_STAGE_DATA,
                    message: 'No save data available'
                };
            }

            // Update chapter progress with current stage
            if (this.currentChapterId && this.currentStageId) {
                const updateResult = await this.dataManager.updateChapterProgress(this.currentChapterId, {
                    currentStage: this.currentStageId,
                    lastSaveTime: Date.now()
                });

                if (!updateResult.success) {
                    return {
                        success: false,
                        error: GameplayError.INVALID_STAGE_DATA,
                        message: 'Failed to update chapter progress'
                    };
                }
            }

            return { success: true, message: 'Recruitment progress saved successfully' };

        } catch (error) {
            console.error('Error saving recruitment progress:', error);
            return {
                success: false,
                error: GameplayError.SYSTEM_ERROR,
                message: 'Failed to save recruitment progress'
            };
        }
    }

    /**
     * Cleanup and destroy the recruitment system
     */
    destroy(): void {
        try {
            // Clear all recruitment data
            this.recruitableCharacters.clear();

            // Destroy subsystems
            if (this.conditionCache) {
                this.conditionCache.destroy();
            }

            if (this.performanceMonitor) {
                this.performanceMonitor.destroy();
            }

            if (this.resourceManager) {
                this.resourceManager.destroy();
            }

            if (this.npcStateManager) {
                this.npcStateManager.destroy();
            }

            // Clear state
            this.isInitialized = false;
            this.currentStageId = null;
            this.currentChapterId = null;

            console.log('RecruitmentSystem: Destroyed and cleaned up');

        } catch (error) {
            console.error('Error destroying RecruitmentSystem:', error);
        }
    }

    /**
     * Get recruitment conditions for a specific unit
     * Used by UI to display recruitment requirements
     * 
     * @param unit Unit to get conditions for
     * @returns Array of recruitment conditions or empty array if not recruitable
     */
    getRecruitmentConditions(unit: Unit): RecruitmentCondition[] {
        try {
            if (!unit || !this.isInitialized) {
                return [];
            }

            const recruitableData = this.recruitableCharacters.get(unit.id);
            return recruitableData ? [...recruitableData.conditions] : [];

        } catch (error) {
            console.error('Error getting recruitment conditions:', error);
            return [];
        }
    }

    /**
     * Get recruitment progress for a specific unit
     * Used by UI to show progress towards recruitment
     * 
     * @param unit Unit to get progress for
     * @param context Current recruitment context
     * @returns Recruitment progress information
     */
    getRecruitmentProgress(unit: Unit, context?: Partial<RecruitmentContext>): RecruitmentProgress | null {
        try {
            if (!unit || !this.isInitialized) {
                return null;
            }

            const recruitableData = this.recruitableCharacters.get(unit.id);
            if (!recruitableData) {
                return null;
            }

            // Create minimal context if not provided
            const recruitmentContext: RecruitmentContext = {
                attacker: context?.attacker || {} as Unit,
                target: unit,
                damage: context?.damage || 0,
                turn: context?.turn || 1,
                battleResult: context?.battleResult,
                stageData: context?.stageData,
                alliedUnits: context?.alliedUnits || [],
                enemyUnits: context?.enemyUnits || [],
                npcUnits: context?.npcUnits || []
            };

            // Check conditions if we have a valid context
            let conditionResults: boolean[] = [];
            if (context?.attacker) {
                conditionResults = RecruitmentConditionUtils.checkAllConditions(
                    recruitableData.conditions,
                    recruitmentContext
                );
            } else {
                // No context provided - all conditions are false
                conditionResults = new Array(recruitableData.conditions.length).fill(false);
            }

            const progress = RecruitmentUtils.calculateProgress(conditionResults);
            const isEligible = RecruitmentUtils.areAllConditionsMet(conditionResults);

            return {
                characterId: unit.id,
                conditions: recruitableData.conditions,
                conditionProgress: conditionResults,
                overallProgress: progress,
                isEligible: isEligible
            };

        } catch (error) {
            console.error('Error getting recruitment progress:', error);
            return null;
        }
    }

    /**
     * Check if a unit is currently an NPC
     * 
     * @param unit Unit to check
     * @returns True if unit is in NPC state
     */
    isNPC(unit: Unit): boolean {
        return this.npcStateManager.isNPC(unit);
    }

    /**
     * Get NPC attack priority for AI targeting
     * 
     * @param unit Unit to get priority for
     * @returns Priority value for AI targeting
     */
    getNPCPriority(unit: Unit): number {
        return this.npcStateManager.getNPCPriority(unit);
    }

    /**
     * Get error handler for external access
     * 
     * @returns The recruitment error handler instance
     */
    getErrorHandler(): RecruitmentErrorHandler {
        return this.errorHandler;
    }

    /**
     * Create minimal recruitment context for error handling
     * 
     * @param attacker Optional attacker unit
     * @param target Optional target unit
     * @returns Minimal recruitment context
     */
    private createMinimalContext(attacker?: Unit, target?: Unit): RecruitmentContext {
        return {
            attacker: attacker || {} as Unit,
            target: target || {} as Unit,
            damage: 0,
            turn: 1,
            alliedUnits: [],
            enemyUnits: [],
            npcUnits: []
        };
    }

    /**
     * Create full recruitment context from parameters
     * 
     * @param attacker Attacker unit
     * @param target Target unit
     * @param context Additional context
     * @returns Full recruitment context
     */
    private createRecruitmentContext(
        attacker: Unit,
        target: Unit,
        context?: Partial<RecruitmentContext>
    ): RecruitmentContext {
        return {
            attacker: attacker,
            target: target,
            damage: context?.damage || 0,
            turn: context?.turn || 1,
            battleResult: context?.battleResult,
            stageData: context?.stageData,
            alliedUnits: context?.alliedUnits || [],
            enemyUnits: context?.enemyUnits || [],
            npcUnits: context?.npcUnits || []
        };
    }

    /**
     * Get all recruitable character IDs for the current stage
     * 
     * @returns Array of character IDs that can be recruited
     */
    getRecruitableCharacterIds(): string[] {
        return Array.from(this.recruitableCharacters.keys());
    }

    /**
     * Get recruitment status for a specific character
     * 
     * @param characterId Character ID to check
     * @returns Current recruitment status
     */
    getRecruitmentStatus(characterId: string): RecruitmentStatus | null {
        const recruitableData = this.recruitableCharacters.get(characterId);
        return recruitableData ? recruitableData.recruitmentStatus : null;
    }

    /**
     * Initialize data persistence system
     * Loads existing recruitment data from storage
     * 
     * @returns Operation result
     */
    async initializeDataPersistence(): Promise<GameplayErrorResult> {
        try {
            const loadResult = await this.dataManager.loadRecruitmentData();

            if (!loadResult.success) {
                return {
                    success: false,
                    error: GameplayError.INVALID_STAGE_DATA,
                    message: `Failed to load recruitment data: ${loadResult.message}`
                };
            }

            // Emit data loaded event
            this.eventEmitter?.emit('recruitment-persistence-initialized', {
                hasExistingData: loadResult.data && loadResult.data.recruitedCharacters.length > 0,
                migrated: loadResult.migrated,
                recovered: loadResult.recovered
            });

            return { success: true };

        } catch (error) {
            console.error('Error initializing data persistence:', error);
            return {
                success: false,
                error: GameplayError.INVALID_STAGE_DATA,
                message: 'Failed to initialize recruitment data persistence'
            };
        }
    }

    /**
     * Set current chapter for recruitment tracking
     * 
     * @param chapterId Chapter ID
     * @returns Operation result
     */
    async setCurrentChapter(chapterId: string): Promise<GameplayErrorResult> {
        try {
            this.currentChapterId = chapterId;

            // Update chapter progress in data manager
            const updateResult = await this.dataManager.updateChapterProgress(chapterId, {
                chapterId: chapterId,
                lastSaveTime: Date.now()
            });

            if (!updateResult.success) {
                return updateResult;
            }

            return { success: true };

        } catch (error) {
            console.error('Error setting current chapter:', error);
            return {
                success: false,
                error: GameplayError.INVALID_STAGE_DATA,
                message: 'Failed to set current chapter'
            };
        }
    }

    /**
     * Save recruitment completion to persistent storage
     * Called when stage is completed with recruited characters
     * 
     * @param recruitedUnits Units that were successfully recruited
     * @returns Operation result
     */
    async saveRecruitmentCompletion(recruitedUnits: RecruitedUnit[]): Promise<GameplayErrorResult> {
        try {
            if (!this.currentChapterId || !this.currentStageId) {
                return {
                    success: false,
                    error: GameplayError.INVALID_STAGE_DATA,
                    message: 'Current chapter or stage not set'
                };
            }

            // Add each recruited character to persistent storage
            for (const recruitedUnit of recruitedUnits) {
                const addResult = await this.dataManager.addRecruitedCharacter(
                    recruitedUnit.unit,
                    this.currentChapterId,
                    this.currentStageId,
                    recruitedUnit.conditions.map(c => ({
                        type: c.type,
                        parameters: c.parameters,
                        description: c.description
                    }))
                );

                if (!addResult.success) {
                    console.warn(`Failed to save recruited character ${recruitedUnit.unit.id}:`, addResult.message);
                }
            }

            // Update chapter progress
            const updateResult = await this.dataManager.updateChapterProgress(this.currentChapterId, {
                currentStage: this.currentStageId,
                lastSaveTime: Date.now()
            });

            if (!updateResult.success) {
                return updateResult;
            }

            // Emit recruitment saved event
            this.eventEmitter?.emit('recruitment-completion-saved', {
                chapterId: this.currentChapterId,
                stageId: this.currentStageId,
                recruitedCount: recruitedUnits.length
            });

            return { success: true };

        } catch (error) {
            console.error('Error saving recruitment completion:', error);
            return {
                success: false,
                error: GameplayError.INVALID_STAGE_DATA,
                message: 'Failed to save recruitment completion'
            };
        }
    }

    /**
     * Get recruited characters available for current chapter
     * 
     * @returns Array of available recruited characters
     */
    getAvailableRecruitedCharacters(): RecruitedCharacterSaveData[] {
        if (!this.currentChapterId) {
            return [];
        }

        return this.dataManager.getAvailableRecruitedCharacters(this.currentChapterId);
    }

    /**
     * Mark a recruited character as lost in current chapter
     * 
     * @param characterId Character ID
     * @returns Operation result
     */
    async markRecruitedCharacterLost(characterId: string): Promise<GameplayErrorResult> {
        if (!this.currentChapterId) {
            return {
                success: false,
                error: GameplayError.INVALID_STAGE_DATA,
                message: 'Current chapter not set'
            };
        }

        return await this.dataManager.markCharacterLost(characterId, this.currentChapterId);
    }

    /**
     * Reset character loss status when chapter is completed
     * 
     * @returns Operation result
     */
    async resetChapterLossStatus(): Promise<GameplayErrorResult> {
        if (!this.currentChapterId) {
            return {
                success: false,
                error: GameplayError.INVALID_STAGE_DATA,
                message: 'Current chapter not set'
            };
        }

        return await this.dataManager.resetChapterLossStatus(this.currentChapterId);
    }

    /**
     * Get current save data for debugging or export
     * 
     * @returns Current save data or null
     */
    getCurrentSaveData() {
        return this.dataManager.getCurrentSaveData();
    }

    /**
     * Check if recruitment save data exists
     * 
     * @returns True if save data exists
     */
    hasSaveData(): boolean {
        return this.dataManager.hasSaveData();
    }

    /**
     * Delete all recruitment save data
     * Used for new game or reset functionality
     * 
     * @returns Operation result
     */
    async deleteSaveData(): Promise<GameplayErrorResult> {
        const deleteResult = await this.dataManager.deleteSaveData();

        if (deleteResult.success) {
            return { success: true };
        } else {
            return {
                success: false,
                error: GameplayError.INVALID_STAGE_DATA,
                message: deleteResult.message || 'Failed to delete save data'
            };
        }
    }

    /**
     * Export recruitment data for backup or transfer
     * 
     * @returns Serialized recruitment data
     */
    exportRecruitmentData(): string | null {
        const saveData = this.dataManager.getCurrentSaveData();
        return saveData ? JSON.stringify(saveData, null, 2) : null;
    }

    /**
     * Validate data integrity and attempt recovery if needed
     * 
     * @returns Validation result
     */
    async validateAndRecoverData(): Promise<GameplayErrorResult> {
        try {
            // Reload data to trigger integrity checks
            const loadResult = await this.dataManager.loadRecruitmentData();

            if (!loadResult.success) {
                return {
                    success: false,
                    error: GameplayError.INVALID_STAGE_DATA,
                    message: `Data validation failed: ${loadResult.message}`
                };
            }

            const message = loadResult.recovered ?
                'Data recovered from backup' :
                'Data integrity validated successfully';

            return {
                success: true,
                message: message,
                details: {
                    recovered: loadResult.recovered,
                    migrated: loadResult.migrated
                }
            };

        } catch (error) {
            console.error('Error validating data:', error);
            return {
                success: false,
                error: GameplayError.INVALID_STAGE_DATA,
                message: 'Failed to validate recruitment data'
            };
        }
    }

    /**
     * Validate recruitment data integrity
     * Checks for inconsistencies in recruitment configuration
     * 
     * @returns Array of validation error messages
     */
    private validateRecruitmentData(): string[] {
        const errors: string[] = [];

        try {
            for (const [characterId, recruitableData] of this.recruitableCharacters.entries()) {
                // Validate recruitable character structure
                if (!RecruitmentTypeValidators.isValidRecruitableCharacter(recruitableData)) {
                    errors.push(`Invalid recruitable character data for ${characterId}`);
                    continue;
                }

                // Validate conditions
                if (!recruitableData.conditions || recruitableData.conditions.length === 0) {
                    errors.push(`No recruitment conditions defined for ${characterId}`);
                }

                // Validate each condition
                for (const condition of recruitableData.conditions) {
                    if (!RecruitmentTypeValidators.isValidRecruitmentCondition(condition)) {
                        errors.push(`Invalid condition ${condition.id} for ${characterId}`);
                    }
                }
            }
        } catch (error) {
            errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return errors;
    }

    /**
     * Get recruitment system statistics
     * 
     * @returns Statistics about current recruitment state
     */
    getRecruitmentStatistics(): {
        totalRecruitableCharacters: number;
        availableForRecruitment: number;
        currentNPCs: number;
        recruitedCharacters: number;
        failedRecruitments: number;
        recruitmentsByStatus: Record<RecruitmentStatus, number>;
    } {
        const stats = {
            totalRecruitableCharacters: this.recruitableCharacters.size,
            availableForRecruitment: 0,
            currentNPCs: this.npcStateManager.getNPCCount(),
            recruitedCharacters: 0,
            failedRecruitments: 0,
            recruitmentsByStatus: {
                [RecruitmentStatus.AVAILABLE]: 0,
                [RecruitmentStatus.CONDITIONS_MET]: 0,
                [RecruitmentStatus.NPC_STATE]: 0,
                [RecruitmentStatus.RECRUITED]: 0,
                [RecruitmentStatus.FAILED]: 0
            }
        };

        for (const recruitableData of this.recruitableCharacters.values()) {
            stats.recruitmentsByStatus[recruitableData.recruitmentStatus]++;

            switch (recruitableData.recruitmentStatus) {
                case RecruitmentStatus.AVAILABLE:
                case RecruitmentStatus.CONDITIONS_MET:
                    stats.availableForRecruitment++;
                    break;
                case RecruitmentStatus.RECRUITED:
                    stats.recruitedCharacters++;
                    break;
                case RecruitmentStatus.FAILED:
                    stats.failedRecruitments++;
                    break;
            }
        }

        return stats;
    }

    /**
     * Update system configuration
     * 
     * @param newConfig New configuration options
     */
    updateConfig(newConfig: Partial<RecruitmentSystemConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // Update NPC state manager config if needed
        if (newConfig.maxNPCsPerStage !== undefined || newConfig.npcProtectionPriority !== undefined) {
            this.npcStateManager.updateConfig({
                maxNPCsPerStage: newConfig.maxNPCsPerStage,
                defaultNPCPriority: newConfig.npcProtectionPriority
            });
        }
    }

    /**
     * Get current system configuration
     * 
     * @returns Current configuration
     */
    getConfig(): RecruitmentSystemConfig {
        return { ...this.config };
    }

    /**
     * Reset the recruitment system
     * Clears all data and prepares for new stage
     */
    reset(): void {
        try {
            this.recruitableCharacters.clear();
            this.npcStateManager.clearAllNPCStates();
            this.currentStageId = null;
            this.isInitialized = false;

            console.log('Recruitment system reset');
        } catch (error) {
            console.error('Error resetting recruitment system:', error);
        }
    }

    /**
     * Check if the recruitment system is properly initialized
     * 
     * @returns True if system is ready for use
     */
    isReady(): boolean {
        return this.isInitialized && this.config.enableRecruitment;
    }

    /**
     * Cleanup and destroy all resources
     */
    destroy(): void {
        try {
            this.reset();
            this.npcStateManager.destroy();
            this.eventEmitter?.emit('recruitment-system-destroyed');
        } catch (error) {
            console.error('Error destroying recruitment system:', error);
        }
    }
}