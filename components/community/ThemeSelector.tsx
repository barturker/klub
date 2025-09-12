'use client';

import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Palette } from 'lucide-react';

interface ThemeSelectorProps {
  currentColor: string;
  onColorChange: (color: string) => void;
}

const PRESET_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Indigo', value: '#6366F1' },
];

export function ThemeSelector({ currentColor, onColorChange }: ThemeSelectorProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [tempColor, setTempColor] = useState(currentColor);

  const handlePresetClick = (color: string) => {
    onColorChange(color);
    setTempColor(color);
  };

  const handleCustomColorConfirm = () => {
    onColorChange(tempColor);
    setShowCustomPicker(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Theme Color</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a color that represents your community
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-lg border-2 border-gray-200"
            style={{ backgroundColor: currentColor }}
          />
          <div>
            <p className="text-sm font-medium">Current Color</p>
            <p className="text-sm text-muted-foreground">{currentColor}</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Preset Colors</p>
          <div className="grid grid-cols-8 gap-2">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                  currentColor === preset.value
                    ? 'border-gray-900 scale-110'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
                style={{ backgroundColor: preset.value }}
                onClick={() => handlePresetClick(preset.value)}
                title={preset.name}
              />
            ))}
          </div>
        </div>

        <div>
          <Popover open={showCustomPicker} onOpenChange={setShowCustomPicker}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <Palette className="w-4 h-4 mr-2" />
                Custom Color
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="start">
              <div className="space-y-4">
                <HexColorPicker color={tempColor} onChange={setTempColor} />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempColor}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                        setTempColor(value);
                      }
                    }}
                    className="flex-1 px-3 py-1 text-sm border rounded"
                    placeholder="#000000"
                    maxLength={7}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCustomColorConfirm}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium mb-2">Preview</p>
          <div className="space-y-2">
            <div
              className="px-4 py-2 text-white rounded"
              style={{ backgroundColor: currentColor }}
            >
              Primary Button
            </div>
            <div
              className="px-4 py-2 rounded border-2"
              style={{ borderColor: currentColor, color: currentColor }}
            >
              Secondary Button
            </div>
            <div
              className="h-1 rounded"
              style={{ backgroundColor: currentColor }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}