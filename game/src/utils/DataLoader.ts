/**
 * Data loader utility for handling JSON data files with validation and error handling
 */

export interface StageData {
  id: string;
  name: string;
  description: string;
  isUnlocked: boolean;
  thumbnail?: string;
  difficulty: number;
  order: number;
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
   * Validate stage data structure and content
   */
  private static validateStageData(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new DataValidationError('Invalid stage data: must be an object');
    }

    if (!Array.isArray(data.stages)) {
      throw new DataValidationError('Invalid stage data: stages must be an array', 'stages');
    }

    data.stages.forEach((stage: any, index: number) => {
      const stagePrefix = `stages[${index}]`;

      if (!stage || typeof stage !== 'object') {
        throw new DataValidationError(
          `Invalid stage at index ${index}: must be an object`,
          stagePrefix
        );
      }

      // Required fields
      if (!stage.id || typeof stage.id !== 'string') {
        throw new DataValidationError(
          `Invalid stage ID at index ${index}: must be a non-empty string`,
          `${stagePrefix}.id`
        );
      }

      if (!stage.name || typeof stage.name !== 'string') {
        throw new DataValidationError(
          `Invalid stage name at index ${index}: must be a non-empty string`,
          `${stagePrefix}.name`
        );
      }

      if (!stage.description || typeof stage.description !== 'string') {
        throw new DataValidationError(
          `Invalid stage description at index ${index}: must be a non-empty string`,
          `${stagePrefix}.description`
        );
      }

      if (typeof stage.isUnlocked !== 'boolean') {
        throw new DataValidationError(
          `Invalid stage isUnlocked at index ${index}: must be a boolean`,
          `${stagePrefix}.isUnlocked`
        );
      }

      if (typeof stage.difficulty !== 'number' || stage.difficulty < 1 || stage.difficulty > 10) {
        throw new DataValidationError(
          `Invalid stage difficulty at index ${index}: must be a number between 1 and 10`,
          `${stagePrefix}.difficulty`
        );
      }

      if (typeof stage.order !== 'number' || stage.order < 1) {
        throw new DataValidationError(
          `Invalid stage order at index ${index}: must be a positive number`,
          `${stagePrefix}.order`
        );
      }

      // Optional fields
      if (stage.thumbnail && typeof stage.thumbnail !== 'string') {
        throw new DataValidationError(
          `Invalid stage thumbnail at index ${index}: must be a string`,
          `${stagePrefix}.thumbnail`
        );
      }
    });

    // Check for duplicate IDs
    const ids = data.stages.map((stage: StageData) => stage.id);
    const duplicateIds = ids.filter((id: string, index: number) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      throw new DataValidationError(
        `Duplicate stage IDs found: ${duplicateIds.join(', ')}`,
        'stages'
      );
    }

    // Check for duplicate orders
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
