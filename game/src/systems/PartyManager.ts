/**
 * PartyManager - Manages party composition and integrates with character loss system
 *
 * This class handles:
 * - Party composition validation against lost characters
 * - Available character filtering
 * - Party composition error handling and user feedback
 * - Integration with character loss system for real-time validation
 *
 * Implements requirements 6.1, 6.2, 6.3, 6.4, 6.5 from the character loss system specification
 */

import * as Phaser from 'phaser';
import { Unit, GameplayError, GameplayErrorResult } from '../types/gameplay';
import {
  PartyValidationResult,
  PartyValidationError,
  PartyValidationWarning,
  LostCharacter,
  CharacterLossTypeValidators,
} from '../types/characterLoss';
import { CharacterLossManager } from './CharacterLossManager';

/**
 * Party composition configuration
 */
export interface PartyCompositionConfig {
  /** Maximum number of characters in a party */
  maxPartySize: number;
  /** Minimum number of characters required */
  minPartySize: number;
  /** Whether to allow empty parties (for testing) */
  allowEmptyParty: boolean;
  /** Whether to show detailed validation messages */
  showDetailedMessages: boolean;
  /** Whether to suggest alternative characters */
  suggestAlternatives: boolean;
}

/**
 * Party composition data
 */
export interface PartyComposition {
  /** Array of character IDs in the party */
  members: string[];
  /** Party name or identifier */
  name?: string;
  /** Formation or positioning data */
  formation?: Record<string, { x: number; y: number }>;
  /** Last validation result */
  lastValidation?: PartyValidationResult;
  /** Timestamp of last update */
  lastUpdated: number;
}

/**
 * Party suggestion for helping players with composition
 */
export interface PartySuggestion {
  /** Suggested character ID */
  characterId: string;
  /** Reason for the suggestion */
  reason: string;
  /** Priority of the suggestion (higher = more important) */
  priority: number;
  /** Whether this suggestion replaces a lost character */
  replacesLostCharacter?: string;
}

/**
 * Party composition statistics
 */
export interface PartyCompositionStats {
  /** Total available characters */
  totalAvailable: number;
  /** Total lost characters */
  totalLost: number;
  /** Current party size */
  currentPartySize: number;
  /** Validation status */
  isValid: boolean;
  /** Number of errors */
  errorCount: number;
  /** Number of warnings */
  warningCount: number;
}

/**
 * PartyManager class for managing party composition with character loss integration
 */
export class PartyManager extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private config: PartyCompositionConfig;
  private characterLossManager: CharacterLossManager | null = null;
  private allCharacters: Map<string, Unit> = new Map();
  private currentParty: PartyComposition;

  // Default configuration
  private static readonly DEFAULT_CONFIG: PartyCompositionConfig = {
    maxPartySize: 6,
    minPartySize: 1,
    allowEmptyParty: false,
    showDetailedMessages: true,
    suggestAlternatives: true,
  };

  /**
   * Creates a new PartyManager instance
   * @param scene - Phaser scene for events
   * @param config - Party composition configuration
   */
  constructor(scene: Phaser.Scene, config?: Partial<PartyCompositionConfig>) {
    super();

    this.scene = scene;
    this.config = { ...PartyManager.DEFAULT_CONFIG, ...config };

    // Initialize empty party
    this.currentParty = {
      members: [],
      lastUpdated: Date.now(),
    };

    this.setupEventListeners();
  }

  /**
   * Set character loss manager for integration
   * @param characterLossManager - Character loss manager instance
   */
  public setCharacterLossManager(characterLossManager: CharacterLossManager | null): void {
    this.characterLossManager = characterLossManager;

    if (this.characterLossManager) {
      // Listen to character loss events
      this.characterLossManager.on('character-loss-processed', this.onCharacterLost.bind(this));
      this.characterLossManager.on('chapter-state-reset', this.onChapterReset.bind(this));
      this.characterLossManager.on('chapter-initialized', this.onChapterInitialized.bind(this));

      this.log('Character loss manager integrated with party manager');
    } else {
      this.log('Character loss manager removed from party manager');
    }
  }

  /**
   * Initialize party manager with available characters
   * @param characters - All available characters
   * @returns Success result
   */
  public initializeCharacters(characters: Unit[]): GameplayErrorResult {
    try {
      // Validate input
      if (!Array.isArray(characters)) {
        return {
          success: false,
          error: GameplayError.INVALID_STAGE_DATA,
          message: 'Characters must be an array',
        };
      }

      // Clear existing characters
      this.allCharacters.clear();

      // Add characters to map
      for (const character of characters) {
        if (!character || !character.id) {
          return {
            success: false,
            error: GameplayError.INVALID_STAGE_DATA,
            message: 'Invalid character data provided',
          };
        }

        this.allCharacters.set(character.id, { ...character });
      }

      // Reset current party
      this.currentParty = {
        members: [],
        lastUpdated: Date.now(),
      };

      // Emit initialization event
      this.emit('characters-initialized', {
        totalCharacters: characters.length,
        playerCharacters: characters.filter(c => c.faction === 'player').length,
      });

      this.log(`Party manager initialized with ${characters.length} characters`);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.INVALID_STAGE_DATA,
        message: `Failed to initialize characters: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get all available characters (not lost)
   * @returns Array of available characters
   */
  public getAvailableCharacters(): Unit[] {
    const availableIds =
      this.characterLossManager?.getAvailableCharacters() || Array.from(this.allCharacters.keys());

    return availableIds
      .map(id => this.allCharacters.get(id))
      .filter((char): char is Unit => char !== undefined);
  }

  /**
   * Get lost characters
   * @returns Array of lost characters
   */
  public getLostCharacters(): LostCharacter[] {
    return this.characterLossManager?.getLostCharacters() || [];
  }

  /**
   * Validate party composition against lost characters and other constraints
   * @param partyMembers - Array of character IDs to validate
   * @returns Detailed validation result
   */
  public validatePartyComposition(partyMembers: string[]): PartyValidationResult {
    const result: PartyValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      availableCharacters: this.getAvailableCharacters().map(c => c.id),
      lostCharacters: this.getLostCharacters(),
      totalAvailable: this.getAvailableCharacters().length,
    };

    try {
      // Validate input
      if (!Array.isArray(partyMembers)) {
        result.isValid = false;
        result.errors.push({
          type: 'invalid_character',
          message: 'Party members must be an array',
          severity: 'error',
        });
        return result;
      }

      // Check for empty party and minimum party size
      if (partyMembers.length === 0) {
        if (!this.config.allowEmptyParty) {
          result.isValid = false;
          result.errors.push({
            type: 'insufficient_members',
            message: 'Party cannot be empty',
            severity: 'error',
          });
        }
      } else if (partyMembers.length < this.config.minPartySize) {
        result.isValid = false;
        result.errors.push({
          type: 'insufficient_members',
          message: `Party must have at least ${this.config.minPartySize} member(s)`,
          severity: 'error',
        });
      }

      // Check maximum party size
      if (partyMembers.length > this.config.maxPartySize) {
        result.isValid = false;
        result.errors.push({
          type: 'insufficient_members',
          message: `Party cannot have more than ${this.config.maxPartySize} members`,
          severity: 'error',
        });
      }

      // Check for duplicate characters
      const uniqueMembers = new Set(partyMembers);
      if (uniqueMembers.size !== partyMembers.length) {
        result.isValid = false;
        result.errors.push({
          type: 'duplicate_character',
          message: 'Party cannot contain duplicate characters',
          severity: 'error',
        });
      }

      // Check each party member
      for (const characterId of partyMembers) {
        // Check if character exists
        const character = this.allCharacters.get(characterId);
        if (!character) {
          result.isValid = false;
          result.errors.push({
            type: 'invalid_character',
            characterId: characterId,
            message: `Character not found: ${characterId}`,
            severity: 'error',
          });
          continue;
        }

        // Check if character is lost (main requirement)
        if (this.characterLossManager?.isCharacterLost(characterId)) {
          result.isValid = false;
          const lostCharacter = this.getLostCharacters().find(lc => lc.characterId === characterId);
          const lossReason = lostCharacter ? ` (${lostCharacter.cause.description})` : '';

          result.errors.push({
            type: 'lost_character',
            characterId: characterId,
            message: `${character.name} is lost and cannot be used in this chapter${lossReason}`,
            severity: 'error',
          });
        }

        // Check character level for warnings
        if (character.level && character.level < 5) {
          result.warnings.push({
            type: 'low_level',
            message: `${character.name} is low level (Level ${character.level})`,
            severity: 'medium',
            characterId: characterId,
          });
        }
      }

      // Check for insufficient available characters (only if party is not empty)
      if (partyMembers.length > 0 && result.totalAvailable < this.config.minPartySize) {
        result.isValid = false;
        result.errors.push({
          type: 'insufficient_members',
          message: `Not enough available characters (${result.totalAvailable} available, ${this.config.minPartySize} required)`,
          severity: 'error',
        });
      }

      // Add warnings for low available character count
      if (result.totalAvailable <= 2 && result.totalAvailable > 0) {
        result.warnings.push({
          type: 'missing_role',
          message: 'Very few characters available - consider being more careful in battle',
          severity: 'high',
        });
      } else if (result.totalAvailable <= 4 && result.totalAvailable > 2) {
        result.warnings.push({
          type: 'missing_role',
          message: 'Limited characters available - plan your strategy carefully',
          severity: 'medium',
        });
      }

      // Check for unbalanced party composition
      const validMembers = partyMembers.filter(
        id => this.allCharacters.has(id) && !this.characterLossManager?.isCharacterLost(id)
      );

      if (validMembers.length > 0) {
        const partyBalance = this.analyzePartyBalance(validMembers);
        if (partyBalance.warnings.length > 0) {
          result.warnings.push(...partyBalance.warnings);
        }
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push({
        type: 'invalid_character',
        message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error',
      });
    }

    return result;
  }

  /**
   * Set current party composition
   * @param partyMembers - Array of character IDs
   * @param validateFirst - Whether to validate before setting
   * @returns Success result with validation details
   */
  public setPartyComposition(
    partyMembers: string[],
    validateFirst: boolean = true
  ): GameplayErrorResult {
    try {
      let validationResult: PartyValidationResult | undefined;

      // Validate if requested
      if (validateFirst) {
        validationResult = this.validatePartyComposition(partyMembers);

        if (!validationResult.isValid) {
          return {
            success: false,
            error: GameplayError.INVALID_ACTION,
            message: 'Party composition is invalid',
            details: validationResult,
          };
        }
      }

      // Update party composition
      this.currentParty = {
        members: [...partyMembers],
        lastValidation: validationResult,
        lastUpdated: Date.now(),
      };

      // Emit party composition updated event
      this.emit('party-composition-updated', {
        party: this.currentParty,
        validation: validationResult,
        memberCount: partyMembers.length,
      });

      this.log(`Party composition updated with ${partyMembers.length} members`);

      return {
        success: true,
        message: `Party composition set with ${partyMembers.length} members`,
        details: validationResult,
      };
    } catch (error) {
      return {
        success: false,
        error: GameplayError.INVALID_ACTION,
        message: `Failed to set party composition: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get current party composition
   * @returns Current party composition
   */
  public getCurrentParty(): PartyComposition {
    return { ...this.currentParty, members: [...this.currentParty.members] };
  }

  /**
   * Get party composition statistics
   * @returns Party statistics
   */
  public getPartyStats(): PartyCompositionStats {
    const validation =
      this.currentParty.lastValidation || this.validatePartyComposition(this.currentParty.members);

    return {
      totalAvailable: this.getAvailableCharacters().length,
      totalLost: this.getLostCharacters().length,
      currentPartySize: this.currentParty.members.length,
      isValid: validation.isValid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
    };
  }

  /**
   * Get suggestions for party composition improvements
   * @param currentParty - Current party members (optional, uses current if not provided)
   * @returns Array of party suggestions
   */
  public getPartySuggestions(currentParty?: string[]): PartySuggestion[] {
    if (!this.config.suggestAlternatives) {
      return [];
    }

    const partyMembers = currentParty || this.currentParty.members;
    const suggestions: PartySuggestion[] = [];
    const availableCharacters = this.getAvailableCharacters();
    const lostCharacters = this.getLostCharacters();

    try {
      // Suggest replacements for lost characters
      for (const lostChar of lostCharacters) {
        if (partyMembers.includes(lostChar.characterId)) {
          const alternatives = availableCharacters
            .filter(char => !partyMembers.includes(char.id))
            .sort((a, b) => (b.level || 1) - (a.level || 1))
            .slice(0, 3);

          for (const alt of alternatives) {
            suggestions.push({
              characterId: alt.id,
              reason: `Replacement for lost character ${lostChar.name}`,
              priority: 10,
              replacesLostCharacter: lostChar.characterId,
            });
          }
        }
      }

      // Suggest high-level available characters not in party
      const availableNotInParty = availableCharacters
        .filter(char => !partyMembers.includes(char.id))
        .sort((a, b) => (b.level || 1) - (a.level || 1))
        .slice(0, 5);

      for (const char of availableNotInParty) {
        suggestions.push({
          characterId: char.id,
          reason: `High-level character (Level ${char.level || 1})`,
          priority: char.level || 1,
        });
      }

      // Sort suggestions by priority
      suggestions.sort((a, b) => b.priority - a.priority);

      return suggestions.slice(0, 10); // Return top 10 suggestions
    } catch (error) {
      this.log(`Error generating party suggestions: ${error}`);
      return [];
    }
  }

  /**
   * Generate user-friendly error messages for party composition issues
   * @param validationResult - Validation result to generate messages for
   * @returns Array of user-friendly error messages with suggested fixes
   */
  public generateErrorMessages(validationResult: PartyValidationResult): Array<{
    message: string;
    suggestedFix: string;
    severity: 'error' | 'warning';
    actionable: boolean;
  }> {
    const messages: Array<{
      message: string;
      suggestedFix: string;
      severity: 'error' | 'warning';
      actionable: boolean;
    }> = [];

    // Process errors
    for (const error of validationResult.errors) {
      let suggestedFix = '';
      let actionable = true;

      switch (error.type) {
        case 'lost_character':
          const suggestions = this.getPartySuggestions();
          const replacement = suggestions.find(s => s.replacesLostCharacter === error.characterId);

          if (replacement) {
            const replacementChar = this.allCharacters.get(replacement.characterId);
            suggestedFix = `Replace with ${replacementChar?.name || replacement.characterId}`;
          } else if (validationResult.availableCharacters.length > 0) {
            suggestedFix = 'Choose from available characters list';
          } else {
            suggestedFix = 'No available characters to replace with';
            actionable = false;
          }
          break;

        case 'insufficient_members':
          if (validationResult.totalAvailable >= this.config.minPartySize) {
            suggestedFix = 'Select available characters';
          } else if (validationResult.totalAvailable > 0) {
            const needed = this.config.minPartySize - validationResult.totalAvailable;
            suggestedFix = `Add ${needed} more character(s)`;
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
      });
    }

    return messages;
  }

  /**
   * Analyze party balance and provide warnings
   * @param partyMembers - Array of character IDs to analyze
   * @returns Analysis result with warnings
   */
  private analyzePartyBalance(partyMembers: string[]): { warnings: PartyValidationWarning[] } {
    const warnings: PartyValidationWarning[] = [];

    try {
      const characters = partyMembers
        .map(id => this.allCharacters.get(id))
        .filter((char): char is Unit => char !== undefined);

      if (characters.length === 0) {
        return { warnings };
      }

      // Check level distribution
      const levels = characters.map(c => c.level || 1);
      const avgLevel = levels.reduce((sum, level) => sum + level, 0) / levels.length;
      const levelVariance =
        levels.reduce((sum, level) => sum + Math.pow(level - avgLevel, 2), 0) / levels.length;

      if (levelVariance > 25) {
        // High level variance
        warnings.push({
          type: 'unbalanced_party',
          message: 'Party has characters with very different levels',
          severity: 'medium',
        });
      }

      // Check if party is too small for optimal strategy
      if (characters.length < 3 && this.getAvailableCharacters().length >= 3) {
        warnings.push({
          type: 'missing_role',
          message: 'Consider adding more characters for better tactical options',
          severity: 'low',
        });
      }
    } catch (error) {
      this.log(`Error analyzing party balance: ${error}`);
    }

    return { warnings };
  }

  /**
   * Handle character lost event from character loss manager
   * @param event - Character lost event data
   */
  private onCharacterLost(event: any): void {
    const lostCharacterId = event.unit?.id;
    if (!lostCharacterId) return;

    // Check if lost character is in current party
    if (this.currentParty.members.includes(lostCharacterId)) {
      // Re-validate current party
      const validation = this.validatePartyComposition(this.currentParty.members);
      this.currentParty.lastValidation = validation;

      // Emit party invalidated event
      this.emit('party-invalidated', {
        lostCharacter: event.lostCharacter,
        currentParty: this.currentParty,
        validation: validation,
      });

      this.log(`Party invalidated due to character loss: ${lostCharacterId}`);
    }
  }

  /**
   * Handle chapter reset event
   * @param event - Chapter reset event data
   */
  private onChapterReset(event: any): void {
    // Reset party composition for new chapter
    this.currentParty = {
      members: [],
      lastUpdated: Date.now(),
    };

    this.emit('party-reset', { chapterId: event.chapterId });
    this.log('Party composition reset for new chapter');
  }

  /**
   * Handle chapter initialized event
   * @param event - Chapter initialized event data
   */
  private onChapterInitialized(event: any): void {
    // Validate current party against new chapter state
    if (this.currentParty.members.length > 0) {
      const validation = this.validatePartyComposition(this.currentParty.members);
      this.currentParty.lastValidation = validation;

      this.emit('party-revalidated', {
        chapterId: event.chapterId,
        validation: validation,
      });
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen to scene events
    this.scene.events.on('shutdown', this.onSceneShutdown.bind(this));
    this.scene.events.on('destroy', this.onSceneDestroy.bind(this));
  }

  /**
   * Handle scene shutdown
   */
  private onSceneShutdown(): void {
    this.emit('party-manager-shutdown');
  }

  /**
   * Handle scene destroy
   */
  private onSceneDestroy(): void {
    this.destroy();
  }

  /**
   * Log message with party manager prefix
   * @param message - Message to log
   */
  private log(message: string): void {
    console.log(`[PartyManager] ${message}`);
  }

  /**
   * Cleanup and destroy party manager
   */
  public destroy(): void {
    // Remove event listeners
    if (this.characterLossManager) {
      this.characterLossManager.off('character-loss-processed', this.onCharacterLost);
      this.characterLossManager.off('chapter-state-reset', this.onChapterReset);
      this.characterLossManager.off('chapter-initialized', this.onChapterInitialized);
    }

    // Clear data
    this.allCharacters.clear();
    this.currentParty = { members: [], lastUpdated: Date.now() };

    // Emit destroyed event
    this.emit('party-manager-destroyed');

    this.log('Party manager destroyed');
  }
}
