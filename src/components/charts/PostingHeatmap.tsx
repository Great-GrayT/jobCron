'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface Job {
  postedDate: string;
}

interface PostingHeatmapProps {
  jobs: Job[];
}

// Day names for the Y axis
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Hour labels for the X axis (every 3 hours)
const HOURS = ['00', '03', '06', '09', '12', '15', '18', '21'];

export function PostingHeatmap({ jobs }: PostingHeatmapProps) {
  const heatmapData = useMemo(() => {
    // Create a 7x24 grid (days x hours)
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

    jobs.forEach(job => {
      const date = new Date(job.postedDate);
      const day = date.getUTCDay();
      const hour = date.getUTCHours();
      grid[day][hour]++;
    });

    return grid;
  }, [jobs]);

  const maxValue = useMemo(() => {
    return Math.max(...heatmapData.flat(), 1);
  }, [heatmapData]);

  const getColor = (value: number): string => {
    if (value === 0) return '#1a2332';
    const intensity = value / maxValue;
    if (intensity > 0.8) return '#00ff88';
    if (intensity > 0.6) return '#05d98d';
    if (intensity > 0.4) return '#04b375';
    if (intensity > 0.2) return '#038d5d';
    if (intensity > 0.05) return '#026745';
    return '#024530';
  };

  const cellSize = 18;
  const gap = 2;
  const paddingLeft = 35;
  const paddingTop = 25;

  if (jobs.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#4a5568' }}>
        No data available
      </div>
    );
  }

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${paddingLeft + 24 * (cellSize + gap) + 20} ${paddingTop + 7 * (cellSize + gap) + 30}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Hour labels (X axis) */}
      {HOURS.map((hour, i) => (
        <text
          key={`hour-${hour}`}
          x={paddingLeft + i * 3 * (cellSize + gap) + cellSize / 2}
          y={15}
          fill="#6b7280"
          fontSize="9"
          fontFamily="'Courier New', monospace"
          textAnchor="middle"
        >
          {hour}
        </text>
      ))}

      {/* Day labels (Y axis) */}
      {DAYS.map((day, dayIndex) => (
        <text
          key={`day-${day}`}
          x={5}
          y={paddingTop + dayIndex * (cellSize + gap) + cellSize / 2 + 4}
          fill="#6b7280"
          fontSize="9"
          fontFamily="'Courier New', monospace"
        >
          {day}
        </text>
      ))}

      {/* Heatmap cells */}
      {heatmapData.map((dayData, dayIndex) =>
        dayData.map((value, hourIndex) => (
          <motion.g
            key={`cell-${dayIndex}-${hourIndex}`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: (dayIndex * 24 + hourIndex) * 0.002,
              duration: 0.2,
            }}
          >
            <motion.rect
              x={paddingLeft + hourIndex * (cellSize + gap)}
              y={paddingTop + dayIndex * (cellSize + gap)}
              width={cellSize}
              height={cellSize}
              rx={2}
              fill={getColor(value)}
              stroke="#0a0e1a"
              strokeWidth={1}
              whileHover={{ scale: 1.2, strokeWidth: 2, stroke: '#00d4ff' }}
              style={{ cursor: value > 0 ? 'pointer' : 'default' }}
            />
            {value > 0 && (
              <title>{`${DAYS[dayIndex]} ${String(hourIndex).padStart(2, '0')}:00 - ${value} jobs`}</title>
            )}
          </motion.g>
        ))
      )}

      {/* Legend */}
      <g transform={`translate(${paddingLeft}, ${paddingTop + 7 * (cellSize + gap) + 10})`}>
        <text fill="#6b7280" fontSize="9" fontFamily="'Courier New', monospace" y="5">
          Less
        </text>
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity, i) => (
          <rect
            key={`legend-${i}`}
            x={30 + i * 15}
            y={0}
            width={12}
            height={12}
            rx={2}
            fill={intensity === 0 ? '#1a2332' : getColor(intensity * maxValue)}
          />
        ))}
        <text fill="#6b7280" fontSize="9" fontFamily="'Courier New', monospace" x={125} y="10">
          More
        </text>
      </g>
    </svg>
  );
}
