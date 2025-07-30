import { z } from 'zod';
import { ValidationError } from '../types';
import {
    CharacterSchema,
    ItemSchema,
    StageSchema,
    GameDataSchema,
} from '../schemas';

/**
 * Validation utility class for game data
 */
export class ValidationManager {
    /**
     * Validate character data
     */
    validateCharacter(character: unknown): ValidationError[] {
        try {
            CharacterSchema.parse(character);
            return [];
        } catch (error) {
            if (error instanceof z.ZodError) {
                return this.formatZodErrors(error, 'character');
            }
            return [{
                field: 'character',
                message: 'Unknown validation error',
                severity: 'error',
                path: [],
            }];
        }
    }

    /**
     * Validate item data
     */
    validateItem(item: unknown): ValidationError[] {
        try {
            ItemSchema.parse(item);
            return [];
        } catch (error) {
            if (error instanceof z.ZodError) {
                return this.formatZodErrors(error, 'item');
            }
            return [{
                field: 'item',
                message: 'Unknown validation error',
                severity: 'error',
                path: [],
            }];
        }
    }

    /**
     * Validate stage data
     */
    validateStage(stage: unknown): ValidationError[] {
        try {
            StageSchema.parse(stage);
            return [];
        } catch (error) {
            if (error instanceof z.ZodError) {
                return this.formatZodErrors(error, 'stage');
            }
            return [{
                field: 'stage',
                message: 'Unknown validation error',
                severity: 'error',
                path: [],
            }];
        }
    }

    /**
     * Validate complete game data
     */
    validateGameData(gameData: unknown): ValidationError[] {
        try {
            GameDataSchema.parse(gameData);
            return [];
        } catch (error) {
            if (error instanceof z.ZodError) {
                return this.formatZodErrors(error, 'gameData');
            }
            return [{
                field: 'gameData',
                message: 'Unknown validation error',
                severity: 'error',
                path: [],
            }];
        }
    }

    /**
     * Validate multiple characters
     */
    validateCharacters(characters: Record<string, unknown>): ValidationError[] {
        const errors: ValidationError[] = [];

        Object.entries(characters).forEach(([id, character]) => {
            const characterErrors = this.validateCharacter(character);
            errors.push(...characterErrors.map(error => ({
                ...error,
                field: `characters.${id}.${error.field}`,
                path: ['characters', id, ...error.path],
            })));
        });

        return errors;
    }

    /**
     * Validate multiple items
     */
    validateItems(items: Record<string, unknown>): ValidationError[] {
        const errors: ValidationError[] = [];

        Object.entries(items).forEach(([id, item]) => {
            const itemErrors = this.validateItem(item);
            errors.push(...itemErrors.map(error => ({
                ...error,
                field: `items.${id}.${error.field}`,
                path: ['items', id, ...error.path],
            })));
        });

        return errors;
    }

    /**
     * Validate multiple stages
     */
    validateStages(stages: Record<string, unknown>): ValidationError[] {
        const errors: ValidationError[] = [];

        Object.entries(stages).forEach(([id, stage]) => {
            const stageErrors = this.validateStage(stage);
            errors.push(...stageErrors.map(error => ({
                ...error,
                field: `stages.${id}.${error.field}`,
                path: ['stages', id, ...error.path],
            })));
        });

        return errors;
    }

    /**
     * Format Zod validation errors into our ValidationError format
     */
    private formatZodErrors(error: z.ZodError, prefix: string = ''): ValidationError[] {
        return error.errors.map(err => ({
            field: prefix ? `${prefix}.${err.path.join('.')}` : err.path.join('.'),
            message: this.formatErrorMessage(err),
            severity: 'error' as const,
            path: err.path.map(String),
        }));
    }

    /**
     * Format individual Zod error messages for better user experience
     */
    private formatErrorMessage(error: z.ZodIssue): string {
        switch (error.code) {
            case 'too_small':
                if (error.type === 'string') {
                    return error.minimum === 1
                        ? 'This field is required'
                        : `Must be at least ${error.minimum} characters`;
                }
                if (error.type === 'number') {
                    return `Must be at least ${error.minimum}`;
                }
                if (error.type === 'array') {
                    return error.minimum === 1
                        ? 'At least one item is required'
                        : `Must have at least ${error.minimum} items`;
                }
                break;

            case 'too_big':
                if (error.type === 'string') {
                    return `Must be no more than ${error.maximum} characters`;
                }
                if (error.type === 'number') {
                    return `Must be no more than ${error.maximum}`;
                }
                if (error.type === 'array') {
                    return `Must have no more than ${error.maximum} items`;
                }
                break;

            case 'invalid_type':
                return `Expected ${error.expected}, received ${error.received}`;

            case 'invalid_enum_value':
                return `Invalid value. Expected one of: ${error.options.join(', ')}`;

            case 'custom':
                return error.message || 'Invalid value';

            default:
                return error.message || 'Invalid value';
        }

        return error.message || 'Invalid value';
    }
}

/**
 * Safe parsing utilities
 */
export class SafeParser {
    /**
     * Safely parse character data with detailed error information
     */
    static parseCharacter(data: unknown) {
        const result = CharacterSchema.safeParse(data);
        if (result.success) {
            return { success: true, data: result.data, errors: [] };
        }

        const validationManager = new ValidationManager();
        const errors = validationManager.formatZodErrors(result.error, 'character');
        return { success: false, data: null, errors };
    }

    /**
     * Safely parse item data with detailed error information
     */
    static parseItem(data: unknown) {
        const result = ItemSchema.safeParse(data);
        if (result.success) {
            return { success: true, data: result.data, errors: [] };
        }

        const validationManager = new ValidationManager();
        const errors = validationManager.formatZodErrors(result.error, 'item');
        return { success: false, data: null, errors };
    }

    /**
     * Safely parse stage data with detailed error information
     */
    static parseStage(data: unknown) {
        const result = StageSchema.safeParse(data);
        if (result.success) {
            return { success: true, data: result.data, errors: [] };
        }

        const validationManager = new ValidationManager();
        const errors = validationManager.formatZodErrors(result.error, 'stage');
        return { success: false, data: null, errors };
    }

    /**
     * Safely parse complete game data with detailed error information
     */
    static parseGameData(data: unknown) {
        const result = GameDataSchema.safeParse(data);
        if (result.success) {
            return { success: true, data: result.data, errors: [] };
        }

        const validationManager = new ValidationManager();
        const errors = validationManager.formatZodErrors(result.error, 'gameData');
        return { success: false, data: null, errors };
    }
}

/**
 * Validation result helpers
 */
export const ValidationHelpers = {
    /**
     * Check if validation errors contain any critical errors
     */
    hasCriticalErrors(errors: ValidationError[]): boolean {
        return errors.some(error => error.severity === 'error');
    },

    /**
     * Group validation errors by field
     */
    groupErrorsByField(errors: ValidationError[]): Record<string, ValidationError[]> {
        return errors.reduce((groups, error) => {
            const field = error.field;
            if (!groups[field]) {
                groups[field] = [];
            }
            groups[field].push(error);
            return groups;
        }, {} as Record<string, ValidationError[]>);
    },

    /**
     * Get first error message for a specific field
     */
    getFieldError(errors: ValidationError[], fieldPath: string): string | null {
        const fieldError = errors.find(error =>
            error.field === fieldPath || error.field.startsWith(`${fieldPath}.`)
        );
        return fieldError?.message || null;
    },

    /**
     * Filter errors by severity
     */
    filterBySeverity(errors: ValidationError[], severity: 'error' | 'warning'): ValidationError[] {
        return errors.filter(error => error.severity === severity);
    },
};

// Create singleton instance for easy access
export const validationManager = new ValidationManager();