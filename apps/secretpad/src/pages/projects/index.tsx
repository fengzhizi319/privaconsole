import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Badge, Modal, ConfirmDialog, FormField, Input, Select, Textarea, Tour, toast } from '@secretpad/design-system';
import { PAGE_TOUR_KEYS, usePageTour } from '../../features/guide-tour';
import { GraphCountPopover, JobCountPopover } from './count-popover';
import type { Project, JobExecution, ProjectNodeVO, ProjectDatatableBase } from '@secretpad/api-client';
import { apiClient } from '@secretpad/api-client';
import { useTranslation } from '../../shared/lib/i18n';
import { usePlatform } from '../../shared/lib/platform';
import { JobDetailModal } from '../../features/job-detail';
import { CreateProjectWizard, validateProjectDescription, validateProjectName, PROJECT_DESC_MAX, PROJECT_NAME_MAX } from '../../features/create-project';
import { filterProjects, projectPermissions, projectCounts, isDeleteConfirmed } from './project-list.logic';
import type { ModeFilter } from './project-list.logic';
import { NODE_STATUS, normalizeStatus, statusBadge } from '@secretpad/dag-next';

/**
 * 项目列表与详情页面。
 *
 * 设计要点：
 * 1. 项目卡片列表支持搜索、创建、编辑、删除；点击进入详情抽屉。
 * 2. 详情抽屉展示项目基本信息、已加入节点、已关联数据表、近期任务。
 * 3. 已关联数据表按节点分组展示，支持移除项目中的数据表（调用 project/datatable/delete）。
 * 4. 任务列表支持查看任务详情弹窗：展示任务下各节点/算子的状态、日志、输出。
 *    使用 project/job/get 获取完整图状态，再对失败/成功节点调用 task/logs 与 task/output。
 *    SecretPad 后端任务 ID 约定为 `{jobId}-{graphNodeId}`，因此日志/输出请求均按此规则构造 taskId。
 * 5. 所有变更操作均通过 TanStack Query mutation + invalidateQueries 刷新相关缓存。
 */
export const ProjectsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const platform = usePlatform();
  const perms = projectPermissions(platform);

  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('ALL');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail drawer
  const [detailProject, setDetailProject] = useState<Project | null>(null);

  // Edit modal
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editErrors, setEditErrors] = useState<{ name: string | null; description: string | null }>({ name: null, description: null });

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  // Add node / datatable modal
  const [addNodeOpen, setAddNodeOpen] = useState(false);
  const [addNodeSelected, setAddNodeSelected] = useState('');
  const [addTableOpen, setAddTableOpen] = useState(false);
  const [addTableNodeId, setAddTableNodeId] = useState('');
  const [addTableId, setAddTableId] = useState('');

  // Remove datatable confirm
  const [removeTableTarget, setRemoveTableTarget] = useState<{ nodeId: string; datatableId: string } | null>(null);

  // Job detail modal
  const [jobDetailProjectId, setJobDetailProjectId] = useState<string>('');
  const [jobDetailJobId, setJobDetailJobId] = useState<string>('');

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.getProjects(),
  });
  const projects = projectsQuery.data ?? [];
  // 旧版 project-list Tour：只有 1 个项目时首次提示「进入项目」（localStorage ProjectListTour）。
  const projectTour = usePageTour(PAGE_TOUR_KEYS.projectList, projects.length === 1);

  const invalidateProjects = () => queryClient.invalidateQueries({ queryKey: ['projects'] });

  // Detail + jobs queries (enabled when drawer open)
  const detailQuery = useQuery({
    queryKey: ['project-detail', detailProject?.projectId],
    queryFn: () => apiClient.getProjectDetail(detailProject!.projectId),
    enabled: !!detailProject,
  });
  const detailData = detailQuery.data ?? detailProject;

  const jobsQuery = useQuery({
    queryKey: ['project-jobs', detailProject?.projectId],
    queryFn: () => apiClient.getProjectJobs(detailProject!.projectId),
    enabled: !!detailProject,
  });
  const jobs: JobExecution[] = jobsQuery.data ?? [];

  // Nodes & datatables for "add" flows
  const nodesQuery = useQuery({
    queryKey: ['nodes'],
    queryFn: () => apiClient.getNodes(),
    enabled: addNodeOpen,
  });
  const allNodes = nodesQuery.data ?? [];

  const tablesQuery = useQuery({
    queryKey: ['datatables', addTableNodeId],
    queryFn: () => apiClient.getDataTables(addTableNodeId),
    enabled: addTableOpen && !!addTableNodeId,
  });
  const tables = tablesQuery.data ?? [];

  const updateMutation = useMutation({
    mutationFn: () =>
      apiClient.updateProject({ projectId: editProject!.projectId, name: editName.trim(), description: editDescription.trim() }),
    onSuccess: () => {
      invalidateProjects();
      setEditProject(null);
      toast.success(t('projects.updateSuccess'));
    },
    onError: (e) => setError(e instanceof Error ? e.message : t('projects.updateError')),
  });

  const deleteMutation = useMutation({
    mutationFn: (projectId: string) => apiClient.deleteProject(projectId),
    onSuccess: () => {
      invalidateProjects();
      setDeleteTarget(null);
      toast.success(t('projects.deleteSuccess'));
    },
    onError: (e) => {
      setDeleteTarget(null);
      setError(e instanceof Error ? e.message : String(e));
    },
  });

  const addNodeMutation = useMutation({
    mutationFn: () => apiClient.addProjectNode(detailProject!.projectId, addNodeSelected),
    onSuccess: () => {
      setAddNodeOpen(false);
      setAddNodeSelected('');
      invalidateProjects();
      queryClient.invalidateQueries({ queryKey: ['project-detail', detailProject?.projectId] });
      toast.success(t('projects.nodeAdded'));
    },
    onError: (e) => setError(e instanceof Error ? e.message : String(e)),
  });

  const addTableMutation = useMutation({
    mutationFn: () =>
      apiClient.addProjectDatatable({
        projectId: detailProject!.projectId,
        nodeId: addTableNodeId,
        datatableId: addTableId,
      }),
    onSuccess: () => {
      setAddTableOpen(false);
      setAddTableId('');
      queryClient.invalidateQueries({ queryKey: ['project-detail', detailProject?.projectId] });
      toast.success(t('projects.datatableAdded'));
    },
    onError: (e) => setError(e instanceof Error ? e.message : String(e)),
  });

  const removeTableMutation = useMutation({
    mutationFn: () =>
      apiClient.deleteProjectDatatable({
        projectId: detailProject!.projectId,
        nodeId: removeTableTarget!.nodeId,
        datatableId: removeTableTarget!.datatableId,
      }),
    onSuccess: () => {
      setRemoveTableTarget(null);
      queryClient.invalidateQueries({ queryKey: ['project-detail', detailProject?.projectId] });
      toast.success(t('projects.datatableRemoved'));
    },
    onError: (e) => setError(e instanceof Error ? e.message : String(e)),
  });

  const stopJobMutation = useMutation({
    mutationFn: (job: JobExecution) => apiClient.stopProjectJob(detailProject!.projectId, job.jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-jobs', detailProject?.projectId] });
      toast.success(t('dag.stopSuccess'));
    },
    onError: (e) => setError(e instanceof Error ? e.message : String(e)),
  });

  const openEdit = (project: Project) => {
    setEditProject(project);
    setEditName(project.projectName || project.name || '');
    setEditDescription(project.description || '');
    setEditErrors({ name: null, description: null });
  };

  const submitEdit = () => {
    const errs = { name: validateProjectName(editName), description: validateProjectDescription(editDescription) };
    setEditErrors(errs);
    if (errs.name || errs.description) return;
    updateMutation.mutate();
  };

  const openDelete = (project: Project) => {
    setDeleteTarget(project);
    setDeleteConfirmName('');
  };

  const openDag = (projectId: string) => navigate({ to: '/dag', search: { projectId } });

  const openAddTable = () => {
    const firstNode = detailProject?.nodes?.[0]?.nodeId || '';
    setAddTableNodeId(firstNode);
    setAddTableId('');
    setAddTableOpen(true);
  };

  const openJobDetail = (projectId: string, jobId: string) => {
    setJobDetailProjectId(projectId);
    setJobDetailJobId(jobId);
  };

  const closeJobDetail = () => {
    setJobDetailProjectId('');
    setJobDetailJobId('');
  };

  const filteredProjects = filterProjects(projects, search, modeFilter);

  const projectNodeNames = (project: Project) =>
    (project?.nodes || []).map((n) => n?.nodeName || n?.nodeId || '').filter(Boolean).join(', ');

  const jobStatusBadge = (status: string) => statusBadge(status);

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('projects.title')}</h2>
          <p className="text-xs text-gray-500">{t('projects.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder={t('projects.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
          />
          <Select
            className="w-36"
            value={modeFilter}
            onChange={(v) => setModeFilter(v as ModeFilter)}
            options={[
              { value: 'ALL', label: t('projects.modeFilterAll') },
              { value: 'MPC', label: t('projects.modeFilterMpc') },
              { value: 'TEE', label: t('projects.modeFilterTee') },
            ]}
          />
          {perms.canCreate && (
            <Button variant="primary" size="md" icon={<span>＋</span>} onClick={() => setIsWizardOpen(true)} data-tour="project-create">
              {t('projects.create')}
            </Button>
          )}
        </div>
      </div>

      {(error || projectsQuery.error) && (
        <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-4 py-2">
          {t('common.error', { message: error || projectsQuery.error?.message || '' })}
        </div>
      )}

      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" data-tour="project-list">
        {filteredProjects.map((project) => {
          const counts = projectCounts(project);
          return (
            <Card
              key={project.projectId}
              className="hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
              onClick={() => setDetailProject(project)}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    {t('projects.modeTag', { mode: project.computeMode })}
                  </span>
                  <Badge status={project.status === 'ACTIVE' ? 'success' : 'default'}>{project.status}</Badge>
                </div>

                <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 mb-1.5">{project.projectName}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{project.description || t('projects.noDescription')}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <span>
                    {t('projects.graphCount')}: <GraphCountPopover projectId={project.projectId} count={counts.graphCount} />
                  </span>
                  <span>
                    {t('projects.jobCount')}: <JobCountPopover projectId={project.projectId} count={counts.jobCount} />
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-gray-500 min-w-0">
                  <span>{t('projects.joinedNodes')}:</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[110px]">
                    {projectNodeNames(project) || '-'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="link" data-tour="project-open-dag" onClick={(e) => { e.stopPropagation(); openDag(project.projectId); }}>
                    {t('projects.openDagShort')}
                  </Button>
                  {perms.canManage && (
                    <>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(project); }}>{t('projects.edit')}</Button>
                      <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); openDelete(project); }}>{t('projects.delete')}</Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredProjects.length === 0 && !error && !projectsQuery.error && (
        <div className="text-center text-xs text-gray-400 py-10">{t('projects.noProjects')}</div>
      )}

      {/* Create Project Wizard */}
      <CreateProjectWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />

      {/* Edit Project Modal */}
      <Modal
        isOpen={!!editProject}
        onClose={() => setEditProject(null)}
        title={t('projects.editModalTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditProject(null)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={submitEdit} loading={updateMutation.isPending}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <FormField label={t('projects.nameLabel')} required error={editErrors.name ? t(editErrors.name, { max: PROJECT_NAME_MAX }) : undefined}>
            <Input
              value={editName}
              invalid={!!editErrors.name}
              onChange={(e) => { setEditName(e.target.value); setEditErrors((p) => ({ ...p, name: null })); }}
            />
          </FormField>
          <FormField label={t('projects.descLabel')} error={editErrors.description ? t(editErrors.description, { max: PROJECT_DESC_MAX }) : undefined}>
            <Textarea
              value={editDescription}
              rows={3}
              invalid={!!editErrors.description}
              onChange={(e) => { setEditDescription(e.target.value); setEditErrors((p) => ({ ...p, description: null })); }}
            />
          </FormField>
        </div>
      </Modal>

      {/* Detail Drawer */}
      {detailProject && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetailProject(null)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 h-full shadow-2xl overflow-y-auto p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {detailData?.projectName || detailProject.projectName}
                </h3>
                <p className="text-xs text-gray-500 font-mono mt-1">{detailProject.projectId}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setDetailProject(null)}>✕</Button>
            </div>

            <div className="text-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">{t('projects.modeLabel')}:</span>
                <span className="font-mono font-semibold">{detailData?.computeMode || detailProject.computeMode}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">{t('projects.descLabel')}:</span>
                <span>{detailData?.description || detailProject.description || t('projects.noDescription')}</span>
              </div>
            </div>

            {/* Joined nodes + add actions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('projects.joinedNodes')}</h4>
                {perms.canManage && (<>
                  <Button size="sm" variant="outline" onClick={() => { setAddNodeSelected(''); setAddNodeOpen(true); }}>＋ {t('projects.addNode')}</Button>
                </>)}
              </div>
              <div className="flex flex-wrap gap-2">
                {(detailData?.nodes || detailProject.nodes || []).map((n) => (
                  <Badge key={n.nodeId} status="default">{n.nodeName || n.nodeId}</Badge>
                ))}
                {(detailData?.nodes || detailProject.nodes || []).length === 0 && (
                  <span className="text-xs text-gray-400">-</span>
                )}
              </div>
            </div>

            {/* Project datatables */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('projects.datatables')}</h4>
                {perms.canManage && (<>
                  <Button size="sm" variant="outline" onClick={openAddTable}>＋ {t('projects.addDatatable')}</Button>
                </>)}
              </div>
              <div className="space-y-3">
                {(detailData?.nodes || detailProject.nodes || []).map((node: ProjectNodeVO) => (
                  <div key={node.nodeId}>
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{node.nodeName || node.nodeId}</div>
                    {(node.datatables || []).length === 0 ? (
                      <div className="text-xs text-gray-400 pl-2">-</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(node.datatables || []).map((tbl: ProjectDatatableBase) => (
                          <Badge key={tbl.datatableId} status="default" className="flex items-center gap-1.5">
                            <span>{tbl.datatableName || tbl.datatableId}</span>
                            {perms.canManage && (<>
                              <button
                                className="text-gray-400 hover:text-red-500"
                                onClick={() => setRemoveTableTarget({ nodeId: node.nodeId || '', datatableId: tbl.datatableId || '' })}
                                title={t('projects.removeDatatable')}
                              >
                                ✕
                              </button>
                            </>)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('projects.jobs')}</h4>
              <Button size="sm" variant="primary" onClick={() => openDag(detailProject.projectId)}>{t('projects.openDag')}</Button>
            </div>

            {jobsQuery.isLoading && <div className="text-xs text-gray-400">{t('common.loading')}</div>}
            <div className="space-y-2">
              {jobs.length === 0 && !jobsQuery.isLoading && (
                <div className="text-xs text-gray-400 text-center py-4">{t('projects.noJobs')}</div>
              )}
              {jobs.map((job) => (
                <div key={job.jobId} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800 text-xs hover:border-blue-500/40 transition-colors cursor-pointer" onClick={() => openJobDetail(detailProject.projectId, job.jobId)}>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-800 dark:text-gray-200 truncate">{job.name || job.jobId}</div>
                    <div className="text-gray-400 mt-0.5 font-mono">{job.createTime} {job.duration ? `· ${job.duration}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge status={jobStatusBadge(job.status)}>{job.status}</Badge>
                    {normalizeStatus(job.status) === NODE_STATUS.RUNNING && perms.canManage && (
                      <Button size="sm" variant="danger" loading={stopJobMutation.isPending} onClick={(e) => { e.stopPropagation(); stopJobMutation.mutate(job); }}>
                        {t('projects.stopJob')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Job Detail Modal */}
      <JobDetailModal
        projectId={jobDetailProjectId}
        jobId={jobDetailJobId}
        isOpen={!!jobDetailProjectId && !!jobDetailJobId}
        onClose={closeJobDetail}
      />

      {/* Add Node Modal */}
      <Modal
        isOpen={addNodeOpen}
        onClose={() => setAddNodeOpen(false)}
        title={t('projects.addNode')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddNodeOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={() => addNodeMutation.mutate()} loading={addNodeMutation.isPending} disabled={!addNodeSelected}>{t('common.confirm')}</Button>
          </>
        }
      >
        <div className="text-xs">
          <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('projects.selectNode')}</label>
          <select
            value={addNodeSelected}
            onChange={(e) => setAddNodeSelected(e.target.value)}
            className="w-full p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
          >
            <option value="">-</option>
            {allNodes.map((n) => (
              <option key={n.nodeId} value={n.nodeId}>{n.nodeName} ({n.nodeId})</option>
            ))}
          </select>
        </div>
      </Modal>

      {/* Add Datatable Modal */}
      <Modal
        isOpen={addTableOpen}
        onClose={() => setAddTableOpen(false)}
        title={t('projects.addDatatable')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddTableOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={() => addTableMutation.mutate()} loading={addTableMutation.isPending} disabled={!addTableNodeId || !addTableId}>{t('common.confirm')}</Button>
          </>
        }
      >
        <div className="text-xs space-y-4">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('projects.selectNode')}</label>
            <select
              value={addTableNodeId}
              onChange={(e) => { setAddTableNodeId(e.target.value); setAddTableId(''); }}
              className="w-full p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
            >
              {(detailProject?.nodes || []).map((n) => (
                <option key={n.nodeId} value={n.nodeId}>{n.nodeName || n.nodeId}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('projects.selectDatatable')}</label>
            <select
              value={addTableId}
              onChange={(e) => setAddTableId(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
            >
              <option value="">-</option>
              {tables.map((tbl) => (
                <option key={tbl.tableId} value={tbl.tableId}>{tbl.tableName} ({tbl.tableId})</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Remove Datatable Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!removeTableTarget}
        title={t('projects.removeDatatable')}
        message={t('projects.removeDatatableConfirm')}
        danger
        loading={removeTableMutation.isPending}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={() => removeTableTarget && removeTableMutation.mutate()}
        onCancel={() => setRemoveTableTarget(null)}
      />

      {/* Delete Confirm: the exact project name must be typed to enable confirm */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('projects.delete')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              disabled={!deleteTarget || !isDeleteConfirmed(deleteTarget, deleteConfirmName)}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.projectId)}
            >
              {t('projects.delete')}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-gray-600 dark:text-gray-300">{t('projects.deleteConfirm')}</p>
          <FormField label={t('projects.deleteTypeName', { name: deleteTarget?.projectName || deleteTarget?.name || '' })}>
            <Input
              value={deleteConfirmName}
              placeholder={deleteTarget?.projectName || deleteTarget?.name || ''}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
            />
          </FormField>
        </div>
      </Modal>
      <Tour
        open={projectTour.open}
        onClose={projectTour.close}
        steps={[{ target: '[data-tour="project-open-dag"]', title: t('guideTour.projectList.title'), content: t('guideTour.dag.desc') }]}
        labels={{ next: t('guideTour.next'), prev: t('guideTour.prev'), finish: t('guideTour.finish'), skip: t('guideTour.skip') }}
      />
    </div>
  );
};
