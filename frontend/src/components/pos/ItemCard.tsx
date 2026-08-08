import { formatRupiah } from '../../utils/format';

interface ItemCardProps {
  name: string;
  price: number;
  image?: string;
  onClick: () => void;
}

export const ItemCard = ({ name, price, image, onClick }: ItemCardProps) => {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-wfl-border hover:border-wfl-orange/50 hover:shadow-wfl-hover transition-all text-left flex flex-col overflow-hidden group w-full h-full"
    >
      {/* Image Container */}
      <div className="w-full aspect-4/3 bg-wfl-cream flex items-center justify-center relative overflow-hidden">
        {image ? (
          <img 
            src={image} 
            alt={name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
          />
        ) : (
          <div className="text-4xl group-hover:scale-110 transition-transform duration-300">
            🧇
          </div>
        )}
      </div>
      
      {/* Details */}
      <div className="p-3 flex flex-col flex-1 justify-between">
        <h3 className="font-semibold text-wfl-text text-sm leading-tight mb-2 line-clamp-2">
          {name}
        </h3>
        <p className="font-bold text-wfl-orange">
          {formatRupiah(price)}
        </p>
      </div>
    </button>
  );
};
