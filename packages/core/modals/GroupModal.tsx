/**
 * GroupModal - 대그룹/소그룹 추가·편집·삭제 모달
 *
 * 6가지 모드:
 * - add: 대그룹 추가
 * - update: 대그룹 편집
 * - delete: 대그룹 삭제
 * - add-subgroup: 소그룹 추가
 * - update-subgroup: 소그룹 편집
 * - delete-subgroup: 소그룹 삭제
 */

import React, { useState, useEffect } from 'react';
import type { GroupRow } from '../types/db.types';
import { useGroupStore } from '../store/useGroupStore';

export type GroupModalMode =
  | 'add'
  | 'update'
  | 'delete'
  | 'add-subgroup'
  | 'update-subgroup'
  | 'delete-subgroup';

interface GroupModalProps {
  isOpen: boolean;
  mode: GroupModalMode;
  /** 편집/삭제 대상 그룹 */
  group?: GroupRow;
  /** 소그룹 추가 시 부모 대그룹 ID */
  parentGroupId?: number;
  onClose: () => void;
}

export const GroupModal: React.FC<GroupModalProps> = ({
  isOpen,
  mode,
  group,
  parentGroupId,
  onClose,
}) => {
  const { addGroup, addSubGroup, updateGroup, deleteGroup, getSubGroups } =
    useGroupStore();

  const [groupname, setGroupname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGroupname(group?.groupname ?? '');
      setConfirmDelete(false);
      setIsSubmitting(false);
    }
  }, [isOpen, group]);

  if (!isOpen) return null;

  const isDeleteMode = mode === 'delete' || mode === 'delete-subgroup';
  const isAddMode = mode === 'add' || mode === 'add-subgroup';

  const getTitle = () => {
    switch (mode) {
      case 'add':
        return '대그룹 추가';
      case 'update':
        return '대그룹 편집';
      case 'delete':
        return '대그룹 삭제';
      case 'add-subgroup':
        return '소그룹 추가';
      case 'update-subgroup':
        return '소그룹 편집';
      case 'delete-subgroup':
        return '소그룹 삭제';
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      switch (mode) {
        case 'add':
          if (groupname.trim()) {
            await addGroup(groupname.trim());
          }
          break;

        case 'update':
          if (group?.group_id && groupname.trim()) {
            await updateGroup(group.group_id, { groupname: groupname.trim() });
          }
          break;

        case 'delete':
          if (group?.group_id) {
            // 하위 소그룹 확인
            const subs = getSubGroups(group.group_id);
            if (subs.length > 0 && !confirmDelete) {
              setConfirmDelete(true);
              setIsSubmitting(false);
              return;
            }
            await deleteGroup(group.group_id);
          }
          break;

        case 'add-subgroup':
          if (groupname.trim() && parentGroupId) {
            await addSubGroup(groupname.trim(), parentGroupId);
          }
          break;

        case 'update-subgroup':
          if (group?.group_id && groupname.trim()) {
            await updateGroup(group.group_id, { groupname: groupname.trim() });
          }
          break;

        case 'delete-subgroup':
          if (group?.group_id) {
            await deleteGroup(group.group_id);
          }
          break;
      }

      onClose();
    } catch (error) {
      console.error('[GroupModal] Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 모달 */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">{getTitle()}</h2>

        {/* 삭제 모드 */}
        {isDeleteMode && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">"{group?.groupname}"</span>
              {mode === 'delete' ? ' 대그룹' : ' 소그룹'}을(를) 삭제하시겠습니까?
            </p>
            {confirmDelete && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-sm text-red-700">
                  하위 소그룹과 장치 연결이 모두 삭제됩니다.
                  <br />
                  정말 삭제하시겠습니까?
                </p>
              </div>
            )}
          </div>
        )}

        {/* 추가/편집 모드 */}
        {!isDeleteMode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {mode.includes('subgroup') ? '소그룹' : '대그룹'} 이름
            </label>
            <input
              type="text"
              value={groupname}
              onChange={(e) => setGroupname(e.target.value)}
              placeholder={
                mode.includes('subgroup') ? '예: 로비, 회의실 A' : '예: 1층, 2층'
              }
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        )}

        {/* 버튼 */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!isDeleteMode && !groupname.trim())}
            className={`px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50
              ${isDeleteMode
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {isSubmitting
              ? '처리 중...'
              : isDeleteMode
                ? confirmDelete
                  ? '확인 삭제'
                  : '삭제'
                : isAddMode
                  ? '추가'
                  : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
};
