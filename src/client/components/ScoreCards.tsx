import { useEffect, useRef, useState } from 'react';

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

interface ScoreBucket {
  range: string;
  score: number;
  active?: boolean;
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

  const getTemperatureBuckets = (): ScoreBucket[] => {
    const temp = weatherData?.avgTempRaw ?? weatherData?.avgTemp ?? 0;
    return [
      { range: '< 5°C', score: 20, active: temp < 5 },
      { range: '5-10°C', score: 40, active: temp >= 5 && temp < 10 },
      { range: '10-15°C', score: 70, active: temp >= 10 && temp < 15 },
      { range: '15-20°C', score: 100, active: temp >= 15 && temp <= 20 },
      { range: '20-25°C', score: 90, active: temp > 20 && temp <= 25 },
      { range: '> 25°C', score: 60, active: temp > 25 }
    ];
  };

  const getWindBuckets = (): ScoreBucket[] => {
    const wind = weatherData?.avgWindRaw ?? weatherData?.avgWindSpeed ?? 0;
    const gust = weatherData?.maxWindGust || 0;
    const hasGustPenalty = gust > 10 && gust > wind + 10;

    // Determine base wind score bucket
    let baseScore = 100;
    let activeRange = '';
    if (wind < 2) { baseScore = 100; activeRange = '< 2 mph'; }
    else if (wind < 5) { baseScore = 95; activeRange = '2-5 mph'; }
    else if (wind < 8) { baseScore = 85; activeRange = '5-8 mph'; }
    else if (wind < 12) { baseScore = 70; activeRange = '8-12 mph'; }
    else if (wind < 15) { baseScore = 50; activeRange = '12-15 mph'; }
    else if (wind < 20) { baseScore = 30; activeRange = '15-20 mph'; }
    else { baseScore = 10; activeRange = '> 20 mph'; }

    const buckets = [
      { range: '< 2 mph', score: 100, active: activeRange === '< 2 mph' },
      { range: '2-5 mph', score: 95, active: activeRange === '2-5 mph' },
      { range: '5-8 mph', score: 85, active: activeRange === '5-8 mph' },
      { range: '8-12 mph', score: 70, active: activeRange === '8-12 mph' },
      { range: '12-15 mph', score: 50, active: activeRange === '12-15 mph' },
      { range: '15-20 mph', score: 30, active: activeRange === '15-20 mph' },
      { range: '> 20 mph', score: 10, active: activeRange === '> 20 mph' }
    ];

    if (hasGustPenalty) {
      buckets.push({
        range: `× 80% (gusts ${Math.round(gust)} mph)`,
        score: Math.round(baseScore * 0.8),
        active: true
      });
    }

    return buckets;
  };

  const getRainBuckets = (): ScoreBucket[] => {
    const rain = weatherData?.totalRain || 0;
    const chance = weatherData?.avgPrecipChance || 0;

    if (rain === 0) {
      return [
        { range: '< 10% chance', score: 100, active: chance < 10 },
        { range: '10-20% chance', score: 95, active: chance >= 10 && chance < 20 },
        { range: '20-30% chance', score: 90, active: chance >= 20 && chance < 30 },
        { range: '30-40% chance', score: 85, active: chance >= 30 && chance < 40 },
        { range: '> 40% chance', score: 80, active: chance >= 40 }
      ];
    }

    // For actual rain, calculate the base score and show probability adjustment
    let baseScore = 100;
    let activeRange = '';
    if (rain < 0.5) { baseScore = 85; activeRange = '< 0.5mm'; }
    else if (rain < 1) { baseScore = 70; activeRange = '0.5-1mm'; }
    else if (rain < 2) { baseScore = 50; activeRange = '1-2mm'; }
    else if (rain < 5) { baseScore = 25; activeRange = '2-5mm'; }
    else { baseScore = 5; activeRange = '> 5mm'; }

    const buckets = [
      { range: 'No rain', score: 100, active: false },
      { range: '< 0.5mm', score: 85, active: activeRange === '< 0.5mm' },
      { range: '0.5-1mm', score: 70, active: activeRange === '0.5-1mm' },
      { range: '1-2mm', score: 50, active: activeRange === '1-2mm' },
      { range: '2-5mm', score: 25, active: activeRange === '2-5mm' },
      { range: '> 5mm', score: 5, active: activeRange === '> 5mm' }
    ];

    // Add probability adjustment if applicable
    if (rain < 2 && chance > 0) {
      const adjustment = rain < 0.5 ? chance / 10 : rain < 1 ? chance / 15 : chance / 20;
      buckets.push({
        range: `- ${Math.round(adjustment)} (${Math.round(chance)}% prob)`,
        score: Math.round(baseScore - adjustment),
        active: true
      });
    }

    return buckets;
  };

  const getCloudBuckets = (): ScoreBucket[] => {
    const clouds = weatherData?.avgCloudCover || 0;
    return [
      { range: '< 20%', score: 100, active: clouds < 20 },
      { range: '20-40%', score: 85, active: clouds >= 20 && clouds < 40 },
      { range: '40-60%', score: 70, active: clouds >= 40 && clouds < 60 },
      { range: '60-80%', score: 50, active: clouds >= 60 && clouds < 80 },
      { range: '> 80%', score: 30, active: clouds >= 80 }
    ];
  };

  const getDaylightBuckets = (): ScoreBucket[] => {
    if (!weatherData?.startHour || !weatherData?.sunriseHour || !weatherData?.sunsetHour) {
      return [{ range: 'No data', score: 85, active: true }];
    }

    const start = weatherData.startHour;
    const end = weatherData.endHour || start + 5;
    const sunrise = weatherData.sunriseHour;
    const sunset = weatherData.sunsetHour;

    return [
      { range: 'Optimal daylight', score: 100, active: start >= sunrise + 2 && end <= sunset - 1 },
      { range: 'Full daylight', score: 85, active: start >= sunrise && end <= sunset && !(start >= sunrise + 2 && end <= sunset - 1) },
      { range: 'Early start', score: 50, active: start < sunrise && sunrise - start < 2 && end <= sunset },
      { range: 'Late finish', score: 60, active: start >= sunrise && end > sunset && end - sunset < 2 },
      { range: 'Very early', score: 10, active: start < sunrise && sunrise - start >= 2 },
      { range: 'Very late', score: 20, active: end > sunset && end - sunset >= 2 },
      { range: 'Total darkness', score: 0, active: start < sunrise && end > sunset }
    ];
  };

  const getTemperatureExplanation = () => {
    if (!weatherData) return '';
    const temp = weatherData.avgTemp || 0;
    const actualTemp = weatherData.avgTempRaw || temp;
    const displayText = actualTemp !== temp ? `${actualTemp.toFixed(1)}°C` : `${temp}°C`;

    const buckets = getTemperatureBuckets();
    const activeBucket = buckets.find(b => b.active);

    return `Temperature: ${displayText}\nScoring bracket: ${activeBucket?.range || 'Unknown'}\nScore: ${activeBucket?.score || scores.temperature}/100`;
  };

  const getWindExplanation = () => {
    if (!weatherData) return '';
    const wind = weatherData.avgWindSpeed || 0;
    const actualWind = weatherData.avgWindRaw || wind;
    const gust = weatherData.maxWindGust || 0;
    const displayText = actualWind !== wind ? `${actualWind.toFixed(1)} mph` : `${wind} mph`;

    const hasGustPenalty = gust > 10 && gust > actualWind + 10;

    // Find base bracket
    let baseBracket = '';
    if (actualWind < 2) baseBracket = '< 2 mph';
    else if (actualWind < 5) baseBracket = '2-5 mph';
    else if (actualWind < 8) baseBracket = '5-8 mph';
    else if (actualWind < 12) baseBracket = '8-12 mph';
    else if (actualWind < 15) baseBracket = '12-15 mph';
    else if (actualWind < 20) baseBracket = '15-20 mph';
    else baseBracket = '> 20 mph';

    let explanation = `Wind Speed: ${displayText}\nBase bracket: ${baseBracket}\n`;

    if (hasGustPenalty) {
      explanation += `⚠️ Gust penalty: × 80% (gusts up to ${Math.round(gust)} mph)\n`;
    }

    explanation += `Final Score: ${scores.wind}/100`;
    return explanation;
  };

  const getRainExplanation = () => {
    if (!weatherData) return '';
    const rain = weatherData.totalRain || 0;
    const chance = Math.round(weatherData.avgPrecipChance || 0);

    let explanation = '';
    if (rain === 0) {
      explanation = `No rain expected\nProbability: ${chance}%\n`;
      if (chance < 10) explanation += `Bracket: < 10% chance\n`;
      else if (chance < 20) explanation += `Bracket: 10-20% chance\n`;
      else if (chance < 30) explanation += `Bracket: 20-30% chance\n`;
      else if (chance < 40) explanation += `Bracket: 30-40% chance\n`;
      else explanation += `Bracket: > 40% chance\n`;
    } else {
      explanation = `Rain amount: ${rain.toFixed(1)}mm\n`;
      if (rain < 0.5) explanation += `Base bracket: < 0.5mm (85 points)\n`;
      else if (rain < 1) explanation += `Base bracket: 0.5-1mm (70 points)\n`;
      else if (rain < 2) explanation += `Base bracket: 1-2mm (50 points)\n`;
      else if (rain < 5) explanation += `Base bracket: 2-5mm (25 points)\n`;
      else explanation += `Base bracket: > 5mm (5 points)\n`;

      if (rain < 2 && chance > 0) {
        const adjustment = rain < 0.5 ? chance / 10 : rain < 1 ? chance / 15 : chance / 20;
        explanation += `Probability adjustment: -${Math.round(adjustment)} (${chance}% chance)\n`;
      }
    }

    explanation += `Final Score: ${scores.rain}/100`;
    return explanation;
  };

  const getSunshineExplanation = () => {
    if (!weatherData) return '';
    const clouds = Math.round(weatherData.avgCloudCover || 0);

    const buckets = getCloudBuckets();
    const activeBucket = buckets.find(b => b.active);

    return `Cloud Cover: ${clouds}%\nScoring bracket: ${activeBucket?.range || 'Unknown'}\nScore: ${scores.sunshine}/100`;
  };

  const getDaylightExplanation = () => {
    if (!weatherData || !weatherData.startHour || !weatherData.sunriseHour || !weatherData.sunsetHour) {
      return 'Daylight data not available\nScore: 85/100';
    }

    const start = weatherData.startHour;
    const end = weatherData.endHour || start + 5;
    const sunrise = weatherData.sunriseHour;
    const sunset = weatherData.sunsetHour;

    const buckets = getDaylightBuckets();
    const activeBucket = buckets.find(b => b.active);

    return `Playing: ${start}:00-${end}:00\nDaylight: ${sunrise}:00-${sunset}:00\nScoring bracket: ${activeBucket?.range || 'Unknown'}\nScore: ${scores.lightness}/100`;
  };

  const renderBuckets = (buckets: ScoreBucket[]) => {
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

  const scoreCards = [
    {
      name: 'sunshine',
      icon: '☀️',
      label: 'Cloudiness',
      score: scores.sunshine,
      explanation: getSunshineExplanation(),
      buckets: getCloudBuckets(),
      color: '#FFD700'
    },
    {
      name: 'temperature',
      icon: '🌡️',
      label: 'Temperature',
      score: scores.temperature,
      explanation: getTemperatureExplanation(),
      buckets: getTemperatureBuckets(),
      color: '#FF6B6B'
    },
    {
      name: 'wind',
      icon: '💨',
      label: 'Wind',
      score: scores.wind,
      explanation: getWindExplanation(),
      buckets: getWindBuckets(),
      color: '#4ECDC4'
    },
    {
      name: 'rain',
      icon: '☔',
      label: 'Rain',
      score: scores.rain,
      explanation: getRainExplanation(),
      buckets: getRainBuckets(),
      color: '#95E1D3'
    },
    {
      name: 'lightness',
      icon: '🌅',
      label: 'Daylight',
      score: scores.lightness,
      explanation: getDaylightExplanation(),
      buckets: getDaylightBuckets(),
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