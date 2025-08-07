# Admin Dashboard

A comprehensive data management interface for the Trail of Thorns SRPG game. This React-based application provides tools for creating, editing, and managing game data including characters, items, and stages.

## Features

### Core Functionality

- **Character Management**: Create and edit character data with stats, abilities, and recruitment conditions
- **Item Management**: Design weapons, armor, and consumables with effects and stats
- **Stage Management**: Build game levels with maps, objectives, and enemy placements
- **Data Import/Export**: JSON-based data exchange with validation
- **Real-time Preview**: Live preview of changes as you edit
- **Cross-reference Validation**: Automatic validation of data relationships

### User Experience

- **Responsive Design**: Works on desktop and tablet devices
- **Keyboard Shortcuts**: Efficient navigation and actions
- **Error Handling**: Comprehensive error messages and recovery options
- **Accessibility**: WCAG 2.1 compliant interface
- **Performance Optimized**: Virtual scrolling for large datasets

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn package manager

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd trail-of-thorns/editor
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage Guide

### Character Management

1. **Creating Characters**:
   - Click "Characters" in the sidebar
   - Click "Add Character" button
   - Fill in required fields (name, stats, faction)
   - Configure abilities and recruitment conditions
   - Save the character

2. **Character Properties**:
   - **Basic Info**: Name, description, faction
   - **Stats**: HP, MP, Attack, Defense, Speed, Movement
   - **Abilities**: List of ability IDs the character can use
   - **Sprites**: File paths for idle, move, and attack animations
   - **Recruitment**: Conditions for enemy-to-ally conversion

### Item Management

1. **Creating Items**:
   - Navigate to "Items" section
   - Click "Add Item"
   - Set item type (weapon, armor, consumable)
   - Configure stats and effects
   - Set rarity and value

2. **Item Types**:
   - **Weapons**: Provide attack bonuses and special effects
   - **Armor**: Offer defense and status resistances
   - **Consumables**: Single-use items with immediate effects

### Stage Management

1. **Creating Stages**:
   - Go to "Stages" section
   - Click "Add Stage"
   - Design the map layout using the grid editor
   - Place enemy spawn points and objectives
   - Set victory/defeat conditions

2. **Map Editor**:
   - Click tiles to change terrain type
   - Drag and drop enemy spawn points
   - Configure interactive objects
   - Preview the complete stage

### Data Import/Export

1. **Importing Data**:
   - Click "Import" in the header
   - Select a JSON file with game data
   - Review validation results
   - Confirm import to merge data

2. **Exporting Data**:
   - Click "Export" in the header
   - Choose export format (JSON)
   - Data is validated before export
   - Download the generated file

## Keyboard Shortcuts

| Shortcut | Action               |
| -------- | -------------------- |
| Ctrl+S   | Save current data    |
| Ctrl+I   | Import data          |
| Ctrl+E   | Export data          |
| Ctrl+V   | Validate data        |
| Ctrl+N   | Create new item      |
| Ctrl+F   | Focus search field   |
| Ctrl+Z   | Undo last action     |
| Ctrl+Y   | Redo last action     |
| Delete   | Delete selected item |
| F1       | Show help            |

## Data Structure

### Character Schema

```typescript
interface Character {
  id: string;
  name: string;
  description?: string;
  stats: {
    hp: number;
    mp: number;
    attack: number;
    defense: number;
    speed: number;
    movement: number;
  };
  abilities: string[];
  sprite: {
    idle: string;
    move: string;
    attack: string;
  };
  faction: 'player' | 'enemy' | 'neutral';
  canBeRecruited: boolean;
  recruitmentConditions: RecruitmentCondition[];
  jobId: string;
}
```

### Item Schema

```typescript
interface Item {
  id: string;
  name: string;
  description?: string;
  type: 'weapon' | 'armor' | 'consumable';
  category: string;
  stats: {
    attack: number;
    defense: number;
    speed: number;
    accuracy: number;
  };
  effects: ItemEffect[];
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  value: number;
}
```

### Stage Schema

```typescript
interface Stage {
  id: string;
  name: string;
  description?: string;
  mapData: {
    width: number;
    height: number;
    tiles: Tile[][];
  };
  enemies: EnemySpawn[];
  objectives: Objective[];
  rewards?: {
    experience: number;
    items: ItemReward[];
  };
  difficulty: 'easy' | 'normal' | 'hard' | 'expert';
}
```

## Development

### Project Structure

```
editor/
├── src/
│   ├── components/     # React components
│   ├── hooks/         # Custom React hooks
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Utility functions
│   ├── schemas/       # Zod validation schemas
│   └── __tests__/     # Test files
├── public/            # Static assets
└── dist/             # Built application
```

### Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

Run specific test types:

```bash
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e        # End-to-end tests only
```

### Code Quality

The project uses several tools to maintain code quality:

- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting
- **TypeScript**: Type safety
- **Jest**: Unit and integration testing
- **React Testing Library**: Component testing

Run linting:

```bash
npm run lint
```

Format code:

```bash
npm run format
```

### Performance Optimization

The application includes several performance optimizations:

1. **Virtual Scrolling**: Large lists use react-window for efficient rendering
2. **Memoization**: React.memo and useMemo prevent unnecessary re-renders
3. **Code Splitting**: Dynamic imports for route-based code splitting
4. **Debounced Search**: Search inputs use debouncing to reduce API calls
5. **Optimized Images**: Image assets are optimized for web delivery

## Troubleshooting

### Common Issues

1. **Import Validation Errors**:
   - Check JSON syntax is valid
   - Ensure all required fields are present
   - Verify data types match schema requirements

2. **Performance Issues**:
   - Enable virtual scrolling for large datasets
   - Check browser developer tools for memory leaks
   - Reduce the number of items displayed simultaneously

3. **Cross-reference Errors**:
   - Ensure referenced IDs exist in the dataset
   - Check for circular dependencies
   - Validate foreign key relationships

### Getting Help

1. Check the browser console for error messages
2. Review the validation error display for specific issues
3. Use the built-in help system (F1 key)
4. Check the project's issue tracker for known problems

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run the test suite
5. Submit a pull request

### Development Guidelines

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Use semantic commit messages
- Ensure accessibility compliance

## License

This project is part of the Trail of Thorns game and follows the same license terms.

## Changelog

### Version 1.0.0

- Initial release with character, item, and stage management
- Data import/export functionality
- Real-time validation and preview
- Accessibility compliance
- Performance optimizations
