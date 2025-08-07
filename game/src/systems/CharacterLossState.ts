/**
 * CharacterLossState - Chapter-based character state management system
 *
 * This class manages character loss states within a chapter, including:
 * - Chapter initialization and reset
 * - Character loss recording and tracking
 * - Loss state queries and validation
 * - Data serialization for persistence
 */

import {
  LostCharacter,
  LossRecord,
  ChapterLossSummary,
  ChapterLossData,
  LossCause,
  CharacterLossError,
  CharacterLossErrorDetails,
  LossContext,
  CharacterLossTypeValidators,
  CharacterLossUtils,
} from '../types/characterLoss';
import { Unit } from '../types/gameplay';

/**
 * Interface for CharacterLossState class
 */
export interface ICharacterLossState {
  // Chapter management
  initializeChapter(chapterId: string): void;
  resetChapterState(): void;
  isChapterInitialized(): boolean;
  getCurrentChapterId(): string | null;

  // Loss recording
  recordLoss(unit: Unit, cause: LossCause): void;
  isLost(characterId: string): boolean;
  getLostCharacter(characterId: string): LostCharacter | null;

  // State queries
  getLostCharacters(): LostCharacter[];
  getLossHistory(): LossRecord[];
  getChapterSummary(): ChapterLossSummary;
  getTotalLosses(): number;
  isPerfectChapter(): boolean;

  // Data persistence
  serialize(): ChapterLossData;
  deserialize(data: ChapterLossData): void;

  // Validation
  validateState(): boolean;
  getStateErrors(): CharacterLossErrorDetails[];
}

/**
 * CharacterLossState implementation
 * Manages character loss state within a single chapter
 */
export class CharacterLossState implements ICharacterLossState {
  private chapterId: string | null = null;
  private lostCharacters: Map<string, LostCharacter> = new Map();
  private lossHistory: LossRecord[] = [];
  private chapterStartTime: number = 0;
  private currentTurn: number = 1;
  private totalCharactersInChapter: number = 0;
  private participatingCharacters: Set<string> = new Set();

  /**
   * Initialize chapter state
   * @param chapterId - ID of the chapter to initialize
   */
  initializeChapter(chapterId: string): void {
    if (!chapterId || chapterId.trim().length === 0) {
      throw this.createError(CharacterLossError.INVALID_CHARACTER, 'Chapter ID cannot be empty', {
        characterId: '',
        chapterId,
      });
    }

    this.chapterId = chapterId;
    this.lostCharacters.clear();
    this.lossHistory = [];
    this.chapterStartTime = Date.now();
    this.currentTurn = 1;
    this.totalCharactersInChapter = 0;
    this.participatingCharacters.clear();

    console.log(
      `[CharacterLossState] Chapter ${chapterId} initialized at ${new Date(this.chapterStartTime).toISOString()}`
    );
  }

  /**
   * Reset chapter state to initial values
   */
  resetChapterState(): void {
    if (!this.chapterId) {
      console.warn('[CharacterLossState] Attempting to reset uninitialized chapter');
      return;
    }

    const previousChapterId = this.chapterId;
    const previousLossCount = this.lostCharacters.size;

    this.lostCharacters.clear();
    this.lossHistory = [];
    this.chapterStartTime = Date.now();
    this.currentTurn = 1;
    this.participatingCharacters.clear();

    console.log(
      `[CharacterLossState] Chapter ${previousChapterId} state reset (${previousLossCount} losses cleared)`
    );
  }

  /**
   * Check if chapter is initialized
   * @returns true if chapter is initialized
   */
  isChapterInitialized(): boolean {
    return this.chapterId !== null && this.chapterStartTime > 0;
  }

  /**
   * Get current chapter ID
   * @returns current chapter ID or null if not initialized
   */
  getCurrentChapterId(): string | null {
    return this.chapterId;
  }

  /**
   * Record a character loss
   * @param unit - The unit that was lost
   * @param cause - The cause of the loss
   */
  recordLoss(unit: Unit, cause: LossCause): void {
    if (!this.isChapterInitialized()) {
      throw this.createError(
        CharacterLossError.CHAPTER_NOT_INITIALIZED,
        'Chapter must be initialized before recording losses',
        { characterId: unit.id, chapterId: this.chapterId }
      );
    }

    if (!unit || !unit.id || unit.id.trim().length === 0) {
      throw this.createError(
        CharacterLossError.INVALID_CHARACTER,
        'Invalid unit provided for loss recording',
        { characterId: unit?.id || '', chapterId: this.chapterId }
      );
    }

    if (!CharacterLossTypeValidators.isValidLossCause(cause)) {
      throw this.createError(CharacterLossError.INVALID_LOSS_CAUSE, 'Invalid loss cause provided', {
        characterId: unit.id,
        chapterId: this.chapterId,
      });
    }

    // Check if character is already lost
    if (this.isLost(unit.id)) {
      console.warn(
        `[CharacterLossState] Character ${unit.id} is already lost, skipping duplicate loss recording`
      );
      return;
    }

    // Add character to participating characters if not already present
    this.participatingCharacters.add(unit.id);

    // Create lost character record
    const lostCharacter: LostCharacter = {
      characterId: unit.id,
      name: unit.name || `Character ${unit.id}`,
      lostAt: Date.now(),
      turn: this.currentTurn,
      cause: { ...cause }, // Deep copy the cause
      level: unit.level || 1,
      wasRecruited: unit.wasRecruited || false,
      position: unit.position ? { ...unit.position } : undefined,
    };

    // Validate the created lost character
    if (!CharacterLossTypeValidators.isValidLostCharacter(lostCharacter)) {
      throw this.createError(
        CharacterLossError.LOSS_PROCESSING_FAILED,
        'Failed to create valid lost character record',
        { characterId: unit.id, chapterId: this.chapterId }
      );
    }

    // Record the loss
    this.lostCharacters.set(unit.id, lostCharacter);

    // Create loss record for history
    const lossRecord: LossRecord = {
      ...lostCharacter,
      chapterId: this.chapterId!,
      stageId: this.getCurrentStageId(),
      recoverable: false, // Losses are not recoverable by default
    };

    this.lossHistory.push(lossRecord);

    console.log(
      `[CharacterLossState] Character ${unit.name} (${unit.id}) lost at turn ${this.currentTurn}: ${cause.description}`
    );
  }

  /**
   * Check if a character is lost
   * @param characterId - ID of the character to check
   * @returns true if the character is lost
   */
  isLost(characterId: string): boolean {
    if (!characterId || characterId.trim().length === 0) {
      return false;
    }

    return this.lostCharacters.has(characterId);
  }

  /**
   * Get lost character data
   * @param characterId - ID of the character
   * @returns lost character data or null if not lost
   */
  getLostCharacter(characterId: string): LostCharacter | null {
    if (!characterId || characterId.trim().length === 0) {
      return null;
    }

    const lostCharacter = this.lostCharacters.get(characterId);
    return lostCharacter ? CharacterLossUtils.cloneLostCharacter(lostCharacter) : null;
  }

  /**
   * Get all lost characters
   * @returns array of lost characters
   */
  getLostCharacters(): LostCharacter[] {
    return Array.from(this.lostCharacters.values()).map(char =>
      CharacterLossUtils.cloneLostCharacter(char)
    );
  }

  /**
   * Get complete loss history
   * @returns array of loss records
   */
  getLossHistory(): LossRecord[] {
    return this.lossHistory.map(record => ({ ...record }));
  }

  /**
   * Get chapter summary
   * @returns chapter loss summary
   */
  getChapterSummary(): ChapterLossSummary {
    if (!this.isChapterInitialized()) {
      throw this.createError(
        CharacterLossError.CHAPTER_NOT_INITIALIZED,
        'Chapter must be initialized to get summary',
        { characterId: '', chapterId: this.chapterId }
      );
    }

    const lostCharacters = this.getLostCharacters();
    const survivedCharacters = Array.from(this.participatingCharacters).filter(
      id => !this.isLost(id)
    );

    const summary: ChapterLossSummary = {
      chapterId: this.chapterId!,
      chapterName: this.getChapterName(),
      totalCharacters: this.participatingCharacters.size,
      lostCharacters,
      survivedCharacters,
      chapterDuration: Date.now() - this.chapterStartTime,
      totalTurns: this.currentTurn,
      isPerfectClear: lostCharacters.length === 0,
      completedAt: Date.now(),
    };

    // Validate the summary before returning
    if (!CharacterLossTypeValidators.isValidChapterLossSummary(summary)) {
      throw this.createError(CharacterLossError.SYSTEM_ERROR, 'Generated invalid chapter summary', {
        characterId: '',
        chapterId: this.chapterId,
      });
    }

    return summary;
  }

  /**
   * Get total number of losses in this chapter
   * @returns number of lost characters
   */
  getTotalLosses(): number {
    return this.lostCharacters.size;
  }

  /**
   * Check if this is a perfect chapter (no losses)
   * @returns true if no characters were lost
   */
  isPerfectChapter(): boolean {
    return this.lostCharacters.size === 0;
  }

  /**
   * Serialize state for persistence
   * @returns serialized chapter loss data
   */
  serialize(): ChapterLossData {
    if (!this.isChapterInitialized()) {
      throw this.createError(
        CharacterLossError.CHAPTER_NOT_INITIALIZED,
        'Chapter must be initialized to serialize',
        { characterId: '', chapterId: this.chapterId }
      );
    }

    // Convert Map to plain object for serialization
    const lostCharactersObj: Record<string, LostCharacter> = {};
    this.lostCharacters.forEach((value, key) => {
      lostCharactersObj[key] = CharacterLossUtils.cloneLostCharacter(value);
    });

    const data: ChapterLossData = {
      chapterId: this.chapterId!,
      lostCharacters: lostCharactersObj,
      lossHistory: this.getLossHistory(),
      chapterStartTime: this.chapterStartTime,
      version: '1.0.0',
    };

    // Validate serialized data
    if (!CharacterLossTypeValidators.isValidChapterLossData(data)) {
      throw this.createError(CharacterLossError.SYSTEM_ERROR, 'Generated invalid serialized data', {
        characterId: '',
        chapterId: this.chapterId,
      });
    }

    return data;
  }

  /**
   * Deserialize state from persistence
   * @param data - serialized chapter loss data
   */
  deserialize(data: ChapterLossData): void {
    if (!CharacterLossTypeValidators.isValidChapterLossData(data)) {
      throw this.createError(
        CharacterLossError.SAVE_DATA_CORRUPTED,
        'Invalid chapter loss data format',
        { characterId: '', chapterId: data?.chapterId }
      );
    }

    try {
      // Initialize chapter with the loaded data
      this.chapterId = data.chapterId;
      this.chapterStartTime = data.chapterStartTime;
      this.lossHistory = [...data.lossHistory];

      // Convert plain object back to Map
      this.lostCharacters.clear();
      Object.entries(data.lostCharacters).forEach(([id, lostChar]) => {
        this.lostCharacters.set(id, CharacterLossUtils.cloneLostCharacter(lostChar));
      });

      // Rebuild participating characters set
      this.participatingCharacters.clear();
      this.lossHistory.forEach(record => {
        this.participatingCharacters.add(record.characterId);
      });

      // Update current turn based on loss history
      this.currentTurn = Math.max(
        1,
        ...this.lossHistory.map(record => record.turn),
        this.currentTurn
      );

      console.log(
        `[CharacterLossState] Deserialized chapter ${data.chapterId} with ${this.lostCharacters.size} losses`
      );
    } catch (error) {
      throw this.createError(
        CharacterLossError.SAVE_DATA_CORRUPTED,
        `Failed to deserialize chapter data: ${error}`,
        { characterId: '', chapterId: data?.chapterId }
      );
    }
  }

  /**
   * Validate current state
   * @returns true if state is valid
   */
  validateState(): boolean {
    try {
      // Check basic initialization
      if (!this.isChapterInitialized()) {
        return false;
      }

      // Validate all lost characters
      for (const lostChar of this.lostCharacters.values()) {
        if (!CharacterLossTypeValidators.isValidLostCharacter(lostChar)) {
          return false;
        }
      }

      // Validate all loss records
      for (const record of this.lossHistory) {
        if (!CharacterLossTypeValidators.isValidLossRecord(record)) {
          return false;
        }
      }

      // Check consistency between lost characters and history
      const lostCharacterIds = new Set(this.lostCharacters.keys());
      const historyCharacterIds = new Set(this.lossHistory.map(record => record.characterId));

      // Every lost character should have a history record
      for (const id of lostCharacterIds) {
        if (!historyCharacterIds.has(id)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('[CharacterLossState] State validation error:', error);
      return false;
    }
  }

  /**
   * Get state validation errors
   * @returns array of validation errors
   */
  getStateErrors(): CharacterLossErrorDetails[] {
    const errors: CharacterLossErrorDetails[] = [];

    try {
      // Check initialization
      if (!this.isChapterInitialized()) {
        errors.push(
          this.createError(
            CharacterLossError.CHAPTER_NOT_INITIALIZED,
            'Chapter is not initialized',
            { characterId: '', chapterId: this.chapterId }
          )
        );
      }

      // Validate lost characters
      for (const [id, lostChar] of this.lostCharacters) {
        if (!CharacterLossTypeValidators.isValidLostCharacter(lostChar)) {
          errors.push(
            this.createError(
              CharacterLossError.INVALID_CHARACTER,
              `Invalid lost character data for ${id}`,
              { characterId: id, chapterId: this.chapterId }
            )
          );
        }
      }

      // Validate loss records
      for (const record of this.lossHistory) {
        if (!CharacterLossTypeValidators.isValidLossRecord(record)) {
          errors.push(
            this.createError(
              CharacterLossError.SYSTEM_ERROR,
              `Invalid loss record for ${record.characterId}`,
              { characterId: record.characterId, chapterId: this.chapterId }
            )
          );
        }
      }

      // Check consistency
      const lostCharacterIds = new Set(this.lostCharacters.keys());
      const historyCharacterIds = new Set(this.lossHistory.map(record => record.characterId));

      for (const id of lostCharacterIds) {
        if (!historyCharacterIds.has(id)) {
          errors.push(
            this.createError(
              CharacterLossError.SYSTEM_ERROR,
              `Lost character ${id} has no corresponding history record`,
              { characterId: id, chapterId: this.chapterId }
            )
          );
        }
      }
    } catch (error) {
      errors.push(
        this.createError(CharacterLossError.SYSTEM_ERROR, `State validation failed: ${error}`, {
          characterId: '',
          chapterId: this.chapterId,
        })
      );
    }

    return errors;
  }

  /**
   * Update current turn number
   * @param turn - current turn number
   */
  setCurrentTurn(turn: number): void {
    if (turn < 1) {
      console.warn('[CharacterLossState] Invalid turn number, must be >= 1');
      return;
    }
    this.currentTurn = turn;
  }

  /**
   * Get current turn number
   * @returns current turn number
   */
  getCurrentTurn(): number {
    return this.currentTurn;
  }

  /**
   * Add a character to the participating characters set
   * @param characterId - ID of the character
   */
  addParticipatingCharacter(characterId: string): void {
    if (characterId && characterId.trim().length > 0) {
      this.participatingCharacters.add(characterId);
    }
  }

  /**
   * Get all participating characters
   * @returns set of participating character IDs
   */
  getParticipatingCharacters(): Set<string> {
    return new Set(this.participatingCharacters);
  }

  /**
   * Set total characters in chapter (for summary calculation)
   * @param total - total number of characters
   */
  setTotalCharactersInChapter(total: number): void {
    if (total >= 0) {
      this.totalCharactersInChapter = total;
    }
  }

  /**
   * Get chapter start time
   * @returns chapter start timestamp
   */
  getChapterStartTime(): number {
    return this.chapterStartTime;
  }

  /**
   * Get chapter duration in milliseconds
   * @returns duration since chapter start
   */
  getChapterDuration(): number {
    return Date.now() - this.chapterStartTime;
  }

  /**
   * Create error details object
   * @param error - error type
   * @param message - error message
   * @param context - error context
   * @returns error details object
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
        chapterId: context.chapterId || this.chapterId || undefined,
        turn: context.turn || this.currentTurn,
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
   * @param error - error type
   * @returns suggested action string
   */
  private getSuggestedAction(error: CharacterLossError): string {
    switch (error) {
      case CharacterLossError.CHAPTER_NOT_INITIALIZED:
        return 'Initialize chapter before performing operations';
      case CharacterLossError.INVALID_CHARACTER:
        return 'Verify character data is valid and complete';
      case CharacterLossError.ALREADY_LOST:
        return 'Check character loss status before recording loss';
      case CharacterLossError.SAVE_DATA_CORRUPTED:
        return 'Reset chapter state or restore from backup';
      case CharacterLossError.INVALID_LOSS_CAUSE:
        return 'Provide valid loss cause with required fields';
      default:
        return 'Check system logs for detailed error information';
    }
  }

  /**
   * Get current stage ID (placeholder - should be provided by game state)
   * @returns current stage ID
   */
  private getCurrentStageId(): string {
    // This should be provided by the game state manager
    // For now, return a placeholder
    return `${this.chapterId}_stage_${this.currentTurn}`;
  }

  /**
   * Get chapter name (placeholder - should be provided by game data)
   * @returns chapter name
   */
  private getChapterName(): string {
    // This should be provided by the game data manager
    // For now, return a formatted name
    return `Chapter ${this.chapterId}`;
  }

  /**
   * Create a checkpoint of current state for rollback purposes
   * @returns Checkpoint data
   */
  createCheckpoint(): ChapterLossData {
    if (!this.isChapterInitialized()) {
      throw this.createError(
        CharacterLossError.CHAPTER_NOT_INITIALIZED,
        'Chapter must be initialized to create checkpoint',
        { characterId: '', chapterId: this.chapterId }
      );
    }

    return this.serialize();
  }

  /**
   * Restore state from a checkpoint
   * @param checkpoint - Checkpoint data to restore from
   */
  restoreFromCheckpoint(checkpoint: ChapterLossData): void {
    if (!CharacterLossTypeValidators.isValidChapterLossData(checkpoint)) {
      throw this.createError(
        CharacterLossError.SAVE_DATA_CORRUPTED,
        'Invalid checkpoint data format',
        { characterId: '', chapterId: checkpoint?.chapterId }
      );
    }

    this.deserialize(checkpoint);
    console.log(
      `[CharacterLossState] State restored from checkpoint for chapter ${checkpoint.chapterId}`
    );
  }

  /**
   * Merge state from another chapter loss data (useful for data migration)
   * @param otherData - Other chapter loss data to merge
   * @param overwriteExisting - Whether to overwrite existing losses
   */
  mergeState(otherData: ChapterLossData, overwriteExisting: boolean = false): void {
    if (!CharacterLossTypeValidators.isValidChapterLossData(otherData)) {
      throw this.createError(CharacterLossError.SAVE_DATA_CORRUPTED, 'Invalid merge data format', {
        characterId: '',
        chapterId: otherData?.chapterId,
      });
    }

    if (!this.isChapterInitialized()) {
      // If not initialized, just deserialize the other data
      this.deserialize(otherData);
      return;
    }

    // Merge lost characters
    Object.entries(otherData.lostCharacters).forEach(([id, lostChar]) => {
      if (!this.lostCharacters.has(id) || overwriteExisting) {
        this.lostCharacters.set(id, CharacterLossUtils.cloneLostCharacter(lostChar));
        this.participatingCharacters.add(id);
      }
    });

    // Merge loss history (avoid duplicates)
    const existingHistoryIds = new Set(
      this.lossHistory.map(record => `${record.characterId}_${record.lostAt}`)
    );

    otherData.lossHistory.forEach(record => {
      const recordId = `${record.characterId}_${record.lostAt}`;
      if (!existingHistoryIds.has(recordId)) {
        this.lossHistory.push({ ...record });
        existingHistoryIds.add(recordId);
      }
    });

    // Update chapter start time if other data is older
    if (otherData.chapterStartTime < this.chapterStartTime) {
      this.chapterStartTime = otherData.chapterStartTime;
    }

    console.log(`[CharacterLossState] Merged state from chapter ${otherData.chapterId}`);
  }

  /**
   * Export state as JSON string for external storage
   * @returns JSON string representation of state
   */
  exportState(): string {
    const data = this.serialize();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import state from JSON string
   * @param jsonData - JSON string representation of state
   */
  importState(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      this.deserialize(data);
    } catch (error) {
      throw this.createError(
        CharacterLossError.SAVE_DATA_CORRUPTED,
        `Failed to import state from JSON: ${error}`,
        { characterId: '', chapterId: this.chapterId }
      );
    }
  }

  /**
   * Get state statistics for debugging and monitoring
   * @returns State statistics
   */
  getStateStatistics(): {
    chapterId: string | null;
    isInitialized: boolean;
    totalLosses: number;
    totalParticipants: number;
    chapterDuration: number;
    averageLossPerTurn: number;
    memoryUsage: {
      lostCharactersSize: number;
      lossHistorySize: number;
      participatingCharactersSize: number;
    };
  } {
    const duration = this.getChapterDuration();
    const averageLossPerTurn =
      this.currentTurn > 0 ? this.lostCharacters.size / this.currentTurn : 0;

    return {
      chapterId: this.chapterId,
      isInitialized: this.isChapterInitialized(),
      totalLosses: this.lostCharacters.size,
      totalParticipants: this.participatingCharacters.size,
      chapterDuration: duration,
      averageLossPerTurn: Math.round(averageLossPerTurn * 100) / 100,
      memoryUsage: {
        lostCharactersSize: this.lostCharacters.size,
        lossHistorySize: this.lossHistory.length,
        participatingCharactersSize: this.participatingCharacters.size,
      },
    };
  }

  /**
   * Cleanup state to free memory (call when chapter is complete)
   */
  cleanup(): void {
    this.lostCharacters.clear();
    this.lossHistory = [];
    this.participatingCharacters.clear();
    this.chapterId = null;
    this.chapterStartTime = 0;
    this.currentTurn = 1;
    this.totalCharactersInChapter = 0;

    console.log('[CharacterLossState] State cleaned up and memory freed');
  }

  /**
   * Validate data integrity and fix common issues
   * @returns Validation and repair result
   */
  validateAndRepair(): {
    isValid: boolean;
    errors: CharacterLossErrorDetails[];
    repaired: string[];
    warnings: string[];
  } {
    const errors: CharacterLossErrorDetails[] = [];
    const repaired: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic validation
      if (!this.isChapterInitialized()) {
        errors.push(
          this.createError(
            CharacterLossError.CHAPTER_NOT_INITIALIZED,
            'Chapter is not initialized',
            { characterId: '', chapterId: this.chapterId }
          )
        );
        return { isValid: false, errors, repaired, warnings };
      }

      // Validate and repair lost characters
      const invalidLostCharacters: string[] = [];
      for (const [id, lostChar] of this.lostCharacters) {
        if (!CharacterLossTypeValidators.isValidLostCharacter(lostChar)) {
          invalidLostCharacters.push(id);
          errors.push(
            this.createError(
              CharacterLossError.INVALID_CHARACTER,
              `Invalid lost character data for ${id}`,
              { characterId: id, chapterId: this.chapterId }
            )
          );
        }

        // Repair missing participating character entries
        if (!this.participatingCharacters.has(id)) {
          this.participatingCharacters.add(id);
          repaired.push(`Added missing participating character entry for ${id}`);
        }
      }

      // Remove invalid lost characters
      invalidLostCharacters.forEach(id => {
        this.lostCharacters.delete(id);
        repaired.push(`Removed invalid lost character ${id}`);
      });

      // Validate and repair loss history
      const validLossHistory: LossRecord[] = [];
      for (const record of this.lossHistory) {
        if (CharacterLossTypeValidators.isValidLossRecord(record)) {
          validLossHistory.push(record);
        } else {
          warnings.push(`Removed invalid loss record for ${record.characterId}`);
        }
      }

      if (validLossHistory.length !== this.lossHistory.length) {
        this.lossHistory = validLossHistory;
        repaired.push(
          `Cleaned up ${this.lossHistory.length - validLossHistory.length} invalid loss records`
        );
      }

      // Check consistency between lost characters and history
      const lostCharacterIds = new Set(this.lostCharacters.keys());
      const historyCharacterIds = new Set(this.lossHistory.map(record => record.characterId));

      // Add missing history records
      for (const id of lostCharacterIds) {
        if (!historyCharacterIds.has(id)) {
          const lostChar = this.lostCharacters.get(id)!;
          const syntheticRecord: LossRecord = {
            ...lostChar,
            chapterId: this.chapterId!,
            stageId: this.getCurrentStageId(),
            recoverable: false,
          };
          this.lossHistory.push(syntheticRecord);
          repaired.push(`Added missing history record for ${id}`);
        }
      }

      // Validate timestamps
      const now = Date.now();
      let timestampIssues = 0;

      for (const [id, lostChar] of this.lostCharacters) {
        if (lostChar.lostAt > now || lostChar.lostAt < this.chapterStartTime) {
          lostChar.lostAt = Math.max(this.chapterStartTime, Math.min(now, lostChar.lostAt));
          timestampIssues++;
        }
      }

      if (timestampIssues > 0) {
        repaired.push(`Fixed ${timestampIssues} invalid timestamps`);
      }

      const isValid = errors.length === 0;
      return { isValid, errors, repaired, warnings };
    } catch (error) {
      errors.push(
        this.createError(CharacterLossError.SYSTEM_ERROR, `Validation failed: ${error}`, {
          characterId: '',
          chapterId: this.chapterId,
        })
      );
      return { isValid: false, errors, repaired, warnings };
    }
  }
}
