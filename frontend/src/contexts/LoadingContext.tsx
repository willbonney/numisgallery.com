import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

type LoadingContextType = {
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // useCallback with empty deps so the function reference is stable across renders.
  // Without this, every setLoading() call re-renders LoadingProvider, produces a new
  // setLoading reference, and re-triggers any useEffect that lists setLoading as a dep.
  const setLoading = useCallback((loading: boolean, message = "") => {
    setIsLoading(loading);
    setLoadingMessage(message);
  }, []);

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
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}
