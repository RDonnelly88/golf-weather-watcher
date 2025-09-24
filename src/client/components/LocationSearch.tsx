import { useState, useRef, useEffect } from 'react';

interface LocationSearchProps {
  onLocationSelect: (location: { name: string; lat: number; lon: number }) => void;
}

interface SearchResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
}

const POPULAR_COURSES = [
  { name: 'St Andrews, Scotland', lat: 56.3398, lon: -2.7967 },
  { name: 'Mearns Castle, Scotland', lat: 55.7860, lon: -4.3090 },
  { name: 'Pebble Beach, California', lat: 36.5686, lon: -121.9490 },
  { name: 'Augusta National, Georgia', lat: 33.5031, lon: -82.0197 },
];

function LocationSearch({ onLocationSelect }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchTimeout = useRef<NodeJS.Timeout>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set default location
    onLocationSelect(POPULAR_COURSES[0]);
  }, []);

  useEffect(() => {
    // Handle clicks outside dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocations = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // Search for both golf courses and general locations
      const golfQuery = searchQuery.includes('golf') ? searchQuery : `${searchQuery} golf course`;

      const [golfResponse, generalResponse] = await Promise.all([
        fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(golfQuery)}&format=json&limit=3`
        ),
        fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5`
        )
      ]);

      const golfData = await golfResponse.json();
      const generalData = await generalResponse.json();

      // Combine results, prioritizing golf courses
      const allResults = [...golfData, ...generalData];

      // Remove duplicates based on place_id
      const uniqueResults = allResults.reduce((acc: SearchResult[], current: SearchResult) => {
        const exists = acc.find(item => item.place_id === current.place_id);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);

      setResults(uniqueResults.slice(0, 8)); // Limit to 8 results
      setShowDropdown(true);
      setHighlightedIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear existing timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Search after user stops typing for 500ms
    searchTimeout.current = setTimeout(() => {
      searchLocations(value);
    }, 500);
  };

  const selectLocation = (result: SearchResult) => {
    const name = result.display_name.split(',').slice(0, 3).join(',');
    onLocationSelect({
      name,
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon)
    });
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    setHighlightedIndex(-1);
  };

  const selectPopularCourse = (course: typeof POPULAR_COURSES[0]) => {
    onLocationSelect(course);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    const totalItems = query ? results.length : POPULAR_COURSES.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % totalItems);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + totalItems) % totalItems);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          if (query && results[highlightedIndex]) {
            selectLocation(results[highlightedIndex]);
          } else if (!query && POPULAR_COURSES[highlightedIndex]) {
            selectPopularCourse(POPULAR_COURSES[highlightedIndex]);
          }
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const getLocationIcon = (result: SearchResult) => {
    const displayName = result.display_name.toLowerCase();
    if (displayName.includes('golf') || displayName.includes('country club')) {
      return '⛳';
    } else if (result.class === 'tourism' || result.type === 'attraction') {
      return '🏛️';
    } else if (result.class === 'place' && (result.type === 'city' || result.type === 'town')) {
      return '🏙️';
    }
    return '📍';
  };

  const formatDisplayName = (displayName: string) => {
    const parts = displayName.split(',');
    if (parts.length > 3) {
      return parts.slice(0, 3).join(',');
    }
    return displayName;
  };

  return (
    <div className="location-search" ref={dropdownRef}>
      <div className="search-input-wrapper">
        <input
          type="text"
          className="location-input"
          placeholder="Search for golf course or city..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
        />
        {isSearching && <span className="searching-indicator">🔍</span>}
      </div>

      {showDropdown && (
        <div className="search-dropdown">
          {!query && (
            <>
              <div className="dropdown-header">Popular Golf Courses</div>
              {POPULAR_COURSES.map((course, index) => (
                <div
                  key={course.name}
                  className={`dropdown-item ${highlightedIndex === index ? 'highlighted' : ''}`}
                  onClick={() => selectPopularCourse(course)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span className="location-icon">⛳</span>
                  <span className="location-name">{course.name}</span>
                </div>
              ))}
            </>
          )}

          {query && results.length > 0 && (
            <>
              <div className="dropdown-header">Search Results</div>
              {results.map((result, index) => (
                <div
                  key={result.place_id}
                  className={`dropdown-item ${highlightedIndex === index ? 'highlighted' : ''}`}
                  onClick={() => selectLocation(result)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span className="location-icon">{getLocationIcon(result)}</span>
                  <span className="location-name">{formatDisplayName(result.display_name)}</span>
                </div>
              ))}
            </>
          )}

          {query && results.length === 0 && !isSearching && (
            <div className="dropdown-empty">
              No locations found for "{query}"
            </div>
          )}

          {query && isSearching && (
            <div className="dropdown-loading">
              Searching...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LocationSearch;