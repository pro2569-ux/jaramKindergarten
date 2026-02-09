'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
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
    const url = window.prompt('이미지 URL을 입력하세요:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
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
