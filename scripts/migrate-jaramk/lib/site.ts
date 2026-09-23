/**
 * jaramk.com (키드팍 CMS, anyboard 모듈) 페이지 구조 파서.
 *
 * URL 패턴
 * - 대분류:        /main/sub.html?mstrCode=<n>
 * - 정적/게시판:   /main/sub.html?pageCode=<n>      (게시판이면 페이지 안에 anyboard('www<n>') 초기화)
 * - 게시글 상세:   /main/sub.html?boardID=www<n>&num=<글번호>&Mode=view
 * - 첨부/썸네일:   /user/saveDir/board/www<n>/<num>_<timestamp>_<idx>[_thum].<ext>
 * - 메뉴 라벨:     /core/fonts/text.html?...&text=<base64(UTF-8)>  (폰트 이미지)
 */
import * as cheerio from 'cheerio'
import type { CheerioAPI } from 'cheerio'
import { decodeFontImageLabel } from './http.ts'

export interface MenuNode {
  label: string
  pageCode: number | null
  mstrCode: number | null
  url: string
  children: MenuNode[]
}

export type PageType = 'static' | 'board' | 'login-section' | 'redirect' | 'missing' | 'unknown'

/** 정적 페이지 제작 방식: richtext = 에디터 HTML(#ContentBase), pagemaker = 절대좌표 이미지 조각(#pageMakerBaseLayer) */
export type StaticKind = 'richtext' | 'pagemaker' | 'mixed' | 'image-only' | 'unknown'

export interface PageInfo {
  pageCode: number
  url: string
  label: string | null // 메뉴/네비 상 라벨
  titleLabel: string | null // 페이지 상단 폰트이미지 제목
  breadcrumb: string[] // 예: ['어린이집소개', '인사말']
  type: PageType
  boardID: string | null
  boardMode: string | null // anyboard 두 번째 인자 ('' | 'view' 등)
  loginRequired: boolean
  loginMessage: string | null
  redirectTo: number | null // type=redirect 일 때 대상 pageCode
  charset: string
  bytes: number
  static?: {
    kind: StaticKind
    contentHtmlLength: number
    textLength: number
    imageCount: number
    externalImageUrls: string[]
    tableCount: number
    attachmentUrls: string[]
    pageMaker: {
      width: number | null
      height: number | null
      items: number
      imageItems: number
      textItems: number
      leftOffsets: number[] // 0 이 아닌 left 값들 (가로 배치 여부 판단용)
    } | null
  }
}

export function pageCodeOf(href: string): number | null {
  const m = /[?&]pageCode=(\d+)/.exec(href)
  return m?.[1] ? Number(m[1]) : null
}

export function mstrCodeOf(href: string): number | null {
  const m = /[?&]mstrCode=(\d+)/.exec(href)
  return m?.[1] ? Number(m[1]) : null
}

export function pageUrl(pageCode: number): string {
  return `/main/sub.html?pageCode=${pageCode}`
}

function labelOfAnchor($: CheerioAPI, a: cheerio.Cheerio<import('domhandler').Element>): string {
  const spanText = a.find('span').text().trim().replace(/\s+/g, ' ')
  if (spanText) return spanText
  const fromFont = a
    .find('img')
    .map((_, img) => decodeFontImageLabel($(img).attr('src') ?? '') ?? '')
    .get()
    .filter(Boolean)[0]
  if (fromFont) return fromFont
  return a.text().trim().replace(/\s+/g, ' ')
}

/**
 * 상단 메뉴(대분류 → 중분류 → 소분류) 트리 추출.
 * 구조: li > a.parent[mstrCode] + div > ul > li > a[pageCode](.parent 이면 div > ul > li > a[pageCode] 소분류)
 */
export function parseTopMenu(html: string): MenuNode[] {
  const $ = cheerio.load(html)
  const categories: MenuNode[] = []

  $('a.parent[href*="mstrCode="]').each((_, el) => {
    const a = $(el)
    const mstrCode = mstrCodeOf(a.attr('href') ?? '')
    const category: MenuNode = {
      label: labelOfAnchor($, a),
      pageCode: null,
      mstrCode,
      url: a.attr('href') ?? '',
      children: [],
    }
    const li = a.parent('li')
    li.children('div')
      .first()
      .children('ul')
      .children('li')
      .each((__, li2) => {
        const a2 = $(li2).children('a').first()
        const node: MenuNode = {
          label: labelOfAnchor($, a2),
          pageCode: pageCodeOf(a2.attr('href') ?? ''),
          mstrCode,
          url: a2.attr('href') ?? '',
          children: [],
        }
        $(li2)
          .children('div')
          .children('ul')
          .children('li')
          .each((___, li3) => {
            const a3 = $(li3).children('a').first()
            node.children.push({
              label: labelOfAnchor($, a3),
              pageCode: pageCodeOf(a3.attr('href') ?? ''),
              mstrCode,
              url: a3.attr('href') ?? '',
              children: [],
            })
          })
        category.children.push(node)
      })
    categories.push(category)
  })
  return categories
}

/** 두 메뉴 트리를 mstrCode/pageCode 기준으로 합친다 (숨은 대분류는 해당 섹션 페이지에서만 노출되므로) */
export function mergeMenuTrees(base: MenuNode[], extra: MenuNode[]): MenuNode[] {
  const byKey = (n: MenuNode) => `${n.mstrCode}:${n.pageCode}`
  const merged = base.map((n) => ({ ...n, children: [...n.children] }))
  for (const cat of extra) {
    const existing = merged.find((c) => c.mstrCode === cat.mstrCode)
    if (!existing) {
      merged.push(cat)
      continue
    }
    for (const child of cat.children) {
      if (!existing.children.some((c) => byKey(c) === byKey(child))) existing.children.push(child)
    }
  }
  return merged.sort((a, b) => (a.mstrCode ?? 0) - (b.mstrCode ?? 0))
}

/** 페이지 안의 모든 pageCode 링크 (라벨 포함) — 퀵링크·좌측메뉴 등 메뉴 트리 밖의 페이지 발견용 */
export function collectPageLinks(html: string): Map<number, string> {
  const $ = cheerio.load(html)
  const found = new Map<number, string>()
  $('a[href*="pageCode="]').each((_, el) => {
    const a = $(el)
    const code = pageCodeOf(a.attr('href') ?? '')
    if (code === null) return
    const label = labelOfAnchor($, a)
    if (!found.has(code) || (!found.get(code) && label)) found.set(code, label)
  })
  return found
}

const LOGIN_WALL_PATTERNS: Array<[RegExp, string]> = [
  [/window\.alert\(["']([^"']*권한이 없습니다[^"']*)["']\)/, 'permission-alert'],
  [/<iframe[^>]+src=["'][^"']*membership\/default\/loginPage\.html/i, 'login-iframe'],
  [/onload\s*=\s*function\s*\(\)\s*\{\s*openPage\.createPage\([^)]*membership\.html\?Mode=login/, 'login-popup-onload'],
]

/** 로그인 벽 판정: [메시지, 종류] 또는 null */
export function detectLoginWall(html: string): { message: string; kind: string } | null {
  for (const [re, kind] of LOGIN_WALL_PATTERNS) {
    const m = re.exec(html)
    if (m) return { message: m[1] ?? kind, kind }
  }
  return null
}

export function detectBoard(html: string): { boardID: string; mode: string } | null {
  const m = /anyboard\s*=\s*new\s+anyboard\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]\s*\)/.exec(html)
  return m?.[1] !== undefined ? { boardID: m[1], mode: m[2] ?? '' } : null
}

export function parseTitleNavi(html: string): { titleLabel: string | null; breadcrumb: string[] } {
  const $ = cheerio.load(html)
  const titleImg = $('.titleNavi .title img').attr('src')
  const titleLabel = titleImg ? decodeFontImageLabel(titleImg) : null
  const naviText = $('.titleNavi .navi li.text').text()
  const breadcrumb = naviText
    .split(/\s{2,}| /)
    .map((s) => s.trim())
    .filter(Boolean)
  return { titleLabel, breadcrumb }
}

/** 정적 페이지 본문 컨테이너 (#ContentBase 우선, 없으면 .contents) */
export function selectStaticContent($: CheerioAPI): cheerio.Cheerio<import('domhandler').Element> {
  const base = $('#ContentBase')
  return base.length ? base : $('.contents')
}

export function isSiteChromeAsset(src: string): boolean {
  return /\/core\/(?:design|fonts|module|script|anyboard|editor)\//.test(src)
}

function cssPx(style: string, prop: string): number | null {
  const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)px`, 'i').exec(style)
  return m?.[1] ? Number(m[1]) : null
}

export function analyzeStaticContent(html: string): NonNullable<PageInfo['static']> {
  const $ = cheerio.load(html)
  const content = selectStaticContent($)
  const imgs = content.find('img[src]').map((_, el) => $(el).attr('src') ?? '').get()
  const contentImgs = imgs.filter((src) => !isSiteChromeAsset(src))
  const attachments = content
    .find('a[href]')
    .map((_, el) => $(el).attr('href') ?? '')
    .get()
    .filter((href) => /saveDir|download|fileDown|\.(?:pdf|hwp|hwpx|docx?|xlsx?|pptx?|zip)(?:$|\?)/i.test(href))

  const richtext = $('#ContentBase').length > 0
  const pm = $('#pageMakerBaseLayer')
  let pageMaker: NonNullable<PageInfo['static']>['pageMaker'] = null
  if (pm.length) {
    const style = pm.attr('style') ?? ''
    let imageItems = 0
    let textItems = 0
    const leftOffsets = new Set<number>()
    pm.children().each((_, el) => {
      const c = $(el)
      if (c.find('img').length) imageItems += 1
      else if (c.text().trim()) textItems += 1
      const left = cssPx(c.attr('style') ?? '', 'left')
      if (left !== null && left !== 0) leftOffsets.add(left)
    })
    pageMaker = {
      width: cssPx(style, 'width'),
      height: cssPx(style, 'height'),
      items: pm.children().length,
      imageItems,
      textItems,
      leftOffsets: [...leftOffsets].sort((a, b) => a - b),
    }
  }
  const textLength = content.text().replace(/\s+/g, ' ').trim().length
  const kind: StaticKind =
    richtext && pageMaker
      ? 'mixed'
      : richtext
        ? 'richtext'
        : pageMaker
          ? 'pagemaker'
          : contentImgs.length > 0 && textLength === 0
            ? 'image-only' // 예: pageCode=2 교육이념/원훈 — 페이지 전체가 이미지 1장 (../content/sub0102.jpg)
            : 'unknown'

  return {
    kind,
    contentHtmlLength: (content.html() ?? '').length,
    textLength: content.text().replace(/\s+/g, ' ').trim().length,
    imageCount: contentImgs.length,
    externalImageUrls: contentImgs.filter((src) => /^https?:\/\//.test(src) && !/jaramk\.com/.test(src)),
    tableCount: content.find('table').length,
    attachmentUrls: attachments,
    pageMaker,
  }
}

export interface PageMakerItem {
  index: number
  left: number | null
  top: number | null
  width: number | null
  height: number | null
  zIndex: number | null
  imageSrc: string | null
  text: string | null
  html: string
}

export interface StaticExtract {
  kind: StaticKind
  /** 본문 컨테이너 innerHTML (richtext: #ContentBase, pagemaker: #pageMakerBaseLayer, image-only: .contents) */
  contentHtml: string
  text: string
  imageSrcs: string[] // 본문 안 이미지 (사이트 크롬 제외), 문서 순서, 중복 제거
  attachmentHrefs: string[]
  pageMaker: { width: number | null; height: number | null; items: PageMakerItem[] } | null
}

/** 정적 페이지 본문과 이미지 목록 추출 (Phase 1 수집용) */
export function extractStaticPage(html: string): StaticExtract {
  const $ = cheerio.load(html)
  const analysis = analyzeStaticContent(html)
  const richtext = $('#ContentBase')
  const pm = $('#pageMakerBaseLayer')
  const container = richtext.length ? richtext : pm.length ? pm : $('.contents')

  const seen = new Set<string>()
  const imageSrcs: string[] = []
  container.find('img[src]').each((_, el) => {
    const src = $(el).attr('src') ?? ''
    if (!src || isSiteChromeAsset(src) || seen.has(src)) return
    seen.add(src)
    imageSrcs.push(src)
  })

  let pageMaker: StaticExtract['pageMaker'] = null
  if (pm.length) {
    const style = pm.attr('style') ?? ''
    const items: PageMakerItem[] = []
    pm.children().each((i, el) => {
      const c = $(el)
      const st = c.attr('style') ?? ''
      const text = c.text().replace(/\s+/g, ' ').trim()
      items.push({
        index: i,
        left: cssPx(st, 'left'),
        top: cssPx(st, 'top'),
        width: cssPx(st, 'width'),
        height: cssPx(st, 'height'),
        zIndex: /z-index\s*:\s*(-?\d+)/.exec(st)?.[1] ? Number(/z-index\s*:\s*(-?\d+)/.exec(st)![1]) : null,
        imageSrc: c.find('img[src]').first().attr('src') ?? null,
        text: text || null,
        html: $.html(c),
      })
    })
    pageMaker = { width: cssPx(style, 'width'), height: cssPx(style, 'height'), items }
  }

  return {
    kind: analysis.kind,
    contentHtml: (container.html() ?? '').trim(),
    text: container.text().replace(/\s+/g, ' ').trim(),
    imageSrcs,
    attachmentHrefs: analysis.attachmentUrls,
    pageMaker,
  }
}

export function classifyPage(
  html: string
): Pick<PageInfo, 'type' | 'boardID' | 'boardMode' | 'loginRequired' | 'loginMessage' | 'redirectTo'> {
  const none = { boardID: null, boardMode: null, loginRequired: false, loginMessage: null, redirectTo: null }

  const refresh = /<meta[^>]+http-equiv=["']Refresh["'][^>]+URL=([^'">]+)/i.exec(html)
  if (refresh?.[1]) return { ...none, type: 'redirect', redirectTo: pageCodeOf(refresh[1]) }
  if (/페이지 정보가 없습니다|DB질의에 실패하였습니다/.test(html) && html.length < 500) return { ...none, type: 'missing' }

  const board = detectBoard(html)
  const wall = detectLoginWall(html)
  if (board) {
    return {
      ...none,
      type: 'board',
      boardID: board.boardID,
      boardMode: board.mode,
      loginRequired: wall !== null,
      loginMessage: wall?.message ?? null,
    }
  }
  if (wall) return { ...none, type: 'login-section', loginRequired: true, loginMessage: wall.message }

  const hasContent = /id=["']ContentBase["']|id=["']pageMakerBaseLayer["']|class=["']contents["']/.test(html)
  return { ...none, type: hasContent ? 'static' : 'unknown' }
}
