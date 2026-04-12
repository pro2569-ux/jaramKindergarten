export const PAGE_TYPES = {
  single: {
    label: '단일 페이지',
    description: '인사말, 교육이념처럼 하나의 글을 보여주는 페이지',
    icon: 'FileText',
    layoutOptions: {
      width: ['narrow', 'medium', 'wide'],
      showTOC: [true, false],
    },
    example: '원장 인사말, 교육이념, 교육환경',
  },
  list: {
    label: '리스트 게시판',
    description: '제목/날짜 중심의 게시글 목록',
    icon: 'List',
    layoutOptions: {
      columns: [1, 2],
      showThumbnail: [true, false],
      pageSize: [10, 15, 20],
    },
    example: '공지사항, 가정통신문',
  },
  gallery: {
    label: '갤러리',
    description: '사진 중심의 앨범 목록',
    icon: 'Image',
    layoutOptions: {
      columns: [2, 3, 4],
      aspectRatio: ['square', 'video', 'auto'],
      gap: ['sm', 'md', 'lg'],
    },
    example: '사진첩, 활동 앨범',
  },
  pdf_list: {
    label: 'PDF 목록',
    description: 'PDF 파일을 다운로드/미리보기 가능한 목록',
    icon: 'FileText',
    layoutOptions: {
      sortBy: ['date', 'name'],
      showPreview: [true, false],
    },
    example: '식단표, 모집요강, 가정통신문(PDF형)',
  },
  card_grid: {
    label: '카드 그리드',
    description: '이미지+텍스트 카드 형태 (교직원, 특색활동 등)',
    icon: 'Grid',
    layoutOptions: {
      columns: [2, 3, 4],
      cardStyle: ['bordered', 'shadow', 'flat'],
    },
    example: '교직원 소개, 특색활동, 시설 소개',
  },
  faq: {
    label: 'Q&A',
    description: '자주 묻는 질문 아코디언',
    icon: 'HelpCircle',
    layoutOptions: {
      expandStyle: ['single', 'multiple'],
    },
    example: '입학 FAQ, 자주 묻는 질문',
  },
  timeline: {
    label: '타임라인',
    description: '연혁이나 일정을 시간순으로 표시',
    icon: 'Clock',
    layoutOptions: {
      direction: ['vertical', 'horizontal'],
    },
    example: '어린이집 연혁, 연간 일정',
  },
} as const;

export type PageType = keyof typeof PAGE_TYPES;
