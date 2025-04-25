'use client';

import { useState } from 'react';
import { Card } from '@prisma/client';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

interface CardFormData {
  content: string;
  notes?: string;
  imageUrl?: string;
  cardType: 'what' | 'where' | 'who' | 'when';
}

interface CardFormProps {
  card?: Card;
  onSubmit: (data: CardFormData) => Promise<void>;
  onCancel: () => void;
}

export default function CardForm({ card, onSubmit, onCancel }: CardFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<CardFormData>({
    defaultValues: card ? {
      content: card.content,
      notes: card.notes || '',
      imageUrl: card.imageUrl || '',
      cardType: card.cardType as 'what' | 'where' | 'who' | 'when',
    } : {
      cardType: 'what',
    },
  });

  const onSubmitForm = async (data: CardFormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      toast.success(card ? 'Card updated!' : 'Card created!');
    } catch (error) {
      console.error('Error submitting card:', error);
      toast.error('Failed to save card');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700">
          Content
        </label>
        <input
          type="text"
          id="content"
          {...register('content', { required: 'Content is required' })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        {errors.content && (
          <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          {...register('notes')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
          Image URL
        </label>
        <input
          type="url"
          id="imageUrl"
          {...register('imageUrl')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="cardType" className="block text-sm font-medium text-gray-700">
          Card Type
        </label>
        <select
          id="cardType"
          {...register('cardType')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="what">What</option>
          <option value="where">Where</option>
          <option value="who">Who</option>
          <option value="when">When</option>
        </select>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {isSubmitting ? 'Saving...' : card ? 'Update Card' : 'Create Card'}
        </button>
      </div>
    </form>
  );
} 