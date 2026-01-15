import { createContext, type ReactNode, useContext, useState } from 'react';


type LoadingContextType = {
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const setLoading = (loading: boolean, message = '') => {
    setIsLoading(loading);
    setLoadingMessage(message);
  };

  return (
    <LoadingContext.Provider value={{ isLoading, loadingMessage, setLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

