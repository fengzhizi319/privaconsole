import React from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { useTranslation } from '../shared/lib/i18n';
import { usePlatformContext } from '../shared/lib/platform';
import { getMenu, homeHref } from '../shared/lib/access';

export const AppSidebar: React.FC = () => {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const ctx = usePlatformContext();

  // Menus differ per platformType / ownerType (CENTER admin, EDGE account on
  // CENTER, EDGE node view, AUTONOMY/P2P workbench) — see shared/lib/access.ts.
  const menuItems = getMenu(ctx).map((item) => ({
    ...item,
    section: item.section ? t(item.section) : undefined,
    label: item.labelKey ? t(item.labelKey) : '',
    href: item.path ? homeHref({ to: item.path, params: item.params }) : '',
  }));

  return (
    <aside className="w-56 bg-gray-900 text-gray-300 flex flex-col flex-shrink-0 border-r border-gray-800 select-none">
      {/* Brand Logo */}
      <div className="h-14 px-4 flex items-center gap-3 border-b border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
          SP
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-gray-100 text-sm tracking-wide">SecretPad</span>
          <span className="text-[10px] text-blue-400 font-mono">v3.0.0</span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item, idx) => {
          if (item.section) {
            return (
              <div key={idx} className="pt-3 pb-1 px-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                {item.section}
              </div>
            );
          }

          const isActive =
            pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
          return (
            <Link
              key={item.href}
              {...({ to: item.path, params: item.params, search: item.search } as React.ComponentProps<typeof Link>)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-gray-400 hover:bg-gray-800/80 hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-800 bg-gray-950/50 flex items-center justify-between text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Kuscia Master
        </span>
        <span className="font-mono text-gray-600">v0.5.0</span>
      </div>
    </aside>
  );
};
