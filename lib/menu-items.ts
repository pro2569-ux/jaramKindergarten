export const menuData = {
  about: {
    title: '어린이집소개',
    items: [
      { name: '원장 인사말', href: '/about/greeting' },
      { name: '교육이념 및 원훈', href: '/about/philosophy' },
      { name: '교원 및 반편성', href: '/about/teachers' },
      { name: '교육환경', href: '/about/environment' },
      { name: '시설현황', href: '/about/facilities' },
      { name: '오시는길', href: '/about/location' },
    ],
  },
  curriculum: {
    title: '교육프로그램',
    items: [
      { name: '표준보육과정', href: '/curriculum/standard' },
      { name: '누리과정', href: '/curriculum/nuri' },
      { name: '자연주의 유아교육', href: '/curriculum/nature' },
      { name: '숲유치원 프로그램', href: '/curriculum/forest' },
    ],
  },
  admission: {
    title: '입학안내',
    items: [
      { name: '입학안내', href: '/admission/guide' },
      { name: '모집요강', href: '/admission/recruitment' },
    ],
  },
  // 원본(jaramk.com) 구조: 교육활동이야기 = 반별 앨범 게시판. DB(menus)와 같은 순서·이름. DB 조회 실패 시 폴백.
  board: {
    title: '교육활동이야기',
    items: [
      { name: '자람반', href: '/board/jaram' },
      { name: '산새반', href: '/board/sansae' },
      { name: '라온반', href: '/board/raon' },
      { name: '맑은반', href: '/board/malgeun' },
      { name: '햇살반', href: '/board/haetsal' },
      { name: '샘물반', href: '/board/saemmul' },
      { name: '숲속반', href: '/board/supsok' },
      { name: '자람이야기', href: '/board/story' },
    ],
  },
  // 커뮤니티: 원본 항목(교육자료실) 뒤에 우리 사이트 전용 게시판
  community: {
    title: '커뮤니티',
    items: [
      { name: '교육자료실', href: '/community/archive' },
      { name: '공지사항', href: '/board/notice' },
      { name: '가정통신문', href: '/board/newsletter' },
      { name: '식단표', href: '/board/meal-plan' },
      { name: '문의하기', href: '/community/inquiry' },
    ],
  },
}
