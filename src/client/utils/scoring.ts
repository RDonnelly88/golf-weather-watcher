// Centralized scoring logic to prevent duplication and ensure consistency

export interface ScoreBucket {
  range: string;
  score: number;
  active?: boolean;
}

export interface ScoreResult {
  score: number;
  buckets: ScoreBucket[];
  explanation: string;
  baseScore?: number;
  modifier?: number;
}

// Temperature scoring thresholds
const TEMP_THRESHOLDS = [
  { min: -Infinity, max: 5, score: 20, label: '< 5°C' },
  { min: 5, max: 10, score: 40, label: '5-10°C' },
  { min: 10, max: 15, score: 70, label: '10-15°C' },
  { min: 15, max: 20, score: 100, label: '15-20°C' },
  { min: 20, max: 25, score: 90, label: '20-25°C' },
  { min: 25, max: Infinity, score: 60, label: '> 25°C' }
];

// Wind scoring thresholds
const WIND_THRESHOLDS = [
  { min: -Infinity, max: 2, score: 100, label: '< 2 mph' },
  { min: 2, max: 5, score: 95, label: '2-5 mph' },
  { min: 5, max: 8, score: 85, label: '5-8 mph' },
  { min: 8, max: 12, score: 70, label: '8-12 mph' },
  { min: 12, max: 15, score: 50, label: '12-15 mph' },
  { min: 15, max: 20, score: 30, label: '15-20 mph' },
  { min: 20, max: Infinity, score: 10, label: '> 20 mph' }
];

// Rain amount thresholds
const RAIN_AMOUNT_THRESHOLDS = [
  { min: -Infinity, max: 0.5, score: 85, label: '< 0.5mm' },
  { min: 0.5, max: 1, score: 70, label: '0.5-1mm' },
  { min: 1, max: 2, score: 50, label: '1-2mm' },
  { min: 2, max: 5, score: 25, label: '2-5mm' },
  { min: 5, max: Infinity, score: 5, label: '> 5mm' }
];

// Rain probability thresholds (when no rain)
const RAIN_PROB_THRESHOLDS = [
  { min: -Infinity, max: 10, score: 100, label: '< 10% chance' },
  { min: 10, max: 20, score: 95, label: '10-20% chance' },
  { min: 20, max: 30, score: 90, label: '20-30% chance' },
  { min: 30, max: 40, score: 85, label: '30-40% chance' },
  { min: 40, max: Infinity, score: 80, label: '> 40% chance' }
];

// Cloud cover thresholds
const CLOUD_THRESHOLDS = [
  { min: -Infinity, max: 20, score: 100, label: '< 20%' },
  { min: 20, max: 40, score: 85, label: '20-40%' },
  { min: 40, max: 60, score: 70, label: '40-60%' },
  { min: 60, max: 80, score: 50, label: '60-80%' },
  { min: 80, max: Infinity, score: 30, label: '> 80%' }
];

export function calculateTemperatureScore(temp: number): ScoreResult {
  const threshold = TEMP_THRESHOLDS.find(t => temp >= t.min && temp < t.max) || TEMP_THRESHOLDS[0];

  const buckets = TEMP_THRESHOLDS.map(t => ({
    range: t.label,
    score: t.score,
    active: t === threshold
  }));

  const explanation = `Temperature: ${temp.toFixed(1)}°C\nScoring bracket: ${threshold.label}\nScore: ${threshold.score}/100`;

  return {
    score: threshold.score,
    buckets,
    explanation
  };
}

export function calculateWindScore(windSpeed: number, gustSpeed: number): ScoreResult {
  const threshold = WIND_THRESHOLDS.find(t => windSpeed >= t.min && windSpeed < t.max) || WIND_THRESHOLDS[0];
  const hasGustPenalty = gustSpeed > 10 && gustSpeed > windSpeed + 10;

  const baseScore = threshold.score;
  const finalScore = hasGustPenalty ? Math.round(baseScore * 0.8) : baseScore;

  const buckets = WIND_THRESHOLDS.map(t => ({
    range: t.label,
    score: t.score,
    active: t === threshold
  }));

  if (hasGustPenalty) {
    buckets.push({
      range: `× 80% (gusts ${Math.round(gustSpeed)} mph)`,
      score: finalScore,
      active: true
    });
  }

  let explanation = `Wind Speed: ${windSpeed.toFixed(1)} mph\nBase bracket: ${threshold.label}\n`;
  if (hasGustPenalty) {
    explanation += `⚠️ Gust penalty: × 80% (gusts up to ${Math.round(gustSpeed)} mph)\n`;
  }
  explanation += `Final Score: ${finalScore}/100`;

  return {
    score: finalScore,
    buckets,
    explanation,
    baseScore,
    modifier: hasGustPenalty ? 0.8 : 1
  };
}

export function calculateRainScore(rainAmount: number, precipChance: number): ScoreResult {
  if (rainAmount === 0) {
    // No rain - use probability thresholds
    const threshold = RAIN_PROB_THRESHOLDS.find(t => precipChance >= t.min && precipChance < t.max) || RAIN_PROB_THRESHOLDS[0];

    const buckets = RAIN_PROB_THRESHOLDS.map(t => ({
      range: t.label,
      score: t.score,
      active: t === threshold
    }));

    const explanation = `No rain expected\nProbability: ${Math.round(precipChance)}%\nBracket: ${threshold.label}\nFinal Score: ${threshold.score}/100`;

    return {
      score: threshold.score,
      buckets,
      explanation
    };
  }

  // Has rain - use amount thresholds with probability adjustment
  const threshold = RAIN_AMOUNT_THRESHOLDS.find(t => rainAmount >= t.min && rainAmount < t.max) || RAIN_AMOUNT_THRESHOLDS[0];
  let finalScore = threshold.score;

  const buckets = [
    { range: 'No rain', score: 100, active: false },
    ...RAIN_AMOUNT_THRESHOLDS.map(t => ({
      range: t.label,
      score: t.score,
      active: t === threshold
    }))
  ];

  // Apply probability adjustment for light rain
  let adjustment = 0;
  if (precipChance > 0) {
    adjustment = rainAmount < 0.5 ? precipChance / 10 : rainAmount < 1 ? precipChance / 15 : precipChance / 20;
    finalScore = Math.round(threshold.score - adjustment);

    buckets.push({
      range: `- ${Math.round(adjustment)} (${Math.round(precipChance)}% prob)`,
      score: finalScore,
      active: true
    });
  }

  let explanation = `Rain amount: ${rainAmount.toFixed(1)}mm\nBase bracket: ${threshold.label} (${threshold.score} points)\n`;
  if (adjustment > 0) {
    explanation += `Probability adjustment: -${Math.round(adjustment)} (${Math.round(precipChance)}% chance)\n`;
  }
  explanation += `Final Score: ${finalScore}/100`;

  return {
    score: finalScore,
    buckets,
    explanation,
    baseScore: threshold.score
  };
}

export function calculateCloudScore(cloudCover: number): ScoreResult {
  const threshold = CLOUD_THRESHOLDS.find(t => cloudCover >= t.min && cloudCover < t.max) || CLOUD_THRESHOLDS[0];

  const buckets = CLOUD_THRESHOLDS.map(t => ({
    range: t.label,
    score: t.score,
    active: t === threshold
  }));

  const explanation = `Cloud Cover: ${Math.round(cloudCover)}%\nScoring bracket: ${threshold.label}\nScore: ${threshold.score}/100`;

  return {
    score: threshold.score,
    buckets,
    explanation
  };
}

export function calculateDaylightScore(
  startHour: number,
  endHour: number,
  sunriseHour: number,
  sunsetHour: number
): ScoreResult {
  let score = 85; // default
  let label = 'Unknown';

  const conditions = [
    {
      check: () => startHour >= sunriseHour + 2 && endHour <= sunsetHour - 1,
      score: 100,
      label: 'Optimal daylight'
    },
    {
      check: () => startHour >= sunriseHour && endHour <= sunsetHour && !(startHour >= sunriseHour + 2 && endHour <= sunsetHour - 1),
      score: 85,
      label: 'Shoulder hours'
    },
    {
      check: () => startHour < sunriseHour && sunriseHour - startHour < 2 && endHour <= sunsetHour,
      score: 50,
      label: 'Early start'
    },
    {
      check: () => startHour >= sunriseHour && endHour > sunsetHour && endHour - sunsetHour < 2,
      score: 60,
      label: 'Late finish'
    },
    {
      check: () => startHour < sunriseHour && sunriseHour - startHour >= 2,
      score: 10,
      label: 'Very early'
    },
    {
      check: () => endHour > sunsetHour && endHour - sunsetHour >= 2,
      score: 20,
      label: 'Very late'
    },
    {
      check: () => startHour < sunriseHour && endHour > sunsetHour,
      score: 0,
      label: 'Total darkness'
    }
  ];

  const activeCondition = conditions.find(c => c.check());
  if (activeCondition) {
    score = activeCondition.score;
    label = activeCondition.label;
  }

  const buckets = conditions.map(c => ({
    range: c.label,
    score: c.score,
    active: c === activeCondition
  }));

  const explanation = `Playing: ${startHour}:00-${endHour}:00\nDaylight: ${sunriseHour}:00-${sunsetHour}:00\nScoring bracket: ${label}\nScore: ${score}/100`;

  return {
    score,
    buckets,
    explanation
  };
}

// Main scoring function that combines all factors
export function calculateGolfScore(
  avgTemp: number,
  avgWindSpeed: number,
  maxWindGust: number,
  avgCloudCover: number,
  totalRain: number,
  avgPrecipChance: number,
  startHour?: number,
  endHour?: number,
  sunriseHour?: number,
  sunsetHour?: number
) {
  const tempResult = calculateTemperatureScore(avgTemp);
  const windResult = calculateWindScore(avgWindSpeed, maxWindGust);
  const rainResult = calculateRainScore(totalRain, avgPrecipChance);
  const cloudResult = calculateCloudScore(avgCloudCover);

  let daylightResult: ScoreResult | null = null;
  let lightnessModifier = 1.0;

  if (startHour !== undefined && endHour !== undefined && sunriseHour !== undefined && sunsetHour !== undefined) {
    daylightResult = calculateDaylightScore(startHour, endHour, sunriseHour, sunsetHour);
    lightnessModifier = daylightResult.score / 100;
  }

  // Calculate overall score with weights
  const baseScore =
    tempResult.score * 0.25 +
    windResult.score * 0.25 +
    rainResult.score * 0.35 +
    cloudResult.score * 0.15;

  const overallScore = Math.round(baseScore * lightnessModifier);

  // Generate recommendation
  let recommendation: string;
  let emoji: string;

  if (lightnessModifier === 0) {
    recommendation = "Playing in the dark? Might as well go to the pub!";
    emoji = "🌚🍺";
  } else if (lightnessModifier <= 0.2) {
    recommendation = "Finishing in darkness - this will be grim!";
    emoji = "🌚⛳";
  } else if (overallScore >= 90) {
    recommendation = "PERFECT CONDITIONS! We're going to have a ball";
    emoji = "⛳🌟";
  } else if (overallScore >= 75) {
    recommendation = "For the time of year, we'll take it.";
    emoji = "⛳😄";
  } else if (overallScore >= 60) {
    recommendation = "Decent - we've done worse";
    emoji = "⛳😊";
  } else if (overallScore >= 45) {
    recommendation = "Yuk but we'll survive!";
    emoji = "⛳🌧️";
  } else if (overallScore >= 30) {
    recommendation = "This will be grim - are we sure it's a good idea?";
    emoji = "⛳💨";
  } else {
    recommendation = "Can we get our money back and just go on the piss instead?";
    emoji = "🍺🌧️";
  }

  return {
    temperature: tempResult.score,
    wind: windResult.score,
    rain: rainResult.score,
    sunshine: cloudResult.score,
    lightness: daylightResult?.score || 85,
    overall: overallScore,
    recommendation,
    emoji,
    // Include detailed results for UI
    tempResult,
    windResult,
    rainResult,
    cloudResult,
    daylightResult
  };
}