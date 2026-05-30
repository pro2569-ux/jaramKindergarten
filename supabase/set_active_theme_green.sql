-- P0-1 정합: 활성 site_theme 행을 현재 브랜드 초록으로 맞춰 "화면 변화 0"을 보장.
-- (전역 주입이 활성 행 값을 읽으므로, 시드 기본값(인디고 #4f46e5)이 그대로면 사이트가 인디고로 바뀜)
-- background_color/text_color 는 이번에 주입하지 않으므로(T3 제외) 건드리지 않음.
-- is_active 는 건드리지 않음 (idx_site_theme_single_active 충돌 방지).
UPDATE site_theme
SET primary_color   = '#4CAF50',
    secondary_color = '#FF9800'
WHERE is_active = true;
