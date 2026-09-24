/**
 * 认证状态仓库（Zustand）。
 *
 * 职责：
 * - 维护当前登录用户、平台上下文（CENTER/EDGE/AUTONOMY/P2P/TEST）与认证状态；
 * - 登录：密码同时做 SHA-256（passwordHash）与 SM3（passwordHashSm3，兼容旧 Java 平台账号）哈希；
 * - 登录后与页面加载时调用 user/get 刷新 platformType / ownerType / ownerId / deployMode；
 * - 登出与状态重水合（rehydrate）。
 */
import { create } from 'zustand';
import { sha256, sm3 } from '@secretpad/utils';
import type { User, Platform } from '@secretpad/api-client';
import { apiClient, mapUserContext } from '@secretpad/api-client';

const USER_KEY = 'secretpad-user';
const TOKEN_KEY = 'secretpad-token';
/** Legacy `notFirstTimeIn`: set after the first CENTER login redirected to /guide. */
export const FIRST_LOGIN_KEY = 'secretpad-not-first-time';

interface AuthState {
  user: User | null;
  platform: Platform;
  isAuthenticated: boolean;
  /** 从 localStorage 重新读取用户/token，用于刷新页面后恢复会话。 */
  rehydrate: () => void;
  /** 调用 user/get 刷新用户上下文（platformType / ownerType / ownerId / deployMode）。 */
  refreshUser: () => Promise<User | null>;
  /** 登录：返回合并了 user/get 结果的用户信息。 */
  login: (name: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

/** 从 localStorage 安全读取已持久化的用户信息，解析失败时返回 null。 */
export function getStoredUser(): User | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(USER_KEY) : null;
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function persistUser(user: User | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** 根据用户信息推导平台上下文，缺失时回退为 CENTER。 */
function buildPlatform(user: User | null): Platform {
  return {
    platformType: ((user?.platformType || 'CENTER').toUpperCase() as Platform['platformType']) || 'CENTER',
    nodeId: user?.ownerId || user?.platformNodeId || '',
  };
}

/** Merge a fresh user/get context over the stored user (keeping the token). */
async function fetchUserContext(base: User | null): Promise<User | null> {
  try {
    const ctx = await apiClient.getUser();
    const defined = Object.fromEntries(Object.entries(ctx).filter(([, v]) => v !== undefined && v !== null && v !== ''));
    const merged = mapUserContext({ ...(base || {}), ...defined }, base?.name || ctx.name || '', base?.token || '');
    return merged;
  } catch {
    return base;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getStoredUser(),
  platform: buildPlatform(getStoredUser()),
  isAuthenticated: typeof localStorage !== 'undefined' && !!localStorage.getItem(TOKEN_KEY),

  rehydrate: () => {
    const user = getStoredUser();
    set({
      user,
      platform: buildPlatform(user),
      isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
    });
  },

  refreshUser: async () => {
    if (!localStorage.getItem(TOKEN_KEY)) return null;
    const user = await fetchUserContext(get().user || getStoredUser());
    if (user) {
      persistUser(user);
      set({ user, platform: buildPlatform(user), isAuthenticated: true });
    }
    return user;
  },

  login: async (name: string, password: string) => {
    // 密码不以明文传输：SHA-256 为主，SM3 供旧平台账号兼容校验。
    const passwordHash = await sha256(password);
    const passwordHashSm3 = sm3(password);
    const loginUser = await apiClient.login(name, passwordHash, passwordHashSm3);
    persistUser(loginUser);
    // 登录响应可能不含完整上下文（deployMode 等），以 user/get 为准补全。
    const user = (await fetchUserContext(loginUser)) || loginUser;
    persistUser(user);
    set({ user, isAuthenticated: true, platform: buildPlatform(user) });
    return user;
  },

  logout: async () => {
    try {
      await apiClient.logout();
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      persistUser(null);
      set({ user: null, isAuthenticated: false, platform: buildPlatform(null) });
    }
  },
}));
