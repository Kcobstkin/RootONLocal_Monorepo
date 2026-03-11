# 릴리즈 빌드 가이드

## 사전 준비

```bash
# 의존성 설치
npm install

# (선택) 버전 범프
npm run version:bump
```

---

## Windows 빌드 (Electron NSIS 인스톨러)

### common 앱
```bash
npm run electron:build:common
```
→ 출력: `apps/common/dist-electron/LocalControl Setup *.exe`

### lgsb 앱
```bash
npm run electron:build:lgsb
```
→ 출력: `apps/lgsb/dist-electron/LGSBControl Setup *.exe`

### 전체 빌드
```bash
npm run release:all
```

---

## Android 빌드 (Capacitor APK)

### 사전 준비
- Android Studio 설치
- Android SDK (API 33+) 설치
- `ANDROID_HOME` 환경변수 설정

### common 앱
```bash
npm run apk:common
```
→ 출력: `apps/common/android/app/build/outputs/apk/release/app-release.apk`

### lgsb 앱
```bash
npm run apk:lgsb
```
→ 출력: `apps/lgsb/android/app/build/outputs/apk/release/app-release.apk`

### AndroidManifest 필수 권한
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />
```

---

## 환경 변수 (.env.production)

각 앱 폴더의 `.env.production` 파일에 LifeSmart 인증 정보를 설정:

```env
VITE_STATION_MODEL=YOUR_MODEL
VITE_STATION_TOKEN=YOUR_TOKEN
```

> ⚠️ `.env.production` 파일은 소스 저장소에 커밋하지 않습니다.

---

## 버전 관리

```bash
# 모든 워크스페이스의 patch 버전 일괄 범프
npm run version:bump

# 또는 개별 워크스페이스 버전 변경
npm -w apps/common version minor --no-git-tag-version
```

변경사항은 `CHANGELOG.md`에 기록합니다.
