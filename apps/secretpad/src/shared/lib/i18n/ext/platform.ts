/** i18n extension dictionary: platform (auth, guards, menus, header, account, node view). */
import type { Dictionary } from '../dictionaries';

export const zh: Dictionary = {
  sidebar: {
    nodeView: '节点视角',
    cooperativeNodes: '合作节点',
    allDataSources: '全部数据源',
    allDataTables: '全部数据表',
    myNodeView: '我的节点视角',
    instRegister: '节点注册',
    periodicTaskDetail: '周期任务详情',
  },
  header: {
    platform: {
      CENTER: '中心化平台',
      EDGE: 'Edge 节点',
      AUTONOMY: '自治模式',
      P2P: 'P2P 模式',
      TEST: '测试模式',
    },
    myInstitution: '我的机构',
    myNode: '我的节点',
    reopenGuide: '体验新手引导',
    community: 'c-life 社区',
    helpCenter: '帮助中心',
    messages: '消息中心',
    componentVersions: '组件版本',
    changePassword: '修改密码',
  },
  account: {
    policy: {
      hint: '新密码需 8–20 位，同时包含大写字母、小写字母和数字，且不能与当前密码相同。',
      length: '新密码长度需为 8–20 位',
      complexity: '新密码需同时包含大写字母、小写字母和数字',
      sameAsOld: '新密码与当前密码不能一致',
    },
  },
  nodeView: {
    title: '节点视角',
    mine: '（本方节点）',
    nodeInfo: '节点信息',
    backToNodes: '返回节点管理',
    tabs: {
      dataSources: '数据源',
      dataTables: '数据管理',
      cooperativeNodes: '合作节点',
      results: '结果管理',
    },
  },
};

export const en: Dictionary = {
  sidebar: {
    nodeView: 'Node View',
    cooperativeNodes: 'Cooperative Nodes',
    allDataSources: 'All Data Sources',
    allDataTables: 'All Data Tables',
    myNodeView: 'My Node View',
    instRegister: 'Register Node',
    periodicTaskDetail: 'Periodic Task Detail',
  },
  header: {
    platform: {
      CENTER: 'Center',
      EDGE: 'Edge Node',
      AUTONOMY: 'Autonomy',
      P2P: 'P2P',
      TEST: 'Test',
    },
    myInstitution: 'My Institution',
    myNode: 'My Node',
    reopenGuide: 'Beginner Guide',
    community: 'c-life Community',
    helpCenter: 'Help Center',
    messages: 'Message Center',
    componentVersions: 'Component Versions',
    changePassword: 'Change Password',
  },
  account: {
    policy: {
      hint: 'The new password must be 8–20 characters, contain upper-case, lower-case letters and digits, and differ from the current one.',
      length: 'The new password must be 8–20 characters long',
      complexity: 'The new password must contain upper-case, lower-case letters and digits',
      sameAsOld: 'The new password must differ from the current password',
    },
  },
  nodeView: {
    title: 'Node View',
    mine: '(own node)',
    nodeInfo: 'Node info',
    backToNodes: 'Back to nodes',
    tabs: {
      dataSources: 'Data Sources',
      dataTables: 'Data Tables',
      cooperativeNodes: 'Cooperative Nodes',
      results: 'Results',
    },
  },
};
