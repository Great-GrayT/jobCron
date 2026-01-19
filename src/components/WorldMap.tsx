'use client';

import { useState, useMemo, memo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';

interface CountryData {
  name: string;
  value: number;
}

interface WorldMapProps {
  data: CountryData[];
  onCountryClick?: (countryName: string) => void;
  selectedCountry?: string | null;
}

// TopoJSON world map URL
const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Map country names from data to names in the TopoJSON
const countryNameMapping: Record<string, string[]> = {
  'United States': ['United States of America', 'United States', 'USA'],
  'USA': ['United States of America', 'United States', 'USA'],
  'United Kingdom': ['United Kingdom', 'UK', 'Great Britain'],
  'UK': ['United Kingdom', 'UK', 'Great Britain'],
  'South Korea': ['South Korea', 'Korea, Republic of', 'Republic of Korea'],
  'North Korea': ['North Korea', 'Korea, Democratic People\'s Republic of'],
  'Czech Republic': ['Czech Republic', 'Czechia'],
  'Czechia': ['Czech Republic', 'Czechia'],
  'United Arab Emirates': ['United Arab Emirates', 'UAE'],
  'UAE': ['United Arab Emirates', 'UAE'],
  'Russia': ['Russia', 'Russian Federation'],
  'Vietnam': ['Vietnam', 'Viet Nam'],
  'Taiwan': ['Taiwan', 'Taiwan, Province of China'],
  'Hong Kong': ['Hong Kong', 'Hong Kong SAR China'],
  'Ivory Coast': ['Ivory Coast', 'Côte d\'Ivoire'],
  'Congo': ['Congo', 'Democratic Republic of the Congo', 'Congo, Democratic Republic of the'],
};

// Reverse mapping: from TopoJSON name to our data name
function normalizeCountryName(geoName: string, dataCountries: Set<string>): string | null {
  // Direct match
  if (dataCountries.has(geoName)) {
    return geoName;
  }

  // Check mappings
  for (const [dataName, aliases] of Object.entries(countryNameMapping)) {
    if (aliases.includes(geoName) && dataCountries.has(dataName)) {
      return dataName;
    }
  }

  // Try to find a partial match
  for (const dataName of dataCountries) {
    if (geoName.toLowerCase().includes(dataName.toLowerCase()) ||
        dataName.toLowerCase().includes(geoName.toLowerCase())) {
      return dataName;
    }
  }

  return null;
}

function WorldMap({ data, onCountryClick, selectedCountry }: WorldMapProps) {
  const [tooltipContent, setTooltipContent] = useState<{ name: string; value: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Create lookup maps
  const { countryValues, dataCountries, maxValue } = useMemo(() => {
    const values: Record<string, number> = {};
    const countries = new Set<string>();

    data.forEach(item => {
      values[item.name] = item.value;
      countries.add(item.name);

      // Also add aliases
      const aliases = countryNameMapping[item.name];
      if (aliases) {
        aliases.forEach(alias => {
          values[alias] = item.value;
        });
      }
    });

    const max = Math.max(...data.map(d => d.value), 1);

    return { countryValues: values, dataCountries: countries, maxValue: max };
  }, [data]);

  // Get color based on value with smooth gradient
  const getCountryColor = (value: number | undefined) => {
    if (value === undefined || value === 0) return '#1a2332';

    const intensity = value / maxValue;
    // Color gradient from dark to bright cyan/green
    if (intensity > 0.8) return '#06ffa5';
    if (intensity > 0.6) return '#05d98d';
    if (intensity > 0.4) return '#04b375';
    if (intensity > 0.2) return '#038d5d';
    if (intensity > 0.05) return '#026745';
    return '#024530';
  };

  const handleMouseMove = (
    e: React.MouseEvent,
    geoName: string,
    value: number | undefined
  ) => {
    if (value !== undefined && value > 0) {
      const dataName = normalizeCountryName(geoName, dataCountries) || geoName;
      setTooltipContent({ name: dataName, value });
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseLeave = () => {
    setTooltipContent(null);
  };

  const handleClick = (geoName: string, value: number | undefined) => {
    if (value !== undefined && value > 0 && onCountryClick) {
      const dataName = normalizeCountryName(geoName, dataCountries);
      if (dataName) {
        onCountryClick(dataName);
      }
    }
  };

  return (
    <div className="world-map-container" style={{ position: 'relative', width: '100%', height: '100%', background: '#0a0e1a', overflow: 'hidden' }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 100,
          center: [10, 35],
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const geoName = geo.properties.name;
                const value = countryValues[geoName];
                const isSelected = selectedCountry && (
                  geoName === selectedCountry ||
                  normalizeCountryName(geoName, dataCountries) === selectedCountry
                );
                const hasData = value !== undefined && value > 0;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseMove={(e) => handleMouseMove(e, geoName, value)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleClick(geoName, value)}
                    style={{
                      default: {
                        fill: getCountryColor(value),
                        stroke: isSelected ? '#ffffff' : '#2a3a4a',
                        strokeWidth: isSelected ? 1.5 : 0.3,
                        outline: 'none',
                        transition: 'fill 0.2s',
                        cursor: hasData ? 'pointer' : 'default',
                      },
                      hover: {
                        fill: hasData ? '#08ffb8' : getCountryColor(value),
                        stroke: hasData ? '#06ffa5' : '#2a3a4a',
                        strokeWidth: hasData ? 1 : 0.3,
                        outline: 'none',
                        cursor: hasData ? 'pointer' : 'default',
                      },
                      pressed: {
                        fill: '#06ffa5',
                        stroke: '#ffffff',
                        strokeWidth: 1,
                        outline: 'none',
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {tooltipContent && (
        <div
          style={{
            position: 'fixed',
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 45,
            backgroundColor: '#0a0e1a',
            border: '1px solid #06ffa5',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#e0e0e0',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{ color: '#06ffa5', fontWeight: 'bold', marginBottom: '2px' }}>
            {tooltipContent.name}
          </div>
          <div>{tooltipContent.value.toLocaleString()} jobs</div>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: '6px',
          left: '6px',
          background: 'rgba(10, 14, 26, 0.95)',
          border: '1px solid #2a3a4a',
          padding: '5px 8px',
          borderRadius: '3px',
          fontSize: '9px',
        }}
      >
        <div style={{ color: '#06ffa5', marginBottom: '3px', fontWeight: 'bold' }}>
          Jobs
        </div>
        <div
          style={{
            width: '80px',
            height: '6px',
            background: 'linear-gradient(to right, #024530, #026745, #038d5d, #04b375, #05d98d, #06ffa5)',
            borderRadius: '2px',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: '#6b7280',
            marginTop: '2px',
            fontSize: '8px',
          }}
        >
          <span>0</span>
          <span>{maxValue.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export default memo(WorldMap);
