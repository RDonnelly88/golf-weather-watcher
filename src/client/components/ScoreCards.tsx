import { useEffect, useRef } from 'react';

interface ScoreCardsProps {
  scores: {
    sunshine: number;
    temperature: number;
    wind: number;
    rain: number;
    overall: number;
  };
}

function ScoreCards({ scores }: ScoreCardsProps) {
  const animatedRef = useRef(false);

  useEffect(() => {
    if (!animatedRef.current) {
      animatedRef.current = true;
    }
  }, [scores]);

  return (
    <div className="scores-grid">
      <div className="score-card sunshine">
        <div className="score-header">
          <span className="score-icon">☀️</span>
          <span className="score-label">Sunshine</span>
        </div>
        <div className="score-bar-container">
          <div
            className="score-bar"
            style={{ width: `${scores.sunshine}%` }}
          ></div>
        </div>
        <div className="score-value">{scores.sunshine}/100</div>
      </div>

      <div className="score-card temperature">
        <div className="score-header">
          <span className="score-icon">🌡️</span>
          <span className="score-label">Temperature</span>
        </div>
        <div className="score-bar-container">
          <div
            className="score-bar"
            style={{ width: `${scores.temperature}%` }}
          ></div>
        </div>
        <div className="score-value">{scores.temperature}/100</div>
      </div>

      <div className="score-card wind">
        <div className="score-header">
          <span className="score-icon">💨</span>
          <span className="score-label">Wind</span>
        </div>
        <div className="score-bar-container">
          <div
            className="score-bar"
            style={{ width: `${scores.wind}%` }}
          ></div>
        </div>
        <div className="score-value">{scores.wind}/100</div>
      </div>

      <div className="score-card rain">
        <div className="score-header">
          <span className="score-icon">☔</span>
          <span className="score-label">Rain</span>
        </div>
        <div className="score-bar-container">
          <div
            className="score-bar"
            style={{ width: `${scores.rain}%` }}
          ></div>
        </div>
        <div className="score-value">{scores.rain}/100</div>
      </div>
    </div>
  );
}

export default ScoreCards;