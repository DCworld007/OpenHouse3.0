'use client';

import { useState, useRef, useEffect } from 'react';
import { Switch } from '@headlessui/react';
import { motion } from 'framer-motion';
import { validateLocationInput } from '../lib/locationValidator';

interface IntakeCardProps {
  onSubmit: (data: { type: 'what' | 'where'; content: string; notes?: string }) => void;
  onCancel: () => void;
}

// Common location indicators
const LOCATION_PATTERNS = [
  /\b(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|plaza|square|sq|highway|hwy|freeway|fwy)\b/i,
  /\b(?:north|south|east|west|n\.?|s\.?|e\.?|w\.?)\b/i,
  /\b(?:city|town|village|county|district|region|province|state|country)\b/i,
  /\b(?:park|beach|mountain|lake|river|forest|mall|airport|station|museum|cafe|restaurant|hotel)\b/i,
  /\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct)/i,
  /[A-Z][a-z]+(?:,\s*[A-Z][a-z]+)+/,  // Matches patterns like "New York, NY" or "Paris, France"
  // Add common countries and major cities
  /\b(?:Afghanistan|Albania|Algeria|Andorra|Angola|Argentina|Armenia|Australia|Austria|Azerbaijan|Bahamas|Bahrain|Bangladesh|Barbados|Belarus|Belgium|Belize|Benin|Bhutan|Bolivia|Bosnia|Brazil|Brunei|Bulgaria|Burkina Faso|Burundi|Cambodia|Cameroon|Canada|Chad|Chile|China|Colombia|Congo|Costa Rica|Croatia|Cuba|Cyprus|Czech Republic|Denmark|Djibouti|Dominican Republic|Ecuador|Egypt|El Salvador|England|Eritrea|Estonia|Ethiopia|Fiji|Finland|France|Gabon|Gambia|Georgia|Germany|Ghana|Greece|Grenada|Guatemala|Guinea|Guyana|Haiti|Honduras|Hungary|Iceland|India|Indonesia|Iran|Iraq|Ireland|Israel|Italy|Jamaica|Japan|Jordan|Kazakhstan|Kenya|Kuwait|Kyrgyzstan|Laos|Latvia|Lebanon|Lesotho|Liberia|Libya|Liechtenstein|Lithuania|Luxembourg|Macedonia|Madagascar|Malawi|Malaysia|Maldives|Mali|Malta|Mauritania|Mauritius|Mexico|Moldova|Monaco|Mongolia|Montenegro|Morocco|Mozambique|Myanmar|Namibia|Nepal|Netherlands|New Zealand|Nicaragua|Niger|Nigeria|North Korea|Norway|Oman|Pakistan|Panama|Papua New Guinea|Paraguay|Peru|Philippines|Poland|Portugal|Qatar|Romania|Russia|Rwanda|Samoa|Saudi Arabia|Senegal|Serbia|Seychelles|Sierra Leone|Singapore|Slovakia|Slovenia|Somalia|South Africa|South Korea|South Sudan|Spain|Sri Lanka|Sudan|Suriname|Swaziland|Sweden|Switzerland|Syria|Taiwan|Tajikistan|Tanzania|Thailand|Togo|Tonga|Trinidad|Tunisia|Turkey|Turkmenistan|Uganda|Ukraine|United Arab Emirates|United Kingdom|United States|Uruguay|Uzbekistan|Vatican City|Venezuela|Vietnam|Yemen|Zambia|Zimbabwe)\b/i,
  // Add major cities
  /\b(?:Tokyo|Delhi|Shanghai|São Paulo|Mexico City|Cairo|Mumbai|Beijing|Dhaka|Osaka|New York|Karachi|Buenos Aires|Istanbul|Kolkata|Manila|Lagos|Rio de Janeiro|Tianjin|Kinshasa|Guangzhou|Los Angeles|Moscow|Shenzhen|Lahore|Bangalore|Paris|Bogotá|Jakarta|Chennai|Lima|Bangkok|Seoul|Nagoya|Hyderabad|London|Tehran|Chicago|Chengdu|Nanjing|Wuhan|Ho Chi Minh City|Luanda|Ahmedabad|Kuala Lumpur|Hong Kong|Dongguan|Foshan|Surat|Singapore|Baghdad|Barcelona|Johannesburg|Berlin|Madrid|Rome|Taipei|Sydney|Melbourne|Brisbane|Perth|Auckland)\b/i
];

export default function IntakeCard({ onSubmit, onCancel }: IntakeCardProps) {
  const [type, setType] = useState<'what' | 'where'>('what');
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState('');
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true);
  const [manuallySelected, setManuallySelected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const detectLocationType = (text: string): boolean => {
    return LOCATION_PATTERNS.some(pattern => pattern.test(text));
  };

  const handleContentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    if (autoDetectEnabled && !manuallySelected && newContent.trim()) {
      const result = await validateLocationInput(newContent);
      setType(result.isValid ? 'where' : 'what');
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim()) return;

    let finalType = type;
    if (autoDetectEnabled) {
      const result = await validateLocationInput(content);
      finalType = result.isValid ? 'where' : 'what';
    }

    onSubmit({
      type: finalType,
      content: content.trim(),
      notes: notes.trim() || undefined,
    });

    setContent('');
    setNotes('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="flex justify-center">
      <motion.div
        layout
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow sm:rounded-lg overflow-hidden w-[600px]"
      >
        <div className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 bg-gray-50 rounded-full px-3 py-1">
                <span className={`text-sm ${type === 'what' ? 'text-gray-900' : 'text-gray-500'}`}>
                  What
                </span>
                <Switch
                  checked={type === 'where'}
                  onChange={() => {
                    setManuallySelected(true);
                    setType(type === 'where' ? 'what' : 'where');
                  }}
                  className={`${
                    type === 'where' ? 'bg-indigo-600' : 'bg-gray-200'
                  } relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2`}
                >
                  <span
                    className={`${
                      type === 'where' ? 'translate-x-5' : 'translate-x-1'
                    } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                  />
                </Switch>
                <span className={`text-sm ${type === 'where' ? 'text-gray-900' : 'text-gray-500'}`}>
                  Where
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAutoDetectEnabled(!autoDetectEnabled);
                  setManuallySelected(false);
                }}
                className={`text-xs px-2 py-1 rounded ${
                  autoDetectEnabled 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-gray-50 text-gray-500'
                }`}
              >
                Auto-detect {autoDetectEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                {type === 'what' ? 'What do you want to do?' : 'Where do you want to go?'}
              </label>
              <input
                ref={inputRef}
                id="content"
                type="text"
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                className="block w-full rounded-md border-0 px-3 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="Enter details here"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onKeyDown={handleKeyDown}
                className="block w-full rounded-md border-0 px-3 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="Add any additional information"
                rows={2}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded px-2 py-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!content.trim()}
                className="rounded bg-indigo-600 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Card
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
} 