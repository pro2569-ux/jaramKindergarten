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
