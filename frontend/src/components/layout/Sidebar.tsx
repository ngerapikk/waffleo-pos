import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  ListOrdered, 
  History, 
  PackageSearch, 
  BarChart3, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'SUPERVISOR', 'KASIR'] },
  { path: '/pos', icon: UtensilsCrossed, label: 'Menu (POS)', roles: ['ADMIN', 'SUPERVISOR', 'KASIR'] },
  { path: '/orders', icon: ListOrdered, label: 'Orders', roles: ['ADMIN', 'SUPERVISOR', 'KASIR'] },
  { path: '/history', icon: History, label: 'History', roles: ['ADMIN', 'SUPERVISOR', 'KASIR'] },
  { path: '/inventory', icon: PackageSearch, label: 'Inventory', roles: ['ADMIN', 'SUPERVISOR', 'KASIR'] },
  { path: '/reports', icon: BarChart3, label: 'Reports', roles: ['ADMIN', 'SUPERVISOR'] },
  { path: '/audit-refund', icon: Shield, label: 'Audit & Refund', roles: ['ADMIN', 'SUPERVISOR'] },
  { path: '/settings', icon: Settings, label: 'Settings', roles: ['ADMIN', 'SUPERVISOR'] },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  const toggleSidebar = () => setCollapsed(!collapsed);

  const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(user?.role || ''));

  return (
    <aside 
      className={`h-screen bg-white border-r border-wfl-border flex flex-col transition-all duration-300 relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]
        ${collapsed ? 'w-20' : 'w-60'}`}
    >
      {/* Logo Area */}
      <div className="h-18 flex items-center justify-between px-4 border-b border-wfl-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-wfl-orange to-wfl-orange-hover text-white flex items-center justify-center shrink-0 shadow-sm shadow-wfl-orange/30">
            <span className="text-xl">🧇</span>
          </div>
          {!collapsed && (
            <span className="font-display font-bold text-wfl-brown whitespace-nowrap text-lg tracking-tight">
              WAFFLEO
            </span>
          )}
        </div>
        
        {/* Toggle Button */}
        <button 
          onClick={toggleSidebar}
          className="absolute -right-3 top-6 bg-white border border-wfl-border rounded-full p-1 text-wfl-text-secondary hover:text-wfl-orange hover:border-wfl-orange shadow-sm transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden">
        {filteredNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-3 rounded-xl transition-all
              ${isActive 
                ? 'bg-wfl-orange/10 text-wfl-orange font-semibold' 
                : 'text-wfl-text hover:bg-wfl-cream hover:text-wfl-brown'
              }
              ${collapsed ? 'justify-center' : 'justify-start'}
            `}
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={22} strokeWidth={2.5} className="shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Branch Info (Bottom) */}
      <div className="p-4 border-t border-wfl-border bg-wfl-offwhite/50">
        <div className={`flex flex-col ${collapsed ? 'items-center text-center' : 'items-start'}`}>
          <span className="text-[10px] font-bold text-wfl-text-secondary uppercase tracking-wider mb-1">
            Outlet
          </span>
          {collapsed ? (
            <span className="font-semibold text-wfl-brown text-sm">#001</span>
          ) : (
            <>
              <span className="font-semibold text-wfl-brown truncate w-full">Gabek</span>
              <span className="text-xs text-wfl-text-secondary">Cabang Utama</span>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
