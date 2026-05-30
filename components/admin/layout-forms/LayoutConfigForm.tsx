'use client'

import SingleLayoutForm from './SingleLayoutForm'
import ListLayoutForm from './ListLayoutForm'
import GalleryLayoutForm from './GalleryLayoutForm'
import PdfListLayoutForm from './PdfListLayoutForm'
import CardGridLayoutForm from './CardGridLayoutForm'
import FaqLayoutForm from './FaqLayoutForm'
import TimelineLayoutForm from './TimelineLayoutForm'

interface Props {
  pageType: string
  value: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

export default function LayoutConfigForm({ pageType, value, onChange }: Props) {
  const props = { value, onChange }
  switch (pageType) {
    case 'single':    return <SingleLayoutForm    {...props} />
    case 'list':      return <ListLayoutForm      {...props} />
    case 'gallery':   return <GalleryLayoutForm   {...props} />
    case 'pdf_list':  return <PdfListLayoutForm   {...props} />
    case 'card_grid': return <CardGridLayoutForm  {...props} />
    case 'faq':       return <FaqLayoutForm       {...props} />
    case 'timeline':  return <TimelineLayoutForm  {...props} />
    default:          return <SingleLayoutForm    {...props} />
  }
}
