import React, { useEffect } from 'react';
import { Outlet, useRouterState } from '@tanstack/react-router';
import { AppSidebar } from '../widgets/AppSidebar';
import { AppHeader } from '../widgets/AppHeader';
import { useTranslation } from '../shared/lib/i18n';
import { RouteGuard } from '../features/auth/ui/access-guard';
import { useAuthStore } from '../features/auth/model/auth-store';
import { GuideTourHost } from '../features/guide-tour';

/**
 * Authenticated application shell: sidebar + header + routed content.
 * Rendered by the `app` layout route; child routes mount into <Outlet />.
 */
export const AppLayout: React.FC = () => {
  const { t } = useTranslation();
  const { rehydrate, refreshUser } = useAuthStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Sync the auth store from localStorage, then refresh the user context
  // (platformType / ownerType / ownerId / deployMode) via user/get on app load.
  useEffect(() => {
    rehydrate();
    void refreshUser();
  }, [rehydrate, refreshUser]);

  const getTitle = () => {
    if (pathname.startsWith('/node/')) return t('nodeView.title');
    switch (pathname) {
      case '/dashboard':
        return t('dashboard.title');
      case '/projects':
        return t('projects.title');
      case '/nodes':
        return t('nodes.title');
      case '/data-tables':
        return t('dataTables.title');
      case '/data-sources':
        return t('dataSources.title');
      case '/data-sources/detail':
        return t('dataSources.detailTitle');
      case '/dag':
        return t('sidebar.dag');
      case '/models':
        return t('sidebar.models');
      case '/results':
        return t('sidebar.results');
      case '/periodic-tasks':
        return t('sidebar.periodicTasks');
      case '/messages':
        return t('sidebar.messages');
      case '/node-routes':
        return t('nodeRoutes.title');
      case '/institutions':
        return t('institutions.title');
      case '/p2p/projects':
        return t('p2p.projectsTitle');
      case '/p2p/my-node':
        return t('p2p.myNodeTitle');
      case '/account':
        return t('account.title');
      case '/all-data-sources':
        return t('sidebar.allDataSources');
      case '/all-data-tables':
        return t('sidebar.allDataTables');
      case '/inst-register':
        return t('sidebar.instRegister');
      case '/periodic-tasks/detail':
        return t('sidebar.periodicTaskDetail');
      case '/guide':
        return t('sidebar.guide');
      case '/workbench':
        return t('sidebar.workbench');
      case '/privacy-scenes':
        return t('sidebar.privacyScenes');
      case '/graphs':
        return t('sidebar.graphs');
      case '/job-records':
        return t('sidebar.jobRecords');
      case '/cloud-logs':
        return t('sidebar.cloudLogs');
      case '/feature-datasource':
        return t('sidebar.featureDatasource');
      case '/component-versions':
        return t('sidebar.componentVersions');
      default:
        return t('app.title');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader title={getTitle()} />
        <main className="flex-1 overflow-y-auto p-6">
          <RouteGuard>
            <Outlet />
          </RouteGuard>
        </main>
        <GuideTourHost />
      </div>
    </div>
  );
};
