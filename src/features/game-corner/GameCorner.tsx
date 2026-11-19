import { useEffect, useState } from 'react'
import { Gamepad2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLive } from '../../lib/live'
import { useAuth } from '../auth/AuthProvider'
import { Btn, Card, Chip, fail, input } from '../../components/ui'

const COLORS: Record<string, string> = { 'wuthering-waves': 'bg-lav/40', 'genshin-impact': 'bg-sun/40', heartopia: 'bg-sage/40' }
const TYPES: Record<string, string> = { event: 'Event', livestream: 'Livestream', version: 'Version release', maintenance: 'Maintenance', banner: 'Banner', other: 'Other' }
const TZ = 'Asia/Manila'
const dt = (iso?: string | null) => iso ? new Date(iso).toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''
const day = (d?: string | null) => d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: d.length === 10 ? undefined : TZ }) : ''
const iso = (local: string) => local ? new Date(local + ':00+08:00').toISOString() : null // Manila is UTC+8, no DST
const safe = (u?: string | null) => !!u && /^https?:\/\//i.test(u)
const Src = ({ u, t = 'Source' }: { u?: string | null; t?: string }) => safe(u) ? <a href={u!} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-pink underline">{t} ↗</a> : null
const sel = 'rounded-full border px-4 py-2 text-sm '
const on = 'border-pink/40 bg-pink/35 font-bold', off = 'border-line bg-surface text-muted'

export default function GameCorner() {
  const { household, session } = useAuth(); const hh = household!.id; const uid = session!.user.id
  const [games, setGames] = useState<any[]>([])
  useEffect(() => { supabase!.from('games').select('*').eq('active', true).order('name').then(({ data }) => setGames(data ?? [])) }, [])
  const { rows: follows } = useLive<any>('household_followed_games', hh)
  const { rows: news } = useLive<any>('game_news', hh, 'created_at')
  const { rows: events } = useLive<any>('game_events', hh)
  const { rows: codes } = useLive<any>('game_codes', hh, 'created_at')
  const { rows: patches } = useLive<any>('game_patches', hh, 'created_at')
  const [tab, setTab] = useState('overview'); const [show, setShow] = useState(false); const [fg, setFg] = useState('all')
  const [ft, setFt] = useState('all'); const [ended, setEnded] = useState(false); const [old, setOld] = useState(false); const [copied, setCopied] = useState('')
  const [f, setF] = useState<any>({})
  const ids = new Set(follows.map(x => x.game_id)); const followed = games.filter(g => ids.has(g.id))
  const g = (id: string) => games.find(x => x.id === id)
  const GC = ({ id }: { id: string }) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COLORS[g(id)?.slug] ?? 'bg-pink/30'}`}>{g(id)?.name}</span>
  const mine = (r: any[]) => r.filter(x => ids.has(x.game_id) && (fg === 'all' || x.game_id === fg))
  const now = Date.now()
  const isOver = (e: any) => new Date(e.ends_at ?? e.starts_at).getTime() < now
  const evs = mine(events).filter(e => ft === 'all' || e.event_type === ft).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const upcoming = evs.filter(e => !isOver(e)); const past = evs.filter(isOver).reverse()
  const expired = (c: any) => c.status === 'expired' || (c.expires_at && new Date(c.expires_at).getTime() < now)
  const liveCodes = mine(codes).filter(c => !expired(c) && c.status !== 'invalid'); const oldCodes = mine(codes).filter(c => expired(c) || c.status === 'invalid')
  const set = (k: string, v: string) => setF((p: any) => ({ ...p, [k]: v }))

  async function toggleFollow(game: any) {
    const ex = follows.find(x => x.game_id === game.id)
    fail(ex ? (await supabase!.from('household_followed_games').delete().eq('id', ex.id)).error
      : (await supabase!.from('household_followed_games').insert({ household_id: hh, game_id: game.id, followed_by: uid })).error)
  }
  async function submit(e: React.FormEvent, table: string, row: Record<string, any>) {
    e.preventDefault(); if (!f.game) return alert('Pick a game first.')
    if (!fail((await supabase!.from(table).insert({ household_id: hh, game_id: f.game, created_by: uid, ...row })).error)) { setF({ game: f.game }); setShow(false) }
  }
  const del = async (table: string, id: string) => fail((await supabase!.from(table).delete().eq('id', id)).error)
  const copy = async (c: any) => { await navigator.clipboard.writeText(c.code); setCopied(c.id); setTimeout(() => setCopied(''), 1500) }
  const mark = async (c: any, status: string) => fail((await supabase!.from('game_codes').update({ status, last_checked_at: new Date().toISOString() }).eq('id', c.id)).error)
  const GameSel = () => <select className={`${input} w-44`} required value={f.game ?? ''} onChange={e => set('game', e.target.value)}><option value="">Game…</option>{followed.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
  const Filters = ({ types }: { types?: boolean }) => <div className="flex flex-wrap gap-2">
    <button className={sel + (fg === 'all' ? on : off)} onClick={() => setFg('all')}>All games</button>{followed.map(x => <button key={x.id} className={sel + (fg === x.id ? on : off)} onClick={() => setFg(x.id)}>{x.name}</button>)}
    {types && <select className={`${input} w-44`} value={ft} onChange={e => setFt(e.target.value)} aria-label="Event type"><option value="all">All types</option>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}</div>

  const newsList = (l: any[]) => l.length === 0 ? <p className="p-4 text-sm text-muted">No news yet. Add an official announcement with its link.</p> : l.map(n => <div key={n.id} className="px-4 py-3">
    <div className="flex items-center gap-2"><GC id={n.game_id} /><span className="text-xs text-muted">{n.source_name}{n.published_on && ` · ${day(n.published_on)}`}</span><button className="ml-auto text-xs text-muted" aria-label="Delete" onClick={() => del('game_news', n.id)}>✕</button></div>
    <div className="mt-1 font-bold">{safe(n.source_url) ? <a href={n.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{n.headline}</a> : n.headline}</div>
    {n.summary && <div className="text-sm text-muted">{n.summary}</div>}</div>)
  const evList = (l: any[]) => l.length === 0 ? <p className="p-4 text-sm text-muted">Nothing scheduled.</p> : l.map(e => <div key={e.id} className="flex items-start gap-3 px-4 py-3">
    <div className="flex-1"><div className="flex flex-wrap items-center gap-2"><GC id={e.game_id} /><Chip tone="lav">{TYPES[e.event_type]}</Chip>{!e.confirmed && <Chip tone="sun">Unconfirmed date</Chip>}</div>
      <div className="mt-1 font-bold">{e.title}</div><div className="text-xs text-muted">{dt(e.starts_at)}{e.ends_at && ` → ${dt(e.ends_at)}`} (PH time)</div>{e.description && <div className="text-sm text-muted">{e.description}</div>}<Src u={e.source_url} /></div>
    <button className="text-xs text-muted" aria-label="Delete" onClick={() => del('game_events', e.id)}>✕</button></div>)
  const codeRow = (c: any) => { const ex = expired(c); return <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><GC id={c.game_id} /><code className="rounded-lg bg-pink/15 px-2 py-0.5 font-bold">{c.code}</code>
      <Chip tone={ex || c.status === 'invalid' ? 'pink' : c.status === 'active' ? 'sage' : 'sun'}>{ex ? 'Expired' : c.status === 'invalid' ? 'Invalid' : c.status === 'active' ? `Verified ${day(c.last_checked_at)}` : 'Unverified'}</Chip></div>
      <div className="mt-1 text-sm">{c.reward_summary}</div><div className="text-xs text-muted">{c.expires_at ? `Expires ${dt(c.expires_at)} (PH time)` : 'Expiration unknown'}{c.restrictions && ` · ${c.restrictions}`} <Src u={c.source_url} /></div></div>
    {!ex && <Btn onClick={() => copy(c)}>{copied === c.id ? 'Copied ✓' : 'Copy'}</Btn>}
    {!ex && <select className={`${input} w-32 text-xs`} value="" onChange={e => e.target.value && mark(c, e.target.value)} aria-label="Mark code"><option value="">Mark…</option><option value="active">Works</option><option value="invalid">Doesn't work</option><option value="expired">Expired</option></select>}
    <button className="text-xs text-muted" aria-label="Delete" onClick={() => del('game_codes', c.id)}>✕</button></div> }
  const patchRow = (p: any) => <div key={p.id} className="px-4 py-3"><div className="flex items-center gap-2"><GC id={p.game_id} /><b>v{p.version}</b>{p.title && <span>· {p.title}</span>}<button className="ml-auto text-xs text-muted" aria-label="Delete" onClick={() => del('game_patches', p.id)}>✕</button></div>
    <div className="text-xs text-muted">{p.released_at && `Releases ${dt(p.released_at)}`}{p.maintenance_starts_at && ` · Maintenance ${dt(p.maintenance_starts_at)} → ${dt(p.maintenance_ends_at)}`} (PH time)</div>{p.summary && <div className="text-sm">{p.summary}</div>}<Src u={p.patch_notes_url} t="Official patch notes" /></div>

  const tabs = ['overview', 'news', 'events', 'codes', 'patches']
  const addable = tab !== 'overview' && followed.length > 0
  return <div className="flex flex-col gap-4">
    <div className="flex items-center justify-between"><h1 className="flex items-center gap-2 text-2xl font-extrabold"><Gamepad2 className="text-pink" /> Game Corner</h1>{addable && <Btn onClick={() => { setShow(s => !s); setF({}) }}>+ Add</Btn>}</div>
    <Card><div className="mb-2 text-sm font-bold">Games we follow</div><div className="flex flex-wrap gap-2">{games.map(x => <button key={x.id} onClick={() => toggleFollow(x)} className={sel + (ids.has(x.id) ? on : off)}>{ids.has(x.id) ? '✓ ' : '+ '}{x.name}</button>)}</div>
      <div className="mt-2 text-xs text-muted">Shared by both of you. Entries are added by hand with a source link, so nothing here is guessed. Times are Philippine time.</div></Card>
    {followed.length === 0 ? <Card><p className="text-sm text-muted">Follow a game above to get started.</p></Card> : <>
      <div className="flex flex-wrap gap-2">{tabs.map(t => <button key={t} onClick={() => { setTab(t); setShow(false) }} className={sel + 'capitalize ' + (tab === t ? on : off)}>{t}</button>)}</div>
      {tab !== 'overview' && <Filters types={tab === 'events'} />}
      {show && tab === 'news' && <form onSubmit={e => submit(e, 'game_news', { headline: f.headline, summary: f.summary || null, source_name: f.src, source_url: f.url, published_on: f.date || null })} className="flex flex-wrap gap-2 rounded-3xl border border-line bg-surface p-3"><GameSel />
        <input className={`${input} min-w-48 flex-1`} required placeholder="Headline" value={f.headline ?? ''} onChange={e => set('headline', e.target.value)} /><input className={`${input} w-44`} required placeholder="Source (e.g. Official site)" value={f.src ?? ''} onChange={e => set('src', e.target.value)} />
        <input className={`${input} w-full`} type="url" required placeholder="Link to the original (https://…)" value={f.url ?? ''} onChange={e => set('url', e.target.value)} /><input className={`${input} min-w-48 flex-1`} placeholder="Short summary in your own words" value={f.summary ?? ''} onChange={e => set('summary', e.target.value)} />
        <input className={`${input} w-40`} type="date" value={f.date ?? ''} onChange={e => set('date', e.target.value)} aria-label="Published" /><Btn type="submit">Save</Btn></form>}
      {show && tab === 'events' && <form onSubmit={e => submit(e, 'game_events', { title: f.title, event_type: f.type || 'event', starts_at: iso(f.start), ends_at: iso(f.end), confirmed: f.unconf !== '1', source_url: f.url || null, description: f.desc || null, last_verified_at: new Date().toISOString() })} className="flex flex-wrap items-end gap-2 rounded-3xl border border-line bg-surface p-3"><GameSel />
        <input className={`${input} min-w-48 flex-1`} required placeholder="Title" value={f.title ?? ''} onChange={e => set('title', e.target.value)} />
        <select className={`${input} w-44`} value={f.type ?? 'event'} onChange={e => set('type', e.target.value)}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <label className="text-xs text-muted">Starts (PH)<input className={input} type="datetime-local" required value={f.start ?? ''} onChange={e => set('start', e.target.value)} /></label>
        <label className="text-xs text-muted">Ends (PH)<input className={input} type="datetime-local" value={f.end ?? ''} onChange={e => set('end', e.target.value)} /></label>
        <label className="text-sm"><input type="checkbox" checked={f.unconf === '1'} onChange={e => set('unconf', e.target.checked ? '1' : '0')} /> Date not confirmed</label>
        <input className={`${input} w-full`} type="url" placeholder="Source link (https://…)" value={f.url ?? ''} onChange={e => set('url', e.target.value)} /><Btn type="submit">Save</Btn></form>}
      {show && tab === 'codes' && <form onSubmit={e => submit(e, 'game_codes', { code: f.code.trim(), reward_summary: f.reward || null, expires_at: iso(f.exp), restrictions: f.restr || null, source_url: f.url || null })} className="flex flex-wrap items-end gap-2 rounded-3xl border border-line bg-surface p-3"><GameSel />
        <input className={`${input} w-44`} required placeholder="Code" value={f.code ?? ''} onChange={e => set('code', e.target.value)} /><input className={`${input} min-w-48 flex-1`} placeholder="Reward" value={f.reward ?? ''} onChange={e => set('reward', e.target.value)} />
        <label className="text-xs text-muted">Expires (PH, if known)<input className={input} type="datetime-local" value={f.exp ?? ''} onChange={e => set('exp', e.target.value)} /></label>
        <input className={`${input} w-44`} placeholder="Server/platform limits" value={f.restr ?? ''} onChange={e => set('restr', e.target.value)} /><input className={`${input} w-full`} type="url" placeholder="Where you found it (https://…)" value={f.url ?? ''} onChange={e => set('url', e.target.value)} /><Btn type="submit">Save as unverified</Btn></form>}
      {show && tab === 'patches' && <form onSubmit={e => submit(e, 'game_patches', { version: f.ver.trim(), title: f.title || null, summary: f.sum || null, released_at: iso(f.rel), maintenance_starts_at: iso(f.ms), maintenance_ends_at: iso(f.me), patch_notes_url: f.url || null })} className="flex flex-wrap items-end gap-2 rounded-3xl border border-line bg-surface p-3"><GameSel />
        <input className={`${input} w-28`} required placeholder="Version" value={f.ver ?? ''} onChange={e => set('ver', e.target.value)} /><input className={`${input} min-w-48 flex-1`} placeholder="Title" value={f.title ?? ''} onChange={e => set('title', e.target.value)} />
        <label className="text-xs text-muted">Release (PH)<input className={input} type="datetime-local" value={f.rel ?? ''} onChange={e => set('rel', e.target.value)} /></label>
        <label className="text-xs text-muted">Maintenance start<input className={input} type="datetime-local" value={f.ms ?? ''} onChange={e => set('ms', e.target.value)} /></label>
        <label className="text-xs text-muted">Maintenance end<input className={input} type="datetime-local" value={f.me ?? ''} onChange={e => set('me', e.target.value)} /></label>
        <input className={`${input} w-full`} placeholder="Summary in your own words" value={f.sum ?? ''} onChange={e => set('sum', e.target.value)} /><input className={`${input} w-full`} type="url" placeholder="Official patch notes link (https://…)" value={f.url ?? ''} onChange={e => set('url', e.target.value)} /><Btn type="submit">Save</Btn></form>}
      {tab === 'overview' && <div className="grid gap-4 md:grid-cols-2">
        <Card className="!p-0"><div className="px-4 pt-3 font-bold">📰 Latest news</div><div className="divide-y divide-line">{newsList(mine(news).slice(0, 3))}</div></Card>
        <Card className="!p-0"><div className="px-4 pt-3 font-bold">📅 Coming up</div><div className="divide-y divide-line">{evList(upcoming.slice(0, 4))}</div></Card>
        <Card className="!p-0"><div className="px-4 pt-3 font-bold">🎁 Active codes</div><div className="divide-y divide-line">{liveCodes.length ? liveCodes.slice(0, 4).map(codeRow) : <p className="p-4 text-sm text-muted">No active codes.</p>}</div></Card>
        <Card className="!p-0"><div className="px-4 pt-3 font-bold">🛠️ Latest patches</div><div className="divide-y divide-line">{mine(patches).length ? mine(patches).slice(0, 3).map(patchRow) : <p className="p-4 text-sm text-muted">No patches logged.</p>}</div></Card></div>}
      {tab === 'news' && <Card className="divide-y divide-line !p-0">{newsList(mine(news))}</Card>}
      {tab === 'events' && <><Card className="divide-y divide-line !p-0">{evList(upcoming)}</Card>{past.length > 0 && <><button className="text-sm text-muted underline" onClick={() => setEnded(s => !s)}>{ended ? 'Hide' : 'Show'} ended ({past.length})</button>{ended && <Card className="divide-y divide-line !p-0 opacity-70">{evList(past)}</Card>}</>}</>}
      {tab === 'codes' && <><Card className="divide-y divide-line !p-0">{liveCodes.length ? liveCodes.map(codeRow) : <p className="p-4 text-sm text-muted">No active codes. Redeem them yourselves in the game, since I never claim a code works unless you've checked.</p>}</Card>
        {oldCodes.length > 0 && <><button className="text-sm text-muted underline" onClick={() => setOld(s => !s)}>{old ? 'Hide' : 'Show'} expired / invalid ({oldCodes.length})</button>{old && <Card className="divide-y divide-line !p-0 opacity-70">{oldCodes.map(codeRow)}</Card>}</>}</>}
      {tab === 'patches' && <Card className="divide-y divide-line !p-0">{mine(patches).length ? mine(patches).map(patchRow) : <p className="p-4 text-sm text-muted">No patches logged yet.</p>}</Card>}
    </>}
  </div>
}
