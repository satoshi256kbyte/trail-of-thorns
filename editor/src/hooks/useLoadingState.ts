import { useState, useCallback } from 'react';

interface LoadingState {
    isLoading: boolean;
    message?: string;
    progress?: number;
}

export const useLoadingState = (initialState: LoadingState = { isLoading: false }) => {
    const [loadingState, setLoadingState] = useState<LoadingState>(initialState);

    const setLoading = useCallback((loading: boolean, message?: string, progress?: number) => {
        setLoadingState({
            isLoading: loading,
            message,
            progress,
        });
    }, []);

    const startLoading = useCallback((message?: string) => {
        setLoading(true, message);
    }, [setLoading]);

    const stopLoading = useCallback(() => {
        setLoading(false);
    }, [setLoading]);

    const updateProgress = useCallback((progress: number, message?: string) => {
        setLoadingState(prev => ({
            ...prev,
            progress,
            message: message || prev.message,
        }));
    }, []);

    const withLoading = useCallback(async <T>(
        operation: () => Promise<T>,
        message?: string
    ): Promise<T | null> => {
        try {
            startLoading(message);
            const result = await operation();
            return result;
        } catch (error) {
            throw error;
        } finally {
            stopLoading();
        }
    }, [startLoading, stopLoading]);

    return {
        ...loadingState,
        setLoading,
        startLoading,
        stopLoading,
        updateProgress,
        withLoading,
    };
};