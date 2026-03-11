/**
 * useGroupStore - 구역(그룹) 트리 상태 관리 (Zustand)
 *
 * 2-level 트리: 대그룹(node=2) / 소그룹(node=3)
 * - 대그룹: 층(1층, 2층, ...)
 * - 소그룹: 구역(로비, 회의실, ...) — root_id로 부모 대그룹 참조
 */

import { create } from 'zustand';
import type { GroupRow } from '../types/db.types';
import type { ISqliteRepository } from '../services/ISqliteRepository';

interface GroupStore {
  // ─── State ─────────────────────────────────────────────
  groups: GroupRow[];
  /** 사이드바에서 펼쳐진 대그룹 ID 셋 */
  expandedGroupIds: Set<number>;
  db: ISqliteRepository | null;

  // ─── Actions ───────────────────────────────────────────
  initStore: (db: ISqliteRepository) => void;

  /** DB에서 전체 그룹 로드 */
  loadGroups: () => Promise<void>;

  /** 대그룹 목록 (node=2, sort_order 순) */
  getParentGroups: () => GroupRow[];

  /** 특정 대그룹의 소그룹 목록 (node=3, root_id 일치) */
  getSubGroups: (parentId: number) => GroupRow[];

  /** 사이드바 대그룹 토글 (접기/펼치기) */
  toggleExpand: (groupId: number) => void;

  // ─── CRUD ──────────────────────────────────────────────
  /** 대그룹 추가 */
  addGroup: (groupname: string, sortOrder?: number) => Promise<void>;

  /** 소그룹 추가 */
  addSubGroup: (groupname: string, rootId: number, sortOrder?: number) => Promise<void>;

  /** 그룹 이름/순서 수정 */
  updateGroup: (groupId: number, data: Partial<GroupRow>) => Promise<void>;

  /** 그룹 삭제 (CASCADE: 하위 소그룹 + group_devices) */
  deleteGroup: (groupId: number) => Promise<void>;
}

export const useGroupStore = create<GroupStore>((set, get) => ({
  groups: [],
  expandedGroupIds: new Set<number>(),
  db: null,

  initStore: (db: ISqliteRepository) => {
    set({ db });
  },

  loadGroups: async () => {
    const { db } = get();
    if (!db) return;

    const groups = await db.getGroups();
    set({ groups });

    // 처음 로드 시 모든 대그룹을 펼침
    const parentIds = groups
      .filter((g) => g.node === 2)
      .map((g) => g.group_id!)
      .filter((id) => id !== undefined);
    set({ expandedGroupIds: new Set(parentIds) });
  },

  getParentGroups: () => {
    return get()
      .groups.filter((g) => g.node === 2)
      .sort((a, b) => a.sort_order - b.sort_order);
  },

  getSubGroups: (parentId: number) => {
    return get()
      .groups.filter((g) => g.node === 3 && g.root_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order);
  },

  toggleExpand: (groupId: number) => {
    const expanded = new Set(get().expandedGroupIds);
    if (expanded.has(groupId)) {
      expanded.delete(groupId);
    } else {
      expanded.add(groupId);
    }
    set({ expandedGroupIds: expanded });
  },

  addGroup: async (groupname: string, sortOrder = 0) => {
    const { db } = get();
    if (!db) return;

    await db.createGroup({
      groupname,
      node: 2,
      root_id: 0,
      sort_order: sortOrder,
      backimg: null,
    });
    await get().loadGroups();
  },

  addSubGroup: async (groupname: string, rootId: number, sortOrder = 0) => {
    const { db } = get();
    if (!db) return;

    await db.createGroup({
      groupname,
      node: 3,
      root_id: rootId,
      sort_order: sortOrder,
      backimg: null,
    });
    await get().loadGroups();
  },

  updateGroup: async (groupId: number, data: Partial<GroupRow>) => {
    const { db } = get();
    if (!db) return;

    await db.updateGroup(groupId, data);
    await get().loadGroups();
  },

  deleteGroup: async (groupId: number) => {
    const { db } = get();
    if (!db) return;

    await db.deleteGroup(groupId);
    await get().loadGroups();
  },
}));
