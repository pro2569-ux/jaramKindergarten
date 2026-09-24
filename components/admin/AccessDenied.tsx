import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import Button from '@/components/ui/Button'

/** 로그인은 됐지만 관리자(profiles.role = 'admin')가 아닌 계정이 /admin 에 들어왔을 때 보여 주는 화면 */
export default function AccessDenied({ email }: { email: string | null }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-8 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">관리자만 사용할 수 있습니다</h1>
        <p className="text-gray-600 mb-6">
          {email ? `${email} 계정에는` : '이 계정에는'} 관리자 권한이 없습니다. 권한이 필요하면 원 관리자에게 문의해
          주세요.
        </p>
        <Link href="/">
          <Button variant="outline">홈으로</Button>
        </Link>
      </div>
    </div>
  )
}
