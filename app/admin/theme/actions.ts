'use server'

import { updateTag } from 'next/cache'
import { SITE_THEME_TAG } from '@/lib/theme'

// admin 테마 저장(클라이언트 측 supabase update) 직후 호출.
// updateTag: Server Action 전용 즉시 만료(read-your-own-writes). unstable_cache의
// 'site-theme' 태그를 무효화해 변경한 색이 즉시 사이트에 반영되게 한다.
export async function revalidateTheme() {
  updateTag(SITE_THEME_TAG)
}
