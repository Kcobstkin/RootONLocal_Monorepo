/**
 * GroupScreen - 구역별 장치 제어 화면
 *
 * 선택한 소그룹(구역)의 장치 카드 그리드 표시
 * Phase 6에서 실제 장치 카드를 구현
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useGroupStore } from '../store/useGroupStore';

export const GroupScreen: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { groups } = useGroupStore();

  const group = groups.find(
    (g) => g.group_id === Number(groupId),
  );

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            {group?.groupname ?? '구역'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">구역별 장치 제어</p>
        </div>
        {/* Phase 6에서 장치 추가/삭제 버튼 구현 */}
      </div>

      {/* 장치 카드 그리드 (Phase 6) */}
      <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">
        장치 카드가 여기에 표시됩니다 (Phase 6에서 구현 예정)
      </div>
    </div>
  );
};
