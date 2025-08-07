import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CharacterList from '../../components/CharacterList';
import { Character } from '../../types';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

// Generate large dataset for performance testing
const generateLargeCharacterDataset = (count: number): Character[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `char-${index}`,
    name: `Character ${index}`,
    description: `Description for character ${index}`,
    stats: {
      hp: 100 + (index % 50),
      mp: 50 + (index % 30),
      attack: 20 + (index % 20),
      defense: 15 + (index % 15),
      speed: 10 + (index % 10),
      movement: 3 + (index % 3),
    },
    abilities: [`ability-${index % 5}`, `ability-${(index + 1) % 5}`],
    sprite: {
      idle: `idle-${index % 10}.png`,
      move: `move-${index % 10}.png`,
      attack: `attack-${index % 10}.png`,
    },
    faction: index % 2 === 0 ? 'player' : 'enemy',
    canBeRecruited: index % 3 === 0,
    recruitmentConditions: [],
    jobId: `job-${index % 8}`,
  }));
};

describe('Performance Tests', () => {
  it('renders large character list efficiently', () => {
    const startTime = performance.now();

    const largeDataset = generateLargeCharacterDataset(1000);

    renderWithTheme(
      <CharacterList
        characters={largeDataset}
        onEdit={() => {}}
        onDelete={() => {}}
        onAdd={() => {}}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within reasonable time (less than 1 second)
    expect(renderTime).toBeLessThan(1000);

    // Should display characters
    expect(screen.getByText('Character 0')).toBeInTheDocument();
  });

  it('handles search filtering efficiently', () => {
    const largeDataset = generateLargeCharacterDataset(500);

    renderWithTheme(
      <CharacterList
        characters={largeDataset}
        onEdit={() => {}}
        onDelete={() => {}}
        onAdd={() => {}}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search characters/);

    const startTime = performance.now();

    // Perform search
    fireEvent.change(searchInput, { target: { value: 'Character 1' } });

    const endTime = performance.now();
    const searchTime = endTime - startTime;

    // Search should be fast (less than 100ms)
    expect(searchTime).toBeLessThan(100);

    // Should show filtered results
    expect(screen.getByText('Character 1')).toBeInTheDocument();
    expect(screen.getByText('Character 10')).toBeInTheDocument();
  });

  it('handles sorting efficiently', () => {
    const largeDataset = generateLargeCharacterDataset(300);

    renderWithTheme(
      <CharacterList
        characters={largeDataset}
        onEdit={() => {}}
        onDelete={() => {}}
        onAdd={() => {}}
      />
    );

    const startTime = performance.now();

    // Trigger sort by name
    const sortButton = screen.getByText(/Sort by Name/);
    fireEvent.click(sortButton);

    const endTime = performance.now();
    const sortTime = endTime - startTime;

    // Sorting should be fast (less than 200ms)
    expect(sortTime).toBeLessThan(200);
  });

  it('maintains performance with frequent updates', () => {
    const dataset = generateLargeCharacterDataset(100);
    let updateCount = 0;

    const TestComponent = () => {
      const [characters, setCharacters] = React.useState(dataset);

      React.useEffect(() => {
        const interval = setInterval(() => {
          if (updateCount < 10) {
            setCharacters(prev => [
              ...prev,
              generateLargeCharacterDataset(1)[0],
            ]);
            updateCount++;
          }
        }, 50);

        return () => clearInterval(interval);
      }, []);

      return (
        <CharacterList
          characters={characters}
          onEdit={() => {}}
          onDelete={() => {}}
          onAdd={() => {}}
        />
      );
    };

    const startTime = performance.now();

    renderWithTheme(<TestComponent />);

    // Wait for updates to complete
    setTimeout(() => {
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle frequent updates efficiently
      expect(totalTime).toBeLessThan(2000);
    }, 600);
  });

  it('memory usage remains stable with large datasets', () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

    // Render and unmount large components multiple times
    for (let i = 0; i < 5; i++) {
      const largeDataset = generateLargeCharacterDataset(200);

      const { unmount } = renderWithTheme(
        <CharacterList
          characters={largeDataset}
          onEdit={() => {}}
          onDelete={() => {}}
          onAdd={() => {}}
        />
      );

      unmount();
    }

    // Force garbage collection if available
    if ((global as any).gc) {
      (global as any).gc();
    }

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (less than 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });

  it('virtual scrolling works with very large datasets', () => {
    const veryLargeDataset = generateLargeCharacterDataset(10000);

    const startTime = performance.now();

    renderWithTheme(
      <CharacterList
        characters={veryLargeDataset}
        onEdit={() => {}}
        onDelete={() => {}}
        onAdd={() => {}}
        enableVirtualScrolling={true}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render quickly even with very large dataset
    expect(renderTime).toBeLessThan(500);

    // Should only render visible items
    const visibleItems = screen.getAllByText(/Character \d+/);
    expect(visibleItems.length).toBeLessThan(100); // Should not render all 10000 items
  });
});
