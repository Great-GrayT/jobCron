'use client';

import { ResponsiveTreeMap } from '@nivo/treemap';
import { bloombergTheme, CHART_COLORS, tooltipStyle } from './theme';

interface IndustryTreemapProps {
  data: Array<{ name: string; value: number }>;
  onIndustryClick: (industry: string) => void;
  activeFilters: string[];
}

export function IndustryTreemap({ data, onIndustryClick, activeFilters }: IndustryTreemapProps) {
  if (data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#4a5568' }}>
        No data available
      </div>
    );
  }

  const treeData = {
    name: 'Industries',
    children: data.map((item, i) => ({
      name: item.name,
      value: item.value,
      color: activeFilters.includes(item.name)
        ? '#00ff88'
        : CHART_COLORS[i % CHART_COLORS.length],
    })),
  };

  return (
    <ResponsiveTreeMap
      data={treeData}
      identity="name"
      value="value"
      theme={bloombergTheme}
      tile="squarify"
      leavesOnly={true}
      innerPadding={3}
      outerPadding={3}
      colors={{ datum: 'data.color' }}
      borderWidth={2}
      borderColor="#1a2332"
      labelSkipSize={50}
      label={(node) => `${node.id}`}
      labelTextColor="#ffffff"
      parentLabelTextColor="#00d4ff"
      parentLabelSize={14}
      animate={true}
      motionConfig="gentle"
      onClick={(node) => {
        if (node.data.name && node.data.name !== 'Industries') {
          onIndustryClick(node.data.name);
        }
      }}
      tooltip={({ node }) => (
        <div style={tooltipStyle}>
          <strong style={{ color: '#00d4ff' }}>{node.id}</strong>
          <br />
          <span style={{ color: '#00ff88' }}>{node.value} jobs</span>
          <br />
          <span style={{ color: '#6b7280', fontSize: '9px' }}>Click to filter</span>
        </div>
      )}
    />
  );
}
