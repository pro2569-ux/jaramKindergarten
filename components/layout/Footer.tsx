import Link from 'next/link'
import { Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* 어린이집 정보 */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              자람동산어린이집
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              아이들이 건강하고 행복하게 자라는 곳
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span>서울특별시 강남구 테헤란로 123</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Phone className="h-4 w-4 text-primary" />
                <span>02-1234-5678</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Mail className="h-4 w-4 text-primary" />
                <span>info@jaramk.com</span>
              </div>
            </div>
          </div>

          {/* 빠른 링크 */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">빠른 링크</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about/greeting"
                  className="text-sm hover:text-primary transition-colors"
                >
                  원장 인사말
                </Link>
              </li>
              <li>
                <Link
                  href="/about/teachers"
                  className="text-sm hover:text-primary transition-colors"
                >
                  교원 및 반편성
                </Link>
              </li>
              <li>
                <Link
                  href="/board/notice"
                  className="text-sm hover:text-primary transition-colors"
                >
                  공지사항
                </Link>
              </li>
              <li>
                <Link
                  href="/board/album"
                  className="text-sm hover:text-primary transition-colors"
                >
                  앨범
                </Link>
              </li>
              <li>
                <Link
                  href="/community/inquiry"
                  className="text-sm hover:text-primary transition-colors"
                >
                  문의하기
                </Link>
              </li>
            </ul>
          </div>

          {/* 운영 시간 */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">운영 시간</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span>평일</span>
                <span className="text-gray-400">07:30 - 19:30</span>
              </li>
              <li className="flex justify-between">
                <span>토요일</span>
                <span className="text-gray-400">휴무</span>
              </li>
              <li className="flex justify-between">
                <span>일요일 및 공휴일</span>
                <span className="text-gray-400">휴무</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-800 pt-8">
          <p className="text-center text-sm text-gray-400">
            © {new Date().getFullYear()} 자람동산어린이집. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
