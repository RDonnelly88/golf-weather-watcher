import { WeatherData, GolfWeatherScore } from '../types';
import { calculateGolfScore as calculateScore } from './scoring';

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
  startHour: number = 12,
  roundLength: number = 5
): Promise<{ weatherData: WeatherData[], sunrise: string, sunset: string }> {
  const url = `https://api.open-meteo.com/v1/forecast`;
  const dateStr = targetDate.toISOString().split('T')[0];
  const endHour = startHour + roundLength; // Dynamic round length

  try {
    const response = await fetch(url + '?' + new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      hourly: 'temperature_2m,precipitation,weathercode,cloudcover,windspeed_10m,windgusts_10m,winddirection_10m,precipitation_probability,uv_index,apparent_temperature,relativehumidity_2m,dewpoint_2m,visibility,pressure_msl,surface_pressure',
      daily: 'sunrise,sunset',
      start_date: dateStr,
      end_date: dateStr,
      timezone: 'auto',
      wind_speed_unit: 'mph',


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
          if (hourlyData.precipitation[i] > 0.2) {
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
            feels_like: hourlyData.apparent_temperature?.[i] || hourlyData.temperature_2m[i] - (hourlyData.windspeed_10m[i] / 10),
            humidity: hourlyData.relativehumidity_2m?.[i] || 70,
            pressure: hourlyData.pressure_msl?.[i] || 1013,
            dewPoint: hourlyData.dewpoint_2m?.[i]
          },
          weather: [{
            id: weatherCode,
            main: weatherMain,
            description: weatherDesc
          }],
          wind: {
            speed: hourlyData.windspeed_10m[i],
            gust: hourlyData.windgusts_10m[i],
            direction: hourlyData.winddirection_10m[i] // degrees (0=N, 90=E, 180=S, 270=W)
          },
          rain: hourlyData.precipitation?.[i] || 0,
          clouds: {
            all: hourlyData.cloudcover[i]
          },
          precipitationProbability: hourlyData.precipitation_probability?.[i] || 0,
          uvIndex: hourlyData.uv_index?.[i] || 0,
          visibility: hourlyData.visibility?.[i] || 10000,
          surfacePressure: hourlyData.surface_pressure?.[i] || 1013
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
      return {
        weatherData: [demoData],
        sunrise: '',
        sunset: ''
      };
    }

    return {
      weatherData,
      sunrise: data.daily?.sunrise?.[0] || '',
      sunset: data.daily?.sunset?.[0] || ''
    };
  } catch (error) {
    console.error('Weather API error:', error);
    throw new Error('Failed to fetch weather data');
  }
}

export function calculateGolfScore(weatherData: WeatherData[], startHour?: number, sunrise?: string, sunset?: string, roundLength: number = 5): GolfWeatherScore {
  console.log('Weather data for scoring:', weatherData);
  const avgTemp = weatherData.reduce((sum, w) => sum + w.main.temp, 0) / weatherData.length;
  const avgWindSpeed = weatherData.reduce((sum, w) => sum + w.wind.speed, 0) / weatherData.length;
  const maxWindGust = Math.max(...weatherData.map(w => w.wind.gust || w.wind.speed));
  const avgCloudCover = weatherData.reduce((sum, w) => sum + w.clouds.all, 0) / weatherData.length;
  const totalRain = weatherData.reduce((sum, w) => (w.rain || 0) + sum, 0);
  const avgPrecipChance = weatherData.reduce((sum, w) => sum + (w.precipitationProbability || 0), 0) / weatherData.length;

  // Parse sunrise/sunset if available
  let sunriseHour: number | undefined;
  let sunsetHour: number | undefined;
  let endHour: number | undefined;

  if (startHour !== undefined && sunrise && sunset && sunrise !== '' && sunset !== '') {
    sunriseHour = parseInt(sunrise.split('T')[1].split(':')[0]);
    sunsetHour = parseInt(sunset.split('T')[1].split(':')[0]);
    endHour = startHour + roundLength;
  }

  // Use centralized scoring function
  const result = calculateScore(
    avgTemp,
    avgWindSpeed,
    maxWindGust,
    avgCloudCover,
    totalRain,
    avgPrecipChance,
    startHour,
    endHour,
    sunriseHour,
    sunsetHour
  );

  return {
    temperature: result.temperature,
    wind: result.wind,
    rain: result.rain,
    sunshine: result.sunshine,
    lightness: result.lightness,
    overall: result.overall,
    recommendation: result.recommendation,
    emoji: result.emoji
  };
}