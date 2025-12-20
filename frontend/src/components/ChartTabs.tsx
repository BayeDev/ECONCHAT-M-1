"use client";
/**
 * EconChat M-2 - ChartTabs Component
 * Tab navigation for switching between Chart/Map/Table views
 * Based on OWID/World Bank patterns
 */

import { useState } from 'react';

export type TabType = 'chart' | 'map' | 'table';

export interface ChartTabsProps {
  children: {
    chart?: React.ReactNode;
    map?: React.ReactNode;
    table?: React.ReactNode;
  };
  defaultTab?: TabType;
  availableTabs?: TabType[];
  onTabChange?: (tab: TabType) => void;
}

export default function ChartTabs({
  children,
  defaultTab = 'chart',
  availableTabs = ['chart', 'table'],
  onTabChange
}: ChartTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Filter available tabs based on what content is provided
  const tabs = availableTabs.filter(tab => children[tab] !== undefined);

  // Tab labels with icons
  const tabConfig: Record<TabType, { label: string; icon: React.ReactNode }> = {
    chart: {
      label: 'Chart',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v18h18" />
          <path d="M7 14l4-4 4 4 4-6" />
        </svg>
      )
    },
    map: {
      label: 'Map',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      )
    },
    table: {
      label: 'Table',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
      )
    }
  };

  return (
    <div className="chart-tabs-container">
      {/* Tab Navigation */}
      <div className="chart-tabs-nav" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            className={`chart-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => handleTabChange(tab)}
          >
            {tabConfig[tab].icon}
            <span>{tabConfig[tab].label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="chart-tabs-content" role="tabpanel">
        {children[activeTab]}
      </div>
    </div>
  );
}

// ============================================
// Specialized Tab Components
// ============================================

/**
 * World Bank style tabs (Chart | Table)
 */
export function WBDataTabs(props: Omit<ChartTabsProps, 'availableTabs'>) {
  return <ChartTabs {...props} availableTabs={['chart', 'table']} />;
}

/**
 * OWID style tabs with Map option
 */
export function OWIDDataTabs(props: Omit<ChartTabsProps, 'availableTabs'>) {
  return <ChartTabs {...props} availableTabs={['chart', 'map', 'table']} />;
}
