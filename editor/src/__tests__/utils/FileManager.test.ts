import { FileManager } from '../../utils/FileManager';
import { Character, Item, Stage } from '../../types';

// Mock File System Access API
const mockShowOpenFilePicker = jest.fn();
const mockShowSaveFilePicker = jest.fn();

Object.defineProperty(window, 'showOpenFilePicker', {
  value: mockShowOpenFilePicker,
  writable: true,
});

Object.defineProperty(window, 'showSaveFilePicker', {
  value: mockShowSaveFilePicker,
  writable: true,
});

// Mock file handle
const createMockFileHandle = (content: string) => ({
  getFile: jest.fn().mockResolvedValue({
    text: jest.fn().mockResolvedValue(content),
  }),
  createWritable: jest.fn().mockResolvedValue({
    write: jest.fn(),
    close: jest.fn(),
  }),
});

describe('FileManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('importData', () => {
    it('imports valid JSON data', async () => {
      const testData = {
        characters: [
          {
            id: 'char1',
            name: 'Test Character',
            description: 'A test character',
            stats: {
              hp: 100,
              mp: 50,
              attack: 20,
              defense: 15,
              speed: 10,
              movement: 3,
            },
            abilities: [],
            sprite: {
              idle: 'idle.png',
              move: 'move.png',
              attack: 'attack.png',
            },
            faction: 'player',
            canBeRecruited: false,
            recruitmentConditions: [],
            jobId: 'warrior',
          },
        ],
      };

      const fileHandle = createMockFileHandle(JSON.stringify(testData));
      mockShowOpenFilePicker.mockResolvedValue([fileHandle]);

      const result = await FileManager.importData();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
      expect(result.errors).toHaveLength(0);
    });

    it('handles invalid JSON', async () => {
      const invalidJson = '{ invalid json }';
      const fileHandle = createMockFileHandle(invalidJson);
      mockShowOpenFilePicker.mockResolvedValue([fileHandle]);

      const result = await FileManager.importData();

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid JSON');
    });

    it('handles file access errors', async () => {
      mockShowOpenFilePicker.mockRejectedValue(new Error('File access denied'));

      const result = await FileManager.importData();

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('File access denied');
    });

    it('validates imported data structure', async () => {
      const invalidData = {
        characters: [
          {
            id: 'char1',
            // Missing required fields
          },
        ],
      };

      const fileHandle = createMockFileHandle(JSON.stringify(invalidData));
      mockShowOpenFilePicker.mockResolvedValue([fileHandle]);

      const result = await FileManager.importData();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('exportData', () => {
    it('exports data as JSON', async () => {
      const testData = {
        characters: [],
        items: [],
        stages: [],
      };

      const writableStream = {
        write: jest.fn(),
        close: jest.fn(),
      };

      const fileHandle = {
        createWritable: jest.fn().mockResolvedValue(writableStream),
      };

      mockShowSaveFilePicker.mockResolvedValue(fileHandle);

      const result = await FileManager.exportData(testData);

      expect(result.success).toBe(true);
      expect(writableStream.write).toHaveBeenCalledWith(
        JSON.stringify(testData, null, 2)
      );
      expect(writableStream.close).toHaveBeenCalled();
    });

    it('handles export errors', async () => {
      const testData = { characters: [], items: [], stages: [] };
      mockShowSaveFilePicker.mockRejectedValue(new Error('Export failed'));

      const result = await FileManager.exportData(testData);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Export failed');
    });
  });

  describe('validateData', () => {
    it('validates correct data structure', () => {
      const validData = {
        characters: [
          {
            id: 'char1',
            name: 'Test Character',
            description: 'A test character',
            stats: {
              hp: 100,
              mp: 50,
              attack: 20,
              defense: 15,
              speed: 10,
              movement: 3,
            },
            abilities: [],
            sprite: {
              idle: 'idle.png',
              move: 'move.png',
              attack: 'attack.png',
            },
            faction: 'player',
            canBeRecruited: false,
            recruitmentConditions: [],
            jobId: 'warrior',
          },
        ],
        items: [],
        stages: [],
      };

      const result = FileManager.validateData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects missing required fields', () => {
      const invalidData = {
        characters: [
          {
            id: 'char1',
            // Missing name and other required fields
          },
        ],
      };

      const result = FileManager.validateData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('detects invalid data types', () => {
      const invalidData = {
        characters: [
          {
            id: 'char1',
            name: 123, // Should be string
            stats: 'invalid', // Should be object
          },
        ],
      };

      const result = FileManager.validateData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('fallback methods', () => {
    beforeEach(() => {
      // Remove File System Access API support
      delete (window as any).showOpenFilePicker;
      delete (window as any).showSaveFilePicker;
    });

    it('uses fallback import method', async () => {
      // Mock file input and FileReader
      const mockFileReader = {
        readAsText: jest.fn(),
        result: JSON.stringify({ characters: [], items: [], stages: [] }),
        onload: null as any,
        onerror: null as any,
      };

      global.FileReader = jest.fn(() => mockFileReader) as any;

      // Simulate file selection
      const mockFile = new File(['{}'], 'test.json', {
        type: 'application/json',
      });

      // This would normally be triggered by user interaction
      // For testing, we'll directly call the fallback method
      const result = await FileManager.importDataFallback(mockFile);

      expect(result.success).toBe(true);
    });

    it('uses fallback export method', async () => {
      const testData = { characters: [], items: [], stages: [] };

      // Mock URL.createObjectURL and document.createElement
      global.URL.createObjectURL = jest.fn(() => 'blob:url');
      global.URL.revokeObjectURL = jest.fn();

      const mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
      };

      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      const result = await FileManager.exportDataFallback(
        testData,
        'test.json'
      );

      expect(result.success).toBe(true);
      expect(mockLink.click).toHaveBeenCalled();
    });
  });
});
