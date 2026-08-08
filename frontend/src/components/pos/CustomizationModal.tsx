import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCartStore } from '../../store/useCartStore';

interface CustomizationModalProps {
  item: any; // The base topping or drink from menu
  productType: 'TOPPING' | 'DRINK';
  onClose: () => void;
}

export default function CustomizationModal({ item, productType, onClose }: CustomizationModalProps) {
  const menu = useCartStore(state => state.menu);
  const addItem = useCartStore(state => state.addItem);

  // Form State
  const [qty, setQty] = useState(1);
  const [portion, setPortion] = useState<'FULL' | 'HALF'>('FULL');
  const [halfPartnerId, setHalfPartnerId] = useState<string>('');
  const [flavourId, setFlavourId] = useState<string>('');
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [sweetnessId, setSweetnessId] = useState<string>('');
  const [icedId, setIcedId] = useState<string>('');

  useEffect(() => {
      // Default to Original Flavour if available
      if (menu && productType === 'TOPPING') {
          const original = menu.flavours.find(f => f.name.toLowerCase() === 'original');
          if (original) setFlavourId(original.id);
      } else if (menu && productType === 'DRINK') {
          const normalSweetness = menu.sweetness?.find(s => s.name.toLowerCase() === 'normal');
          if (normalSweetness) setSweetnessId(normalSweetness.id);
          
          const normalIce = menu.icedLevels?.find(i => i.name.toLowerCase() === 'normal');
          if (normalIce) setIcedId(normalIce.id);
      }
  }, [menu, productType]);

  if (!menu) return null;

  const handleAddonToggle = (id: string) => {
    setAddonIds(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const getItemUnitPrice = useCartStore(state => state.getItemUnitPrice);

  const handleAddToCart = () => {
    const detailsArr = [];
    if (portion === 'HALF' && halfPartnerId) {
      const partnerName = menu.toppings.find(t => t.id === halfPartnerId)?.name;
      detailsArr.push(`Half ${partnerName}`);
    }
    if (flavourId) {
      const f = menu.flavours.find(x => x.id === flavourId);
      if (f) detailsArr.push(f.name);
    }
    if (addonIds.length > 0) {
      const adds = addonIds.map(id => menu.addons.find(a => a.id === id)?.name).filter(Boolean);
      detailsArr.push(adds.join(', '));
    }
    if (sweetnessId) {
      const s = menu.sweetness?.find(x => x.id === sweetnessId);
      if (s) detailsArr.push(`Sweet: ${s.name}`);
    }
    if (icedId) {
      const i = menu.icedLevels?.find(x => x.id === icedId);
      if (i) detailsArr.push(`Ice: ${i.name}`);
    }

    const cartItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      productType,
      toppingId: productType === 'TOPPING' ? item.id : undefined,
      halfPartnerToppingId: portion === 'HALF' ? halfPartnerId : undefined,
      drinkId: productType === 'DRINK' ? item.id : undefined,
      flavourId: flavourId || undefined,
      addonIds,
      sweetnessLevelId: sweetnessId || undefined,
      icedLevelId: icedId || undefined,
      name: productType === 'TOPPING' ? (portion === 'HALF' ? `Half ${item.name}` : item.name) : item.name,
      details: detailsArr.join(' | '),
      qty,
      unitPrice: 0 // Will be calculated by store
    };

    addItem(cartItem);
    onClose();
  };

  // Calculate dynamic price for display
  const tempItem = {
    id: 'temp',
    productType,
    toppingId: productType === 'TOPPING' ? item.id : undefined,
    halfPartnerToppingId: portion === 'HALF' ? halfPartnerId : undefined,
    drinkId: productType === 'DRINK' ? item.id : undefined,
    flavourId: flavourId || undefined,
    addonIds,
    qty: 1,
    unitPrice: 0
  };
  const dynamicUnitPrice = getItemUnitPrice(tempItem as any);

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-100 p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ width: '100%', maxWidth: '512px', minWidth: '320px' }}
      >
        
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">Customize {item.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-6">
          
          {productType === 'TOPPING' && (
            <>
              {/* Portion Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Porsi</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPortion('FULL')}
                    className={`flex-1 py-2 rounded-md font-medium border transition-colors ${portion === 'FULL' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    Full
                  </button>
                  <button
                    onClick={() => setPortion('HALF')}
                    className={`flex-1 py-2 rounded-md font-medium border transition-colors ${portion === 'HALF' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    Half
                  </button>
                </div>
                
                {portion === 'HALF' && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Pilih Pasangan Topping Utama</label>
                    <select
                      value={halfPartnerId}
                      onChange={(e) => setHalfPartnerId(e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:border-orange-500 focus:ring-orange-500 p-2 border"
                    >
                      <option value="">-- Pilih Topping --</option>
                      {menu.toppings.filter(t => t.id !== item.id).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Flavour Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Flavour (Rasa Waffle)</label>
                <div className="grid grid-cols-2 gap-2">
                  {menu.flavours.map(f => (
                    <label key={f.id} className={`flex items-center p-2 rounded-md border cursor-pointer transition-colors ${flavourId === f.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input
                        type="radio"
                        name="flavour"
                        value={f.id}
                        checked={flavourId === f.id}
                        onChange={() => setFlavourId(f.id)}
                        className="text-orange-600 focus:ring-orange-500 hidden"
                      />
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-2 ${flavourId === f.id ? 'border-orange-500' : 'border-gray-400'}`}>
                         {flavourId === f.id && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                      </div>
                      <span className="text-sm text-gray-700 font-medium">{f.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Add-ons Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Topping Tambahan (Add-ons)</label>
                <div className="grid grid-cols-2 gap-2">
                  {menu.addons.map(a => {
                    const isChecked = addonIds.includes(a.id);
                    return (
                      <label key={a.id} className={`flex items-center p-2 rounded-md border cursor-pointer transition-colors ${isChecked ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleAddonToggle(a.id)}
                          className="hidden"
                        />
                        <div className={`w-4 h-4 rounded-sm border flex items-center justify-center mr-2 ${isChecked ? 'border-orange-500 bg-orange-500' : 'border-gray-400'}`}>
                          {isChecked && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm text-gray-700 font-medium">{a.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {productType === 'DRINK' && (
            <>
              {/* Sweetness Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sweetness Level</label>
                <div className="grid grid-cols-2 gap-2">
                  {menu.sweetness?.map(s => (
                    <label key={s.id} className={`flex items-center p-2 rounded-md border cursor-pointer transition-colors ${sweetnessId === s.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input
                        type="radio"
                        name="sweetness"
                        value={s.id}
                        checked={sweetnessId === s.id}
                        onChange={() => setSweetnessId(s.id)}
                        className="text-orange-600 focus:ring-orange-500 hidden"
                      />
                       <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-2 ${sweetnessId === s.id ? 'border-orange-500' : 'border-gray-400'}`}>
                         {sweetnessId === s.id && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                      </div>
                      <span className="text-sm text-gray-700 font-medium">{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Iced Level Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ice Level</label>
                <div className="grid grid-cols-2 gap-2">
                  {menu.icedLevels?.map(i => (
                    <label key={i.id} className={`flex items-center p-2 rounded-md border cursor-pointer transition-colors ${icedId === i.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input
                        type="radio"
                        name="iced"
                        value={i.id}
                        checked={icedId === i.id}
                        onChange={() => setIcedId(i.id)}
                        className="text-orange-600 focus:ring-orange-500 hidden"
                      />
                       <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-2 ${icedId === i.id ? 'border-orange-500' : 'border-gray-400'}`}>
                         {icedId === i.id && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                      </div>
                      <span className="text-sm text-gray-700 font-medium">{i.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer / Actions */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="w-10 h-10 rounded-full bg-white border border-gray-300 shadow-sm flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100"
            >
              -
            </button>
            <span className="font-semibold text-lg w-6 text-center">{qty}</span>
            <button
              onClick={() => setQty(qty + 1)}
              className="w-10 h-10 rounded-full bg-white border border-gray-300 shadow-sm flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-4 flex-1 justify-end">
            <div className="text-right">
              <div className="text-xs text-gray-500 font-medium">Price</div>
              <div className="font-bold text-orange-600 text-lg">Rp {(dynamicUnitPrice * qty).toLocaleString('id-ID')}</div>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={portion === 'HALF' && !halfPartnerId}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg shadow-sm transition-colors"
            >
              Add to Cart
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
