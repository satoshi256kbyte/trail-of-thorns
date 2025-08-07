import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CharacterEditor from '../../components/CharacterEditor';
import { Character } from '../../types';

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

const mockOnSave = jest.fn();
const mockOnCancel = jest.fn();

describe('CharacterEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders character editor form', () => {
    renderWithTheme(
      <CharacterEditor
        character={mockCharacter}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByDisplayValue('Test Character')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A test character')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument(); // HP
  });

  it('validates required fields', async () => {
    renderWithTheme(
      <CharacterEditor
        character={{ ...mockCharacter, name: '' }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText(/Name is required/)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('validates stat ranges', async () => {
    renderWithTheme(
      <CharacterEditor
        character={mockCharacter}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Set HP to invalid value
    const hpInput = screen.getByLabelText(/HP/);
    fireEvent.change(hpInput, { target: { value: '1001' } });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(
        screen.getByText(/HP must be between 1 and 999/)
      ).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('calls onSave with updated character data', async () => {
    renderWithTheme(
      <CharacterEditor
        character={mockCharacter}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByDisplayValue('Test Character');
    fireEvent.change(nameInput, { target: { value: 'Updated Character' } });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        ...mockCharacter,
        name: 'Updated Character',
      });
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    renderWithTheme(
      <CharacterEditor
        character={mockCharacter}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('handles recruitment conditions for recruitable characters', () => {
    const recruitableCharacter = {
      ...mockCharacter,
      canBeRecruited: true,
      recruitmentConditions: [
        { type: 'defeat_with_character', characterId: 'hero' },
      ],
    };

    renderWithTheme(
      <CharacterEditor
        character={recruitableCharacter}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText(/Can be recruited/)).toBeChecked();
    expect(screen.getByText(/Recruitment Conditions/)).toBeInTheDocument();
  });
});
