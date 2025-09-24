import { useEffect, useRef, useState } from 'react';
import {
  calculateTemperatureScore,
  calculateWindScore,
  calculateRainScore,
  calculateCloudScore,
  calculateDaylightScore
} from '../utils/scoring';

interface ScoreCardsProps {
  scores: {
    sunshine: number;
    temperature: number;
    wind: number;
    rain: number;
    lightness: number;
    overall: number;
  };
  weatherData?: {
    avgTemp?: number;
    avgTempRaw?: number;
    avgWindSpeed?: number;
    avgWindRaw?: number;
    maxWindGust?: number;
    avgCloudCover?: number;
    totalRain?: number;
    avgPrecipChance?: number;
    startHour?: number;
    endHour?: number;
    sunriseHour?: number;
    sunsetHour?: number;
  };
}


function ScoreCards({ scores, weatherData }: ScoreCardsProps) {
  const animatedRef = useRef(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!animatedRef.current) {
      animatedRef.current = true;
    }
  }, [scores]);

  const toggleCard = (cardName: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardName)) {
        newSet.delete(cardName);
      } else {
        newSet.add(cardName);
      }
      return newSet;
    });
  };

  const getTemperatureData = () => {
    const temp = weatherData?.avgTempRaw ?? weatherData?.avgTemp ?? 0;
    return calculateTemperatureScore(temp);
  };

  const getWindData = () => {
    const wind = weatherData?.avgWindRaw ?? weatherData?.avgWindSpeed ?? 0;
    const gust = weatherData?.maxWindGust || 0;
    return calculateWindScore(wind, gust);
  };

  const getRainData = () => {
    const rain = weatherData?.totalRain || 0;
    const chance = weatherData?.avgPrecipChance || 0;
    return calculateRainScore(rain, chance);
  };

  const getCloudData = () => {
    const clouds = weatherData?.avgCloudCover || 0;
    return calculateCloudScore(clouds);
  };

  const getDaylightData = () => {
    if (!weatherData?.startHour || !weatherData?.sunriseHour || !weatherData?.sunsetHour) {
      return {
        score: 85,
        buckets: [{ range: 'No data', score: 85, active: true }],
        explanation: 'Daylight data not available\nScore: 85/100'
      };
    }

    const start = weatherData.startHour;
    const end = weatherData.endHour || start + 5;
    const sunrise = weatherData.sunriseHour;
    const sunset = weatherData.sunsetHour;

    return calculateDaylightScore(start, end, sunrise, sunset);
  };


  const renderBuckets = (buckets: any[]) => {
    return (
      <div className="score-buckets">
        {buckets.map((bucket, index) => (
          <div
            key={index}
            className={`score-bucket ${bucket.active ? 'active' : ''}`}
          >
            <span className="bucket-range">{bucket.range}</span>
            <span className="bucket-score">{bucket.score}</span>
          </div>
        ))}
      </div>
    );
  };

  // Get score data from centralized scoring
  const tempData = getTemperatureData();
  const windData = getWindData();
  const rainData = getRainData();
  const cloudData = getCloudData();
  const daylightData = getDaylightData();

  const scoreCards = [
    {
      name: 'sunshine',
      icon: '☀️',
      label: 'Cloudiness',
      score: scores.sunshine,
      explanation: cloudData.explanation,
      buckets: cloudData.buckets,
      color: '#FFD700'
    },
    {
      name: 'temperature',
      icon: '🌡️',
      label: 'Temperature',
      score: scores.temperature,
      explanation: tempData.explanation,
      buckets: tempData.buckets,
      color: '#FF6B6B'
    },
    {
      name: 'wind',
      icon: '💨',
      label: 'Wind',
      score: scores.wind,
      explanation: windData.explanation,
      buckets: windData.buckets,
      color: '#4ECDC4'
    },
    {
      name: 'rain',
      icon: '☔',
      label: 'Rain',
      score: scores.rain,
      explanation: rainData.explanation,
      buckets: rainData.buckets,
      color: '#95E1D3'
    },
    {
      name: 'lightness',
      icon: '🌅',
      label: 'Daylight',
      score: scores.lightness,
      explanation: daylightData.explanation,
      buckets: daylightData.buckets,
      color: '#FFA500'
    }
  ];

  return (
    <div className="scores-grid">
      {scoreCards.map((card) => (
        <div
          key={card.name}
          className={`score-card ${card.name} ${expandedCards.has(card.name) ? 'expanded' : ''}`}
          onClick={() => toggleCard(card.name)}
        >
          <div className="score-header">
            <span className="score-icon">{card.icon}</span>
            <span className="score-label">{card.label}</span>
            <span className="expand-indicator">{expandedCards.has(card.name) ? '▼' : '▶'}</span>
          </div>
          <div className="score-bar-container">
            <div
              className="score-bar"
              style={{
                width: `${card.score}%`,
                backgroundColor: card.score >= 75 ? '#4CAF50' : card.score >= 50 ? '#FFC107' : '#FF5722'
              }}
            ></div>
          </div>
          <div className="score-value">{card.score}/100</div>

          {expandedCards.has(card.name) && (
            <div className="score-explanation">
              <div className="explanation-text">{card.explanation}</div>
              {renderBuckets(card.buckets)}
              <div className="score-weight">Weight: {
                card.name === 'rain' ? '35%' :
                card.name === 'temperature' ? '25%' :
                card.name === 'wind' ? '25%' :
                card.name === 'sunshine' ? '15%' :
                'Modifier'
              }</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ScoreCards;