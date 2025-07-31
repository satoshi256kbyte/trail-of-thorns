/**
 * Interface for individual stage data
 * Represents a single stage with all its properties
 */
export interface StageData {
    /** Unique identifier for the stage */
    id: string;

    /** Display name of the stage */
    name: string;

    /** Brief description of the stage */
    description: string;

    /** Whether the stage is available for selection */
    isUnlocked: boolean;

    /** Path to the stage thumbnail image (optional) */
    thumbnail?: string;

    /** Difficulty level (1-5) */
    difficulty: number;

    /** Display order in the stage selection grid */
    order: number;
}

/**
 * Interface for the complete stages configuration
 * Contains all stages loaded from JSON
 */
export interface StagesConfig {
    /** Array of all available stages */
    stages: StageData[];
}

/**
 * Interface for stage loading result
 * Used for error handling and validation
 */
export interface StageLoadResult {
    /** Whether the loading was successful */
    success: boolean;

    /** Loaded stages data (if successful) */
    stages?: StageData[];

    /** Error message (if failed) */
    error?: string;
}