import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

interface PreferencesModalContextValue {
  showPreferencesModal: boolean;
  openPreferencesModal: () => void;
  closePreferencesModal: () => void;
}

const PreferencesModalContext = createContext<PreferencesModalContextValue>({
  showPreferencesModal: false,
  openPreferencesModal: () => {},
  closePreferencesModal: () => {},
});

export function PreferencesModalProvider({ children }: { children: React.ReactNode }) {
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const lastClosedAtRef = useRef(0);

  const openPreferencesModal = useCallback(() => {
    if (Date.now() - lastClosedAtRef.current < 300) return;
    setShowPreferencesModal(true);
  }, []);

  const closePreferencesModal = useCallback(() => {
    lastClosedAtRef.current = Date.now();
    setShowPreferencesModal(false);
  }, []);

  return (
    <PreferencesModalContext.Provider value={{ showPreferencesModal, openPreferencesModal, closePreferencesModal }}>
      {children}
    </PreferencesModalContext.Provider>
  );
}

export const usePreferencesModal = () => useContext(PreferencesModalContext);
