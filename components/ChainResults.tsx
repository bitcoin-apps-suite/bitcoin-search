'use client'

import React from 'react'

const WOC = 'https://api.whatsonchain.com/v1/bsv/main'

export type ChainResult =
  | { kind: 'tx'; txid: string; size: number; confirmations?: number; time?: number; outputs: number; totalSats: number }
  | { kind: 'block'; height: number; hash: string; txcount: number; time: number; size: number }
  | { kind: 'address'; address: string; confirmed: number; unconfirmed: number }
  | { kind: 'none'; message: string }

/** Look a query up on-chain (WhatsOnChain public API): txid, block height/hash, or address. */
export async function searchChain(raw: string): Promise<ChainResult> {
  const q = raw.trim()
  const get = async (path: string) => {
    const r = await fetch(`${WOC}${path}`)
    if (!r.ok) return null
    return r.json()
  }
  if (/^\d{1,7}$/.test(q)) {
    const b = await get(`/block/height/${q}`)
    if (b) return { kind: 'block', height: b.height, hash: b.hash, txcount: b.txcount, time: b.time, size: b.size }
  }
  if (/^[0-9a-fA-F]{64}$/.test(q)) {
    const t = await get(`/tx/hash/${q}`)
    if (t) {
      const sats = (t.vout ?? []).reduce((s: number, o: { value: number }) => s + Math.round((o.value ?? 0) * 1e8), 0)
      return { kind: 'tx', txid: t.txid, size: t.size, confirmations: t.confirmations, time: t.time, outputs: (t.vout ?? []).length, totalSats: sats }
    }
    const b = await get(`/block/hash/${q}`)
    if (b) return { kind: 'block', height: b.height, hash: b.hash, txcount: b.txcount, time: b.time, size: b.size }
  }
  if (/^[13][1-9A-HJ-NP-Za-km-z]{24,33}$/.test(q)) {
    const a = await get(`/address/${q}/balance`)
    if (a) return { kind: 'address', address: q, confirmed: a.confirmed, unconfirmed: a.unconfirmed }
  }
  return { kind: 'none', message: 'No match. Search by transaction ID, block height or hash, or address. Full-text search of on-chain content is not live yet.' }
}

const fmt = (sats: number) => `${(sats / 1e8).toLocaleString(undefined, { maximumFractionDigits: 8 })} BSV`
const when = (t?: number) => (t ? new Date(t * 1000).toLocaleString() : 'unconfirmed')

export default function ChainResults({ result }: { result: ChainResult }) {
  const box: React.CSSProperties = { textAlign: 'left', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 20, maxWidth: 896, margin: '0 auto 32px', wordBreak: 'break-all' }
  const link = (href: string, text: string) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>{text}</a>
  if (result.kind === 'none') return <div style={box}><p style={{ color: '#aaa' }}>{result.message}</p></div>
  if (result.kind === 'tx')
    return (
      <div style={box}>
        <div style={{ fontSize: 12, color: '#888' }}>Transaction</div>
        <div>{link(`https://whatsonchain.com/tx/${result.txid}`, result.txid)}</div>
        <p style={{ color: '#ccc', marginTop: 8 }}>{result.outputs} outputs · {fmt(result.totalSats)} out · {result.size} bytes · {when(result.time)}{result.confirmations ? ` · ${result.confirmations} confirmations` : ''}</p>
      </div>
    )
  if (result.kind === 'block')
    return (
      <div style={box}>
        <div style={{ fontSize: 12, color: '#888' }}>Block {result.height}</div>
        <div>{link(`https://whatsonchain.com/block/${result.hash}`, result.hash)}</div>
        <p style={{ color: '#ccc', marginTop: 8 }}>{result.txcount.toLocaleString()} transactions · {(result.size / 1e6).toFixed(2)} MB · {when(result.time)}</p>
      </div>
    )
  return (
    <div style={box}>
      <div style={{ fontSize: 12, color: '#888' }}>Address</div>
      <div>{link(`https://whatsonchain.com/address/${result.address}`, result.address)}</div>
      <p style={{ color: '#ccc', marginTop: 8 }}>{fmt(result.confirmed)} confirmed{result.unconfirmed ? ` · ${fmt(result.unconfirmed)} unconfirmed` : ''}</p>
    </div>
  )
}
