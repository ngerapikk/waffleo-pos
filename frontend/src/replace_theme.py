import re
import sys

def replace_theme(content):
    replacements = {
        r'bg-slate-900': 'bg-transparent', # Main wrapper
        r'bg-slate-800': 'bg-white',
        r'bg-slate-700/20': 'bg-white',
        r'bg-slate-700/30': 'bg-gray-50',
        r'bg-slate-700/50': 'bg-white',
        r'bg-slate-700': 'bg-gray-100',
        r'bg-slate-600/30': 'bg-gray-100',
        r'bg-slate-600': 'bg-gray-200',
        r'text-slate-100': 'text-gray-900',
        r'text-slate-200': 'text-gray-800',
        r'text-slate-300': 'text-gray-700',
        r'text-slate-400': 'text-gray-500',
        r'text-slate-500': 'text-gray-400',
        r'text-slate-600': 'text-gray-400',
        r'border-slate-800': 'border-gray-200',
        r'border-slate-700/40': 'border-gray-200',
        r'border-slate-700/50': 'border-gray-200',
        r'border-slate-700': 'border-gray-200',
        r'border-slate-600/50': 'border-gray-200',
        r'border-slate-600/40': 'border-gray-200',
        r'border-slate-600': 'border-gray-300',
        r'border-slate-500/30': 'border-gray-300',
        r'shadow-lg shadow-orange-900/30': 'shadow-md shadow-orange-500/20',
        r'border-emerald-500/30': 'border-emerald-200',
        r'text-emerald-300': 'text-emerald-700',
        r'bg-emerald-500/20': 'bg-emerald-50',
        r'border-amber-500/30': 'border-amber-200',
        r'text-amber-300': 'text-amber-700',
        r'bg-amber-500/20': 'bg-amber-50',
        r'border-purple-500/30': 'border-purple-200',
        r'text-purple-300': 'text-purple-700',
        r'bg-purple-500/20': 'bg-purple-50',
        r'border-red-500/30': 'border-red-200',
        r'text-red-300': 'text-red-700',
        r'bg-red-500/20': 'bg-red-50',
        r'border-blue-500/30': 'border-blue-200',
        r'text-blue-300': 'text-blue-700',
        r'bg-blue-500/20': 'bg-blue-50',
        r'border-green-500/30': 'border-green-200',
        r'text-green-300': 'text-green-700',
        r'bg-green-500/20': 'bg-green-50',
        r'text-slate-400 hover:text-slate-200 hover:bg-slate-800': 'text-gray-500 hover:text-gray-800 hover:bg-gray-100',
        r'text-wfl-text-secondary hover:text-wfl-text hover:bg-white': 'text-gray-500 hover:text-gray-800 hover:bg-gray-100', # Fix for hover states
        r'text-wfl-text-secondary hover:text-wfl-text hover:bg-gray-100': 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
    }

    for pattern, repl in replacements.items():
        content = re.sub(pattern, repl, content)

    # Some manual fixes for white text that might have been hardcoded
    content = re.sub(r'text-white(?=\s+text-sm\s+font-medium)', 'text-white', content) # Keep button text white
    
    return content

def main():
    files = [
        'c:\\Users\\USER\\Documents\\fdrmnn\\WAFFLEO POS\\Antigravity\\waffleo-pos\\frontend\\src\\pages\\Settings.tsx',
        'c:\\Users\\USER\\Documents\\fdrmnn\\WAFFLEO POS\\Antigravity\\waffleo-pos\\frontend\\src\\components\\settings\\PromoTab.tsx'
    ]

    for file in files:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()

        new_content = replace_theme(content)

        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)

if __name__ == '__main__':
    main()
