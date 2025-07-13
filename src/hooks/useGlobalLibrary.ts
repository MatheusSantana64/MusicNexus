import { createContext, useContext } from 'react';
import { useLibrary } from './useLibrary';

type LibraryContextType = ReturnType<typeof useLibrary> | null;

export const LibraryContext = createContext<LibraryContextType>(null);

export function useGlobalLibrary() {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useGlobalLibrary must be used within LibraryProvider');
  }
  return context;
}