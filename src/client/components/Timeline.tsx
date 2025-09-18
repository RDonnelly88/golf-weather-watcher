interface TimelineHour {
  time: string;
  hour: number;
  temperature: number;
  windSpeed: number;
  windGust: number | null;
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
    if (hour.conditions.toLowerCase().includes('rain')) return '🌧️';
    if (hour.conditions.toLowerCase().includes('cloud')) {
      if (hour.cloudCover > 75) return '☁️';
      if (hour.cloudCover > 50) return '⛅';
      return '🌤️';
    }
    if (hour.conditions.toLowerCase().includes('fog')) return '🌫️';
    return '☀️';
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
                <span className="timeline-detail-value">{hour.windSpeed}-{hour.windGust || hour.windSpeed} mph</span>
              </div>
              <div className="timeline-detail">
                <span className="timeline-detail-icon">☁️</span>
                <span className="timeline-detail-value">{hour.cloudCover}%</span>
              </div>
              <div className="timeline-detail">
                <span className="timeline-detail-icon">☔</span>
                <span className="timeline-detail-value">{hour.rainAmount.toFixed(1)}mm/{hour.rainProbability || 0}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Timeline;