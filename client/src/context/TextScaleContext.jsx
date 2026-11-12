import React, { createContext, useContext, useState, useEffect } from 'react';

const TextScaleContext = createContext(null);

export function TextScaleProvider({ children }) {
  const [isLargeText, setIsLargeText] = useState(() => {
    return localStorage.getItem('medguard_large_text') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('medguard_large_text', isLargeText);
    if (isLargeText) {
      document.documentElement.classList.add('large-text');
    } else {
      document.documentElement.classList.remove('large-text');
    }
  }, [isLargeText]);

  const toggleLargeText = () => {
    setIsLargeText((prev) => !prev);
  };

  return (
    <TextScaleContext.Provider value={{ isLargeText, toggleLargeText }}>
      {children}
    </TextScaleContext.Provider>
  );
}

export function useTextScale() {
  const context = useContext(TextScaleContext);
  if (!context) {
    throw new Error('useTextScale must be used within a TextScaleProvider');
  }
  return context;
}

