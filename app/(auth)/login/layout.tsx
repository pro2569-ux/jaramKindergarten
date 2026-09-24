import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// page.tsx 가 클라이언트 컴포넌트라 metadata 를 여기서 내보낸다 (사이트명은 루트 template 이 붙임)
export const metadata: Metadata = {
  title: '관리자 로그인',
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children
}
