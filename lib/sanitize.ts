import DOMPurify from 'isomorphic-dompurify'

/**
 * 페이지 콘텐츠(HTML)를 렌더 전에 새니타이즈한다.
 * - 허용: 일반 텍스트/구조 태그 + 표 관련 태그 + style/href/src 등 안전 속성
 * - 제거: <script>, <iframe>, on* 이벤트 핸들러 등 위험 요소
 *
 * allowlist 방식이라 명시되지 않은 태그(iframe, object 등)는 자동 차단된다.
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

const ALLOWED_ATTR = [
  'style', 'class', 'id',
  'href', 'target', 'rel',
  'src', 'alt', 'title', 'width', 'height', 'loading',
  // 표 속성
  'colspan', 'rowspan', 'scope', 'align', 'valign',
]

export function sanitizeHtml(html: string): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // 위험 요소 명시적 차단 (allowlist로도 막히지만 의도를 분명히 함)
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  })
}
