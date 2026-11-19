import { useRef, useState } from 'react'
import { FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLive } from '../../lib/live'
import { fmtDate } from '../../lib/bills'
import { useAuth } from '../auth/AuthProvider'
import { Avatar, Btn, Card, Chip, fail, input } from '../../components/ui'

const BUCKET = 'household-documents'
const CATS = ['Home', 'Bills & Receipts', 'Legal & IDs', 'Warranties', 'Other']
const MAX = 20 * 1024 * 1024
const icon = (m?: string) => m?.startsWith('image/') ? '🖼️' : m === 'application/pdf' ? '📕' : m?.includes('sheet') || m?.includes('excel') ? '📊' : '📄'
const size = (n?: number) => !n ? '' : n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`

export default function Documents() {
  const { household, session } = useAuth(); const hh = household!.id; const uid = session!.user.id
  const { rows } = useLive<any>('documents', hh, 'created_at')
  const [show, setShow] = useState(false); const [cat, setCat] = useState('all'); const [busy, setBusy] = useState(false)
  const [f, setF] = useState({ name: '', category: 'Home' }); const file = useRef<HTMLInputElement>(null)
  const shown = rows.filter(d => cat === 'all' || d.category === cat)

  async function upload(e: React.FormEvent) {
    e.preventDefault(); const fl = file.current?.files?.[0]; if (!fl) return alert('Choose a file first.')
    if (fl.size > MAX) return alert('Files must be 20 MB or smaller.')
    setBusy(true)
    const path = `${hh}/${crypto.randomUUID()}-${fl.name.replace(/[^\w.\- ]+/g, '_')}`
    const up = await supabase!.storage.from(BUCKET).upload(path, fl, { contentType: fl.type || undefined })
    if (fail(up.error)) return setBusy(false)
    const { error } = await supabase!.from('documents').insert({ household_id: hh, name: f.name.trim() || fl.name, category: f.category,
      storage_path: path, mime_type: fl.type || null, size_bytes: fl.size, uploaded_by: uid })
    if (error) await supabase!.storage.from(BUCKET).remove([path])
    setBusy(false)
    if (!fail(error)) { setF({ ...f, name: '' }); if (file.current) file.current.value = ''; setShow(false) }
  }
  async function open(d: any) {
    const w = window.open('about:blank', '_blank') // opened first so popup blockers allow it
    const { data, error } = await supabase!.storage.from(BUCKET).createSignedUrl(d.storage_path, 120)
    if (fail(error) || !data) return w?.close()
    if (w) w.location.href = data.signedUrl; else location.href = data.signedUrl
  }
  async function remove(d: any) {
    if (!confirm(`Delete "${d.name}" for both of you?`)) return
    const r = await supabase!.storage.from(BUCKET).remove([d.storage_path])
    if (!fail(r.error)) fail((await supabase!.from('documents').delete().eq('id', d.id)).error)
  }
  return <div className="flex flex-col gap-4">
    <div className="flex items-center justify-between"><h1 className="flex items-center gap-2 text-2xl font-extrabold"><FileText className="text-pink" /> Documents</h1><Btn onClick={() => setShow(s => !s)}>+ Upload</Btn></div>
    <div className="flex flex-wrap gap-2">{['all', ...CATS].map(c => <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-4 py-2 text-sm ${cat === c ? 'border-pink/40 bg-pink/35 font-bold' : 'border-line bg-surface text-muted'}`}>{c === 'all' ? 'All' : c}</button>)}</div>
    {show && <form onSubmit={upload} className="flex flex-wrap items-center gap-2 rounded-3xl border border-line bg-surface p-3">
      <input ref={file} type="file" required className="max-w-full text-sm" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.txt,.doc,.docx,.xls,.xlsx" />
      <input className={`${input} min-w-40 flex-1`} placeholder="Name (optional)" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
      <select className={`${input} w-44`} value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{CATS.map(c => <option key={c}>{c}</option>)}</select>
      <Btn type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</Btn>
      <div className="w-full text-xs text-muted">PDF, photos, Word or Excel up to 20 MB. Private to the two of you.</div></form>}
    <Card className="divide-y divide-line !p-0">{shown.length === 0 && <p className="p-4 text-sm text-muted">No documents yet. Lease, warranties, receipts, they all live here safely.</p>}
      {shown.map(d => <div key={d.id} className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => open(d)} className="flex flex-1 items-center gap-3 text-left" aria-label={`Open ${d.name}`}>
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-pink/10 text-2xl">{icon(d.mime_type)}</span>
          <div className="min-w-0 flex-1"><div className="truncate font-bold">{d.name}</div><div className="text-xs text-muted">{[size(d.size_bytes), fmtDate(String(d.created_at).slice(0, 10))].filter(Boolean).join(' · ')}</div></div></button>
        <Chip tone="lav">{d.category}</Chip><Avatar id={d.uploaded_by} size="h-8 w-8" />
        <button className="text-xs text-muted" aria-label="Delete" onClick={() => remove(d)}>✕</button></div>)}</Card>
  </div>
}
