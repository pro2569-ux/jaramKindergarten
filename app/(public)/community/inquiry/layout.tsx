import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// page.tsx 가 클라이언트 컴포넌트라 metadata 를 여기서 내보낸다 (사이트명은 루트 template 이 붙임)
export const metadata: Metadata = {
  title: '문의하기',
}

export default function InquiryLayout({ children }: { children: ReactNode }) {
  return children
}
