interface CategoryTabsProps {
  selected: string;
  onChange: (category: string) => void;
}

const CATEGORIES = ['All', 'Egg Waffle', 'Drinks', 'Add-ons'];

export const CategoryTabs = ({ selected, onChange }: CategoryTabsProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {CATEGORIES.map((category) => (
        <button
          key={category}
          onClick={() => onChange(category)}
          className={`
            whitespace-nowrap px-5 py-2.5 rounded-full font-semibold text-sm transition-all
            ${selected === category 
              ? 'bg-wfl-orange text-white shadow-sm' 
              : 'bg-white text-wfl-text border border-wfl-border hover:border-wfl-orange/50 hover:bg-wfl-cream'
            }
          `}
        >
          {category}
        </button>
      ))}
    </div>
  );
};
