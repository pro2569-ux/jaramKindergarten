/**
 * 게시판 타입 상수
 */
export const BOARD_TYPES = {
  NOTICE: 'notice',
  NEWSLETTER: 'newsletter',
  FREE: 'free',
} as const

export type BoardType = typeof BOARD_TYPES[keyof typeof BOARD_TYPES]

/**
 * 게시판 타입별 한글 이름
 */
export const BOARD_TYPE_NAMES: Record<BoardType, string> = {
  [BOARD_TYPES.NOTICE]: '공지사항',
  [BOARD_TYPES.NEWSLETTER]: '가정통신문',
  [BOARD_TYPES.FREE]: '자유게시판',
}

/**
 * 사용자 역할 상수
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  PARENT: 'parent',
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

/**
 * 사용자 역할별 한글 이름
 */
export const USER_ROLE_NAMES: Record<UserRole, string> = {
  [USER_ROLES.ADMIN]: '관리자',
  [USER_ROLES.TEACHER]: '교사',
  [USER_ROLES.PARENT]: '학부모',
}

/**
 * 문의 상태 상수
 */
export const INQUIRY_STATUS = {
  PENDING: 'pending',
  REPLIED: 'replied',
  CLOSED: 'closed',
} as const

export type InquiryStatus = typeof INQUIRY_STATUS[keyof typeof INQUIRY_STATUS]

/**
 * 문의 상태별 한글 이름
 */
export const INQUIRY_STATUS_NAMES: Record<InquiryStatus, string> = {
  [INQUIRY_STATUS.PENDING]: '대기중',
  [INQUIRY_STATUS.REPLIED]: '답변완료',
  [INQUIRY_STATUS.CLOSED]: '종료',
}

/**
 * 페이지 카테고리 상수
 */
export const PAGE_CATEGORIES = {
  ABOUT: 'about',
  CURRICULUM: 'curriculum',
} as const

export type PageCategory = typeof PAGE_CATEGORIES[keyof typeof PAGE_CATEGORIES]

/**
 * 페이지 카테고리별 한글 이름
 */
export const PAGE_CATEGORY_NAMES: Record<PageCategory, string> = {
  [PAGE_CATEGORIES.ABOUT]: '소개',
  [PAGE_CATEGORIES.CURRICULUM]: '보육과정',
}

/**
 * 페이지네이션 기본 설정
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  ALBUM_PAGE_SIZE: 12,
  ADMIN_PAGE_SIZE: 20,
} as const

/**
 * Supabase Storage 버킷 이름
 * Supabase 대시보드에 실제 존재하는 버킷명과 반드시 일치해야 함
 */
export const STORAGE_BUCKET = 'publicImage' as const

/**
 * 이관(jaramk.com) 앨범 사진용 private 버킷. 공개 URL 이 없고 서버에서 서명 URL 로만 열람한다.
 * DB 에는 'legacy-media:<객체 경로>' 형태로 저장하고 lib/storage/media.ts 가 렌더 시 해석한다.
 */
export const LEGACY_MEDIA_BUCKET = 'legacy-media' as const
export const LEGACY_MEDIA_PREFIX = 'legacy-media:' as const

/**
 * 앨범 반(albums.category) 목록. 원본 사이트(jaramk.com) 교육활동이야기 게시판 순서와 같고,
 * 이관 앨범에 들어 있는 category 값과 글자 그대로 일치한다. 반별 필터·메뉴·앨범 생성 폼이 이 목록을 쓴다.
 */
export const ALBUM_CATEGORIES = ['자람반', '산새반', '라온반', '맑은반', '햇살반', '자람이야기', '숲속반', '샘물반'] as const
export type AlbumCategory = (typeof ALBUM_CATEGORIES)[number]
