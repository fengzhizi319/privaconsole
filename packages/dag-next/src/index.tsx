import React, { useEffect, useRef, useState } from 'react';
import { Button, Badge } from '@secretpad/design-system';
import { AttributeForm } from './attribute-form';
import { ComponentInterpreter } from './component-interpreter';
import { LogViewer } from './log-viewer';
import { ResultVisualization } from './result-visualization';

// 统一导出属性动态表单，供宿主应用（如需要独立使用）引用。
export { AttributeForm, buildAttrTree } from './attribute-form';
export type { AttributeDef, AttributeValue, AttributeFormLabels, AttributeFormProps, AttrDataProvider } from './attribute-form';
// 统一导出组件解释器。
export { ComponentInterpreter } from './component-interpreter';
export type { ComponentInterpreterProps, ComponentInterpreterLabels, InterpreterMetadata, IoPortMeta } from './component-interpreter';
// 统一导出日志查看器。
export { LogViewer } from './log-viewer';
export type { LogViewerProps, LogViewerLabels } from './log-viewer';
// 统一导出结果可视化组件集。
export { ResultVisualization, OutputTable, StatsChart, KeyValuePanel, CorrelationHeatmap } from './result-visualization';
export type { ResultVisualizationProps, ResultVisualizationLabels, OutputTableProps, StatsChartProps, KeyValuePanelProps, CorrelationHeatmapProps } from './result-visualization';
// 统一导出执行记录时间线。
export { ExecutionTimeline } from './execution-timeline';
export type { ExecutionTimelineProps, ExecutionTimelineLabels, ExecutionRecord, JobStatus, PaginationInfo } from './execution-timeline';

export type DAGNodeStatus = 'Ready' | 'Running' | 'Success' | 'Failed' | 'Staging' | 'Stopped';

export interface DAGNode {
  id: string;
  name: string;
  category: string;
  icon: string;
  status: DAGNodeStatus;
  x: number;
  y: number;
  config?: Record<string, any>;
  codeName?: string;
  nodeDef?: Record<string, any>;
  inputs?: string[];
  outputs?: string[];
  progress?: number;
}

export interface DAGEdge {
  id: string;
  source: string;
  target: string;
  sourceAnchor?: string;
  targetAnchor?: string;
}

export interface DAGComponentDef {
  domain: string;
  name: string;
  version?: string;
  desc?: string;
  icon?: string;
}

interface ComponentMetadata {
  desc?: string;
  version?: string;
  domain?: string;
  inputs?: Array<{ name?: string; type?: string; desc?: string; types?: string[] }>;
  outputs?: Array<{ name?: string; type?: string; desc?: string; types?: string[] }>;
  attrs?: Array<Record<string, unknown>>;
}

export interface DAGCanvasProps {
  title?: string;
  initialNodes?: DAGNode[];
  initialEdges?: DAGEdge[];
  components?: DAGComponentDef[];
  componentGroups?: Record<string, DAGComponentDef[]>;
  i18nMap?: Record<string, string>;
  readOnly?: boolean;
  loading?: boolean;
  labels?: {
    operatorLibrary?: string;
    noOperators?: string;
    nodesEdges?: string;
    connect?: string;
    clickTarget?: string;
    connectionHint?: string;
    parameters?: string;
    logs?: string;
    output?: string;
    save?: string;
    run?: string;
    nodeIdentifier?: string;
    operatorName?: string;
    codeName?: string;
    executionStatus?: string;
    position?: string;
    frontendConfig?: string;
    nodeDef?: string;
    applyConfig?: string;
    status?: string;
    noLogs?: string;
    noOutput?: string;
    refresh?: string;
    nodeOutput?: string;
    deleteNode?: string;
    emptyCanvas?: string;
    /** 高级配置抽屉标题。 */
    advancedConfig?: string;
    /** 无属性占位。 */
    noAttrs?: string;
    /** 可选标记。 */
    optional?: string;
    /** 必填标记。 */
    required?: string;
    /** 联合组“未选择”。 */
    none?: string;
    /** 列表输入占位。 */
    listPlaceholder?: string;
    /** 组件解释器标题。 */
    interpreterTitle?: string;
    /** 解释器：描述。 */
    interpreterDesc?: string;
    /** 解释器：输入。 */
    interpreterInputs?: string;
    /** 解释器：输出。 */
    interpreterOutputs?: string;
    /** 解释器：属性。 */
    interpreterAttrs?: string;
    /** 解释器：加载中。 */
    interpreterLoading?: string;
    /** 解释器：无定义。 */
    interpreterNoDef?: string;
    /** 解释器：允许类型。 */
    interpreterTypes?: string;
    /** 算子详情按钮提示。 */
    interpretComponent?: string;
    /** 日志查看器：搜索占位。 */
    logSearchPlaceholder?: string;
    /** 日志查看器：复制。 */
    logCopy?: string;
    /** 日志查看器：已复制。 */
    logCopied?: string;
    /** 日志查看器：自动换行。 */
    logWrap?: string;
    /** 日志查看器：自动滚动。 */
    logAutoScroll?: string;
    /** 日志查看器：行数控件。 */
    logLines?: string;
    /** 执行单节点。 */
    runSingle?: string;
    /** 执行下游。 */
    runDown?: string;
    /** 执行上游。 */
    runUp?: string;
    /** 停止执行。 */
    stop?: string;
    /** 自动布局。 */
    tidyLayout?: string;
    /** 无选中节点提示。 */
    selectNodeFirst?: string;
    /** 全屏。 */
    fullscreen?: string;
    /** 退出全屏。 */
    exitFullscreen?: string;
    /** 导出 JSON。 */
    exportJson?: string;
    /** 导入 JSON。 */
    importJson?: string;
    /** 运行记录。 */
    records?: string;
  };
  onNodeSelect?: (node: DAGNode | null) => void;
  onNodeMove?: (node: DAGNode) => void | Promise<void>;
  onNodeConfigChange?: (node: DAGNode) => void | Promise<void>;
  onNodeLogs?: (node: DAGNode) => Promise<string[] | { status?: string; logs?: string[] }>;
  onNodeOutput?: (node: DAGNode) => Promise<Record<string, any> | null>;
  onGetComponentDef?: (node: DAGNode) => Promise<ComponentMetadata | null>;
  /** 复合属性类型数据提供器（列选择/表选择/模型选择/参与方选择）。 */
  attrDataProvider?: import('./attribute-form').AttrDataProvider;
  onSaveGraph?: (nodes: DAGNode[], edges: DAGEdge[]) => void | Promise<void>;
  onRunGraph?: (nodes: DAGNode[], edges: DAGEdge[]) => void | Promise<void>;
  /** 执行单节点。 */
  onRunSingle?: (node: DAGNode) => void | Promise<void>;
  /** 执行选中节点及其下游。 */
  onRunDown?: (node: DAGNode, downstreamNodes: DAGNode[]) => void | Promise<void>;
  /** 执行选中节点及其上游。 */
  onRunUp?: (node: DAGNode, upstreamNodes: DAGNode[]) => void | Promise<void>;
  /** 停止执行。 */
  onStopGraph?: () => void | Promise<void>;
  onAddNode?: (component: DAGComponentDef) => DAGNode | Promise<DAGNode>;
  onConnect?: (sourceId: string, targetId: string) => DAGEdge | Promise<DAGEdge> | null | undefined;
}

const NODE_WIDTH = 144; // w-36
const NODE_HEIGHT = 64; // approximate

/**
 * 稳定的空值默认值：解构默认参数（如 `initialNodes = []`）会在组件每次渲染时
 * 重新求值产生新引用，而下方 useEffect([initialNodes]) 以引用变化为依据做
 * 「服务端 → 画布」全量同步。若宿主未传该 prop，新引用会让 effect 反复触发：
 * 轻则把刚拖入的节点立刻冲掉，重则 setNodes(新数组) → 重渲染 → 又一新引用，
 * 形成无限渲染循环。因此默认值一律使用模块级常量，保证引用稳定。
 */
const DEFAULT_NODES: DAGNode[] = [];
const DEFAULT_EDGES: DAGEdge[] = [];
const DEFAULT_COMPONENTS: DAGComponentDef[] = [];
const DEFAULT_I18N_MAP: Record<string, string> = {};
const DEFAULT_LABELS: DAGCanvasProps['labels'] = {};

function getStatusBadge(status: DAGNodeStatus): { status: 'success' | 'processing' | 'error' | 'default'; label: string } {
  switch (status) {
    case 'Success':
      return { status: 'success', label: 'Success' };
    case 'Running':
      return { status: 'processing', label: 'Running' };
    case 'Failed':
      return { status: 'error', label: 'Failed' };
    case 'Stopped':
      return { status: 'error', label: 'Stopped' };
    default:
      return { status: 'default', label: 'Ready' };
  }
}

function safeJsonStringify(value: unknown, fallback = '{}'): string {
  try {
    return JSON.stringify(value ?? null, null, 2);
  } catch {
    return fallback;
  }
}

function safeJsonParse(value: string, fallback: Record<string, any> = {}): Record<string, any> {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function renderOutput(output: Record<string, any> | null, noOutputLabel = 'No output'): React.ReactNode {
  return <ResultVisualization output={output} labels={{ noOutput: noOutputLabel }} />;
}

/**
 * 图遍历工具：获取指定节点的下游/上游节点集合。
 * 对应原版 `run-down.ts` / `run-up.ts` 中的 DAG 遍历逻辑。
 */
function getDownstreamNodes(nodeId: string, nodes: DAGNode[], edges: DAGEdge[]): DAGNode[] {
  const visited = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.source === current && !visited.has(edge.target)) {
        visited.add(edge.target);
        queue.push(edge.target);
      }
    }
  }
  return nodes.filter((n) => visited.has(n.id));
}

function getUpstreamNodes(nodeId: string, nodes: DAGNode[], edges: DAGEdge[]): DAGNode[] {
  const visited = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.target === current && !visited.has(edge.source)) {
        visited.add(edge.source);
        queue.push(edge.source);
      }
    }
  }
  return nodes.filter((n) => visited.has(n.id));
}

/**
 * 自动布局算法：拓扑排序 + 分层布局。
 * 对应原版 `tidy-layout.ts` 中的 Dagre 布局。
 * 这里实现一个简化的分层布局：按拓扑序分层，同层节点垂直排列。
 */
function tidyLayout(nodes: DAGNode[], edges: DAGEdge[]): DAGNode[] {
  if (nodes.length === 0) return nodes;

  // 计算入度
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  nodes.forEach((n) => {
    inDegree.set(n.id, 0);
    adjacency.set(n.id, []);
  });
  edges.forEach((e) => {
    if (inDegree.has(e.target) && adjacency.has(e.source)) {
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
      adjacency.get(e.source)!.push(e.target);
    }
  });

  // BFS 拓扑排序分层
  const layers: string[][] = [];
  let queue = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0).map((n) => n.id);
  const visited = new Set<string>();

  while (queue.length > 0) {
    layers.push([...queue]);
    queue.forEach((id) => visited.add(id));
    const nextQueue: string[] = [];
    for (const id of queue) {
      for (const target of adjacency.get(id) || []) {
        const deg = (inDegree.get(target) || 1) - 1;
        inDegree.set(target, deg);
        if (deg === 0 && !visited.has(target)) {
          nextQueue.push(target);
        }
      }
    }
    queue = nextQueue;
  }

  // 处理未被访问的节点（环形依赖或孤立节点）
  const unvisited = nodes.filter((n) => !visited.has(n.id));
  if (unvisited.length > 0) {
    layers.push(unvisited.map((n) => n.id));
  }

  // 布局参数
  const layerGapX = 220;
  const nodeGapY = 100;
  const startX = 80;
  const startY = 60;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const result: DAGNode[] = [];

  layers.forEach((layer, layerIdx) => {
    const x = startX + layerIdx * layerGapX;
    const totalHeight = (layer.length - 1) * nodeGapY;
    const offsetY = startY + (300 - totalHeight / 2); // 居中
    layer.forEach((id, nodeIdx) => {
      const node = nodeMap.get(id);
      if (node) {
        result.push({ ...node, x, y: offsetY + nodeIdx * nodeGapY });
      }
    });
  });

  return result;
}

export const DAGNextWorkspace: React.FC<DAGCanvasProps> = ({
  title = 'DAG Pipeline Editor',
  initialNodes = DEFAULT_NODES,
  initialEdges = DEFAULT_EDGES,
  components = DEFAULT_COMPONENTS,
  componentGroups,
  i18nMap = DEFAULT_I18N_MAP,
  readOnly = false,
  loading = false,
  onNodeSelect,
  onNodeMove,
  onNodeConfigChange,
  onNodeLogs,
  onNodeOutput,
  onGetComponentDef,
  attrDataProvider,
  onSaveGraph,
  onRunGraph,
  onRunSingle,
  onRunDown,
  onRunUp,
  onStopGraph,
  onAddNode,
  onConnect,
  labels = DEFAULT_LABELS,
}) => {
  const [nodes, setNodes] = useState<DAGNode[]>(initialNodes);
  const [edges, setEdges] = useState<DAGEdge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<DAGNode | null>(null);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'log' | 'output'>('config');
  const [isDragging, setIsDragging] = useState(false);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ status?: string; logs: string[] }>({ logs: [] });
  const [output, setOutput] = useState<Record<string, any> | null>(null);
  const [componentDef, setComponentDef] = useState<ComponentMetadata | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [pendingConnection, setPendingConnection] = useState(false);
  /** 组件解释器当前解释的算子（null 表示关闭）。 */
  const [interpreterComponent, setInterpreterComponent] = useState<DAGComponentDef | null>(null);
  /** 节点右键菜单状态。 */
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: DAGNode } | null>(null);
  /** 框选状态：起始点和当前点。 */
  const [selectionRect, setSelectionRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  /** 多选节点 ID 集合。 */
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  /** 复制粘贴剪贴板。 */
  const clipboardRef = useRef<DAGNode | null>(null);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges]);

  useEffect(() => {
    if (!selectedNode || !onGetComponentDef) {
      setComponentDef(null);
      return;
    }
    let cancelled = false;
    onGetComponentDef(selectedNode)
      .then((def) => {
        if (!cancelled) setComponentDef(def);
      })
      .catch(() => {
        if (!cancelled) setComponentDef(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedNode, onGetComponentDef]);

  useEffect(() => {
    if (!selectedNode) return;
    const found = nodes.find((n) => n.id === selectedNode.id);
    if (found) {
      setSelectedNode(found);
    }
  }, [nodes, selectedNode?.id]);

  /* ------------------------------------------------------------------------ */
  /* 键盘快捷键：Delete/Cmd+C/Cmd+V/Cmd+D，对应原版 HotKeys 中的核心操作。 */
  /* ------------------------------------------------------------------------ */
  useEffect(() => {
    if (readOnly) return;
    const handler = (e: KeyboardEvent) => {
      // 忽略输入框内的按键
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const isMeta = e.metaKey || e.ctrlKey;

      // Delete / Backspace: 删除选中节点
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
        e.preventDefault();
        handleDeleteNode(selectedNode.id);
        return;
      }
      // Cmd/Ctrl+C: 复制选中节点
      if (isMeta && e.key === 'c' && selectedNode) {
        e.preventDefault();
        clipboardRef.current = { ...selectedNode };
        return;
      }
      // Cmd/Ctrl+V: 粘贴节点
      if (isMeta && e.key === 'v' && clipboardRef.current) {
        e.preventDefault();
        handlePasteNode();
        return;
      }
      // Cmd/Ctrl+D: 复制并偏移节点
      if (isMeta && e.key === 'd' && selectedNode) {
        e.preventDefault();
        handleDuplicateNode(selectedNode);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [readOnly, selectedNode, nodes, edges]);

  /** 粘贴节点：从剪贴板创建新节点，偏移 40px。 */
  const handlePasteNode = () => {
    const src = clipboardRef.current;
    if (!src) return;
    const newNode: DAGNode = {
      ...src,
      id: `${src.category}-${src.name}-${Date.now().toString(36)}`,
      x: src.x + 40,
      y: src.y + 40,
      status: 'Ready',
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNode(newNode);
    if (onNodeSelect) onNodeSelect(newNode);
  };

  /** 复制并偏移节点。 */
  const handleDuplicateNode = (node: DAGNode) => {
    const newNode: DAGNode = {
      ...node,
      id: `${node.category}-${node.name}-${Date.now().toString(36)}`,
      x: node.x + 40,
      y: node.y + 40,
      status: 'Ready',
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNode(newNode);
    if (onNodeSelect) onNodeSelect(newNode);
  };

  /** 复制节点到剪贴板。 */
  const handleCopyNode = (node: DAGNode) => {
    clipboardRef.current = { ...node };
  };

  const handleSelectNode = (node: DAGNode) => {
    setSelectedNode(node);
    setActiveTab('config');
    setLogs({ logs: [] });
    setOutput(null);
    if (onNodeSelect) onNodeSelect(node);
  };

  const handleMouseDown = (e: React.MouseEvent, node: DAGNode) => {
    if (readOnly || !canvasRef.current) return;
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y,
    };
    setDragNodeId(node.id);
    setIsDragging(true);
    handleSelectNode(node);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragNodeId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffsetRef.current.x;
    const y = e.clientY - rect.top - dragOffsetRef.current.y;
    setNodes((prev) =>
      prev.map((n) => (n.id === dragNodeId ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n))
    );
  };

  const handleMouseUp = async () => {
    if (!isDragging || !dragNodeId) {
      setIsDragging(false);
      setDragNodeId(null);
      return;
    }
    const moved = nodes.find((n) => n.id === dragNodeId);
    if (moved && onNodeMove) {
      await onNodeMove(moved);
    }
    setIsDragging(false);
    setDragNodeId(null);
  };

  const handleAddComponent = async (component: DAGComponentDef) => {
    if (readOnly) return;
    let newNode: DAGNode;
    if (onAddNode) {
      newNode = await onAddNode(component);
    } else {
      const codeName = `${component.domain}/${component.name}`;
      const label = i18nMap[component.name] || i18nMap[codeName] || component.name;
      newNode = {
        id: `node-${Date.now().toString(36)}`,
        name: label,
        category: component.domain,
        icon: component.icon || '⚙️',
        status: 'Ready',
        x: 200 + Math.random() * 120,
        y: 120 + Math.random() * 80,
        codeName,
        nodeDef: {
          domain: component.domain,
          name: component.name,
          version: component.version,
        },
        inputs: [],
        outputs: [],
      };
    }
    setNodes((prev) => [...prev, newNode]);
    handleSelectNode(newNode);
  };

  const handleCanvasClick = () => {
    if (pendingConnection) return;
    // 如果没有框选，清除选中
    if (!selectionRect) {
      setSelectedNode(null);
      setSelectedNodeIds(new Set());
      setConnectSourceId(null);
      if (onNodeSelect) onNodeSelect(null);
    }
  };

  /** 框选开始：在空白画布上按下鼠标时启动框选。 */
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (readOnly || pendingConnection) return;
    if (e.button !== 0) return; // 只响应左键
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSelectionRect({ x1: x, y1: y, x2: x, y2: y });
  };

  /** 框选移动：更新框选矩形并实时计算选中节点。 */
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (selectionRect && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const updated = { ...selectionRect, x2: x, y2: y };
      setSelectionRect(updated);
      // 计算框选范围内的节点
      const minX = Math.min(updated.x1, updated.x2);
      const maxX = Math.max(updated.x1, updated.x2);
      const minY = Math.min(updated.y1, updated.y2);
      const maxY = Math.max(updated.y1, updated.y2);
      const ids = new Set<string>();
      for (const n of nodes) {
        if (n.x >= minX && n.x + 144 <= maxX && n.y >= minY && n.y + 64 <= maxY) {
          ids.add(n.id);
        }
      }
      setSelectedNodeIds(ids);
    }
  };

  /** 框选结束：清除框选矩形，保留选中状态。 */
  const handleCanvasMouseUp = () => {
    if (selectionRect) {
      // 如果框选范围太小，视为点击（清除选中）
      const dx = Math.abs(selectionRect.x2 - selectionRect.x1);
      const dy = Math.abs(selectionRect.y2 - selectionRect.y1);
      if (dx < 5 && dy < 5) {
        setSelectedNodeIds(new Set());
      }
      setSelectionRect(null);
    }
  };

  const handleNodeClickForConnect = (node: DAGNode) => {
    if (!pendingConnection) {
      handleSelectNode(node);
      return;
    }
    if (!connectSourceId) {
      setConnectSourceId(node.id);
      return;
    }
    if (connectSourceId === node.id) {
      setConnectSourceId(null);
      setPendingConnection(false);
      return;
    }
    handleConnect(connectSourceId, node.id);
    setConnectSourceId(null);
    setPendingConnection(false);
  };

  const handleConnect = async (sourceId: string, targetId: string) => {
    if (readOnly) return;
    let edge: DAGEdge | null | undefined;
    if (onConnect) {
      edge = await onConnect(sourceId, targetId);
    }
    if (edge === undefined || edge === null) {
      const sourceNode = nodes.find((n) => n.id === sourceId);
      const outputIndex = (sourceNode?.outputs?.length || 0);
      const sourceAnchor = `${sourceId}-output-${outputIndex}`;
      const targetAnchor = `${targetId}-input-${edges.filter((e) => e.target === targetId).length}`;
      edge = {
        id: `edge-${Date.now().toString(36)}`,
        source: sourceId,
        target: targetId,
        sourceAnchor,
        targetAnchor,
      };
    }
    if (!edge) return;
    setEdges((prev) => [...prev, edge!]);
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === sourceId) {
          return { ...n, outputs: [...(n.outputs || []), edge!.sourceAnchor || `output-${n.outputs?.length || 0}`] };
        }
        if (n.id === targetId) {
          return { ...n, inputs: [...(n.inputs || []), edge!.sourceAnchor || `output-unknown`] };
        }
        return n;
      })
    );
  };

  const handleDeleteEdge = (edgeId: string) => {
    if (readOnly) return;
    const edge = edges.find((e) => e.id === edgeId);
    if (!edge) return;
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === edge.source) {
          return { ...n, outputs: (n.outputs || []).filter((o) => o !== edge.sourceAnchor) };
        }
        if (n.id === edge.target) {
          return { ...n, inputs: (n.inputs || []).filter((i) => i !== edge.sourceAnchor) };
        }
        return n;
      })
    );
  };

  const handleDeleteNode = (nodeId: string) => {
    if (readOnly) return;
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedNode || !onNodeConfigChange) return;
    await onNodeConfigChange(selectedNode);
  };

  const handleLoadLogs = async () => {
    if (!selectedNode || !onNodeLogs) return;
    setPanelLoading(true);
    try {
      const result = await onNodeLogs(selectedNode);
      if (Array.isArray(result)) {
        setLogs({ logs: result });
      } else {
        setLogs({ status: result.status, logs: result.logs || [] });
      }
    } finally {
      setPanelLoading(false);
    }
  };

  const handleLoadOutput = async () => {
    if (!selectedNode || !onNodeOutput) return;
    setPanelLoading(true);
    try {
      const result = await onNodeOutput(selectedNode);
      setOutput(result);
    } finally {
      setPanelLoading(false);
    }
  };

  const handleTabChange = (tab: 'config' | 'log' | 'output') => {
    setActiveTab(tab);
    if (tab === 'log') handleLoadLogs();
    if (tab === 'output') handleLoadOutput();
  };

  const handleRun = async () => {
    if (!onRunGraph) return;
    await onRunGraph(nodes, edges);
  };

  const handleRunSingle = async () => {
    if (!onRunSingle || !selectedNode) return;
    await onRunSingle(selectedNode);
  };

  const handleRunDown = async () => {
    if (!onRunDown || !selectedNode) return;
    const downstream = getDownstreamNodes(selectedNode.id, nodes, edges);
    await onRunDown(selectedNode, [selectedNode, ...downstream]);
  };

  const handleRunUp = async () => {
    if (!onRunUp || !selectedNode) return;
    const upstream = getUpstreamNodes(selectedNode.id, nodes, edges);
    await onRunUp(selectedNode, [...upstream, selectedNode]);
  };

  const handleStop = async () => {
    if (!onStopGraph) return;
    await onStopGraph();
  };

  const handleTidyLayout = () => {
    const laid = tidyLayout(nodes, edges);
    setNodes(laid);
  };

  /** 全屏切换。 */
  const handleToggleFullscreen = () => {
    setIsFullscreen((f) => !f);
  };

  /** 导出 DAG JSON：将当前画布状态序列化为 JSON 文件下载。 */
  const handleExportJson = () => {
    const data = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'dag'}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** 导入 DAG JSON：从文件读取并更新画布。 */
  const handleImportJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (Array.isArray(data.nodes)) setNodes(data.nodes);
          if (Array.isArray(data.edges)) setEdges(data.edges);
        } catch {
          // 解析失败静默处理
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleSave = async () => {
    if (!onSaveGraph) return;
    await onSaveGraph(nodes, edges);
  };

  const handleConfigChange = (value: string) => {
    if (!selectedNode) return;
    const parsed = safeJsonParse(value);
    setSelectedNode({ ...selectedNode, config: parsed });
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedNode.id ? { ...n, config: parsed } : n))
    );
  };

  const handleNodeDefChange = (value: string) => {
    if (!selectedNode) return;
    const parsed = safeJsonParse(value);
    setSelectedNode({ ...selectedNode, nodeDef: parsed });
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedNode.id ? { ...n, nodeDef: parsed } : n))
    );
  };

  /**
   * 高级配置抽屉回写入口：AttributeForm 序列化出新的 nodeDef 对象后，
   * 同步更新当前选中节点与画布节点列表（随后由“应用配置”按钮持久化）。
   */
  const handleNodeDefObjectChange = (nodeDef: Record<string, any>) => {
    if (!selectedNode) return;
    setSelectedNode({ ...selectedNode, nodeDef });
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedNode.id ? { ...n, nodeDef } : n))
    );
  };

  const groups = componentGroups || (components.length > 0 ? { Components: components } : {});

  /**
   * 组件解释器的定义拉取回调：复用画布的 onGetComponentDef，
   * 以 codeName 构造一个最小伪节点来查询组件完整定义。
   */
  const handleInterpretFetch = async (component: DAGComponentDef) => {
    if (!onGetComponentDef) return null;
    const codeName = `${component.domain}/${component.name}`;
    const pseudoNode: DAGNode = {
      id: `__interpreter__${codeName}`,
      name: component.name,
      category: component.domain,
      icon: component.icon || '⚙️',
      status: 'Ready',
      x: 0,
      y: 0,
      codeName,
    };
    const meta = await onGetComponentDef(pseudoNode);
    if (!meta) return null;
    return {
      desc: meta.desc,
      version: meta.version ?? component.version,
      domain: meta.domain ?? component.domain,
      inputs: meta.inputs,
      outputs: meta.outputs,
      attrs: meta.attrs,
    };
  };

function formatReactChild(val: any, fallback = ''): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    return val.name || val.desc || val.label || val.codeName || fallback;
  }
  return String(val);
}

  const renderComponentPalette = () => (
    <div className="w-56 bg-gray-950/80 border-r border-gray-800 flex flex-col">
      <div className="p-3 border-b border-gray-800 font-semibold text-xs text-gray-400 uppercase tracking-wider">
        {labels.operatorLibrary ?? 'Operator Library'}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-4 text-xs">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <div className="px-2 py-1 text-gray-500 font-semibold uppercase text-[10px]">{group}</div>
            {items.map((component, idx) => {
              const codeName = `${component.domain}/${component.name}`;
              const rawLabel = i18nMap[component.name] || i18nMap[codeName] || component.name;
              const label = formatReactChild(rawLabel, component.name);
              return (
                <div
                  key={`${component.domain}-${component.name}-${idx}`}
                  draggable={!readOnly}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify(component));
                    e.dataTransfer.setData('text/plain', `${component.domain}/${component.name}`);
                  }}
                  className="p-2 mt-1 rounded bg-gray-900 border border-gray-800 hover:border-blue-500 hover:bg-gray-850 cursor-grab active:cursor-grabbing flex items-center gap-2 transition-all group select-none"
                  title={formatReactChild(component.desc, codeName)}
                >
                  {/* 点击或拖拽主体区域：添加算子到画布 */}
                  <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => handleAddComponent(component)}>
                    <span>{formatReactChild(component.icon, '⚙️')}</span>
                    <span className="truncate">{label}</span>
                  </div>
                  {/* 解释器入口：查看算子定义详情 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setInterpreterComponent(component);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-blue-400 transition-opacity flex-shrink-0"
                    title={labels.interpretComponent ?? '查看算子详情'}
                  >
                    ℹ️
                  </button>
                </div>
              );
            })}
          </div>
        ))}
        {Object.keys(groups).length === 0 && (
          <div className="text-gray-600 px-2">{labels.noOperators ?? 'No operators available'}</div>
        )}
      </div>
    </div>
  );

  const renderEdge = (e: DAGEdge) => {
    const srcNode = nodes.find((n) => n.id === e.source);
    const tgtNode = nodes.find((n) => n.id === e.target);
    if (!srcNode || !tgtNode) return null;
    const x1 = srcNode.x + NODE_WIDTH;
    const y1 = srcNode.y + NODE_HEIGHT / 2;
    const x2 = tgtNode.x;
    const y2 = tgtNode.y + NODE_HEIGHT / 2;
    const cx = (x1 + x2) / 2;
    return (
      <g key={e.id}>
        <path
          d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="4 2"
          className="pointer-events-auto cursor-pointer hover:stroke-red-500"
          onClick={() => handleDeleteEdge(e.id)}
        />
      </g>
    );
  };

  const renderNode = (node: DAGNode) => {
    const isSelected = selectedNode?.id === node.id;
    const isConnectSource = connectSourceId === node.id;
    const isMultiSelected = selectedNodeIds.has(node.id);
    const badge = getStatusBadge(node.status);
    return (
      <div
        key={node.id}
        onMouseDown={(e) => handleMouseDown(e, node)}
        onClick={(e) => {
          e.stopPropagation();
          handleNodeClickForConnect(node);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!readOnly) {
            setSelectedNode(node);
            setContextMenu({ x: e.clientX, y: e.clientY, node });
          }
        }}
        style={{ left: `${node.x}px`, top: `${node.y}px` }}
        className={`absolute w-36 p-3 rounded-lg bg-gray-950 border-2 shadow-lg transition-all z-10 select-none ${
          isSelected
            ? 'border-blue-500 shadow-blue-500/20 ring-2 ring-blue-500/30'
            : isConnectSource
            ? 'border-amber-500 ring-2 ring-amber-500/30'
            : isMultiSelected
            ? 'border-blue-400 ring-1 ring-blue-400/40'
            : node.status === 'Running'
            ? 'border-cyan-500 animate-pulse shadow-cyan-500/30'
            : node.status === 'Success'
            ? 'border-green-600/60'
            : node.status === 'Failed'
            ? 'border-red-600/60'
            : 'border-gray-800 hover:border-gray-700'
        } ${isDragging && dragNodeId === node.id ? 'cursor-grabbing' : readOnly ? 'cursor-default' : 'cursor-grab'}`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">{formatReactChild(node.icon, '⚙️')}</span>
          <span className="font-semibold text-xs text-gray-200 truncate">{formatReactChild(node.name, 'Node')}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <span>{node.category}</span>
          <Badge status={badge.status}>
            <span className="text-[9px]">{badge.label}</span>
          </Badge>
        </div>
        {/* 运行中节点显示进度条 */}
        {node.status === 'Running' && (
          <div className="mt-1.5 w-full bg-gray-800 rounded-full h-1 overflow-hidden">
            <div
              className="bg-cyan-500 h-1 rounded-full transition-all duration-500"
              style={{ width: `${typeof node.progress === 'number' ? Math.min(100, Math.max(0, node.progress * 100)) : 50}%` }}
            />
          </div>
        )}
        {!readOnly && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteNode(node.id);
            }}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
            title={labels.deleteNode ?? 'Delete node'}
          >
            ✕
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col bg-gray-900 text-gray-100 overflow-hidden border border-gray-800 shadow-2xl ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-full w-full rounded-xl'}`}>
      {/* Canvas Top Bar */}
      <div className="h-12 bg-gray-950 border-b border-gray-800 px-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-semibold text-blue-400 truncate">⚡ {title}</span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400 truncate">{nodes.length} nodes · {edges.length} edges</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!readOnly && onConnect && (
            <Button
              size="sm"
              variant={pendingConnection ? 'primary' : 'ghost'}
              onClick={() => {
                setPendingConnection((p) => !p);
                setConnectSourceId(null);
              }}
            >
              {pendingConnection ? (labels.clickTarget ?? 'Click target') : (labels.connect ?? 'Connect')}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.max(50, z - 10))}>🔍 -</Button>
          <span className="font-mono text-gray-400 text-xs w-10 text-center">{zoom}%</span>
          <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.min(150, z + 10))}>🔍 +</Button>
          <Button size="sm" variant="ghost" onClick={handleTidyLayout} title={labels.tidyLayout ?? 'Tidy Layout'}>
            📐
          </Button>
          <Button size="sm" variant="ghost" onClick={handleToggleFullscreen} title={isFullscreen ? (labels.exitFullscreen ?? 'Exit Fullscreen') : (labels.fullscreen ?? 'Fullscreen')}>
            {isFullscreen ? '🡐' : '⛶'}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleExportJson} title={labels.exportJson ?? 'Export JSON'}>
            📤
          </Button>
          {!readOnly && (
            <Button size="sm" variant="ghost" onClick={handleImportJson} title={labels.importJson ?? 'Import JSON'}>
              📥
            </Button>
          )}
          <div className="h-4 w-px bg-gray-800 mx-1" />
          {onSaveGraph && (
            <Button size="sm" variant="outline" loading={loading} onClick={handleSave}>
              💾 {labels.save ?? 'Save'}
            </Button>
          )}
          {onRunGraph && (
            <Button size="sm" variant="primary" loading={loading} onClick={handleRun}>
              ▶ {labels.run ?? 'Run All'}
            </Button>
          )}
          {onRunSingle && (
            <Button size="sm" variant="outline" onClick={handleRunSingle} disabled={!selectedNode} title={labels.runSingle ?? 'Run Single Node'}>
              ▶️
            </Button>
          )}
          {onRunDown && (
            <Button size="sm" variant="outline" onClick={handleRunDown} disabled={!selectedNode} title={labels.runDown ?? 'Run Downstream'}>
              ⬇️
            </Button>
          )}
          {onRunUp && (
            <Button size="sm" variant="outline" onClick={handleRunUp} disabled={!selectedNode} title={labels.runUp ?? 'Run Upstream'}>
              ⬆️
            </Button>
          )}
          {onStopGraph && (
            <Button size="sm" variant="danger" onClick={handleStop} title={labels.stop ?? 'Stop'}>
              ⏹ {labels.stop ?? 'Stop'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {renderComponentPalette()}

        {/* Center Canvas Area */}
        <div
          ref={canvasRef}
          className="flex-1 bg-gray-900 relative overflow-hidden bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:16px_16px]"
          onMouseMove={(e) => { handleMouseMove(e); handleCanvasMouseMove(e); }}
          onMouseUp={() => { handleMouseUp(); handleCanvasMouseUp(); }}
          onMouseLeave={() => { handleMouseUp(); handleCanvasMouseUp(); }}
          onMouseDown={handleCanvasMouseDown}
          onClick={handleCanvasClick}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (readOnly) return;
            const raw = e.dataTransfer.getData('application/json');
            if (!raw) return;
            let component: DAGComponentDef;
            try {
              component = JSON.parse(raw);
            } catch (err) {
              console.error('Failed to parse dragged component:', err);
              return;
            }
            if (!component || !component.name || !component.domain) return;

            const rect = canvasRef.current?.getBoundingClientRect();
            const dropX = rect ? Math.max(20, Math.min(rect.width - 160, e.clientX - rect.left - 70)) : 100 + nodes.length * 30;
            const dropY = rect ? Math.max(20, Math.min(rect.height - 80, e.clientY - rect.top - 20)) : 100 + nodes.length * 30;

            // 与 handleAddComponent 的添加行为保持一致：存在 onAddNode 时由后端创建节点并返回 DAGNode，
            // 这里仅用落点坐标覆盖其位置；不存在时按与点击添加相同的结构在本地构造节点。
            void (async () => {
              let newNode: DAGNode;
              if (onAddNode) {
                newNode = await onAddNode(component);
                newNode = { ...newNode, x: Math.round(dropX), y: Math.round(dropY) };
              } else {
                const codeName = `${component.domain}/${component.name}`;
                const label = i18nMap[component.name] || i18nMap[codeName] || component.name;
                newNode = {
                  id: `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
                  name: label,
                  codeName,
                  category: component.domain,
                  icon: component.icon || '⚙️',
                  status: 'Ready',
                  x: Math.round(dropX),
                  y: Math.round(dropY),
                  nodeDef: {
                    domain: component.domain,
                    name: component.name,
                    version: component.version,
                  },
                  inputs: [],
                  outputs: [],
                };
              }
              setNodes((prev) => [...prev, newNode]);
              handleSelectNode(newNode);
            })().catch((err) => console.error('Failed to add dropped component:', err));
          }}
          style={{ cursor: pendingConnection ? 'crosshair' : 'default' }}
        >
          {/* SVG Connecting Edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {edges.map(renderEdge)}
          </svg>

          {/* Render Nodes */}
          {nodes.map(renderNode)}

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-gray-500 text-xs">
                <div className="text-3xl mb-2">🗂️</div>
                <div>{labels.emptyCanvas ?? 'Canvas is empty. Add operators from the library on the left.'}</div>
              </div>
            </div>
          )}

          {pendingConnection && (
            <div className="absolute top-2 left-2 px-2 py-1 rounded bg-amber-900/50 text-amber-200 text-[10px] border border-amber-700/50">
              {labels.connectionHint ?? 'Connection mode: click source, then target'}
            </div>
          )}

          {/* 框选矩形：对应原版 X6 的 rubberband 框选功能 */}
          {selectionRect && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none z-30"
              style={{
                left: Math.min(selectionRect.x1, selectionRect.x2),
                top: Math.min(selectionRect.y1, selectionRect.y2),
                width: Math.abs(selectionRect.x2 - selectionRect.x1),
                height: Math.abs(selectionRect.y2 - selectionRect.y1),
              }}
            />
          )}

          {/* 小地图导航：对应原版 X6 的 minimap 插件 */}
          {nodes.length > 0 && (
            <div className="absolute bottom-3 right-3 w-36 h-24 bg-gray-950/90 border border-gray-700 rounded-lg overflow-hidden shadow-lg z-20">
              <svg width="144" height="96" viewBox={`0 0 ${Math.max(800, ...nodes.map((n) => n.x + 200))} ${Math.max(600, ...nodes.map((n) => n.y + 150))}`} className="w-full h-full">
                {/* 连线 */}
                {edges.map((e) => {
                  const src = nodes.find((n) => n.id === e.source);
                  const tgt = nodes.find((n) => n.id === e.target);
                  if (!src || !tgt) return null;
                  return (
                    <line
                      key={e.id}
                      x1={src.x + 72}
                      y1={src.y + 32}
                      x2={tgt.x + 72}
                      y2={tgt.y + 32}
                      stroke="#4b5563"
                      strokeWidth="2"
                    />
                  );
                })}
                {/* 节点 */}
                {nodes.map((n) => (
                  <rect
                    key={n.id}
                    x={n.x}
                    y={n.y}
                    width={144}
                    height={64}
                    rx={8}
                    fill={n.status === 'Running' ? '#06b6d4' : n.status === 'Success' ? '#22c55e' : n.status === 'Failed' ? '#ef4444' : selectedNodeIds.has(n.id) ? '#3b82f6' : '#6b7280'}
                    opacity={0.8}
                  />
                ))}
              </svg>
              <div className="absolute top-0.5 left-1 text-[8px] text-gray-500">Minimap</div>
            </div>
          )}

          {/* 多选计数提示 */}
          {selectedNodeIds.size > 1 && (
            <div className="absolute top-2 left-2 px-2 py-1 rounded bg-blue-900/50 text-blue-200 text-[10px] border border-blue-700/50 z-20">
              已选中 {selectedNodeIds.size} 个节点
            </div>
          )}
        </div>

        {/* Right Configuration Inspector */}
        {selectedNode && (
          <div className="w-80 bg-gray-950 border-l border-gray-800 flex flex-col">
            <div className="flex border-b border-gray-800 text-xs font-medium">
              <button
                onClick={() => handleTabChange('config')}
                className={`flex-1 py-3 text-center border-b-2 ${activeTab === 'config' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400'}`}
              >
                {labels.parameters ?? 'Parameters'}
              </button>
              {onNodeLogs && (
                <button
                  onClick={() => handleTabChange('log')}
                  className={`flex-1 py-3 text-center border-b-2 ${activeTab === 'log' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400'}`}
                >
                  {labels.logs ?? 'Logs'}
                </button>
              )}
              {onNodeOutput && (
                <button
                  onClick={() => handleTabChange('output')}
                  className={`flex-1 py-3 text-center border-b-2 ${activeTab === 'output' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400'}`}
                >
                  {labels.output ?? 'Output'}
                </button>
              )}
            </div>

            <div className="p-4 flex-1 overflow-y-auto text-xs space-y-4">
              {activeTab === 'config' && (
                <>
                  <div>
                    <label className="text-gray-400 block mb-1">{labels.nodeIdentifier ?? 'Node Identifier'}</label>
                    <div className="p-2 rounded bg-gray-900 border border-gray-800 font-mono text-gray-300 truncate">
                      {selectedNode.id}
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">{labels.operatorName ?? 'Operator Name'}</label>
                    <input
                      type="text"
                      value={selectedNode.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setSelectedNode({ ...selectedNode, name });
                        setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, name } : n)));
                      }}
                      disabled={readOnly}
                      className="w-full p-2 rounded bg-gray-900 border border-gray-800 text-gray-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">{labels.codeName ?? 'Code Name'}</label>
                    <div className="p-2 rounded bg-gray-900 border border-gray-800 font-mono text-gray-400 truncate">
                      {selectedNode.codeName || '-'}
                    </div>
                  </div>

                  {componentDef && (
                    <div className="p-3 rounded bg-gray-900 border border-gray-800 space-y-2">
                      {componentDef.desc && (
                        <div className="text-gray-400 text-[10px] leading-relaxed">{componentDef.desc}</div>
                      )}
                      {componentDef.inputs && componentDef.inputs.length > 0 && (
                        <div>
                          <div className="text-gray-500 text-[10px] font-semibold mb-1">Inputs</div>
                          <div className="text-gray-400 text-[10px] font-mono truncate">
                            {componentDef.inputs.map((i, idx) => i.name || `input-${idx}`).join(', ')}
                          </div>
                        </div>
                      )}
                      {componentDef.outputs && componentDef.outputs.length > 0 && (
                        <div>
                          <div className="text-gray-500 text-[10px] font-semibold mb-1">Outputs</div>
                          <div className="text-gray-400 text-[10px] font-mono truncate">
                            {componentDef.outputs.map((o, idx) => o.name || `output-${idx}`).join(', ')}
                          </div>
                        </div>
                      )}
                      {componentDef.attrs && componentDef.attrs.length > 0 && (
                        <div className="p-3 rounded bg-gray-950 border border-gray-800">
                          {/* 高级配置抽屉：按组件属性定义动态生成表单，替代原始 JSON 编辑 */}
                          <AttributeForm
                            key={selectedNode.id}
                            defs={componentDef.attrs}
                            nodeDef={selectedNode.nodeDef}
                            readOnly={readOnly}
                            onNodeDefChange={handleNodeDefObjectChange}
                            dataProvider={attrDataProvider}
                            labels={{
                              advanced: labels.advancedConfig ?? 'Advanced Config',
                              noAttrs: labels.noAttrs,
                              optional: labels.optional,
                              required: labels.required,
                              none: labels.none,
                              listPlaceholder: labels.listPlaceholder,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="text-gray-400 block mb-1">{labels.executionStatus ?? 'Execution Status'}</label>
                    <Badge status={getStatusBadge(selectedNode.status).status}>
                      {selectedNode.status}
                    </Badge>
                    {typeof selectedNode.progress === 'number' && (
                      <div className="mt-2 w-full bg-gray-800 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, selectedNode.progress * 100))}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">{labels.position ?? 'Position (x, y)'}</label>
                    <div className="p-2 rounded bg-gray-900 border border-gray-800 font-mono text-gray-400">
                      {Math.round(selectedNode.x)}, {Math.round(selectedNode.y)}
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">{labels.frontendConfig ?? 'Frontend Config (JSON)'}</label>
                    <textarea
                      value={safeJsonStringify(selectedNode.config)}
                      onChange={(e) => handleConfigChange(e.target.value)}
                      disabled={readOnly}
                      rows={6}
                      className="w-full p-2 rounded bg-gray-900 border border-gray-800 text-gray-200 focus:outline-none focus:border-blue-500 font-mono disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">{labels.nodeDef ?? 'NodeDef (JSON)'}</label>
                    <textarea
                      value={safeJsonStringify(selectedNode.nodeDef)}
                      onChange={(e) => handleNodeDefChange(e.target.value)}
                      disabled={readOnly}
                      rows={8}
                      className="w-full p-2 rounded bg-gray-900 border border-gray-800 text-gray-200 focus:outline-none focus:border-blue-500 font-mono disabled:opacity-50"
                    />
                  </div>

                  {!readOnly && onNodeConfigChange && (
                    <Button size="sm" variant="primary" onClick={handleSaveConfig} loading={loading}>
                      {labels.applyConfig ?? 'Apply Config'}
                    </Button>
                  )}
                </>
              )}

              {activeTab === 'log' && (
                <div className="space-y-2 h-full flex flex-col min-h-0">
                  {/* 状态 + 手动刷新（LogViewer 内部已提供搜索/筛选/复制等工具栏）。 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{labels.status ?? 'Status'}: {logs.status || '-'}</span>
                    <Button size="sm" variant="ghost" onClick={handleLoadLogs} loading={panelLoading}>
                      {labels.refresh ?? 'Refresh'}
                    </Button>
                  </div>
                  {/* Monaco 风格日志查看器：行号 + 级别高亮 + 搜索 + 筛选。 */}
                  <div className="flex-1 min-h-0 h-96">
                    <LogViewer
                      logs={logs.logs}
                      loading={panelLoading}
                      emptyText={labels.noLogs ?? 'No logs'}
                      labels={{
                        searchPlaceholder: labels.logSearchPlaceholder,
                        copy: labels.logCopy,
                        copied: labels.logCopied,
                        wrap: labels.logWrap,
                        autoScroll: labels.logAutoScroll,
                        lines: labels.logLines,
                      }}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'output' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{labels.nodeOutput ?? 'Node Output'}</span>
                    <Button size="sm" variant="ghost" onClick={handleLoadOutput} loading={panelLoading}>
                      {labels.refresh ?? 'Refresh'}
                    </Button>
                  </div>
                  <div className="p-2 rounded bg-gray-900 border border-gray-800 text-[10px] text-gray-300 max-h-96 overflow-auto">
                    {renderOutput(output, labels.noOutput)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 组件解释器：查看算子定义详情 */}
      <ComponentInterpreter
        component={interpreterComponent}
        fetchMetadata={handleInterpretFetch}
        onClose={() => setInterpreterComponent(null)}
        labels={{
          title: labels.interpreterTitle ?? '组件解释',
          description: labels.interpreterDesc ?? '描述',
          inputs: labels.interpreterInputs ?? '输入',
          outputs: labels.interpreterOutputs ?? '输出',
          attributes: labels.interpreterAttrs ?? '可配置属性',
          loading: labels.interpreterLoading ?? '加载组件定义中...',
          noDefinition: labels.interpreterNoDef ?? '暂无组件定义',
          allowedTypes: labels.interpreterTypes ?? '类型',
        }}
      />

      {/* 节点右键菜单：对应原版 graph-hook-service 中的节点右键操作 */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
          <div
            className="fixed z-50 min-w-[160px] py-1 rounded-lg bg-gray-900 border border-gray-700 shadow-xl text-xs"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {onRunSingle && (
              <button className="w-full px-3 py-1.5 text-left text-gray-300 hover:bg-gray-800 hover:text-white" onClick={() => { setContextMenu(null); handleRunSingle(); }}>
                ▶️ {labels.runSingle ?? 'Run Single'}
              </button>
            )}
            {onRunDown && (
              <button className="w-full px-3 py-1.5 text-left text-gray-300 hover:bg-gray-800 hover:text-white" onClick={() => { setContextMenu(null); handleRunDown(); }}>
                ⬇️ {labels.runDown ?? 'Run Downstream'}
              </button>
            )}
            {onRunUp && (
              <button className="w-full px-3 py-1.5 text-left text-gray-300 hover:bg-gray-800 hover:text-white" onClick={() => { setContextMenu(null); handleRunUp(); }}>
                ⬆️ {labels.runUp ?? 'Run Upstream'}
              </button>
            )}
            {(onRunSingle || onRunDown || onRunUp) && <div className="my-1 border-t border-gray-700" />}
            <button className="w-full px-3 py-1.5 text-left text-gray-300 hover:bg-gray-800 hover:text-white" onClick={() => { setContextMenu(null); handleCopyNode(contextMenu.node); }}>
              📋 Copy <span className="text-gray-500 ml-2">⌘C</span>
            </button>
            <button className="w-full px-3 py-1.5 text-left text-gray-300 hover:bg-gray-800 hover:text-white" onClick={() => { setContextMenu(null); handleDuplicateNode(contextMenu.node); }}>
              📄 Duplicate <span className="text-gray-500 ml-2">⌘D</span>
            </button>
            {clipboardRef.current && (
              <button className="w-full px-3 py-1.5 text-left text-gray-300 hover:bg-gray-800 hover:text-white" onClick={() => { setContextMenu(null); handlePasteNode(); }}>
                📌 Paste <span className="text-gray-500 ml-2">⌘V</span>
              </button>
            )}
            <div className="my-1 border-t border-gray-700" />
            <button className="w-full px-3 py-1.5 text-left text-red-400 hover:bg-red-900/30 hover:text-red-300" onClick={() => { setContextMenu(null); handleDeleteNode(contextMenu.node.id); }}>
              🗑️ Delete <span className="text-gray-500 ml-2">Del</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
