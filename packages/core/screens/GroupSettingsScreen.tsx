/**
 * GroupSettingsScreen - 구역 관리 화면 (관리자 전용)
 *
 * 2-level 트리(대그룹/소그룹) CRUD
 * GroupModal을 6가지 모드로 호출
 */

import React, { useState, useEffect } from 'react';
import { useGroupStore } from '../store/useGroupStore';
import { GroupModal } from '../modals/GroupModal';
import type { GroupModalMode } from '../modals/GroupModal';
import type { GroupRow } from '../types/db.types';

export const GroupSettingsScreen: React.FC = () => {
  const {
    loadGroups,
    getParentGroups,
    getSubGroups,
    expandedGroupIds,
    toggleExpand,
  } = useGroupStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<GroupModalMode>('add');
  const [selectedGroup, setSelectedGroup] = useState<GroupRow | undefined>();
  const [parentGroupId, setParentGroupId] = useState<number | undefined>();

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const parentGroups = getParentGroups();

  const openModal = (
    mode: GroupModalMode,
    group?: GroupRow,
    parentId?: number,
  ) => {
    setModalMode(mode);
    setSelectedGroup(group);
    setParentGroupId(parentId);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedGroup(undefined);
    setParentGroupId(undefined);
  };

  // 최소 1개 대그룹 유지 정책
  const canDeleteParent = parentGroups.length > 1;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-800">구역 관리</h1>
        <button
          onClick={() => openModal('add')}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 대그룹 추가
        </button>
      </div>

      {/* 그룹 트리 */}
      <div className="bg-white rounded-xl shadow divide-y divide-gray-100">
        {parentGroups.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-400">
            구역이 없습니다. 대그룹을 추가하세요.
          </div>
        )}

        {parentGroups.map((parent) => {
          const isExpanded = expandedGroupIds.has(parent.group_id!);
          const subGroups = getSubGroups(parent.group_id!);

          return (
            <div key={parent.group_id}>
              {/* 대그룹 행 */}
              <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <button
                  onClick={() => toggleExpand(parent.group_id!)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 min-w-0"
                >
                  <span className="text-xs text-gray-400">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <span className="truncate">{parent.groupname}</span>
                  <span className="text-xs text-gray-400 font-normal">
                    ({subGroups.length}개 소그룹)
                  </span>
                </button>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => openModal('update', parent)}
                    className="px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-200 rounded transition-colors"
                    title="편집"
                  >
                    ✏ 편집
                  </button>
                  {canDeleteParent && (
                    <button
                      onClick={() => openModal('delete', parent)}
                      className="px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="삭제"
                    >
                      🗑 삭제
                    </button>
                  )}
                  <button
                    onClick={() =>
                      openModal('add-subgroup', undefined, parent.group_id!)
                    }
                    className="px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="소그룹 추가"
                  >
                    + 소그룹
                  </button>
                </div>
              </div>

              {/* 소그룹 목록 */}
              {isExpanded &&
                subGroups.map((sub) => (
                  <div
                    key={sub.group_id}
                    className="flex items-center justify-between px-4 py-2.5 pl-10 hover:bg-gray-50 border-t border-gray-50"
                  >
                    <span className="text-sm text-gray-600 truncate">
                      ├ {sub.groupname}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => openModal('update-subgroup', sub)}
                        className="px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-200 rounded transition-colors"
                      >
                        ✏ 편집
                      </button>
                      <button
                        onClick={() => openModal('delete-subgroup', sub)}
                        className="px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        🗑 삭제
                      </button>
                    </div>
                  </div>
                ))}

              {isExpanded && subGroups.length === 0 && (
                <div className="pl-10 py-2 text-xs text-gray-400 border-t border-gray-50">
                  소그룹 없음
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 모달 */}
      <GroupModal
        isOpen={modalOpen}
        mode={modalMode}
        group={selectedGroup}
        parentGroupId={parentGroupId}
        onClose={closeModal}
      />
    </div>
  );
};
