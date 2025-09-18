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
}

interface TimelineProps {
  timeline: TimelineHour[];
}

function Timeline({ timeline }: TimelineProps) {
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

  return (
    <div className="timeline-container">
      <h2>Your Round Timeline</h2>
      <div className="timeline">
        {timeline.map((hour, index) => (
          <div key={index} className={`timeline-hour ${index === 0 ? 'current' : ''}`}>
            <div className="timeline-time">{hour.time}</div>
            <div className="timeline-icon">{getWeatherIcon(hour)}</div>
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
                    <span className="wind-arrow" style={{ transform: `rotate(${hour.windDirection}deg)` }}>➤</span>
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
          </div>
        ))}
      </div>
    </div>
  );
}

export default Timeline;