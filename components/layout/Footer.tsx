import Link from 'next/link'
import { Mail, Phone, MapPin, Printer, Smartphone } from 'lucide-react'
import { fullAddress, getSiteSettings } from '@/lib/site-settings'

// 연락처는 site_settings(관리자 > 사이트 설정)에서 읽는다. 값이 비어 있으면 그 줄은 표시하지 않는다.
export default async function Footer() {
  const s = await getSiteSettings()
  const address = fullAddress(s)
  const contact = [
    { icon: MapPin, value: address, href: null as string | null, label: '주소' },
    { icon: Phone, value: s.phone, href: s.phone ? `tel:${s.phone.replace(/[^0-9+]/g, '')}` : null, label: '전화' },
    { icon: Smartphone, value: s.mobile, href: s.mobile ? `tel:${s.mobile.replace(/[^0-9+]/g, '')}` : null, label: '휴대전화' },
    { icon: Printer, value: s.fax, href: null, label: '팩스' },
    { icon: Mail, value: s.email, href: s.email ? `mailto:${s.email}` : null, label: '이메일' },
  ].filter((c) => c.value && c.value.trim())

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* 어린이집 정보 */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              {s.site_name || '자람동산어린이집'}
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              {s.site_description || '아이들이 건강하고 행복하게 자라는 곳'}
            </p>
            <div className="space-y-2">
              {contact.map((c) => (
                <div key={c.label} className="flex items-start space-x-2 text-sm">
                  <c.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="sr-only">{c.label}</span>
                  {c.href ? (
                    <a href={c.href} className="hover:text-white transition-colors">{c.value}</a>
                  ) : (
                    <span>{c.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 빠른 링크 */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">빠른 링크</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about/greeting" className="text-sm hover:text-primary transition-colors">
                  원장 인사말
                </Link>
              </li>
              <li>
                <Link href="/about/class" className="text-sm hover:text-primary transition-colors">
                  교원 및 반편성
                </Link>
              </li>
              <li>
                <Link href="/about/location" className="text-sm hover:text-primary transition-colors">
                  오시는길
                </Link>
              </li>
              <li>
                <Link href="/board/notice" className="text-sm hover:text-primary transition-colors">
                  공지사항
                </Link>
              </li>
              <li>
                <Link href="/board/album" className="text-sm hover:text-primary transition-colors">
                  앨범
                </Link>
              </li>
              <li>
                <Link href="/community/inquiry" className="text-sm hover:text-primary transition-colors">
                  문의하기
                </Link>
              </li>
            </ul>
          </div>

          {/* 운영 시간 */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">운영 시간</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>평일</span>
                <span>{s.business_hours ? s.business_hours.replace(/^평일\s*/, '') : '07:30 - 19:30'}</span>
              </div>
              <div className="flex justify-between">
                <span>토요일</span>
                <span>휴무</span>
              </div>
              <div className="flex justify-between">
                <span>일요일 및 공휴일</span>
                <span>휴무</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-800 pt-8">
          <div className="flex flex-col items-center justify-center gap-2 text-center text-sm text-gray-400 sm:flex-row sm:gap-4">
            <p>© {new Date().getFullYear()} {s.site_name || '자람동산어린이집'}. All rights reserved.</p>
            <Link href="/privacy" className="font-medium text-gray-300 hover:text-white transition-colors">
              개인정보처리방침
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
