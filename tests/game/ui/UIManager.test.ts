/**
 * Unit tests for UIManager
 * Tests UI element management, state updates, and user interactions
 */

import { UIManager, ActionMenuItem } from '../../../game/src/ui/UIManager';
import { Unit, GameState } from '../../../game/src/types/gameplay';

// Mock Phaser globally
global.Phaser = {
  Geom: {
    Rectangle: {
      Contains: jest.fn(),
    },
  },
} as any;

// Mock Phaser objects
const mockText = {
  setText: jest.fn().mockReturnThis(),
  setColor: jest.fn().mockReturnThis(),
  setVisible: jest.fn().mockReturnThis(),
  setScrollFactor: jest.fn().mockReturnThis(),
  setDepth: jest.fn().mockReturnThis(),
  setOrigin: jest.fn().mockReturnThis(),
  setInteractive: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  destroy: jest.fn(),
  setPosition: jest.fn().mockReturnThis(),
};

const mockGraphics = {
  fillStyle: jest.fn().mockReturnThis(),
  fillRoundedRect: jest.fn().mockReturnThis(),
  lineStyle: jest.fn().mockReturnThis(),
  strokeRoundedRect: jest.fn().mockReturnThis(),
  clear: jest.fn().mockReturnThis(),
  destroy: jest.fn(),
  setPosition: jest.fn().mockReturnThis(),
};

const mockContainer = {
  add: jest.fn().mockReturnThis(),
  setVisible: jest.fn().mockReturnThis(),
  setScrollFactor: jest.fn().mockReturnThis(),
  setDepth: jest.fn().mockReturnThis(),
  setInteractive: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  destroy: jest.fn(),
  setPosition: jest.fn().mockReturnThis(),
};

const mockCamera = {
  width: 1024,
  height: 768,
  main: {
    width: 1024,
    height: 768,
  },
};

const mockScene = {
  add: {
    text: jest.fn(() => ({ ...mockText })),
    graphics: jest.fn(() => ({ ...mockGraphics })),
    container: jest.fn(() => ({ ...mockContainer })),
  },
  cameras: {
    main: mockCamera,
  },
  events: {
    emit: jest.fn(),
  },
};

// Test data
const createTestUnit = (overrides: Partial<Unit> = {}): Unit => ({
  id: 'test-unit-1',
  name: 'Test Hero',
  position: { x: 0, y: 0 },
  stats: {
    maxHP: 100,
    maxMP: 50,
    attack: 25,
    defense: 20,
    speed: 15,
    movement: 3,
  },
  currentHP: 80,
  currentMP: 30,
  faction: 'player',
  hasActed: false,
  hasMoved: false,
  ...overrides,
});

const createTestGameState = (overrides: Partial<GameState> = {}): GameState => ({
  currentTurn: 1,
  activePlayer: 'player',
  phase: 'select',
  selectedUnit: undefined,
  gameResult: null,
  turnOrder: [],
  activeUnitIndex: 0,
  ...overrides,
});

describe('UIManager', () => {
  let uiManager: UIManager;

  beforeEach(() => {
    jest.clearAllMocks();
    uiManager = new UIManager(mockScene as any);
  });

  describe('createUI', () => {
    it('should create all UI elements', () => {
      uiManager.createUI();

      // Verify text elements were created
      expect(mockScene.add.text).toHaveBeenCalledWith(20, 20, 'Turn: 1', expect.any(Object));
      expect(mockScene.add.text).toHaveBeenCalledWith(20, 55, 'Player Turn', expect.any(Object));

      // Verify containers were created (character info panel, action menu, and pause button)
      expect(mockScene.add.container).toHaveBeenCalledTimes(3);

      // Verify graphics were created
      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    it('should set proper scroll factors and depths', () => {
      uiManager.createUI();

      // All UI elements should have scroll factor 0 (fixed to camera)
      expect(mockText.setScrollFactor).toHaveBeenCalledWith(0);
      expect(mockContainer.setScrollFactor).toHaveBeenCalledWith(0);
    });

    it('should initially hide character info and action menu', () => {
      uiManager.createUI();

      expect(uiManager.isCharacterInfoPanelVisible()).toBe(false);
      expect(uiManager.isActionMenuVisible()).toBe(false);
    });
  });

  describe('updateTurnDisplay', () => {
    beforeEach(() => {
      uiManager.createUI();
    });

    it('should update turn number display', () => {
      uiManager.updateTurnDisplay(5, 'player');

      expect(mockText.setText).toHaveBeenCalledWith('Turn: 5');
    });

    it('should update player turn display with correct text and color', () => {
      uiManager.updateTurnDisplay(1, 'player');

      expect(mockText.setText).toHaveBeenCalledWith('Player Turn');
      expect(mockText.setColor).toHaveBeenCalledWith('#00ff00');
    });

    it('should update enemy turn display with correct text and color', () => {
      uiManager.updateTurnDisplay(1, 'enemy');

      expect(mockText.setText).toHaveBeenCalledWith('Enemy Turn');
      expect(mockText.setColor).toHaveBeenCalledWith('#ff6666');
    });
  });

  describe('showCharacterInfo', () => {
    beforeEach(() => {
      uiManager.createUI();
    });

    it('should display character information correctly', () => {
      const testUnit = createTestUnit();
      uiManager.showCharacterInfo(testUnit);

      expect(mockText.setText).toHaveBeenCalledWith('Test Hero');
      expect(mockText.setText).toHaveBeenCalledWith('HP: 80/100 (80%)');
      expect(mockText.setText).toHaveBeenCalledWith('MP: 30/50 (60%)');
      expect(mockText.setText).toHaveBeenCalledWith('ATK: 25  DEF: 20  SPD: 15  MOV: 3');
    });

    it('should make character info panel visible', () => {
      const testUnit = createTestUnit();
      uiManager.showCharacterInfo(testUnit);

      expect(mockContainer.setVisible).toHaveBeenCalledWith(true);
      expect(uiManager.isCharacterInfoPanelVisible()).toBe(true);
    });

    it('should handle units with full HP and MP', () => {
      const testUnit = createTestUnit({
        currentHP: 100,
        currentMP: 50,
      });
      uiManager.showCharacterInfo(testUnit);

      expect(mockText.setText).toHaveBeenCalledWith('HP: 100/100 (100%)');
      expect(mockText.setText).toHaveBeenCalledWith('MP: 50/50 (100%)');
    });

    it('should handle units with zero HP and MP', () => {
      const testUnit = createTestUnit({
        currentHP: 0,
        currentMP: 0,
      });
      uiManager.showCharacterInfo(testUnit);

      expect(mockText.setText).toHaveBeenCalledWith('HP: 0/100 (0%)');
      expect(mockText.setText).toHaveBeenCalledWith('MP: 0/50 (0%)');
    });
  });

  describe('hideCharacterInfo', () => {
    beforeEach(() => {
      uiManager.createUI();
    });

    it('should hide character info panel', () => {
      // First show it
      const testUnit = createTestUnit();
      uiManager.showCharacterInfo(testUnit);
      expect(uiManager.isCharacterInfoPanelVisible()).toBe(true);

      // Then hide it
      uiManager.hideCharacterInfo();

      expect(mockContainer.setVisible).toHaveBeenCalledWith(false);
      expect(uiManager.isCharacterInfoPanelVisible()).toBe(false);
    });

    it('should handle hiding when panel is already hidden', () => {
      uiManager.hideCharacterInfo();

      expect(uiManager.isCharacterInfoPanelVisible()).toBe(false);
    });
  });

  describe('showActionMenu', () => {
    beforeEach(() => {
      uiManager.createUI();
    });

    it('should display action menu with provided actions', () => {
      const actions: ActionMenuItem[] = [
        { text: 'Move', action: 'move', enabled: true },
        { text: 'Attack', action: 'attack', enabled: true },
        { text: 'Wait', action: 'wait', enabled: false },
      ];

      uiManager.showActionMenu(actions);

      expect(mockScene.add.text).toHaveBeenCalledWith(15, 20, 'Move', expect.any(Object));
      expect(mockScene.add.text).toHaveBeenCalledWith(15, 50, 'Attack', expect.any(Object));
      expect(mockScene.add.text).toHaveBeenCalledWith(15, 80, 'Wait', expect.any(Object));
    });

    it('should make action menu visible', () => {
      const actions: ActionMenuItem[] = [{ text: 'Move', action: 'move', enabled: true }];

      uiManager.showActionMenu(actions);

      expect(mockContainer.setVisible).toHaveBeenCalledWith(true);
      expect(uiManager.isActionMenuVisible()).toBe(true);
    });

    it('should handle enabled and disabled actions differently', () => {
      const actions: ActionMenuItem[] = [
        { text: 'Move', action: 'move', enabled: true },
        { text: 'Attack', action: 'attack', enabled: false },
      ];

      uiManager.showActionMenu(actions);

      // Enabled actions should be interactive
      expect(mockText.setInteractive).toHaveBeenCalled();
    });

    it('should emit action-selected event when action is clicked', () => {
      const actions: ActionMenuItem[] = [{ text: 'Move', action: 'move', enabled: true }];

      uiManager.showActionMenu(actions);

      // Simulate clicking on the action
      const onPointerDown = mockText.on.mock.calls.find(call => call[0] === 'pointerdown');
      if (onPointerDown) {
        onPointerDown[1](); // Call the callback
      }

      expect(mockScene.events.emit).toHaveBeenCalledWith('action-selected', 'move');
    });

    it('should clear existing action buttons before showing new ones', () => {
      const actions1: ActionMenuItem[] = [{ text: 'Move', action: 'move', enabled: true }];
      const actions2: ActionMenuItem[] = [
        { text: 'Attack', action: 'attack', enabled: true },
        { text: 'Wait', action: 'wait', enabled: true },
      ];

      uiManager.showActionMenu(actions1);
      uiManager.showActionMenu(actions2);

      // Should destroy previous buttons
      expect(mockText.destroy).toHaveBeenCalled();
    });
  });

  describe('hideActionMenu', () => {
    beforeEach(() => {
      uiManager.createUI();
    });

    it('should hide action menu', () => {
      // First show it
      const actions: ActionMenuItem[] = [{ text: 'Move', action: 'move', enabled: true }];
      uiManager.showActionMenu(actions);
      expect(uiManager.isActionMenuVisible()).toBe(true);

      // Then hide it
      uiManager.hideActionMenu();

      expect(mockContainer.setVisible).toHaveBeenCalledWith(false);
      expect(uiManager.isActionMenuVisible()).toBe(false);
    });
  });

  describe('updateUI', () => {
    beforeEach(() => {
      uiManager.createUI();
    });

    it('should update turn display based on game state', () => {
      const gameState = createTestGameState({
        currentTurn: 3,
        activePlayer: 'enemy',
      });

      uiManager.updateUI(gameState);

      expect(mockText.setText).toHaveBeenCalledWith('Turn: 3');
      expect(mockText.setText).toHaveBeenCalledWith('Enemy Turn');
      expect(mockText.setColor).toHaveBeenCalledWith('#ff6666');
    });

    it('should show character info when unit is selected', () => {
      const testUnit = createTestUnit();
      const gameState = createTestGameState({
        selectedUnit: testUnit,
      });

      uiManager.updateUI(gameState);

      expect(mockContainer.setVisible).toHaveBeenCalledWith(true);
      expect(uiManager.isCharacterInfoPanelVisible()).toBe(true);
    });

    it('should hide character info when no unit is selected', () => {
      const gameState = createTestGameState({
        selectedUnit: undefined,
      });

      uiManager.updateUI(gameState);

      expect(mockContainer.setVisible).toHaveBeenCalledWith(false);
      expect(uiManager.isCharacterInfoPanelVisible()).toBe(false);
    });

    it('should hide action menu during enemy turns', () => {
      // First show action menu during player turn
      const actions: ActionMenuItem[] = [{ text: 'Move', action: 'move', enabled: true }];
      uiManager.showActionMenu(actions);
      expect(uiManager.isActionMenuVisible()).toBe(true);

      // Then switch to enemy turn
      const gameState = createTestGameState({
        activePlayer: 'enemy',
      });

      uiManager.updateUI(gameState);

      expect(mockContainer.setVisible).toHaveBeenCalledWith(false);
      expect(uiManager.isActionMenuVisible()).toBe(false);
    });
  });

  describe('resize', () => {
    beforeEach(() => {
      uiManager.createUI();
    });

    it('should update UI element positions when screen size changes', () => {
      const newWidth = 1920;
      const newHeight = 1080;

      uiManager.resize(newWidth, newHeight);

      expect(mockContainer.setPosition).toHaveBeenCalledWith(newWidth - 80, 20); // pause button
      expect(mockContainer.setPosition).toHaveBeenCalledWith(newWidth - 320, 20); // character info
      expect(mockContainer.setPosition).toHaveBeenCalledWith(newWidth / 2 - 100, newHeight - 170); // action menu
    });
  });

  describe('destroy', () => {
    beforeEach(() => {
      uiManager.createUI();
    });

    it('should destroy all UI elements and clean up state', () => {
      uiManager.destroy();

      expect(mockText.destroy).toHaveBeenCalled();
      expect(mockContainer.destroy).toHaveBeenCalled();
      expect(mockGraphics.destroy).toHaveBeenCalled();

      expect(uiManager.isCharacterInfoPanelVisible()).toBe(false);
      expect(uiManager.isActionMenuVisible()).toBe(false);
    });

    it('should handle destroying when elements are undefined', () => {
      const emptyUIManager = new UIManager(mockScene as any);

      expect(() => emptyUIManager.destroy()).not.toThrow();
    });
  });

  describe('pause button functionality', () => {
    beforeEach(() => {
      uiManager.createUI();
    });

    it('should emit pause-requested event when pause button is clicked', () => {
      // Find the pause button interaction setup
      const onPointerDown = mockContainer.on.mock.calls.find(call => call[0] === 'pointerdown');
      if (onPointerDown) {
        onPointerDown[1](); // Call the callback
      }

      expect(mockScene.events.emit).toHaveBeenCalledWith('pause-requested');
    });

    it('should handle pause button hover effects', () => {
      // Find the hover callbacks
      const onPointerOver = mockContainer.on.mock.calls.find(call => call[0] === 'pointerover');
      const onPointerOut = mockContainer.on.mock.calls.find(call => call[0] === 'pointerout');

      if (onPointerOver) {
        onPointerOver[1](); // Call the hover callback
      }

      if (onPointerOut) {
        onPointerOut[1](); // Call the unhover callback
      }

      // Graphics should be cleared and redrawn for hover effects
      expect(mockGraphics.clear).toHaveBeenCalled();
      expect(mockGraphics.fillStyle).toHaveBeenCalled();
    });
  });

  describe('getUIElements', () => {
    beforeEach(() => {
      uiManager.createUI();
    });

    it('should return copy of UI elements for testing', () => {
      const elements = uiManager.getUIElements();

      expect(elements).toBeDefined();
      expect(elements.turnDisplay).toBeDefined();
      expect(elements.playerDisplay).toBeDefined();
      expect(elements.characterInfoPanel).toBeDefined();
      expect(elements.actionMenu).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle showCharacterInfo when panel is not created', () => {
      const testUnit = createTestUnit();

      expect(() => uiManager.showCharacterInfo(testUnit)).not.toThrow();
    });

    it('should handle showActionMenu when menu is not created', () => {
      const actions: ActionMenuItem[] = [{ text: 'Move', action: 'move', enabled: true }];

      expect(() => uiManager.showActionMenu(actions)).not.toThrow();
    });

    it('should handle empty action menu', () => {
      uiManager.createUI();
      const actions: ActionMenuItem[] = [];

      expect(() => uiManager.showActionMenu(actions)).not.toThrow();
      expect(uiManager.isActionMenuVisible()).toBe(true);
    });

    it('should handle character with zero max stats', () => {
      uiManager.createUI();
      const testUnit = createTestUnit({
        stats: {
          maxHP: 1,
          maxMP: 1,
          attack: 0,
          defense: 0,
          speed: 1,
          movement: 1,
        },
        currentHP: 0,
        currentMP: 0,
      });

      expect(() => uiManager.showCharacterInfo(testUnit)).not.toThrow();
      expect(mockText.setText).toHaveBeenCalledWith('HP: 0/1 (0%)');
      expect(mockText.setText).toHaveBeenCalledWith('MP: 0/1 (0%)');
    });
  });
});
