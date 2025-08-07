/**
 * CharacterLossManager - Main controller for character loss system
 *
 * This class orchestrates the entire character loss flow by coordinating:
 * - CharacterLossState for state management
 * - Integration with BattleSystem for loss detection
 * - Integration with RecruitmentSystem for NPC loss handling
 * - Integration with GameStateManager for game state updates
 * - Loss processing and validation
 *
 * Implements requirements 2.1, 2.2, 2.4, 8.1, 8.2 from the character loss system specification
 */

import * as Phaser from 'phaser';
import { Unit, Position, GameplayError, GameplayErrorResult, GameAction } from '../types/gameplay';
import {
  LostCharacter,
  LossCause,
  LossCauseType,
  ChapterLossSummary,
  CharacterLossError,
  CharacterLossErrorDetails,
  LossContext,
  CharacterLossTypeValidators,
  CharacterLossUtils,
  DangerLevel,
  PartyValidationResult,
  PartyValidationError,
  PartyValidationWarning,
} from '../types/characterLoss';
import { CharacterLossState, ICharacterLossState } from './CharacterLossState';
import { CharacterLossEffects, ICharacterLossEffects } from './CharacterLossEffects';
import {
  CharacterDangerWarningSystem,
  ICharacterDangerWarningSystem,
} from './CharacterDangerWarningSystem';
import { CharacterLossUI, ICharacterLossUI } from '../ui/CharacterLossUI';
import { CharacterLossErrorHandler, ErrorHandlingConfig } from './CharacterLossErrorHandler';
import {
  CharacterLossPerformanceManager,
  ICharacterLossPerformanceManager,
} from './CharacterLossPerformanceManager';
import { BattleSystem } from './BattleSystem';
import { RecruitmentSystem } from './recruitment/RecruitmentSystem';
import { GameStateManager } from './GameStateManager';

/**
 * Character loss manager configuration
 */
export interface CharacterLossManagerConfig {
  /** Enable automatic loss processing */
  enableAutoLossProcessing: boolean;
  /** Enable danger warnings */
  enableDangerWarnings: boolean;
  /** HP percentage threshold for critical danger */
  criticalHPThreshold: number;
  /** HP percentage threshold for high danger */
  highDangerHPThreshold: number;
  /** Enable integration with recruitment system */
  enableRecruitmentIntegration: boolean;
  /** Enable detailed loss logging */
  enableLossLogging: boolean;
  /** Maximum time to wait for loss processing (ms) */
  lossProcessingTimeout: number;
}

/**
 * Character loss manager state tracking
 */
export interface CharacterLossManagerState {
  /** Whether the manager is initialized */
  isInitialized: boolean;
  /** Current chapter ID */
  currentChapterId: string | null;
  /** Whether loss processing is active */
  isProcessingLoss: boolean;
  /** Number of losses processed this chapter */
  lossesProcessed: number;
  /** Last loss processing timestamp */
  lastLossProcessedAt: number;
}

/**
 * Loss processing options
 */
export interface LossProcessingOptions {
  /** Skip animations for faster processing */
  skipAnimations?: boolean;
  /** Force loss processing even if normally invalid */
  forceLoss?: boolean;
  /** Custom loss cause to use */
  customCause?: LossCause;
  /** Callback for loss completion */
  onComplete?: (result: LostCharacter) => void;
  /** Callback for loss error */
  onError?: (error: CharacterLossErrorDetails) => void;
}

/**
 * System dependencies for CharacterLossManager
 */
export interface SystemDependencies {
  battleSystem?: BattleSystem;
  recruitmentSystem?: RecruitmentSystem;
  gameStateManager?: GameStateManager;
  lossEffects?: CharacterLossEffects;
  dangerWarningSystem?: CharacterDangerWarningSystem;
  lossUI?: CharacterLossUI;
  errorHandler?: CharacterLossErrorHandler;
  performanceManager?: CharacterLossPerformanceManager;
  eventEmitter?: Phaser.Events.EventEmitter;
}

/**
 * Main CharacterLossManager controller class
 * Coordinates all character loss functionality and system integrations
 */
export class CharacterLossManager extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private config: CharacterLossManagerConfig;
  private state: CharacterLossManagerState;
  private lossState: ICharacterLossState;

  // System integrations
  private battleSystem: BattleSystem | null = null;
  private recruitmentSystem: RecruitmentSystem | null = null;
  private gameStateManager: GameStateManager | null = null;
  private lossEffects: ICharacterLossEffects | null = null;
  private dangerWarningSystem: ICharacterDangerWarningSystem | null = null;
  private lossUI: ICharacterLossUI | null = null;
  private errorHandler: CharacterLossErrorHandler | null = null;
  private performanceManager: ICharacterLossPerformanceManager | null = null;
  private eventEmitter: Phaser.Events.EventEmitter | null = null;

  // Character tracking
  private allUnits: Unit[] = [];
  private dangerLevels: Map<string, DangerLevel> = new Map();

  // Default configuration
  private static readonly DEFAULT_CONFIG: CharacterLossManagerConfig = {
    enableAutoLossProcessing: true,
    enableDangerWarnings: true,
    criticalHPThreshold: 25,
    highDangerHPThreshold: 50,
    enableRecruitmentIntegration: true,
    enableLossLogging: true,
    lossProcessingTimeout: 5000,
  };

  /**
   * Creates a new CharacterLossManager instance
   * @param scene - Phaser scene for rendering and events
   * @param config - Character loss manager configuration
   * @param dependencies - System dependencies
   */
  constructor(
    scene: Phaser.Scene,
    config?: Partial<CharacterLossManagerConfig>,
    dependencies?: SystemDependencies
  ) {
    super();

    this.scene = scene;
    this.config = { ...CharacterLossManager.DEFAULT_CONFIG, ...config };

    // Initialize state
    this.state = {
      isInitialized: false,
      currentChapterId: null,
      isProcessingLoss: false,
      lossesProcessed: 0,
      lastLossProcessedAt: 0,
    };

    // Initialize loss state
    this.lossState = new CharacterLossState();

    // Set up system dependencies
    if (dependencies) {
      this.setSystemDependencies(dependencies);
    }

    // Initialize error handler if not provided
    if (!this.errorHandler) {
      this.errorHandler = new CharacterLossErrorHandler({
        enableLogging: this.config.enableLossLogging,
        enableUserNotifications: true,
        enableAutoRecovery: true,
        enableBackupCreation: true,
      });
      this.setErrorHandler(this.errorHandler);
    }

    this.setupEventListeners();
  }

  /**
   * Set system dependencies for integration
   * @param dependencies - System dependencies
   */
  public setSystemDependencies(dependencies: SystemDependencies): void {
    if (dependencies.battleSystem) {
      this.setBattleSystem(dependencies.battleSystem);
    }

    if (dependencies.recruitmentSystem) {
      this.setRecruitmentSystem(dependencies.recruitmentSystem);
    }

    if (dependencies.gameStateManager) {
      this.setGameStateManager(dependencies.gameStateManager);
    }

    if (dependencies.lossEffects) {
      this.setLossEffects(dependencies.lossEffects);
    }

    if (dependencies.dangerWarningSystem) {
      this.setDangerWarningSystem(dependencies.dangerWarningSystem);
    }

    if (dependencies.lossUI) {
      this.setLossUI(dependencies.lossUI);
    }

    if (dependencies.errorHandler) {
      this.setErrorHandler(dependencies.errorHandler);
    }

    if (dependencies.performanceManager) {
      this.setPerformanceManager(dependencies.performanceManager);
    }

    if (dependencies.eventEmitter) {
      this.eventEmitter = dependencies.eventEmitter;
    }
  }

  /**
   * Set battle system for integration
   * @param battleSystem - Battle system instance
   */
  public setBattleSystem(battleSystem: BattleSystem): void {
    this.battleSystem = battleSystem;

    // Listen to battle system events
    this.battleSystem.on('target-selected', this.onBattleTargetSelected.bind(this));
    this.battleSystem.on('unit-defeated', this.onUnitDefeated.bind(this));

    this.log('Battle system integrated with character loss manager');
  }

  /**
   * Set recruitment system for integration
   * @param recruitmentSystem - Recruitment system instance
   */
  public setRecruitmentSystem(recruitmentSystem: RecruitmentSystem): void {
    this.recruitmentSystem = recruitmentSystem;

    // Listen to recruitment system events
    this.recruitmentSystem.on(
      'character-converted-to-npc',
      this.onCharacterConvertedToNPC.bind(this)
    );
    this.recruitmentSystem.on('recruitment-failed', this.onRecruitmentFailed.bind(this));

    this.log('Recruitment system integrated with character loss manager');
  }

  /**
   * Set game state manager for integration
   * @param gameStateManager - Game state manager instance
   */
  public setGameStateManager(gameStateManager: GameStateManager): void {
    this.gameStateManager = gameStateManager;

    // Listen to game state manager events
    if (typeof gameStateManager.on === 'function') {
      gameStateManager.on('unit-updated', this.onUnitUpdated.bind(this));
      gameStateManager.on('turn-changed', this.onTurnChanged.bind(this));
    }

    this.log('Game state manager integrated with character loss manager');
  }

  /**
   * Set loss effects system for integration
   * @param lossEffects - Loss effects system instance
   */
  public setLossEffects(lossEffects: ICharacterLossEffects): void {
    this.lossEffects = lossEffects;

    // Listen to loss effects events
    this.lossEffects.on('loss-animation-complete', this.onLossAnimationComplete.bind(this));
    this.lossEffects.on('danger-effect-shown', this.onDangerEffectShown.bind(this));

    this.log('Loss effects system integrated with character loss manager');
  }

  /**
   * Set danger warning system for integration
   * @param dangerWarningSystem - Danger warning system instance
   */
  public setDangerWarningSystem(dangerWarningSystem: ICharacterDangerWarningSystem | null): void {
    this.dangerWarningSystem = dangerWarningSystem;

    if (this.dangerWarningSystem) {
      // Listen to danger warning system events
      this.dangerWarningSystem.on('danger-level-changed', this.onDangerLevelChanged.bind(this));
      this.dangerWarningSystem.on(
        'confirmation-dialog-shown',
        this.onConfirmationDialogShown.bind(this)
      );
      this.dangerWarningSystem.on(
        'important-character-warning-shown',
        this.onImportantCharacterWarningShown.bind(this)
      );

      this.log('Danger warning system integrated with character loss manager');
    } else {
      this.log('Danger warning system removed from character loss manager');
    }
  }

  /**
   * Set loss UI system for integration
   * @param lossUI - Character loss UI instance
   */
  public setLossUI(lossUI: ICharacterLossUI): void {
    this.lossUI = lossUI;

    // Listen to loss UI events
    this.lossUI.on('party-composition-updated', this.onPartyCompositionUpdated.bind(this));
    this.lossUI.on('chapter-summary-dismissed', this.onChapterSummaryDismissed.bind(this));
    this.lossUI.on('party-validation-result-shown', this.onPartyValidationShown.bind(this));

    this.log('Loss UI system integrated with character loss manager');
  }

  /**
   * Set error handler for comprehensive error handling
   * @param errorHandler - Character loss error handler instance
   */
  public setErrorHandler(errorHandler: CharacterLossErrorHandler): void {
    this.errorHandler = errorHandler;

    // Listen to error handler events
    this.errorHandler.on('error-action', this.onErrorAction.bind(this));
    this.errorHandler.on('user-feedback', this.onUserFeedback.bind(this));

    this.log('Error handler integrated with character loss manager');
  }

  /**
   * Set performance manager for optimization and monitoring
   * @param performanceManager - Character loss performance manager instance
   */
  public setPerformanceManager(performanceManager: ICharacterLossPerformanceManager): void {
    this.performanceManager = performanceManager;

    // Listen to performance manager events
    this.performanceManager.on('performance-warning', this.onPerformanceWarning.bind(this));
    this.performanceManager.on('memory-optimized', this.onMemoryOptimized.bind(this));

    this.log('Performance manager integrated with character loss manager');
  }

  /**
   * Initialize chapter for character loss tracking
   * @param chapterId - ID of the chapter to initialize
   * @param units - All units participating in the chapter
   * @returns Success result with initialization details
   */
  public initializeChapter(chapterId: string, units: Unit[]): GameplayErrorResult {
    try {
      // Validate input
      if (!chapterId || chapterId.trim().length === 0) {
        return {
          success: false,
          error: GameplayError.INVALID_STAGE_DATA,
          message: 'Chapter ID cannot be empty',
        };
      }

      if (!Array.isArray(units)) {
        return {
          success: false,
          error: GameplayError.INVALID_STAGE_DATA,
          message: 'Units must be an array',
        };
      }

      // Initialize loss state
      this.lossState.initializeChapter(chapterId);

      // Store units and initialize tracking
      this.allUnits = [...units];
      this.dangerLevels.clear();

      // Add all units to participating characters
      for (const unit of units) {
        this.lossState.addParticipatingCharacter(unit.id);

        // Initialize danger level tracking
        const dangerLevel = this.calculateDangerLevel(unit);
        this.dangerLevels.set(unit.id, dangerLevel);
      }

      // Update state
      this.state.isInitialized = true;
      this.state.currentChapterId = chapterId;
      this.state.lossesProcessed = 0;
      this.state.lastLossProcessedAt = 0;

      // Emit initialization event
      this.emit('chapter-initialized', {
        chapterId,
        unitCount: units.length,
        playerUnits: units.filter(u => u.faction === 'player').length,
        enemyUnits: units.filter(u => u.faction === 'enemy').length,
      });

      this.log(`Chapter ${chapterId} initialized with ${units.length} units`);

      return {
        success: true,
        message: `Character loss system initialized for chapter ${chapterId}`,
        details: { chapterId, unitCount: units.length },
      };
    } catch (error) {
      this.state.isInitialized = false;

      return {
        success: false,
        error: GameplayError.INVALID_STAGE_DATA,
        message: `Failed to initialize chapter: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Process character loss when a unit is defeated
   * Main flow for handling character loss
   * @param unit - Unit that was lost
   * @param cause - Cause of the loss
   * @param options - Loss processing options
   * @returns Promise that resolves with the lost character data
   */
  public async processCharacterLoss(
    unit: Unit,
    cause: LossCause,
    options?: LossProcessingOptions
  ): Promise<LostCharacter> {
    // Performance monitoring: Start timing
    const processStartTime = performance.now();

    try {
      // Validate system state
      if (!this.state.isInitialized) {
        const error = this.createError(
          CharacterLossError.CHAPTER_NOT_INITIALIZED,
          'Chapter must be initialized before processing losses',
          { characterId: unit?.id || '', phase: 'loss_processing' }
        );

        if (this.errorHandler) {
          // Let error handler manage this error
          this.errorHandler.showUserFeedback({
            type: 'error',
            title: '章が初期化されていません',
            message: 'キャラクターロスト処理を実行する前に章を初期化してください。',
            dismissible: true,
            duration: 5000,
          });
        }

        throw error;
      }

      // Validate input with error handler
      if (!unit || !unit.id) {
        if (this.errorHandler) {
          const recoveryResult = this.errorHandler.handleInvalidCharacterError(unit, {
            characterId: unit?.id || '',
            phase: 'loss_processing',
          });

          if (recoveryResult.success && recoveryResult.recoveredData) {
            unit = recoveryResult.recoveredData;
            this.log(`Character data repaired, continuing with loss processing`);
          } else {
            throw this.createError(
              CharacterLossError.INVALID_CHARACTER,
              'Invalid unit provided for loss processing',
              { characterId: unit?.id || '', phase: 'loss_processing' }
            );
          }
        } else {
          throw this.createError(
            CharacterLossError.INVALID_CHARACTER,
            'Invalid unit provided for loss processing',
            { characterId: unit?.id || '', phase: 'loss_processing' }
          );
        }
      }

      if (!CharacterLossTypeValidators.isValidLossCause(cause)) {
        const error = this.createError(
          CharacterLossError.INVALID_LOSS_CAUSE,
          'Invalid loss cause provided',
          { characterId: unit.id, phase: 'loss_processing' }
        );

        if (this.errorHandler) {
          this.errorHandler.showUserFeedback({
            type: 'error',
            title: '無効なロスト原因',
            message: 'ロスト原因のデータが無効です。システムログを確認してください。',
            dismissible: true,
            duration: 5000,
          });
        }

        throw error;
      }

      // Check if character is already lost with error handler
      if (this.lossState.isLost(unit.id)) {
        const existingLoss = this.lossState.getLostCharacter(unit.id);
        if (existingLoss && this.errorHandler) {
          const recoveryResult = this.errorHandler.handleDuplicateLossError(unit.id, existingLoss, {
            characterId: unit.id,
            phase: 'loss_processing',
          });

          if (recoveryResult.success && recoveryResult.recoveredData) {
            return recoveryResult.recoveredData;
          }
        }

        this.log(`Character ${unit.id} is already lost, skipping duplicate processing`);
        if (existingLoss) {
          return existingLoss;
        }
      }

      // Set processing state
      this.state.isProcessingLoss = true;

      this.log(`Processing character loss for ${unit.name} (${unit.id}): ${cause.description}`);

      // 1. Handle recruitment system integration (NPC loss processing)
      if (this.config.enableRecruitmentIntegration && this.recruitmentSystem) {
        await this.handleNPCLoss(unit, cause);
      }

      // 2. Play loss animation if effects system is available and animations are not skipped
      if (this.lossEffects && !options?.skipAnimations) {
        // Performance optimization: Check if we should optimize for 60fps
        if (this.performanceManager) {
          this.lossEffects.optimizeFor60FPS();
        }
        await this.lossEffects.playLossAnimation(unit, cause);
      }

      // 3. Record the loss in state
      this.lossState.recordLoss(unit, cause);

      // 4. Update game state
      await this.updateGameState(unit, cause);

      // 5. Check for game over conditions
      this.checkGameOverCondition();

      // 6. Update danger levels for remaining units
      this.updateDangerLevels();

      // Get the recorded loss data
      const lostCharacter = this.lossState.getLostCharacter(unit.id);
      if (!lostCharacter) {
        throw this.createError(
          CharacterLossError.LOSS_PROCESSING_FAILED,
          'Failed to retrieve recorded loss data',
          { characterId: unit.id, phase: 'loss_processing' }
        );
      }

      // Update processing state
      this.state.lossesProcessed++;
      this.state.lastLossProcessedAt = Date.now();
      this.state.isProcessingLoss = false;

      // Update UI with new loss state
      if (this.lossUI) {
        this.updateUIAfterLoss();
      }

      // Auto-save after processing loss
      this.autoSave();

      // Emit loss processed event
      this.emit('character-loss-processed', {
        unit,
        cause,
        lostCharacter,
        totalLosses: this.state.lossesProcessed,
      });

      // Call completion callback if provided
      if (options?.onComplete) {
        options.onComplete(lostCharacter);
      }

      // Performance monitoring: End timing and check performance
      const processEndTime = performance.now();
      const processingTime = processEndTime - processStartTime;

      if (this.performanceManager) {
        // Log processing time for performance monitoring
        if (processingTime > 100) {
          // 100ms threshold
          console.warn(
            `[CharacterLossManager] Loss processing took ${processingTime.toFixed(2)}ms, may impact performance`
          );
          this.emit('performance-warning', {
            type: 'loss-processing-slow',
            processingTime,
            unit: unit.id,
            cause: cause.type,
          });
        }
      }

      this.log(
        `Character loss processed successfully for ${unit.name} in ${processingTime.toFixed(2)}ms`
      );

      return lostCharacter;
    } catch (error) {
      this.state.isProcessingLoss = false;

      // Check if error is already a CharacterLossErrorDetails
      let errorDetails: CharacterLossErrorDetails;
      if (error && typeof error === 'object' && 'error' in error && 'message' in error) {
        errorDetails = error as CharacterLossErrorDetails;
      } else {
        errorDetails = this.createError(
          CharacterLossError.LOSS_PROCESSING_FAILED,
          `Unexpected error during loss processing: ${error instanceof Error ? error.message : String(error)}`,
          { characterId: unit?.id || '', phase: 'loss_processing' }
        );
      }

      // Call error callback if provided
      if (options?.onError) {
        options.onError(errorDetails);
      }

      // Emit error event
      this.emit('character-loss-error', {
        unit,
        cause,
        error: errorDetails,
      });

      throw errorDetails;
    }
  }

  /**
   * Handle NPC loss when recruitment system is integrated
   * @param unit - Unit that was lost
   * @param cause - Cause of the loss
   */
  private async handleNPCLoss(unit: Unit, cause: LossCause): Promise<void> {
    if (!this.recruitmentSystem) {
      return;
    }

    try {
      // Check if this is an NPC (recruited character)
      if (unit.faction === 'npc' || (unit as any).wasRecruited) {
        this.log(`Handling NPC loss for ${unit.name}`);

        // Notify recruitment system of NPC loss
        // This would typically call a method like handleNPCLoss if it exists
        if (typeof (this.recruitmentSystem as any).handleNPCLoss === 'function') {
          (this.recruitmentSystem as any).handleNPCLoss(unit);
        }

        // Emit NPC loss event
        this.emit('npc-character-lost', {
          unit,
          cause,
          wasRecruited: (unit as any).wasRecruited || false,
        });
      }
    } catch (error) {
      this.log(
        `Error handling NPC loss for ${unit.id}: ${error instanceof Error ? error.message : String(error)}`
      );
      // Don't throw - this is not critical for the main loss processing flow
    }
  }

  /**
   * Update game state after character loss
   * @param unit - Unit that was lost
   * @param cause - Cause of the loss
   */
  private async updateGameState(unit: Unit, cause: LossCause): Promise<void> {
    try {
      // Update unit in game state manager if available
      if (this.gameStateManager) {
        // Mark unit as defeated
        unit.currentHP = 0;

        const updateResult = this.gameStateManager.updateUnit(unit);
        if (!updateResult.success) {
          this.log(`Warning: Failed to update unit in game state: ${updateResult.message}`);
        }
      }

      // Update local units array
      const unitIndex = this.allUnits.findIndex(u => u.id === unit.id);
      if (unitIndex !== -1) {
        this.allUnits[unitIndex] = { ...unit, currentHP: 0 };
      }

      // Update turn if this was the current turn's unit
      if (this.gameStateManager) {
        const currentTurn = this.gameStateManager.getCurrentTurn();
        this.lossState.setCurrentTurn(currentTurn);
      }
    } catch (error) {
      this.log(
        `Error updating game state after loss: ${error instanceof Error ? error.message : String(error)}`
      );
      // Don't throw - this is not critical for the main loss processing flow
    }
  }

  /**
   * Check for game over conditions after character loss
   */
  private checkGameOverCondition(): void {
    try {
      if (!this.gameStateManager) {
        return;
      }

      // Get all living player units from the current state
      const livingPlayerUnits = this.allUnits.filter(
        unit => unit.faction === 'player' && !this.isCharacterLost(unit.id)
      );

      // Check for game over (all player characters lost)
      if (livingPlayerUnits.length === 0) {
        this.log('All player characters lost - triggering game over');

        // Process game over
        this.processGameOver();
      }
    } catch (error) {
      this.log(
        `Error checking game over condition: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Process game over when all player characters are lost
   */
  private async processGameOver(): Promise<void> {
    try {
      // Set game result to defeat
      if (this.gameStateManager) {
        this.gameStateManager.setGameResult('defeat');
      }

      // Show game over UI
      if (this.lossUI) {
        const gameOverData = {
          reason: 'all_characters_lost',
          totalLosses: this.state.lossesProcessed,
          chapterId: this.state.currentChapterId,
          lostCharacters: this.getLostCharacters(),
          chapterDuration: this.lossState.getChapterDuration(),
        };

        await this.lossUI.showGameOverScreen(gameOverData);
      }

      // Emit all characters lost event
      this.emit('all-characters-lost', {
        totalLosses: this.state.lossesProcessed,
        chapterId: this.state.currentChapterId,
        lostCharacters: this.getLostCharacters(),
        gameOverReason: 'all_characters_lost',
      });

      // Emit game over event
      this.emit('game-over', {
        reason: 'all_characters_lost',
        totalLosses: this.state.lossesProcessed,
        chapterId: this.state.currentChapterId,
        finalState: this.lossState.getChapterSummary(),
      });

      this.log('Game over processed - all player characters lost');
    } catch (error) {
      this.log(
        `Error processing game over: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if game over condition is met
   * @returns True if all player characters are lost
   */
  public isGameOver(): boolean {
    const livingPlayerUnits = this.allUnits.filter(
      unit => unit.faction === 'player' && !this.isCharacterLost(unit.id)
    );
    return livingPlayerUnits.length === 0;
  }

  /**
   * Get game over information
   * @returns Game over information or null if game is not over
   */
  public getGameOverInfo(): {
    reason: string;
    totalLosses: number;
    chapterId: string | null;
    lostCharacters: LostCharacter[];
  } | null {
    if (!this.isGameOver()) {
      return null;
    }

    return {
      reason: 'all_characters_lost',
      totalLosses: this.state.lossesProcessed,
      chapterId: this.state.currentChapterId,
      lostCharacters: this.getLostCharacters(),
    };
  }

  /**
   * Save current chapter loss state to persistent storage
   * @returns Success result with save details
   */
  public saveChapterState(): GameplayErrorResult {
    try {
      if (!this.state.isInitialized || !this.state.currentChapterId) {
        return {
          success: false,
          error: GameplayError.INVALID_STAGE_DATA,
          message: 'Chapter must be initialized before saving state',
        };
      }

      // Serialize current loss state
      const chapterLossData = this.lossState.serialize();

      // Create storage key for this chapter
      const storageKey = this.getChapterStorageKey(this.state.currentChapterId);

      // Save to localStorage
      const serializedData = JSON.stringify(chapterLossData);
      localStorage.setItem(storageKey, serializedData);

      // Create backup if error handler is available
      if (this.errorHandler) {
        this.errorHandler.createBackup(this.state.currentChapterId, chapterLossData);
      }

      // Also save manager state
      const managerStateData = {
        currentChapterId: this.state.currentChapterId,
        lossesProcessed: this.state.lossesProcessed,
        lastLossProcessedAt: this.state.lastLossProcessedAt,
        savedAt: Date.now(),
      };

      const managerStorageKey = this.getManagerStateStorageKey();
      localStorage.setItem(managerStorageKey, JSON.stringify(managerStateData));

      this.log(`Chapter loss state saved for chapter ${this.state.currentChapterId}`);

      return {
        success: true,
        message: `Chapter loss state saved successfully`,
        details: {
          chapterId: this.state.currentChapterId,
          dataSize: serializedData.length,
          savedAt: Date.now(),
        },
      };
    } catch (error) {
      const errorMessage = `Failed to save chapter state: ${error instanceof Error ? error.message : String(error)}`;
      this.log(errorMessage);

      return {
        success: false,
        error: GameplayError.SYSTEM_ERROR,
        message: errorMessage,
      };
    }
  }

  /**
   * Load chapter loss state from persistent storage
   * @param chapterId - ID of the chapter to load (optional, uses current if not provided)
   * @returns Success result with load details
   */
  public loadChapterState(chapterId?: string): GameplayErrorResult {
    try {
      const targetChapterId = chapterId || this.state.currentChapterId;

      if (!targetChapterId) {
        return {
          success: false,
          error: GameplayError.INVALID_STAGE_DATA,
          message: 'Chapter ID must be provided or chapter must be initialized',
        };
      }

      // Get storage key for this chapter
      const storageKey = this.getChapterStorageKey(targetChapterId);

      // Load from localStorage
      const savedData = localStorage.getItem(storageKey);

      if (!savedData) {
        // No saved data found - initialize fresh chapter
        this.log(`No saved data found for chapter ${targetChapterId}, initializing fresh state`);

        return {
          success: true,
          message: 'No saved data found - initialized fresh chapter state',
          details: { chapterId: targetChapterId, wasEmpty: true },
        };
      }

      // Parse and validate saved data
      let chapterLossData: ChapterLossData;
      try {
        chapterLossData = JSON.parse(savedData);
      } catch (parseError) {
        this.log(`Failed to parse saved data for chapter ${targetChapterId}: ${parseError}`);
        return this.handleCorruptedSaveData(targetChapterId);
      }

      // Validate data integrity
      if (!CharacterLossTypeValidators.isValidChapterLossData(chapterLossData)) {
        this.log(`Invalid chapter loss data format for chapter ${targetChapterId}`);
        return this.handleCorruptedSaveData(targetChapterId);
      }

      // Deserialize into loss state
      this.lossState.deserialize(chapterLossData);

      // Load manager state if available
      this.loadManagerState();

      // Update current state
      this.state.isInitialized = true;
      this.state.currentChapterId = targetChapterId;

      this.log(`Chapter loss state loaded for chapter ${targetChapterId}`);

      return {
        success: true,
        message: `Chapter loss state loaded successfully`,
        details: {
          chapterId: targetChapterId,
          lossCount: this.lossState.getTotalLosses(),
          loadedAt: Date.now(),
        },
      };
    } catch (error) {
      const errorMessage = `Failed to load chapter state: ${error instanceof Error ? error.message : String(error)}`;
      this.log(errorMessage);

      return {
        success: false,
        error: GameplayError.SYSTEM_ERROR,
        message: errorMessage,
      };
    }
  }

  /**
   * Handle corrupted save data by attempting recovery or resetting to default
   * @param chapterId - ID of the chapter with corrupted data
   * @returns Recovery result
   */
  private handleCorruptedSaveData(chapterId: string): GameplayErrorResult {
    try {
      this.log(`Attempting to recover corrupted save data for chapter ${chapterId}`);

      // Use error handler if available
      if (this.errorHandler) {
        const recoveryResult = this.errorHandler.handleSaveDataCorruption(
          chapterId,
          null, // No corrupted data available at this point
          { chapterId, phase: 'save_data_recovery' }
        );

        if (recoveryResult.success && recoveryResult.recoveredData) {
          try {
            this.lossState.deserialize(recoveryResult.recoveredData);
            this.state.isInitialized = true;
            this.state.currentChapterId = chapterId;

            return {
              success: true,
              message: `Save data recovered using error handler for chapter ${chapterId}`,
              details: {
                chapterId,
                recoveryMethod: recoveryResult.strategy,
                recoveredAt: Date.now(),
              },
            };
          } catch (deserializeError) {
            this.log(`Failed to deserialize recovered data: ${deserializeError}`);
            // Fall through to backup/reset logic
          }
        }
      }

      // Try to load backup data first
      const backupResult = this.loadBackupData(chapterId);
      if (backupResult.success) {
        return backupResult;
      }

      // If backup fails, reset to default state
      this.log(`No backup available, resetting chapter ${chapterId} to default state`);

      // Clear corrupted data
      const storageKey = this.getChapterStorageKey(chapterId);
      localStorage.removeItem(storageKey);

      // Initialize fresh state
      this.lossState.initializeChapter(chapterId);
      this.state.isInitialized = true;
      this.state.currentChapterId = chapterId;
      this.state.lossesProcessed = 0;
      this.state.lastLossProcessedAt = 0;

      // Save the fresh state
      this.saveChapterState();

      return {
        success: true,
        message: 'Corrupted save data recovered by resetting to default state',
        details: {
          chapterId,
          recoveryMethod: 'reset_to_default',
          recoveredAt: Date.now(),
        },
      };
    } catch (error) {
      // Use error handler for final error reporting
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback({
          type: 'error',
          title: 'セーブデータの復旧に失敗しました',
          message: 'セーブデータが完全に破損しており、復旧できませんでした。',
          details: `章: ${chapterId}\nエラー: ${error instanceof Error ? error.message : String(error)}`,
          dismissible: false,
        });
      }

      return {
        success: false,
        error: GameplayError.SAVE_DATA_CORRUPTED,
        message: `Failed to recover corrupted save data: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Attempt to load backup data for a chapter
   * @param chapterId - ID of the chapter
   * @returns Backup load result
   */
  private loadBackupData(chapterId: string): GameplayErrorResult {
    try {
      const backupStorageKey = this.getBackupStorageKey(chapterId);
      const backupData = localStorage.getItem(backupStorageKey);

      if (!backupData) {
        return {
          success: false,
          error: GameplayError.SAVE_DATA_CORRUPTED,
          message: 'No backup data available',
        };
      }

      const parsedBackupData = JSON.parse(backupData);

      if (!CharacterLossTypeValidators.isValidChapterLossData(parsedBackupData)) {
        return {
          success: false,
          error: GameplayError.SAVE_DATA_CORRUPTED,
          message: 'Backup data is also corrupted',
        };
      }

      // Restore from backup
      this.lossState.deserialize(parsedBackupData);
      this.state.isInitialized = true;
      this.state.currentChapterId = chapterId;

      // Save the restored data as current
      this.saveChapterState();

      this.log(`Successfully restored chapter ${chapterId} from backup`);

      return {
        success: true,
        message: 'Successfully restored from backup data',
        details: {
          chapterId,
          recoveryMethod: 'backup_restore',
          recoveredAt: Date.now(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.SAVE_DATA_CORRUPTED,
        message: `Failed to load backup data: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Load manager state from storage
   */
  private loadManagerState(): void {
    try {
      const managerStorageKey = this.getManagerStateStorageKey();
      const savedManagerState = localStorage.getItem(managerStorageKey);

      if (savedManagerState) {
        const managerStateData = JSON.parse(savedManagerState);

        if (managerStateData.currentChapterId === this.state.currentChapterId) {
          this.state.lossesProcessed = managerStateData.lossesProcessed || 0;
          this.state.lastLossProcessedAt = managerStateData.lastLossProcessedAt || 0;
        }
      }
    } catch (error) {
      this.log(
        `Failed to load manager state: ${error instanceof Error ? error.message : String(error)}`
      );
      // Don't throw - this is not critical
    }
  }

  /**
   * Save backup data for recovery purposes
   * @param chapterId - ID of the chapter
   */
  private saveBackupData(chapterId: string): void {
    try {
      if (!this.state.isInitialized) {
        return;
      }

      const chapterLossData = this.lossState.serialize();
      const backupStorageKey = this.getBackupStorageKey(chapterId);

      localStorage.setItem(backupStorageKey, JSON.stringify(chapterLossData));

      this.log(`Backup data saved for chapter ${chapterId}`);
    } catch (error) {
      this.log(
        `Failed to save backup data: ${error instanceof Error ? error.message : String(error)}`
      );
      // Don't throw - this is not critical
    }
  }

  /**
   * Clear all saved data for a chapter
   * @param chapterId - ID of the chapter to clear
   * @returns Clear result
   */
  public clearChapterData(chapterId: string): GameplayErrorResult {
    try {
      const storageKey = this.getChapterStorageKey(chapterId);
      const backupStorageKey = this.getBackupStorageKey(chapterId);

      localStorage.removeItem(storageKey);
      localStorage.removeItem(backupStorageKey);

      // If this is the current chapter, reset state
      if (this.state.currentChapterId === chapterId) {
        this.state.isInitialized = false;
        this.state.currentChapterId = null;
        this.state.lossesProcessed = 0;
        this.state.lastLossProcessedAt = 0;
      }

      this.log(`Cleared all data for chapter ${chapterId}`);

      return {
        success: true,
        message: `Chapter data cleared successfully`,
        details: { chapterId, clearedAt: Date.now() },
      };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.SYSTEM_ERROR,
        message: `Failed to clear chapter data: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get storage key for chapter loss data
   * @param chapterId - ID of the chapter
   * @returns Storage key
   */
  private getChapterStorageKey(chapterId: string): string {
    return `character_loss_${chapterId}`;
  }

  /**
   * Get storage key for backup data
   * @param chapterId - ID of the chapter
   * @returns Backup storage key
   */
  private getBackupStorageKey(chapterId: string): string {
    return `character_loss_backup_${chapterId}`;
  }

  /**
   * Get storage key for manager state
   * @returns Manager state storage key
   */
  private getManagerStateStorageKey(): string {
    return 'character_loss_manager_state';
  }

  /**
   * Auto-save chapter state (called periodically or after significant changes)
   */
  public autoSave(): void {
    if (this.state.isInitialized && this.state.currentChapterId) {
      // Save current state
      this.saveChapterState();

      // Save backup data
      this.saveBackupData(this.state.currentChapterId);
    }
  }

  /**
   * Check if save data exists for a chapter
   * @param chapterId - ID of the chapter to check
   * @returns True if save data exists
   */
  public hasSaveData(chapterId: string): boolean {
    const storageKey = this.getChapterStorageKey(chapterId);
    return localStorage.getItem(storageKey) !== null;
  }

  /**
   * Get save data information for a chapter
   * @param chapterId - ID of the chapter
   * @returns Save data info or null if not found
   */
  public getSaveDataInfo(chapterId: string): {
    chapterId: string;
    lossCount: number;
    lastSaved: number;
    dataSize: number;
    hasBackup: boolean;
  } | null {
    try {
      const storageKey = this.getChapterStorageKey(chapterId);
      const savedData = localStorage.getItem(storageKey);

      if (!savedData) {
        return null;
      }

      const chapterLossData = JSON.parse(savedData);
      const backupStorageKey = this.getBackupStorageKey(chapterId);
      const hasBackup = localStorage.getItem(backupStorageKey) !== null;

      return {
        chapterId,
        lossCount: Object.keys(chapterLossData.lostCharacters || {}).length,
        lastSaved: chapterLossData.chapterStartTime || 0,
        dataSize: savedData.length,
        hasBackup,
      };
    } catch (error) {
      this.log(`Failed to get save data info for chapter ${chapterId}: ${error}`);
      return null;
    }
  }

  /**
   * Suspend chapter progress (save current state for later resumption)
   * @returns Suspend result
   */
  public suspendChapter(): GameplayErrorResult {
    try {
      if (!this.state.isInitialized || !this.state.currentChapterId) {
        return {
          success: false,
          error: GameplayError.INVALID_STAGE_DATA,
          message: 'No active chapter to suspend',
        };
      }

      const chapterId = this.state.currentChapterId;

      // Save current state with suspend flag
      const saveResult = this.saveChapterState();
      if (!saveResult.success) {
        return saveResult;
      }

      // Save additional suspend metadata
      const suspendData = {
        chapterId,
        suspendedAt: Date.now(),
        gameState: {
          currentTurn: this.lossState.getCurrentTurn(),
          totalLosses: this.state.lossesProcessed,
          dangerLevels: Array.from(this.dangerLevels.entries()),
        },
        units: this.allUnits.map(unit => ({
          id: unit.id,
          currentHP: unit.currentHP,
          position: unit.position,
          hasActed: unit.hasActed,
          hasMoved: unit.hasMoved,
        })),
      };

      const suspendStorageKey = this.getSuspendStorageKey(chapterId);
      localStorage.setItem(suspendStorageKey, JSON.stringify(suspendData));

      this.log(`Chapter ${chapterId} suspended successfully`);

      // Emit suspend event
      this.emit('chapter-suspended', {
        chapterId,
        suspendedAt: Date.now(),
        totalLosses: this.state.lossesProcessed,
      });

      return {
        success: true,
        message: `Chapter ${chapterId} suspended successfully`,
        details: {
          chapterId,
          suspendedAt: Date.now(),
          totalLosses: this.state.lossesProcessed,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.SYSTEM_ERROR,
        message: `Failed to suspend chapter: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Resume suspended chapter progress
   * @param chapterId - ID of the chapter to resume
   * @param units - Current units in the game (to restore state)
   * @returns Resume result
   */
  public resumeChapter(chapterId: string, units: Unit[]): GameplayErrorResult {
    try {
      // Load chapter loss state
      const loadResult = this.loadChapterState(chapterId);
      if (!loadResult.success) {
        return loadResult;
      }

      // Load suspend metadata
      const suspendStorageKey = this.getSuspendStorageKey(chapterId);
      const suspendDataStr = localStorage.getItem(suspendStorageKey);

      if (suspendDataStr) {
        try {
          const suspendData = JSON.parse(suspendDataStr);

          // Restore danger levels
          this.dangerLevels.clear();
          if (suspendData.gameState?.dangerLevels) {
            suspendData.gameState.dangerLevels.forEach(([unitId, level]: [string, DangerLevel]) => {
              this.dangerLevels.set(unitId, level);
            });
          }

          // Restore unit states if provided
          if (suspendData.units && units.length > 0) {
            suspendData.units.forEach((savedUnit: any) => {
              const currentUnit = units.find(u => u.id === savedUnit.id);
              if (currentUnit) {
                currentUnit.currentHP = savedUnit.currentHP;
                currentUnit.position = savedUnit.position;
                currentUnit.hasActed = savedUnit.hasActed;
                currentUnit.hasMoved = savedUnit.hasMoved;
              }
            });
          }

          this.log(`Restored suspend metadata for chapter ${chapterId}`);
        } catch (parseError) {
          this.log(`Failed to parse suspend metadata, continuing with basic resume: ${parseError}`);
        }

        // Clean up suspend data after successful resume
        localStorage.removeItem(suspendStorageKey);
      }

      // Update units
      this.allUnits = [...units];

      // Emit resume event
      this.emit('chapter-resumed', {
        chapterId,
        resumedAt: Date.now(),
        totalLosses: this.state.lossesProcessed,
        lostCharacters: this.getLostCharacters(),
      });

      this.log(`Chapter ${chapterId} resumed successfully`);

      return {
        success: true,
        message: `Chapter ${chapterId} resumed successfully`,
        details: {
          chapterId,
          resumedAt: Date.now(),
          totalLosses: this.state.lossesProcessed,
          lostCharacters: this.getLostCharacters().length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.SYSTEM_ERROR,
        message: `Failed to resume chapter: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Check if a chapter has suspended data
   * @param chapterId - ID of the chapter to check
   * @returns True if suspended data exists
   */
  public hasSuspendedData(chapterId: string): boolean {
    const suspendStorageKey = this.getSuspendStorageKey(chapterId);
    return localStorage.getItem(suspendStorageKey) !== null;
  }

  /**
   * Get suspend storage key for a chapter
   * @param chapterId - ID of the chapter
   * @returns Suspend storage key
   */
  private getSuspendStorageKey(chapterId: string): string {
    return `character_loss_suspend_${chapterId}`;
  }

  /**
   * Clear suspended data for a chapter
   * @param chapterId - ID of the chapter
   * @returns Clear result
   */
  public clearSuspendedData(chapterId: string): GameplayErrorResult {
    try {
      const suspendStorageKey = this.getSuspendStorageKey(chapterId);
      localStorage.removeItem(suspendStorageKey);

      return {
        success: true,
        message: `Suspended data cleared for chapter ${chapterId}`,
        details: { chapterId, clearedAt: Date.now() },
      };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.SYSTEM_ERROR,
        message: `Failed to clear suspended data: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Complete chapter and handle state reset
   * @returns Chapter completion result with summary
   */
  public completeChapter(): GameplayErrorResult & { summary?: ChapterLossSummary } {
    try {
      if (!this.state.isInitialized || !this.state.currentChapterId) {
        return {
          success: false,
          error: GameplayError.INVALID_STAGE_DATA,
          message: 'Chapter must be initialized to complete',
        };
      }

      const chapterId = this.state.currentChapterId;

      // Get chapter summary before reset
      const summary = this.lossState.getChapterSummary();

      // Save final state before reset
      const saveResult = this.saveChapterState();
      if (!saveResult.success) {
        this.log(`Warning: Failed to save final chapter state: ${saveResult.message}`);
      }

      // Reset chapter state
      this.lossState.resetChapterState();
      this.state.isInitialized = false;
      this.state.currentChapterId = null;
      this.state.lossesProcessed = 0;
      this.state.lastLossProcessedAt = 0;
      this.dangerLevels.clear();
      this.allUnits = [];

      // Clear saved data since chapter is complete
      this.clearChapterData(chapterId);

      // Emit chapter completed event
      this.emit('chapter-completed', {
        chapterId,
        summary,
        completedAt: Date.now(),
      });

      this.log(`Chapter ${chapterId} completed successfully`);

      return {
        success: true,
        message: `Chapter ${chapterId} completed successfully`,
        summary,
        details: {
          chapterId,
          completedAt: Date.now(),
          totalLosses: summary.lostCharacters.length,
          isPerfectClear: summary.isPerfectClear,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.SYSTEM_ERROR,
        message: `Failed to complete chapter: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Update danger levels for all units
   */
  private updateDangerLevels(): void {
    try {
      // Update danger levels using the warning system if available
      if (this.dangerWarningSystem) {
        this.dangerWarningSystem.updateDangerLevels(this.allUnits);
      } else {
        // Fallback to local danger level tracking
        for (const unit of this.allUnits) {
          if (unit.currentHP > 0) {
            const newDangerLevel = this.calculateDangerLevel(unit);
            const oldDangerLevel = this.dangerLevels.get(unit.id) || DangerLevel.NONE;

            if (newDangerLevel !== oldDangerLevel) {
              this.dangerLevels.set(unit.id, newDangerLevel);

              // Update visual effects if effects system is available
              if (this.lossEffects) {
                if (newDangerLevel !== DangerLevel.NONE) {
                  this.lossEffects.showDangerEffect(unit, newDangerLevel);
                } else {
                  this.lossEffects.hideDangerEffect(unit);
                }
              }

              // Emit danger level changed event
              this.emit('danger-level-changed', {
                unit,
                oldLevel: oldDangerLevel,
                newLevel: newDangerLevel,
              });
            }
          }
        }
      }
    } catch (error) {
      this.log(
        `Error updating danger levels: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Calculate danger level for a unit based on current HP
   * @param unit - Unit to calculate danger level for
   * @returns Danger level
   */
  public calculateDangerLevel(unit: Unit): DangerLevel {
    if (!unit || unit.currentHP <= 0) {
      return DangerLevel.CRITICAL;
    }

    const maxHP = unit.stats?.maxHP || unit.currentHP;
    return CharacterLossUtils.calculateDangerLevel(unit.currentHP, maxHP);
  }

  /**
   * Check if a character is lost
   * @param characterId - ID of the character to check
   * @returns True if the character is lost
   */
  public isCharacterLost(characterId: string): boolean {
    if (!this.state.isInitialized) {
      return false;
    }

    // Use performance-optimized check if available
    if (this.performanceManager) {
      return this.performanceManager.optimizedLossStateCheck(characterId);
    }

    return this.lossState.isLost(characterId);
  }

  /**
   * Check loss state for multiple characters efficiently (optimized batch operation)
   * @param characterIds - Array of character IDs to check
   * @returns Map of character ID to loss state
   */
  public checkMultipleCharacterLossStates(characterIds: string[]): Map<string, boolean> {
    if (!this.state.isInitialized) {
      return new Map(characterIds.map(id => [id, false]));
    }

    // Use performance manager for optimized batch check if available
    if (this.performanceManager) {
      return this.performanceManager.optimizedBatchLossStateCheck(characterIds);
    }

    // Fallback to individual checks
    const results = new Map<string, boolean>();
    for (const characterId of characterIds) {
      results.set(characterId, this.lossState.isLost(characterId));
    }
    return results;
  }

  /**
   * Legacy async version for backward compatibility
   * @param characterIds - Array of character IDs to check
   * @returns Promise resolving to Map of character ID to loss state
   */
  public async checkMultipleCharacterLossStatesAsync(
    characterIds: string[]
  ): Promise<Map<string, boolean>> {
    if (!this.state.isInitialized) {
      return new Map();
    }

    // Use performance-optimized batch check if available
    if (this.performanceManager) {
      return await this.performanceManager.optimizedBatchLossStateCheck(characterIds);
    }

    // Fallback to individual checks
    const results = new Map<string, boolean>();
    for (const characterId of characterIds) {
      results.set(characterId, this.lossState.isLost(characterId));
    }
    return results;
  }

  /**
   * Get all lost characters
   * @returns Array of lost characters
   */
  public getLostCharacters(): LostCharacter[] {
    return this.lossState.getLostCharacters();
  }

  /**
   * Get available characters (not lost)
   * @returns Array of available character IDs
   */
  public getAvailableCharacters(): string[] {
    return this.allUnits
      .filter(unit => !this.isCharacterLost(unit.id) && unit.currentHP > 0)
      .map(unit => unit.id);
  }

  /**
   * Validate party composition against lost characters
   * @param party - Array of character IDs in the party
   * @returns Party validation result
   */
  public validatePartyComposition(party: string[]): PartyValidationResult {
    const result: PartyValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      availableCharacters: this.getAvailableCharacters(),
      lostCharacters: this.getLostCharacters(),
      totalAvailable: this.getAvailableCharacters().length,
    };

    // Check for lost characters in party
    for (const characterId of party) {
      if (this.isCharacterLost(characterId)) {
        result.isValid = false;
        const lostCharacter = this.getLostCharacters().find(lc => lc.characterId === characterId);
        const characterName = lostCharacter?.name || characterId;

        result.errors.push({
          type: 'lost_character',
          characterId: characterId,
          message: `${characterName} is lost and cannot be used in this chapter`,
          severity: 'error',
        });
      }
    }

    // Validate input
    if (!Array.isArray(party)) {
      result.isValid = false;
      result.errors.push({
        type: 'invalid_character',
        message: 'Party members must be an array',
        severity: 'error',
      });
      return result;
    }

    // Check for insufficient party members (only if party is not empty)
    if (party.length > 0) {
      const validMembers = party.filter(id => !this.isCharacterLost(id));
      if (validMembers.length === 0) {
        result.isValid = false;
        result.errors.push({
          type: 'insufficient_members',
          message: 'Party must have at least one available character',
          severity: 'error',
        });
      }
    }

    // Add warnings for low available character count
    if (result.totalAvailable <= 2 && result.totalAvailable > 0) {
      result.warnings.push({
        type: 'missing_role',
        message: 'Very few characters available - consider being more careful in battle',
        severity: 'high',
      });
    }

    return result;
  }

  /**
   * Get available characters for party composition (full Unit objects)
   * @returns Array of available character units
   */
  public getAvailableCharacterUnits(): Unit[] {
    return this.allUnits.filter(
      unit => !this.isCharacterLost(unit.id) && unit.currentHP > 0 && unit.faction === 'player'
    );
  }

  /**
   * Check if a character can be selected for party composition
   * @param characterId - ID of the character to check
   * @returns Object with selection status and reason
   */
  public canSelectCharacterForParty(characterId: string): {
    canSelect: boolean;
    reason?: string;
    severity?: 'error' | 'warning';
  } {
    // Check if character exists
    const character = this.allUnits.find(unit => unit.id === characterId);
    if (!character) {
      return {
        canSelect: false,
        reason: 'Character not found',
        severity: 'error',
      };
    }

    // Check if character is lost (main requirement)
    if (this.isCharacterLost(characterId)) {
      const lostCharacter = this.getLostCharacters().find(lc => lc.characterId === characterId);
      const lossReason = lostCharacter ? ` (${lostCharacter.cause.description})` : '';

      return {
        canSelect: false,
        reason: `Character is lost and cannot be used in this chapter${lossReason}`,
        severity: 'error',
      };
    }

    // Check if character is alive
    if (character.currentHP <= 0) {
      return {
        canSelect: false,
        reason: 'Character has no HP remaining',
        severity: 'error',
      };
    }

    // Check if character is player faction
    if (character.faction !== 'player') {
      return {
        canSelect: false,
        reason: 'Only player characters can be selected',
        severity: 'error',
      };
    }

    // Character can be selected
    return { canSelect: true };
  }

  /**
   * Generate party composition suggestions based on available characters
   * @param currentParty - Current party composition (optional)
   * @param maxSuggestions - Maximum number of suggestions to return
   * @returns Array of character suggestions
   */
  public generatePartyCompositionSuggestions(
    currentParty?: string[],
    maxSuggestions: number = 5
  ): Array<{
    characterId: string;
    characterName: string;
    reason: string;
    priority: number;
    replacesLostCharacter?: string;
  }> {
    const suggestions: Array<{
      characterId: string;
      characterName: string;
      reason: string;
      priority: number;
      replacesLostCharacter?: string;
    }> = [];

    try {
      const availableCharacters = this.getAvailableCharacterUnits();
      const lostCharacters = this.getLostCharacters();
      const party = currentParty || [];

      // Suggest replacements for lost characters in current party
      for (const lostChar of lostCharacters) {
        if (party.includes(lostChar.characterId)) {
          const alternatives = availableCharacters
            .filter(char => !party.includes(char.id))
            .sort((a, b) => (b.level || 1) - (a.level || 1))
            .slice(0, 2);

          for (const alt of alternatives) {
            suggestions.push({
              characterId: alt.id,
              characterName: alt.name,
              reason: `Replacement for lost character ${lostChar.name}`,
              priority: 10,
              replacesLostCharacter: lostChar.characterId,
            });
          }
        }
      }

      // Suggest high-level available characters not in party
      const availableNotInParty = availableCharacters
        .filter(char => !party.includes(char.id))
        .sort((a, b) => (b.level || 1) - (a.level || 1))
        .slice(0, maxSuggestions);

      for (const char of availableNotInParty) {
        if (!suggestions.find(s => s.characterId === char.id)) {
          suggestions.push({
            characterId: char.id,
            characterName: char.name,
            reason: `High-level character (Level ${char.level || 1})`,
            priority: char.level || 1,
          });
        }
      }

      // Sort suggestions by priority and return top results
      return suggestions.sort((a, b) => b.priority - a.priority).slice(0, maxSuggestions);
    } catch (error) {
      this.log(`Error generating party composition suggestions: ${error}`);
      return [];
    }
  }

  /**
   * Generate user-friendly error messages for party composition issues
   * @param validationResult - Validation result to generate messages for
   * @returns Array of user-friendly error messages with suggested fixes
   */
  public generatePartyCompositionErrorMessages(validationResult: PartyValidationResult): Array<{
    message: string;
    suggestedFix: string;
    severity: 'error' | 'warning';
    actionable: boolean;
    characterId?: string;
  }> {
    const messages: Array<{
      message: string;
      suggestedFix: string;
      severity: 'error' | 'warning';
      actionable: boolean;
      characterId?: string;
    }> = [];

    // Process errors
    for (const error of validationResult.errors) {
      let suggestedFix = '';
      let actionable = true;

      switch (error.type) {
        case 'lost_character':
          const suggestions = this.generatePartyCompositionSuggestions();
          const replacement = suggestions.find(s => s.replacesLostCharacter === error.characterId);

          if (replacement) {
            suggestedFix = `Replace with ${replacement.characterName}`;
          } else if (validationResult.availableCharacters.length > 0) {
            suggestedFix = 'Choose from available characters list';
          } else {
            suggestedFix = 'No available characters to replace with';
            actionable = false;
          }
          break;

        case 'insufficient_members':
          if (validationResult.totalAvailable >= 1) {
            const needed = Math.max(1 - validationResult.availableCharacters.length, 0);
            suggestedFix =
              needed > 0 ? `Add ${needed} more character(s)` : 'Select available characters';
          } else {
            suggestedFix = 'No available characters - complete previous stages to recruit more';
            actionable = false;
          }
          break;

        case 'invalid_character':
          suggestedFix = 'Remove invalid character and select a valid one';
          break;

        case 'duplicate_character':
          suggestedFix = 'Remove duplicate characters from party';
          break;

        default:
          suggestedFix = 'Review party composition';
          break;
      }

      messages.push({
        message: error.message,
        suggestedFix,
        severity: 'error',
        actionable,
        characterId: error.characterId,
      });
    }

    // Process warnings
    for (const warning of validationResult.warnings) {
      let suggestedFix = '';

      switch (warning.type) {
        case 'low_level':
          suggestedFix = 'Consider using higher level characters if available';
          break;

        case 'unbalanced_party':
          suggestedFix = 'Try to include characters with different roles';
          break;

        case 'missing_role':
          suggestedFix = 'Be extra careful in battle to avoid losing more characters';
          break;

        default:
          suggestedFix = 'Consider the warning when planning strategy';
          break;
      }

      messages.push({
        message: warning.message,
        suggestedFix,
        severity: 'warning',
        actionable: true,
        characterId: warning.characterId,
      });
    }

    return messages;
  }

  /**
   * Complete chapter and get summary
   * @returns Chapter loss summary
   */
  public completeChapter(): ChapterLossSummary {
    if (!this.state.isInitialized) {
      throw this.createError(
        CharacterLossError.CHAPTER_NOT_INITIALIZED,
        'Chapter must be initialized to complete',
        { characterId: '', phase: 'chapter_completion' }
      );
    }

    const summary = this.lossState.getChapterSummary();

    // Show chapter completion summary in UI
    if (this.lossUI) {
      this.lossUI.showChapterCompletionSummary(summary).catch(error => {
        this.log(`Error showing chapter completion summary: ${error}`);
      });
    }

    // Emit chapter completed event
    this.emit('chapter-completed', {
      summary,
      isPerfectClear: summary.isPerfectClear,
      totalLosses: summary.lostCharacters.length,
    });

    this.log(`Chapter ${summary.chapterId} completed with ${summary.lostCharacters.length} losses`);

    return summary;
  }

  /**
   * Reset chapter state (for new chapter or restart)
   */
  public async resetChapterState(): Promise<void> {
    // Play chapter reset effect if effects system is available
    if (this.lossEffects) {
      await this.lossEffects.playChapterResetEffect();
      this.lossEffects.clearAllEffects();
    }

    this.lossState.resetChapterState();
    this.dangerLevels.clear();
    this.allUnits = [];

    this.state.lossesProcessed = 0;
    this.state.lastLossProcessedAt = 0;
    this.state.isProcessingLoss = false;

    this.emit('chapter-state-reset', {
      chapterId: this.state.currentChapterId,
    });

    this.log('Chapter state reset');
  }

  /**
   * Setup event listeners for system integration
   */
  private setupEventListeners(): void {
    // Listen to scene events
    this.scene.events.on('shutdown', this.onSceneShutdown.bind(this));
    this.scene.events.on('destroy', this.onSceneDestroy.bind(this));
  }

  /**
   * Handle battle target selected event
   * @param event - Battle target selected event data
   */
  private onBattleTargetSelected(event: any): void {
    if (this.config.enableDangerWarnings && event.target) {
      const dangerLevel = this.calculateDangerLevel(event.target);
      if (dangerLevel !== DangerLevel.NONE) {
        this.emit('danger-warning', {
          unit: event.target,
          dangerLevel,
          attacker: event.attacker,
        });
      }
    }
  }

  /**
   * Handle unit defeated event from battle system
   * @param event - Unit defeated event data
   */
  private async onUnitDefeated(event: any): void {
    if (!this.config.enableAutoLossProcessing || !event.unit) {
      return;
    }

    try {
      // Create loss cause from battle result
      const cause = this.createLossCauseFromBattle(event);

      // Process the loss
      await this.processCharacterLoss(event.unit, cause);
    } catch (error) {
      this.log(
        `Error processing automatic character loss: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Handle character converted to NPC event
   * @param event - Character converted to NPC event data
   */
  private onCharacterConvertedToNPC(event: any): void {
    this.log(`Character ${event.unitId} converted to NPC - will not be processed as loss`);
  }

  /**
   * Handle recruitment failed event
   * @param event - Recruitment failed event data
   */
  private onRecruitmentFailed(event: any): void {
    this.log(`Recruitment failed for ${event.unitId} - character may be lost normally`);
  }

  /**
   * Handle battle completion notification from battle system
   * @param battleResult - Result of the completed battle
   */
  public async onBattleCompleted(battleResult: any): Promise<void> {
    try {
      // Update danger levels after battle
      this.updateDangerLevels();

      // Check if any units need loss processing
      if (battleResult.targetDefeated && battleResult.target.faction === 'player') {
        // Battle system should have already processed the loss
        // This is just for additional validation and UI updates
        if (!this.isCharacterLost(battleResult.target.id)) {
          this.log('Warning: Player unit defeated but not marked as lost', {
            unit: battleResult.target.name,
          });
        }
      }

      // Update UI after battle
      if (this.lossUI) {
        this.updateUIAfterBattle(battleResult);
      }

      // Emit battle completion event
      this.emit('battle-completed', {
        battleResult,
        totalLosses: this.state.lossesProcessed,
      });
    } catch (error) {
      this.log(
        `Error handling battle completion: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Handle character loss notification from battle system
   * @param unit - Unit that was lost
   * @param cause - Cause of the loss
   * @param battleResult - Battle result that caused the loss
   */
  public async onCharacterLostInBattle(
    unit: Unit,
    cause: LossCause,
    battleResult: any
  ): Promise<void> {
    try {
      // Verify the loss was processed correctly
      if (!this.isCharacterLost(unit.id)) {
        this.log('Warning: Character loss notification received but character not marked as lost', {
          unit: unit.name,
          cause: cause.description,
        });
        return;
      }

      // Update UI to reflect the loss
      if (this.lossUI) {
        this.lossUI.updateCharacterStatus(unit);
      }

      // Show loss effects if not already shown
      if (this.lossEffects) {
        // Effects should have been shown during processCharacterLoss
        // This is just for additional visual feedback
        this.lossEffects.hideDangerEffect(unit);
      }

      // Emit character lost in battle event
      this.emit('character-lost-in-battle', {
        unit,
        cause,
        battleResult,
        totalLosses: this.state.lossesProcessed,
      });

      this.log(`Character loss in battle confirmed: ${unit.name}`);
    } catch (error) {
      this.log(
        `Error handling character loss in battle: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Handle unit updated event from game state manager
   * @param event - Unit updated event data
   */
  private onUnitUpdated(event: any): void {
    if (event.unit) {
      // Update local unit data
      const unitIndex = this.allUnits.findIndex(u => u.id === event.unit.id);
      if (unitIndex !== -1) {
        this.allUnits[unitIndex] = event.unit;
      }

      // Update danger level
      const newDangerLevel = this.calculateDangerLevel(event.unit);
      const oldDangerLevel = this.dangerLevels.get(event.unit.id) || DangerLevel.NONE;

      if (newDangerLevel !== oldDangerLevel) {
        this.dangerLevels.set(event.unit.id, newDangerLevel);

        this.emit('danger-level-changed', {
          unit: event.unit,
          oldLevel: oldDangerLevel,
          newLevel: newDangerLevel,
        });
      }
    }
  }

  /**
   * Handle turn changed event from game state manager
   * @param event - Turn changed event data
   */
  private onTurnChanged(event: any): void {
    if (event.currentTurn) {
      this.lossState.setCurrentTurn(event.currentTurn);
    }
  }

  /**
   * Handle loss animation complete event from effects system
   * @param event - Loss animation complete event data
   */
  private onLossAnimationComplete(event: any): void {
    this.log(`Loss animation completed for ${event.unit?.name || 'unknown unit'}`);

    // Emit event for other systems that might need to know
    this.emit('loss-animation-finished', {
      unit: event.unit,
      cause: event.cause,
    });
  }

  /**
   * Handle danger effect shown event from effects system
   * @param event - Danger effect shown event data
   */
  private onDangerEffectShown(event: any): void {
    this.log(
      `Danger effect shown for ${event.unit?.name || 'unknown unit'} at level ${event.dangerLevel}`
    );

    // Emit event for other systems that might need to know
    this.emit('danger-warning-displayed', {
      unit: event.unit,
      dangerLevel: event.dangerLevel,
    });
  }

  /**
   * Handle scene shutdown event
   */
  private onSceneShutdown(): void {
    if (this.config.enableLossLogging) {
      console.log(
        '[CharacterLossManager] Scene shutting down - cleaning up character loss manager'
      );
    }
  }

  /**
   * Handle scene destroy event
   */
  private onSceneDestroy(): void {
    this.destroy();
  }

  /**
   * Create loss cause from battle event data
   * @param battleEvent - Battle event data
   * @returns Loss cause
   */
  private createLossCauseFromBattle(battleEvent: any): LossCause {
    if (battleEvent.battleResult) {
      const result = battleEvent.battleResult;

      if (result.isCritical) {
        return CharacterLossUtils.createCriticalDamageCause(
          result.attacker.id,
          result.attacker.name,
          result.finalDamage
        );
      } else {
        return CharacterLossUtils.createBattleDefeatCause(
          result.attacker.id,
          result.attacker.name,
          result.finalDamage
        );
      }
    }

    // Fallback generic cause
    return {
      type: LossCauseType.BATTLE_DEFEAT,
      description: 'Character defeated in battle',
      timestamp: Date.now(),
    };
  }

  /**
   * Create error details object
   * @param error - Error type
   * @param message - Error message
   * @param context - Error context
   * @returns Error details object
   */
  private createError(
    error: CharacterLossError,
    message: string,
    context: Partial<LossContext>
  ): CharacterLossErrorDetails {
    return {
      error,
      message,
      context: {
        characterId: context.characterId || '',
        chapterId: context.chapterId || this.state.currentChapterId || undefined,
        turn: context.turn || this.lossState.getCurrentTurn(),
        phase: context.phase || 'unknown',
        additionalData: context.additionalData || {},
      },
      timestamp: Date.now(),
      recoverable: error !== CharacterLossError.SAVE_DATA_CORRUPTED,
      suggestedAction: this.getSuggestedAction(error),
    };
  }

  /**
   * Get suggested action for error recovery
   * @param error - Error type
   * @returns Suggested action string
   */
  private getSuggestedAction(error: CharacterLossError): string {
    switch (error) {
      case CharacterLossError.CHAPTER_NOT_INITIALIZED:
        return 'Initialize chapter before performing operations';
      case CharacterLossError.INVALID_CHARACTER:
        return 'Verify character data is valid and complete';
      case CharacterLossError.ALREADY_LOST:
        return 'Check character loss status before processing loss';
      case CharacterLossError.LOSS_PROCESSING_FAILED:
        return 'Check system logs and retry loss processing';
      case CharacterLossError.INVALID_LOSS_CAUSE:
        return 'Provide valid loss cause with required fields';
      default:
        return 'Check system logs for detailed error information';
    }
  }

  /**
   * Log message with optional data
   * @param message - Log message
   * @param data - Optional data to log
   */
  private log(message: string, data?: any): void {
    if (this.config.enableLossLogging) {
      if (data) {
        console.log(`[CharacterLossManager] ${message}`, data);
      } else {
        console.log(`[CharacterLossManager] ${message}`);
      }
    }
  }

  /**
   * Get current manager state
   * @returns Current state (read-only)
   */
  public getState(): Readonly<CharacterLossManagerState> {
    return { ...this.state };
  }

  /**
   * Get current configuration
   * @returns Current configuration (read-only)
   */
  public getConfig(): Readonly<CharacterLossManagerConfig> {
    return { ...this.config };
  }

  /**
   * Check if manager is initialized
   * @returns True if initialized
   */
  public isInitialized(): boolean {
    return this.state.isInitialized;
  }

  /**
   * Get current chapter ID
   * @returns Current chapter ID or null
   */
  public getCurrentChapterId(): string | null {
    return this.state.currentChapterId;
  }

  /**
   * Get total losses processed this chapter
   * @returns Number of losses processed
   */
  public getTotalLossesProcessed(): number {
    return this.state.lossesProcessed;
  }

  /**
   * Check if loss processing is currently active
   * @returns True if processing loss
   */
  public isProcessingLoss(): boolean {
    return this.state.isProcessingLoss;
  }

  /**
   * Handle danger level changed event from warning system
   * @param event - Danger level changed event data
   */
  private onDangerLevelChanged(event: any): void {
    if (event.unit) {
      // Update local danger level tracking
      this.dangerLevels.set(event.unit.id, event.newLevel);

      // Update visual effects if effects system is available
      if (this.lossEffects) {
        if (event.newLevel !== DangerLevel.NONE) {
          this.lossEffects.showDangerEffect(event.unit, event.newLevel);
        } else {
          this.lossEffects.hideDangerEffect(event.unit);
        }
      }

      this.log(
        `Danger level changed for ${event.unit.name}: ${event.oldLevel} -> ${event.newLevel}`
      );
    }
  }

  /**
   * Handle confirmation dialog shown event from warning system
   * @param event - Confirmation dialog shown event data
   */
  private onConfirmationDialogShown(event: any): void {
    this.log(
      `Confirmation dialog shown for ${event.unit?.name || 'unknown unit'} action: ${event.action?.type || 'unknown'}`
    );
  }

  /**
   * Handle important character warning shown event from warning system
   * @param event - Important character warning shown event data
   */
  private onImportantCharacterWarningShown(event: any): void {
    this.log(`Important character warning shown for ${event.unit?.name || 'unknown unit'}`);

    // Emit special event for important character danger
    this.emit('important-character-in-danger', {
      unit: event.unit,
      dangerLevel: this.dangerWarningSystem?.getDangerLevel(event.unit.id) || DangerLevel.CRITICAL,
    });
  }

  /**
   * Handle party composition updated event from UI
   * @param event - Party composition updated event data
   */
  private onPartyCompositionUpdated(event: any): void {
    this.log(`Party composition updated: ${event.lostCharacters}/${event.totalCharacters} lost`);

    // Update UI with current loss state if needed
    if (this.lossUI && event.displayStates) {
      // Emit event for other systems that might need to know about party composition changes
      this.emit('party-composition-changed', {
        totalCharacters: event.totalCharacters,
        lostCharacters: event.lostCharacters,
        displayStates: event.displayStates,
      });
    }
  }

  /**
   * Handle chapter summary dismissed event from UI
   * @param event - Chapter summary dismissed event data
   */
  private onChapterSummaryDismissed(event: any): void {
    this.log(`Chapter summary dismissed for chapter ${event.chapterId}`);

    // Reset chapter state after summary is dismissed
    this.resetChapterState();

    // Emit event for scene transition or next chapter preparation
    this.emit('chapter-summary-dismissed', {
      chapterId: event.chapterId,
      isPerfectClear: event.isPerfectClear,
      lostCharacters: event.lostCharacters,
    });
  }

  /**
   * Handle party validation result shown event from UI
   * @param event - Party validation result event data
   */
  private onPartyValidationShown(event: any): void {
    this.log(`Party validation result shown: ${event.isValid ? 'valid' : 'invalid'} party`);

    // Emit event for other systems that might need to handle validation results
    this.emit('party-validation-completed', {
      isValid: event.isValid,
      errors: event.errors,
      warnings: event.warnings,
      availableCharacters: event.availableCharacters,
    });
  }

  /**
   * Handle error action from error handler
   * @param event - Error action event
   */
  private onErrorAction(event: { action: string; context: any; data?: any }): void {
    this.log(`Error action received: ${event.action}`);

    switch (event.action) {
      case 'skip':
        // Skip the current operation
        this.emit('error-action-skip', event.context);
        break;

      case 'reset':
        // Reset chapter state
        if (event.context.chapterId) {
          this.resetChapterForRecovery(event.context.chapterId);
        }
        break;

      case 'restore_backup':
        // Restore from backup data
        if (event.data && event.context.chapterId) {
          this.restoreFromBackup(event.context.chapterId, event.data);
        }
        break;

      case 'use_sanitized':
        // Use sanitized data
        if (event.data && event.context.chapterId) {
          this.useSanitizedData(event.context.chapterId, event.data);
        }
        break;

      case 'acknowledge':
        // User acknowledged the error
        this.emit('error-acknowledged', event.context);
        break;

      default:
        this.log(`Unknown error action: ${event.action}`);
    }
  }

  /**
   * Handle user feedback from error handler
   * @param message - User feedback message
   */
  private onUserFeedback(message: any): void {
    this.log(`User feedback: ${message.type} - ${message.title}`);

    // Forward to UI system if available
    if (this.lossUI && typeof (this.lossUI as any).showUserFeedback === 'function') {
      (this.lossUI as any).showUserFeedback(message);
    }

    // Emit event for other systems
    this.emit('user-feedback', message);
  }

  /**
   * Handle performance warnings from performance manager
   * @param warning - Performance warning data
   */
  private onPerformanceWarning(warning: any): void {
    this.log(
      `Performance warning: ${warning.type} - actual: ${warning.actualTime}ms, target: ${warning.targetTime}ms`
    );

    // Emit event for monitoring systems
    this.emit('performance-warning', warning);

    // Take corrective action if needed
    if (warning.type === 'loss-state-check-slow' && this.performanceManager) {
      // Trigger memory optimization to improve performance
      this.performanceManager.optimizeMemoryUsage();
    }
  }

  /**
   * Handle memory optimization completion from performance manager
   * @param data - Memory optimization data
   */
  private onMemoryOptimized(data: any): void {
    this.log(`Memory optimized: ${data.memorySaved} bytes saved`);

    // Emit event for monitoring systems
    this.emit('memory-optimized', data);
  }

  /**
   * Reset chapter for error recovery
   * @param chapterId - Chapter ID to reset
   */
  private resetChapterForRecovery(chapterId: string): void {
    try {
      this.log(`Resetting chapter ${chapterId} for error recovery`);

      // Clear storage
      const storageKey = this.getChapterStorageKey(chapterId);
      localStorage.removeItem(storageKey);

      // Clear backup
      const backupKey = `character_loss_backup_${chapterId}`;
      localStorage.removeItem(backupKey);

      // Initialize fresh state
      this.lossState.initializeChapter(chapterId);
      this.state.isInitialized = true;
      this.state.currentChapterId = chapterId;
      this.state.lossesProcessed = 0;
      this.state.lastLossProcessedAt = 0;

      // Clear tracking data
      this.allUnits = [];
      this.dangerLevels.clear();

      // Save fresh state
      this.saveChapterState();

      this.emit('chapter-reset-for-recovery', { chapterId });
      this.log(`Chapter ${chapterId} reset successfully`);
    } catch (error) {
      this.log(`Failed to reset chapter ${chapterId}: ${error}`);
      this.emit('chapter-reset-failed', { chapterId, error });
    }
  }

  /**
   * Restore chapter from backup data
   * @param chapterId - Chapter ID
   * @param backupData - Backup data to restore
   */
  private restoreFromBackup(chapterId: string, backupData: any): void {
    try {
      this.log(`Restoring chapter ${chapterId} from backup`);

      // Deserialize backup data
      this.lossState.deserialize(backupData);
      this.state.isInitialized = true;
      this.state.currentChapterId = chapterId;

      // Save restored state
      this.saveChapterState();

      this.emit('chapter-restored-from-backup', { chapterId });
      this.log(`Chapter ${chapterId} restored from backup successfully`);
    } catch (error) {
      this.log(`Failed to restore chapter ${chapterId} from backup: ${error}`);
      this.emit('chapter-restore-failed', { chapterId, error });
    }
  }

  /**
   * Use sanitized data for chapter
   * @param chapterId - Chapter ID
   * @param sanitizedData - Sanitized data to use
   */
  private useSanitizedData(chapterId: string, sanitizedData: any): void {
    try {
      this.log(`Using sanitized data for chapter ${chapterId}`);

      // Deserialize sanitized data
      this.lossState.deserialize(sanitizedData);
      this.state.isInitialized = true;
      this.state.currentChapterId = chapterId;

      // Save sanitized state
      this.saveChapterState();

      this.emit('chapter-sanitized-data-used', { chapterId });
      this.log(`Chapter ${chapterId} using sanitized data successfully`);
    } catch (error) {
      this.log(`Failed to use sanitized data for chapter ${chapterId}: ${error}`);
      this.emit('chapter-sanitized-data-failed', { chapterId, error });
    }
  }

  /**
   * Update UI after character loss
   * Updates party composition display and stage selection display
   */
  private updateUIAfterLoss(): void {
    if (!this.lossUI) {
      return;
    }

    try {
      // Get current character states
      const lostCharacters = this.lossState.getLostCharacters();
      const availableCharacters = this.allUnits.filter(unit => !this.isCharacterLost(unit.id));

      // Update party composition display
      this.lossUI.updatePartyCompositionDisplay(this.allUnits, lostCharacters);

      // Update stage selection loss count
      this.lossUI.updateStageSelectionLossCount(lostCharacters.length, this.allUnits.length);

      // Show warning if loss rate is high
      const lossPercentage =
        this.allUnits.length > 0 ? (lostCharacters.length / this.allUnits.length) * 100 : 0;
      if (lossPercentage >= 50) {
        this.lossUI.showStageSelectionWarning('high', 'Many characters have been lost!');
      } else if (lossPercentage >= 25) {
        this.lossUI.showStageSelectionWarning('medium', 'Several characters have been lost.');
      }

      this.log(
        `UI updated after loss: ${lostCharacters.length}/${this.allUnits.length} characters lost`
      );
    } catch (error) {
      this.log(`Error updating UI after loss: ${error}`);

      if (this.lossUI) {
        this.lossUI.showErrorMessage(
          this.createError(
            CharacterLossError.UI_UPDATE_FAILED,
            'Failed to update UI after character loss',
            { characterId: '', phase: 'ui_update' }
          )
        );
      }
    }
  }

  /**
   * Update UI after battle completion
   * @param battleResult - Battle result data
   */
  private updateUIAfterBattle(battleResult: any): void {
    if (!this.lossUI) {
      return;
    }

    try {
      // Update character status for all units involved in battle
      if (battleResult.attacker) {
        this.lossUI.updateCharacterStatus(battleResult.attacker);
      }

      if (battleResult.target) {
        this.lossUI.updateCharacterStatus(battleResult.target);
      }

      // Update party composition if any losses occurred
      if (battleResult.targetDefeated && battleResult.target.faction === 'player') {
        this.lossUI.updatePartyEditUI();
      }
    } catch (error) {
      this.log(
        `Error updating UI after battle: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Apply loss state to battle result
   * @param battleResult - Battle result to modify
   * @returns Modified battle result with loss state information
   */
  public applyLossStateToBattleResult(battleResult: any): any {
    try {
      // Add loss information to battle result
      const modifiedResult = {
        ...battleResult,
        lossInformation: {
          targetWasLost: false,
          lossData: null,
          totalLossesInChapter: this.state.lossesProcessed,
          remainingPlayerUnits: this.getAvailableCharacterUnits().length,
        },
      };

      // Check if target was lost
      if (battleResult.targetDefeated && battleResult.target.faction === 'player') {
        const lostCharacter = this.lossState.getLostCharacter(battleResult.target.id);
        if (lostCharacter) {
          modifiedResult.lossInformation.targetWasLost = true;
          modifiedResult.lossInformation.lossData = lostCharacter;
        }
      }

      return modifiedResult;
    } catch (error) {
      this.log(
        `Error applying loss state to battle result: ${error instanceof Error ? error.message : String(error)}`
      );
      return battleResult;
    }
  }

  /**
   * Update party composition UI with current character states
   * @param characters - All characters to display
   */
  public updatePartyCompositionUI(characters: Unit[]): void {
    if (!this.lossUI) {
      return;
    }

    try {
      const lostCharacters = this.lossState.getLostCharacters();
      this.lossUI.updatePartyCompositionDisplay(characters, lostCharacters);

      this.log(`Party composition UI updated with ${characters.length} characters`);
    } catch (error) {
      this.log(`Error updating party composition UI: ${error}`);
    }
  }

  /**
   * Validate party composition and show UI feedback
   * @param party - Array of character IDs in the party
   * @returns Party validation result
   */
  public validatePartyCompositionWithUI(party: string[]): PartyValidationResult {
    const result = this.validatePartyComposition(party);

    // Show validation result in UI
    if (this.lossUI) {
      this.lossUI.showPartyValidationResult(result);
    }

    return result;
  }

  /**
   * Show character selection feedback in UI
   * @param characterId - ID of the character
   * @param canSelect - Whether the character can be selected
   * @param reason - Reason why character cannot be selected
   */
  public showCharacterSelectionFeedback(
    characterId: string,
    canSelect: boolean,
    reason?: string
  ): void {
    if (!this.lossUI) {
      return;
    }

    try {
      this.lossUI.showCharacterSelectionFeedback(characterId, canSelect, reason);

      // Also apply grayout effect if character is lost
      if (!canSelect && this.isCharacterLost(characterId)) {
        this.lossUI.showCharacterGrayoutEffect(characterId, true);
      }
    } catch (error) {
      this.log(`Error showing character selection feedback: ${error}`);
    }
  }

  /**
   * Register character sprite with UI system
   * @param characterId - Character ID
   * @param sprite - Character sprite
   */
  public registerCharacterSprite(characterId: string, sprite: Phaser.GameObjects.Sprite): void {
    if (this.lossUI) {
      this.lossUI.registerCharacterSprite(characterId, sprite);
    }
  }

  /**
   * Unregister character sprite from UI system
   * @param characterId - Character ID
   */
  public unregisterCharacterSprite(characterId: string): void {
    if (this.lossUI) {
      this.lossUI.unregisterCharacterSprite(characterId);
    }
  }

  /**
   * Check if character is in danger and show confirmation dialog if needed
   * @param unit - Unit to check
   * @param action - Action to be performed
   * @returns Promise that resolves with whether action should proceed
   */
  public async checkDangerAndConfirm(unit: Unit, action: any): Promise<boolean> {
    if (!this.dangerWarningSystem) {
      return true; // No warning system, allow action
    }

    const dangerLevel = this.dangerWarningSystem.getDangerLevel(unit.id);

    // Show confirmation dialog for dangerous actions
    if (
      dangerLevel === DangerLevel.CRITICAL ||
      (dangerLevel === DangerLevel.HIGH && this.dangerWarningSystem.isImportantCharacter(unit.id))
    ) {
      const result = await this.dangerWarningSystem.showActionConfirmationDialog(unit, action);
      return result.confirmed;
    }

    return true; // Not dangerous enough to require confirmation
  }

  /**
   * Destroy the character loss manager and clean up resources
   */
  public destroy(): void {
    try {
      // Remove event listeners
      this.removeAllListeners();

      // Clear data
      this.allUnits = [];
      this.dangerLevels.clear();

      // Reset state
      this.state.isInitialized = false;
      this.state.isProcessingLoss = false;

      // Clear effects system
      if (this.lossEffects) {
        this.lossEffects.clearAllEffects();
        this.lossEffects = null;
      }

      // Clear danger warning system
      if (this.dangerWarningSystem) {
        this.dangerWarningSystem.destroy();
        this.dangerWarningSystem = null;
      }

      // Clear loss UI system
      if (this.lossUI) {
        this.lossUI.destroy();
        this.lossUI = null;
      }

      // Clear system references
      this.battleSystem = null;
      this.recruitmentSystem = null;
      this.gameStateManager = null;
      this.eventEmitter = null;

      this.log('Character loss manager destroyed');
    } catch (error) {
      console.error('Error destroying character loss manager:', error);
    }
  }
}
