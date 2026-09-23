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

export function contentUrl(boardID: string, num: number): string {
  return `/core/anyboard/content.html?Mode=view&boardID=${boardID}&num=${num}`
}

export const IMAGE_EXT = /\.(?:jpe?g|png|gif|bmp|webp)$/i

export interface Attachment {
  fileNum: string
  name: string
  isImage: boolean
}

export interface Comment {
  index: number
  text: string
  html: string
}

export interface ViewPage {
  title: string | null
  date: string | null // YYYY.MM.DD (앨범 스킨은 상세에도 등록일 표시, 목록 스킨은 없음)
  views: number | null
  attachmentCount: number | null // "첨부파일 N개" 표기
  attachments: Attachment[]
  comments: Comment[]
  contentFrameUrl: string | null
}

export interface ContentPage {
  bodyHtml: string
  bodyText: string
  imageSrcs: string[] // 본문 인라인 이미지 (문서 순서, 중복 제거)
}

/** 상세 페이지(메타 + 첨부 목록 + 댓글) 파싱. 본문은 iframe(content.html) 이라 여기 없음. */
export function parseViewPage(html: string): ViewPage {
  const $ = cheerio.load(html)
  const area = $('#AB_viewPrintArea')
  const title = area.find('thead th strong').first().text().trim() || null
  const headText = area.find('thead').text()
  const date = /등록일\s*(\d{4}\.\d{2}\.\d{2})/.exec(headText)?.[1] ?? null
  const viewsText = /조회수\s*(\d+)/.exec(headText)?.[1]
  const countText = /첨부파일\s*(\d+)개/.exec(area.text())?.[1]

  // 첨부 목록: 말단 <li> 가 "파일명 li" 와 "다운로드 링크 li" 로 번갈아 나온다 (바깥 li 는 ul 을 품으므로 건너뜀)
  const attachments: Attachment[] = []
  const fileList = $('#AB_viewFileList')
  let pendingName: string | null = null
  fileList.find('li').each((_, li) => {
    const el = $(li)
    if (el.find('ul, li').length > 0) return // 컨테이너 li
    const link = el.children('a[href*="fileDown("]').first()
    if (link.length) {
      const fileNum = /fileDown\(\s*['"](\d+)['"]/.exec(link.attr('href') ?? '')?.[1]
      if (fileNum) {
        const name = (pendingName ?? '').trim()
        attachments.push({ fileNum, name, isImage: IMAGE_EXT.test(name) })
      }
      pendingName = null
      return
    }
    if (el.find('img[src*="bul_addfile"]').length) {
      pendingName = el.text().replace(/ /g, ' ').trim()
    }
  })

  // 댓글: 첫 번째 .commentCover 의 목록만 (두 번째는 작성 폼 — 로그인 계정 이름이 있으므로 읽지 않음)
  const comments: Comment[] = []
  const cover = $('#AB_commentView .commentCover').first()
  cover
    .children('ul')
    .children('li')
    .each((i, li) => {
      const text = $(li).text().replace(/\s+/g, ' ').trim()
      if (!text) return
      comments.push({ index: i, text, html: $.html(li) })
    })

  const contentFrameUrl = $('iframe[id^="anyboardContentFrame_"]').attr('src') ?? null

  return {
    title,
    date,
    views: viewsText ? Number(viewsText) : null,
    attachmentCount: countText ? Number(countText) : null,
    attachments,
    comments,
    contentFrameUrl,
  }
}

/** 본문 iframe(content.html) 파싱 */
export function parseContentPage(html: string): ContentPage {
  const $ = cheerio.load(html)
  const body = $('#AB_viewContent')
  const seen = new Set<string>()
  const imageSrcs: string[] = []
  body.find('img[src]').each((_, img) => {
    const src = $(img).attr('src') ?? ''
    if (!src || /\/core\//.test(src) || seen.has(src)) return
    seen.add(src)
    imageSrcs.push(src)
  })
  return {
    bodyHtml: (body.html() ?? '').trim(),
    bodyText: body.text().replace(/\s+/g, ' ').trim(),
    imageSrcs,
  }
}

/** 저장 파일명의 Unix 타임스탬프 → YYYY.MM.DD (예: /user/saveDir/board/www35/1692_1466419810_0.jpg) */
export function dateFromStoredName(src: string): string | null {
  const m = /\/(\d+)_(\d{9,10})_\d+(?:_thum)?\.\w+(?:$|\?)/.exec(src)
  if (!m?.[2]) return null
  const d = new Date(Number(m[2]) * 1000)
  if (Number.isNaN(d.getTime())) return null
  const kst = new Date(d.getTime() + 9 * 3600 * 1000)
  return `${kst.getUTCFullYear()}.${String(kst.getUTCMonth() + 1).padStart(2, '0')}.${String(kst.getUTCDate()).padStart(2, '0')}`
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
