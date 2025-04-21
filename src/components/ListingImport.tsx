import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { ImportedListingData } from '@/types/listing';
import { Switch } from '@headlessui/react';

interface ListingImportProps {
  onImport: (data: ImportedListingData) => void;
}

export default function ListingImport({ onImport }: ListingImportProps) {
  const [cardType, setCardType] = useState<'where' | 'what'>('where');
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState('');

  const handleImport = () => {
    if (!content.trim()) {
      toast.error(`Please enter ${cardType === 'where' ? 'a location' : 'what you want to do'}`);
      return;
    }

    const listingData: ImportedListingData = {
      content: content.trim(),
      notes: notes.trim(),
      imageUrl: '/marker-icon-2x.png',
      cardType
    };

    try {
      onImport(listingData);
      setContent('');
      setNotes('');
      toast.success('Card added successfully');
    } catch (error) {
      console.error('Error adding card:', error);
      toast.error('Failed to add card. Please try again.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleImport();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
        <div className="px-4 py-6 sm:p-8">
          <div className="flex flex-col gap-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-semibold leading-7 text-gray-900">
                Add New Card
              </h2>
              <div className="flex items-center gap-x-3">
                <span className={`text-sm ${cardType === 'what' ? 'text-gray-900' : 'text-gray-500'}`}>What</span>
                <Switch
                  checked={cardType === 'where'}
                  onChange={() => setCardType(cardType === 'where' ? 'what' : 'where')}
                  className={`${
                    cardType === 'where' ? 'bg-indigo-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2`}
                >
                  <span
                    className={`${
                      cardType === 'where' ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </Switch>
                <span className={`text-sm ${cardType === 'where' ? 'text-gray-900' : 'text-gray-500'}`}>Where</span>
              </div>
            </div>
            <p className="text-sm leading-6 text-gray-600">
              Enter Card Details Below
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                  {cardType === 'where' ? 'Where' : 'What'}
                </label>
                <textarea
                  name="content"
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyPress={handleKeyPress}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-0 py-2 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                  placeholder={cardType === 'where' ? 'Enter location or address' : 'Enter what you want to do'}
                />
              </div>
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  name="notes"
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="mt-1 block w-full rounded-md border-0 py-3 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                  placeholder="Add any additional notes here"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8">
          <button
            type="button"
            onClick={handleImport}
            disabled={!content.trim()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Card
          </button>
        </div>
      </div>
    </div>
  );
} 