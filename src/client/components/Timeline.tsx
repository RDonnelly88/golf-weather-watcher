import { useState } from 'react';

interface TimelineHour {
  time: string;
  hour: number;
  temperature: number;
  windSpeed: number;
  windGust: number | null;
  windDirection: number;
  cloudCover: number;
  rainAmount: number;
  rainProbability: number;
  conditions: string;
  description: string;
  feelsLike: number;
  humidity: number;
  pressure: number;
  dewPoint: number | null;
  uvIndex: number;
  visibility: number;
}

interface TimelineProps {
  timeline: TimelineHour[];
}

function Timeline({ timeline }: TimelineProps) {
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  const getWeatherIcon = (hour: TimelineHour) => {
    const condition = hour.conditions.toLowerCase();

    // Check for any precipitation first
    if (condition.includes('rain') || condition.includes('drizzle')) return '🌧️';
    if (condition.includes('snow')) return '❄️';
    if (condition.includes('thunder')) return '⛈️';
    if (condition.includes('fog')) return '🌫️';

    // Then check cloud cover
    if (condition.includes('cloud') || hour.cloudCover > 25) {
      if (hour.cloudCover > 75) return '☁️';
      if (hour.cloudCover > 50) return '⛅';
      return '🌤️';
    }

    return '☀️';
  };

  const getCompassDirection = (degrees: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(((degrees % 360) / 45)) % 8;
    return directions[index];
  };

  const getUVCategory = (uvIndex: number): { label: string; color: string; emoji: string } => {
    if (uvIndex <= 2) return { label: 'Low', color: '#4CAF50', emoji: '✅' };
    if (uvIndex <= 5) return { label: 'Moderate', color: '#FFC107', emoji: '⚠️' };
    if (uvIndex <= 7) return { label: 'High', color: '#FF9800', emoji: '☀️' };
    if (uvIndex <= 10) return { label: 'Very High', color: '#FF5722', emoji: '🔥' };
    return { label: 'Extreme', color: '#9C27B0', emoji: '☠️' };
  };

  const getPressureTrend = (pressure: number): string => {
    if (pressure > 1020) return 'High - Fair weather';
    if (pressure > 1013) return 'Normal - Stable';
    if (pressure > 1000) return 'Low - Changeable';
    return 'Very Low - Stormy';
  };

  const toggleCard = (index: number) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div className="timeline-container">
      <h2>Your Round Timeline</h2>
      <div className="timeline">
        {timeline.map((hour, index) => {
          const isExpanded = expandedCards.has(index);
          const uvInfo = getUVCategory(hour.uvIndex);

          return (
            <div
              key={index}
              className={`timeline-hour ${isExpanded ? 'expanded' : ''}`}
              onClick={() => toggleCard(index)}
            >
              <div className="timeline-header">
                <div className="timeline-time">{hour.time}</div>
                <div className="timeline-icon">{getWeatherIcon(hour)}</div>
                <div className="expand-indicator">{isExpanded ? '▼' : '▶'}</div>
              </div>

              <div className="timeline-details">
                <div className="timeline-detail">
                  <span className="timeline-detail-icon">🌡️</span>
                  <span className="timeline-detail-value">{hour.temperature}°C</span>
                </div>
                <div className="timeline-detail">
                  <span className="timeline-detail-icon">💨</span>
                  <span className="timeline-detail-value">
                    {hour.windSpeed} mph
                    {hour.windGust && hour.windGust > hour.windSpeed && (
                      <span className="wind-gust-inline">
                        <span className="gust-icon">💨</span>
                        <span className="gust-text">{hour.windGust} mph</span>
                      </span>
                    )}
                    <span className="wind-direction-inline">
                      <span className="wind-arrow" style={{ transform: `rotate(${hour.windDirection - 90}deg)` }}>➤</span>
                      <span className="wind-dir-text">{getCompassDirection(hour.windDirection)}</span>
                    </span>
                  </span>
                </div>
                <div className="timeline-detail">
                  <span className="timeline-detail-icon">☁️</span>
                  <span className="timeline-detail-value">{hour.cloudCover}%</span>
                </div>
                <div className="timeline-detail">
                  <span className="timeline-detail-icon">☔</span>
                  <span className="timeline-detail-value">
                    {hour.rainAmount > 0 ? `${hour.rainAmount.toFixed(1)}mm` : 'No rain'}
                    {hour.rainProbability > 0 && (
                      <span className={`rain-chance-inline ${hour.rainProbability > 50 ? 'high-chance' : ''}`}>
                        <span className="rain-drop">💧</span>
                        <span className="rain-chance-text">{hour.rainProbability}%</span>
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="timeline-expanded">
                  <div className="expanded-section">
                    <h4>Comfort & Feel</h4>
                    <div className="expanded-detail">
                      <span className="expanded-label">Feels Like:</span>
                      <span className="expanded-value">{hour.feelsLike}°C</span>
                      {hour.feelsLike < hour.temperature - 2 && <span className="comfort-note">🥶 Wind chill effect</span>}
                      {hour.feelsLike > hour.temperature + 2 && <span className="comfort-note">🥵 Humidity effect</span>}
                    </div>
                    <div className="expanded-detail">
                      <span className="expanded-label">Humidity:</span>
                      <span className="expanded-value">{hour.humidity}%</span>
                      {hour.humidity > 70 && <span className="humidity-note">💦 Muggy conditions</span>}
                      {hour.humidity < 30 && <span className="humidity-note">🏜️ Very dry</span>}
                    </div>
                    {hour.dewPoint !== null && (
                      <div className="expanded-detail">
                        <span className="expanded-label">Dew Point:</span>
                        <span className="expanded-value">{hour.dewPoint}°C</span>
                        {hour.dewPoint > 18 && <span className="dewpoint-note">😰 Uncomfortable</span>}
                        {hour.dewPoint > 21 && <span className="dewpoint-note">🔥 Oppressive</span>}
                      </div>
                    )}
                  </div>

                  <div className="expanded-section">
                    <h4>Sun & Visibility</h4>
                    <div className="expanded-detail">
                      <span className="expanded-label">UV Index:</span>
                      <div className="uv-display">
                        <span className="uv-value" style={{ backgroundColor: uvInfo.color }}>
                          {hour.uvIndex} {uvInfo.emoji}
                        </span>
                        <span className="uv-label">{uvInfo.label}</span>
                      </div>
                      {hour.uvIndex > 5 && <span className="uv-warning">🧴 Sunscreen recommended!</span>}
                    </div>
                    <div className="expanded-detail">
                      <span className="expanded-label">Visibility:</span>
                      <span className="expanded-value">{hour.visibility} km</span>
                      {hour.visibility < 5 && <span className="visibility-note">🌫️ Poor visibility</span>}
                      {hour.visibility >= 10 && <span className="visibility-note">👁️ Crystal clear</span>}
                    </div>
                  </div>

                  <div className="expanded-section">
                    <h4>Atmospheric</h4>
                    <div className="expanded-detail">
                      <span className="expanded-label">Pressure:</span>
                      <span className="expanded-value">{hour.pressure} hPa</span>
                      <span className="pressure-note">{getPressureTrend(hour.pressure)}</span>
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Timeline;