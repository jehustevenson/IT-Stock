'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
  Bell,
  User,
  PlusCircle,
} from 'lucide-react';
import Icon from '@/components/ui/AppIcon';
import { ASSIGNMENTS } from '@/lib/mockData';

// Compute badge: count of Active + Overdue assignments
function getAssignmentBadge(): number | null {
  const count = ASSIGNMENTS.filter(
    (a) => a.status === 'Active' || a.status === 'Overdue'
  ).length;
  return count > 0 ? count : null;
}

const NAV_ITEMS = [
  {
    id: 'nav-dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    badge: null as number | null,
  },
  {
    id: 'nav-inventory',
    label: 'Inventory',
    href: '/inventory-management',
    icon: Package,
    badge: null as number | null,
  },
  {
    id: 'nav-add-device',
    label: 'Add Device',
    href: '/add-device',
    icon: PlusCircle,
    badge: null as number | null,
  },
  {
    id: 'nav-assignments',
    label: 'Assignments',
    href: '/assignment-tracking',
    icon: ClipboardList,
    badge: getAssignmentBadge(),
  },
];

const BOTTOM_ITEMS = [
  { id: 'nav-settings', label: 'Settings', href: '#', icon: Settings },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Re-derive badge each render so it stays in sync with any in-memory changes
  const navItems = NAV_ITEMS.map((item) =>
    item.id === 'nav-assignments'
      ? { ...item, badge: getAssignmentBadge() }
      : item
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex-shrink-0 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Logo */}
        <div
          className={`flex items-center h-16 px-3 border-b border-slate-100 flex-shrink-0 ${
            collapsed ? 'justify-center' : 'gap-2'
          }`}
        >
          <AppLogo size={32} />
          {!collapsed && (
            <span className="font-semibold text-slate-900 text-sm tracking-tight truncate">
              ITAssetTracker
            </span>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {!collapsed && (
            <p className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Main
            </p>
          )}
          {navItems?.map((item) => {
            const Icon = item?.icon;
            const isActive = pathname === item?.href || pathname?.startsWith(item?.href + '/');
            return (
              <Link key={item?.id} href={item?.href}>
                <span
                  className={`sidebar-nav-item ${
                    isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                  title={collapsed ? item?.label : undefined}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item?.label}</span>
                      {item?.badge !== null && (
                        <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
                          {item?.badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && item?.badge !== null && (
                    <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-amber-500 rounded-full" />
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="px-2 py-3 border-t border-slate-100 space-y-1">
          {BOTTOM_ITEMS?.map((item) => {
            const Icon = item?.icon;
            return (
              <Link key={item?.id} href={item?.href}>
                <span
                  className={`sidebar-nav-item sidebar-nav-item-inactive ${
                    collapsed ? 'justify-center px-0' : ''
                  }`}
                  title={collapsed ? item?.label : undefined}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item?.label}</span>}
                </span>
              </Link>
            );
          })}

          {/* User Profile */}
          <div
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mt-1 ${
              collapsed ? 'justify-center px-0' : ''
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <User size={14} className="text-white" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">IT Admin</p>
                <p className="text-xs text-slate-400 truncate">admin@company.com</p>
              </div>
            )}
            {!collapsed && (
              <button className="icon-btn" title="Sign out">
                <LogOut size={14} />
              </button>
            )}
          </div>

          {/* Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`w-full flex items-center justify-center py-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all duration-150`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>
      {/* Mobile Top Bar */}
      <MobileTopBar />
    </>
  );
}

function MobileTopBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const navItems = NAV_ITEMS.map((item) =>
    item.id === 'nav-assignments'
      ? { ...item, badge: getAssignmentBadge() }
      : item
  );

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between h-14 px-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <AppLogo size={28} />
          <span className="font-semibold text-slate-900 text-sm">ITAssetTracker</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="icon-btn relative">
            <Bell size={18} />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <button onClick={() => setOpen(true)} className="icon-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      {/* Mobile Drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-64 bg-white h-full flex flex-col shadow-xl">
            <div className="flex items-center justify-between h-14 px-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AppLogo size={28} />
                <span className="font-semibold text-slate-900 text-sm">ITAssetTracker</span>
              </div>
              <button onClick={() => setOpen(false)} className="icon-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems?.map((item) => {
                const Icon = item?.icon;
                const isActive = pathname === item?.href;
                return (
                  <Link key={item?.id} href={item?.href} onClick={() => setOpen(false)}>
                    <span
                      className={`sidebar-nav-item ${
                        isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="flex-1">{item?.label}</span>
                      {item?.badge !== null && (
                        <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
                          {item?.badge}
                        </span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
      {/* Mobile spacer */}
      <div className="lg:hidden h-14 flex-shrink-0" />
    </>
  );
}