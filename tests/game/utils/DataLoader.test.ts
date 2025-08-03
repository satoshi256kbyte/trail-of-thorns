import {
  DataLoader,
  DataValidationError,
  StageData,
  ConfigData,
} from '../../../game/src/utils/DataLoader';

// Mock fetch globally
global.fetch = jest.fn();

describe('DataLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadStageData', () => {
    it('should load and validate valid stage data', async () => {
      const mockStageData = {
        stages: [
          {
            id: 'stage-001',
            name: 'Forest Path',
            description: 'A peaceful introduction',
            isUnlocked: true,
            difficulty: 1,
            order: 1,
            thumbnail: 'assets/forest.png',
          },
          {
            id: 'stage-002',
            name: 'Mountain Pass',
            description: 'Treacherous terrain',
            isUnlocked: false,
            difficulty: 2,
            order: 2,
          },
        ],
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStageData,
      });

      const result = await DataLoader.loadStageData();

      expect(fetch).toHaveBeenCalledWith('/data/stages.json');
      expect(result).toEqual(mockStageData.stages);
    });

    it('should throw error when fetch fails', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(DataLoader.loadStageData()).rejects.toThrow(
        'Failed to load stages.json: 404 Not Found'
      );
    });

    it('should throw error when JSON is invalid', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(DataLoader.loadStageData()).rejects.toThrow('Invalid JSON');
    });

    it('should validate stage data structure', async () => {
      const invalidData = { stages: 'not an array' };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => invalidData,
      });

      await expect(DataLoader.loadStageData()).rejects.toThrow(DataValidationError);
    });

    it('should validate required stage fields', async () => {
      const invalidStage = {
        stages: [
          {
            id: '',
            name: 'Valid Name',
            description: 'Valid Description',
            isUnlocked: true,
            difficulty: 1,
            order: 1,
          },
        ],
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => invalidStage,
      });

      await expect(DataLoader.loadStageData()).rejects.toThrow(DataValidationError);
    });

    it('should validate stage difficulty range', async () => {
      const invalidDifficulty = {
        stages: [
          {
            id: 'stage-001',
            name: 'Valid Name',
            description: 'Valid Description',
            isUnlocked: true,
            difficulty: 15,
            order: 1,
          },
        ],
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => invalidDifficulty,
      });

      await expect(DataLoader.loadStageData()).rejects.toThrow(DataValidationError);
    });

    it('should detect duplicate stage IDs', async () => {
      const duplicateIds = {
        stages: [
          {
            id: 'stage-001',
            name: 'Stage 1',
            description: 'Description 1',
            isUnlocked: true,
            difficulty: 1,
            order: 1,
          },
          {
            id: 'stage-001',
            name: 'Stage 2',
            description: 'Description 2',
            isUnlocked: false,
            difficulty: 2,
            order: 2,
          },
        ],
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => duplicateIds,
      });

      await expect(DataLoader.loadStageData()).rejects.toThrow(DataValidationError);
    });

    it('should detect duplicate stage orders', async () => {
      const duplicateOrders = {
        stages: [
          {
            id: 'stage-001',
            name: 'Stage 1',
            description: 'Description 1',
            isUnlocked: true,
            difficulty: 1,
            order: 1,
          },
          {
            id: 'stage-002',
            name: 'Stage 2',
            description: 'Description 2',
            isUnlocked: false,
            difficulty: 2,
            order: 1,
          },
        ],
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => duplicateOrders,
      });

      await expect(DataLoader.loadStageData()).rejects.toThrow(DataValidationError);
    });
  });

  describe('loadConfigData', () => {
    it('should load and validate valid config data', async () => {
      const mockConfigData = {
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

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfigData,
      });

      const result = await DataLoader.loadConfigData();

      expect(fetch).toHaveBeenCalledWith('/data/config.json');
      expect(result).toEqual(mockConfigData);
    });

    it('should throw error when fetch fails', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(DataLoader.loadConfigData()).rejects.toThrow(
        'Failed to load config.json: 500 Internal Server Error'
      );
    });

    it('should validate audio volume ranges', async () => {
      const invalidVolume = {
        defaultConfig: {
          audio: {
            masterVolume: 1.5,
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

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => invalidVolume,
      });

      await expect(DataLoader.loadConfigData()).rejects.toThrow(DataValidationError);
    });

    it('should validate graphics quality values', async () => {
      const invalidQuality = {
        defaultConfig: {
          audio: {
            masterVolume: 0.8,
            sfxVolume: 0.7,
            musicVolume: 0.6,
          },
          graphics: {
            fullscreen: false,
            resolution: '1920x1080',
            quality: 'invalid',
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

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => invalidQuality,
      });

      await expect(DataLoader.loadConfigData()).rejects.toThrow(DataValidationError);
    });

    it('should validate required key bindings', async () => {
      const missingKeyBinding = {
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
              // missing action and menu
            },
          },
          gameplay: {
            difficulty: 'normal',
            autoSave: true,
            showTutorials: true,
          },
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => missingKeyBinding,
      });

      await expect(DataLoader.loadConfigData()).rejects.toThrow(DataValidationError);
    });

    it('should validate gameplay difficulty values', async () => {
      const invalidDifficulty = {
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
            difficulty: 'impossible',
            autoSave: true,
            showTutorials: true,
          },
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => invalidDifficulty,
      });

      await expect(DataLoader.loadConfigData()).rejects.toThrow(DataValidationError);
    });
  });

  describe('getDefaultStageData', () => {
    it('should return valid default stage data', () => {
      const defaultData = DataLoader.getDefaultStageData();

      expect(Array.isArray(defaultData)).toBe(true);
      expect(defaultData.length).toBeGreaterThan(0);
      expect(defaultData[0]).toHaveProperty('id');
      expect(defaultData[0]).toHaveProperty('name');
      expect(defaultData[0]).toHaveProperty('description');
      expect(defaultData[0]).toHaveProperty('isUnlocked');
      expect(defaultData[0]).toHaveProperty('difficulty');
      expect(defaultData[0]).toHaveProperty('order');
    });
  });

  describe('getDefaultConfigData', () => {
    it('should return valid default config data', () => {
      const defaultData = DataLoader.getDefaultConfigData();

      expect(defaultData).toHaveProperty('defaultConfig');
      expect(defaultData.defaultConfig).toHaveProperty('audio');
      expect(defaultData.defaultConfig).toHaveProperty('graphics');
      expect(defaultData.defaultConfig).toHaveProperty('controls');
      expect(defaultData.defaultConfig).toHaveProperty('gameplay');

      // Validate audio settings
      expect(defaultData.defaultConfig.audio.masterVolume).toBeGreaterThanOrEqual(0);
      expect(defaultData.defaultConfig.audio.masterVolume).toBeLessThanOrEqual(1);

      // Validate required key bindings
      const keyBindings = defaultData.defaultConfig.controls.keyBindings;
      expect(keyBindings).toHaveProperty('up');
      expect(keyBindings).toHaveProperty('down');
      expect(keyBindings).toHaveProperty('left');
      expect(keyBindings).toHaveProperty('right');
      expect(keyBindings).toHaveProperty('action');
      expect(keyBindings).toHaveProperty('menu');
    });
  });

  describe('DataValidationError', () => {
    it('should create error with message and optional field', () => {
      const error = new DataValidationError('Test error', 'testField');

      expect(error.message).toBe('Test error');
      expect(error.field).toBe('testField');
      expect(error.name).toBe('DataValidationError');
      expect(error instanceof Error).toBe(true);
    });

    it('should create error with message only', () => {
      const error = new DataValidationError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.field).toBeUndefined();
      expect(error.name).toBe('DataValidationError');
    });
  });
});
