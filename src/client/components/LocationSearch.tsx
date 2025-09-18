import { useState, useRef, useEffect } from 'react';
import { geocodeLocation } from '../utils/api';

interface LocationSearchProps {
  onLocationSelect: (location: { name: string; lat: number; lon: number }) => void;
}

const POPULAR_COURSES = [
  { name: 'St Andrews, Scotland', lat: 56.3398, lon: -2.7967 },
  { name: 'Mearns Castle, Scotland', lat: 55.7860, lon: -4.3090 },
  { name: 'Pebble Beach, California', lat: 36.5686, lon: -121.9490 },
  { name: 'Augusta National, Georgia', lat: 33.5031, lon: -82.0197 },
];

function LocationSearch({ onLocationSelect }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Set default location
    onLocationSelect(POPULAR_COURSES[0]);
  }, []);

  const searchLocation = async (searchQuery: string) => {
    if (searchQuery.length < 3) return;

    setIsSearching(true);
    const result = await geocodeLocation(searchQuery);

    if (result) {
      onLocationSelect({
        name: result.display_name.split(',').slice(0, 3).join(','),
        lat: result.lat,
        lon: result.lon
      });
      setQuery('');
      setShowSuggestions(false);
    } else {
      alert('Location not found. Please try another search.');
    }
    setIsSearching(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(value.length > 0);

    // Clear existing timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Search after user stops typing for 1 second
    if (value.length >= 3) {
      searchTimeout.current = setTimeout(() => {
        searchLocation(value);
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.length >= 3) {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
      searchLocation(query);
    }
  };

  const selectPopularCourse = (course: typeof POPULAR_COURSES[0]) => {
    onLocationSelect(course);
    setQuery('');
    setShowSuggestions(false);
  };

  return (
    <div className="location-search">
      <div className="search-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="location-input"
          placeholder="Search for any golf course or city..."
          value={query}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        {isSearching && <span className="searching-indicator">🔍</span>}
      </div>

      {showSuggestions && !query && (
        <div className="suggestions-dropdown">
          <div className="suggestions-header">Popular Golf Courses</div>
          {POPULAR_COURSES.map(course => (
            <div
              key={course.name}
              className="suggestion-item"
              onClick={() => selectPopularCourse(course)}
            >
              ⛳ {course.name}
            </div>
          ))}
        </div>
      )}

      {query.length > 0 && query.length < 3 && (
        <div className="search-hint">Type at least 3 characters to search...</div>
      )}
    </div>
  );
}

export default LocationSearch;