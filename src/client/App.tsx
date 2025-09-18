import { useState } from 'react';
import LocationSearch from './components/LocationSearch';
import Timeline from './components/Timeline';
import ScoreCards from './components/ScoreCards';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './styles/App.css';
import { fetchWeatherForecast, calculateGolfScore } from './utils/api';

interface WeatherResult {
  location: string;
  weather: {
    temperature: number;
    wind: number;
    conditions: string;
  };
  scores: {
    sunshine: number;
    temperature: number;
    wind: number;
    rain: number;
    overall: number;
  };
  recommendation: {
    emoji: string;
    text: string;
  };
  timeline: Array<{
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
  }>;
}

function App() {
  const [selectedLocation, setSelectedLocation] = useState<{ name: string; lat: number; lon: number } | null>({
    name: 'St Andrews, Scotland',
    lat: 56.3398,
    lon: -2.7967
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date('2025-09-26'));
  const [startTime, setStartTime] = useState('12:00');
  const [weatherData, setWeatherData] = useState<WeatherResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkWeather = async () => {
    if (!selectedLocation) {
      setError('Please select a location');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Parse start time to get hour
      const [hours] = startTime.split(':').map(Number);

      // Fetch weather data directly from client
      const weatherData = await fetchWeatherForecast(
        selectedDate,
        selectedLocation.lat,
        selectedLocation.lon,
        hours
      );

      if (weatherData.length === 0) {
        setError('No weather data available for the specified date.');
        return;
      }

      // Calculate scores
      const scores = calculateGolfScore(weatherData);

      // Calculate averages
      const avgTemp = Math.round(weatherData.reduce((sum, w) => sum + w.main.temp, 0) / weatherData.length);
      const avgWind = Math.round(weatherData.reduce((sum, w) => sum + w.wind.speed * 2.237, 0) / weatherData.length); // m/s to mph
      const conditions = weatherData[0].weather[0].description;

      // Create timeline
      const timeline = weatherData.map(data => {
        const date = new Date(data.dt * 1000);
        return {
          time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          hour: date.getHours(),
          temperature: Math.round(data.main.temp),
          windSpeed: Math.round(data.wind.speed * 2.237), // m/s to mph
          windGust: data.wind.gust ? Math.round(data.wind.gust * 2.237) : null,
          cloudCover: data.clouds.all,
          rainAmount: data.rain?.['3h'] || 0,
          rainProbability: data.precipitationProbability || 0,
          conditions: data.weather[0].main,
          description: data.weather[0].description
        };
      });

      setWeatherData({
        location: selectedLocation.name,
        weather: {
          temperature: avgTemp,
          wind: avgWind,
          conditions: conditions
        },
        scores: {
          sunshine: scores.sunshine,
          temperature: scores.temperature,
          wind: scores.wind,
          rain: scores.rain,
          overall: scores.overall
        },
        recommendation: {
          emoji: scores.emoji,
          text: scores.recommendation
        },
        timeline: timeline
      });
    } catch (err) {
      setError('Failed to fetch weather data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const endTime = (() => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHour = (hours + 5) % 24;
    return `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  })();

  return (
    <div className="app">
      <div className="background">
        <div className="cloud cloud1"></div>
        <div className="cloud cloud2"></div>
        <div className="cloud cloud3"></div>
        <div className="golf-course"></div>
      </div>

      <div className="container">
        <header className="header">
          <div className="flag-pole">
            <div className="flag"></div>
            <div className="pole"></div>
          </div>
          <h1 className="title">
            <span className="title-line1">Golf Weather</span>
            <span className="title-line2">Watcher</span>
          </h1>
          <div className="golf-ball-container">
            <div className="golf-ball"></div>
          </div>
        </header>

        <div className="controls-section">
          <div className="control-card location-card">
            <label>Golf Course / Location</label>
            <LocationSearch onLocationSelect={setSelectedLocation} />
            {selectedLocation && (
              <div className="selected-location">
                📍 {selectedLocation.name}
              </div>
            )}
          </div>

          <div className="control-card">
            <label>Date</label>
            <DatePicker
              selected={selectedDate}
              onChange={(date) => date && setSelectedDate(date)}
              minDate={new Date()}
              maxDate={new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)}
              dateFormat="MMMM d, yyyy"
              className="date-picker"
            />
          </div>

          <div className="control-card">
            <label>Tee Time</label>
            <div className="time-inputs">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="time-input"
              />
              <span className="time-range">5 hour round until {endTime}</span>
            </div>
          </div>
        </div>

        <button
          className="check-button"
          onClick={checkWeather}
          disabled={loading || !selectedLocation}
        >
          <span className="button-text">
            {loading ? 'Checking...' : 'Check Golf Weather'}
          </span>
          <div className="golf-club">🏌️</div>
        </button>

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {weatherData && !loading && (
          <div className="results-container">
            <Timeline timeline={weatherData.timeline} />
            <ScoreCards scores={weatherData.scores} />

            <div className="overall-score-container">
              <div className="overall-score-ring">
                <svg viewBox="0 0 200 200">
                  <defs>
                    <linearGradient id="scoreGradient">
                      <stop offset="0%" stopColor={weatherData.scores.overall >= 75 ? '#4CAF50' : weatherData.scores.overall >= 50 ? '#FFC107' : '#FF5722'} />
                      <stop offset="100%" stopColor={weatherData.scores.overall >= 75 ? '#8BC34A' : weatherData.scores.overall >= 50 ? '#FF9800' : '#F44336'} />
                    </linearGradient>
                  </defs>
                  <circle cx="100" cy="100" r="90" className="score-ring-bg"></circle>
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    className="score-ring-fill"
                    style={{
                      strokeDashoffset: 565 - (weatherData.scores.overall / 100) * 565
                    }}
                  ></circle>
                </svg>
                <div className="overall-score-content">
                  <div className="overall-score-number">{weatherData.scores.overall}</div>
                  <div className="overall-score-label">Golf Score</div>
                </div>
              </div>

              <div className="recommendation-box">
                <div className="recommendation-emoji">{weatherData.recommendation.emoji}</div>
                <div className="recommendation-text">{weatherData.recommendation.text}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="golfer-animation">
        <div className="golfer">🏌️</div>
      </div>
    </div>
  );
}

export default App;