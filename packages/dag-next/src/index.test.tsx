import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { DAGNextWorkspace } from './index';
import type { DAGComponentDef, DAGNode } from './index';

/**
 * dag-next 画布拖拽 / 节点交互测试。
 *
 * 背景（回归来源）：/dag 页面曾出现「左侧组件无法拖到画布」的线上问题，
 * 根因有两层：
 * 1. 宿主页面在 readOnly 回退中渲染了画布（draggable=false）——由宿主权限修复；
 * 2. 宿主页面每次渲染都传入新的 initialNodes 引用，触发本组件
 *    useEffect([initialNodes]) 的全量同步，把刚拖入的节点立刻冲掉。
 * 本文件把画布的拖拽契约（可拖、可落、落点坐标、同步语义、readOnly 禁用）
 * 全部用测试固化，防止回退。
 */

/** jsdom 没有 DataTransfer 实现，这里造一个最小可用的存储型 mock。 */
function createDataTransfer() {
  const store: Record<string, string> = {};
  return {
    dropEffect: 'none',
    effectAllowed: 'all',
    types: [] as string[],
    files: [] as any,
    items: [] as any,
    setData: vi.fn((type: string, val: string) => {
      store[type] = val;
    }),
    getData: vi.fn((type: string) => store[type] ?? ''),
    clearData: vi.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
    __store: store,
  };
}

const trainComponent: DAGComponentDef = {
  domain: 'ml.train',
  name: 'ss_sgd_train',
  version: '1.0.0',
  desc: 'Secure SGD train',
  icon: '🤖',
};

const componentGroups = { 'ML Train': [trainComponent] };

function renderWorkspace(props: Partial<Parameters<typeof DAGNextWorkspace>[0]> = {}) {
  return render(<DAGNextWorkspace componentGroups={componentGroups} {...props} />);
}

/** 中间画布节点：内部 svg 的父元素（带网格点背景的画布 div）。 */
function getCanvas(container: HTMLElement): HTMLElement {
  const svg = container.querySelector('svg.pointer-events-none');
  if (!svg || !svg.parentElement) throw new Error('canvas not found');
  return svg.parentElement as HTMLElement;
}

/** 让画布拥有一份非零的边界矩形，便于验证落点坐标换算。 */
function mockCanvasRect(canvas: HTMLElement) {
  canvas.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 1000,
      height: 800,
      right: 1000,
      bottom: 800,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
}

/** 从左侧组件库发起 HTML5 拖拽（dragStart 阶段写入 dataTransfer）。 */
function startDrag(item: HTMLElement, dataTransfer = createDataTransfer()) {
  fireEvent.dragStart(item, { dataTransfer });
  return dataTransfer;
}

/** 在画布上完成一次拖放（MouseEvent 构造以携带 clientX/clientY）。 */
function dropOnCanvas(
  canvas: HTMLElement,
  dataTransfer: ReturnType<typeof createDataTransfer>,
  clientX = 300,
  clientY = 200,
) {
  fireEvent.dragOver(canvas, { dataTransfer });
  const dropEvent = new MouseEvent('drop', {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
  });
  Object.defineProperty(dropEvent, 'dataTransfer', { value: dataTransfer });
  fireEvent(canvas, dropEvent);
}

function getPaletteItem(name = trainComponent.name): HTMLElement {
  const el = screen.getByText(name).closest('[draggable]');
  if (!el) throw new Error(`palette item ${name} not found`);
  return el as HTMLElement;
}

/** 顶栏的节点/边计数文本，如 "1 nodes · 0 edges"。 */
function expectCounter(text: string) {
  expect(screen.getByText(new RegExp(`^${text}$`))).toBeTruthy();
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('组件库拖拽（drag & drop）', () => {
  it('编辑模式下组件条目可拖拽（draggable=true）', () => {
    renderWorkspace();
    expect(getPaletteItem().getAttribute('draggable')).toBe('true');
  });

  it('dragStart 把组件定义写入 dataTransfer（application/json + text/plain）', () => {
    renderWorkspace();
    const dt = startDrag(getPaletteItem());
    expect(dt.setData).toHaveBeenCalledWith('application/json', JSON.stringify(trainComponent));
    expect(dt.setData).toHaveBeenCalledWith('text/plain', 'ml.train/ss_sgd_train');
    expect(JSON.parse(dt.__store['application/json'])).toEqual(trainComponent);
  });

  it('dragOver 画布时标记 dropEffect=copy（允许落下）', () => {
    const { container } = renderWorkspace();
    const canvas = getCanvas(container);
    const dt = createDataTransfer();
    fireEvent.dragOver(canvas, { dataTransfer: dt });
    expect(dt.dropEffect).toBe('copy');
  });

  it('拖放组件到画布：调用 onAddNode 并把节点放到落点坐标', async () => {
    const onAddNode = vi.fn(async (component: DAGComponentDef): Promise<DAGNode> => ({
      id: 'node-from-host',
      name: component.name,
      category: component.domain,
      icon: component.icon || '⚙️',
      status: 'Ready',
      // 宿主返回的默认位置应被落点覆盖
      x: 0,
      y: 0,
      codeName: `${component.domain}/${component.name}`,
    }));
    const { container } = renderWorkspace({ onAddNode });
    const canvas = getCanvas(container);
    mockCanvasRect(canvas);

    const dt = startDrag(getPaletteItem());
    dropOnCanvas(canvas, dt, 300, 200);

    await waitFor(() => expectCounter('1 nodes · 0 edges'));
    expect(onAddNode).toHaveBeenCalledTimes(1);
    expect(onAddNode).toHaveBeenCalledWith(trainComponent);

    // 落点换算：x = 300 - rect.left - 70 = 230，y = 200 - rect.top - 20 = 180
    const nodeEl = within(canvas).getByText('ss_sgd_train').closest('.absolute') as HTMLElement;
    expect(nodeEl.style.left).toBe('230px');
    expect(nodeEl.style.top).toBe('180px');
  });

  it('无 onAddNode 时在本地构造节点（codeName = domain/name），并自动选中', async () => {
    const onNodeSelect = vi.fn();
    const { container } = renderWorkspace({ onNodeSelect });
    const canvas = getCanvas(container);
    mockCanvasRect(canvas);

    const dt = startDrag(getPaletteItem());
    dropOnCanvas(canvas, dt);

    await waitFor(() => expectCounter('1 nodes · 0 edges'));
    const nodeEl = within(canvas).getByText('ss_sgd_train').closest('.absolute');
    expect(nodeEl).toBeTruthy();
    // 自动选中新节点，右侧检查器展示其 codeName
    expect(onNodeSelect).toHaveBeenCalledWith(
      expect.objectContaining({ codeName: 'ml.train/ss_sgd_train' }),
    );
    expect(screen.getByText('ml.train/ss_sgd_train')).toBeTruthy();
  });

  it('点击组件条目同样能把组件加到画布', async () => {
    const { container } = renderWorkspace();
    const canvas = getCanvas(container);
    fireEvent.click(screen.getByText('ss_sgd_train'));
    await waitFor(() => expectCounter('1 nodes · 0 edges'));
    expect(within(canvas).getByText('ss_sgd_train')).toBeTruthy();
  });

  it('非法拖放内容不会新增节点', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = renderWorkspace();
    const canvas = getCanvas(container);

    // 1) 没有 application/json 数据
    dropOnCanvas(canvas, createDataTransfer());
    // 2) JSON 无法解析
    const badJson = createDataTransfer();
    badJson.__store['application/json'] = '{not-json';
    dropOnCanvas(canvas, badJson);
    // 3) JSON 合法但缺少 domain/name
    const incomplete = createDataTransfer();
    incomplete.__store['application/json'] = JSON.stringify({ foo: 'bar' });
    dropOnCanvas(canvas, incomplete);

    await new Promise((r) => setTimeout(r, 20));
    expectCounter('0 nodes · 0 edges');
    expect(consoleSpy).toHaveBeenCalledTimes(1); // 仅第 2 种情况会记录解析错误
  });
});

describe('画布状态同步契约（initialNodes 引用语义）', () => {
  it('initialNodes 引用保持稳定时，重渲染不会冲掉新拖入的节点', async () => {
    // 宿主页面必须 memoize initialNodes（见 pages/dag/index.tsx 的 useMemo），
    // 本用例固化「引用稳定 => 本地新增节点存活」这一契约。
    const stableInitialNodes: DAGNode[] = [];
    const { container, rerender } = render(
      <DAGNextWorkspace componentGroups={componentGroups} initialNodes={stableInitialNodes} />,
    );
    const canvas = getCanvas(container);

    const dt = startDrag(getPaletteItem());
    dropOnCanvas(canvas, dt);
    await waitFor(() => expectCounter('1 nodes · 0 edges'));

    rerender(
      <DAGNextWorkspace componentGroups={componentGroups} initialNodes={stableInitialNodes} />,
    );
    expectCounter('1 nodes · 0 edges');
    expect(within(canvas).getByText('ss_sgd_train')).toBeTruthy();
  });

  it('initialNodes 引用变化时，画布会重新同步为传入内容', async () => {
    // 这是同步语义本身：引用变化意味着「服务端图数据已更新」，画布应跟随重置。
    // 宿主若未 memoize，每次重渲染都会误触发本行为 —— 这正是拖入节点瞬间消失的回归点。
    const { container, rerender } = render(
      <DAGNextWorkspace componentGroups={componentGroups} initialNodes={[]} />,
    );
    const canvas = getCanvas(container);

    const dt = startDrag(getPaletteItem());
    dropOnCanvas(canvas, dt);
    await waitFor(() => expectCounter('1 nodes · 0 edges'));

    rerender(<DAGNextWorkspace componentGroups={componentGroups} initialNodes={[]} />);
    expectCounter('0 nodes · 0 edges');
    expect(within(canvas).queryByText('ss_sgd_train')).toBeNull();
  });
});

describe('readOnly 只读模式', () => {
  it('组件条目不可拖拽，点击与拖放均不会新增节点', async () => {
    const { container } = renderWorkspace({ readOnly: true });
    const canvas = getCanvas(container);

    const item = getPaletteItem();
    expect(item.getAttribute('draggable')).toBe('false');

    // 点击添加被禁用
    fireEvent.click(screen.getByText('ss_sgd_train'));
    // 拖放被禁用
    const dt = startDrag(item);
    dropOnCanvas(canvas, dt);

    await new Promise((r) => setTimeout(r, 20));
    expectCounter('0 nodes · 0 edges');
    expect(within(canvas).queryByText('ss_sgd_train')).toBeNull();
  });
});

describe('画布节点交互', () => {
  const existingNodes: DAGNode[] = [
    { id: 'a', name: 'NodeA', category: 'ml', icon: '🤖', status: 'Ready', x: 100, y: 100 },
    { id: 'b', name: 'NodeB', category: 'ml', icon: '🤖', status: 'Ready', x: 400, y: 300 },
  ];

  it('拖动已有节点并松开后调用 onNodeMove（坐标随鼠标换算）', async () => {
    const onNodeMove = vi.fn();
    const { container } = renderWorkspace({ initialNodes: existingNodes, onNodeMove });
    const canvas = getCanvas(container);
    mockCanvasRect(canvas);

    const nodeEl = within(canvas).getByText('NodeA').closest('.absolute') as HTMLElement;
    fireEvent.mouseDown(nodeEl, { clientX: 150, clientY: 150 });
    fireEvent.mouseMove(canvas, { clientX: 250, clientY: 280 });
    fireEvent.mouseUp(canvas);

    // offset = (150-100, 150-100) = (50, 50) → 新位置 = (250-50, 280-50) = (200, 230)
    await waitFor(() => expect(onNodeMove).toHaveBeenCalledTimes(1));
    expect(onNodeMove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a', x: 200, y: 230 }),
    );
  });

  it('连线模式：依次点击源/目标节点后通过 onConnect 建立边', async () => {
    const onConnect = vi.fn((source: string, target: string) => ({
      id: 'edge-1',
      source,
      target,
    }));
    const { container } = renderWorkspace({ initialNodes: existingNodes, onConnect });
    const canvas = getCanvas(container);

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    fireEvent.click(within(canvas).getByText('NodeA'));
    fireEvent.click(within(canvas).getByText('NodeB'));

    await waitFor(() => expectCounter('2 nodes · 1 edges'));
    expect(onConnect).toHaveBeenCalledWith('a', 'b');
  });

  it('删除节点按钮会移除节点', async () => {
    const { container } = renderWorkspace({ initialNodes: existingNodes });
    const canvas = getCanvas(container);
    expect(within(canvas).getByText('NodeA')).toBeTruthy();

    fireEvent.click(screen.getAllByTitle('Delete node')[0]);
    await waitFor(() => expectCounter('1 nodes · 0 edges'));
    expect(within(canvas).queryByText('NodeA')).toBeNull();
  });
});
