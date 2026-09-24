/**
 * Pure helpers for the projects list page (filtering, counts, permissions).
 */
import type { Project } from '@secretpad/api-client';

export type ModeFilter = 'ALL' | 'MPC' | 'TEE';

export function filterProjects<T extends Pick<Project, 'projectName' | 'computeMode'> & { name?: string }>(
  projects: T[],
  search: string,
  mode: ModeFilter
): T[] {
  const q = search.trim().toLowerCase();
  return projects.filter((p) => {
    if (mode !== 'ALL' && (p.computeMode || 'MPC').toUpperCase() !== mode) return false;
    if (!q) return true;
    return (p.projectName || p.name || '').toLowerCase().includes(q);
  });
}

/** `ProjectVO.graphCount` / `jobCount` (Java contract), tolerant of missing fields. */
export function projectCounts(project: object): { graphCount: number; jobCount: number } {
  const p = project as { graphCount?: unknown; jobCount?: unknown };
  return { graphCount: Number(p.graphCount ?? 0) || 0, jobCount: Number(p.jobCount ?? 0) || 0 };
}

/** Delete is enabled only when the typed text equals the project name exactly. */
export function isDeleteConfirmed(project: { projectName?: string; name?: string }, typed: string): boolean {
  const name = project.projectName || project.name || '';
  return !!name && typed === name;
}

export interface ProjectPlatformFlags {
  isCenter: boolean;
  isCenterAdmin: boolean;
  isAutonomy: boolean;
  isTest?: boolean;
}

/**
 * - create: CENTER (admin or EDGE account — legacy handles both) and AUTONOMY on its own platform
 * - manage (edit/delete/add node/add table/stop job): CENTER admin and AUTONOMY
 */
export function projectPermissions(p: ProjectPlatformFlags): { canCreate: boolean; canManage: boolean } {
  return {
    canCreate: p.isCenter || p.isAutonomy || !!p.isTest,
    canManage: p.isCenterAdmin || p.isAutonomy || !!p.isTest,
  };
}
