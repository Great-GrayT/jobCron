// Theme type for Nivo charts
interface NivoTheme {
  background?: string;
  text?: {
    fontSize?: number;
    fill?: string;
    fontFamily?: string;
  };
  axis?: {
    domain?: { line?: { stroke?: string; strokeWidth?: number } };
    ticks?: { line?: { stroke?: string; strokeWidth?: number }; text?: { fill?: string; fontSize?: number } };
    legend?: { text?: { fill?: string; fontSize?: number; fontWeight?: number } };
  };
  grid?: { line?: { stroke?: string; strokeWidth?: number } };
  legends?: { text?: { fill?: string; fontSize?: number } };
  tooltip?: { container?: Record<string, unknown> };
  labels?: { text?: { fill?: string; fontSize?: number } };
}

// Bloomberg terminal color palette
export const CHART_COLORS = [
  '#00d4ff', // Primary cyan
  '#00ff88', // Success green
  '#ffcc00', // Warning yellow
  '#ff6b6b', // Error red
  '#9d4edd', // Purple
  '#06ffa5', // Bright green
  '#ff006e', // Magenta
  '#4cc9f0', // Light cyan
];

// Shared Nivo theme matching Bloomberg terminal aesthetic
export const bloombergTheme: NivoTheme = {
  background: 'transparent',
  text: {
    fontSize: 11,
    fill: '#9ca3af',
    fontFamily: "'Courier New', monospace",
  },
  axis: {
    domain: {
      line: { stroke: '#1a2332', strokeWidth: 1 },
    },
    ticks: {
      line: { stroke: '#1a2332', strokeWidth: 1 },
      text: { fill: '#6b7280', fontSize: 10 },
    },
    legend: {
      text: { fill: '#00d4ff', fontSize: 11, fontWeight: 700 },
    },
  },
  grid: {
    line: { stroke: '#1a2332', strokeWidth: 1 },
  },
  legends: {
    text: { fill: '#9ca3af', fontSize: 10 },
  },
  tooltip: {
    container: {
      background: '#0a0e1a',
      border: '1px solid #00d4ff',
      fontSize: 11,
      fontFamily: "'Courier New', monospace",
      padding: '8px 12px',
      borderRadius: '4px',
    },
  },
  labels: {
    text: { fill: '#e5e7eb', fontSize: 10 },
  },
};

// Tooltip component style for custom tooltips
export const tooltipStyle = {
  background: '#0a0e1a',
  border: '1px solid #00d4ff',
  padding: '8px 12px',
  fontSize: 11,
  fontFamily: "'Courier New', monospace",
  borderRadius: '4px',
  boxShadow: '0 4px 12px rgba(0, 212, 255, 0.3)',
};

// Get color by index with wraparound
export const getChartColor = (index: number): string => {
  return CHART_COLORS[index % CHART_COLORS.length];
};
