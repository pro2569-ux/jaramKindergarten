import sanitizeHtmlLib from 'sanitize-html'

/**
 * 페이지 콘텐츠(HTML)를 렌더 전에 새니타이즈한다.
 * sanitize-html(순수 JS, htmlparser2 기반 — jsdom 불필요)로 서버리스에서도 안전.
 *
 * - 허용: 일반 텍스트/구조 태그 + 표 관련 태그 + style/href/src 등 안전 속성
 * - 인라인 표 스타일(background, color, border 계열, padding, text-align, font 계열, width 등)은 보존
 * - 제거: <script>, <iframe>, <object>, <embed>, <form>, on* 이벤트 핸들러
 *
 * allowlist 방식이라 명시되지 않은 태그/속성은 자동 차단된다.
 */
const ALLOWED_TAGS = [
  // 구조/텍스트
  'div', 'span', 'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'a', 'img',
  'strong', 'b', 'em', 'i', 'u', 's', 'small', 'mark', 'sub', 'sup',
  'blockquote', 'pre', 'code',
  'figure', 'figcaption',
  // 표
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
]

// 모든 태그에 허용할 속성 (style 포함 — sanitize-html은 기본적으로 style을 막으므로 명시)
const ALLOWED_ATTR = [
  'style', 'class', 'id',
  'href', 'target', 'rel',
  'src', 'alt', 'title', 'width', 'height', 'loading',
  // 표 속성
  'colspan', 'rowspan', 'scope', 'align', 'valign',
]

// 인라인 style로 허용할 CSS 속성 (표 디자인에 쓰는 것들). 값은 자유 허용.
const ANY = [/.*/]
const ALLOWED_STYLE_PROPS = [
  'background', 'background-color', 'background-image',
  'color',
  'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-color', 'border-width', 'border-style', 'border-radius',
  'border-collapse', 'border-spacing',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'text-align', 'vertical-align',
  'font', 'font-size', 'font-weight', 'font-family', 'font-style',
  'width', 'height', 'max-width', 'min-width',
  'line-height', 'letter-spacing',
  'box-shadow', 'overflow', 'display',
]

const ALLOWED_STYLES_MAP: Record<string, RegExp[]> = {}
for (const prop of ALLOWED_STYLE_PROPS) {
  ALLOWED_STYLES_MAP[prop] = ANY
}

export function sanitizeHtml(html: string): string {
  if (!html) return ''
  return sanitizeHtmlLib(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { '*': ALLOWED_ATTR },
    allowedStyles: { '*': ALLOWED_STYLES_MAP },
    // href/src 안전 스킴만 허용 (javascript: 차단). sanitize-html 기본값과 동일하게 명시.
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    // script/style 등은 태그+내용 모두 제거 (sanitize-html 기본 nonTextTags 동작).
    disallowedTagsMode: 'discard',
  })
}
