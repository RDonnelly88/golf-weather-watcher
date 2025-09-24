import { useState } from 'react';

interface OverallScoreProps {
  score: number;
  scores: {
    sunshine: number;
    temperature: number;
    wind: number;
    rain: number;
    lightness: number;
    overall: number;
  };
  recommendation: {
    emoji: string;
    text: string;
  };
}

function OverallScore({ score, scores, recommendation }: OverallScoreProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const toggleBreakdown = () => {
    setShowBreakdown(!showBreakdown);
  };

  const getScoreColor = () => {
    if (score >= 75) return '#4CAF50';
    if (score >= 50) return '#FFC107';
    return '#FF5722';
  };

  const getScoreGradient = () => {
    if (score >= 75) return ['#4CAF50', '#8BC34A'];
    if (score >= 50) return ['#FFC107', '#FF9800'];
    return ['#FF5722', '#F44336'];
  };

  const [startColor, endColor] = getScoreGradient();

  // Calculate the breakdown
  const baseScore = (
    scores.temperature * 0.25 +
    scores.wind * 0.25 +
    scores.rain * 0.35 +
    scores.sunshine * 0.15
  );

  const daylightModifier = scores.overall / baseScore;
  const daylightModifierPercent = Math.round((daylightModifier - 1) * 100);

  return (
    <div className="overall-score-container">
      <div className="overall-score-ring" onClick={toggleBreakdown}>
        <svg viewBox="0 0 200 200">
          <defs>
            <linearGradient id="scoreGradient">
              <stop offset="0%" stopColor={startColor} />
              <stop offset="100%" stopColor={endColor} />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="90" className="score-ring-bg"></circle>
          <circle
            cx="100"
            cy="100"
            r="90"
            className="score-ring-fill"
            style={{
              strokeDashoffset: 565 - (score / 100) * 565
            }}
          ></circle>
        </svg>
        <div className="overall-score-content">
          <div className="overall-score-number">{score}</div>
          <div className="overall-score-label">Golf Score</div>
          <div className="score-toggle-hint">{showBreakdown ? '▼' : '▶'} Click for details</div>
        </div>
      </div>

      {showBreakdown && (
        <div className="score-breakdown">
          <h3>Score Calculation Breakdown</h3>

          <div className="breakdown-section">
            <h4>Weather Components</h4>
            <div className="breakdown-item">
              <span className="breakdown-label">☔ Rain Score:</span>
              <span className="breakdown-value">{scores.rain}/100 × 35% = {Math.round(scores.rain * 0.35)}</span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">🌡️ Temperature Score:</span>
              <span className="breakdown-value">{scores.temperature}/100 × 25% = {Math.round(scores.temperature * 0.25)}</span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">💨 Wind Score:</span>
              <span className="breakdown-value">{scores.wind}/100 × 25% = {Math.round(scores.wind * 0.25)}</span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">☀️ Sunshine Score:</span>
              <span className="breakdown-value">{scores.sunshine}/100 × 15% = {Math.round(scores.sunshine * 0.15)}</span>
            </div>
            <div className="breakdown-total">
              <span className="breakdown-label">Base Weather Score:</span>
              <span className="breakdown-value">{Math.round(baseScore)}/100</span>
            </div>
          </div>

          <div className="breakdown-section">
            <h4>Daylight Modifier</h4>
            <div className="breakdown-item">
              <span className="breakdown-label">🌅 Daylight Score:</span>
              <span className="breakdown-value">{scores.lightness}/100</span>
            </div>
            {scores.lightness < 100 && (
              <div className="breakdown-note">
                ⚠️ Playing outside optimal daylight hours reduces score by {Math.round((1 - scores.lightness/100) * 100)}%
              </div>
            )}
            {scores.lightness === 0 && (
              <div className="breakdown-warning">
                🌚 Playing in complete darkness - score reduced to 0!
              </div>
            )}
          </div>

          <div className="breakdown-section">
            <h4>Final Calculation</h4>
            <div className="breakdown-formula">
              <span>Base Score ({Math.round(baseScore)}) × Daylight Modifier ({(scores.lightness/100).toFixed(2)})</span>
              <span className="formula-result">= {score}/100</span>
            </div>
          </div>

          <div className="breakdown-interpretation">
            <h4>What this means:</h4>
            <div className="interpretation-text">
              {score >= 90 && "Near-perfect conditions! The weather gods are smiling on you."}
              {score >= 75 && score < 90 && "Excellent conditions for golf. Very enjoyable round expected."}
              {score >= 60 && score < 75 && "Good conditions. Some minor challenges but definitely playable."}
              {score >= 45 && score < 60 && "Decent conditions. Be prepared for some weather-related difficulties."}
              {score >= 30 && score < 45 && "Challenging conditions. Only for dedicated golfers!"}
              {score < 30 && "Poor conditions. Consider postponing unless you enjoy suffering."}
            </div>
          </div>
        </div>
      )}

      <div className="recommendation-box">
        <div className="recommendation-emoji">{recommendation.emoji}</div>
        <div className="recommendation-text">{recommendation.text}</div>
      </div>
    </div>
  );
}

export default OverallScore;