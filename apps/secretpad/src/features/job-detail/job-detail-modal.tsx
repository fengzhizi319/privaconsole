/**
 * 任务详情弹窗（跨页面复用）。
 *
 * 展示指定 project + job 的完整执行状态：
 * - 任务级状态、错误信息；
 * - 该任务对应的 DAG 图节点列表及每个节点状态；
 * - 选中节点后可在「日志」与「输出」Tab 之间切换查看。
 *
 * 后端任务 ID 约定为 `{jobId}-{graphNodeId}`，因此日志/输出请求均按此规则构造 taskId。
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Button, Badge } from '@secretpad/design-system';
import { apiClient, type GraphNodeOutputVO, type ProjectJobVO } from '@secretpad/api-client';
import { useTranslation } from '../../shared/lib/i18n';

interface JobDetailModalProps {
  projectId: string;
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
}

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

function renderTaskOutput(output: GraphNodeOutputVO | null | undefined, noOutputText: string) {
  if (!output) return <div className="text-gray-400">{noOutputText}</div>;
  if (output.type === 'table' && output.meta && Array.isArray(output.meta.rows)) {
    return (
      <div className="space-y-2">
        <div className="font-mono text-[10px] text-gray-500">
          type: {output.type} · codeName: {output.codeName}
        </div>
        {output.meta.rows.map((row: Record<string, unknown>, idx: number) => (
          <div key={idx} className="p-2 rounded bg-gray-50 dark:bg-gray-800 font-mono text-[10px]">
            {Object.entries(row)
              .map(([k, v]) => `${k}=${String(v)}`)
              .join(' · ')}
          </div>
        ))}
      </div>
    );
  }
  return (
    <pre className="text-[10px] font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-auto">
      {JSON.stringify(output, null, 2)}
    </pre>
  );
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({ projectId, jobId, isOpen, onClose }) => {
  const { t } = useTranslation();
  const [selectedGraphNodeId, setSelectedGraphNodeId] = useState<string>('');
  const [taskTab, setTaskTab] = useState<'logs' | 'output'>('logs');

  const jobDetailQuery = useQuery({
    queryKey: ['project-job-detail', projectId, jobId],
    queryFn: () => apiClient.getProjectJob(projectId, jobId),
    enabled: isOpen && !!projectId && !!jobId,
  });

  const jobDetail: ProjectJobVO | null = jobDetailQuery.data ?? null;
  const selectedTaskId = useMemo(
    () => (jobId && selectedGraphNodeId ? `${jobId}-${selectedGraphNodeId}` : ''),
    [jobId, selectedGraphNodeId]
  );

  const taskLogsQuery = useQuery({
    queryKey: ['project-job-task-logs', projectId, jobId, selectedTaskId],
    queryFn: () =>
      apiClient.getJobTaskLogs({
        projectId,
        jobId,
        taskId: selectedTaskId,
      }),
    enabled: isOpen && !!projectId && !!jobId && !!selectedTaskId && taskTab === 'logs',
  });

  const taskOutputQuery = useQuery({
    queryKey: ['project-job-task-output', projectId, jobId, selectedTaskId],
    queryFn: async () => {
      const node = jobDetail?.graph?.nodes?.find((n) => n.graphNodeId === selectedGraphNodeId);
      const outputId = node?.outputs?.[0];
      if (!outputId || !selectedTaskId) return null;
      return apiClient.getJobTaskOutput({
        projectId,
        jobId,
        taskId: selectedTaskId,
        outputId,
      });
    },
    enabled: isOpen && !!projectId && !!jobId && !!selectedTaskId && taskTab === 'output' && !!jobDetail?.graph,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('jobRecords.detailTitle')}
      footer={<Button variant="primary" onClick={onClose}>{t('common.close')}</Button>}
    >
      <div className="text-xs space-y-4">
        {jobDetailQuery.isLoading && <div className="text-gray-400">{t('common.loading')}</div>}
        {jobDetailQuery.error && (
          <div className="text-red-500">
            {t('common.error', { message: jobDetailQuery.error.message })}
          </div>
        )}
        {jobDetail && (
          <>
            <div className="flex items-center gap-3">
              <span className="text-gray-500">ID:</span>
              <span className="font-mono">{jobDetail.jobId}</span>
              <Badge status={jobStatusBadge(jobDetail.status || '')}>{jobDetail.status}</Badge>
            </div>
            {jobDetail.errMsg && (
              <div className="text-red-500 bg-red-50 dark:bg-red-950/30 p-2 rounded">{jobDetail.errMsg}</div>
            )}

            <div>
              <h5 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('jobRecords.tasks')}</h5>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {(jobDetail.graph?.nodes || []).length === 0 && (
                  <div className="text-gray-400">{t('jobRecords.noTasks')}</div>
                )}
                {(jobDetail.graph?.nodes || []).map((n) => (
                  <div
                    key={n.graphNodeId}
                    onClick={() => setSelectedGraphNodeId(n.graphNodeId || '')}
                    className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                      selectedGraphNodeId === n.graphNodeId
                        ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/20'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{n.label || n.codeName}</span>
                      <Badge status={jobStatusBadge(n.status || '')}>{n.status}</Badge>
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">{n.graphNodeId}</div>
                  </div>
                ))}
              </div>
            </div>

            {selectedGraphNodeId && (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <button
                    className={`font-semibold ${taskTab === 'logs' ? 'text-blue-600' : 'text-gray-500'}`}
                    onClick={() => setTaskTab('logs')}
                  >
                    {t('dag.logs')}
                  </button>
                  <button
                    className={`font-semibold ${taskTab === 'output' ? 'text-blue-600' : 'text-gray-500'}`}
                    onClick={() => setTaskTab('output')}
                  >
                    {t('dag.output')}
                  </button>
                </div>
                {taskTab === 'logs' && (
                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 h-48 overflow-y-auto font-mono text-[10px] text-gray-700 dark:text-gray-300">
                    {taskLogsQuery.isLoading && <div className="text-gray-400">{t('common.loading')}</div>}
                    {taskLogsQuery.error && <div className="text-red-500">{taskLogsQuery.error.message}</div>}
                    {(taskLogsQuery.data?.logs || []).length === 0 && !taskLogsQuery.isLoading && (
                      <div className="text-gray-400">{t('dag.noLogs')}</div>
                    )}
                    {(taskLogsQuery.data?.logs || []).map((line, idx) => (
                      <div key={idx} className="whitespace-pre-wrap">
                        {line}
                      </div>
                    ))}
                  </div>
                )}
                {taskTab === 'output' && (
                  <div className="h-48 overflow-y-auto">
                    {taskOutputQuery.isLoading && <div className="text-gray-400">{t('common.loading')}</div>}
                    {taskOutputQuery.error && <div className="text-red-500">{taskOutputQuery.error.message}</div>}
                    {renderTaskOutput(taskOutputQuery.data ?? null, t('jobRecords.noOutput'))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
