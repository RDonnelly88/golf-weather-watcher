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

  // Only penalize for gusts if they're significantly high (>10 m/s) AND substantially higher than avg wind
  if (maxWindGust > 10 && maxWindGust > avgWindSpeed + 10) {
    windScore *= 0.8;
  }

  let rainScore = 100;

  // Consider both actual rain amount and precipitation probability
  if (totalRain === 0 && !hasRain) {
    // Adjust based on precipitation chance even if no rain predicted
    if (avgPrecipChance < 10) rainScore = 100;
    else if (avgPrecipChance < 20) rainScore = 95;
    else if (avgPrecipChance < 30) rainScore = 90;
    else if (avgPrecipChance < 40) rainScore = 85;
    else rainScore = 80;
  }
  else if (totalRain < 0.5) {
    rainScore = 85 - (avgPrecipChance / 10); // Reduce slightly based on precip chance
  }
  else if (totalRain < 1) {
    rainScore = 70 - (avgPrecipChance / 15);
  }
  else if (totalRain < 2) {
    rainScore = 50 - (avgPrecipChance / 20);
  }
  else if (totalRain < 5) {
    rainScore = 25;
  }
  else {
    rainScore = 5;
  }

  let sunshineScore = 100;
  if (avgCloudCover < 20) sunshineScore = 100;
  else if (avgCloudCover < 40) sunshineScore = 85;
  else if (avgCloudCover < 60) sunshineScore = 70;
  else if (avgCloudCover < 80) sunshineScore = 50;
  else sunshineScore = 30;

  // Calculate lightness/daylight modifier
  let lightnessModifier = 1.0; // Default to no modification
  let lightnessScore = 85; // Default score when no sunrise/sunset data

  // Check if we have valid sunrise/sunset data
  if (startHour !== undefined && sunrise && sunset && sunrise !== '' && sunset !== '') {
    const sunriseHour = parseInt(sunrise.split('T')[1].split(':')[0]);
    const sunsetHour = parseInt(sunset.split('T')[1].split(':')[0]);
    const endHour = startHour + roundLength; // Dynamic round length

    // Calculate daylight hours available
    const daylightHours = sunsetHour - sunriseHour;
    const optimalStart = sunriseHour + 2; // Best to start 2 hours after sunrise
    const optimalEnd = sunsetHour - 1; // Best to finish 1 hour before sunset

    // Calculate daylight score and modifier (they should be the same)
    if (startHour >= optimalStart && endHour <= optimalEnd) {
      lightnessScore = 100; // Perfect daylight timing
      lightnessModifier = 1.0;
    } else if (startHour >= sunriseHour && endHour <= sunsetHour) {
      // Fully in daylight but not optimal times
      lightnessScore = 85;
      lightnessModifier = 0.85;
    } else if (startHour < sunriseHour && endHour > sunsetHour) {
      // Playing entirely in darkness - absolutely terrible
      lightnessScore = 0;
      lightnessModifier = 0;
    } else if (startHour < sunriseHour) {
      // Starting before sunrise but finishing in daylight
      const hoursBeforeSunrise = sunriseHour - startHour;
      if (hoursBeforeSunrise >= 2) {
        lightnessScore = 10; // Starting way too early
        lightnessModifier = 0.1;
      } else {
        lightnessScore = 50; // Starting a bit early (shoulder period)
        lightnessModifier = 0.5;
      }
    } else if (endHour > sunsetHour) {
      // Starting in daylight but finishing after sunset
      const hoursAfterSunset = endHour - sunsetHour;
      if (hoursAfterSunset >= 2) {
        lightnessScore = 20; // Finishing way too late
        lightnessModifier = 0.2;
      } else {
        lightnessScore = 60; // Finishing a bit late (shoulder period)
        lightnessModifier = 0.6;
      }
    }

    // Additional penalty for very short winter days
    if (daylightHours < 9) {
      lightnessModifier *= 0.9; // 10% additional reduction for short winter days
    }
  }

  // Calculate base score from weather conditions
  const baseScore =
    tempScore * 0.25 +
    windScore * 0.25 +
    rainScore * 0.35 +
    sunshineScore * 0.15;

  // Apply daylight modifier - if it's dark, nothing else matters much
  const overallScore = Math.round(baseScore * lightnessModifier);

  let recommendation: string;
  let emoji: string;

  // Special case for darkness
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
    temperature: Math.round(tempScore),
    wind: Math.round(windScore),
    rain: Math.round(rainScore),
    sunshine: Math.round(sunshineScore),
    lightness: Math.round(lightnessScore),
    overall: overallScore,
    recommendation,
    emoji
  };
}