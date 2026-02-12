'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { X, Image as ImageIcon } from 'lucide-react'

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  onRemove?: () => void
  folder?: string
}

export default function ImageUpload({
  value,
  onChange,
  onRemove,
  folder = 'uploads',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다.')
      return
    }

    // 이미지 파일 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }

    setUploading(true)

    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      onChange(publicUrl)
    } catch (error: any) {
      console.error('Upload error:', error)
      alert('이미지 업로드에 실패했습니다: ' + (error.message || ''))
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    if (onRemove) {
      onRemove()
    } else {
      onChange('')
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        <div className="relative aspect-video w-full max-w-md rounded-lg overflow-hidden bg-gray-100">
          <Image
            src={value}
            alt="업로드된 이미지"
            fill
            className="object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative aspect-video w-full max-w-md rounded-lg border-2 border-dashed border-gray-300 hover:border-primary transition-colors cursor-pointer bg-gray-50 flex flex-col items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-600">업로드 중...</p>
            </>
          ) : (
            <>
              <ImageIcon className="w-12 h-12 text-gray-400" />
              <p className="text-sm text-gray-600">
                클릭하여 이미지 업로드
              </p>
              <p className="text-xs text-gray-500">
                최대 5MB, JPG, PNG, GIF
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
