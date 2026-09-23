/**
 * 탐색용: 파일 URL 을 (규칙대로) GET 해서 상태/타입/파일명/크기만 출력한다. 본문은 raw 캐시에 저장됨.
 *   node scripts/migrate-jaramk/probe-file.ts <url> [<url> ...]
 */
import { fetchRaw, log, stats } from './lib/http.ts'

const urls = process.argv.slice(2).filter((a) => !a.startsWith('--'))

for (const url of urls) {
  const res = await fetchRaw(url)
  const head = res.body.subarray(0, 12)
  const magic = head.toString('hex')
  const kind = magic.startsWith('ffd8ff')
    ? 'jpeg'
    : magic.startsWith('89504e47')
      ? 'png'
      : magic.startsWith('47494638')
        ? 'gif'
        : magic.startsWith('d0cf11e0')
          ? 'ole(hwp/doc)'
          : magic.startsWith('504b0304')
            ? 'zip(hwpx/docx)'
            : magic.startsWith('25504446')
              ? 'pdf'
              : res.body.subarray(0, 200).toString('latin1').includes('<')
                ? 'html?'
                : 'unknown'
  console.log(
    `${res.status} ${String(res.bytes).padStart(9)}B ${kind.padEnd(14)} type=${res.contentType ?? '-'} cache=${res.fromCache} wall=${res.loginWall ?? '-'} final=${res.finalUrl}`
  )
  if (kind === 'html?') console.log('   body head:', res.body.subarray(0, 300).toString('utf8').replace(/\s+/g, ' '))
}
log(`요청 통계: network=${stats.network} cached=${stats.cached} failed=${stats.failed} loginWalls=${stats.loginWalls}`)
