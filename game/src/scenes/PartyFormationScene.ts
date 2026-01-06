import * as Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { NavigableMenuButton } from '../ui/NavigableMenuButton';
import { KeyboardNavigationManager } from '../utils/KeyboardNavigationManager';
import { SceneTransition, TransitionType, SceneData } from '../utils/SceneTransition';
import { PartyManager } from '../systems/chapter/PartyManager';
import { ChapterManager } from '../systems/chapter/ChapterManager';
import { PartyValidationError } from '../types/chapter';

/**
 * PartyFormationScene class
 * パーティ編成画面を実装
 * 要件7.1, 7.2, 7.3, 7.4, 7.5, 7.6を実装
 */
export class PartyFormationScene extends Phaser.Scene {
    // Private properties
    private backgroundGraphics?: Phaser.GameObjects.Graphics;
    private titleText?: Phaser.GameObjects.Text;
    private partyManager?: PartyManager;
    private chapterManager?: ChapterManager;
    private keyboardNavigation?: KeyboardNavigationManager;
    
    // UI containers
    private partySlotContainer?: Phaser.GameObjects.Container;
    private availableCharactersContainer?: Phaser.GameObjects.Container;
    private lostCharactersContainer?: Phaser.GameObjects.Container;
    private characterDetailPanel?: Phaser.GameObjects.Container;
    
    // Buttons
    private confirmButton?: NavigableMenuButton;
    private backButton?: NavigableMenuButton;
    
    // Character data
    private allCharacters: Map<string, CharacterData> = new Map();
    
    // Layout configuration
    private static readonly LAYOUT = {
        partySlots: {
            startX: 100,
            startY: 200,
            slotWidth: 150,
            slotHeight: 180,
            spacing: 20,
            columns: 3,
        },
        characterList: {
            x: 100,
            y: 600,
            itemWidth: 140,
            itemHeight: 60,
            spacing: 10,
        },
        detailPanel: {
            x: 1100,
            y: 200,
            width: 350,
            height: 600,
        },
    };

    constructor() {
        super({ key: 'PartyFormationScene' });
    }

    public preload(): void {
        console.log('PartyFormationScene: preload phase');
        // Load character data
        this.load.json('charactersData', 'data/characters.json');
    }

    public create(data?: SceneData): void {
        console.log('PartyFormationScene: create phase', data);
        
        // Initialize managers
        this.partyManager = new PartyManager();
        this.chapterManager = new ChapterManager();
        
        // Create entrance transition
        SceneTransition.createEntranceTransition(this, TransitionType.SLIDE_LEFT, 300);
        
        // Setup scene
        this.setupBackground();
        this.createTitle();
        this.loadCharacterData();
        this.createPartySlots();
        this.createAvailableCharactersList();
        this.createLostCharactersList();
        this.createCharacterDetailPanel();
        this.createButtons();
        this.setupKeyboardNavigation();
        
        console.log('PartyFormationScene: initialization completed');
    }

    /**
     * Setup background
     */
    private setupBackground(): void {
        this.backgroundGraphics = this.add.graphics();
        
        // Gradient background
        const topColor = 0x1a252f;
        const bottomColor = 0x2c3e50;
        
        this.backgroundGraphics.fillGradientStyle(
            topColor, topColor,
            bottomColor, bottomColor,
            1
        );
        this.backgroundGraphics.fillRect(0, 0, GameConfig.GAME_WIDTH, GameConfig.GAME_HEIGHT);
        this.backgroundGraphics.setDepth(-10);
    }

    /**
     * Create title
     */
    private createTitle(): void {
        const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontSize: '48px',
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#2c3e50',
            strokeThickness: 4,
        };
        
        this.titleText = this.add.text(
            GameConfig.GAME_WIDTH / 2,
            80,
            'パーティ編成',
            titleStyle
        );
        this.titleText.setOrigin(0.5, 0.5);
    }

    /**
     * Load character data from JSON
     */
    private loadCharacterData(): void {
        try {
            const jsonData = this.cache.json.get('charactersData');
            if (jsonData && jsonData.characters) {
                jsonData.characters.forEach((char: any) => {
                    this.allCharacters.set(char.id, char);
                });
                console.log(`Loaded ${this.allCharacters.size} characters`);
            }
        } catch (error) {
            console.error('Error loading character data:', error);
        }
    }

    /**
     * Create party slots (最大6枠)
     * 要件7.1: パーティ枠の表示
     */
    private createPartySlots(): void {
        this.partySlotContainer = this.add.container(0, 0);
        
        const { startX, startY, slotWidth, slotHeight, spacing, columns } = 
            PartyFormationScene.LAYOUT.partySlots;
        
        for (let i = 0; i < 6; i++) {
            const row = Math.floor(i / columns);
            const col = i % columns;
            const x = startX + col * (slotWidth + spacing);
            const y = startY + row * (slotHeight + spacing);
            
            const slot = this.createPartySlot(x, y, slotWidth, slotHeight, i);
            this.partySlotContainer.add(slot);
        }
    }

    /**
     * Create individual party slot
     * 要件7.3: ドラッグ&ドロップ操作対応
     */
    private createPartySlot(
        x: number, 
        y: number, 
        width: number, 
        height: number, 
        index: number
    ): Phaser.GameObjects.Container {
        const slotContainer = this.add.container(x, y);
        
        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x34495e, 0.8);
        bg.fillRoundedRect(0, 0, width, height, 8);
        bg.lineStyle(2, 0x7f8c8d, 1);
        bg.strokeRoundedRect(0, 0, width, height, 8);
        
        // Slot number
        const slotNumber = this.add.text(
            width / 2,
            20,
            `スロット ${index + 1}`,
            {
                fontSize: '16px',
                color: '#95a5a6',
                fontFamily: 'Arial',
            }
        ).setOrigin(0.5, 0);
        
        // Empty slot text
        const emptyText = this.add.text(
            width / 2,
            height / 2,
            '空き',
            {
                fontSize: '20px',
                color: '#7f8c8d',
                fontFamily: 'Arial',
            }
        ).setOrigin(0.5, 0.5);
        
        // Remove button (initially hidden)
        const removeButton = this.add.text(
            width - 10,
            10,
            '×',
            {
                fontSize: '24px',
                color: '#e74c3c',
                fontFamily: 'Arial',
                fontStyle: 'bold',
            }
        ).setOrigin(1, 0).setVisible(false);
        
        removeButton.setInteractive();
        removeButton.on('pointerdown', () => {
            this.handleCharacterRemove(index);
        });
        
        slotContainer.add([bg, slotNumber, emptyText, removeButton]);
        slotContainer.setData('slotIndex', index);
        slotContainer.setData('emptyText', emptyText);
        slotContainer.setData('removeButton', removeButton);
        slotContainer.setData('characterId', null);
        slotContainer.setData('bg', bg);
        
        // Make interactive for drag & drop
        const hitArea = new Phaser.Geom.Rectangle(0, 0, width, height);
        slotContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
        
        // Note: Drop zone will be set up in setupDragAndDrop method
        
        slotContainer.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(0x3498db, 0.3);
            bg.fillRoundedRect(0, 0, width, height, 8);
            bg.lineStyle(2, 0x3498db, 1);
            bg.strokeRoundedRect(0, 0, width, height, 8);
        });
        
        slotContainer.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0x34495e, 0.8);
            bg.fillRoundedRect(0, 0, width, height, 8);
            bg.lineStyle(2, 0x7f8c8d, 1);
            bg.strokeRoundedRect(0, 0, width, height, 8);
        });
        
        // Right-click to remove character
        slotContainer.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.rightButtonDown()) {
                this.handleCharacterRemove(index);
            }
        });
        
        return slotContainer;
    }

    /**
     * Create available characters list
     * 要件7.1: 利用可能なキャラクターリストの表示
     */
    private createAvailableCharactersList(): void {
        this.availableCharactersContainer = this.add.container(0, 0);
        
        // Title
        const titleText = this.add.text(
            PartyFormationScene.LAYOUT.characterList.x,
            PartyFormationScene.LAYOUT.characterList.y - 40,
            '利用可能なキャラクター',
            {
                fontSize: '24px',
                color: '#2ecc71',
                fontFamily: 'Arial',
                fontStyle: 'bold',
            }
        );
        
        this.availableCharactersContainer.add(titleText);
        
        // Get available characters
        const availableCharacters = this.getAvailableCharacters();
        
        availableCharacters.forEach((char, index) => {
            const item = this.createCharacterListItem(
                char,
                PartyFormationScene.LAYOUT.characterList.x,
                PartyFormationScene.LAYOUT.characterList.y + 
                    index * (PartyFormationScene.LAYOUT.characterList.itemHeight + 
                    PartyFormationScene.LAYOUT.characterList.spacing),
                false
            );
            this.availableCharactersContainer!.add(item);
        });
    }

    /**
     * Create lost characters list
     * 要件7.1: ロストキャラクターリストの表示
     */
    private createLostCharactersList(): void {
        this.lostCharactersContainer = this.add.container(0, 0);
        
        // Title
        const titleText = this.add.text(
            PartyFormationScene.LAYOUT.characterList.x + 600,
            PartyFormationScene.LAYOUT.characterList.y - 40,
            'ロストキャラクター',
            {
                fontSize: '24px',
                color: '#e74c3c',
                fontFamily: 'Arial',
                fontStyle: 'bold',
            }
        );
        
        this.lostCharactersContainer.add(titleText);
        
        // Get lost characters
        const lostCharacters = this.getLostCharacters();
        
        lostCharacters.forEach((char, index) => {
            const item = this.createCharacterListItem(
                char,
                PartyFormationScene.LAYOUT.characterList.x + 600,
                PartyFormationScene.LAYOUT.characterList.y + 
                    index * (PartyFormationScene.LAYOUT.characterList.itemHeight + 
                    PartyFormationScene.LAYOUT.characterList.spacing),
                true
            );
            this.lostCharactersContainer!.add(item);
        });
    }

    /**
     * Create character list item
     * 要件7.3: ドラッグ&ドロップ操作対応
     */
    private createCharacterListItem(
        character: CharacterData,
        x: number,
        y: number,
        isLost: boolean
    ): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);
        const width = PartyFormationScene.LAYOUT.characterList.itemWidth;
        const height = PartyFormationScene.LAYOUT.characterList.itemHeight;
        
        // Background
        const bg = this.add.graphics();
        const bgColor = isLost ? 0x7f8c8d : 0x2c3e50;
        bg.fillStyle(bgColor, 0.9);
        bg.fillRoundedRect(0, 0, width, height, 5);
        bg.lineStyle(2, isLost ? 0xe74c3c : 0x3498db, 1);
        bg.strokeRoundedRect(0, 0, width, height, 5);
        
        // Character name
        const nameText = this.add.text(
            width / 2,
            15,
            character.name,
            {
                fontSize: '16px',
                color: isLost ? '#95a5a6' : '#ffffff',
                fontFamily: 'Arial',
                fontStyle: 'bold',
            }
        ).setOrigin(0.5, 0);
        
        // Level and job
        const infoText = this.add.text(
            width / 2,
            35,
            `Lv.${character.level} ${character.jobClass}`,
            {
                fontSize: '12px',
                color: isLost ? '#7f8c8d' : '#ecf0f1',
                fontFamily: 'Arial',
            }
        ).setOrigin(0.5, 0);
        
        container.add([bg, nameText, infoText]);
        container.setData('characterId', character.id);
        container.setData('isLost', isLost);
        container.setData('bg', bg);
        container.setData('bgColor', bgColor);
        
        if (!isLost) {
            // Make interactive for selection and drag
            const hitArea = new Phaser.Geom.Rectangle(0, 0, width, height);
            container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
            
            // Enable dragging
            this.input.setDraggable(container);
            
            container.on('pointerover', () => {
                bg.clear();
                bg.fillStyle(0x3498db, 0.5);
                bg.fillRoundedRect(0, 0, width, height, 5);
                bg.lineStyle(2, 0x3498db, 1);
                bg.strokeRoundedRect(0, 0, width, height, 5);
                
                this.showCharacterDetail(character);
            });
            
            container.on('pointerout', () => {
                bg.clear();
                bg.fillStyle(bgColor, 0.9);
                bg.fillRoundedRect(0, 0, width, height, 5);
                bg.lineStyle(2, 0x3498db, 1);
                bg.strokeRoundedRect(0, 0, width, height, 5);
            });
            
            container.on('pointerdown', () => {
                this.handleCharacterSelect(character.id);
            });
            
            // Drag events
            container.on('dragstart', () => {
                container.setAlpha(0.5);
            });
            
            container.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                container.setPosition(dragX, dragY);
            });
            
            container.on('dragend', () => {
                container.setAlpha(1);
                // Reset position if not dropped on valid target
                container.setPosition(x, y);
            });
        } else {
            // Show locked state for lost characters
            const hitArea = new Phaser.Geom.Rectangle(0, 0, width, height);
            container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
            
            container.on('pointerover', () => {
                this.showLostCharacterMessage(character);
            });
        }
        
        return container;
    }

    /**
     * Create character detail panel
     * 要件7.2: キャラクター詳細情報の表示
     */
    private createCharacterDetailPanel(): void {
        const { x, y, width, height } = PartyFormationScene.LAYOUT.detailPanel;
        
        this.characterDetailPanel = this.add.container(x, y);
        this.characterDetailPanel.setVisible(false);
        
        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x2c3e50, 0.95);
        bg.fillRoundedRect(0, 0, width, height, 10);
        bg.lineStyle(3, 0x3498db, 1);
        bg.strokeRoundedRect(0, 0, width, height, 10);
        
        // Title
        const titleText = this.add.text(
            width / 2,
            20,
            'キャラクター詳細',
            {
                fontSize: '24px',
                color: '#ffffff',
                fontFamily: 'Arial',
                fontStyle: 'bold',
            }
        ).setOrigin(0.5, 0);
        
        // Detail text placeholders
        const nameText = this.add.text(20, 70, '', {
            fontSize: '20px',
            color: '#ecf0f1',
            fontFamily: 'Arial',
            fontStyle: 'bold',
        });
        
        const levelJobText = this.add.text(20, 100, '', {
            fontSize: '16px',
            color: '#3498db',
            fontFamily: 'Arial',
        });
        
        const descText = this.add.text(20, 130, '', {
            fontSize: '14px',
            color: '#bdc3c7',
            fontFamily: 'Arial',
            wordWrap: { width: width - 40 },
        });
        
        const statsTitle = this.add.text(20, 200, 'ステータス:', {
            fontSize: '18px',
            color: '#f39c12',
            fontFamily: 'Arial',
            fontStyle: 'bold',
        });
        
        const statsText = this.add.text(20, 230, '', {
            fontSize: '14px',
            color: '#ecf0f1',
            fontFamily: 'Arial',
            lineSpacing: 5,
        });
        
        const skillsTitle = this.add.text(20, 380, 'スキル:', {
            fontSize: '18px',
            color: '#9b59b6',
            fontFamily: 'Arial',
            fontStyle: 'bold',
        });
        
        const skillsText = this.add.text(20, 410, '', {
            fontSize: '14px',
            color: '#ecf0f1',
            fontFamily: 'Arial',
            wordWrap: { width: width - 40 },
        });
        
        this.characterDetailPanel.add([
            bg,
            titleText,
            nameText,
            levelJobText,
            descText,
            statsTitle,
            statsText,
            skillsTitle,
            skillsText,
        ]);
        
        // Store references
        this.characterDetailPanel.setData('nameText', nameText);
        this.characterDetailPanel.setData('levelJobText', levelJobText);
        this.characterDetailPanel.setData('descText', descText);
        this.characterDetailPanel.setData('statsText', statsText);
        this.characterDetailPanel.setData('skillsText', skillsText);
    }

    /**
     * Create buttons
     */
    private createButtons(): void {
        // Confirm button
        this.confirmButton = new NavigableMenuButton(
            this,
            GameConfig.GAME_WIDTH / 2 - 120,
            GameConfig.GAME_HEIGHT - 80,
            '編成確定',
            () => this.handleConfirm(),
            200,
            50,
            'confirm-party-button'
        );
        
        // Back button
        this.backButton = new NavigableMenuButton(
            this,
            GameConfig.GAME_WIDTH / 2 + 120,
            GameConfig.GAME_HEIGHT - 80,
            '戻る',
            () => this.handleBack(),
            200,
            50,
            'back-button'
        );
    }

    /**
     * Setup keyboard navigation
     */
    private setupKeyboardNavigation(): void {
        this.keyboardNavigation = new KeyboardNavigationManager(this);
        
        if (this.confirmButton) {
            this.keyboardNavigation.addElement(this.confirmButton);
        }
        if (this.backButton) {
            this.keyboardNavigation.addElement(this.backButton);
        }
        
        // Setup drag & drop handlers
        this.setupDragAndDrop();
    }
    
    /**
     * Setup drag and drop handlers
     * 要件7.3: ドラッグ&ドロップ操作
     */
    private setupDragAndDrop(): void {
        // Setup drop zones for party slots
        if (this.partySlotContainer) {
            const slots = this.partySlotContainer.list as Phaser.GameObjects.Container[];
            slots.forEach(slot => {
                // Enable drop zone on the slot
                this.input.setDraggable(slot, false);
                (slot as any).input.dropZone = true;
            });
        }
        
        // Handle drop on party slots
        this.input.on('drop', (
            _pointer: Phaser.Input.Pointer,
            gameObject: Phaser.GameObjects.Container,
            dropZone: Phaser.GameObjects.Container
        ) => {
            const characterId = gameObject.getData('characterId') as string;
            const slotIndex = dropZone.getData('slotIndex') as number;
            
            if (characterId && slotIndex !== undefined) {
                this.handleCharacterDropOnSlot(characterId, slotIndex);
            }
        });
        
        // Handle drag over
        this.input.on('dragenter', (
            _pointer: Phaser.Input.Pointer,
            _gameObject: Phaser.GameObjects.Container,
            dropZone: Phaser.GameObjects.Container
        ) => {
            const bg = dropZone.getData('bg') as Phaser.GameObjects.Graphics;
            if (bg) {
                const width = PartyFormationScene.LAYOUT.partySlots.slotWidth;
                const height = PartyFormationScene.LAYOUT.partySlots.slotHeight;
                bg.clear();
                bg.fillStyle(0x2ecc71, 0.5);
                bg.fillRoundedRect(0, 0, width, height, 8);
                bg.lineStyle(3, 0x2ecc71, 1);
                bg.strokeRoundedRect(0, 0, width, height, 8);
            }
        });
        
        // Handle drag leave
        this.input.on('dragleave', (
            _pointer: Phaser.Input.Pointer,
            _gameObject: Phaser.GameObjects.Container,
            dropZone: Phaser.GameObjects.Container
        ) => {
            const bg = dropZone.getData('bg') as Phaser.GameObjects.Graphics;
            if (bg) {
                const width = PartyFormationScene.LAYOUT.partySlots.slotWidth;
                const height = PartyFormationScene.LAYOUT.partySlots.slotHeight;
                bg.clear();
                bg.fillStyle(0x34495e, 0.8);
                bg.fillRoundedRect(0, 0, width, height, 8);
                bg.lineStyle(2, 0x7f8c8d, 1);
                bg.strokeRoundedRect(0, 0, width, height, 8);
            }
        });
    }
    
    /**
     * Handle character drop on slot
     * 要件7.3: ドラッグ&ドロップによるキャラクター追加
     */
    private handleCharacterDropOnSlot(characterId: string, slotIndex: number): void {
        if (!this.partyManager) return;
        
        console.log(`Dropping character ${characterId} on slot ${slotIndex}`);
        
        // Get current party
        const party = this.partyManager.getParty();
        
        // Check if slot is empty
        if (party.members[slotIndex]) {
            // Slot is occupied, try to swap
            const existingCharId = party.members[slotIndex];
            this.partyManager.removeCharacter(existingCharId);
        }
        
        // Try to add character
        const result = this.partyManager.addCharacter(characterId);
        
        if (result) {
            console.log('Character added via drag & drop');
            this.updatePartyDisplay();
        } else {
            // Show error
            const validation = this.partyManager.validateParty(
                this.chapterManager?.getLostCharacters() || []
            );
            
            if (!validation.isValid && validation.errors.length > 0) {
                this.showErrorMessage(validation.errors[0]);
            }
        }
    }
    
    /**
     * Handle character removal
     * 要件7.3: キャラクターの除外
     */
    private handleCharacterRemove(slotIndex: number): void {
        if (!this.partyManager || !this.partySlotContainer) return;
        
        const party = this.partyManager.getParty();
        const characterId = party.members[slotIndex];
        
        if (characterId) {
            console.log(`Removing character ${characterId} from slot ${slotIndex}`);
            this.partyManager.removeCharacter(characterId);
            this.updatePartyDisplay();
        }
    }

    /**
     * Get available characters
     */
    private getAvailableCharacters(): CharacterData[] {
        const lostIds = this.chapterManager?.getLostCharacters() || [];
        return Array.from(this.allCharacters.values()).filter(
            char => char.faction === 'player' && !lostIds.includes(char.id)
        );
    }

    /**
     * Get lost characters
     */
    private getLostCharacters(): CharacterData[] {
        const lostIds = this.chapterManager?.getLostCharacters() || [];
        return Array.from(this.allCharacters.values()).filter(
            char => lostIds.includes(char.id)
        );
    }

    /**
     * Show character detail
     * 要件7.2: キャラクター詳細情報の表示
     */
    private showCharacterDetail(character: CharacterData): void {
        if (!this.characterDetailPanel) return;
        
        const nameText = this.characterDetailPanel.getData('nameText') as Phaser.GameObjects.Text;
        const levelJobText = this.characterDetailPanel.getData('levelJobText') as Phaser.GameObjects.Text;
        const descText = this.characterDetailPanel.getData('descText') as Phaser.GameObjects.Text;
        const statsText = this.characterDetailPanel.getData('statsText') as Phaser.GameObjects.Text;
        const skillsText = this.characterDetailPanel.getData('skillsText') as Phaser.GameObjects.Text;
        
        if (nameText) nameText.setText(character.name);
        if (levelJobText) levelJobText.setText(`Lv.${character.level} - ${character.jobClass}`);
        if (descText) descText.setText(character.description);
        
        if (statsText && character.baseStats) {
            const stats = character.baseStats;
            statsText.setText(
                `HP: ${stats.maxHP}\n` +
                `MP: ${stats.maxMP}\n` +
                `攻撃: ${stats.attack}\n` +
                `防御: ${stats.defense}\n` +
                `速度: ${stats.speed}\n` +
                `移動: ${stats.movement}`
            );
        }
        
        if (skillsText) {
            skillsText.setText('(スキル情報は今後実装予定)');
        }
        
        this.characterDetailPanel.setVisible(true);
    }

    /**
     * Handle character selection
     * 要件7.3: キャラクターの追加
     */
    private handleCharacterSelect(characterId: string): void {
        console.log(`Character selected: ${characterId}`);
        
        if (!this.partyManager) return;
        
        // Try to add character to party
        const result = this.partyManager.addCharacter(characterId);
        
        if (result) {
            console.log('Character added to party successfully');
            this.updatePartyDisplay();
        } else {
            // Show error message
            const validation = this.partyManager.validateParty(
                this.chapterManager?.getLostCharacters() || []
            );
            
            if (!validation.isValid && validation.errors.length > 0) {
                this.showErrorMessage(validation.errors[0]);
            }
        }
    }

    /**
     * Update party display
     * 要件7.3: 視覚的フィードバック
     */
    private updatePartyDisplay(): void {
        if (!this.partySlotContainer || !this.partyManager) return;
        
        const party = this.partyManager.getParty();
        const slots = this.partySlotContainer.list as Phaser.GameObjects.Container[];
        
        slots.forEach((slot, index) => {
            const emptyText = slot.getData('emptyText') as Phaser.GameObjects.Text;
            const removeButton = slot.getData('removeButton') as Phaser.GameObjects.Text;
            const characterId = party.members[index];
            
            if (characterId) {
                const character = this.allCharacters.get(characterId);
                if (character && emptyText) {
                    emptyText.setText(character.name);
                    emptyText.setColor('#ffffff');
                    emptyText.setFontSize('16px');
                }
                if (removeButton) {
                    removeButton.setVisible(true);
                }
                slot.setData('characterId', characterId);
            } else {
                if (emptyText) {
                    emptyText.setText('空き');
                    emptyText.setColor('#7f8c8d');
                    emptyText.setFontSize('20px');
                }
                if (removeButton) {
                    removeButton.setVisible(false);
                }
                slot.setData('characterId', null);
            }
        });
    }

    /**
     * Show error message
     * 要件7.4, 7.5: エラー表示と視覚的フィードバック
     */
    private showErrorMessage(error: PartyValidationError): void {
        let message = '';
        let icon = '⚠';
        
        switch (error) {
            case PartyValidationError.PARTY_FULL:
                message = 'パーティが満員です（最大6人）';
                icon = '🚫';
                break;
            case PartyValidationError.CHARACTER_LOST:
                message = 'このキャラクターは章内で使用不可です';
                icon = '💀';
                break;
            case PartyValidationError.CHARACTER_DUPLICATE:
                message = 'このキャラクターは既にパーティに含まれています';
                icon = '⚠';
                break;
            case PartyValidationError.CHARACTER_NOT_AVAILABLE:
                message = 'このキャラクターは利用できません';
                icon = '🔒';
                break;
            default:
                message = 'エラーが発生しました';
                icon = '❌';
        }
        
        this.showMessageOverlay(`${icon} ${message}`, '#e74c3c', true);
    }

    /**
     * Show lost character message
     * 要件7.5: ロストキャラクターエラーの表示
     */
    private showLostCharacterMessage(character: CharacterData): void {
        this.showMessageOverlay(
            `💀 ${character.name}は章内で使用不可です\n\n章をクリアすると復活します`,
            '#e74c3c',
            false
        );
    }

    /**
     * Show message overlay with enhanced visual feedback
     * 要件7.4, 7.5: 視覚的フィードバック
     */
    private showMessageOverlay(message: string, color: string, isError: boolean): void {
        // Create overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, GameConfig.GAME_WIDTH, GameConfig.GAME_HEIGHT);
        overlay.setDepth(1000);
        
        // Create message panel
        const panelWidth = 500;
        const panelHeight = isError ? 200 : 250;
        const panelX = (GameConfig.GAME_WIDTH - panelWidth) / 2;
        const panelY = (GameConfig.GAME_HEIGHT - panelHeight) / 2;
        
        const panel = this.add.graphics();
        panel.fillStyle(0x2c3e50, 1);
        panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 10);
        panel.lineStyle(3, color === '#e74c3c' ? 0xe74c3c : 0xf39c12, 1);
        panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 10);
        panel.setDepth(1001);
        
        // Message text
        const messageText = this.add.text(
            GameConfig.GAME_WIDTH / 2,
            panelY + panelHeight / 2,
            message,
            {
                fontSize: isError ? '20px' : '18px',
                color: color,
                fontFamily: 'Arial',
                fontStyle: 'bold',
                align: 'center',
                wordWrap: { width: panelWidth - 60 },
            }
        ).setOrigin(0.5, 0.5).setDepth(1002);
        
        // Add shake animation for errors
        if (isError) {
            this.tweens.add({
                targets: [panel, messageText],
                x: '+=5',
                duration: 50,
                yoyo: true,
                repeat: 3,
            });
        }
        
        // Auto-hide after delay
        const hideDelay = isError ? 2000 : 3000;
        this.time.delayedCall(hideDelay, () => {
            // Fade out animation
            this.tweens.add({
                targets: [overlay, panel, messageText],
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    overlay.destroy();
                    panel.destroy();
                    messageText.destroy();
                },
            });
        });
    }

    /**
     * Handle confirm
     * 要件7.6: 編成の確定処理
     */
    private handleConfirm(): void {
        if (!this.partyManager) return;
        
        const validation = this.partyManager.validateParty(
            this.chapterManager?.getLostCharacters() || []
        );
        
        if (validation.isValid) {
            console.log('Party formation confirmed');
            // Transition to gameplay scene
            SceneTransition.transitionTo(
                this,
                'GameplayScene',
                TransitionType.FADE,
                {
                    partyComposition: this.partyManager.getParty(),
                    fromScene: 'PartyFormationScene',
                }
            );
        } else {
            if (validation.errors.length > 0) {
                this.showErrorMessage(validation.errors[0]);
            }
        }
    }

    /**
     * Handle back
     */
    private handleBack(): void {
        SceneTransition.transitionTo(
            this,
            'StageSelectScene',
            TransitionType.SLIDE_RIGHT
        );
    }

    public shutdown(): void {
        if (this.keyboardNavigation) {
            this.keyboardNavigation.destroy();
        }
    }
}

/**
 * Character data interface
 */
interface CharacterData {
    id: string;
    name: string;
    description: string;
    faction: string;
    baseStats: {
        maxHP: number;
        maxMP: number;
        attack: number;
        defense: number;
        speed: number;
        movement: number;
    };
    jobClass: string;
    level: number;
    isRecruitable: boolean;
}
