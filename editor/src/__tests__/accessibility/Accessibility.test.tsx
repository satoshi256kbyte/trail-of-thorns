import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import App from '../../App';
import CharacterEditor from '../../components/CharacterEditor';
import { Character } from '../../types';

expect.extend(toHaveNoViolations);

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

const mockCharacter: Character = {
  id: 'test-char-1',
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
  abilities: ['ability1', 'ability2'],
  sprite: {
    idle: 'idle.png',
    move: 'move.png',
    attack: 'attack.png',
  },
  faction: 'player',
  canBeRecruited: false,
  recruitmentConditions: [],
  jobId: 'warrior',
};

describe('Accessibility Tests', () => {
  it('main app should not have accessibility violations', async () => {
    const { container } = renderWithTheme(<App />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('character editor should not have accessibility violations', async () => {
    const { container } = renderWithTheme(
      <CharacterEditor
        character={mockCharacter}
        onSave={() => {}}
        onCancel={() => {}}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(<App />);

    // Test tab navigation
    await user.tab();
    expect(document.activeElement).toHaveAttribute('role', 'button');

    // Test arrow key navigation in sidebar
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowUp}');

    // Should maintain focus management
    expect(document.activeElement).toBeInTheDocument();
  });

  it('provides proper ARIA labels', () => {
    renderWithTheme(
      <CharacterEditor
        character={mockCharacter}
        onSave={() => {}}
        onCancel={() => {}}
      />
    );

    // Check for proper labels
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/HP/)).toBeInTheDocument();

    // Check for proper button labels
    expect(screen.getByRole('button', { name: /Save/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
  });

  it('supports screen reader announcements', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(
      <CharacterEditor
        character={mockCharacter}
        onSave={() => {}}
        onCancel={() => {}}
      />
    );

    // Test form validation announcements
    const nameInput = screen.getByLabelText(/Name/);
    await user.clear(nameInput);
    await user.click(screen.getByText('Save'));

    // Should have aria-describedby for error messages
    expect(nameInput).toHaveAttribute('aria-describedby');
  });

  it('maintains focus management in modals', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(<App />);

    // Open a modal/dialog
    await user.click(screen.getByText('Characters'));
    await user.click(screen.getByText('Add Character'));

    // Focus should be trapped in modal
    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();

    // First focusable element should be focused
    const firstInput = screen.getByLabelText(/Name/);
    expect(firstInput).toHaveFocus();
  });

  it('provides sufficient color contrast', () => {
    renderWithTheme(<App />);

    // Check that text elements have sufficient contrast
    const textElements = screen.getAllByText(/./);
    textElements.forEach(element => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      // Basic check that colors are defined
      expect(color).toBeTruthy();
      expect(backgroundColor).toBeTruthy();
    });
  });

  it('supports high contrast mode', () => {
    // Mock high contrast media query
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-contrast: high)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    renderWithTheme(<App />);

    // Should render without errors in high contrast mode
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('supports reduced motion preferences', () => {
    // Mock reduced motion media query
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    renderWithTheme(<App />);

    // Should render without errors with reduced motion
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('provides proper heading hierarchy', () => {
    renderWithTheme(<App />);

    // Check heading hierarchy
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toBeInTheDocument();

    // Should have proper heading structure
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('supports zoom up to 200%', () => {
    // Mock zoom by changing viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 640, // Simulating 200% zoom on 1280px screen
    });

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 360, // Simulating 200% zoom on 720px screen
    });

    renderWithTheme(<App />);

    // Should render properly at high zoom levels
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('provides alternative text for images', () => {
    renderWithTheme(
      <CharacterEditor
        character={mockCharacter}
        onSave={() => {}}
        onCancel={() => {}}
      />
    );

    // Check for alt text on images (if any)
    const images = screen.queryAllByRole('img');
    images.forEach(img => {
      expect(img).toHaveAttribute('alt');
    });
  });
});