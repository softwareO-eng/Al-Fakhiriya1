/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode, useState } from 'react';
import { LayoutDashboard, Users, Truck, Bell, Settings, Search, AlertTriangle, ShieldCheck, Menu, X, ArrowLeft } from 'lucide-react';
import Dashboard from './components/Dashboard';
import EntitiesView from './components/EntitiesView';
import EntityDetailView from './components/EntityDetailView';
import { Entity } from './data';
import { useFleet } from './store';

type ViewState = 'Dashboard' | 'Trucks' | 'Drivers' | 'EntityDetail';

export default function App() {
  const [activeView, setActiveView] = useState<ViewState>('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);

  const { documents, user, signIn, logOut, authError, dbError } = useFleet();
  const expiringDocsCount = documents.filter(d => d.daysUntilExpiry !== null && d.daysUntilExpiry <= 30).length;

  const navigateTo = (view: ViewState) => {
    setActiveView(view);
    setSidebarOpen(false); // Close sidebar on mobile after navigation
    if (view !== 'EntityDetail') {
      setSelectedEntity(null);
    }
  };

  const handleSelectEntity = (entity: Entity) => {
    setSelectedEntity(entity);
    setActiveView('EntityDetail');
  };

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100 font-sans overflow-hidden">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-16 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between px-4 z-40">
        <div className="flex items-center">
          <Truck className="h-6 w-6 text-indigo-500 mr-2" />
          <span className="text-lg font-bold tracking-tight text-white">Fleet<span className="text-indigo-400">Sync</span></span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
             <Bell className="h-5 w-5 text-neutral-400" />
             {expiringDocsCount > 0 && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 border-2 border-neutral-950"></span>}
          </div>
          <button onClick={() => setSidebarOpen(true)} className="text-neutral-400 hover:text-white cursor-pointer">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`absolute md:relative z-50 md:z-auto w-64 h-full bg-neutral-950 border-r border-neutral-800 flex flex-col transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-200 ease-in-out`}>
        <div className="h-16 flex items-center justify-between md:justify-start px-6 border-b border-neutral-800">
          <div className="flex items-center">
            <Truck className="h-6 w-6 text-indigo-500 mr-2" />
            <span className="text-xl font-bold tracking-tight text-white">Fleet<span className="text-indigo-400">Sync</span></span>
          </div>
          <button className="md:hidden text-neutral-400 cursor-pointer" onClick={() => setSidebarOpen(false)}>
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Alerts & Dashboard" 
            active={activeView === 'Dashboard'} 
            onClick={() => navigateTo('Dashboard')} 
          />
          <NavItem 
            icon={<Truck size={20} />} 
            label="Trucks Setup" 
            active={activeView === 'Trucks' || (activeView === 'EntityDetail' && selectedEntity?.type === 'Truck')} 
            onClick={() => navigateTo('Trucks')} 
          />
          <NavItem 
            icon={<Users size={20} />} 
            label="Drivers Setup" 
            active={activeView === 'Drivers' || (activeView === 'EntityDetail' && selectedEntity?.type === 'Driver')} 
            onClick={() => navigateTo('Drivers')} 
          />
        </nav>
        
        <div className="p-4 border-t border-neutral-800">
          {user ? (
            <div className="flex items-center space-x-3 justify-between">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-medium text-white shadow-inner flex-shrink-0">
                  {user.email ? user.email.substring(0, 2).toUpperCase() : 'GS'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate w-32">{user.email || 'Guest Session'}</p>
                  <p className="text-xs text-neutral-400 font-medium tracking-wide">Auto-saved</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
               <div className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-medium text-neutral-500 shadow-inner flex-shrink-0">...</div>
               <div className="min-w-0">
                 <p className="text-sm font-medium text-neutral-400 truncate w-32">Connecting...</p>
                 {authError && <p className="text-xs text-rose-400">{authError}</p>}
               </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden pt-16 md:pt-0">
        {/* Header - Hidden on Mobile */}
        <header className="hidden md:flex h-16 bg-neutral-900 border-b border-neutral-800 items-center justify-between px-8">
          <div className="flex items-center w-96 relative">
            <Search className="h-4 w-4 absolute left-3 text-neutral-500" />
            <input 
              type="text" 
              placeholder="Search anytime..." 
              className="w-full bg-neutral-950 border border-neutral-800 rounded-md pl-9 pr-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center space-x-6">
            <button className="relative p-2 text-neutral-400 hover:text-white transition-colors cursor-pointer group">
              <Bell className="h-5 w-5 group-hover:animate-pulse" />
              {expiringDocsCount > 0 && <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-neutral-900"></span>}
            </button>
            <div className="flex items-center px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium rounded-full shadow-sm">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Auto-Alerts Active
            </div>
          </div>
        </header>

        {/* Dynamic View Context */}
        <div className="flex-1 overflow-auto bg-neutral-900">
          {dbError && (
            <div className="m-8 p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm flex items-start">
              <AlertTriangle className="h-5 w-5 mr-3 shrink-0" />
              <div>
                <h3 className="font-bold text-base mb-1">Database Access Error</h3>
                <p>Firestore security rules might not be deployed. Please deploy your rules using the AI coding assistant or check the Firebase console. Details: {dbError}</p>
              </div>
            </div>
          )}
          {activeView === 'Dashboard' && <Dashboard onViewAll={() => navigateTo('Trucks')} />}
          {activeView === 'Trucks' && <EntitiesView type="Truck" onSelectEntity={handleSelectEntity} />}
          {activeView === 'Drivers' && <EntitiesView type="Driver" onSelectEntity={handleSelectEntity} />}
          {activeView === 'EntityDetail' && selectedEntity && (
             <EntityDetailView entity={selectedEntity} onBack={() => navigateTo(selectedEntity.type === 'Truck' ? 'Trucks' : 'Drivers')} />
          )}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: ReactNode; label: string; active?: boolean, onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
        active 
          ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700/50' 
          : 'text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'
      }`}
    >
      <span className={`mr-3 ${active ? 'text-indigo-400' : ''}`}>{icon}</span>
      {label}
    </button>
  );
}

