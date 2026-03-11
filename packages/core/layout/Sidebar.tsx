/**
 * Sidebar - 2-level 트리 네비게이션
 *
 * - 대시보드 링크
 * - 대그룹 접기/펼치기
 * - 소그룹 클릭 → GroupScreen 이동
 * - 구역 설정 (관리자만)
 * - 사용자 이름 + 로그아웃
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGroupStore } from '../store/useGroupStore';
import { useAuthStore } from '../store/useAuthStore';
import { usePermission } from '../hooks/usePermission';

interface SidebarProps {
  appName?: string;
  themeColor?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  appName = 'Local Control',
  themeColor = 'bg-blue-600',
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, logout } = useAuthStore();
  const { getParentGroups, getSubGroups, expandedGroupIds, toggleExpand } =
    useGroupStore();
  const { canManageGroups } = usePermission();

  const parentGroups = getParentGroups();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-60 h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* 앱 로고 */}
      <div className={`${themeColor} px-4 py-4`}>
        <h1 className="text-white font-bold text-lg truncate">{appName}</h1>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {/* 대시보드 */}
        <button
          onClick={() => navigate('/')}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1
            ${isActive('/') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
        >
          ■ 대시보드
        </button>

        {/* 구역별 제어 헤더 */}
        <div className="px-3 py-2 mt-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            구역별 제어
          </span>
        </div>

        {/* 그룹 트리 */}
        {parentGroups.map((parent) => {
          const isExpanded = expandedGroupIds.has(parent.group_id!);
          const subGroups = getSubGroups(parent.group_id!);

          return (
            <div key={parent.group_id} className="mb-0.5">
              {/* 대그룹 (접기/펼치기) */}
              <button
                onClick={() => toggleExpand(parent.group_id!)}
                className="w-full text-left px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 flex items-center gap-1.5 transition-colors"
              >
                <span className="text-xs text-gray-400">
                  {isExpanded ? '▼' : '▶'}
                </span>
                <span className="truncate">{parent.groupname}</span>
              </button>

              {/* 소그룹 목록 */}
              {isExpanded && subGroups.length > 0 && (
                <div className="ml-4 border-l border-gray-200">
                  {subGroups.map((sub) => {
                    const subPath = `/controls/${sub.group_id}`;
                    return (
                      <button
                        key={sub.group_id}
                        onClick={() => navigate(subPath)}
                        className={`w-full text-left pl-4 pr-3 py-1.5 text-sm transition-colors
                          ${isActive(subPath)
                            ? 'text-blue-700 bg-blue-50 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                          }`}
                      >
                        {sub.groupname}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 소그룹 없을 때 */}
              {isExpanded && subGroups.length === 0 && (
                <div className="ml-4 pl-4 py-1.5 text-xs text-gray-400">
                  소그룹 없음
                </div>
              )}
            </div>
          );
        })}

        {/* 구역이 없을 때 */}
        {parentGroups.length === 0 && (
          <div className="px-3 py-4 text-sm text-gray-400 text-center">
            구역이 없습니다
          </div>
        )}

        {/* 구분선 */}
        <div className="border-t border-gray-200 my-3" />

        {/* 구역 설정 (관리자만) */}
        {canManageGroups && (
          <button
            onClick={() => navigate('/settings/groups')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
              ${isActive('/settings/groups')
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            ⚙ 구역 설정
          </button>
        )}
      </nav>

      {/* 사용자 정보 + 로그아웃 */}
      <div className="border-t border-gray-200 px-3 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-white font-medium">
                {user?.name?.charAt(0) ?? '?'}
              </span>
            </div>
            <span className="text-sm text-gray-700 truncate">
              {user?.name ?? '사용자'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            로그아웃
          </button>
        </div>
      </div>
    </aside>
  );
};
