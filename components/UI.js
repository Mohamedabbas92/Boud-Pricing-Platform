import { useState, useEffect, useRef } from 'react'

// ── STYLES ──────────────────────────────────
export const C = {
  card:  { background:'var(--s1)', border:'1px solid var(--bd)', borderRadius:11, overflow:'visible', marginBottom:14 },
  ch:    { padding:'12px 16px', borderBottom:'1px solid var(--bd)', background:'var(--s2)', display:'flex', alignItems:'center', justifyContent:'space-between', borderRadius:'11px 11px 0 0' },
  chL:   { display:'flex', alignItems:'center', gap:8 },
  cb:    { padding:16 },
  ff:    { display:'flex', flexDirection:'column', gap:4 },
  lbl:   { fontSize:11, fontWeight:600, color:'var(--t2)', textTransform:'uppercase', letterSpacing:'.04em' },
  fi:    { background:'var(--bg)', border:'1px solid var(--bd)', borderRadius:7, padding:'7px 10px', color:'var(--text)', fontSize:13, outline:'none', width:'100%' },
  btn:   (v='g') => ({
    display:'inline-flex', alignItems:'center', gap:5, padding:'6px 13px',
    borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', border:'none',
    whiteSpace:'nowrap', transition:'all .15s',
    ...(v==='p' ? { background:'var(--grad)', color:'#fff' } : {}),
    ...(v==='g' ? { background:'transparent', color:'var(--t2)', border:'1px solid var(--bd)' } : {}),
    ...(v==='success') ? { background:'rgba(34,197,94,.12)', color:'var(--green)', border:'1px solid rgba(34,197,94,.25)' } : {},
    ...(v==='danger')  ? { background:'rgba(239,68,68,.1)',  color:'var(--red)',   border:'1px solid rgba(239,68,68,.2)'  } : {},
    ...(v==='warn')    ? { background:'rgba(245,158,11,.1)', color:'var(--gold)',  border:'1px solid rgba(245,158,11,.25)'} : {},
  }),
  mono:  { fontFamily:"'JetBrains Mono',monospace" },
  tag:   (c) => ({
    display:'inline-block', fontSize:10, padding:'2px 8px', borderRadius:12, fontWeight:600,
    ...(c==='purple' ? { background:'rgba(91,63,160,.2)',   color:'#c4b5fd' } : {}),
    ...(c==='green'  ? { background:'rgba(34,197,94,.15)',  color:'#4ade80' } : {}),
    ...(c==='gold'   ? { background:'rgba(245,158,11,.15)', color:'#fbbf24' } : {}),
    ...(c==='blue'   ? { background:'rgba(96,165,250,.15)', color:'#93c5fd' } : {}),
    ...(c==='red'    ? { background:'rgba(239,68,68,.15)',  color:'#f87171' } : {}),
    ...(c==='teal'   ? { background:'rgba(20,184,166,.15)', color:'#2dd4bf' } : {}),
  }),
}

// ── TOAST ────────────────────────────────────
let _toastFn = null
export function setToastFn(fn) { _toastFn = fn }
export function toast(msg, type='') { _toastFn?.(msg, type) }

export function Toast() {
  const [t, setT] = useState(null)
  useEffect(() => {
    setToastFn((msg, type) => {
      setT({ msg, type })
      setTimeout(() => setT(null), 3000)
    })
  }, [])
  if (!t) return null
  return (
    <div style={{
      position:'fixed', bottom:22, left:'50%', transform:'translateX(-50%)',
      background:'var(--s2)', border:`1px solid ${t.type==='ok'?'var(--green)':t.type==='err'?'var(--red)':'var(--bd)'}`,
      borderRadius:9, padding:'10px 18px', fontSize:13, color:'var(--text)',
      boxShadow:'0 4px 20px rgba(0,0,0,.5)', zIndex:9999, whiteSpace:'nowrap',
    }}>{t.msg}</div>
  )
}

// ── MODAL ────────────────────────────────────
export function Modal({ title, children, footer, onClose }) {
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:200,
      display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(2px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'var(--s1)', border:'1px solid var(--bd)', borderRadius:14,
        width:580, maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto',
        boxShadow:'0 20px 60px rgba(0,0,0,.6)',
      }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--bd)', background:'var(--s2)', borderRadius:'14px 14px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:15, fontWeight:700 }}>{title}</span>
          <button style={C.btn('g')} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding:20 }}>{children}</div>
        {footer && <div style={{ padding:'12px 20px', borderTop:'1px solid var(--bd)', background:'var(--s2)', borderRadius:'0 0 14px 14px', display:'flex', justifyContent:'flex-end', gap:8 }}>{footer}</div>}
      </div>
    </div>
  )
}

// ── FIELD ────────────────────────────────────
export function Field({ label, children, span }) {
  return (
    <div style={{ ...C.ff, ...(span ? { gridColumn:`span ${span}` } : {}) }}>
      <label style={C.lbl}>{label}</label>
      {children}
    </div>
  )
}

// ── INPUT ────────────────────────────────────
export function Input({ ...props }) {
  return <input style={C.fi} {...props} />
}

export function Select({ options, ...props }) {
  return (
    <select style={{ ...C.fi, cursor:'pointer' }} {...props}>
      {options.map(o => typeof o === 'string'
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>
      )}
    </select>
  )
}

export function Textarea({ ...props }) {
  return <textarea style={{ ...C.fi, resize:'vertical', minHeight:75, lineHeight:1.5 }} {...props} />
}

// ── FILE DROP ────────────────────────────────
export function FileDrop({ onFiles, accept, label, sublabel }) {
  const [drag, setDrag] = useState(false)
  const ref = useRef()
  return (
    <div
      onClick={() => ref.current.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files) }}
      style={{
        border:`2px dashed ${drag ? 'var(--purple)' : 'var(--bd)'}`,
        background: drag ? 'rgba(91,63,160,.05)' : 'transparent',
        borderRadius:9, padding:20, textAlign:'center', cursor:'pointer',
        color: drag ? 'var(--text)' : 'var(--t2)', transition:'all .18s',
      }}>
      <div style={{ fontSize:26, marginBottom:6 }}>📂</div>
      <div style={{ fontSize:13, fontWeight:600 }}>{label || 'Drop file here or click to browse'}</div>
      {sublabel && <div style={{ fontSize:11, marginTop:3, color:'var(--t3)' }}>{sublabel}</div>}
      <input ref={ref} type="file" accept={accept} multiple style={{ display:'none' }}
        onChange={e => onFiles(e.target.files)} />
    </div>
  )
}

// ── TAG ──────────────────────────────────────
export function Tag({ color, children }) {
  return <span style={C.tag(color)}>{children}</span>
}
