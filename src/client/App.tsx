import { useState, useEffect, useMemo } from 'react';
import LocationSearch from './components/LocationSearch';
import AmericanFlag from './components/AmericanFlag';
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

const SETTINGS_STORAGE_KEY = 'golf-weather-watcher-settings';

const DEFAULT_LOCATION = {
  name: 'St Andrews, Scotland',
  lat: 56.3398,
  lon: -2.7967
};
const DEFAULT_DATE = new Date();
const DEFAULT_START_TIME = '13:00';
const DEFAULT_ROUND_LENGTH = 3;

function loadSavedSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const BUNTING_COLORS = ['#BF0A30', '#FFFFFF', '#002868'];

const TICKER_PHRASES = [
  'ACCORDING TO MANY THE GREATEST GOLF APP ANYWHERE IN THE WORLD',
  'TREMENDOUS FAIRWAYS',
  'THE BEST FORECASTS, BELIEVE ME',
  'HUGE GREENS',
  'NOBODY GOLFS BETTER THAN THIS APP',
  'A VERY STABLE FORECAST',
  '10/10 METEOROLOGISTS AGREE',
];

const CONFETTI_COLORS = ['#BF0A30', '#FFFFFF', '#002868', '#FFD700'];

function getTrumpQuip(score: number): string {
  if (score >= 80) return 'TREMENDOUS conditions. Perhaps the best round anyone has ever seen. Sleepy Joe Biden could never dream of a round like this';
  if (score >= 70) return 'HUGE win for golf today. Very excellent, very stable weather. Even Joe would wake up for this one.';
  if (score >= 60) return 'Not bad, not bad at all. A solid, winning forecast — better numbers than Joe ever put up, and that\'s not hyperbole, that\'s just facts.';
  if (score >= 45) return 'A little rough out there, but we will make it a great round anyway, unlike Joe, who couldn\'t find the clubhouse with a map, an aide, and a full tank of gas. C\'mon, man.';
  return 'This so-called "score" is FAKE, probably cooked up by radical left meteorologists who never wanted us to play golf in the first place. The weather is actually TREMENDOUS. Total witch hunt. SAD!';
}

type TrumpTier = 'tremendous' | 'good' | 'meh' | 'disaster';

function getTrumpTier(score: number): TrumpTier {
  if (score >= 80) return 'tremendous';
  if (score >= 70) return 'good';
  if (score >= 45) return 'meh';
  return 'disaster';
}

const SEAL_TEXT: Record<TrumpTier, string> = {
  tremendous: 'CERTIFIED TREMENDOUS',
  good: 'APPROVED',
  meh: 'SO-SO, FRANKLY',
  disaster: 'FAKE SCORE!'
};

function App() {
  const [selectedLocation, setSelectedLocation] = useState<{ name: string; lat: number; lon: number } | null>(() => {
    return loadSavedSettings()?.location ?? DEFAULT_LOCATION;
  });
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const savedDate = loadSavedSettings()?.date;
    return savedDate ? new Date(savedDate) : DEFAULT_DATE;
  });
  const [startTime, setStartTime] = useState(() => {
    return loadSavedSettings()?.startTime ?? DEFAULT_START_TIME;
  });
  const [roundLength, setRoundLength] = useState(() => {
    return loadSavedSettings()?.roundLength ?? DEFAULT_ROUND_LENGTH;
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
      location: selectedLocation,
      date: selectedDate.toISOString(),
      startTime,
      roundLength
    }));
  }, [selectedLocation, selectedDate, startTime, roundLength]);
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

  const isTrumpCourse = selectedLocation?.name.includes('Trump') ?? false;

  const trumpTier: TrumpTier | null = isTrumpCourse && weatherData
    ? getTrumpTier(weatherData.scores.overall)
    : null;

  const confettiPieces = useMemo(() => {
    if (trumpTier !== 'good' && trumpTier !== 'tremendous') return [];
    return Array.from({ length: 40 }, (_, i) => ({
      left: (i * 37) % 100,
      delay: (i * 0.13) % 3,
      duration: 2.5 + (i % 5) * 0.4,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rotate: (i * 53) % 360
    }));
  }, [trumpTier]);

  const fireworkSparks = useMemo(() => {
    if (trumpTier !== 'tremendous') return [];
    const burstOrigins = [
      { x: 22, y: 18 },
      { x: 50, y: 12 },
      { x: 78, y: 20 }
    ];
    const sparksPerBurst = 18;
    const sparks: Array<{ key: string; x: number; y: number; tx: number; ty: number; color: string; delay: number }> = [];
    burstOrigins.forEach((origin, b) => {
      for (let s = 0; s < sparksPerBurst; s++) {
        const angle = (360 / sparksPerBurst) * s;
        const rad = (angle * Math.PI) / 180;
        const distance = 55 + (s % 3) * 18;
        sparks.push({
          key: `${b}-${s}`,
          x: origin.x,
          y: origin.y,
          tx: Math.cos(rad) * distance,
          ty: Math.sin(rad) * distance,
          color: CONFETTI_COLORS[(b + s) % CONFETTI_COLORS.length],
          delay: b * 0.7 + (s % 4) * 0.03
        });
      }
    });
    return sparks;
  }, [trumpTier]);

  const stormDrops = useMemo(() => {
    if (trumpTier !== 'disaster') return [];
    return Array.from({ length: 30 }, (_, i) => ({
      left: (i * 41) % 100,
      delay: (i * 0.09) % 2,
      duration: 0.8 + (i % 4) * 0.15
    }));
  }, [trumpTier]);

  return (
    <div className={`app${isTrumpCourse ? ' trump-theme' : ''}`}>
      <div className="background">
        <div className="cloud cloud1"></div>
        <div className="cloud cloud2"></div>
        <div className="cloud cloud3"></div>
        <div className="golf-course"></div>
        {isTrumpCourse && (
          <>
            <AmericanFlag className="bg-flag bg-flag-left" />
            <AmericanFlag className="bg-flag bg-flag-right" />
          </>
        )}
      </div>

      <div className="container">
        {isTrumpCourse && (
          <div className="trump-bunting">
            {Array.from({ length: 15 }, (_, i) => (
              <span key={i} style={{ borderTopColor: BUNTING_COLORS[i % BUNTING_COLORS.length] }}></span>
            ))}
          </div>
        )}

        <header className="header">
          <div className="flag-pole">
            {isTrumpCourse ? (
              <AmericanFlag className="pole-flag" />
            ) : (
              <div className="flag"></div>
            )}
            <div className="pole"></div>
          </div>
          <h1 className="title">
            <span className="title-line1">Golf Weather</span>
            <span className="title-line2">Watcher</span>
          </h1>
          {isTrumpCourse && (
            <span className="tagline">
              <AmericanFlag className="tagline-flag" />
              Make Golf Weather Watching Great Again
              <AmericanFlag className="tagline-flag" />
            </span>
          )}
          <div className="golf-ball-container">
            <div className="golf-ball"></div>
          </div>
        </header>

        {isTrumpCourse && (
          <div className="trump-ticker">
            <div className="trump-ticker-track">
              {[...TICKER_PHRASES, ...TICKER_PHRASES].map((phrase, i) => (
                <span key={i} className="trump-ticker-item">⛳ {phrase}</span>
              ))}
            </div>
          </div>
        )}

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
                <option value="2">2 hours</option>
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
            {loading ? 'Checking...' : isTrumpCourse ? 'Make This Round Great Again' : 'Check Golf Weather'}
          </span>
          <div className="golf-club">🏌️</div>
        </button>

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {weatherData && !loading && (
          <div className={`results-container${trumpTier === 'disaster' ? ' disaster-shake' : ''}`}>
            {confettiPieces.length > 0 && (
              <div className="confetti-container">
                {confettiPieces.map((piece, i) => (
                  <span
                    key={i}
                    className="confetti-piece"
                    style={{
                      left: `${piece.left}%`,
                      animationDelay: `${piece.delay}s`,
                      animationDuration: `${piece.duration}s`,
                      backgroundColor: piece.color,
                      transform: `rotate(${piece.rotate}deg)`
                    }}
                  ></span>
                ))}
              </div>
            )}

            {fireworkSparks.length > 0 && (
              <div className="fireworks-container">
                {fireworkSparks.map(spark => (
                  <span
                    key={spark.key}
                    className="firework-spark"
                    style={{
                      left: `${spark.x}%`,
                      top: `${spark.y}%`,
                      '--tx': `${spark.tx}px`,
                      '--ty': `${spark.ty}px`,
                      backgroundColor: spark.color,
                      animationDelay: `${spark.delay}s`
                    } as React.CSSProperties}
                  ></span>
                ))}
              </div>
            )}

            {stormDrops.length > 0 && (
              <div className="storm-container">
                {stormDrops.map((drop, i) => (
                  <span
                    key={i}
                    className="storm-drop"
                    style={{
                      left: `${drop.left}%`,
                      animationDelay: `${drop.delay}s`,
                      animationDuration: `${drop.duration}s`
                    }}
                  ></span>
                ))}
                <div className="storm-flash"></div>
              </div>
            )}

            {trumpTier === 'tremendous' && (
              <div className="usa-chant-banner">
                <AmericanFlag className="chant-flag" />
                USA! USA! USA!
                <AmericanFlag className="chant-flag" />
              </div>
            )}

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

            <div className="overall-score-wrapper">
              <OverallScore
                score={weatherData.scores.overall}
                scores={weatherData.scores}
                recommendation={{
                  emoji: weatherData.recommendation.emoji,
                  text: isTrumpCourse
                    ? `${getTrumpQuip(weatherData.scores.overall)}`
                    : weatherData.recommendation.text
                }}
              />
              {trumpTier && (
                <div className={`trump-seal trump-seal-${trumpTier}`}>
                  <span className="trump-seal-text">{SEAL_TEXT[trumpTier]}</span>
                </div>
              )}
              {trumpTier === 'disaster' && (
                <div className="fake-score-banner">Fake Score! Witch Hunt!</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="golfer-animation">
        <div className="golfer">
          {isTrumpCourse && (
            <span className="maga-cap-graphic">
              <span className="maga-cap-crown"></span>
              <span className="maga-cap-patch"></span>
              <span className="maga-cap-brim"></span>
            </span>
          )}
          🏌️
        </div>
      </div>

      {isTrumpCourse && <div className="eagle-animation">🦅</div>}
    </div>
  );
}

export default App;
