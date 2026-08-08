import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppShell = () => {
  return (
    <div className="flex h-screen w-full bg-wfl-offwhite overflow-hidden">
      {/* Sidebar is fixed on the left */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header />
        
        {/* Scrollable page content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
