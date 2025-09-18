# St Andrews Golf Weather Watcher ⛳

A fun little app that checks whether the weather for your golf trip to St Andrews, Scotland will be perfect for that round at the Old Course!

## Features

- 🌡️ Temperature scoring - Is it too hot, too cold, or just right?
- 💨 Wind assessment - Will your ball fly straight or end up in the rough?
- ☔ Rain prediction - Do you need waterproofs or just sunscreen?
- ☀️ Sunshine rating - Will you need sunglasses or an umbrella?
- 🏌️ Overall golf score - A combined rating from 0-100 for how good the conditions will be!

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. No API key needed! The app now uses Open-Meteo's free weather API (no registration required)

## Usage

### Web UI (NEW! 🎨)
Launch the snazzy web interface:
```bash
# Development
npm run dev:server

# Production
npm run build
npm run serve
```
Then open http://localhost:3000 in your browser!

### Command Line Interface
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Current Configuration

- **Location**: St Andrews, Scotland (hardcoded)
- **Date**: September 26, 2025
- **Tee Time**: 12:00 - 16:00

## Scoring System

The app evaluates weather conditions and provides scores for:
- **Temperature** (25% weight): Ideal range is 15-20°C
- **Wind** (35% weight): Lower wind speeds score higher
- **Rain** (25% weight): No rain = perfect score
- **Sunshine** (15% weight): Clear skies are best

Overall scores:
- 90-100: Perfect golfing conditions! ⛳🌟
- 75-89: Great day for golf! ⛳😄
- 60-74: Decent golfing weather ⛳😊
- 45-59: It's playable... pack your rain gear! ⛳🌧️
- 30-44: Only for the brave! ⛳💨
- Below 30: Maybe check the clubhouse bar hours... 🍺🌧️

## Future Extensions

- Allow custom dates and locations
- Add historical weather comparison
- Include sunrise/sunset times for early/late tee times
- Add more detailed wind direction analysis
- Support multiple weather API providers