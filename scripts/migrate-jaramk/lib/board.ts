/**
 * anyboard 게시판 목록/상세 URL 과 목록 파서.
 *
 * 스킨 두 종류:
 * - list  : table.AB_tb001 (번호/제목/작성자), 첨부는 행 안의 addBoxFile 레이어 + anyboard.fileDown('fileNum')
 * - photo : .AB_photoBox001 격자 (썸네일 _thum.jpg, 등록일/조회수 레이어), 16개/페이지
 * 제목 클릭은 anyboard.permitCheck('beforeview', '<num>') → 실제 이동은 ?Mode=view&boardID=..&num=..
 * 페이징: .AB_bottomPage 안의 a[href*=page=] (pageL 숫자, pageNext 다음 페이지)
 */
import * as cheerio from 'cheerio'

export type BoardSkin = 'list' | 'photo' | 'unknown'

export interface ListItem {
  num: number
  title: string
  ordinal: number | null // list 스킨의 표시 번호 (1페이지 첫 행 = 전체 글 수)
  isNotice: boolean
  date: string | null // photo 스킨: 등록일 (YYYY.MM.DD)
  views: number | null
  thumbUrl: string | null
  fileNums: string[] // 목록에서 보이는 첨부 fileNum (list 스킨)
  fileNames: string[]
}

export interface ListPage {
  boardID: string | null
  skin: BoardSkin
  page: number
  items: ListItem[]
  currentPage: number | null
  pageNumbers: number[] // 페이징 블록에 보이는 페이지 번호들
  maxPageSeen: number // href 의 page= 값 중 최대 (다음 블록 링크 포함)
}

export function listUrl(boardID: string, page: number): string {
  return `/main/sub.html?page=${page}&boardID=${boardID}&keyfield=&key=&bCate=`
}

export function viewUrl(boardID: string, num: number): string {
  return `/main/sub.html?boardID=${boardID}&num=${num}&Mode=view`
}

export function downloadUrl(boardID: string, fileNum: string): string {
  return `/core/anyboard/download.php?boardID=${boardID}&fileNum=${fileNum}`
}

const NUM_FROM_PERMIT = /permitCheck\(\s*['"]beforeview['"]\s*,\s*['"](\d+)['"]/

export function parseListPage(html: string, page: number): ListPage {
  const $ = cheerio.load(html)
  const boardID = /anyboard\s*=\s*new\s+anyboard\(\s*['"]([^'"]+)['"]/.exec(html)?.[1] ?? null
  const items: ListItem[] = []
  let skin: BoardSkin = 'unknown'

  if ($('table.AB_tb001').length) {
    skin = 'list'
    $('table.AB_tb001 tbody tr').each((_, tr) => {
      const row = $(tr)
      const numAttr = row.find('input[name="boardNum[]"]').attr('value')
      const onclick = row.find('a[onclick*="beforeview"]').attr('onclick') ?? ''
      const num = Number(numAttr ?? NUM_FROM_PERMIT.exec(onclick)?.[1])
      if (!Number.isFinite(num) || num <= 0) return
      const ordinalText = row.find('p.fontSize11').first().text().trim()
      const ordinal = /^\d+$/.test(ordinalText) ? Number(ordinalText) : null
      const isNotice = ordinal === null && (/공지/.test(row.text()) || row.find('img[src*="notice"]').length > 0)
      const title = row.find('.tdLeftSubject a').first().text().trim().replace(/\s+/g, ' ')
      const fileNums = row
        .find('a[href*="fileDown("]')
        .map((__, a) => /fileDown\(\s*['"](\d+)['"]/.exec($(a).attr('href') ?? '')?.[1] ?? '')
        .get()
        .filter(Boolean)
      const fileNames = row
        .find('.addFileSubject')
        .map((__, li) => $(li).text().replace(/ /g, ' ').trim())
        .get()
        .filter(Boolean)
      items.push({ num, title, ordinal, isNotice, date: null, views: null, thumbUrl: null, fileNums, fileNames })
    })
  } else if ($('.AB_photoBox001').length) {
    skin = 'photo'
    $('.AB_photoBox001').each((_, box) => {
      const el = $(box)
      const onclick = el.find('[onclick*="beforeview"]').first().attr('onclick') ?? ''
      const num = Number(NUM_FROM_PERMIT.exec(onclick)?.[1])
      if (!Number.isFinite(num) || num <= 0) return
      const title = el.find('.AB_photoText a').first().text().trim().replace(/\s+/g, ' ')
      const thumbUrl = el.find('.AB_photo001Img img').attr('src') ?? null
      const dataHtml = el.find('.AB_photoData').html() ?? ''
      const date = /등록일\s*<strong>([\d.]+)<\/strong>/.exec(dataHtml)?.[1] ?? null
      const viewsText = /조회수\s*<strong>(\d+)<\/strong>/.exec(dataHtml)?.[1]
      items.push({
        num,
        title,
        ordinal: null,
        isNotice: false,
        date,
        views: viewsText ? Number(viewsText) : null,
        thumbUrl,
        fileNums: [],
        fileNames: [],
      })
    })
  }

  const paging = $('.AB_bottomPage').first()
  const pageNumbers = new Set<number>()
  let maxPageSeen = page
  paging.find('a[href*="page="]').each((_, a) => {
    const href = $(a).attr('href') ?? ''
    const p = Number(/[?&]page=(\d+)/.exec(href)?.[1])
    if (!Number.isFinite(p)) return
    maxPageSeen = Math.max(maxPageSeen, p)
    if (/^\d+$/.test($(a).text().trim())) pageNumbers.add(p)
  })
  const currentText = paging.find('.AB_pageNumOn').first().text().trim()
  const currentPage = /^\d+$/.test(currentText) ? Number(currentText) : null
  if (currentPage !== null) pageNumbers.add(currentPage)

  return {
    boardID,
    skin,
    page,
    items,
    currentPage,
    pageNumbers: [...pageNumbers].sort((a, b) => a - b),
    maxPageSeen,
  }
}
