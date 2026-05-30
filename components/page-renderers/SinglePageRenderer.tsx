import type { Page } from '@/types/database'
import type { SingleLayoutConfig } from '@/lib/page-types'
import { cn } from '@/lib/utils'

const WIDTH_CLASS: Record<NonNullable<SingleLayoutConfig['width']>, string> = {
  narrow: 'max-w-2xl mx-auto',
  medium: 'max-w-3xl mx-auto',
  wide:   'max-w-none',
}

export default function SinglePageRenderer({ page }: { page: Page }) {
  const config = (page.layout_config ?? {}) as SingleLayoutConfig
  const widthClass = WIDTH_CLASS[config.width ?? 'wide']

  return (
    <div
      className={cn('prose prose-lg', widthClass)}
      dangerouslySetInnerHTML={{ __html: page.content ?? '' }}
    />
  )
}
