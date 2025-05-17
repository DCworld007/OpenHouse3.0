'use client';

import { useState, useRef, useEffect } from 'react';
import { Switch } from '@headlessui/react';
import { motion } from 'framer-motion';

interface IntakeCardProps {
  onSubmit: (data: { type: 'what' | 'where'; content: string; notes?: string }) => void;
  onCancel: () => void;
}

export default function IntakeCard({ onSubmit, onCancel }: IntakeCardProps) {
  const [type, setType] = useState<'what' | 'where'>('where');
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim()) return;

    onSubmit({
      type,
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
                  onChange={() => setType(type === 'where' ? 'what' : 'where')}
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
                onChange={(e) => setContent(e.target.value)}
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