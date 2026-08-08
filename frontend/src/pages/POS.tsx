import { useState, useEffect } from 'react';
import { CategoryTabs } from '../components/pos/CategoryTabs';
import { ItemGrid } from '../components/pos/ItemGrid';
import { Cart } from '../components/pos/Cart';
import { useCartStore } from '../store/useCartStore';

export const POS = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const fetchMenu = useCartStore(state => state.fetchMenu);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  return (
    <div className="flex h-full gap-6">
      {/* Menu Area (60%) */}
      <div className="flex-6 flex flex-col min-w-0 bg-white rounded-xl shadow-sm border border-wfl-border overflow-hidden">
        {/* Header / Tabs */}
        <div className="px-6 pt-6 pb-4 border-b border-wfl-border bg-wfl-offwhite/50">
          <h2 className="text-xl font-bold text-wfl-brown mb-4">Menu</h2>
          <CategoryTabs 
            selected={selectedCategory} 
            onChange={setSelectedCategory} 
          />
        </div>
        
        {/* Item Grid (Scrollable) */}
        <div className="flex-1 overflow-auto p-6 bg-wfl-offwhite/20">
          <ItemGrid category={selectedCategory} />
        </div>
      </div>

      {/* Cart Area (40%) */}
      <div className="flex-4 min-w-[320px] max-w-120">
        <Cart />
      </div>
    </div>
  );
};
