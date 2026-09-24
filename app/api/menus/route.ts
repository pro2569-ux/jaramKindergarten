import { NextResponse } from 'next/server'
import { getMenuTree, hrefOf, type MenuNode } from '@/lib/site-nav'

export const revalidate = 60

interface ApiItem {
  name: string
  href: string
  children?: ApiItem[]
}

// 헤더용 메뉴 트리 (대분류 > 소분류/그룹 > 항목). 링크 페이지는 목적지로, 그룹·대분류는 첫 하위 항목으로 링크.
export async function GET() {
  try {
    const tree = await getMenuTree()
    const toItem = (n: MenuNode): ApiItem => ({
      name: n.label,
      href: hrefOf(n),
      ...(n.children.length > 0 ? { children: n.children.map(toItem) } : {}),
    })
    // 대분류는 children 을 항상 배열로 둔다 (헤더가 드롭다운 유무를 판단)
    const parents = tree.map((root) => ({ name: root.label, href: hrefOf(root), children: root.children.map(toItem) }))
    return NextResponse.json(parents)
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
