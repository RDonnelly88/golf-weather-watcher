export interface WeatherData {
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
  }>;
  wind: {
    speed: number;
    gust?: number;
    direction?: number;
  };
  rain?: number;
  clouds: {
    all: number;
  };
  precipitationProbability?: number;
}

export interface GolfWeatherScore {
  temperature: number;
  wind: number;
  rain: number;
  sunshine: number;
  lightness: number;
  overall: number;
  recommendation: string;
  emoji: string;
}