/**
 * Data loader utility for handling JSON data files with validation and error handling
 */

import {
  JSONSchemaValidator,
  SchemaValidationError,
  charactersFileSchema,
  stagesFileSchema,
  RecruitmentDataValidator,
} from '../schemas/recruitmentSchema';
import { RecruitmentCondition, RecruitmentReward } from '../types/recruitment';

export interface Position {
  x: number;
  y: number;
}

export interface BaseStats {
  maxHP: number;
  maxMP: number;
  attack: number;
  defense: number;
  speed: number;
  movement: number;
}

export interface RecruitmentData {
  priority: number;
  description: string;
  conditions: RecruitmentCondition[];
  rewards?: RecruitmentReward[];
}

export interface CharacterData {
  id: string;
  name: string;
  description: string;
  faction: 'player' | 'enemy' | 'neutral';
  baseStats: BaseStats;
  jobClass: string;
  level: number;
  isRecruitable: boolean;
  recruitmentData: RecruitmentData | null;
  isBoss?: boolean;
  roseEssenceReward?: number;
}

export interface StageUnit {
  characterId: string;
  startPosition: Position;
}

export interface StageRecruitableCharacter {
  characterId: string;
  isActive: boolean;
  stageSpecificConditions?: RecruitmentCondition[];
}

export interface StageCondition {
  type: string;
  description: string;
  parameters?: Record<string, any>;
}

export interface MapData {
  width: number;
  height: number;
  tileset: string;
}

export interface StageData {
  id: string;
  name: string;
  description: string;
  isUnlocked: boolean;
  thumbnail?: string;
  difficulty: number;
  order: number;
  mapData: MapData;
  playerUnits: StageUnit[];
  enemyUnits: StageUnit[];
  recruitableCharacters: StageRecruitableCharacter[];
  victoryConditions: StageCondition[];
  defeatConditions: StageCondition[];
}

export interface ConfigData {
  defaultConfig: {
    audio: {
      masterVolume: number;
      sfxVolume: number;
      musicVolume: number;
    };
    graphics: {
      fullscreen: boolean;
      resolution: string;
      quality: string;
    };
    controls: {
      keyBindings: {
        [key: string]: string;
      };
    };
    gameplay: {
      difficulty: string;
      autoSave: boolean;
      showTutorials: boolean;
    };
  };
}

export interface StagesResponse {
  stages: StageData[];
}

export interface CharactersResponse {
  characters: CharacterData[];
}

export class DataValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'DataValidationError';
  }
}

export class DataLoader {
  /**
   * Load and validate stage data from JSON
   */
  static async loadStageData(): Promise<StageData[]> {
    try {
      const response = await fetch('/data/stages.json');

      if (!response.ok) {
        throw new Error(`Failed to load stages.json: ${response.status} ${response.statusText}`);
      }

      const data: StagesResponse = await response.json();

      // Validate the data structure
      this.validateStageData(data);

      return data.stages;
    } catch (error) {
      console.error('Error loading stage data:', error);
      throw error;
    }
  }

  /**
   * Load and validate configuration data from JSON
   */
  static async loadConfigData(): Promise<ConfigData> {
    try {
      const response = await fetch('/data/config.json');

      if (!response.ok) {
        throw new Error(`Failed to load config.json: ${response.status} ${response.statusText}`);
      }

      const data: ConfigData = await response.json();

      // Validate the data structure
      this.validateConfigData(data);

      return data;
    } catch (error) {
      console.error('Error loading config data:', error);
      throw error;
    }
  }

  /**
   * Load and validate character data from JSON
   */
  static async loadCharacterData(): Promise<CharacterData[]> {
    try {
      const response = await fetch('/data/characters.json');

      if (!response.ok) {
        throw new Error(
          `Failed to load characters.json: ${response.status} ${response.statusText}`
        );
      }

      const data: CharactersResponse = await response.json();

      // Validate the data structure using JSON schema
      try {
        JSONSchemaValidator.validate(data, charactersFileSchema);
      } catch (error) {
        if (error instanceof SchemaValidationError) {
          throw new DataValidationError(
            `Character data validation failed: ${error.message}`,
            error.path
          );
        }
        throw error;
      }

      // Additional recruitment-specific validation
      data.characters.forEach((character, index) => {
        try {
          RecruitmentDataValidator.validateCharacterRecruitmentConsistency(character);
        } catch (error) {
          if (error instanceof SchemaValidationError) {
            throw new DataValidationError(
              `Character ${character.id} validation failed: ${error.message}`,
              `characters[${index}]`
            );
          }
          throw error;
        }
      });

      return data.characters;
    } catch (error) {
      console.error('Error loading character data:', error);
      throw error;
    }
  }

  /**
   * Load character and stage data together and validate cross-references
   */
  static async loadGameData(): Promise<{ characters: CharacterData[]; stages: StageData[] }> {
    try {
      // Load both datasets
      const [characters, stages] = await Promise.all([
        this.loadCharacterData(),
        this.loadStageData(),
      ]);

      // Validate cross-references between stages and characters
      stages.forEach((stage, index) => {
        try {
          RecruitmentDataValidator.validateStageRecruitmentConsistency(stage, characters);
        } catch (error) {
          if (error instanceof SchemaValidationError) {
            throw new DataValidationError(
              `Stage ${stage.id} validation failed: ${error.message}`,
              `stages[${index}]`
            );
          }
          throw error;
        }
      });

      return { characters, stages };
    } catch (error) {
      console.error('Error loading game data:', error);
      throw error;
    }
  }

  /**
   * Validate stage data structure and content
   */
  private static validateStageData(data: any): void {
    try {
      // Use JSON schema validation for comprehensive validation
      JSONSchemaValidator.validate(data, stagesFileSchema);
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        throw new DataValidationError(`Stage data validation failed: ${error.message}`, error.path);
      }
      throw error;
    }

    // Additional validation for duplicate IDs and orders
    const ids = data.stages.map((stage: StageData) => stage.id);
    const duplicateIds = ids.filter((id: string, index: number) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      throw new DataValidationError(
        `Duplicate stage IDs found: ${duplicateIds.join(', ')}`,
        'stages'
      );
    }

    const orders = data.stages.map((stage: StageData) => stage.order);
    const duplicateOrders = orders.filter(
      (order: number, index: number) => orders.indexOf(order) !== index
    );
    if (duplicateOrders.length > 0) {
      throw new DataValidationError(
        `Duplicate stage orders found: ${duplicateOrders.join(', ')}`,
        'stages'
      );
    }
  }

  /**
   * Validate configuration data structure and content
   */
  private static validateConfigData(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new DataValidationError('Invalid config data: must be an object');
    }

    if (!data.defaultConfig || typeof data.defaultConfig !== 'object') {
      throw new DataValidationError(
        'Invalid config data: defaultConfig must be an object',
        'defaultConfig'
      );
    }

    const config = data.defaultConfig;

    // Validate audio settings
    if (!config.audio || typeof config.audio !== 'object') {
      throw new DataValidationError(
        'Invalid audio config: must be an object',
        'defaultConfig.audio'
      );
    }

    const audioFields = ['masterVolume', 'sfxVolume', 'musicVolume'];
    audioFields.forEach(field => {
      const value = config.audio[field];
      if (typeof value !== 'number' || value < 0 || value > 1) {
        throw new DataValidationError(
          `Invalid ${field}: must be a number between 0 and 1`,
          `defaultConfig.audio.${field}`
        );
      }
    });

    // Validate graphics settings
    if (!config.graphics || typeof config.graphics !== 'object') {
      throw new DataValidationError(
        'Invalid graphics config: must be an object',
        'defaultConfig.graphics'
      );
    }

    if (typeof config.graphics.fullscreen !== 'boolean') {
      throw new DataValidationError(
        'Invalid fullscreen setting: must be a boolean',
        'defaultConfig.graphics.fullscreen'
      );
    }

    if (!config.graphics.resolution || typeof config.graphics.resolution !== 'string') {
      throw new DataValidationError(
        'Invalid resolution setting: must be a non-empty string',
        'defaultConfig.graphics.resolution'
      );
    }

    const validQualities = ['low', 'medium', 'high', 'ultra'];
    if (!validQualities.includes(config.graphics.quality)) {
      throw new DataValidationError(
        `Invalid quality setting: must be one of ${validQualities.join(', ')}`,
        'defaultConfig.graphics.quality'
      );
    }

    // Validate controls settings
    if (!config.controls || typeof config.controls !== 'object') {
      throw new DataValidationError(
        'Invalid controls config: must be an object',
        'defaultConfig.controls'
      );
    }

    if (!config.controls.keyBindings || typeof config.controls.keyBindings !== 'object') {
      throw new DataValidationError(
        'Invalid keyBindings: must be an object',
        'defaultConfig.controls.keyBindings'
      );
    }

    const requiredKeys = ['up', 'down', 'left', 'right', 'action', 'menu'];
    requiredKeys.forEach(key => {
      if (
        !config.controls.keyBindings[key] ||
        typeof config.controls.keyBindings[key] !== 'string'
      ) {
        throw new DataValidationError(
          `Invalid key binding for ${key}: must be a non-empty string`,
          `defaultConfig.controls.keyBindings.${key}`
        );
      }
    });

    // Validate gameplay settings
    if (!config.gameplay || typeof config.gameplay !== 'object') {
      throw new DataValidationError(
        'Invalid gameplay config: must be an object',
        'defaultConfig.gameplay'
      );
    }

    const validDifficulties = ['easy', 'normal', 'hard', 'expert'];
    if (!validDifficulties.includes(config.gameplay.difficulty)) {
      throw new DataValidationError(
        `Invalid difficulty setting: must be one of ${validDifficulties.join(', ')}`,
        'defaultConfig.gameplay.difficulty'
      );
    }

    if (typeof config.gameplay.autoSave !== 'boolean') {
      throw new DataValidationError(
        'Invalid autoSave setting: must be a boolean',
        'defaultConfig.gameplay.autoSave'
      );
    }

    if (typeof config.gameplay.showTutorials !== 'boolean') {
      throw new DataValidationError(
        'Invalid showTutorials setting: must be a boolean',
        'defaultConfig.gameplay.showTutorials'
      );
    }
  }

  /**
   * Get default fallback stage data in case of loading failure
   */
  static getDefaultStageData(): StageData[] {
    return [
      {
        id: 'stage-001',
        name: 'Tutorial Stage',
        description: 'Learn the basics of the game',
        isUnlocked: true,
        difficulty: 1,
        order: 1,
        mapData: {
          width: 10,
          height: 8,
          tileset: 'tutorial',
        },
        playerUnits: [
          {
            characterId: 'protagonist',
            startPosition: { x: 1, y: 4 },
          },
        ],
        enemyUnits: [],
        recruitableCharacters: [],
        victoryConditions: [
          {
            type: 'defeat_all_enemies',
            description: '全ての敵を撃破する',
          },
        ],
        defeatConditions: [
          {
            type: 'all_allies_defeated',
            description: '味方が全滅する',
          },
        ],
      },
    ];
  }

  /**
   * Get default fallback character data in case of loading failure
   */
  static getDefaultCharacterData(): CharacterData[] {
    return [
      {
        id: 'protagonist',
        name: '主人公',
        description: '薔薇の脅威を取り除く使命を帯びた冒険者',
        faction: 'player',
        baseStats: {
          maxHP: 120,
          maxMP: 60,
          attack: 25,
          defense: 20,
          speed: 15,
          movement: 3,
        },
        jobClass: 'warrior',
        level: 1,
        isRecruitable: false,
        recruitmentData: null,
      },
    ];
  }

  /**
   * Get default fallback configuration data in case of loading failure
   */
  static getDefaultConfigData(): ConfigData {
    return {
      defaultConfig: {
        audio: {
          masterVolume: 0.8,
          sfxVolume: 0.7,
          musicVolume: 0.6,
        },
        graphics: {
          fullscreen: false,
          resolution: '1920x1080',
          quality: 'high',
        },
        controls: {
          keyBindings: {
            up: 'W',
            down: 'S',
            left: 'A',
            right: 'D',
            action: 'SPACE',
            menu: 'ESC',
          },
        },
        gameplay: {
          difficulty: 'normal',
          autoSave: true,
          showTutorials: true,
        },
      },
    };
  }
}
