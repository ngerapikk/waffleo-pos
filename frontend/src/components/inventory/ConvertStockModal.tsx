import React, { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useInventoryStore } from '../../store/useInventoryStore';
import type { Ingredient } from '../../store/useInventoryStore';

interface Props {
  ingredients: Ingredient[];
  onClose: () => void;
}

export function ConvertStockModal({ ingredients, onClose }: Props) {
  const { convertStock } = useInventoryStore();
  
  // Pre-select Gula Kabung as Input and Gula Aren as Output if they exist
  // In a real generic app, we'd have a dropdown, but per spec this is "Gula Aren-style"
  const defaultInput = ingredients.find(i => i.name.toLowerCase().includes('kabung'))?.id || '';
  const defaultOutput = ingredients.find(i => i.name.toLowerCase().includes('gula aren'))?.id || '';

  const [inputIngredientId, setInputIngredientId] = useState(defaultInput);
  const [outputIngredientId, setOutputIngredientId] = useState(defaultOutput);
  const [inputQty, setInputQty] = useState('');
  const [outputQty, setOutputQty] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = 
    inputIngredientId !== '' && 
    outputIngredientId !== '' && 
    !isNaN(Number(inputQty)) && Number(inputQty) > 0 &&
    !isNaN(Number(outputQty)) && Number(outputQty) > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await convertStock(
        inputIngredientId,
        Number(inputQty),
        outputIngredientId,
        Number(outputQty)
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to convert stock');
      setIsSubmitting(false);
    }
  };

  const inputIngredient = ingredients.find(i => i.id === inputIngredientId);
  const outputIngredient = ingredients.find(i => i.id === outputIngredientId);

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-200 max-w-[95vw] overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Convert Stock</h2>
            <p className="text-sm text-gray-500 mt-1">
              Process raw materials into derived ingredients
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
            {/* Input Side */}
            <div className="flex-1 space-y-4 w-full">
              <div className="bg-red-50 text-red-700 p-2 rounded text-center text-sm font-semibold uppercase tracking-wider">
                Consume (Input)
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Raw Material</label>
                <select
                  value={inputIngredientId}
                  onChange={(e) => setInputIngredientId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Select ingredient...</option>
                  {ingredients.filter(i => i.name === 'Gula Kabung').map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Used</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={inputQty}
                    onChange={(e) => setInputQty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    placeholder="e.g. 2"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400 text-sm">
                    {inputIngredient?.unit || ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="md:mt-14 text-gray-400 transform rotate-90 md:rotate-0">
              <ArrowRight size={24} />
            </div>

            {/* Output Side */}
            <div className="flex-1 space-y-4 w-full">
              <div className="bg-green-50 text-green-700 p-2 rounded text-center text-sm font-semibold uppercase tracking-wider">
                Produce (Output)
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Derived Ingredient</label>
                <select
                  value={outputIngredientId}
                  onChange={(e) => setOutputIngredientId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Select ingredient...</option>
                  {ingredients.filter(i => i.name === 'Gula Aren').map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Produced</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={outputQty}
                    onChange={(e) => setOutputQty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    placeholder="e.g. 500"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400 text-sm">
                    {outputIngredient?.unit || ''}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isSubmitting ? (
                'Processing...'
              ) : (
                <>
                  Confirm Conversion
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
