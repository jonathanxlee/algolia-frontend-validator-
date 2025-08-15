import React from 'react'

interface NavigationProps {
  currentView: string
  onViewChange: (view: string) => void
}

export function Navigation({ currentView, onViewChange }: NavigationProps) {
  const tabs = [
    { id: 'live-traffic', label: 'Live Traffic' },
    { id: 'correlations', label: 'Correlations' },
    { id: 'issues', label: 'Issues' },
    { id: 'expectations', label: 'Expectations' },
    { id: 'settings', label: 'Settings' }
  ]

  return (
    <div className="navigation">
      <div className="nav-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={`nav-tab ${currentView === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
