/**
 * EconChat M-2 - TimelineControls Component
 * Play/pause animation controls for time-series data
 * Based on OWID/Gapminder timeline slider patterns
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface TimelineControlsProps {
  startYear: number;
  endYear: number;
  currentYear?: number;
  onChange: (year: number) => void;
  autoPlay?: boolean;
  playSpeed?: number;  // ms between frames
  showYearLabels?: boolean;
  labelInterval?: number;
}

export default function TimelineControls({
  startYear,
  endYear,
  currentYear,
  onChange,
  autoPlay = false,
  playSpeed = 500,
  showYearLabels = true,
  labelInterval = 10
}: TimelineControlsProps) {
  const [year, setYear] = useState(currentYear ?? startYear);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update internal year when prop changes
  useEffect(() => {
    if (currentYear !== undefined) {
      setYear(currentYear);
    }
  }, [currentYear]);

  // Handle play/pause
  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setYear(prev => {
          const next = prev >= endYear ? startYear : prev + 1;
          onChange(next);
          return next;
        });
      }, playSpeed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, startYear, endYear, playSpeed, onChange]);

  // Handle slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newYear = parseInt(e.target.value);
    setYear(newYear);
    onChange(newYear);
  };

  // Handle step buttons
  const stepBackward = () => {
    const newYear = Math.max(startYear, year - 1);
    setYear(newYear);
    onChange(newYear);
  };

  const stepForward = () => {
    const newYear = Math.min(endYear, year + 1);
    setYear(newYear);
    onChange(newYear);
  };

  const jumpToStart = () => {
    setYear(startYear);
    onChange(startYear);
  };

  const jumpToEnd = () => {
    setYear(endYear);
    onChange(endYear);
  };

  // Generate year labels
  const yearLabels = [];
  for (let y = startYear; y <= endYear; y += labelInterval) {
    yearLabels.push(y);
  }
  // Ensure end year is included
  if (!yearLabels.includes(endYear)) {
    yearLabels.push(endYear);
  }

  // Calculate progress percentage
  const progress = ((year - startYear) / (endYear - startYear)) * 100;

  return (
    <div className="timeline-controls">
      {/* Control buttons */}
      <div className="timeline-buttons">
        {/* Jump to start */}
        <button
          className="timeline-btn"
          onClick={jumpToStart}
          disabled={year === startYear}
          title="Jump to start"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        {/* Step backward */}
        <button
          className="timeline-btn"
          onClick={stepBackward}
          disabled={year === startYear}
          title="Previous year"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          className={`timeline-btn play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlay}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Step forward */}
        <button
          className="timeline-btn"
          onClick={stepForward}
          disabled={year === endYear}
          title="Next year"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'rotate(180deg)' }}>
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        {/* Jump to end */}
        <button
          className="timeline-btn"
          onClick={jumpToEnd}
          disabled={year === endYear}
          title="Jump to end"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'rotate(180deg)' }}>
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>
      </div>

      {/* Slider with year display */}
      <div className="timeline-slider-container">
        <span className="timeline-year-display">{year}</span>

        <div className="timeline-slider-wrapper">
          <input
            type="range"
            min={startYear}
            max={endYear}
            value={year}
            onChange={handleSliderChange}
            className="timeline-slider"
          />
          {/* Progress bar overlay */}
          <div
            className="timeline-progress"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Year labels */}
        {showYearLabels && (
          <div className="timeline-labels">
            {yearLabels.map(y => (
              <span
                key={y}
                className="timeline-label"
                style={{
                  left: `${((y - startYear) / (endYear - startYear)) * 100}%`
                }}
              >
                {y}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// CSS styles to be added to index.css
/*
.timeline-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  font-family: var(--font-body), Lato, sans-serif;
}

.timeline-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.timeline-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background: var(--bg-light, #f3f4f6);
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  transition: all 150ms ease;
}

.timeline-btn:hover:not(:disabled) {
  background: var(--owid-blue, #3360a9);
  color: white;
}

.timeline-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.timeline-btn.play-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--owid-blue, #3360a9);
  color: white;
}

.timeline-btn.play-btn.playing {
  background: var(--negative, #dc3545);
}

.timeline-slider-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-year-display {
  font-size: 20px;
  font-weight: 600;
  color: var(--owid-blue, #3360a9);
  text-align: center;
  min-width: 60px;
}

.timeline-slider-wrapper {
  position: relative;
  height: 8px;
}

.timeline-slider {
  width: 100%;
  height: 8px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--border-light, #e5e7eb);
  border-radius: 4px;
  outline: none;
  cursor: pointer;
}

.timeline-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--owid-blue, #3360a9);
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  cursor: grab;
}

.timeline-progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 8px;
  background: var(--owid-blue, #3360a9);
  border-radius: 4px 0 0 4px;
  pointer-events: none;
}

.timeline-labels {
  position: relative;
  height: 20px;
  margin-top: 8px;
}

.timeline-label {
  position: absolute;
  transform: translateX(-50%);
  font-size: 11px;
  color: var(--text-secondary, #6b7280);
}
*/
