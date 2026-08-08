import { LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CloseShiftModal } from './CloseShiftModal';
import { OpenShiftModal } from './OpenShiftModal';
import { useShiftStore } from '../../store/useShiftStore';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/pos': 'Menu (POS)',
  '/orders': 'Orders Management',
  '/history': 'Transaction History',
  '/inventory': 'Inventory',
  '/reports': 'Reports & Analytics',
  '/settings': 'Settings',
};

export const Header = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const { currentShift, fetchCurrentShift, isLoading } = useShiftStore();

  useEffect(() => {
    if (user) {
      fetchCurrentShift();
    }
  }, [user, fetchCurrentShift]);

  // Get current page title or default to segment
  const currentTitle = PAGE_TITLES[location.pathname] || 'WAFFLEO POS';

  // Format current date
  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <header className="h-18 bg-white/80 backdrop-blur-md border-b border-wfl-border px-6 flex items-center justify-between sticky top-0 z-10">
      {/* Left side: Page Title */}
      <div>
        <h1 className="text-xl font-bold text-wfl-text tracking-tight">
          {currentTitle}
        </h1>
        <p className="text-xs text-wfl-text-secondary font-medium">
          {today}
        </p>
      </div>

      {/* Right side: User Profile & Actions */}
      <div className="flex items-center gap-4">
        
        {/* Shift Badge & Action */}
        {user && (
          currentShift ? (
            <button 
              onClick={() => setShowCloseShiftModal(true)}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-wfl-cream hover:bg-wfl-cream-dark transition-colors rounded-full border border-wfl-brown/10 disabled:opacity-50"
            >
              <div className="w-2 h-2 rounded-full bg-wfl-green animate-pulse"></div>
              <span className="text-xs font-semibold text-wfl-brown">Tutup Shift</span>
            </button>
          ) : (
            <button 
              onClick={() => setShowOpenShiftModal(true)}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full border border-gray-200 disabled:opacity-50"
            >
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span className="text-xs font-semibold text-gray-700">Buka Shift</span>
            </button>
          )
        )}

        <div className="h-8 w-px bg-wfl-border mx-2"></div>

        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-wfl-text leading-tight">{user?.name}</p>
            <p className="text-xs text-wfl-text-secondary font-medium uppercase tracking-wider">{user?.role}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-wfl-offwhite border border-wfl-border flex items-center justify-center text-wfl-brown">
            <UserIcon size={20} />
          </div>
        </div>

        {/* Logout Button */}
        <button 
          onClick={logout}
          className="p-2 text-wfl-text-secondary hover:text-wfl-red hover:bg-wfl-red/10 rounded-lg transition-colors ml-2"
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>

      {showCloseShiftModal && (
        <CloseShiftModal onClose={() => setShowCloseShiftModal(false)} />
      )}
      {showOpenShiftModal && (
        <OpenShiftModal onClose={() => setShowOpenShiftModal(false)} />
      )}
    </header>
  );
};
