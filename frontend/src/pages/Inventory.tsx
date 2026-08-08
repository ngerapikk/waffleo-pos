import { useState, useEffect } from 'react';
import { Package, RefreshCw, Search, Edit2 } from 'lucide-react';
import { useInventoryStore } from '../store/useInventoryStore';
import type { Ingredient } from '../store/useInventoryStore';
import { AdjustStockModal } from '../components/inventory/AdjustStockModal';
import { ConvertStockModal } from '../components/inventory/ConvertStockModal';
import { ProduceStockModal } from '../components/inventory/ProduceStockModal';

// Dummy role for now since Auth is not fully implemented. 
// In a real app, this comes from an Auth Context.
const CURRENT_ROLE = 'ADMIN' as string; 

export function Inventory() {
  const { ingredients, inventoryItems, isLoading, fetchInventory } = useInventoryStore();
  
  const [activeTab, setActiveTab] = useState<'WAFFLE_ITEMS' | 'DRINK_ITEMS' | 'OTHER_ITEMS' | 'INVENTORIES'>('WAFFLE_ITEMS');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [produceModalOpen, setProduceModalOpen] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const filteredIngredients = ingredients.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOthers = inventoryItems.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const WAFFLE_GROUPS = ['Waffle Batter Base', 'Flavour Essences', 'Toppings', 'Add-ons', 'Batter'];
  const DRINK_GROUPS = ['Drinks Base', 'Drinks Derived', 'Drinks Flavour'];
  
  // Custom items that should be in Etc regardless of their group
  const ETC_ITEMS = ['Gula Pasir'];

  const isWaffleItem = (i: Ingredient) => WAFFLE_GROUPS.includes(i.ingredientGroup || '') && !ETC_ITEMS.includes(i.name);
  const isDrinkItem = (i: Ingredient) => DRINK_GROUPS.includes(i.ingredientGroup || '') && !ETC_ITEMS.includes(i.name);
  const isEtcItem = (i: Ingredient) => !isWaffleItem(i) && !isDrinkItem(i);

  const waffleIngredients = filteredIngredients.filter(isWaffleItem);
  const drinkIngredients = filteredIngredients.filter(isDrinkItem);
  const etcIngredients = filteredIngredients.filter(isEtcItem);

  const isSupervisorOrAdmin = CURRENT_ROLE === 'SUPERVISOR' || CURRENT_ROLE === 'ADMIN';

  const handleAdjustClick = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setAdjustModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500">Monitor and manage your stock levels</p>
        </div>
        
        {isSupervisorOrAdmin && (
          <div className="flex gap-3">
            <button
              onClick={() => setProduceModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Package size={20} />
              Produce Stock
            </button>
            <button
              onClick={() => setConvertModalOpen(true)}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <RefreshCw size={20} />
              Convert Stock
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('WAFFLE_ITEMS')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                activeTab === 'WAFFLE_ITEMS' ? 'bg-white text-wfl-brown shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Waffle Items
            </button>
            <button
              onClick={() => setActiveTab('DRINK_ITEMS')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                activeTab === 'DRINK_ITEMS' ? 'bg-white text-wfl-brown shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Drink Items
            </button>
            <button
              onClick={() => setActiveTab('OTHER_ITEMS')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                activeTab === 'OTHER_ITEMS' ? 'bg-white text-wfl-brown shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Other Items
            </button>
            <button
              onClick={() => setActiveTab('INVENTORIES')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                activeTab === 'INVENTORIES' ? 'bg-white text-wfl-brown shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Inventories
            </button>
          </div>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : activeTab === 'WAFFLE_ITEMS' || activeTab === 'DRINK_ITEMS' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-sm text-gray-500">
                  <th className="pb-3 font-medium">Item Name</th>
                  <th className="pb-3 font-medium">Group</th>
                  <th className="pb-3 font-medium">Current Stock</th>
                  <th className="pb-3 font-medium">Unit</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {(activeTab === 'WAFFLE_ITEMS' ? waffleIngredients : drinkIngredients).map(item => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-wfl-cream flex items-center justify-center text-wfl-brown">
                          <Package size={16} />
                        </div>
                        <span className="font-medium text-gray-900">{item.name}</span>
                        {item.isDerived && (
                          <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Derived
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 text-gray-500">{item.ingredientGroup || '-'}</td>
                    <td className="py-4 font-mono font-medium text-gray-900">
                      {Number(item.currentStock).toLocaleString()}
                    </td>
                    <td className="py-4 text-gray-500">{item.unit}</td>
                    <td className="py-4 text-right">
                      {isSupervisorOrAdmin && (
                        <button
                          onClick={() => handleAdjustClick(item)}
                          className="p-2 text-gray-400 hover:text-wfl-brown hover:bg-wfl-cream rounded-lg transition-colors"
                          title="Adjust Stock"
                        >
                          <Edit2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {(activeTab === 'WAFFLE_ITEMS' ? waffleIngredients : drinkIngredients).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No materials found in this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : activeTab === 'OTHER_ITEMS' ? (
            <div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-500">
                    <th className="pb-3 font-medium">Item Name</th>
                    <th className="pb-3 font-medium">Group</th>
                    <th className="pb-3 font-medium">Current Stock</th>
                    <th className="pb-3 font-medium">Unit</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {etcIngredients.map(item => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-wfl-cream flex items-center justify-center text-wfl-brown">
                            <Package size={16} />
                          </div>
                          <span className="font-medium text-gray-900">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-gray-500">{item.ingredientGroup || '-'}</td>
                      <td className="py-4 font-mono font-medium text-gray-900">
                        {Number(item.currentStock).toLocaleString()}
                      </td>
                      <td className="py-4 text-gray-500">{item.unit}</td>
                      <td className="py-4 text-right">
                        {isSupervisorOrAdmin && (
                          <button
                            onClick={() => handleAdjustClick(item)}
                            className="p-2 text-gray-400 hover:text-wfl-brown hover:bg-wfl-cream rounded-lg transition-colors"
                            title="Adjust Stock"
                          >
                            <Edit2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {etcIngredients.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-500">
                    <th className="pb-3 font-medium">Item Name</th>
                    <th className="pb-3 font-medium">Notes</th>
                    <th className="pb-3 font-medium">Quantity</th>
                    <th className="pb-3 font-medium">Unit</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredOthers.map(item => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-4 font-medium text-gray-900">{item.name}</td>
                      <td className="py-4 text-gray-500 max-w-xs truncate">{item.notes || '-'}</td>
                      <td className="py-4 font-mono font-medium text-gray-900">{Number(item.qty)}</td>
                      <td className="py-4 text-gray-500">{item.unit || '-'}</td>
                    </tr>
                  ))}
                  {filteredOthers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        No other items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {adjustModalOpen && selectedIngredient && (
        <AdjustStockModal
          ingredient={selectedIngredient}
          onClose={() => {
            setAdjustModalOpen(false);
            setSelectedIngredient(null);
          }}
        />
      )}

      {convertModalOpen && (
        <ConvertStockModal
          ingredients={ingredients}
          onClose={() => setConvertModalOpen(false)}
        />
      )}

      {produceModalOpen && (
        <ProduceStockModal
          ingredients={ingredients}
          onClose={() => setProduceModalOpen(false)}
        />
      )}
    </div>
  );
}
