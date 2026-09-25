'use client'

import { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { createClient } from '@/lib/supabase/client'
import { STORAGE_BUCKET } from '@/lib/constants'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/** HTML 소스 모드 도움말: 본문 스타일(.content)에 정의된 공통 디자인 블록 (app/globals.css PR H 와 동일) */
const DESIGN_BLOCK_SNIPPETS: { name: string; desc: string; html: string }[] = [
  { name: '안내 상자 .callout', desc: '노란 배경 강조 문단', html: '<div class="callout"><p class="callout-title">제목</p><p>내용</p></div>' },
  { name: '카드 격자 .cards-3 + .card', desc: '모바일 1열 → 태블릿 2열 → PC 3열 (cards-2 / cards-4 도 가능)', html: '<div class="cards cards-3">\n  <div class="card"><span class="card-icon">🌳</span><h3>카드 제목</h3><p>설명</p></div>\n  <div class="card"><span class="card-icon">🎨</span><h3>카드 제목</h3><p>설명</p></div>\n</div>' },
  { name: '숫자 카드 .stats + .stat', desc: '큰 숫자 (모바일 2열 → PC 4열)', html: '<div class="stats">\n  <div class="stat"><span class="stat-icon">👩‍🏫</span><span class="stat-label">햇살반 교사</span><span class="stat-value">4<small>명</small></span></div>\n</div>' },
  { name: '배지 .badge', desc: '작은 알약 라벨 (badge-outline / badge-pink / badge-blue)', html: '<span class="badge">만2세</span> <span class="badge badge-blue">1:5</span>' },
  { name: '칩 .chips', desc: '짧은 항목 나열', html: '<ul class="chips"><li>보육실</li><li>강당</li><li>텃밭</li></ul>' },
  { name: '아이콘 목록 .icon-list', desc: '✓ 표시 목록 (cols-2 를 붙이면 2열)', html: '<ul class="icon-list cols-2"><li>항목 1</li><li>항목 2</li></ul>' },
  { name: '단계 .steps', desc: '번호 원 + 카드 (steps-row 를 붙이면 PC 에서 가로 배치)', html: '<ol class="steps steps-row"><li><span class="step-title">1단계 제목</span>설명</li><li><span class="step-title">2단계 제목</span>설명</li></ol>' },
  { name: '시간표 .timeline', desc: '하루 일과', html: '<ul class="timeline"><li><span class="time">~ 10:00</span><div class="desc">등원</div></li><li><span class="time">10:00~12:30</span><div class="desc">숲 활동</div></li></ul>' },
  { name: '조직도 .org', desc: '위 → 아래 간단 도식', html: '<div class="org"><span class="org-node top">원장</span><span class="org-line"></span><span class="org-node">원감</span><span class="org-line"></span><div class="org-row"><span class="org-node">햇살반 교사</span><span class="org-node">맑은반 교사</span></div></div>' },
  { name: '라벨-값 .kv', desc: '주소·연락처 등', html: '<div class="kv"><div class="kv-row"><span class="kv-key">주소</span><span class="kv-val">고양시 …</span></div></div>' },
  { name: '정돈된 표 .table-neat', desc: '첫 열 강조 + 줄무늬', html: '<table class="table-neat"><thead><tr><th>구분</th><th>내용</th></tr></thead><tbody><tr><td>항목</td><td>내용</td></tr></tbody></table>' },
  { name: '주석 .note', desc: '작은 회색 글', html: '<p class="note">☞ 원아의 흥미에 따라 변경 될 수 있습니다.</p>' },
  { name: '편지지 · 하단 풍경 .deco-scene', desc: '본문 맨 끝에 넣으면 카드 아래를 그림 풍경으로 채움. 테마: meadow(들판) letter(꽃·편지) house(집·놀이터) road(길·버스) books(책·연필·무지개) rainbow(무지개·바람개비) forest(나무·버섯) garden(텃밭) play(공·줄넘기) festival(연·복주머니) breeze(구름·바람·나비) village(작은 마을)', html: '<div class="deco-scene deco-scene--meadow" aria-hidden="true"></div>' },
  { name: '편지지 · 모서리 장식 .deco-corner', desc: '본문 맨 앞에 넣으면 오른쪽 위에 작은 그림. 종류: leaves flowers stars hearts butterfly clouds (다음 문단은 오른쪽을 비워 글을 가리지 않음)', html: '<div class="deco-corner deco-corner--flowers" aria-hidden="true"></div>' },
  { name: '편지지 · 제목 아이콘 h2.t-*', desc: '큰 제목 앞 노란 막대를 작은 그림으로. sprout leaf flower sun book pencil tree heart star house bus ball kite butterfly letter mushroom carrot cloud', html: '<h2 class="t-sprout">제목</h2>' },
  { name: '편지지 · 구분선 hr.deco-divider', desc: '문단 사이 그림 구분선. 종류: vine(덩굴) dots(색 점) clouds(구름) flowers(꽃)', html: '<hr class="deco-divider deco-divider--vine">' },
  { name: '버튼 링크 .btn', desc: '다운로드·바로가기 버튼 (btn-outline 은 테두리형). 파일은 주소 뒤에 ?download=파일명 을 붙이면 그 이름으로 내려받음', html: '<p><a class="btn" href="https://…/파일.hwp?download=입소신청서.hwp">📄 입소신청서 양식 다운로드</a></p>' },
]

export default function RichTextEditor({
  value,
  onChange,
  placeholder = '내용을 입력하세요...',
}: RichTextEditorProps) {
  const editor = useEditor({
    // SSR 시 즉시 렌더하면 hydration 불일치가 발생하므로 클라이언트 마운트 후 렌더
    immediatelyRender: false,
    // StarterKit 3 에 link 가 이미 포함돼 있어 따로 넣으면 중복 경고가 난다 → 옵션으로 설정
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Image,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class:
          'content min-h-[300px] p-4 focus:outline-none',
      },
    },
  })

  // 표·디자인 블록(class 가 붙은 div/span 등) TipTap 이 모르는 HTML 이 들어있으면 손실 방지를 위해 HTML 소스 모드로 시작
  const [mode, setMode] = useState<'wysiwyg' | 'html'>(() =>
    /<table|<div|<figure|class="/i.test(value || '') ? 'html' : 'wysiwyg'
  )
  const [showHelp, setShowHelp] = useState(false)

  const switchToWysiwyg = () => {
    if (
      !confirm(
        'WYSIWYG(편집기) 모드로 전환하면 표·카드·배지 같은 디자인 블록 등 편집기가 지원하지 않는 HTML이 제거될 수 있습니다.\n표와 디자인 블록은 "HTML 소스" 모드에서 편집하세요.\n계속하시겠습니까?'
      )
    ) {
      return
    }
    editor?.commands.setContent(value || '')
    setMode('wysiwyg')
  }

  const modeBar = (
    <div className="flex items-center gap-1 p-2 border-b bg-gray-100">
      <button
        type="button"
        onClick={switchToWysiwyg}
        className={cn(
          'px-3 py-1 text-sm rounded transition-colors',
          mode === 'wysiwyg' ? 'bg-white shadow font-medium' : 'text-gray-500 hover:bg-gray-200'
        )}
      >
        편집기
      </button>
      <button
        type="button"
        onClick={() => setMode('html')}
        className={cn(
          'px-3 py-1 text-sm rounded transition-colors',
          mode === 'html' ? 'bg-white shadow font-medium' : 'text-gray-500 hover:bg-gray-200'
        )}
      >
        HTML 소스
      </button>
    </div>
  )

  // HTML 소스 모드: raw HTML을 이스케이프 없이 그대로 content에 저장
  if (mode === 'html') {
    return (
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        {modeBar}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          className="w-full min-h-[300px] p-4 font-mono text-sm focus:outline-none resize-y"
        />
        <div className="px-4 py-2 text-xs text-gray-500 border-t bg-gray-50">
          <p>
            HTML을 직접 입력합니다. 표·카드·배지 등 디자인된 HTML을 붙여넣을 수 있습니다. (저장 시 보안 처리되어 안전하게 표시됩니다)
            {' '}
            <button type="button" className="underline text-primary-ink" onClick={() => setShowHelp((v) => !v)}>
              {showHelp ? '디자인 블록 도움말 닫기' : '디자인 블록 도움말 보기'}
            </button>
          </p>
          {showHelp && (
            <div className="mt-2 space-y-1.5 text-gray-600">
              <p>아래 클래스는 본문 스타일에 정의돼 있어 그대로 쓰면 사이트 톤으로 표시됩니다. 여러 개를 붙여넣어 조합하세요.</p>
              {DESIGN_BLOCK_SNIPPETS.map((s) => (
                <details key={s.name} className="rounded border bg-white px-2 py-1">
                  <summary className="cursor-pointer font-medium text-gray-700">{s.name} <span className="font-normal text-gray-400">— {s.desc}</span></summary>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-snug text-gray-700">{s.html}</pre>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!editor) {
    return null
  }

  const MenuButton = ({
    onClick,
    active,
    children,
  }: {
    onClick: () => void
    active?: boolean
    children: React.ReactNode
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'p-2 rounded hover:bg-gray-200 transition-colors',
        active && 'bg-gray-200'
      )}
    >
      {children}
    </button>
  )

  const addLink = () => {
    const url = window.prompt('URL을 입력하세요:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const addImage = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하여야 합니다.')
        return
      }

      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.')
        return
      }

      try {
        const supabase = createClient()
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
        const filePath = `editor/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(filePath)

        editor.chain().focus().setImage({ src: publicUrl }).run()
      } catch (error: unknown) {
        alert('이미지 업로드에 실패했습니다: ' + (error instanceof Error ? error.message : ''))
        console.error(error)
      }
    }
    input.click()
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {modeBar}
      {/* 툴바 */}
      <div className="flex items-center gap-1 p-2 border-b bg-gray-50">
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
        >
          <Bold className="w-5 h-5" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
        >
          <Italic className="w-5 h-5" />
        </MenuButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
        >
          <List className="w-5 h-5" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
        >
          <ListOrdered className="w-5 h-5" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
        >
          <Quote className="w-5 h-5" />
        </MenuButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <MenuButton onClick={addLink} active={editor.isActive('link')}>
          <LinkIcon className="w-5 h-5" />
        </MenuButton>

        <MenuButton onClick={addImage}>
          <ImageIcon className="w-5 h-5" />
        </MenuButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <MenuButton onClick={() => editor.chain().focus().undo().run()}>
          <Undo className="w-5 h-5" />
        </MenuButton>

        <MenuButton onClick={() => editor.chain().focus().redo().run()}>
          <Redo className="w-5 h-5" />
        </MenuButton>
      </div>

      {/* 에디터 */}
      <EditorContent editor={editor} />
    </div>
  )
}
