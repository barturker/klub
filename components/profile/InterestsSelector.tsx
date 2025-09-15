'use client';

import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface InterestsSelectorProps {
  value: string[];
  onChange: (interests: string[]) => void;
  maxInterests?: number;
  placeholder?: string;
  label?: string;
  className?: string;
}

const SUGGESTED_INTERESTS = [
  'Technology',
  'Design',
  'Business',
  'Marketing',
  'Development',
  'Photography',
  'Music',
  'Sports',
  'Gaming',
  'Travel',
  'Food',
  'Art',
  'Science',
  'Education',
  'Health',
  'Fitness',
  'Movies',
  'Books',
  'Writing',
  'Entrepreneurship',
];

export function InterestsSelector({
  value = [],
  onChange,
  maxInterests = 10,
  placeholder = 'Type an interest and press Enter',
  label = 'Interests',
  className,
}: InterestsSelectorProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = SUGGESTED_INTERESTS.filter(
    (interest) =>
      !value.includes(interest) &&
      interest.toLowerCase().includes(inputValue.toLowerCase())
  );

  const addInterest = (interest: string) => {
    const trimmedInterest = interest.trim();
    if (
      trimmedInterest &&
      !value.includes(trimmedInterest) &&
      value.length < maxInterests
    ) {
      onChange([...value, trimmedInterest]);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const removeInterest = (interestToRemove: string) => {
    onChange(value.filter((interest) => interest !== interestToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addInterest(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      // Remove last interest when backspace is pressed on empty input
      removeInterest(value[value.length - 1]);
    }
  };

  return (
    <div className={className}>
      <Label htmlFor="interests-input">{label}</Label>
      <div className="space-y-3 mt-2">
        <div className="relative">
          <Input
            id="interests-input"
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={
              value.length >= maxInterests
                ? `Maximum ${maxInterests} interests reached`
                : placeholder
            }
            disabled={value.length >= maxInterests}
          />

          {showSuggestions && inputValue && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
              {filteredSuggestions.slice(0, 5).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addInterest(suggestion);
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {value.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {value.map((interest) => (
              <Badge
                key={interest}
                variant="secondary"
                className="pl-2 pr-1 py-1 flex items-center gap-1"
              >
                {interest}
                <button
                  type="button"
                  onClick={() => removeInterest(interest)}
                  className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                  <span className="sr-only">Remove {interest}</span>
                </button>
              </Badge>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {value.length}/{maxInterests} interests added
        </p>

        {value.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Suggestions:</p>
            <div className="flex flex-wrap gap-1">
              {SUGGESTED_INTERESTS.slice(0, 8).map((suggestion) => (
                <Badge
                  key={suggestion}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => addInterest(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}