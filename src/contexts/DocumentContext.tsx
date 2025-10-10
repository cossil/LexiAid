import React, { createContext, useState, useContext, ReactNode, useMemo } from 'react';

// Define the shape of the context's value
interface DocumentContextType {
  activeDocumentId: string | null;
  setActiveDocumentId: (id: string | null) => void;
}

// Create the context with a default undefined value
const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

// Create the Provider component
export const DocumentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  // useMemo to prevent unnecessary re-renders of consuming components
  const value = useMemo(() => ({
    activeDocumentId,
    setActiveDocumentId,
  }), [activeDocumentId]);

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
};

// Create the custom hook for easy consumption
export const useDocument = (): DocumentContextType => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
};
