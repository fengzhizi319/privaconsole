/**
 * 模板快速配置面板 —— 对应原版 template-quick-config/quick-config-drawer.tsx
 *
 * 提供流水线模板的预设参数快速配置：
 * - PSI：选择收发方数据表和关联键列
 * - 风控模型：特征/标签列选择 + 训练参数
 * - 差分隐私：epsilon/delta 参数
 * - K-匿名：k 值 + 准标识符列
 * - 数据脱敏：脱敏方法选择
 *
 * 零外部依赖，通过 labels 注入文案。
 */
import React, { useState } from 'react';

/* -------------------------------------------------------------------------- */
/* 类型定义                                                                    */
/* -------------------------------------------------------------------------- */

/** 模板类型枚举（对应原版 PipelineTemplateType）。 */
export type TemplateType =
  | 'PSI'
  | 'PSI_TEE'
  | 'RISK'
  | 'TEE'
  | 'DIFFERENTIAL_PRIVACY'
  | 'LOCAL_DIFFERENTIAL_PRIVACY'
  | 'K_ANONYMITY'
  | 'L_DIVERSITY'
  | 'SANITIZATION';

/** 表信息。 */
export interface TableInfo {
  datatableId: string;
  datatableName: string;
  nodeId: string;
  nodeName: string;
  columns?: string[];
}

/** 快速配置表单值。 */
export interface QuickConfigValues {
  [key: string]: unknown;
}

/** 组件文案标签。 */
export interface QuickConfigLabels {
  title?: string;
  save?: string;
  cancel?: string;
  warning?: string;
  receiverTable?: string;
  senderTable?: string;
  receiverKeys?: string;
  senderKeys?: string;
  epsilon?: string;
  delta?: string;
  kValue?: string;
  quasiIds?: string;
  sanitizeMethod?: string;
  featureCols?: string;
  labelCol?: string;
  numBoostRound?: string;
  maxDepth?: string;
}

/** 组件 Props。 */
export interface TemplateQuickConfigProps {
  /** 当前模板类型。 */
  templateType: TemplateType;
  /** 可选数据表列表。 */
  tables?: TableInfo[];
  /** 保存回调。 */
  onSave?: (values: QuickConfigValues) => void | Promise<void>;
  /** 关闭回调。 */
  onClose?: () => void;
  /** 文案标签。 */
  labels?: QuickConfigLabels;
  /** 是否可见。 */
  visible?: boolean;
}

/* -------------------------------------------------------------------------- */
/* 子表单组件                                                                  */
/* -------------------------------------------------------------------------- */

const selectCls =
  'w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:border-cyan-500 focus:outline-none';
const inputCls =
  'w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:border-cyan-500 focus:outline-none';
const labelCls = 'block text-[11px] text-gray-400 mb-1 font-medium';

/** PSI 配置表单。 */
const PSIConfig: React.FC<{ tables: TableInfo[]; labels: QuickConfigLabels; onChange: (v: QuickConfigValues) => void }> = ({
  tables,
  labels,
  onChange,
}) => {
  const [receiverTable, setReceiverTable] = useState('');
  const [senderTable, setSenderTable] = useState('');
  const [receiverKeys, setReceiverKeys] = useState('');
  const [senderKeys, setSenderKeys] = useState('');

  const emit = (overrides: Record<string, string>) => {
    onChange({ receiverTable, senderTable, receiverKeys, senderKeys, ...overrides });
  };

  const receiverCols = tables.find((t) => t.datatableId === receiverTable)?.columns || [];
  const senderCols = tables.find((t) => t.datatableId === senderTable)?.columns || [];

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>{labels.receiverTable ?? '接收方数据表'}</label>
        <select className={selectCls} value={receiverTable} onChange={(e) => { setReceiverTable(e.target.value); emit({ receiverTable: e.target.value }); }}>
          <option value="">--</option>
          {tables.map((t) => (
            <option key={t.datatableId} value={t.datatableId}>{t.datatableName} ({t.nodeName})</option>
          ))}
        </select>
      </div>
      {receiverCols.length > 0 && (
        <div>
          <label className={labelCls}>{labels.receiverKeys ?? '接收方关联键'}</label>
          <select className={selectCls} value={receiverKeys} onChange={(e) => { setReceiverKeys(e.target.value); emit({ receiverKeys: e.target.value }); }}>
            <option value="">--</option>
            {receiverCols.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className={labelCls}>{labels.senderTable ?? '发送方数据表'}</label>
        <select className={selectCls} value={senderTable} onChange={(e) => { setSenderTable(e.target.value); emit({ senderTable: e.target.value }); }}>
          <option value="">--</option>
          {tables.map((t) => (
            <option key={t.datatableId} value={t.datatableId}>{t.datatableName} ({t.nodeName})</option>
          ))}
        </select>
      </div>
      {senderCols.length > 0 && (
        <div>
          <label className={labelCls}>{labels.senderKeys ?? '发送方关联键'}</label>
          <select className={selectCls} value={senderKeys} onChange={(e) => { setSenderKeys(e.target.value); emit({ senderKeys: e.target.value }); }}>
            <option value="">--</option>
            {senderCols.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}
    </div>
  );
};

/** 差分隐私配置表单。 */
const PrivacyConfig: React.FC<{ labels: QuickConfigLabels; onChange: (v: QuickConfigValues) => void }> = ({ labels, onChange }) => {
  const [epsilon, setEpsilon] = useState('1.0');
  const [delta, setDelta] = useState('1e-6');
  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>{labels.epsilon ?? 'Epsilon (ε)'}</label>
        <input className={inputCls} type="number" step="0.1" value={epsilon} onChange={(e) => { setEpsilon(e.target.value); onChange({ epsilon: Number(e.target.value), delta: Number(delta) }); }} />
      </div>
      <div>
        <label className={labelCls}>{labels.delta ?? 'Delta (δ)'}</label>
        <input className={inputCls} type="number" step="0.000001" value={delta} onChange={(e) => { setDelta(e.target.value); onChange({ epsilon: Number(epsilon), delta: Number(e.target.value) }); }} />
      </div>
    </div>
  );
};

/** K-匿名配置表单。 */
const KAnonymityConfig: React.FC<{ tables: TableInfo[]; labels: QuickConfigLabels; onChange: (v: QuickConfigValues) => void }> = ({ tables, labels, onChange }) => {
  const [kValue, setKValue] = useState('5');
  const [quasiIds, setQuasiIds] = useState('');
  const allCols = tables.flatMap((t) => t.columns || []);
  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>{labels.kValue ?? 'K 值'}</label>
        <input className={inputCls} type="number" min="2" value={kValue} onChange={(e) => { setKValue(e.target.value); onChange({ kValue: Number(e.target.value), quasiIds }); }} />
      </div>
      <div>
        <label className={labelCls}>{labels.quasiIds ?? '准标识符列（逗号分隔）'}</label>
        <input className={inputCls} value={quasiIds} placeholder="age, gender, zipcode" onChange={(e) => { setQuasiIds(e.target.value); onChange({ kValue: Number(kValue), quasiIds: e.target.value }); }} />
        {allCols.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {allCols.slice(0, 10).map((c) => (
              <button key={c} type="button" className="text-[10px] px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded hover:border-cyan-500 text-gray-400" onClick={() => { const v = quasiIds ? `${quasiIds},${c}` : c; setQuasiIds(v); onChange({ kValue: Number(kValue), quasiIds: v }); }}>{c}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/** 风控模型配置表单。 */
const RiskConfig: React.FC<{ labels: QuickConfigLabels; onChange: (v: QuickConfigValues) => void }> = ({ labels, onChange }) => {
  const [numBoostRound, setNumBoostRound] = useState('10');
  const [maxDepth, setMaxDepth] = useState('5');
  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>{labels.numBoostRound ?? '迭代轮数'}</label>
        <input className={inputCls} type="number" min="1" value={numBoostRound} onChange={(e) => { setNumBoostRound(e.target.value); onChange({ numBoostRound: Number(e.target.value), maxDepth: Number(maxDepth) }); }} />
      </div>
      <div>
        <label className={labelCls}>{labels.maxDepth ?? '树最大深度'}</label>
        <input className={inputCls} type="number" min="1" max="16" value={maxDepth} onChange={(e) => { setMaxDepth(e.target.value); onChange({ numBoostRound: Number(numBoostRound), maxDepth: Number(e.target.value) }); }} />
      </div>
    </div>
  );
};

/** 数据脱敏配置表单。 */
const SanitizationConfig: React.FC<{ labels: QuickConfigLabels; onChange: (v: QuickConfigValues) => void }> = ({ labels, onChange }) => {
  const [method, setMethod] = useState('masking');
  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>{labels.sanitizeMethod ?? '脱敏方法'}</label>
        <select className={selectCls} value={method} onChange={(e) => { setMethod(e.target.value); onChange({ method: e.target.value }); }}>
          <option value="masking">掩码脱敏 (Masking)</option>
          <option value="generalization">泛化 (Generalization)</option>
          <option value="suppression">抑制 (Suppression)</option>
          <option value="noise">噪声添加 (Noise)</option>
        </select>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 主组件                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * 模板快速配置面板。
 * 右侧抽屉形式，根据模板类型显示对应的预设配置表单。
 */
export const TemplateQuickConfig: React.FC<TemplateQuickConfigProps> = ({
  templateType,
  tables = [],
  onSave,
  onClose,
  labels = {},
  visible = true,
}) => {
  const [formValues, setFormValues] = useState<QuickConfigValues>({});
  const [saving, setSaving] = useState(false);

  if (!visible) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.(formValues);
    } finally {
      setSaving(false);
    }
  };

  const renderForm = () => {
    switch (templateType) {
      case 'PSI':
      case 'PSI_TEE':
        return <PSIConfig tables={tables} labels={labels} onChange={setFormValues} />;
      case 'DIFFERENTIAL_PRIVACY':
      case 'LOCAL_DIFFERENTIAL_PRIVACY':
        return <PrivacyConfig labels={labels} onChange={setFormValues} />;
      case 'K_ANONYMITY':
      case 'L_DIVERSITY':
        return <KAnonymityConfig tables={tables} labels={labels} onChange={setFormValues} />;
      case 'RISK':
      case 'TEE':
        return <RiskConfig labels={labels} onChange={setFormValues} />;
      case 'SANITIZATION':
        return <SanitizationConfig labels={labels} onChange={setFormValues} />;
      default:
        return <div className="text-xs text-gray-500">暂不支持此模板类型的快速配置</div>;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-72 flex flex-col bg-gray-900 border-l border-gray-800 shadow-2xl">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-100">{labels.title ?? '快速配置'}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-sm">✕</button>
      </div>

      {/* 警告提示 */}
      <div className="mx-3 mt-3 px-3 py-2 bg-yellow-900/30 border border-yellow-700/50 rounded text-[10px] text-yellow-300">
        {labels.warning ?? '若无数据集，请先到节点授权数据到项目，再按组件进行配置，配置内容需要保存才能生效'}
      </div>

      {/* 表单区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="mb-2 text-[10px] text-gray-500 uppercase tracking-wide">
          模板: {templateType}
        </div>
        {renderForm()}
      </div>

      {/* 底部按钮 */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-800">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs rounded font-medium transition-colors"
        >
          {saving ? '...' : (labels.save ?? '保存')}
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded font-medium transition-colors"
        >
          {labels.cancel ?? '取消'}
        </button>
      </div>
    </div>
  );
};
