/**
 * BackupRestoreScreen - 설정 내보내기/불러오기 화면 (관리자 전용)
 *
 * - [설정 내보내기] → ExportService → JSON → 플랫폼별 파일 저장
 * - [설정 불러오기] → 플랫폼별 파일 열기 → ImportService → 미리보기 → 확인 → DB 반영
 */

import React, { useState, useRef } from 'react';
import { exportToJson } from '../services/ExportService';
import { previewImportData, importFromJson, type ImportPreview, type ImportMode } from '../services/ImportService';
import { detectPlatform } from '../platform';

export const BackupRestoreScreen: React.FC = () => {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importJson, setImportJson] = useState<string>('');
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const platform = detectPlatform();

  // ─── 내보내기 ───

  const handleExport = async () => {
    setLoading(true);
    setStatus('');
    try {
      const json = await exportToJson();
      const defaultName = `localcontrol_backup_${new Date().toISOString().slice(0, 10)}.json`;

      if (platform === 'electron') {
        // Electron: 파일 저장 다이얼로그
        const api = (window as unknown as Record<string, unknown>).electronAPI as
          | { file: { saveJson: (j: string, n: string) => Promise<{ success: boolean; filePath?: string }> } }
          | undefined;
        if (api?.file) {
          const result = await api.file.saveJson(json, defaultName);
          setStatus(result.success ? `✅ 내보내기 완료: ${result.filePath}` : '내보내기 취소됨');
        }
      } else {
        // Android / Web: Blob 다운로드
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatus('✅ 내보내기 완료');
      }
    } catch (err) {
      setStatus(`❌ 내보내기 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // ─── 불러오기 - 파일 선택 ───

  const handleImportClick = async () => {
    setStatus('');
    setPreview(null);
    setImportJson('');

    if (platform === 'electron') {
      const api = (window as unknown as Record<string, unknown>).electronAPI as
        | { file: { openJson: () => Promise<{ success: boolean; content?: string }> } }
        | undefined;
      if (api?.file) {
        const result = await api.file.openJson();
        if (result.success && result.content) {
          processImportFile(result.content);
        } else {
          setStatus('불러오기 취소됨');
        }
      }
    } else {
      // Android / Web: file input
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      processImportFile(content);
    };
    reader.readAsText(file);
    // reset input
    e.target.value = '';
  };

  const processImportFile = (content: string) => {
    const prev = previewImportData(content);
    setPreview(prev);
    if (prev.valid) {
      setImportJson(content);
      setShowConfirm(true);
    } else {
      setStatus(`❌ ${prev.error}`);
    }
  };

  // ─── 불러오기 - 확인 후 실행 ───

  const handleConfirmImport = async () => {
    setLoading(true);
    setShowConfirm(false);
    try {
      await importFromJson(importJson, importMode);
      setStatus('✅ 불러오기 완료! 앱을 새로고침합니다...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setStatus(`❌ 불러오기 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
      setPreview(null);
      setImportJson('');
    }
  };

  const handleCancelImport = () => {
    setShowConfirm(false);
    setPreview(null);
    setImportJson('');
    setStatus('');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">설정 백업 / 복원</h1>
      <p className="text-sm text-gray-500">
        구역, 장치, 매핑, 앱 설정을 JSON 파일로 내보내거나 불러올 수 있습니다.
      </p>

      {/* 내보내기 섹션 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">📤 설정 내보내기</h2>
        <p className="text-sm text-gray-500 mb-4">
          현재 설정된 구역, 장치, 매핑 정보를 JSON 파일로 저장합니다.
        </p>
        <button
          onClick={handleExport}
          disabled={loading}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? '처리 중...' : '설정 내보내기'}
        </button>
      </div>

      {/* 불러오기 섹션 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">📥 설정 불러오기</h2>
        <p className="text-sm text-gray-500 mb-4">
          이전에 내보낸 JSON 파일을 선택하여 설정을 복원합니다.
        </p>

        {/* 불러오기 모드 선택 */}
        <div className="mb-4 flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="importMode"
              value="merge"
              checked={importMode === 'merge'}
              onChange={() => setImportMode('merge')}
            />
            <span>병합 (기존 데이터 유지)</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="importMode"
              value="overwrite"
              checked={importMode === 'overwrite'}
              onChange={() => setImportMode('overwrite')}
            />
            <span>덮어쓰기 (기존 데이터 초기화)</span>
          </label>
        </div>

        <button
          onClick={handleImportClick}
          disabled={loading}
          className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? '처리 중...' : '파일 선택 및 불러오기'}
        </button>

        {/* hidden file input for web/android */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* 상태 메시지 */}
      {status && (
        <div
          className={`p-4 rounded-lg text-sm ${
            status.startsWith('✅')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : status.startsWith('❌')
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-gray-50 text-gray-600 border border-gray-200'
          }`}
        >
          {status}
        </div>
      )}

      {/* 미리보기 + 확인 다이얼로그 */}
      {showConfirm && preview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">불러오기 미리보기</h3>

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">내보낸 시각</span>
                <span className="text-gray-800">{preview.exportedAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">앱 버전</span>
                <span className="text-gray-800">{preview.appVersion}</span>
              </div>
              <div className="border-t my-2" />
              <div className="flex justify-between">
                <span className="text-gray-500">구역 수</span>
                <span className="text-gray-800 font-medium">{preview.groupCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">장치 수</span>
                <span className="text-gray-800 font-medium">{preview.deviceCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">구역-장치 매핑</span>
                <span className="text-gray-800 font-medium">{preview.groupDeviceCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">앱 설정 항목</span>
                <span className="text-gray-800 font-medium">{preview.settingCount}</span>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700 mb-4">
              {importMode === 'overwrite'
                ? '⚠️ 덮어쓰기 모드: 기존 구역/장치/설정이 모두 삭제된 후 가져온 데이터로 대체됩니다.'
                : 'ℹ️ 병합 모드: 기존 데이터를 유지하면서 가져온 데이터를 추가합니다.'}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelImport}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={handleConfirmImport}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
