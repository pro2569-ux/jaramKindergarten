import { redirect } from 'next/navigation'
import Sidebar from '@/components/admin/Sidebar'
import AccessDenied from '@/components/admin/AccessDenied'
import { getSessionRole } from '@/lib/auth/session-role'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 로그인 여부는 middleware 가 먼저 막지만, 관리자 role 은 여기서 확인한다.
  // 관리자가 아니면 사이드바·페이지를 렌더링하지 않고 안내 화면만 보여 준다 (데이터는 RLS 가 별도로 지킴).
  const session = await getSessionRole()
  if (!session) redirect('/login?redirectTo=%2Fadmin')
  if (session.role !== 'admin') return <AccessDenied email={session.email} />

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="py-8 px-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
