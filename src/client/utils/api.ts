import { WeatherData, GolfWeatherScore } from '../types';

// Geocoding API to get lat/lon from location name
export async function geocodeLocation(query: string): Promise<{ lat: number; lon: number; display_name: string } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
    );
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        display_name: data[0].display_name
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Fetch weather directly from Open-Meteo API
export async function fetchWeatherForecast(
  targetDate: Date,
  latitude: number,
  longitude: number,
  startHour: number = 12
): Promise<WeatherData[]> {
  const url = `https://api.open-meteo.com/v1/forecast`;
  const dateStr = targetDate.toISOString().split('T')[0];
  const endHour = startHour + 5; // 5 hour round of golf

  try {
    const response = await fetch(url + '?' + new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      hourly: 'temperature_2m,precipitation,rain,weathercode,cloudcover,windspeed_10m,windgusts_10m,precipitation_probability',
      start_date: dateStr,
      end_date: dateStr,
      timezone: 'auto'
    }));

    const data = await response.json();
    const hourlyData = data.hourly;
    const weatherData: WeatherData[] = [];

    // Get data for the golf round hours (start time + 5 hours)
    for (let i = startHour; i < Math.min(endHour, hourlyData.time.length); i++) {
      if (i < hourlyData.time.length) {
        const weatherCode = hourlyData.weathercode[i];
        let weatherMain = 'Clear';
        let weatherDesc = 'clear sky';

        // Weather codes: https://open-meteo.com/en/docs
        if (weatherCode === 0) {
          weatherMain = 'Clear';
          weatherDesc = 'clear sky';
        } else if (weatherCode <= 3) {
          weatherMain = 'Clouds';
          weatherDesc = weatherCode === 1 ? 'mainly clear' : weatherCode === 2 ? 'partly cloudy' : 'overcast';
        } else if (weatherCode <= 49) {
          weatherMain = 'Fog';
          weatherDesc = 'foggy';
        } else if (weatherCode >= 51 && weatherCode <= 55) {
          // Drizzle codes - check actual rain amount
          if (hourlyData.rain[i] > 0 || hourlyData.precipitation[i] > 0.2) {
            weatherMain = 'Drizzle';
            weatherDesc = 'light drizzle';
          } else {
            weatherMain = 'Clouds';
            weatherDesc = 'cloudy';
          }
        } else if (weatherCode >= 56 && weatherCode <= 57) {
          weatherMain = 'Drizzle';
          weatherDesc = 'freezing drizzle';
        } else if (weatherCode >= 61 && weatherCode <= 67) {
          weatherMain = 'Rain';
          weatherDesc = weatherCode <= 63 ? 'light rain' : 'moderate rain';
        } else if (weatherCode >= 71 && weatherCode <= 77) {
          weatherMain = 'Snow';
          weatherDesc = 'snow';
        } else if (weatherCode >= 80 && weatherCode <= 82) {
          weatherMain = 'Rain';
          weatherDesc = 'rain showers';
        } else if (weatherCode >= 95) {
          weatherMain = 'Thunderstorm';
          weatherDesc = 'thunderstorm';
        } else {
          weatherMain = 'Clouds';
          weatherDesc = 'cloudy';
        }

        weatherData.push({
          dt: new Date(hourlyData.time[i]).getTime() / 1000,
          main: {
            temp: hourlyData.temperature_2m[i],
            feels_like: hourlyData.temperature_2m[i] - (hourlyData.windspeed_10m[i] / 10),
            humidity: 70
          },
          weather: [{
            id: weatherCode,
            main: weatherMain,
            description: weatherDesc
          }],
          wind: {
            speed: hourlyData.windspeed_10m[i] / 3.6, // km/h to m/s
            gust: hourlyData.windgusts_10m[i] / 3.6
          },
          rain: hourlyData.rain[i] > 0 ? { '3h': hourlyData.rain[i] } : undefined,
          clouds: {
            all: hourlyData.cloudcover[i]
          },
          precipitationProbability: hourlyData.precipitation_probability?.[i] || 0
        });
      }
    }

    if (weatherData.length === 0) {
      // Return demo data if date is too far in future
      const demoData: WeatherData = {
        dt: targetDate.getTime() / 1000,
        main: {
          temp: 14,
          feels_like: 12,
          humidity: 75
        },
        weather: [{
          id: 2,
          main: 'Clouds',
          description: 'partly cloudy'
        }],
        wind: {
          speed: 6,
          gust: 9
        },
        clouds: {
          all: 40
        },
        precipitationProbability: 15
      };
      return [demoData];
    }

    return weatherData;
  } catch (error) {
    console.error('Weather API error:', error);
    throw new Error('Failed to fetch weather data');
  }
}

export function calculateGolfScore(weatherData: WeatherData[]): GolfWeatherScore {
  console.log('Weather data for scoring:', weatherData);
  const avgTemp = weatherData.reduce((sum, w) => sum + w.main.temp, 0) / weatherData.length;
  const avgWindSpeed = weatherData.reduce((sum, w) => sum + w.wind.speed, 0) / weatherData.length;
  const maxWindGust = Math.max(...weatherData.map(w => w.wind.gust || w.wind.speed));
  const avgCloudCover = weatherData.reduce((sum, w) => sum + w.clouds.all, 0) / weatherData.length;
  const totalRain = weatherData.reduce((sum, w) => (w.rain?.['3h'] || 0) + sum, 0);

  // Only consider it rainy if there's actual precipitation, not just cloudy weather codes
  const hasRain = totalRain > 0.1;

  let tempScore = 100;
  if (avgTemp < 5) tempScore = 20;
  else if (avgTemp < 10) tempScore = 40;
  else if (avgTemp < 15) tempScore = 70;
  else if (avgTemp <= 20) tempScore = 100;
  else if (avgTemp <= 25) tempScore = 90;
  else tempScore = 60;

  let windScore = 100;
  if (avgWindSpeed < 2) windScore = 100;
  else if (avgWindSpeed < 5) windScore = 95;
  else if (avgWindSpeed < 8) windScore = 85;
  else if (avgWindSpeed < 12) windScore = 70;
  else if (avgWindSpeed < 15) windScore = 50;
  else if (avgWindSpeed < 20) windScore = 30;
  else windScore = 10;

  if (maxWindGust > avgWindSpeed * 1.5 || maxWindGust > 15) {
    windScore *= 0.8;
  }

  let rainScore = 100;
  if (totalRain === 0 && !hasRain) rainScore = 100;
  else if (totalRain < 0.5) rainScore = 85;
  else if (totalRain < 1) rainScore = 70;
  else if (totalRain < 2) rainScore = 50;
  else if (totalRain < 5) rainScore = 25;
  else rainScore = 5;

  let sunshineScore = 100;
  if (avgCloudCover < 20) sunshineScore = 100;
  else if (avgCloudCover < 40) sunshineScore = 85;
  else if (avgCloudCover < 60) sunshineScore = 70;
  else if (avgCloudCover < 80) sunshineScore = 50;
  else sunshineScore = 30;

  const overallScore = Math.round(
    tempScore * 0.25 +
    windScore * 0.25 +
    rainScore * 0.35 +
    sunshineScore * 0.15
  );

  let recommendation: string;
  let emoji: string;

  if (overallScore >= 90) {
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
    temperature: Math.round(tempScore),
    wind: Math.round(windScore),
    rain: Math.round(rainScore),
    sunshine: Math.round(sunshineScore),
    overall: overallScore,
    recommendation,
    emoji
  };
}