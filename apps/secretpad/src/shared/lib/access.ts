/**
 * Route guards, landing pages and menus per platform (plan §4.1).
 *
 * Pure functions over {@link PlatformContext} so they can be used both from
 * TanStack Router `beforeLoad` (reading the persisted user synchronously) and
 * from React components (reading the auth store), and unit-tested directly.
 *
 * Legacy mapping:
 * - center-auth / guide-auth      → CENTER-only pages; guide hidden for EDGE accounts on CENTER
 * - edge-auth / p2p-edge-center   → node view: EDGE own node, CENTER admin any node, AUTONOMY own node
 * - p2p-center-auth               → DAG / records: CENTER + AUTONOMY (+P2P/TEST)
 * - p2p-login-auth                → AUTONOMY workbench with own ownerId
 */
import type { PlatformContext } from './platform';
import { Platform, canEnterNode, isEdgeAccountOnCenter } from './platform';

export interface HomeTarget {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
}

/** Landing page after login / when hitting `/` or a forbidden route. */
export function resolveHomePath(ctx: PlatformContext, opts: { firstLogin?: boolean } = {}): HomeTarget {
  switch (ctx.platformType) {
    case Platform.AUTONOMY:
      return ctx.ownerId ? { to: '/workbench', search: { ownerId: ctx.ownerId } } : { to: '/workbench' };
    case Platform.P2P:
      return { to: '/workbench' };
    case Platform.EDGE:
      return ctx.ownerId ? { to: '/node/$nodeId', params: { nodeId: ctx.ownerId } } : { to: '/p2p/my-node' };
    case Platform.CENTER:
      if (isEdgeAccountOnCenter(ctx)) return { to: '/dashboard' };
      return opts.firstLogin ? { to: '/guide' } : { to: '/dashboard' };
    default:
      return { to: '/dashboard' };
  }
}

/** Turn a HomeTarget into a concrete URL (for window.location / tests). */
export function homeHref(target: HomeTarget): string {
  let path = target.to;
  for (const [k, v] of Object.entries(target.params || {})) path = path.replace(`$${k}`, encodeURIComponent(v));
  const qs = new URLSearchParams(target.search || {}).toString();
  return qs ? `${path}?${qs}` : path;
}

const P = Platform;
type Rule = (ctx: PlatformContext) => boolean;

const anyOf =
  (...types: Platform[]): Rule =>
  (ctx) =>
    types.includes(ctx.platformType);

/** CENTER admin (CENTER platform + CENTER account) or TEST. */
const centerAdmin: Rule = (ctx) =>
  ctx.platformType === P.TEST || (ctx.platformType === P.CENTER && !isEdgeAccountOnCenter(ctx));

/** Pages available to every platform (node-scoped resources, messages, account…). */
const everyone: Rule = () => true;

/**
 * Ordered prefix rules; first match wins. Paths not listed are allowed.
 * Node-owned resource pages are reachable by all, the pages themselves scope
 * writes via `canWriteNode`.
 */
const ROUTE_RULES: [prefix: string, rule: Rule][] = [
  ['/nodes', centerAdmin],
  ['/all-data-sources', centerAdmin],
  ['/all-data-tables', centerAdmin],
  ['/guide', (ctx) => centerAdmin(ctx) || anyOf(P.AUTONOMY, P.P2P)(ctx)],
  // Institutions exist only on AUTONOMY/P2P (legacy InstController is AUTONOMY-only); on CENTER the
  // admin's owner is the platform (kuscia-system) and inst/get · inst/node/list return INST_NOT_EXISTS.
  ['/institutions', anyOf(P.AUTONOMY, P.P2P, P.TEST)],
  ['/inst-register', anyOf(P.AUTONOMY, P.P2P, P.TEST)],
  ['/projects', anyOf(P.CENTER, P.TEST)],
  ['/privacy-scenes', anyOf(P.CENTER, P.TEST, P.AUTONOMY, P.P2P)],
  ['/dashboard', anyOf(P.CENTER, P.TEST)],
  ['/graphs', anyOf(P.CENTER, P.TEST, P.AUTONOMY, P.P2P)],
  ['/dag', anyOf(P.CENTER, P.TEST, P.AUTONOMY, P.P2P)],
  ['/job-records', anyOf(P.CENTER, P.TEST, P.AUTONOMY, P.P2P)],
  ['/models', anyOf(P.CENTER, P.TEST, P.AUTONOMY, P.P2P)],
  ['/periodic-tasks', anyOf(P.CENTER, P.TEST, P.AUTONOMY, P.P2P)],
  ['/p2p/projects', anyOf(P.AUTONOMY, P.P2P, P.TEST)],
  ['/workbench', anyOf(P.CENTER, P.AUTONOMY, P.P2P, P.TEST)],
  ['/p2p/my-node', everyone],
  ['/messages', everyone],
  ['/account', everyone],
  ['/data-sources', everyone],
  ['/data-tables', everyone],
  ['/results', everyone],
  ['/node-routes', everyone],
  ['/feature-datasource', everyone],
  ['/cloud-logs', everyone],
  ['/component-versions', everyone],
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

/** Whether the current account may open `pathname`. */
export function canAccessPath(pathname: string, ctx: PlatformContext): boolean {
  const nodeMatch = /^\/node\/([^/]+)/.exec(pathname);
  if (nodeMatch) return canEnterNode(ctx, decodeURIComponent(nodeMatch[1]));
  for (const [prefix, rule] of ROUTE_RULES) {
    if (matchesPrefix(pathname, prefix)) return rule(ctx);
  }
  return true;
}

export interface MenuItem {
  /** Section header (no path). */
  section?: string;
  path?: string;
  /** i18n key for the label. */
  labelKey?: string;
  icon?: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
}

/** Sidebar menu per platform/account (legacy new-home tabs, edge.tsx and node view). */
export function getMenu(ctx: PlatformContext): MenuItem[] {
  const own = ctx.ownerId;
  if (ctx.platformType === P.EDGE) {
    return [
      { section: 'sidebar.nodeView' },
      ...(own
        ? [
            { path: '/node/$nodeId/data-sources', params: { nodeId: own }, labelKey: 'sidebar.dataSources', icon: '🔌' },
            { path: '/node/$nodeId/data-tables', params: { nodeId: own }, labelKey: 'sidebar.dataTables', icon: '🗄️' },
            { path: '/node/$nodeId/cooperative-nodes', params: { nodeId: own }, labelKey: 'sidebar.cooperativeNodes', icon: '🔗' },
            { path: '/node/$nodeId/results', params: { nodeId: own }, labelKey: 'sidebar.results', icon: '📦' },
          ]
        : []),
      { section: 'sidebar.governance' },
      { path: '/p2p/my-node', labelKey: 'sidebar.p2pMyNode', icon: '🖥️' },
      { path: '/messages', labelKey: 'sidebar.messages', icon: '🔔' },
      { path: '/account', labelKey: 'sidebar.account', icon: '👤' },
    ];
  }

  if (ctx.platformType === P.AUTONOMY || ctx.platformType === P.P2P) {
    return [
      { section: 'sidebar.overview' },
      { path: '/workbench', labelKey: 'sidebar.workbench', icon: '🧭', search: own ? { ownerId: own } : undefined },
      { path: '/guide', labelKey: 'sidebar.guide', icon: '🚀' },
      { section: 'sidebar.p2p' },
      { path: '/p2p/projects', labelKey: 'sidebar.p2pProjects', icon: '📁' },
      { path: '/dag', labelKey: 'sidebar.dag', icon: '⚡' },
      { path: '/periodic-tasks', labelKey: 'sidebar.periodicTasks', icon: '⏰' },
      { path: '/p2p/my-node', labelKey: 'sidebar.p2pMyNode', icon: '🖥️' },
      { path: '/institutions', labelKey: 'sidebar.institutions', icon: '🏢' },
      { path: '/node-routes', labelKey: 'sidebar.cooperativeNodes', icon: '🔗' },
      { section: 'sidebar.resources' },
      { path: '/data-sources', labelKey: 'sidebar.dataSources', icon: '🔌' },
      { path: '/data-tables', labelKey: 'sidebar.dataTables', icon: '🗄️' },
      { path: '/feature-datasource', labelKey: 'sidebar.featureDatasource', icon: '🧬' },
      { section: 'sidebar.governance' },
      { path: '/results', labelKey: 'sidebar.results', icon: '📦' },
      { path: '/models', labelKey: 'sidebar.models', icon: '🤖' },
      { path: '/job-records', labelKey: 'sidebar.jobRecords', icon: '📋' },
      { path: '/messages', labelKey: 'sidebar.messages', icon: '🔔' },
      { path: '/cloud-logs', labelKey: 'sidebar.cloudLogs', icon: '☁️' },
      { path: '/privacy-scenes', labelKey: 'sidebar.privacyScenes', icon: '🛡️' },
      { path: '/account', labelKey: 'sidebar.account', icon: '👤' },
    ];
  }

  // CENTER / TEST
  const admin = centerAdmin(ctx);
  const items: MenuItem[] = [
    { section: 'sidebar.overview' },
    { path: '/dashboard', labelKey: 'sidebar.dashboard', icon: '📊' },
    { path: '/workbench', labelKey: 'sidebar.workbench', icon: '🧭' },
  ];
  if (admin) items.push({ path: '/guide', labelKey: 'sidebar.guide', icon: '🚀' });
  items.push(
    { section: 'sidebar.collaboration' },
    { path: '/projects', labelKey: 'sidebar.projects', icon: '📁' },
    { path: '/dag', labelKey: 'sidebar.dag', icon: '⚡' },
    { path: '/graphs', labelKey: 'sidebar.graphs', icon: '🕸️' },
    { section: 'sidebar.resources' },
  );
  if (admin) {
    items.push(
      { path: '/nodes', labelKey: 'sidebar.nodes', icon: '🖥️' },
      { path: '/all-data-sources', labelKey: 'sidebar.allDataSources', icon: '🔌' },
      { path: '/all-data-tables', labelKey: 'sidebar.allDataTables', icon: '🗄️' },
    );
  } else if (own) {
    // EDGE account on CENTER: only its own node view, no node management.
    items.push({ path: '/node/$nodeId', params: { nodeId: own }, labelKey: 'sidebar.myNodeView', icon: '🖥️' });
  }
  items.push(
    { path: '/data-sources', labelKey: 'sidebar.dataSources', icon: '🔌' },
    { path: '/data-tables', labelKey: 'sidebar.dataTables', icon: '🗄️' },
    { path: '/feature-datasource', labelKey: 'sidebar.featureDatasource', icon: '🧬' },
    { path: '/node-routes', labelKey: 'sidebar.nodeRoutes', icon: '🔗' },
  );
  items.push(
    { section: 'sidebar.governance' },
    { path: '/models', labelKey: 'sidebar.models', icon: '🤖' },
    { path: '/results', labelKey: 'sidebar.results', icon: '📦' },
    { path: '/periodic-tasks', labelKey: 'sidebar.periodicTasks', icon: '⏰' },
    { path: '/job-records', labelKey: 'sidebar.jobRecords', icon: '📋' },
    { path: '/messages', labelKey: 'sidebar.messages', icon: '🔔' },
    { path: '/cloud-logs', labelKey: 'sidebar.cloudLogs', icon: '☁️' },
    { path: '/component-versions', labelKey: 'sidebar.componentVersions', icon: '🏷️' },
    { path: '/privacy-scenes', labelKey: 'sidebar.privacyScenes', icon: '🛡️' },
    { path: '/account', labelKey: 'sidebar.account', icon: '👤' },
  );
  return items;
}
