import React, { useState } from 'react';
import { NavLink, Outlet, Navigate, Link } from 'react-router-dom';
import { ShieldCheck, Menu, X, LogOut, Bell, ChevronDown, HeartPulse } from 'lucide-react';
import { useSession } from '@/lib/SessionContext';
import { navForRole } from './navConfig';
import { ROLE_LABEL } from '@/lib/auth';

function SidebarContent({ onNavigate }) {
  const { account, patients, activePatient, selectPatient, signOut, unread } = useSession();
  const groups = navForRole(account.role);
  const canSwitch = patients.length > 1;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-6 pb-6 pt-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
          <ShieldCheck className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div>
          <p className="text-[17px] font-extrabold leading-tight text-foreground">MedGuard</p>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Medication safety</p>
        </div>
      </div>

      {canSwitch ? (
        <div className="mx-4 mb-4 rounded-2xl border border-border bg-muted/50 p-3">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Viewing patient</p>
          <div className="relative">
            <select
              value={activePatient?.account_email || ''}
              onChange={(e) => selectPatient(e.target.value)}
              className="w-full appearance-none rounded-xl border border-border bg-white px-3 py-2 pr-8 text-sm font-semibold text-foreground outline-none focus:border-primary"
            >
              {patients.map((p) => (
                <option key={p.account_email} value={p.account_email}>{p.full_name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      ) : null}

      <nav className="mg-scroll-thin flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) => `mg-nav-link ${isActive ? 'mg-nav-link-active' : ''}`}
                >
                  <item.icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                  <span className="flex-1">{item.label}</span>
                  {item.to === '/notifications' && unread > 0 ? (
                    <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unread}</span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {account.full_name?.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{account.full_name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{ROLE_LABEL[account.role]}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-red-600"
        >
          <LogOut className="h-4 w-4" /> Sign out securely
        </button>
      </div>
    </div>
  );
}

export default function AppShell() {
  const { account, booting, unread, signOut } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
          <p className="text-sm font-medium text-muted-foreground">Preparing your health records…</p>
        </div>
      </div>
    );
  }

  if (!account) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[268px] border-r border-border bg-white lg:block">
        <SidebarContent />
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] bg-white shadow-2xl">
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-4 z-10 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-[268px]">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-background/85 backdrop-blur-lg">
          <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMenuOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-foreground lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden items-center gap-2 rounded-full bg-[hsl(var(--mint))]/10 px-3 py-1.5 text-[12px] font-semibold text-[hsl(var(--mint))] sm:flex">
                <HeartPulse className="h-3.5 w-3.5" /> Medication safety monitored
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-muted-foreground transition hover:text-primary"
                aria-label="Notifications"
              >
                <Bell className="h-[18px] w-[18px]" />
                {unread > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                ) : null}
              </Link>
              <Link to="/profile" className="flex items-center gap-2 rounded-xl border border-border bg-white py-1.5 pl-1.5 pr-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                  {account.full_name?.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden text-sm font-semibold text-foreground sm:block">{account.full_name?.split(' ')[0]}</span>
              </Link>
              <button
                onClick={signOut}
                className="hidden h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-muted-foreground transition hover:text-red-600 sm:flex"
                aria-label="Sign out"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1240px] px-4 py-7 sm:px-6 sm:py-9">
          <Outlet />
        </main>

        <footer className="mx-auto max-w-[1240px] px-4 pb-10 pt-4 sm:px-6">
          <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
            MedGuard supports your care team — it does not diagnose conditions or replace medical advice.
            Always confirm medication changes with your doctor or pharmacist.
          </p>
        </footer>
      </div>
    </div>
  );
}