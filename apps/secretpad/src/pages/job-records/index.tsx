/**
 * DAG / Pipeline 运行记录页。
 *
 * 对应旧前端 `dag-record`、`pipeline-record-list`、`dag-result` 模块，
 * 在新前端中提供一个跨项目的统一运行记录列表：
 * - 展示所有项目的近期 Graph 执行任务；
 * - 支持按项目名称搜索过滤；
 * - 支持停止运行中任务；
 * - 点击任务打开详情弹窗，查看 DAG 节点状态、日志与输出。
 */
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Badge, toast } from '@secretpad/design-system';
import type { JobExecution } from '@secretpad/api-client';
import { apiClient } from '@secretpad/api-client';
import { useTranslation } from '../../shared/lib/i18n';
import { AccessGuard } from '../../features/auth/ui/access-guard';
import { Platform } from '../../shared/lib/platform';
import { JobDetailModal } from '../../features/job-detail';

function jobStatusBadge(status: string) {
  switch (status) {
    case 'RUNNING':
      return 'processing' as const;
    case 'SUCCEEDED':
      return 'success' as const;
    case 'FAILED':
      return 'error' as const;
    default:
      return 'default' as const;
  }
}

export const JobRecordsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [detailProjectId, setDetailProjectId] = useState<string>('');
  const [detailJobId, setDetailJobId] = useState<string>('');

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.getProjects(),
  });
  const projects = projectsQuery.data ?? [];

  const jobsQuery = useQuery({
    queryKey: ['recent-jobs'],
    queryFn: () => apiClient.getJobs(100),
  });

  const stopMutation = useMutation({
    mutationFn: async (job: JobExecution) => {
      await apiClient.stopProjectJob(job.projectId, job.jobId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['project-jobs'] });
      toast.success(t('jobRecords.stopSuccess'));
    },
    onError: (e) => {
      toast.error(t('jobRecords.stopError', { message: e instanceof Error ? e.message : String(e) }));
    },
  });

  const projectNameMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => {
      map.set(p.projectId, p.projectName || p.name || p.projectId);
    });
    return map;
  }, [projects]);

  const jobs = useMemo(() => {
    const all = jobsQuery.data ?? [];
    if (!search.trim()) return all;
    const lower = search.toLowerCase();
    return all.filter((job) => {
      const nameMatch = (job.name || '').toLowerCase().includes(lower);
      const projectMatch = (projectNameMap.get(job.projectId) || job.projectId).toLowerCase().includes(lower);
      return nameMatch || projectMatch;
    });
  }, [jobsQuery.data, search, projectNameMap]);

  const loading = projectsQuery.isLoading || jobsQuery.isLoading;
  const error = projectsQuery.error?.message || jobsQuery.error?.message || null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('jobRecords.title')}</h2>
          <p className="text-xs text-gray-500">{t('jobRecords.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('jobRecords.searchPlaceholder')}
            className="px-3 py-1.5 rounded-lg text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
          />
          <Button variant="outline" onClick={() => jobsQuery.refetch()} loading={jobsQuery.isFetching}>
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-4 py-2">
          {t('common.error', { message: error })}
        </div>
      )}

      {loading && <div className="text-xs text-gray-400">{t('common.loading')}</div>}

      {!loading && !error && (
        <Card bodyClassName="p-0">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-gray-850 text-gray-500 font-semibold uppercase border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="p-4">{t('jobRecords.name')}</th>
                <th className="p-4">{t('jobRecords.project')}</th>
                <th className="p-4">{t('jobRecords.status')}</th>
                <th className="p-4">{t('jobRecords.duration')}</th>
                <th className="p-4">{t('jobRecords.createTime')}</th>
                <th className="p-4">{t('common.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-400">
                    {t('jobRecords.noData')}
                  </td>
                </tr>
              )}
              {jobs.map((job) => (
                <tr key={job.jobId} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/50">
                  <td className="p-4 font-semibold text-gray-800 dark:text-gray-200">
                    <button
                      className="text-left hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={() => {
                        setDetailProjectId(job.projectId);
                        setDetailJobId(job.jobId);
                      }}
                    >
                      {job.name || job.jobId}
                    </button>
                  </td>
                  <td className="p-4 text-gray-500">{projectNameMap.get(job.projectId) || job.projectId}</td>
                  <td className="p-4">
                    <Badge status={jobStatusBadge(job.status)}>{job.status}</Badge>
                  </td>
                  <td className="p-4 text-gray-500">{job.duration || '-'}</td>
                  <td className="p-4 text-gray-500">{job.createTime}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDetailProjectId(job.projectId);
                          setDetailJobId(job.jobId);
                        }}
                      >
                        {t('common.detail')}
                      </Button>
                      {job.status === 'RUNNING' && (
                        <AccessGuard access={{ types: [Platform.CENTER] }}>
                          <Button
                            size="sm"
                            variant="danger"
                            loading={stopMutation.isPending}
                            onClick={() => stopMutation.mutate(job)}
                          >
                            {t('jobRecords.stop')}
                          </Button>
                        </AccessGuard>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <JobDetailModal
        projectId={detailProjectId}
        jobId={detailJobId}
        isOpen={!!detailProjectId && !!detailJobId}
        onClose={() => {
          setDetailProjectId('');
          setDetailJobId('');
        }}
      />
    </div>
  );
};
