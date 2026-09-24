export interface StaticMenuItem {
  name: string
  href: string
  /** 원본(jaramk.com)의 3단 메뉴 그룹 — 그룹 href 는 첫 하위 항목 */
  children?: StaticMenuItem[]
}

/** DB(menus) 조회 실패 시 폴백. DB 와 같은 순서·이름·경로로 유지한다 */
export const menuData: Record<string, { title: string; items: StaticMenuItem[] }> = {
  about: {
    title: '어린이집소개',
    items: [
      { name: '원장 인사말', href: '/about/greeting' },
      { name: '교육이념 및 원훈', href: '/about/philosophy' },
      { name: '교원 및 반편성', href: '/about/class' },
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
      {
        name: '자연주의 유아교육 프로그램',
        href: '/curriculum/nature/forest',
        children: [
          { name: '숲유치원 프로그램', href: '/curriculum/nature/forest' },
          { name: '꼬마 농부의 텃밭 활동', href: '/curriculum/nature/farm' },
          { name: '어린이 천조 휘트니스', href: '/curriculum/nature/fitness' },
          { name: '세시풍속 프로그램', href: '/curriculum/nature/seasonal-customs' },
          { name: '바깥호흡 산책 프로그램', href: '/curriculum/nature/outdoor-walk' },
        ],
      },
      {
        name: '특색프로그램',
        href: '/curriculum/featured/reading-coaching',
        children: [
          { name: '독서코칭 프로그램', href: '/curriculum/featured/reading-coaching' },
          { name: '우리 아이 행복 프로젝트', href: '/curriculum/featured/happy-project' },
          { name: '나사 크레카(융합창의교육)', href: '/curriculum/featured/nasa-creca' },
          { name: '창의 교구활동', href: '/curriculum/featured/creative-tools' },
          { name: '부모님이 들려 주시는 이야기 동화', href: '/curriculum/featured/parents-storytelling' },
        ],
      },
      { name: '특별활동', href: '/curriculum/special-activities' },
      { name: '행사 /체험활동', href: '/curriculum/events' },
    ],
  },
  admission: {
    title: '입학안내',
    items: [{ name: '신입원아적응지도 안내', href: '/admission/adaptation-guide' }],
  },
  // 원본(jaramk.com) 구조: 교육활동이야기 = 반별 앨범 게시판. DB(menus)와 같은 순서·이름.
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
