/**
 * CharacterLossErrorHandler - Comprehensive error handling and user feedback system
 *
 * This class provides centralized error handling for the character loss system:
 * - Invalid character error handling
 * - Duplicate loss processing prevention
 * - Save data corruption recovery
 * - User-friendly error messages
 * - Error logging and reporting
 *
 * Implements requirements: システム安定性、データ整合性
 */

import * as Phaser from 'phaser';
import { Unit } from '../types/gameplay';
import {
  CharacterLossError,
  CharacterLossErrorDetails,
  LossContext,
  ChapterLossData,
  LostCharacter,
  CharacterLossUtils,
} from '../types/characterLoss';

/**
 * Error recovery strategy enum
 */
export enum ErrorRecoveryStrategy {
  RETRY = 'retry',
  SKIP = 'skip',
  RESET = 'reset',
  RESTORE_BACKUP = 'restore_backup',
  USER_INTERVENTION = 'user_intervention',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Error handling configuration
 */
export interface ErrorHandlingConfig {
  enableLogging: boolean;
  enableUserNotifications: boolean;
  enableAutoRecovery: boolean;
  maxRetryAttempts: number;
  retryDelay: number;
  enableBackupCreation: boolean;
  enableErrorReporting: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Error recovery result
 */
export interface ErrorRecoveryResult {
  success: boolean;
  strategy: ErrorRecoveryStrategy;
  message: string;
  recoveredData?: any;
  requiresUserAction: boolean;
  nextSteps?: string[];
}

/**
 * User feedback message
 */
export interface UserFeedbackMessage {
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  details?: string;
  actions?: UserFeedbackAction[];
  dismissible: boolean;
  duration?: number; // Auto-dismiss after milliseconds
}

/**
 * User feedback action
 */
export interface UserFeedbackAction {
  label: string;
  action: () => void;
  style: 'primary' | 'secondary' | 'danger';
}

/**
 * Error statistics for monitoring
 */
export interface ErrorStatistics {
  totalErrors: number;
  errorsByType: Record<CharacterLossError, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recoverySuccessRate: number;
  lastErrorTime: number;
  mostCommonError: CharacterLossError;
}

/**
 * Character loss error handler class
 */
export class CharacterLossErrorHandler extends Phaser.Events.EventEmitter {
  private config: ErrorHandlingConfig;
  private errorLog: CharacterLossErrorDetails[] = [];
  private statistics: ErrorStatistics;
  private retryAttempts: Map<string, number> = new Map();
  private backupData: Map<string, ChapterLossData> = new Map();

  // Default configuration
  private static readonly DEFAULT_CONFIG: ErrorHandlingConfig = {
    enableLogging: true,
    enableUserNotifications: true,
    enableAutoRecovery: true,
    maxRetryAttempts: 3,
    retryDelay: 1000,
    enableBackupCreation: true,
    enableErrorReporting: false,
    logLevel: 'error',
  };

  /**
   * Creates a new CharacterLossErrorHandler instance
   * @param config - Error handling configuration
   */
  constructor(config?: Partial<ErrorHandlingConfig>) {
    super();

    this.config = { ...CharacterLossErrorHandler.DEFAULT_CONFIG, ...config };

    // Initialize statistics
    this.statistics = {
      totalErrors: 0,
      errorsByType: {} as Record<CharacterLossError, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      recoverySuccessRate: 0,
      lastErrorTime: 0,
      mostCommonError: CharacterLossError.SYSTEM_ERROR,
    };

    // Initialize error type counters
    Object.values(CharacterLossError).forEach(errorType => {
      this.statistics.errorsByType[errorType] = 0;
    });

    // Initialize severity counters
    Object.values(ErrorSeverity).forEach(severity => {
      this.statistics.errorsBySeverity[severity] = 0;
    });

    this.log('Character loss error handler initialized', 'info');
  }

  /**
   * Handle invalid character error
   * @param unit - Invalid unit that caused the error
   * @param context - Error context
   * @returns Error recovery result
   */
  public handleInvalidCharacterError(
    unit: any,
    context: Partial<LossContext>
  ): ErrorRecoveryResult {
    const errorDetails = this.createErrorDetails(
      CharacterLossError.INVALID_CHARACTER,
      'Invalid character data provided for loss processing',
      context,
      ErrorSeverity.HIGH
    );

    this.logError(errorDetails);

    // Analyze the invalid character data
    const validationIssues = this.validateCharacterData(unit);

    if (validationIssues.length === 0) {
      // Character is actually valid, this might be a false positive
      return {
        success: true,
        strategy: ErrorRecoveryStrategy.RETRY,
        message: 'Character validation passed on retry',
        requiresUserAction: false,
      };
    }

    // Try to repair the character data
    const repairedUnit = this.repairCharacterData(unit, validationIssues);
    if (repairedUnit) {
      this.showUserFeedback({
        type: 'warning',
        title: 'キャラクターデータを修復しました',
        message: `${repairedUnit.name || 'キャラクター'}のデータに問題がありましたが、自動的に修復されました。`,
        details: `修復された項目: ${validationIssues.join(', ')}`,
        dismissible: true,
        duration: 5000,
      });

      return {
        success: true,
        strategy: ErrorRecoveryStrategy.RETRY,
        message: 'Character data repaired successfully',
        recoveredData: repairedUnit,
        requiresUserAction: false,
      };
    }

    // Cannot repair, require user intervention
    this.showUserFeedback({
      type: 'error',
      title: 'キャラクターデータエラー',
      message: '無効なキャラクターデータが検出されました。',
      details: `問題: ${validationIssues.join(', ')}`,
      actions: [
        {
          label: 'スキップ',
          action: () => this.emit('error-action', { action: 'skip', context }),
          style: 'secondary',
        },
        {
          label: 'リセット',
          action: () => this.emit('error-action', { action: 'reset', context }),
          style: 'danger',
        },
      ],
      dismissible: false,
    });

    return {
      success: false,
      strategy: ErrorRecoveryStrategy.USER_INTERVENTION,
      message: 'Character data cannot be repaired automatically',
      requiresUserAction: true,
      nextSteps: [
        'キャラクターデータを確認してください',
        'データを修正するか、処理をスキップしてください',
      ],
    };
  }

  /**
   * Handle duplicate loss processing prevention
   * @param characterId - ID of character already lost
   * @param existingLoss - Existing loss data
   * @param context - Error context
   * @returns Error recovery result
   */
  public handleDuplicateLossError(
    characterId: string,
    existingLoss: LostCharacter,
    context: Partial<LossContext>
  ): ErrorRecoveryResult {
    const errorDetails = this.createErrorDetails(
      CharacterLossError.ALREADY_LOST,
      `Character ${characterId} is already lost`,
      context,
      ErrorSeverity.MEDIUM
    );

    this.logError(errorDetails);

    // Check if this is a legitimate duplicate or a system error
    const timeSinceLastLoss = Date.now() - existingLoss.lostAt;
    const isDuplicateRequest = timeSinceLastLoss < 1000; // Less than 1 second

    if (isDuplicateRequest) {
      // This is likely a duplicate request, ignore silently
      this.log(
        `Ignoring duplicate loss request for ${characterId} (${timeSinceLastLoss}ms ago)`,
        'debug'
      );

      return {
        success: true,
        strategy: ErrorRecoveryStrategy.SKIP,
        message: 'Duplicate loss request ignored',
        recoveredData: existingLoss,
        requiresUserAction: false,
      };
    }

    // This might be a legitimate attempt to re-process a loss
    this.showUserFeedback({
      type: 'warning',
      title: 'キャラクターは既にロスト状態です',
      message: `${existingLoss.name}は既に章内でロスト状態になっています。`,
      details: `ロスト時刻: ${new Date(existingLoss.lostAt).toLocaleString()}\n原因: ${existingLoss.cause.description}`,
      actions: [
        {
          label: '確認',
          action: () => this.emit('error-action', { action: 'acknowledge', context }),
          style: 'primary',
        },
      ],
      dismissible: true,
      duration: 3000,
    });

    return {
      success: true,
      strategy: ErrorRecoveryStrategy.SKIP,
      message: 'Character already lost, skipping duplicate processing',
      recoveredData: existingLoss,
      requiresUserAction: false,
    };
  }

  /**
   * Handle save data corruption recovery
   * @param chapterId - ID of chapter with corrupted data
   * @param corruptedData - Corrupted save data
   * @param context - Error context
   * @returns Error recovery result
   */
  public handleSaveDataCorruption(
    chapterId: string,
    corruptedData: any,
    context: Partial<LossContext>
  ): ErrorRecoveryResult {
    const errorDetails = this.createErrorDetails(
      CharacterLossError.SAVE_DATA_CORRUPTED,
      `Save data corrupted for chapter ${chapterId}`,
      context,
      ErrorSeverity.CRITICAL
    );

    this.logError(errorDetails);

    // Try to recover from backup
    const backupData = this.getBackupData(chapterId);
    if (backupData) {
      this.showUserFeedback({
        type: 'warning',
        title: 'セーブデータが破損しています',
        message: 'セーブデータに問題が見つかりましたが、バックアップから復旧できます。',
        details: `章: ${chapterId}`,
        actions: [
          {
            label: 'バックアップから復旧',
            action: () =>
              this.emit('error-action', {
                action: 'restore_backup',
                context,
                data: backupData,
              }),
            style: 'primary',
          },
          {
            label: '新規開始',
            action: () => this.emit('error-action', { action: 'reset', context }),
            style: 'secondary',
          },
        ],
        dismissible: false,
      });

      return {
        success: true,
        strategy: ErrorRecoveryStrategy.RESTORE_BACKUP,
        message: 'Backup data available for recovery',
        recoveredData: backupData,
        requiresUserAction: true,
        nextSteps: ['バックアップから復旧するか、新規開始を選択してください'],
      };
    }

    // Try to sanitize the corrupted data
    const sanitizedData = this.sanitizeCorruptedData(chapterId, corruptedData);
    if (sanitizedData) {
      this.showUserFeedback({
        type: 'warning',
        title: 'セーブデータを修復しました',
        message: 'セーブデータに問題がありましたが、部分的に修復できました。',
        details: `章: ${chapterId}\n一部のデータが失われた可能性があります。`,
        actions: [
          {
            label: '修復データで続行',
            action: () =>
              this.emit('error-action', {
                action: 'use_sanitized',
                context,
                data: sanitizedData,
              }),
            style: 'primary',
          },
          {
            label: '新規開始',
            action: () => this.emit('error-action', { action: 'reset', context }),
            style: 'secondary',
          },
        ],
        dismissible: false,
      });

      return {
        success: true,
        strategy: ErrorRecoveryStrategy.RETRY,
        message: 'Data partially recovered through sanitization',
        recoveredData: sanitizedData,
        requiresUserAction: true,
        nextSteps: ['修復されたデータで続行するか、新規開始を選択してください'],
      };
    }

    // Complete data loss, reset required
    this.showUserFeedback({
      type: 'error',
      title: 'セーブデータの復旧に失敗しました',
      message: 'セーブデータが完全に破損しており、復旧できませんでした。',
      details: `章: ${chapterId}\n新規開始が必要です。`,
      actions: [
        {
          label: '新規開始',
          action: () => this.emit('error-action', { action: 'reset', context }),
          style: 'danger',
        },
      ],
      dismissible: false,
    });

    return {
      success: false,
      strategy: ErrorRecoveryStrategy.RESET,
      message: 'Save data cannot be recovered, reset required',
      requiresUserAction: true,
      nextSteps: [
        '章を最初からやり直してください',
        '今後のデータ損失を防ぐため、定期的にバックアップを作成することをお勧めします',
      ],
    };
  }

  /**
   * Show user feedback message
   * @param message - User feedback message to display
   */
  public showUserFeedback(message: UserFeedbackMessage): void {
    if (!this.config.enableUserNotifications) {
      return;
    }

    this.log(`Showing user feedback: ${message.type} - ${message.title}`, 'info');

    // Emit event for UI system to handle
    this.emit('user-feedback', message);

    // Auto-dismiss if duration is specified
    if (message.duration && message.dismissible) {
      setTimeout(() => {
        this.emit('dismiss-feedback', message);
      }, message.duration);
    }
  }

  /**
   * Create backup data for recovery
   * @param chapterId - Chapter ID
   * @param data - Chapter loss data to backup
   */
  public createBackup(chapterId: string, data: ChapterLossData): void {
    if (!this.config.enableBackupCreation) {
      return;
    }

    try {
      // Store in memory backup
      this.backupData.set(chapterId, CharacterLossUtils.cloneChapterLossData(data));

      // Store in localStorage backup
      const backupKey = `character_loss_backup_${chapterId}`;
      const serializedData = CharacterLossUtils.serializeChapterLossData(data);
      localStorage.setItem(backupKey, serializedData);

      this.log(`Backup created for chapter ${chapterId}`, 'debug');
    } catch (error) {
      this.log(`Failed to create backup for chapter ${chapterId}: ${error}`, 'error');
    }
  }

  /**
   * Get backup data for recovery
   * @param chapterId - Chapter ID
   * @returns Backup data or null if not available
   */
  public getBackupData(chapterId: string): ChapterLossData | null {
    try {
      // Try memory backup first
      const memoryBackup = this.backupData.get(chapterId);
      if (memoryBackup) {
        return CharacterLossUtils.cloneChapterLossData(memoryBackup);
      }

      // Try localStorage backup
      const backupKey = `character_loss_backup_${chapterId}`;
      const serializedData = localStorage.getItem(backupKey);
      if (serializedData) {
        return CharacterLossUtils.deserializeChapterLossData(serializedData);
      }

      return null;
    } catch (error) {
      this.log(`Failed to get backup data for chapter ${chapterId}: ${error}`, 'error');
      return null;
    }
  }

  /**
   * Validate character data and return validation issues
   * @param unit - Unit to validate
   * @returns Array of validation issues
   */
  private validateCharacterData(unit: any): string[] {
    const issues: string[] = [];

    if (!unit) {
      issues.push('キャラクターデータが存在しません');
      return issues;
    }

    if (!unit.id || typeof unit.id !== 'string' || unit.id.trim().length === 0) {
      issues.push('キャラクターIDが無効です');
    }

    if (!unit.name || typeof unit.name !== 'string' || unit.name.trim().length === 0) {
      issues.push('キャラクター名が無効です');
    }

    if (typeof unit.currentHP !== 'number' || unit.currentHP < 0) {
      issues.push('現在HPが無効です');
    }

    if (typeof unit.maxHP !== 'number' || unit.maxHP <= 0) {
      issues.push('最大HPが無効です');
    }

    if (unit.currentHP > unit.maxHP) {
      issues.push('現在HPが最大HPを超えています');
    }

    if (!unit.faction || !['player', 'enemy', 'npc'].includes(unit.faction)) {
      issues.push('陣営が無効です');
    }

    if (
      !unit.position ||
      typeof unit.position.x !== 'number' ||
      typeof unit.position.y !== 'number'
    ) {
      issues.push('位置情報が無効です');
    }

    if (typeof unit.level !== 'number' || unit.level < 1) {
      issues.push('レベルが無効です');
    }

    return issues;
  }

  /**
   * Attempt to repair character data
   * @param unit - Unit to repair
   * @param issues - Validation issues to fix
   * @returns Repaired unit or null if cannot repair
   */
  private repairCharacterData(unit: any, issues: string[]): Unit | null {
    if (!unit || issues.includes('キャラクターデータが存在しません')) {
      return null;
    }

    try {
      const repairedUnit: any = { ...unit };

      // Repair ID
      if (issues.includes('キャラクターIDが無効です')) {
        repairedUnit.id = `repaired_character_${Date.now()}`;
      }

      // Repair name
      if (issues.includes('キャラクター名が無効です')) {
        repairedUnit.name = `キャラクター ${repairedUnit.id}`;
      }

      // Repair HP values
      if (issues.includes('現在HPが無効です')) {
        repairedUnit.currentHP = Math.max(0, repairedUnit.maxHP || 100);
      }

      if (issues.includes('最大HPが無効です')) {
        repairedUnit.maxHP = Math.max(repairedUnit.currentHP || 100, 100);
      }

      if (issues.includes('現在HPが最大HPを超えています')) {
        repairedUnit.currentHP = Math.min(repairedUnit.currentHP, repairedUnit.maxHP);
      }

      // Repair faction
      if (issues.includes('陣営が無効です')) {
        repairedUnit.faction = 'player'; // Default to player
      }

      // Repair position
      if (issues.includes('位置情報が無効です')) {
        repairedUnit.position = { x: 0, y: 0 };
      }

      // Repair level
      if (issues.includes('レベルが無効です')) {
        repairedUnit.level = 1;
      }

      // Validate the repaired unit
      const remainingIssues = this.validateCharacterData(repairedUnit);
      if (remainingIssues.length === 0) {
        return repairedUnit as Unit;
      }

      return null;
    } catch (error) {
      this.log(`Failed to repair character data: ${error}`, 'error');
      return null;
    }
  }

  /**
   * Sanitize corrupted save data
   * @param chapterId - Chapter ID
   * @param corruptedData - Corrupted data
   * @returns Sanitized data or null if cannot sanitize
   */
  private sanitizeCorruptedData(chapterId: string, corruptedData: any): ChapterLossData | null {
    try {
      return CharacterLossUtils.sanitizeChapterLossData(corruptedData);
    } catch (error) {
      this.log(`Failed to sanitize corrupted data for chapter ${chapterId}: ${error}`, 'error');
      return null;
    }
  }

  /**
   * Create error details object
   * @param error - Error type
   * @param message - Error message
   * @param context - Error context
   * @param severity - Error severity
   * @returns Error details object
   */
  private createErrorDetails(
    error: CharacterLossError,
    message: string,
    context: Partial<LossContext>,
    severity: ErrorSeverity
  ): CharacterLossErrorDetails {
    return {
      error,
      message,
      context: {
        characterId: context.characterId || '',
        chapterId: context.chapterId,
        stageId: context.stageId,
        turn: context.turn,
        phase: context.phase || 'unknown',
        additionalData: {
          ...context.additionalData,
          severity,
          timestamp: Date.now(),
        },
      },
      timestamp: Date.now(),
      recoverable: this.isRecoverableError(error),
      suggestedAction: this.getSuggestedAction(error),
    };
  }

  /**
   * Log error details
   * @param errorDetails - Error details to log
   */
  private logError(errorDetails: CharacterLossErrorDetails): void {
    if (!this.config.enableLogging) {
      return;
    }

    // Add to error log
    this.errorLog.push(errorDetails);

    // Update statistics
    this.updateStatistics(errorDetails);

    // Log to console
    const severity = errorDetails.context.additionalData?.severity || ErrorSeverity.MEDIUM;
    this.log(`[${errorDetails.error}] ${errorDetails.message}`, this.severityToLogLevel(severity));

    // Emit error event
    this.emit('error-logged', errorDetails);

    // Trim error log if it gets too large
    if (this.errorLog.length > 1000) {
      this.errorLog = this.errorLog.slice(-500); // Keep last 500 errors
    }
  }

  /**
   * Update error statistics
   * @param errorDetails - Error details
   */
  private updateStatistics(errorDetails: CharacterLossErrorDetails): void {
    this.statistics.totalErrors++;
    this.statistics.errorsByType[errorDetails.error]++;

    const severity =
      (errorDetails.context.additionalData?.severity as ErrorSeverity) || ErrorSeverity.MEDIUM;
    this.statistics.errorsBySeverity[severity]++;

    this.statistics.lastErrorTime = errorDetails.timestamp;

    // Update most common error
    let maxCount = 0;
    let mostCommon = CharacterLossError.SYSTEM_ERROR;
    Object.entries(this.statistics.errorsByType).forEach(([error, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = error as CharacterLossError;
      }
    });
    this.statistics.mostCommonError = mostCommon;
  }

  /**
   * Check if error is recoverable
   * @param error - Error type
   * @returns True if error is recoverable
   */
  private isRecoverableError(error: CharacterLossError): boolean {
    switch (error) {
      case CharacterLossError.SAVE_DATA_CORRUPTED:
        return false; // Requires special handling
      case CharacterLossError.SYSTEM_ERROR:
        return false; // Usually indicates serious issues
      default:
        return true;
    }
  }

  /**
   * Get suggested action for error
   * @param error - Error type
   * @returns Suggested action string
   */
  private getSuggestedAction(error: CharacterLossError): string {
    switch (error) {
      case CharacterLossError.INVALID_CHARACTER:
        return 'キャラクターデータを確認し、必要に応じて修復してください';
      case CharacterLossError.ALREADY_LOST:
        return 'キャラクターのロスト状態を確認してください';
      case CharacterLossError.CHAPTER_NOT_INITIALIZED:
        return '章を初期化してから操作を実行してください';
      case CharacterLossError.SAVE_DATA_CORRUPTED:
        return 'バックアップから復旧するか、章をリセットしてください';
      case CharacterLossError.LOSS_PROCESSING_FAILED:
        return 'ロスト処理を再試行するか、システムログを確認してください';
      default:
        return 'システムログを確認し、必要に応じてサポートに連絡してください';
    }
  }

  /**
   * Convert severity to log level
   * @param severity - Error severity
   * @returns Log level string
   */
  private severityToLogLevel(severity: ErrorSeverity): 'debug' | 'info' | 'warn' | 'error' {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'debug';
      case ErrorSeverity.MEDIUM:
        return 'info';
      case ErrorSeverity.HIGH:
        return 'warn';
      case ErrorSeverity.CRITICAL:
        return 'error';
      default:
        return 'error';
    }
  }

  /**
   * Log message with specified level
   * @param message - Message to log
   * @param level - Log level
   */
  private log(message: string, level: 'debug' | 'info' | 'warn' | 'error'): void {
    if (!this.config.enableLogging) {
      return;
    }

    const logLevels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = logLevels.indexOf(this.config.logLevel);
    const messageLevelIndex = logLevels.indexOf(level);

    if (messageLevelIndex >= currentLevelIndex) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [CharacterLossErrorHandler] [${level.toUpperCase()}] ${message}`;

      switch (level) {
        case 'debug':
        case 'info':
          console.log(logMessage);
          break;
        case 'warn':
          console.warn(logMessage);
          break;
        case 'error':
          console.error(logMessage);
          break;
      }
    }
  }

  /**
   * Get error statistics
   * @returns Current error statistics
   */
  public getStatistics(): ErrorStatistics {
    return { ...this.statistics };
  }

  /**
   * Get recent error log
   * @param limit - Maximum number of errors to return
   * @returns Recent error log entries
   */
  public getRecentErrors(limit: number = 50): CharacterLossErrorDetails[] {
    return this.errorLog.slice(-limit);
  }

  /**
   * Clear error log and statistics
   */
  public clearErrorLog(): void {
    this.errorLog = [];
    this.statistics = {
      totalErrors: 0,
      errorsByType: {} as Record<CharacterLossError, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      recoverySuccessRate: 0,
      lastErrorTime: 0,
      mostCommonError: CharacterLossError.SYSTEM_ERROR,
    };

    // Reinitialize counters
    Object.values(CharacterLossError).forEach(errorType => {
      this.statistics.errorsByType[errorType] = 0;
    });

    Object.values(ErrorSeverity).forEach(severity => {
      this.statistics.errorsBySeverity[severity] = 0;
    });

    this.log('Error log and statistics cleared', 'info');
  }

  /**
   * Update configuration
   * @param newConfig - New configuration values
   */
  public updateConfig(newConfig: Partial<ErrorHandlingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('Error handler configuration updated', 'info');
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.clearErrorLog();
    this.backupData.clear();
    this.retryAttempts.clear();
    this.removeAllListeners();
    this.log('Character loss error handler destroyed', 'info');
  }
}

/**
 * Clone chapter loss data for backup purposes
 * @param data - Original data
 * @returns Cloned data
 */
function cloneChapterLossData(data: ChapterLossData): ChapterLossData {
  return {
    chapterId: data.chapterId,
    lostCharacters: { ...data.lostCharacters },
    lossHistory: data.lossHistory.map(record => ({ ...record })),
    chapterStartTime: data.chapterStartTime,
    version: data.version,
  };
}

// Add the clone function to CharacterLossUtils if not already present
if (!CharacterLossUtils.cloneChapterLossData) {
  (CharacterLossUtils as any).cloneChapterLossData = cloneChapterLossData;
}
