import React, { createContext, useContext, useMemo, useState } from 'react';

type TabContextValue = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

const TabContext = createContext<TabContextValue | null>(null);

export function TabProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState('story');
  const value = useMemo(() => ({ activeTab, setActiveTab }), [activeTab]);
  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}

export function useTab() {
  const ctx = useContext(TabContext);
  if (!ctx) {
    throw new Error('useTab must be used within TabProvider');
  }
  return ctx;
}
