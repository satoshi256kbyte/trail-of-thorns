import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    action: () => void;
    description: string;
}

interface UseKeyboardShortcutsProps {
    shortcuts: KeyboardShortcut[];
    enabled?: boolean;
}

export const useKeyboardShortcuts = ({
    shortcuts,
    enabled = true,
}: UseKeyboardShortcutsProps) => {
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!enabled) return;

        // Don't trigger shortcuts when typing in input fields
        const target = event.target as HTMLElement;
        if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.contentEditable === 'true'
        ) {
            return;
        }

        const matchingShortcut = shortcuts.find(shortcut => {
            return (
                shortcut.key.toLowerCase() === event.key.toLowerCase() &&
                !!shortcut.ctrlKey === event.ctrlKey &&
                !!shortcut.shiftKey === event.shiftKey &&
                !!shortcut.altKey === event.altKey &&
                !!shortcut.metaKey === event.metaKey
            );
        });

        if (matchingShortcut) {
            event.preventDefault();
            matchingShortcut.action();
        }
    }, [shortcuts, enabled]);

    useEffect(() => {
        if (!enabled) return;

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown, enabled]);

    // Return formatted shortcuts for help display
    const formattedShortcuts = shortcuts.map(shortcut => {
        const keys = [];
        if (shortcut.ctrlKey || shortcut.metaKey) {
            keys.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
        }
        if (shortcut.shiftKey) keys.push('Shift');
        if (shortcut.altKey) keys.push('Alt');
        keys.push(shortcut.key.toUpperCase());

        return {
            combination: keys.join(' + '),
            description: shortcut.description,
        };
    });

    return { formattedShortcuts };
};

// Common shortcuts for the admin dashboard
export const createCommonShortcuts = (actions: {
    onSave?: () => void;
    onImport?: () => void;
    onExport?: () => void;
    onValidate?: () => void;
    onNew?: () => void;
    onDelete?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onSearch?: () => void;
    onHelp?: () => void;
}): KeyboardShortcut[] => {
    const shortcuts: KeyboardShortcut[] = [];

    if (actions.onSave) {
        shortcuts.push({
            key: 's',
            ctrlKey: true,
            action: actions.onSave,
            description: 'Save current data',
        });
    }

    if (actions.onImport) {
        shortcuts.push({
            key: 'i',
            ctrlKey: true,
            action: actions.onImport,
            description: 'Import data',
        });
    }

    if (actions.onExport) {
        shortcuts.push({
            key: 'e',
            ctrlKey: true,
            action: actions.onExport,
            description: 'Export data',
        });
    }

    if (actions.onValidate) {
        shortcuts.push({
            key: 'v',
            ctrlKey: true,
            action: actions.onValidate,
            description: 'Validate data',
        });
    }

    if (actions.onNew) {
        shortcuts.push({
            key: 'n',
            ctrlKey: true,
            action: actions.onNew,
            description: 'Create new item',
        });
    }

    if (actions.onDelete) {
        shortcuts.push({
            key: 'Delete',
            action: actions.onDelete,
            description: 'Delete selected item',
        });
    }

    if (actions.onUndo) {
        shortcuts.push({
            key: 'z',
            ctrlKey: true,
            action: actions.onUndo,
            description: 'Undo last action',
        });
    }

    if (actions.onRedo) {
        shortcuts.push({
            key: 'y',
            ctrlKey: true,
            action: actions.onRedo,
            description: 'Redo last action',
        });
    }

    if (actions.onSearch) {
        shortcuts.push({
            key: 'f',
            ctrlKey: true,
            action: actions.onSearch,
            description: 'Focus search field',
        });
    }

    if (actions.onHelp) {
        shortcuts.push({
            key: 'F1',
            action: actions.onHelp,
            description: 'Show help',
        });
    }

    return shortcuts;
};