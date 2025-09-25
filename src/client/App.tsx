import { useState } from 'react';
import LocationSearch from './components/LocationSearch';
import Timeline from './components/Timeline';
import ScoreCards from './components/ScoreCards';
import OverallScore from './components/OverallScore';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './styles/App.css';
import { fetchWeatherForecast, calculateGolfScore } from './utils/api';

interface WeatherResult {
  location: string;
  weather: {
    temperature: number;
    temperatureRaw?: number;
    wind: number;
    windRaw?: number;
    windDirection?: number;
    windGust?: number;
    conditions: string;
  };
  scores: {
    sunshine: number;
    temperature: number;
    wind: number;
    rain: number;
    overall: number;
    lightness: number;
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
  }>;
  sunriseHour?: number;
  sunsetHour?: number;
}

function App() {
  const [selectedLocation, setSelectedLocation] = useState<{ name: string; lat: number; lon: number } | null>({
    name: 'St Andrews, Scotland',
    lat: 56.3398,
    lon: -2.7967
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState('12:00');
  const [roundLength, setRoundLength] = useState(5); // Default 5 hours
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
      const { weatherData, sunrise, sunset } = await fetchWeatherForecast(
        selectedDate,
        selectedLocation.lat,
        selectedLocation.lon,
        hours,
        roundLength
      );

      if (weatherData.length === 0) {
        setError('No weather data available for the specified date.');
        return;
      }

      // Calculate scores
      const scores = calculateGolfScore(weatherData, hours, sunrise, sunset, roundLength);

      // Calculate averages - keep raw values for scoring, round for display
      const avgTempRaw = weatherData.reduce((sum, w) => sum + w.main.temp, 0) / weatherData.length;
      const avgTemp = Math.round(avgTempRaw);
      const avgWindRaw = weatherData.reduce((sum, w) => sum + w.wind.speed, 0) / weatherData.length;
      const avgWind = Math.round(avgWindRaw); // m/s to mph
      const avgWindDirection = Math.round(weatherData.reduce((sum, w) => sum + (w.wind.direction || 0), 0) / weatherData.length);
      const maxWindGust = Math.max(...weatherData.map(w => w.wind.gust ? w.wind.gust : w.wind.speed ));
      const avgCloudCover = Math.round(weatherData.reduce((sum, w) => sum + w.clouds.all, 0) / weatherData.length);
      const totalRain = weatherData.reduce((sum, w) => sum + (w.rain || 0), 0);
      const avgPrecipChance = Math.round(weatherData.reduce((sum, w) => sum + (w.precipitationProbability || 0), 0) / weatherData.length);
      const conditions = weatherData[0].weather[0].description;

      // Parse sunrise/sunset hours for daylight scoring
      const sunriseHour = sunrise ? parseInt(sunrise.split('T')[1].split(':')[0]) : undefined;
      const sunsetHour = sunset ? parseInt(sunset.split('T')[1].split(':')[0]) : undefined;

      // Create timeline
      console.log(weatherData);
      const timeline = weatherData.map(data => {
        const date = new Date(data.dt * 1000);
        return {
          time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          hour: date.getHours(),
          temperature: Math.round(data.main.temp),
          windSpeed: Math.round(data.wind.speed),
          windGust: data.wind.gust ? Math.round(data.wind.gust) : null,
          windDirection: data.wind.direction || 0,
          cloudCover: data.clouds.all,
          rainAmount: data.rain || 0,
          rainProbability: data.precipitationProbability || 0,
          conditions: data.weather[0].main,
          description: data.weather[0].description,
          feelsLike: Math.round(data.main.feels_like),
          humidity: Math.round(data.main.humidity),
          pressure: Math.round(data.main.pressure || 1013),
          dewPoint: data.main.dewPoint ? Math.round(data.main.dewPoint) : null,
          uvIndex: Math.round(data.uvIndex || 0),
          visibility: Math.round((data.visibility || 10000) / 1000) // Convert to km
        };
      });

      setWeatherData({
        location: selectedLocation.name,
        weather: {
          temperature: avgTemp,
          temperatureRaw: avgTempRaw,
          wind: avgWind,
          windRaw: avgWindRaw,
          windDirection: avgWindDirection,
          windGust: maxWindGust,
          conditions: conditions
        },
        scores: {
          sunshine: scores.sunshine,
          temperature: scores.temperature,
          wind: scores.wind,
          rain: scores.rain,
          lightness: scores.lightness,
          overall: scores.overall
        },
        recommendation: {
          emoji: scores.emoji,
          text: scores.recommendation
        },
        timeline: timeline,
        sunriseHour: sunriseHour,
        sunsetHour: sunsetHour
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
    const endHour = (hours + roundLength) % 24;
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
              minDate={new Date('1940-01-01')}
              maxDate={new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)}
              dateFormat="MMMM d, yyyy"
              className="date-picker"
              showYearDropdown
              scrollableYearDropdown
              yearDropdownItemNumber={100}
            />
          </div>

          <div className="control-card">
            <label>Tee Time & Round Length</label>
            <div className="time-inputs">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="time-input"
              />
              <select
                value={roundLength}
                onChange={(e) => setRoundLength(Number(e.target.value))}
                className="round-length-select-inline"
              >
                <option value="3">3 hours</option>
                <option value="4">4 hours</option>
                <option value="5">5 hours</option>
                <option value="6">6 hours</option>
              </select>
            </div>
            <span className="time-range">Round ends at {endTime}</span>
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

            <ScoreCards
              scores={weatherData.scores}
              weatherData={{
                avgTemp: weatherData.weather.temperature,
                avgTempRaw: weatherData.weather.temperatureRaw,
                avgWindSpeed: weatherData.weather.wind,
                avgWindRaw: weatherData.weather.windRaw,
                maxWindGust: weatherData.weather.windGust,
                avgCloudCover: weatherData.timeline.reduce((sum, t) => sum + t.cloudCover, 0) / weatherData.timeline.length,
                totalRain: weatherData.timeline.reduce((sum, t) => sum + t.rainAmount, 0),
                avgPrecipChance: weatherData.timeline.reduce((sum, t) => sum + t.rainProbability, 0) / weatherData.timeline.length,
                startHour: parseInt(startTime.split(':')[0]),
                endHour: parseInt(startTime.split(':')[0]) + roundLength,
                sunriseHour: weatherData.sunriseHour,
                sunsetHour: weatherData.sunsetHour
              }}
            />

            <OverallScore
              score={weatherData.scores.overall}
              scores={weatherData.scores}
              recommendation={weatherData.recommendation}
            />
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