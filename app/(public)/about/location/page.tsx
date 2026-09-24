import PageShell from '@/components/layout/PageShell'
import SideNav from '@/components/layout/SideNav'
import { getSectionNav } from '@/lib/site-nav'
import { fullAddress, getSiteSettings } from '@/lib/site-settings'
import { sanitizeHtml } from '@/lib/sanitize'
import LocationMap from './LocationMap'

export const metadata = {
  title: '오시는길',
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const num = (v: string | undefined) => {
  const n = v ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}

/**
 * 오시는길 — 지도 + 주소·연락처 카드 + 교통편 카드. 값은 전부 site_settings(관리자 > 사이트 설정)에서 온다.
 * 카드는 본문 디자인 블록(.content 의 card / kv / entry)으로 그려 다른 정보 페이지와 톤을 맞춘다.
 */
export default async function LocationPage() {
  const [nav, s] = await Promise.all([getSectionNav('about'), getSiteSettings()])
  const name = s.site_name || '자람동산어린이집'
  const address = fullAddress(s)

  const kv = [
    ['주소', address],
    ['TEL', s.phone],
    ['PHONE', s.mobile],
    ['FAX', s.fax],
    ['이메일', s.email],
  ].filter(([, v]) => v && v.trim())
  const addressCard = `
<div class="card card-accent">
<span class="card-icon">📍</span>
<h3>${esc(name)}</h3>
<div class="kv">
${kv.map(([k, v]) => `<div class="kv-row"><span class="kv-key">${esc(k!)}</span><span class="kv-val">${esc(v!)}</span></div>`).join('\n')}
</div>
</div>`

  const transit: string[] = []
  if (s.transit_bus || s.transit_subway) {
    transit.push(`<div class="card"><span class="card-icon">🚌</span><h3>대중교통 이용시</h3>
${s.transit_bus ? `<div class="entry"><div class="entry-head">버스</div><p>${esc(s.transit_bus)}</p></div>` : ''}
${s.transit_subway ? `<div class="entry"><div class="entry-head">지하철</div><p>${esc(s.transit_subway)}</p></div>` : ''}
</div>`)
  }
  if (s.transit_car) {
    transit.push(`<div class="card"><span class="card-icon">🚗</span><h3>자가용 이용시</h3><p>${esc(s.transit_car)}</p></div>`)
  }
  const transitHtml = transit.length ? `<h2>오시는 길</h2><div class="cards cards-2">${transit.join('')}</div>` : ''

  return (
    <PageShell
      eyebrow={nav.label}
      title="오시는길"
      subtitle={`${name}을 찾아오시는 방법을 안내합니다`}
      sidebar={<SideNav title={nav.label} items={nav.items} />}
    >
      <div className="content">
        <h2>약도</h2>
      </div>
      <div className="mb-6">
        <LocationMap address={address || name} name={name} lat={num(s.kakao_map_lat)} lng={num(s.kakao_map_lng)} />
      </div>
      <div className="content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(`<h2>주소</h2>${addressCard}${transitHtml}`) }} />
    </PageShell>
  )
}
