import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import App from '../../App';

const theme = createTheme();

const renderApp = () => {
  return render(
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  );
};

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

describe('Data Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('completes full character creation workflow', async () => {
    renderApp();

    // Navigate to Characters section
    fireEvent.click(screen.getByText('Characters'));

    // Click Add Character button
    fireEvent.click(screen.getByText('Add Character'));

    // Fill in character form
    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: 'New Character' },
    });

    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: 'A new test character' },
    });

    // Set stats
    fireEvent.change(screen.getByLabelText(/HP/), {
      target: { value: '120' },
    });

    fireEvent.change(screen.getByLabelText(/Attack/), {
      target: { value: '25' },
    });

    // Save character
    fireEvent.click(screen.getByText('Save'));

    // Verify character appears in list
    await waitFor(() => {
      expect(screen.getByText('New Character')).toBeInTheDocument();
    });

    // Verify character can be edited
    fireEvent.click(screen.getByText('New Character'));
    expect(screen.getByDisplayValue('New Character')).toBeInTheDocument();
  });

  it('handles data import workflow', async () => {
    const testData = {
      characters: [
        {
          id: 'imported-char',
          name: 'Imported Character',
          description: 'An imported character',
          stats: {
            hp: 100,
            mp: 50,
            attack: 20,
            defense: 15,
            speed: 10,
            movement: 3,
          },
          abilities: [],
          sprite: { idle: 'idle.png', move: 'move.png', attack: 'attack.png' },
          faction: 'player',
          canBeRecruited: false,
          recruitmentConditions: [],
          jobId: 'warrior',
        },
      ],
      items: [],
      stages: [],
    };

    const fileHandle = {
      getFile: jest.fn().mockResolvedValue({
        text: jest.fn().mockResolvedValue(JSON.stringify(testData)),
      }),
    };

    mockShowOpenFilePicker.mockResolvedValue([fileHandle]);

    renderApp();

    // Click Import button
    fireEvent.click(screen.getByText('Import'));

    // Wait for import to complete
    await waitFor(() => {
      expect(
        screen.getByText('Data imported successfully')
      ).toBeInTheDocument();
    });

    // Verify imported character appears
    fireEvent.click(screen.getByText('Characters'));
    expect(screen.getByText('Imported Character')).toBeInTheDocument();
  });

  it('handles data export workflow', async () => {
    const writableStream = {
      write: jest.fn(),
      close: jest.fn(),
    };

    const fileHandle = {
      createWritable: jest.fn().mockResolvedValue(writableStream),
    };

    mockShowSaveFilePicker.mockResolvedValue(fileHandle);

    renderApp();

    // Add some test data first
    fireEvent.click(screen.getByText('Characters'));
    fireEvent.click(screen.getByText('Add Character'));

    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: 'Export Test Character' },
    });

    fireEvent.click(screen.getByText('Save'));

    // Export data
    fireEvent.click(screen.getByText('Export'));

    await waitFor(() => {
      expect(writableStream.write).toHaveBeenCalled();
      expect(writableStream.close).toHaveBeenCalled();
    });

    // Verify export success message
    expect(screen.getByText('Data exported successfully')).toBeInTheDocument();
  });

  it('validates data before export', async () => {
    renderApp();

    // Add invalid character data
    fireEvent.click(screen.getByText('Characters'));
    fireEvent.click(screen.getByText('Add Character'));

    // Leave name empty (invalid)
    fireEvent.change(screen.getByLabelText(/HP/), {
      target: { value: '100' },
    });

    fireEvent.click(screen.getByText('Save'));

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/Name is required/)).toBeInTheDocument();
    });

    // Try to export - should show validation errors
    fireEvent.click(screen.getByText('Export'));

    await waitFor(() => {
      expect(
        screen.getByText(/Please fix validation errors/)
      ).toBeInTheDocument();
    });
  });

  it('handles cross-reference validation', async () => {
    renderApp();

    // Create a character that references a non-existent job
    fireEvent.click(screen.getByText('Characters'));
    fireEvent.click(screen.getByText('Add Character'));

    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: 'Test Character' },
    });

    // Set invalid job reference
    fireEvent.change(screen.getByLabelText(/Job/), {
      target: { value: 'non-existent-job' },
    });

    fireEvent.click(screen.getByText('Save'));

    // Should show reference validation error
    await waitFor(() => {
      expect(
        screen.getByText(/Referenced job does not exist/)
      ).toBeInTheDocument();
    });
  });

  it('provides real-time preview updates', async () => {
    renderApp();

    // Navigate to Characters
    fireEvent.click(screen.getByText('Characters'));
    fireEvent.click(screen.getByText('Add Character'));

    // Fill in character data
    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: 'Preview Character' },
    });

    fireEvent.change(screen.getByLabelText(/HP/), {
      target: { value: '150' },
    });

    // Preview should update in real-time
    expect(screen.getByText('Preview Character')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });
});
