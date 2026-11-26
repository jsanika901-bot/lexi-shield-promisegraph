import {
  CreditCard,
  FileSearch,
  FolderLock,
  GitCompare,
  Layers,
  LayoutDashboard,
  Menu,
  Scale,
  ScanSearch,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { FirebaseRuntimeStatus, ModuleId } from '../../types/lexi';

interface AppShellProps {
  activeModule: ModuleId;
  onSelectModule: (module: ModuleId) => void;
  vaultCount: number;
  firebaseStatus: FirebaseRuntimeStatus;
  onOpenFirebaseConfig: () => void;
  children: ReactNode;
}

const NAV_ITEMS: Array<{
  id: ModuleId;
  label: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
  { id: 'scanner', label: 'Smart Scam Scanner', shortLabel: 'Scanner', icon: ScanSearch },
  { id: 'contracts', label: 'Contract Intelligence', shortLabel: 'Contracts', icon: FileSearch },
  { id: 'payments', label: 'Payment Risk Analyzer', shortLabel: 'Payments', icon: CreditCard },
  { id: 'promisegraph', label: 'PROMISEGRAPH', shortLabel: 'Graph', icon: GitCompare },
  { id: 'rights', label: 'Digital Rights Assistant', shortLabel: 'Rights', icon: Scale },
  { id: 'vault', label: 'Evidence Vault', shortLabel: 'Vault', icon: FolderLock },
];

function LexiShieldLogo() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M16 3L5 7.5V15.2C5 22.1 9.7 28.4 16 30C22.3 28.4 27 22.1 27 15.2V7.5L16 3Z"
        fill="#0B1221"
        stroke="#3B82F6"
        strokeWidth="2"
      />
      <circle cx="12" cy="14" r="2.2" fill="#60A5FA" />
      <circle cx="20" cy="14" r="2.2" fill="#60A5FA" />
      <circle cx="16" cy="21" r="2.2" fill="#FFFFFF" />
      <path d="M12 14L20 14M12 14L16 21M20 14L16 21" stroke="#3B82F6" strokeWidth="1.5" />
    </svg>
  );
}

export function AppShell({
  activeModule,
  onSelectModule,
  vaultCount,
  firebaseStatus,
  onOpenFirebaseConfig,
  children,
}: AppShellProps) {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const activeMeta = NAV_ITEMS.find((n) => n.id === activeModule) ?? NAV_ITEMS[0];
  const firebaseBadgeLabel = firebaseStatus.configured
    ? firebaseStatus.firestoreConnected
      ? 'Firebase: Live'
      : 'Firebase: AI Ready'
    : 'Firebase: Local Only';

  const handleMobileNav = (id: ModuleId) => {
    onSelectModule(id);
    setMobileSheetOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-r border-slate-800/80 bg-[#080C16] sticky top-0 h-screen">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800/80">
          <LexiShieldLogo />
          <span className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0">
            LEXI-SHIELD
          </span>
        </div>

        <nav aria-label="Primary modules" className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectModule(item.id)}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-600/15 text-white border border-blue-500/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'vault' && vaultCount > 0 && (
                  <span className="text-xs font-mono text-slate-400 tabular-nums shrink-0">
                    {vaultCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80 text-xs text-slate-500">
          Preliminary cross-document verification workspace
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Compact Top App Bar (52px) */}
        <header className="lg:hidden sticky top-0 z-30 h-[52px] pt-safe px-4 bg-[#060911]/95 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onSelectModule('dashboard')}
            className="flex items-center gap-2.5 min-h-[44px] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LexiShieldLogo />
            <span className="font-display text-sm font-bold tracking-tight text-white">
              LEXI-SHIELD
            </span>
          </button>

          <span className="text-xs font-medium text-slate-400 truncate">
            {activeMeta.shortLabel}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenFirebaseConfig}
              aria-label="Open Firebase Hybrid Configuration"
              className="min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-800 bg-[#0B1221] text-[11px] font-medium text-slate-300 hover:text-white inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Layers
                className={`w-3.5 h-3.5 ${
                  firebaseStatus.configured ? 'text-emerald-400' : 'text-slate-400'
                }`}
                aria-hidden="true"
              />
              <span>{firebaseStatus.configured ? 'Hybrid Live' : 'Hybrid Config'}</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileSheetOpen(true)}
              aria-label="Open all modules menu"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white cursor-pointer"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Desktop Top Header Bar (Clean 3-zone structure) */}
        <header className="hidden lg:flex h-16 px-8 border-b border-slate-800/80 bg-[#060911]/95 items-center justify-between gap-8 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-2 text-sm text-slate-400 min-w-0">
            <span className="whitespace-nowrap shrink-0">Workspace</span>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-white truncate">{activeMeta.label}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenFirebaseConfig}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl border text-xs font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                firebaseStatus.configured
                  ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/50'
                  : 'border-slate-700 bg-[#0B1221] text-slate-300 hover:text-white hover:border-slate-600'
              }`}
            >
              <Layers
                className={`w-3.5 h-3.5 ${
                  firebaseStatus.configured ? 'text-emerald-400' : 'text-blue-400'
                }`}
                aria-hidden="true"
              />
              {firebaseBadgeLabel}
            </button>

            <button
              type="button"
              onClick={() => onSelectModule('promisegraph')}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Open PromiseGraph
            </button>
          </div>
        </header>

        {/* Scrollable Content Viewport */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Thumb-Zone Navigation Bar (58px) */}
      <nav
        aria-label="Mobile quick navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080C16]/95 backdrop-blur-md border-t border-slate-800/90 pb-safe"
      >
        <div className="grid grid-cols-5 h-[58px] items-center">
          {(
            [
              NAV_ITEMS[0], // Home
              NAV_ITEMS[1], // Scanner
              NAV_ITEMS[4], // PromiseGraph
              NAV_ITEMS[3], // Payments
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleMobileNav(item.id)}
                className={`h-full min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                  isActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setMobileSheetOpen(true)}
            className={`h-full min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeModule === 'contracts' || activeModule === 'rights' || activeModule === 'vault'
                ? 'text-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderLock className="w-5 h-5" aria-hidden="true" />
            <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">
              More
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Sheet Drawer for All 6 Modules */}
      {mobileSheetOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
          onClick={() => setMobileSheetOpen(false)}
        >
          <div
            className="w-full rounded-t-3xl bg-[#0B1221] border-t border-slate-700 p-5 pb-8 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto" />
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">LEXI-SHIELD Modules</h2>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                aria-label="Close menu"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleMobileNav(item.id)}
                    className={`min-h-[48px] px-4 py-3 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                      isActive
                        ? 'border-blue-500/50 bg-blue-600/15 text-white'
                        : 'border-slate-800 bg-[#060911] text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-3 text-sm font-medium">
                      <Icon className="w-4 h-4 text-blue-400" aria-hidden="true" />
                      {item.label}
                    </span>
                    {item.id === 'vault' && vaultCount > 0 && (
                      <span className="text-xs font-mono text-slate-400 tabular-nums">
                        {vaultCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
