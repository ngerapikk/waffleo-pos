import { useState } from 'react';
import { ItemCard } from './ItemCard';
import { useCartStore } from '../../store/useCartStore';
import CustomizationModal from './CustomizationModal';

interface ItemGridProps {
  category: string;
}



export const ItemGrid = ({ category }: ItemGridProps) => {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const menu = useCartStore((state) => state.menu);

  const channels = useCartStore((state) => state.channels);
  const channelId = useCartStore((state) => state.channelId);
  const currentChannel = channels.find(c => c.id === channelId);
  const tier = currentChannel?.priceTier || 'Direct';

  if (!menu) return <div className="text-gray-500">Loading menu...</div>;

  let filteredItems: any[] = [];
  
  if (category === 'All' || category === 'Egg Waffle') {
    const toppings = menu.toppings.map(t => {
      let price = Number(t.priceDirect);
      if (tier === 'GrabGo') price = Number(t.priceGrabGo);
      if (tier === 'Shopee') price = Number(t.priceShopee);
      
      return {
        id: t.id,
        name: t.name,
        price,
        category: 'Egg Waffle',
        type: 'TOPPING'
      };
    });
    filteredItems = [...filteredItems, ...toppings];
  }

  if (category === 'All' || category === 'Drinks') {
    const drinks = menu.drinks.map(d => {
      let price = Number(d.priceDirect);
      if (tier === 'GrabGo') price = Number(d.priceGrabGo);
      if (tier === 'Shopee') price = Number(d.priceShopee);
      
      return {
        id: d.id,
        name: d.name,
        price,
        category: 'Drinks',
        type: 'DRINK'
      };
    });
    filteredItems = [...filteredItems, ...drinks];
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredItems.map((item) => (
          <ItemCard
            key={item.id}
            name={item.name}
            price={item.price}
            onClick={() => {
              setSelectedItem(item);
            }}
          />
        ))}
      </div>
      {selectedItem && (
        <CustomizationModal
          item={selectedItem}
          productType={selectedItem.type}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
};

