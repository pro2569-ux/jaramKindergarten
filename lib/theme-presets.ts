// 테마 관리 화면용 프리셋 팔레트 (코드 상수 — DB 스키마와 무관).
// 추가/수정 시 이 배열만 편집하면 됩니다.
// ⚠️ 모든 색은 site_theme hex 검증(/^#[0-9a-fA-F]{6}$/)을 통과하는 6자리 hex여야 합니다.

export interface ThemePreset {
  id: string
  name: string
  primary: string
  secondary: string
  background: string
  text: string
}

export const THEME_PRESETS: ThemePreset[] = [
  // 되돌리기용 기본값
  { id: 'jaram-green',    name: '자람 초록 (기본)', primary: '#4CAF50', secondary: '#FF9800', background: '#FFFFFF', text: '#1e293b' },
  // 어린이집 파스텔 + 노랑 컨셉
  { id: 'chick-sunshine', name: '병아리 햇살',      primary: '#FFC83D', secondary: '#FF9F68', background: '#FFFDF5', text: '#574A36' },
  { id: 'sunny-mint',     name: '햇살 민트',        primary: '#FFD23F', secondary: '#7DCEA0', background: '#FFFDF4', text: '#455A4D' },
  { id: 'cotton-candy',   name: '솜사탕',          primary: '#FFDD57', secondary: '#FFADCB', background: '#FFFAFB', text: '#6E5A63' },
  { id: 'meadow-sky',     name: '들판 하늘',        primary: '#FBC02D', secondary: '#7AC8EC', background: '#FFFDF2', text: '#3E4C59' },
]
