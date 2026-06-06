'use client'

import { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
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

export default function RichTextEditor({
  value,
  onChange,
  placeholder = '내용을 입력하세요...',
}: RichTextEditorProps) {
  const editor = useEditor({
    // SSR 시 즉시 렌더하면 hydration 불일치가 발생하므로 클라이언트 마운트 후 렌더
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Image,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[300px] p-4 focus:outline-none',
      },
    },
  })

  // 표 등 TipTap이 모르는 HTML이 들어있으면 손실 방지를 위해 HTML 소스 모드로 시작
  const [mode, setMode] = useState<'wysiwyg' | 'html'>(() =>
    /<table/i.test(value || '') ? 'html' : 'wysiwyg'
  )

  const switchToWysiwyg = () => {
    if (
      !confirm(
        'WYSIWYG(편집기) 모드로 전환하면 표 등 편집기가 지원하지 않는 HTML이 제거될 수 있습니다.\n표 HTML은 "HTML 소스" 모드에서 편집하세요.\n계속하시겠습니까?'
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
        <p className="px-4 py-2 text-xs text-gray-500 border-t bg-gray-50">
          HTML을 직접 입력합니다. 표 등 디자인된 HTML을 붙여넣을 수 있습니다. (저장 시 보안 처리되어 안전하게 표시됩니다)
        </p>
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
      } catch (error: any) {
        alert('이미지 업로드에 실패했습니다: ' + (error.message || ''))
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
