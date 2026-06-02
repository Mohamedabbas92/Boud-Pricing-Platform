import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { RC, OH_FIXED, PROP_STATUS, fmt, autoOHCat } from '../lib/data'
import { C, Toast, Modal, Field, Input, Select, Textarea, FileDrop, Tag, toast } from '../components/UI'

// ── PERSIST ──────────────────────────────────────────────────────
const STORAGE_KEY = 'boud_v4'
function loadState() {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
function saveState(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
}

// ── STATUS COLORS ─────────────────────────────────────────────────
const STATUS_TAG = { Prospect:'blue', Active:'green', 'On Hold':'gold', Completed:'teal', Cancelled:'red' }
const PROP_TAG   = { draft:'blue', sent:'purple', review:'gold', won:'green', lost:'red' }

export default function Home() {
  const [view,       setView]       = useState('projects')
  const [modal,      setModal]      = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [propFilter, setPropFilter] = useState('all')
  const autoTimer = useRef(null)

  // ── STATE ──
  const [projects,   setProjects]   = useState([])
  const [vendorsDB,  setVendorsDB]  = useState([])
  const [toolsDB,    setToolsDB]    = useState([])
  const [savedProps, setSavedProps] = useState([])
  const [roster,     setRoster]     = useState([])
  const [pTools,     setPTools]     = useState([])
  const [pVendors,   setPVendors]   = useState([])
  const [pName,      setPName]      = useState('')
  const [pClient,    setPClient]    = useState('')
  const [pOh,        setPOh]        = useState('0.25')
  const [pProfit,    setPProfit]    = useState(30)
  const [pRisk,      setPRisk]      = useState(10)
  const [pDiscount,  setPDiscount]  = useState(0)
  const [dragSrc,    setDragSrc]    = useState(null)
  const [rcSearch,   setRcSearch]   = useState({})
  const [openDrops,  setOpenDrops]  = useState({})
  const [vendSearch, setVendSearch] = useState('')
  const [toolSearch, setToolSearch] = useState('')
  const [apiKey,     setApiKey]     = useState('')
  const [rfpFile,    setRfpFile]    = useState(null)
  const [rfpAnalyzing, setRfpAnalyzing] = useState(false)
  const [rfpStatus,  setRfpStatus]  = useState(null)
  const [poqStatus,  setPoqStatus]  = useState(null)
  const [ohAutoTag,  setOhAutoTag]  = useState('')
  const [ohBase,     setOhBase]     = useState(544323)
  const [rcEditable, setRcEditable] = useState([])

  // ── LOAD ──
  useEffect(() => {
    const d = loadState()
    if (d.projects)   setProjects(d.projects)
    if (d.vendorsDB)  setVendorsDB(d.vendorsDB)
    if (d.toolsDB)    setToolsDB(d.toolsDB)
    if (d.savedProps) setSavedProps(d.savedProps)
    if (d.roster)     setRoster(d.roster)
    if (d.pTools)     setPTools(d.pTools)
    if (d.pVendors)   setPVendors(d.pVendors)
    if (d.pName)      setPName(d.pName)
    if (d.pClient)    setPClient(d.pClient)
    if (d.pOh)        setPOh(d.pOh)
    if (d.pProfit)    setPProfit(d.pProfit)
    if (d.pRisk)      setPRisk(d.pRisk)
    if (d.pDiscount)  setPDiscount(d.pDiscount)
    if (d.apiKey)     setApiKey(d.apiKey)
    if (d.ohBase)     setOhBase(d.ohBase)
    if (d.rcEditable && d.rcEditable.length) setRcEditable(d.rcEditable)
  }, [])

  // ── AUTO-SAVE ──
  const getFullState = useCallback(() => ({
    projects, vendorsDB, toolsDB, savedProps, roster, pTools, pVendors,
    pName, pClient, pOh, pProfit, pRisk, pDiscount, apiKey, ohBase, rcEditable,
  }), [projects, vendorsDB, toolsDB, savedProps, roster, pTools, pVendors,
       pName, pClient, pOh, pProfit, pRisk, pDiscount, apiKey, ohBase, rcEditable])

  useEffect(() => {
    clearTimeout(autoTimer.current)
    autoTimer.current = setTimeout(() => {
      saveState(getFullState())
      setSaving(false)
    }, 1000)
    setSaving(true)
    return () => clearTimeout(autoTimer.current)
  }, [getFullState])

  const saveNow = () => { saveState(getFullState()); toast('✅ Saved', 'ok') }

  // ── CALC ──
  const calc = useCallback(() => {
    const getRoleRate = (role, fallback) => {
      // This will be passed from parent — for now use roster.daily which is already updated
      return fallback
    }
    const team       = roster.reduce((s, r) => s + r.daily * r.days * (r.res || 1), 0)
    const toolsTotal = pTools.reduce((s, t) => s + (t.qty || 1) * t.cost, 0)
    const vendTotal  = pVendors.reduce((s, v) => s + v.cost, 0)
    const subtotal   = team + toolsTotal + vendTotal
    const cat        = autoOHCat(subtotal)
    const ohPct      = parseFloat(cat)
    const prPct      = pProfit / 100
    const riPct      = pRisk / 100
    const oh         = ohBase * ohPct
    const cost       = subtotal + oh
    const profit     = cost * prPct
    const risk       = cost * riPct
    const sub        = cost + profit + risk
    const discAmt    = sub * (pDiscount / 100)
    const subFinal   = sub - discAmt
    const vat        = subFinal * 0.15
    const total      = subFinal + vat
    // auto-set OH
    if (cat !== pOh) { setPOh(cat); setOhAutoTag(cat) }
    return { team, toolsTotal, vendTotal, oh, cost, profit, risk, sub, discAmt, subFinal, vat, total, ohPct, prPct, riPct }
  }, [roster, pTools, pVendors, pProfit, pRisk, pDiscount, pOh, ohBase])

  const nums = calc()

  // ── ROSTER ──
  const addRole = () => setRoster(r => [...r, { role: RC[0].role, dept: RC[0].dept, daily: RC[0].daily, days: 22, res: 1 }])
  const updRole = (i, f, v) => setRoster(r => r.map((x, j) => j !== i ? x : { ...x, [f]: v }))
  const selRole = (i, rc) => {
    const editedRate = rcEditable.find(e => e.role === rc.role)
    const daily = editedRate ? editedRate.daily : rc.daily
    setRoster(r => r.map((x, j) => j !== i ? x : { ...x, role: rc.role, dept: rc.dept, daily }))
    setOpenDrops(d => ({ ...d, [i]: false }))
    setRcSearch(s => ({ ...s, [i]: '' }))
    toast(`✓ ${rc.role}`, 'ok')
  }
  const moveRole = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= roster.length) return
    setRoster(r => { const n = [...r]; [n[i], n[j]] = [n[j], n[i]]; return n })
  }
  const delRole = (i) => setRoster(r => r.filter((_, j) => j !== i))

  // drag
  const onDragStart = (i) => setDragSrc(i)
  const onDrop = (i) => {
    if (dragSrc === null || dragSrc === i) return
    setRoster(r => {
      const n = [...r]; const tmp = n.splice(dragSrc, 1)[0]; n.splice(i, 0, tmp); return n
    })
    setDragSrc(null)
  }

  // ── TOOLS ──
  const [toolName, setToolName] = useState('')
  const [toolQty,  setToolQty]  = useState(1)
  const [toolCost, setToolCost] = useState('')
  const addTool = () => {
    if (!toolName.trim() || !toolCost) { toast('Fill tool fields', 'err'); return }
    setPTools(t => [...t, { name: toolName.trim(), qty: toolQty, cost: parseFloat(toolCost) }])
    setToolName(''); setToolQty(1); setToolCost('')
    toast(`"${toolName}" added`, 'ok')
  }

  // ── VENDORS ──
  const [vendName, setVendName] = useState('')
  const [vendCost, setVendCost] = useState('')
  const [vendType, setVendType] = useState('One-time')
  const addVendor = () => {
    if (!vendName.trim() || !vendCost) { toast('Fill vendor fields', 'err'); return }
    setPVendors(v => [...v, { name: vendName.trim(), cost: parseFloat(vendCost), type: vendType }])
    setVendName(''); setVendCost('')
    toast(`"${vendName}" added`, 'ok')
  }

  // ── AI RFP ──
  const analyzeRFP = async () => {
    if (!apiKey.trim()) { toast('Enter API key', 'err'); return }
    if (!rfpFile)       { toast('Upload RFP file', 'err'); return }
    setRfpAnalyzing(true)
    setRfpStatus({ type: 'blue', msg: '🤖 Reading document...' })
    try {
      const rcList = RC.map(r => `"${r.role}" (${r.dept}, SAR ${r.daily}/day)`).join('\n')
      const prompt = `You are a project pricing expert at BOUD AI, a Saudi Arabian tech consulting firm.
Analyze this RFP/contract and recommend the optimal team for pricing.

You MUST use ONLY these EXACT role names copied character by character:
${rcList}

CRITICAL: The role field in your response must match one of these names EXACTLY.

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "project_name": "string",
  "client": "string",
  "summary": "2-3 sentences",
  "duration_days": number,
  "team": [
    {"role": "EXACT name from list above", "dept": "dept", "daily": number, "days": number, "res": number, "reason": "string"}
  ],
  "tools_suggested": [{"name": "string", "monthly_cost": number}],
  "oh_category": "0.15 or 0.20 or 0.25 or 0.40",
  "risk_notes": "string"
}`

      const isPDF = rfpFile.type === 'application/pdf'
      const b64   = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload  = e => res(isPDF ? e.target.result.split(',')[1] : btoa(unescape(encodeURIComponent(e.target.result))))
        reader.onerror = rej
        if (isPDF) reader.readAsDataURL(rfpFile)
        else       reader.readAsText(rfpFile)
      })

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: [
              isPDF
                ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } }
                : { type: 'text', text: atob(b64) },
              { type: 'text', text: prompt }
            ]
          }]
        })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error?.message || 'API Error ' + response.status)
      }

      const data    = await response.json()
      const rawText = data.content.find(b => b.type === 'text')?.text || ''
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      const result  = JSON.parse(jsonMatch ? jsonMatch[0] : rawText)

      // Apply
      if (result.project_name?.trim()) setPName(result.project_name.trim())
      if (result.client?.trim())       setPClient(result.client.trim())
      if (result.oh_category)         setPOh(result.oh_category)

      const newRoster = (result.team || []).map(t => {
        const found = RC.find(r => r.role === t.role)
        return found ? { role: found.role, dept: found.dept, daily: found.daily, days: t.days || 22, res: t.res || 1, reason: t.reason || '' } : null
      }).filter(Boolean)
      if (newRoster.length) setRoster(newRoster)
      ;(result.tools_suggested || []).forEach(t => {
        if (t.name && t.monthly_cost > 0) setPTools(pt => [...pt, { name: t.name, qty: 1, cost: t.monthly_cost }])
      })

      setPoqStatus({ type: 'green', result })
      setModal(null)
      toast('✅ AI analysis complete!', 'ok')
    } catch (err) {
      setRfpStatus({ type: 'red', msg: `❌ ${err.message}` })
    }
    setRfpAnalyzing(false)
  }

  // ── GENERATE PROPOSAL ──
  const genProposal = () => {
    if (!pName.trim()) { toast('Enter project name', 'err'); return }
    const n = calc()
    const dateStr    = new Date().toLocaleDateString('en-SA', { year:'numeric', month:'long', day:'numeric' })
    const ohCatText  = { '0.15':'Small ≤250K', '0.20':'Medium 250K–1M', '0.25':'Large 1M–2M', '0.40':'Enterprise >2M' }[pOh] || ''
    const teamRows   = roster.map(r => `<tr><td>${r.role}</td><td>${r.dept}</td><td style="text-align:center">${r.res||1}</td><td style="text-align:center">${r.days}</td><td style="text-align:right">SAR ${fmt(r.daily)}</td><td style="text-align:right"><b>SAR ${fmt(r.daily*r.days*(r.res||1))}</b></td></tr>`).join('') || '<tr><td colspan="6" style="color:#999;font-style:italic">No team members</td></tr>'
    const toolRows   = pTools.map(t => `<tr><td>${t.name}</td><td style="text-align:center">${t.qty||1}</td><td style="text-align:right">SAR ${fmt(t.cost)}</td><td style="text-align:right"><b>SAR ${fmt((t.qty||1)*t.cost)}</b></td></tr>`).join('') || '<tr><td colspan="4" style="color:#999;font-style:italic">None</td></tr>'
    const vendRows   = pVendors.map(v => `<tr><td>${v.name}</td><td>${v.type}</td><td style="text-align:right"><b>SAR ${fmt(v.cost)}</b></td></tr>`).join('') || '<tr><td colspan="3" style="color:#999;font-style:italic">None</td></tr>'

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Proposal — ${pName}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',sans-serif;font-size:13px;color:#1a1f2e;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{max-width:820px;margin:0 auto;padding:44px 44px 80px}.header{display:flex;justify-content:space-between;align-items:center;padding-bottom:20px;border-bottom:2px solid #5b3fa0}.brand img{height:44px;object-fit:contain}.rtitle{text-align:right}.rtitle h2{font-size:16px;font-weight:700}.rtitle p{font-size:11px;color:#888;margin-top:3px}.hero{background:linear-gradient(135deg,#5b3fa0,#c44b1e);border-radius:12px;padding:18px 22px;margin:18px 0 24px;display:flex;justify-content:space-between;align-items:center}.hero .hl{font-size:13px;font-weight:700;color:#fff;text-transform:uppercase}.hero .hs{font-size:11px;color:rgba(255,255,255,.7);margin-top:3px}.hero-date{font-size:11px;color:rgba(255,255,255,.7);text-align:right}.hero-date span{display:block;font-size:13px;font-weight:600;color:#fff;margin-top:2px}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:26px}.meta-box{background:#f8f9fc;border:1px solid #e8ebf0;border-radius:9px;padding:11px 13px}.meta-box .lbl{font-size:9px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}.meta-box .val{font-size:14px;font-weight:700}.section{margin-bottom:24px}.sec-title{font-size:10px;font-weight:800;color:#fff;text-transform:uppercase;background:linear-gradient(90deg,#5b3fa0,#c44b1e);display:inline-block;padding:4px 12px;border-radius:5px;margin-bottom:12px}table{width:100%;border-collapse:collapse}th{text-align:left;font-size:10px;font-weight:700;color:#999;text-transform:uppercase;padding:8px 10px;background:#f8f9fc;border-bottom:2px solid #e8ebf0}td{padding:8px 10px;border-bottom:1px solid #f0f2f7;font-size:12.5px}tr:last-child td{border-bottom:none}tfoot td{font-weight:700;background:#f0f2f7;border-top:2px solid #e0e3ea}.summary{background:#f8f9fc;border:1px solid #e8ebf0;border-radius:11px;padding:16px 18px}.sum-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eff1f6;font-size:13px}.sum-row.hl{background:#f0f2f7;padding:8px 10px;border-radius:7px;margin:4px 0;border-bottom:none}.sum-lbl{color:#555}.sum-val{font-weight:600;font-family:'Courier New',monospace}.c-green{color:#16a34a}.c-gold{color:#d97706}.c-muted{color:#888}.c-red{color:#dc2626}.total-banner{background:linear-gradient(135deg,#3d2870,#c44b1e);border-radius:12px;overflow:hidden;margin-top:18px;position:relative}.total-banner::before{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;background:rgba(255,255,255,.4)}.total-inner{padding:22px 26px 22px 32px;display:flex;justify-content:space-between;align-items:center}.total-label{font-size:13px;color:rgba(255,255,255,.8)}.total-sub{font-size:11px;color:rgba(255,255,255,.6);margin-top:3px}.total-amount{font-size:28px;font-weight:900;color:#fff;font-family:'Courier New',monospace}.total-amount span{font-size:14px;font-weight:400;color:rgba(255,255,255,.6);margin-right:6px}.footer{margin-top:36px;border-top:2px solid #5b3fa0;padding-top:14px;display:flex;justify-content:space-between}.footer-txt{font-size:10px;color:#999}.watermark{text-align:center;font-size:9px;color:#ccc;margin-top:8px}.print-bar{position:fixed;bottom:0;left:0;right:0;padding:16px;text-align:center;z-index:99}@media print{.print-bar{display:none!important}.page{padding:22px 44px}@page{margin:10mm}}</style></head><body>
<div class="page">
  <div class="header"><div class="brand"><img src="/logo.png" alt="BOUD AI"></div><div class="rtitle"><h2>${pName}</h2><p>Commercial Proposal · ${dateStr}</p></div></div>
  <div class="hero"><div><div class="hl">Commercial Proposal</div><div class="hs">Confidential · For Client Use Only</div></div><div class="hero-date">Prepared On<span>${dateStr}</span></div></div>
  <div class="meta">
    <div class="meta-box"><div class="lbl">Client</div><div class="val">${pClient||'—'}</div></div>
    <div class="meta-box"><div class="lbl">OH Category</div><div class="val">${ohCatText}</div></div>
    <div class="meta-box"><div class="lbl">Profit Margin</div><div class="val">${pProfit}%</div></div>
    <div class="meta-box"><div class="lbl">Risk Buffer</div><div class="val">${pRisk}%</div></div>
  </div>
  <div class="section"><div class="sec-title">Team Roster</div><table><thead><tr><th>Role</th><th>Dept</th><th style="text-align:center">Res.</th><th style="text-align:center">Days</th><th style="text-align:right">Daily Rate</th><th style="text-align:right">Total</th></tr></thead><tbody>${teamRows}</tbody>${roster.length?`<tfoot><tr><td colspan="5">Team Total</td><td style="text-align:right">SAR ${fmt(n.team)}</td></tr></tfoot>`:''}</table></div>
  <div class="section"><div class="sec-title">Tools &amp; Licenses</div><table><thead><tr><th>Tool</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Cost</th><th style="text-align:right">Total</th></tr></thead><tbody>${toolRows}</tbody>${pTools.length?`<tfoot><tr><td colspan="3">Tools Total</td><td style="text-align:right">SAR ${fmt(n.toolsTotal)}</td></tr></tfoot>`:''}</table></div>
  <div class="section"><div class="sec-title">Vendor Expenses</div><table><thead><tr><th>Vendor</th><th>Type</th><th style="text-align:right">Amount</th></tr></thead><tbody>${vendRows}</tbody>${pVendors.length?`<tfoot><tr><td colspan="2">Vendors Total</td><td style="text-align:right">SAR ${fmt(n.vendTotal)}</td></tr></tfoot>`:''}</table></div>
  <div class="section"><div class="sec-title">Pricing Breakdown</div>
    <div class="summary">
      <div class="sum-row"><span class="sum-lbl">Team Cost</span><span class="sum-val">SAR ${fmt(n.team)}</span></div>
      <div class="sum-row"><span class="sum-lbl">Tools &amp; Licenses</span><span class="sum-val">SAR ${fmt(n.toolsTotal)}</span></div>
      <div class="sum-row"><span class="sum-lbl">Vendor Expenses</span><span class="sum-val">SAR ${fmt(n.vendTotal)}</span></div>
      <div class="sum-row"><span class="sum-lbl">Overhead (${Math.round(n.ohPct*100)}%)</span><span class="sum-val">SAR ${fmt(n.oh)}</span></div>
      <div class="sum-row hl"><span class="sum-lbl" style="font-weight:700">Total Cost</span><span class="sum-val" style="font-weight:700">SAR ${fmt(n.cost)}</span></div>
      <div class="sum-row"><span class="sum-lbl">Profit (${pProfit}%)</span><span class="sum-val c-green">SAR ${fmt(n.profit)}</span></div>
      <div class="sum-row"><span class="sum-lbl">Risk Buffer (${pRisk}%)</span><span class="sum-val">SAR ${fmt(n.risk)}</span></div>
      ${n.discAmt > 0 ? `<div class="sum-row"><span class="sum-lbl">Discount (${pDiscount}%)</span><span class="sum-val c-red">- SAR ${fmt(n.discAmt)}</span></div>` : ''}
      <div class="sum-row"><span class="sum-lbl">VAT (15%)</span><span class="sum-val c-muted">SAR ${fmt(n.vat)}</span></div>
      <div class="sum-row" style="border-bottom:none;padding-top:8px"><span class="sum-lbl">Contract Price (excl. VAT)</span><span class="sum-val c-gold">SAR ${fmt(n.subFinal)}</span></div>
    </div>
    <div class="total-banner"><div class="total-inner">
      <div><div class="total-label">Total Contract Price (incl. VAT 15%)</div><div class="total-sub">${pClient||'—'} · ${pName}</div></div>
      <div class="total-amount"><span>SAR</span>${fmt(n.total)}</div>
    </div></div>
  </div>
  <div class="footer"><span class="footer-txt">BOUD AI · Confidential · Commercial Proposal</span><span class="footer-txt">${pName} · ${dateStr}</span></div>
  <div class="watermark">This document is for internal use and client presentation only.</div>
</div>
<div class="print-bar"><button onclick="window.print()" style="background:linear-gradient(135deg,#5b3fa0,#c44b1e);color:#fff;border:none;border-radius:8px;padding:12px 36px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Print / Save as PDF</button></div>
</body></html>`

    setSavedProps(sp => [{
      id: Date.now(), projName: pName, client: pClient,
      total: Math.round(n.total), discount: pDiscount,
      status: 'draft', savedAt: new Date().toISOString()
    }, ...sp])

    const blob = new Blob([html], { type: 'text/html' })
    window.open(URL.createObjectURL(blob), '_blank')
    toast('✅ Proposal generated', 'ok')
  }

  // ── STYLES ──
  const S = {
    wrap:  { height:'100vh', display:'flex', flexDirection:'column' },
    top:   { height:52, background:'var(--s1)', borderBottom:'1px solid var(--bd)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 18px', flexShrink:0, zIndex:50 },
    body:  { flex:1, display:'flex', overflow:'hidden' },
    side:  { width:220, background:'var(--s1)', borderRight:'1px solid var(--bd)', display:'flex', flexDirection:'column', flexShrink:0 },
    main:  { flex:1, overflowY:'auto', padding:22 },
    navS:  { padding:'12px 10px 4px', fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.08em' },
    navI:  (active) => ({
      display:'flex', alignItems:'center', gap:9, padding:'9px 12px', margin:'1px 6px',
      borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500, border:'none',
      width:'calc(100% - 12px)', textAlign:'left', transition:'all .15s',
      background: active ? 'rgba(91,63,160,.18)' : 'transparent',
      color:      active ? '#c4b5fd' : 'var(--t2)',
      borderLeft: active ? '2px solid var(--purple)' : '2px solid transparent',
    }),
    divider: { height:1, background:'var(--bd)', margin:'6px 12px' },
    badge: { marginLeft:'auto', background:'var(--purple)', color:'#fff', fontSize:10, padding:'1px 6px', borderRadius:10, fontWeight:700 },
    ph:    { marginBottom:18 },
    phT:   { fontSize:20, fontWeight:800 },
    phS:   { fontSize:12, color:'var(--t2)', marginTop:3 },
    psRow: { display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--bd)', fontSize:13 },
    rr:    (dragging, over) => ({
      display:'grid', gridTemplateColumns:'22px 2fr 58px 65px 82px 88px 54px', gap:5,
      alignItems:'center', padding:'6px 8px', background:'var(--bg)',
      border:`1px solid ${over?'var(--purple)':dragging?'var(--purple)':'var(--bd)'}`,
      borderStyle: over ? 'dashed' : 'solid',
      borderRadius:8, marginBottom:5, opacity: dragging ? .4 : 1,
    }),
  }

  // ── RENDER ──
  const views = {
    projects: <ViewProjects projects={projects} setProjects={setProjects} setPName={setPName} setPClient={setPClient} setView={setView} toast={toast} S={S} />,
    pricing:  null,
    vendors:  <ViewVendorsDB vendorsDB={vendorsDB} setVendorsDB={setVendorsDB} vendSearch={vendSearch} setVendSearch={setVendSearch} toast={toast} S={S} />,
    tools:    <ViewToolsDB toolsDB={toolsDB} setToolsDB={setToolsDB} toolSearch={toolSearch} setToolSearch={setToolSearch} toast={toast} S={S} />,
    proposals:<ViewProposals savedProps={savedProps} setSavedProps={setSavedProps} propFilter={propFilter} setPropFilter={setPropFilter} />,
    dashboard:<ViewDashboard savedProps={savedProps} />,
    ratecard: <ViewRateCard rcEditable={rcEditable} setRcEditable={setRcEditable} />,
    settings: <ViewSettings ohBase={ohBase} setOhBase={setOhBase} rcEditable={rcEditable} setRcEditable={setRcEditable} saveNow={saveNow} />,
  }

  const navItems = [
    { id:'projects',  icon:'📁', label:'Projects',       badge: projects.length },
    { id:'pricing',   icon:'🧮', label:'Create Proposal' },
    null,
    { id:'vendors',   icon:'🏭', label:'Vendors',        badge: vendorsDB.length },
    { id:'tools',     icon:'🔧', label:'Tools',          badge: toolsDB.length },
    null,
    { id:'dashboard', icon:'📊', label:'Dashboard' },
    { id:'proposals', icon:'📄', label:'Proposals',      badge: savedProps.length },
    null,
    { id:'ratecard',  icon:'📋', label:'Rate Card' },
    { id:'settings',  icon:'⚙️', label:'Settings' },
  ]

  return (
    <div style={S.wrap}>
      {/* TOPBAR */}
      <div style={S.top}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src="/logo.png" alt="BOUD AI" style={{ height:30, objectFit:'contain' }} />
          <span style={{ fontSize:11, color:'var(--t2)' }}>AI Platform</span>
        </div>
        <div style={{ fontSize:11, color:'var(--t3)' }}>{saving ? '● saving…' : ''}</div>
        <div style={{ display:'flex', gap:7 }}>
          <button style={{ ...C.btn('success'), padding:'5px 12px', fontSize:12 }} onClick={saveNow}>💾 Save</button>
          <button style={{ ...C.btn('p'),       padding:'5px 12px', fontSize:12 }} onClick={genProposal}>📄 Proposal</button>
        </div>
      </div>

      <div style={S.body}>
        {/* SIDEBAR */}
        <div style={S.side}>
          <div style={{ overflowY:'auto', flex:1 }}>
            <div style={S.navS}>Main</div>
            {navItems.map((item, idx) => item === null
              ? <div key={idx} style={S.divider} />
              : <button key={item.id} style={S.navI(view === item.id)} onClick={() => setView(item.id)}>
                  <span style={{ fontSize:15, width:20 }}>{item.icon}</span>
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && <span style={S.badge}>{item.badge}</span>}
                </button>
            )}
          </div>
        </div>

        {/* MAIN */}
        <div style={S.main}>
          {view !== 'pricing' && views[view]}

          {/* PRICING VIEW */}
          {view === 'pricing' && (
            <div className="fade-in">
              <div style={S.ph}>
                <div style={S.phT}>🧮 Create Proposal</div>
                <div style={S.phS}>Build your team, tools, and generate a proposal</div>
              </div>

              <div style={{ background:'rgba(245,158,11,.07)', border:'1px solid rgba(245,158,11,.2)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--gold)', marginBottom:14 }}>
                💡 Monthly Overhead Base: <b>SAR {fmt(ohBase)}</b> · OH Category auto-detected from subtotal · VAT 15%
              </div>

              {/* PROJECT INFO */}
              <div style={C.card}>
                <div style={C.ch}>
                  <div style={C.chL}><span>📋</span><span style={{ fontWeight:600 }}>Project Info</span></div>
                  {ohAutoTag && <span style={{ ...C.tag('purple'), fontSize:11 }}>⚡ Auto OH: {ohAutoTag==='0.15'?'15%':ohAutoTag==='0.20'?'20%':ohAutoTag==='0.25'?'25%':'40%'}</span>}
                </div>
                <div style={C.cb}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr', gap:12 }}>
                    <div style={{ ...C.ff, gridColumn:'span 2' }}>
                      <label style={C.lbl}>Project Name</label>
                      <input style={C.fi} value={pName} onChange={e=>setPName(e.target.value)} placeholder="e.g. HACKIFY Platform v2" />
                    </div>
                    <div style={C.ff}>
                      <label style={C.lbl}>Client</label>
                      <input style={C.fi} value={pClient} onChange={e=>setPClient(e.target.value)} placeholder="Client name" />
                    </div>
                    <div style={C.ff}>
                      <label style={C.lbl}>OH Category <span style={{ color:'var(--t3)', fontSize:9 }}>(auto)</span></label>
                      <select style={{ ...C.fi, cursor:'pointer' }} value={pOh} onChange={e=>setPOh(e.target.value)}>
                        <option value="0.15">Small ≤250K · 15%</option>
                        <option value="0.20">Medium 250K–1M · 20%</option>
                        <option value="0.25">Large 1M–2M · 25%</option>
                        <option value="0.40">Enterprise &gt;2M · 40%</option>
                      </select>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      <div style={C.ff}><label style={C.lbl}>Profit %</label><input style={C.fi} type="number" value={pProfit} onChange={e=>setPProfit(+e.target.value)} min={0} max={100} /></div>
                      <div style={C.ff}><label style={C.lbl}>Risk %</label><input style={C.fi} type="number" value={pRisk} onChange={e=>setPRisk(+e.target.value)} min={0} max={100} /></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* TEAM ROSTER */}
              <div style={C.card}>
                <div style={C.ch}>
                  <div style={C.chL}><span>👥</span><div><div style={{ fontWeight:600 }}>Team Roster</div><div style={{ fontSize:11, color:'var(--t2)' }}>Search & reorder · drag ⠿ to sort</div></div></div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button style={{ ...C.btn('warn'), padding:'5px 10px', fontSize:12 }} onClick={() => { setRfpStatus(null); setModal('rfp') }}>🤖 AI Analyze RFP</button>
                    <button style={{ ...C.btn('p'), padding:'5px 10px', fontSize:12 }} onClick={addRole}>+ Add Role</button>
                  </div>
                </div>
                <div style={C.cb}>
                  {/* AI status */}
                  {poqStatus && (
                    <div style={{ background:`rgba(${poqStatus.type==='green'?'34,197,94':'96,165,250'},.07)`, border:`1px solid rgba(${poqStatus.type==='green'?'34,197,94':'96,165,250'},.2)`, borderRadius:8, padding:'10px 14px', fontSize:13, color:`var(--${poqStatus.type==='green'?'green':'blue'})`, marginBottom:12 }}>
                      <div style={{ fontWeight:700, marginBottom:4 }}>🤖 AI Analysis Complete</div>
                      <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.6 }}>{poqStatus.result?.summary}</div>
                      <div style={{ marginTop:6, display:'flex', gap:6, flexWrap:'wrap' }}>
                        <span style={C.tag('green')}>✅ {roster.length} roles</span>
                        {poqStatus.result?.duration_days && <span style={C.tag('blue')}>📅 ~{poqStatus.result.duration_days} days</span>}
                        {poqStatus.result?.tools_suggested?.length > 0 && <span style={C.tag('teal')}>🔧 {poqStatus.result.tools_suggested.length} tools</span>}
                        {poqStatus.result?.risk_notes && <span style={C.tag('gold')} title={poqStatus.result.risk_notes}>⚠️ Risk notes</span>}
                      </div>
                    </div>
                  )}
                  {/* Headers */}
                  <div style={{ display:'grid', gridTemplateColumns:'22px 2fr 58px 65px 82px 88px 54px', gap:5, padding:'0 8px', marginBottom:5 }}>
                    {['⠿','Role','Res.','Days','Rate/Day','Total',''].map((h,i)=>(
                      <div key={i} style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', textAlign:i>=2&&i<=5?'right':'left' }}>{h}</div>
                    ))}
                  </div>
                  {roster.length === 0 && <div style={{ textAlign:'center', padding:20, color:'var(--t2)', fontSize:13 }}>No roles — click "+ Add Role" or use 🤖 AI Analyze RFP</div>}
                  {roster.map((row, i) => {
                    const filtered = (rcSearch[i]||'').trim()
                      ? RC.filter(r => r.role.toLowerCase().includes((rcSearch[i]||'').toLowerCase()) || r.dept.toLowerCase().includes((rcSearch[i]||'').toLowerCase()))
                      : RC
                    return (
                      <div key={i} style={S.rr(dragSrc===i, false)}
                        draggable onDragStart={()=>onDragStart(i)} onDragOver={e=>e.preventDefault()} onDrop={()=>onDrop(i)} onDragEnd={()=>setDragSrc(null)}>
                        <div style={{ cursor:'grab', color:'var(--t3)', textAlign:'center', userSelect:'none' }}>⠿</div>
                        <div style={{ position:'relative' }}>
                          <div style={{ position:'relative' }}>
                            <span style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', fontSize:11, pointerEvents:'none' }}>🔍</span>
                            <input
                              style={{ ...C.fi, paddingLeft:28, fontSize:12, padding:'5px 8px 5px 28px' }}
                              placeholder={row.role}
                              value={rcSearch[i]||''}
                              onChange={e => setRcSearch(s=>({...s,[i]:e.target.value}))}
                              onFocus={() => setOpenDrops(d=>({...d,[i]:true}))}
                              onBlur={() => setTimeout(()=>setOpenDrops(d=>({...d,[i]:false})),200)}
                              autoComplete="off"
                            />
                          </div>
                          {openDrops[i] && (
                            <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'var(--s2)', border:'1px solid var(--purple)', borderRadius:8, maxHeight:200, overflowY:'auto', zIndex:9999, boxShadow:'0 8px 24px rgba(0,0,0,.5)', minWidth:320 }}>
                              {filtered.slice(0,40).map((r,j) => (
                                <div key={j} onMouseDown={()=>selRole(i,r)}
                                  style={{ padding:'7px 11px', fontSize:12, cursor:'pointer', borderBottom:'1px solid var(--bd)', display:'flex', justifyContent:'space-between' }}>
                                  <div><div style={{ fontWeight:500 }}>{r.role}</div><div style={{ fontSize:10, color:'var(--t2)' }}>{r.dept}</div></div>
                                  <div style={{ ...C.mono, fontSize:11, color:'var(--gold)' }}>SAR {fmt(r.daily)}/day</div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ fontSize:10, color:'var(--t2)', marginTop:2 }}>{row.dept}</div>
                        </div>
                        <input style={{ ...C.fi, textAlign:'right', fontSize:12, padding:'4px 6px' }} type="number" value={row.res||1} min={1} onChange={e=>updRole(i,'res',+e.target.value)} />
                        <input style={{ ...C.fi, textAlign:'right', fontSize:12, padding:'4px 6px' }} type="number" value={row.days} min={1} onChange={e=>updRole(i,'days',+e.target.value)} />
                        <div style={{ ...C.mono, textAlign:'right', fontSize:12, color:'var(--t2)' }}>{fmt(row.daily)}</div>
                        <div style={{ ...C.mono, textAlign:'right', fontSize:13, fontWeight:700, color:'var(--gold)' }}>{fmt(row.daily*row.days*(row.res||1))}</div>
                        <div style={{ display:'flex', gap:2 }}>
                          <button style={{ ...C.btn('g'), padding:'2px 5px', fontSize:10, border:'1px solid var(--bd)' }} onClick={()=>moveRole(i,-1)} disabled={i===0}>▲</button>
                          <button style={{ ...C.btn('g'), padding:'2px 5px', fontSize:10, border:'1px solid var(--bd)' }} onClick={()=>moveRole(i,1)} disabled={i===roster.length-1}>▼</button>
                          <button style={{ ...C.btn('danger'), padding:'2px 6px', fontSize:11 }} onClick={()=>delRole(i)}>✕</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* TOOLS */}
              <div style={C.card}>
                <div style={C.ch}>
                  <div style={C.chL}><span>🔧</span><span style={{ fontWeight:600 }}>Tools & Licenses</span></div>
                  <button style={{ ...C.btn('g'), padding:'4px 10px', fontSize:12 }} onClick={() => setModal('pickTools')}>📥 Pick from DB</button>
                </div>
                <div style={C.cb}>
                  <div style={{ display:'grid', gridTemplateColumns:'2fr 70px 85px 76px 32px', gap:5, padding:'0 8px', marginBottom:5 }}>
                    {['Tool / License','Qty','Unit Cost SAR','Total',''].map((h,i)=><div key={i} style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', textAlign:i>=1&&i<=3?'right':'left' }}>{h}</div>)}
                  </div>
                  {pTools.map((t,i)=>(
                    <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 70px 85px 76px 32px', gap:5, alignItems:'center', padding:'6px 8px', background:'var(--bg)', border:'1px solid var(--bd)', borderRadius:8, marginBottom:5 }}>
                      <input style={{ ...C.fi, fontSize:12, padding:'4px 7px' }} value={t.name} onChange={e=>setPTools(ts=>ts.map((x,j)=>j!==i?x:{...x,name:e.target.value}))} />
                      <input style={{ ...C.fi, textAlign:'right', fontSize:12, padding:'4px 6px', fontFamily:'JetBrains Mono,monospace' }} type="number" value={t.qty||1} min={1} onChange={e=>setPTools(ts=>ts.map((x,j)=>j!==i?x:{...x,qty:+e.target.value}))} />
                      <input style={{ ...C.fi, textAlign:'right', fontSize:12, padding:'4px 6px', fontFamily:'JetBrains Mono,monospace' }} type="number" value={t.cost} onChange={e=>setPTools(ts=>ts.map((x,j)=>j!==i?x:{...x,cost:+e.target.value}))} />
                      <div style={{ ...C.mono, textAlign:'right', fontSize:12, fontWeight:700, color:'var(--gold)' }}>SAR {fmt((t.qty||1)*t.cost)}</div>
                      <button style={{ ...C.btn('danger'), padding:'3px 6px', fontSize:11 }} onClick={()=>setPTools(ts=>ts.filter((_,j)=>j!==i))}>✕</button>
                    </div>
                  ))}
                  <div style={{ display:'grid', gridTemplateColumns:'2fr 70px 85px auto', gap:7, alignItems:'flex-end', marginTop:8 }}>
                    <div style={C.ff}><label style={C.lbl}>Tool Name</label><input style={C.fi} value={toolName} onChange={e=>setToolName(e.target.value)} placeholder="e.g. Jira, Figma" /></div>
                    <div style={C.ff}><label style={C.lbl}>Qty</label><input style={{ ...C.fi, textAlign:'right' }} type="number" value={toolQty} onChange={e=>setToolQty(+e.target.value)} min={1} /></div>
                    <div style={C.ff}><label style={C.lbl}>Unit Cost</label><input style={{ ...C.fi, textAlign:'right' }} type="number" value={toolCost} onChange={e=>setToolCost(e.target.value)} placeholder="0" /></div>
                    <button style={{ ...C.btn('g'), height:35 }} onClick={addTool}>+ Add</button>
                  </div>
                </div>
              </div>

              {/* VENDORS */}
              <div style={C.card}>
                <div style={C.ch}>
                  <div style={C.chL}><span>🏭</span><span style={{ fontWeight:600 }}>Vendor & Subcontractor Expenses</span></div>
                  <button style={{ ...C.btn('g'), padding:'4px 10px', fontSize:12 }} onClick={() => setModal('pickVendors')}>📥 Pick from DB</button>
                </div>
                <div style={C.cb}>
                  <div style={{ display:'grid', gridTemplateColumns:'2fr 85px 78px 78px 32px', gap:5, padding:'0 8px', marginBottom:5 }}>
                    {['Vendor / Service','Type','Amount SAR','Total',''].map((h,i)=><div key={i} style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', textAlign:i>=2&&i<=3?'right':'left' }}>{h}</div>)}
                  </div>
                  {pVendors.map((v,i)=>(
                    <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 85px 78px 78px 32px', gap:5, alignItems:'center', padding:'6px 8px', background:'var(--bg)', border:'1px solid var(--bd)', borderRadius:8, marginBottom:5 }}>
                      <input style={{ ...C.fi, fontSize:12, padding:'4px 7px' }} value={v.name} onChange={e=>setPVendors(vs=>vs.map((x,j)=>j!==i?x:{...x,name:e.target.value}))} />
                      <select style={{ ...C.fi, fontSize:12, padding:'4px 6px' }} value={v.type} onChange={e=>setPVendors(vs=>vs.map((x,j)=>j!==i?x:{...x,type:e.target.value}))}>
                        {['One-time','Monthly','Per Project'].map(o=><option key={o}>{o}</option>)}
                      </select>
                      <input style={{ ...C.fi, textAlign:'right', fontSize:12, padding:'4px 6px', fontFamily:'JetBrains Mono,monospace' }} type="number" value={v.cost} onChange={e=>setPVendors(vs=>vs.map((x,j)=>j!==i?x:{...x,cost:+e.target.value}))} />
                      <div style={{ ...C.mono, textAlign:'right', fontSize:12, fontWeight:700, color:'var(--gold)' }}>SAR {fmt(v.cost)}</div>
                      <button style={{ ...C.btn('danger'), padding:'3px 6px', fontSize:11 }} onClick={()=>setPVendors(vs=>vs.filter((_,j)=>j!==i))}>✕</button>
                    </div>
                  ))}
                  <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:7, alignItems:'flex-end', marginTop:8 }}>
                    <div style={C.ff}><label style={C.lbl}>Vendor / Service</label><input style={C.fi} value={vendName} onChange={e=>setVendName(e.target.value)} placeholder="e.g. Cloud hosting" /></div>
                    <div style={C.ff}><label style={C.lbl}>Amount SAR</label><input style={{ ...C.fi, textAlign:'right' }} type="number" value={vendCost} onChange={e=>setVendCost(e.target.value)} placeholder="0" /></div>
                    <div style={C.ff}><label style={C.lbl}>Type</label><select style={{ ...C.fi, cursor:'pointer' }} value={vendType} onChange={e=>setVendType(e.target.value)}>{['One-time','Monthly','Per Project'].map(o=><option key={o}>{o}</option>)}</select></div>
                    <button style={{ ...C.btn('g'), height:35 }} onClick={addVendor}>+ Add</button>
                  </div>
                </div>
              </div>

              {/* SUMMARY */}
              <div style={C.card}>
                <div style={C.ch}>
                  <div style={C.chL}><span>💰</span><span style={{ fontWeight:600 }}>Pricing Summary</span></div>
                  <button style={{ ...C.btn('p'), padding:'5px 12px', fontSize:12 }} onClick={genProposal}>📄 Generate Proposal</button>
                </div>
                <div style={C.cb}>
                  <div style={{ background:'var(--s2)', border:'1px solid var(--bd)', borderRadius:9, padding:14 }}>
                    {[
                      ['Team Cost', nums.team, ''],
                      ['Tools & Licenses', nums.toolsTotal, ''],
                      ['Vendor Expenses', nums.vendTotal, ''],
                      [`Overhead (${Math.round(nums.ohPct*100)}%)`, nums.oh, ''],
                      ['Total Cost', nums.cost, 'var(--blue)', true],
                      [`Profit Margin (${pProfit}%)`, nums.profit, 'var(--green)'],
                      [`Risk Buffer (${pRisk}%)`, nums.risk, ''],
                    ].map(([label,val,color,hl],i) => (
                      <div key={i} style={{ ...S.psRow, ...(hl?{background:'rgba(96,165,250,.07)',padding:'7px 8px',borderRadius:7,border:'none',margin:'4px 0'}:{}) }}>
                        <span style={{ color:color||'var(--t2)', fontWeight:hl?700:400 }}>{label}</span>
                        <span style={{ ...C.mono, color:color||'var(--text)' }}>SAR {fmt(val)}</span>
                      </div>
                    ))}
                    {/* DISCOUNT */}
                    <div style={{ ...S.psRow, background:'rgba(239,68,68,.05)', padding:'6px 8px', borderRadius:7, border:'none', margin:'4px 0', alignItems:'center' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ color:'var(--t2)' }}>Discount</span>
                        <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
                          <input type="number" value={pDiscount} min={0} max={100} step={1} onChange={e=>setPDiscount(+e.target.value)}
                            style={{ ...C.fi, width:65, textAlign:'right', padding:'2px 22px 2px 7px', fontFamily:'JetBrains Mono,monospace', fontSize:12, color:'var(--red)' }} />
                          <span style={{ position:'absolute', right:7, fontSize:11, color:'var(--red)', pointerEvents:'none' }}>%</span>
                        </div>
                      </div>
                      <span style={{ ...C.mono, color:'var(--red)' }}>- SAR {fmt(nums.discAmt)}</span>
                    </div>
                    <div style={S.psRow}><span style={{ color:'var(--t2)' }}>VAT (15%)</span><span style={{ ...C.mono, color:'var(--t2)' }}>SAR {fmt(nums.vat)}</span></div>
                    <div style={{ ...S.psRow, borderBottom:'none', paddingTop:8 }}><span style={{ color:'var(--t2)' }}>Contract Price (excl. VAT)</span><span style={{ ...C.mono, color:'var(--gold)' }}>SAR {fmt(nums.subFinal)}</span></div>
                  </div>
                  {/* TOTAL BANNER */}
                  <div style={{ background:'linear-gradient(135deg,#3d2870,#c44b1e)', borderRadius:10, overflow:'hidden', marginTop:14, position:'relative' }}>
                    <div style={{ position:'absolute', left:0, top:0, bottom:0, width:5, background:'rgba(255,255,255,.35)' }} />
                    <div style={{ padding:'18px 22px 18px 30px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontSize:12, color:'rgba(255,255,255,.75)', fontWeight:500 }}>Total Contract Price (incl. VAT 15%)</div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,.5)', marginTop:3 }}>{pClient||'—'} · {pName||'Untitled'}</div>
                        {pDiscount > 0 && <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', marginTop:2 }}>Discount {pDiscount}% applied</div>}
                      </div>
                      <div style={{ ...C.mono, fontSize:26, fontWeight:900, color:'#fff' }}>
                        <span style={{ fontSize:13, fontWeight:400, color:'rgba(255,255,255,.55)', marginRight:4 }}>SAR</span>
                        {fmt(nums.total)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {modal === 'rfp' && (
        <Modal title="🤖 AI Analyze RFP / Contract" onClose={() => setModal(null)}
          footer={<>
            <button style={C.btn('g')} onClick={() => setModal(null)}>Cancel</button>
            <button style={{ ...C.btn('warn'), opacity: rfpAnalyzing ? .6 : 1 }} onClick={analyzeRFP} disabled={rfpAnalyzing}>
              {rfpAnalyzing ? '⏳ Analyzing...' : '🤖 Analyze with AI'}
            </button>
          </>}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={C.ff}>
              <label style={C.lbl}>🔑 Anthropic API Key</label>
              <input style={C.fi} type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-ant-..." autoComplete="off" />
              <div style={{ fontSize:11, color:'var(--t2)', marginTop:3 }}>
                Saved locally. Get from <a href="https://console.anthropic.com" target="_blank" style={{ color:'#a78bfa' }}>console.anthropic.com</a>
              </div>
            </div>
            <div style={C.ff}>
              <label style={C.lbl}>📄 Upload RFP / Contract / SOW</label>
              <FileDrop onFiles={files => setRfpFile(files[0])} accept=".pdf,.docx,.txt,.csv" sublabel="PDF, DOCX, TXT supported" />
              {rfpFile && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 11px', background:'var(--bg)', border:'1px solid var(--green)', borderRadius:7, marginTop:6, fontSize:12 }}>
                  <span>📄 {rfpFile.name} ({(rfpFile.size/1024).toFixed(0)}KB)</span>
                  <span style={C.tag('green')}>Ready</span>
                </div>
              )}
            </div>
            <div style={C.ff}>
              <label style={C.lbl}>💬 Additional Context <span style={{ color:'var(--t3)', fontWeight:400 }}>(optional)</span></label>
              <textarea id="rfp-context" style={{ ...C.fi, minHeight:70, resize:'vertical', lineHeight:1.5 }} placeholder="e.g. 6-month government project, prefer senior roles, budget ~SAR 2M..." />
            </div>
            {rfpStatus && (
              <div style={{ background:`rgba(${rfpStatus.type==='red'?'239,68,68':'96,165,250'},.07)`, border:`1px solid rgba(${rfpStatus.type==='red'?'239,68,68':'96,165,250'},.2)`, borderRadius:8, padding:'10px 14px', fontSize:13, color:`var(--${rfpStatus.type==='red'?'red':'blue'})` }}>
                {rfpStatus.msg}
              </div>
            )}
          </div>
        </Modal>
      )}

      {modal === 'pickTools' && (
        <Modal title="📥 Pick from Tools DB" onClose={() => setModal(null)} footer={<button style={C.btn('g')} onClick={() => setModal(null)}>Done</button>}>
          {toolsDB.length === 0 ? <div style={{ color:'var(--t2)', textAlign:'center', padding:20 }}>No tools in DB yet — add from 🔧 Tools tab</div>
          : toolsDB.map(t => (
            <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 12px', background:'var(--bg)', border:'1px solid var(--bd)', borderRadius:8, marginBottom:6 }}>
              <div><div style={{ fontSize:13, fontWeight:600 }}>{t.name}</div><div style={{ fontSize:11, color:'var(--t2)' }}>{t.cat} {t.cost ? `· SAR ${fmt(t.cost)}` : ''}</div></div>
              <button style={{ ...C.btn('success'), padding:'4px 10px', fontSize:12 }} onClick={() => { setPTools(pt=>[...pt,{name:t.name,qty:1,cost:t.cost||0}]); toast(`✅ ${t.name} added`,'ok') }}>+ Add</button>
            </div>
          ))}
        </Modal>
      )}

      {modal === 'pickVendors' && (
        <Modal title="📥 Pick from Vendors DB" onClose={() => setModal(null)} footer={<button style={C.btn('g')} onClick={() => setModal(null)}>Done</button>}>
          {vendorsDB.length === 0 ? <div style={{ color:'var(--t2)', textAlign:'center', padding:20 }}>No vendors in DB yet — add from 🏭 Vendors tab</div>
          : vendorsDB.map(v => (
            <div key={v.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 12px', background:'var(--bg)', border:'1px solid var(--bd)', borderRadius:8, marginBottom:6 }}>
              <div><div style={{ fontSize:13, fontWeight:600 }}>{v.name}</div><div style={{ fontSize:11, color:'var(--t2)' }}>{v.cat} {v.rate ? `· SAR ${fmt(v.rate)}` : ''}</div></div>
              <button style={{ ...C.btn('success'), padding:'4px 10px', fontSize:12 }} onClick={() => { setPVendors(pv=>[...pv,{name:v.name,cost:v.rate||0,type:v.billing||'One-time'}]); toast(`✅ ${v.name} added`,'ok') }}>+ Add</button>
            </div>
          ))}
        </Modal>
      )}

      <Toast />
    </div>
  )
}

// ════════════════════════════════════════
// SUB-VIEWS
// ════════════════════════════════════════

function ViewProjects({ projects, setProjects, setPName, setPClient, setView }) {
  const [modal, setModal] = useState(null)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({})
  const [files, setFiles] = useState([])

  const STATUS_TAG = { Prospect:'blue', Active:'green', 'On Hold':'gold', Completed:'teal', Cancelled:'red' }

  const openNew = () => { setForm({ status:'Prospect', type:'Software Development' }); setFiles([]); setEditId(null); setModal('proj') }
  const openEdit = (p) => { setForm({...p}); setFiles(p.files||[]); setEditId(p.id); setModal('proj') }

  const handleFiles = (fileList) => {
    ;[...fileList].forEach(file => {
      const reader = new FileReader()
      reader.onload = e => setFiles(f => [...f, { name:file.name, type:file.type, size:file.size, data:e.target.result }])
      reader.readAsDataURL(file)
    })
  }

  const save = () => {
    if (!form.name?.trim() || !form.client?.trim()) { toast('Fill required fields', 'err'); return }
    const proj = { ...form, id: editId || Date.now().toString(), files, createdAt: editId ? (projects.find(p=>p.id===editId)?.createdAt || new Date().toISOString()) : new Date().toISOString() }
    if (editId) setProjects(ps => ps.map(p => p.id===editId ? proj : p))
    else        setProjects(ps => [proj, ...ps])
    setModal(null)
    toast(editId ? '✅ Updated' : '✅ Project Created', 'ok')
  }

  const del = (id) => { if (!confirm('Delete project?')) return; setProjects(ps=>ps.filter(p=>p.id!==id)); toast('Deleted') }

  const loadToPricing = (p) => { setPName(p.name); setPClient(p.client); setView('pricing'); toast(`✅ Loaded: ${p.name}`, 'ok') }

  const fileIcon = t => !t?'📄':t.includes('pdf')?'📕':t.includes('sheet')||t.includes('csv')?'📊':t.includes('word')?'📝':t.includes('image')?'🖼️':'📄'

  return (
    <div className="fade-in">
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:20, fontWeight:800 }}>📁 Projects</div>
        <div style={{ fontSize:12, color:'var(--t2)', marginTop:3 }}>Manage your client projects and documents</div>
        <div style={{ marginTop:12 }}><button style={C.btn('p')} onClick={openNew}>+ New Project</button></div>
      </div>

      {projects.length === 0 && <div style={{ textAlign:'center', padding:40, color:'var(--t2)' }}>No projects yet — click "+ New Project"</div>}

      {projects.map(p => (
        <div key={p.id} style={{ ...C.card, cursor:'default' }}>
          <div style={{ padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <div style={{ fontSize:14, fontWeight:700 }}>{p.name}</div>
                <Tag color={STATUS_TAG[p.status]||'blue'}>{p.status}</Tag>
                <Tag color="purple">{p.type}</Tag>
              </div>
              <div style={{ fontSize:12, color:'var(--t2)', marginTop:3 }}>👤 {p.client}{p.contact ? ' · '+p.contact : ''}</div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button style={{ ...C.btn('success'), padding:'4px 10px', fontSize:12 }} onClick={()=>loadToPricing(p)}>🧮 Price</button>
              <button style={{ ...C.btn('g'), padding:'4px 10px', fontSize:12 }} onClick={()=>openEdit(p)}>✏️</button>
              <button style={{ ...C.btn('danger'), padding:'4px 10px', fontSize:12 }} onClick={()=>del(p.id)}>🗑</button>
            </div>
          </div>
          <div style={{ padding:'0 16px 14px', borderTop:'1px solid var(--bd)' }}>
            <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginTop:10 }}>
              {p.email && <div style={{ fontSize:11, color:'var(--t2)' }}>📧 <span style={{ color:'var(--text)' }}>{p.email}</span></div>}
              {p.phone && <div style={{ fontSize:11, color:'var(--t2)' }}>📞 <span style={{ color:'var(--text)' }}>{p.phone}</span></div>}
              {p.start && <div style={{ fontSize:11, color:'var(--t2)' }}>📅 Start: <span style={{ color:'var(--text)' }}>{p.start}</span></div>}
              {p.end   && <div style={{ fontSize:11, color:'var(--t2)' }}>🏁 End: <span style={{ color:'var(--text)' }}>{p.end}</span></div>}
              {p.files?.length > 0 && <div style={{ fontSize:11, color:'var(--t2)' }}>📎 <span style={{ color:'var(--text)' }}>{p.files.length} file(s)</span></div>}
            </div>
            {p.desc && <div style={{ fontSize:12, color:'var(--t2)', marginTop:8, lineHeight:1.5 }}>{p.desc}</div>}
            {p.files?.length > 0 && (
              <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:6 }}>
                {p.files.map((f,i) => (
                  <a key={i} href={f.data} download={f.name} style={{ textDecoration:'none' }}>
                    <div style={{ background:'var(--bg)', border:'1px solid var(--bd)', borderRadius:6, padding:'4px 10px', fontSize:11, color:'var(--text)', display:'flex', alignItems:'center', gap:5 }}>
                      {fileIcon(f.type)} {f.name}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {modal === 'proj' && (
        <Modal title={editId ? 'Edit Project' : '+ New Project'} onClose={() => setModal(null)}
          footer={<>
            <button style={C.btn('g')} onClick={() => setModal(null)}>Cancel</button>
            <button style={C.btn('p')} onClick={save}>💾 {editId ? 'Update' : 'Create'} Project</button>
          </>}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[['name','Project Name *','e.g. HACKIFY Platform',2],['client','Client Name *','Client company'],['contact','Contact Person','Ahmed Al-Rashid'],['email','Email','email@client.com'],['phone','Phone','+966 5x xxx xxxx'],['start','Start Date','','date'],['end','End Date','','date']].map(([k,l,ph,t,span])=>(
              <div key={k} style={{ ...C.ff, ...(span===2?{gridColumn:'span 2'}:{}) }}>
                <label style={C.lbl}>{l}</label>
                <input style={C.fi} type={t||'text'} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={ph} />
              </div>
            ))}
            <div style={C.ff}>
              <label style={C.lbl}>Type</label>
              <select style={{ ...C.fi, cursor:'pointer' }} value={form.type||'Software Development'} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                {['Software Development','Consulting','UI/UX Design','Data & AI','Infrastructure','Other'].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div style={C.ff}>
              <label style={C.lbl}>Status</label>
              <select style={{ ...C.fi, cursor:'pointer' }} value={form.status||'Prospect'} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                {['Prospect','Active','On Hold','Completed','Cancelled'].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ ...C.ff, gridColumn:'span 2' }}>
              <label style={C.lbl}>Description</label>
              <textarea style={{ ...C.fi, resize:'vertical', minHeight:70, lineHeight:1.5 }} value={form.desc||''} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="Project scope and objectives..." />
            </div>
            <div style={{ ...C.ff, gridColumn:'span 2' }}>
              <label style={C.lbl}>📎 Documents (POQ, Contract, Proposal…)</label>
              <FileDrop onFiles={handleFiles} accept=".pdf,.docx,.xlsx,.png,.jpg,.csv,.txt" sublabel="PDF, DOCX, XLSX, images supported" />
              <div style={{ marginTop:6 }}>
                {files.map((f,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px', background:'var(--bg)', border:'1px solid var(--bd)', borderRadius:7, marginBottom:4, fontSize:12 }}>
                    <span>📄 {f.name} <span style={{ color:'var(--t3)', fontSize:10 }}>({(f.size/1024).toFixed(0)}KB)</span></span>
                    <button style={{ ...C.btn('danger'), padding:'2px 7px', fontSize:11 }} onClick={() => setFiles(fs=>fs.filter((_,j)=>j!==i))}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function ViewVendorsDB({ vendorsDB, setVendorsDB, vendSearch, setVendSearch }) {
  const [modal, setModal] = useState(null)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({})

  const STATUS_TAG = { Active:'green', Preferred:'purple', 'On Hold':'gold', Inactive:'red' }
  const filtered = vendorsDB.filter(v => !vendSearch || v.name.toLowerCase().includes(vendSearch.toLowerCase()) || (v.cat||'').toLowerCase().includes(vendSearch.toLowerCase()))

  const open = (v=null) => { setForm(v ? {...v} : { status:'Active', cat:'Cloud', billing:'Monthly' }); setEditId(v?.id||null); setModal('v') }
  const save = () => {
    if (!form.name?.trim()) { toast('Enter vendor name', 'err'); return }
    const v = { ...form, id: editId || Date.now().toString() }
    if (editId) setVendorsDB(db=>db.map(x=>x.id===editId?v:x))
    else        setVendorsDB(db=>[v,...db])
    setModal(null); toast(editId?'✅ Updated':'✅ Vendor Added','ok')
  }
  const del = (id) => { if(!confirm('Delete?'))return; setVendorsDB(db=>db.filter(x=>x.id!==id)); toast('Deleted') }

  return (
    <div className="fade-in">
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:20, fontWeight:800 }}>🏭 Vendors Database</div>
        <div style={{ fontSize:12, color:'var(--t2)', marginTop:3 }}>Manage your suppliers and subcontractors</div>
        <div style={{ marginTop:12 }}><button style={C.btn('p')} onClick={()=>open()}>+ Add Vendor</button></div>
      </div>
      <div style={C.card}>
        <div style={C.ch}>
          <div style={C.chL}><span>🔍</span><input style={{ ...C.fi, width:220, padding:'5px 9px' }} placeholder="Search vendors..." value={vendSearch} onChange={e=>setVendSearch(e.target.value)} /></div>
          <Tag color="purple">{filtered.length} vendor{filtered.length!==1?'s':''}</Tag>
        </div>
        <div style={{ padding:10 }}>
          {filtered.length===0 && <div style={{ textAlign:'center', padding:24, color:'var(--t2)' }}>No vendors found</div>}
          {filtered.map(v=>(
            <div key={v.id} style={{ display:'grid', gridTemplateColumns:'22px 2fr 1fr 1fr 1fr 80px', gap:8, alignItems:'center', padding:'8px 12px', background:'var(--bg)', border:'1px solid var(--bd)', borderRadius:8, marginBottom:5 }}>
              <span>🏭</span>
              <div><div style={{ fontSize:13, fontWeight:600 }}>{v.name}</div><div style={{ fontSize:11, color:'var(--t2)' }}>{v.contact}{v.email?' · '+v.email:''}</div></div>
              <Tag color="teal">{v.cat}</Tag>
              <div style={{ ...C.mono, textAlign:'right', fontSize:12, color:'var(--gold)' }}>{v.rate?'SAR '+fmt(v.rate):'-'}</div>
              <Tag color={STATUS_TAG[v.status]||'blue'}>{v.status}</Tag>
              <div style={{ display:'flex', gap:4 }}>
                <button style={{ ...C.btn('g'), padding:'3px 8px', fontSize:11 }} onClick={()=>open(v)}>✏️</button>
                <button style={{ ...C.btn('danger'), padding:'3px 8px', fontSize:11 }} onClick={()=>del(v.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {modal==='v' && (
        <Modal title={editId?'Edit Vendor':'+ Add Vendor'} onClose={()=>setModal(null)}
          footer={<><button style={C.btn('g')} onClick={()=>setModal(null)}>Cancel</button><button style={C.btn('p')} onClick={save}>💾 {editId?'Update':'Add'}</button></>}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[['name','Vendor / Company Name *','e.g. AWS',2],['contact','Contact Person','Name'],['email','Email','vendor@co.com'],['notes','Notes','Additional info...',2,'textarea']].map(([k,l,ph,span,type])=>(
              <div key={k} style={{ ...C.ff, ...(span===2?{gridColumn:'span 2'}:{}) }}>
                <label style={C.lbl}>{l}</label>
                {type==='textarea' ? <textarea style={{ ...C.fi, resize:'vertical', minHeight:60 }} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={ph} />
                : <input style={C.fi} value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={ph} />}
              </div>
            ))}
            {[['cat','Category',['Cloud','Development','Design','Infrastructure','Consulting','Marketing','Legal','Other']],
              ['status','Status',['Active','Preferred','On Hold','Inactive']],
              ['billing','Billing Type',['One-time','Monthly','Per Project','Hourly']]].map(([k,l,opts])=>(
              <div key={k} style={C.ff}>
                <label style={C.lbl}>{l}</label>
                <select style={{ ...C.fi, cursor:'pointer' }} value={form[k]||opts[0]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}>
                  {opts.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div style={C.ff}><label style={C.lbl}>Standard Rate SAR</label><input style={{ ...C.fi, textAlign:'right' }} type="number" value={form.rate||''} onChange={e=>setForm(f=>({...f,rate:+e.target.value}))} placeholder="0" /></div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function ViewToolsDB({ toolsDB, setToolsDB, toolSearch, setToolSearch }) {
  const [modal, setModal] = useState(null)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({})
  const TYPE_TAG = { SaaS:'blue', License:'purple', 'Open Source':'green', Internal:'teal', Hardware:'gold' }
  const filtered = toolsDB.filter(t => !toolSearch || t.name.toLowerCase().includes(toolSearch.toLowerCase()) || (t.cat||'').toLowerCase().includes(toolSearch.toLowerCase()))

  const open = (t=null) => { setForm(t?{...t}:{type:'SaaS',cat:'Project Management',billing:'Monthly'}); setEditId(t?.id||null); setModal('t') }
  const save = () => {
    if (!form.name?.trim()) { toast('Enter tool name','err'); return }
    const t = { ...form, id: editId||Date.now().toString() }
    if (editId) setToolsDB(db=>db.map(x=>x.id===editId?t:x))
    else        setToolsDB(db=>[t,...db])
    setModal(null); toast(editId?'✅ Updated':'✅ Tool Added','ok')
  }
  const del = (id) => { if(!confirm('Delete?'))return; setToolsDB(db=>db.filter(x=>x.id!==id)); toast('Deleted') }

  return (
    <div className="fade-in">
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:20, fontWeight:800 }}>🔧 Tools Database</div>
        <div style={{ fontSize:12, color:'var(--t2)', marginTop:3 }}>Manage your software tools and licenses</div>
        <div style={{ marginTop:12 }}><button style={C.btn('p')} onClick={()=>open()}>+ Add Tool</button></div>
      </div>
      <div style={C.card}>
        <div style={C.ch}>
          <div style={C.chL}><span>🔍</span><input style={{ ...C.fi, width:220, padding:'5px 9px' }} placeholder="Search tools..." value={toolSearch} onChange={e=>setToolSearch(e.target.value)} /></div>
          <Tag color="purple">{filtered.length} tool{filtered.length!==1?'s':''}</Tag>
        </div>
        <div style={{ padding:10 }}>
          {filtered.length===0 && <div style={{ textAlign:'center', padding:24, color:'var(--t2)' }}>No tools found</div>}
          {filtered.map(t=>(
            <div key={t.id} style={{ display:'grid', gridTemplateColumns:'22px 2fr 1fr 1fr 1fr 80px', gap:8, alignItems:'center', padding:'8px 12px', background:'var(--bg)', border:'1px solid var(--bd)', borderRadius:8, marginBottom:5 }}>
              <span>🔧</span>
              <div><div style={{ fontSize:13, fontWeight:600 }}>{t.name}</div><div style={{ fontSize:11, color:'var(--t2)' }}>{t.vendor}{t.billing?' · '+t.billing:''}</div></div>
              <Tag color="teal">{t.cat}</Tag>
              <div style={{ ...C.mono, textAlign:'right', fontSize:12, color:'var(--gold)' }}>{t.cost?'SAR '+fmt(t.cost):'-'}</div>
              <Tag color={TYPE_TAG[t.type]||'blue'}>{t.type}</Tag>
              <div style={{ display:'flex', gap:4 }}>
                <button style={{ ...C.btn('g'), padding:'3px 8px', fontSize:11 }} onClick={()=>open(t)}>✏️</button>
                <button style={{ ...C.btn('danger'), padding:'3px 8px', fontSize:11 }} onClick={()=>del(t.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {modal==='t' && (
        <Modal title={editId?'Edit Tool':'+ Add Tool'} onClose={()=>setModal(null)}
          footer={<><button style={C.btn('g')} onClick={()=>setModal(null)}>Cancel</button><button style={C.btn('p')} onClick={save}>💾 {editId?'Update':'Add'}</button></>}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div style={{ ...C.ff, gridColumn:'span 2' }}><label style={C.lbl}>Tool / License Name *</label><input style={C.fi} value={form.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Jira, Figma, AWS S3" /></div>
            {[['cat','Category',['Project Management','Design','Development','Cloud','Testing','Communication','Analytics','Security','Other']],
              ['type','Type',['SaaS','License','Open Source','Internal','Hardware']],
              ['billing','Billing Cycle',['Monthly','Annual','Per User','One-time']]].map(([k,l,opts])=>(
              <div key={k} style={C.ff}><label style={C.lbl}>{l}</label>
                <select style={{ ...C.fi, cursor:'pointer' }} value={form[k]||opts[0]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}>
                  {opts.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div style={C.ff}><label style={C.lbl}>Monthly Cost SAR</label><input style={{ ...C.fi, textAlign:'right' }} type="number" value={form.cost||''} onChange={e=>setForm(f=>({...f,cost:+e.target.value}))} placeholder="0" /></div>
            <div style={C.ff}><label style={C.lbl}>Vendor / Provider</label><input style={C.fi} value={form.vendor||''} onChange={e=>setForm(f=>({...f,vendor:e.target.value}))} placeholder="e.g. Atlassian" /></div>
            <div style={{ ...C.ff, gridColumn:'span 2' }}><label style={C.lbl}>Notes</label><textarea style={{ ...C.fi, resize:'vertical', minHeight:60 }} value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Usage notes..." /></div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function ViewProposals({ savedProps, setSavedProps, propFilter, setPropFilter }) {
  const filters = ['all','draft','sent','review','won','lost']
  const list = propFilter==='all' ? savedProps : savedProps.filter(p=>(p.status||'draft')===propFilter)
  const barColor = { draft:'var(--blue)', sent:'#a78bfa', review:'var(--gold)', won:'var(--green)', lost:'var(--red)' }

  const updStatus = (id, status) => {
    setSavedProps(ps=>ps.map(p=>p.id==id?{...p,status}:p))
    toast(`Status → ${PROP_STATUS[status]?.label}`,'ok')
  }
  const del = (id) => { if(!confirm('Delete?'))return; setSavedProps(ps=>ps.filter(p=>p.id!=id)); toast('Deleted') }

  return (
    <div className="fade-in">
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:20, fontWeight:800 }}>📄 Proposals History</div>
        <div style={{ fontSize:12, color:'var(--t2)', marginTop:3 }}>Track status of all proposals</div>
        <div style={{ marginTop:12, display:'flex', gap:6, flexWrap:'wrap' }}>
          {filters.map(f=>(
            <button key={f} style={{ ...C.btn('g'), padding:'4px 12px', fontSize:12, ...(propFilter===f?{background:'var(--grad)',color:'#fff',border:'none'}:{}) }}
              onClick={()=>setPropFilter(f)}>
              {f==='all'?'All':PROP_STATUS[f]?.icon+' '+PROP_STATUS[f]?.label}
            </button>
          ))}
        </div>
      </div>
      {list.length===0 && <div style={{ textAlign:'center', padding:40, color:'var(--t2)' }}>{propFilter==='all'?'No proposals yet':'No proposals with this status'}</div>}
      {list.map((p,i) => (
        <div key={p.id} style={{ background:'var(--s1)', border:'1px solid var(--bd)', borderRadius:11, marginBottom:10, overflow:'hidden', position:'relative' }}>
          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:barColor[p.status||'draft'] }} />
          <div style={{ padding:'14px 16px 14px 20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700 }}>{p.projName}</div>
                <div style={{ fontSize:12, color:'var(--t2)', marginTop:2 }}>{p.client} · {new Date(p.savedAt).toLocaleDateString('en-SA',{year:'numeric',month:'short',day:'numeric'})}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', justifyContent:'flex-end' }}>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:18, fontWeight:900, color:'var(--gold)', ...C.mono }}>SAR {p.total.toLocaleString()}</div>
                  {p.discount>0 && <div style={{ fontSize:10, color:'var(--red)', marginTop:1 }}>Discount {p.discount}%</div>}
                </div>
                <Tag color={PROP_TAG[p.status||'draft']}>{PROP_STATUS[p.status||'draft']?.icon} {PROP_STATUS[p.status||'draft']?.label}</Tag>
                <Tag color="purple">#{String(savedProps.length-savedProps.indexOf(p)).padStart(3,'0')}</Tag>
              </div>
            </div>
            <div style={{ display:'flex', gap:5, marginTop:10, paddingTop:10, borderTop:'1px solid var(--bd)', flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:11, color:'var(--t2)', marginRight:4 }}>Status:</span>
              {Object.entries(PROP_STATUS).map(([k,v])=>(
                <button key={k} style={{ ...C.btn('g'), padding:'3px 9px', fontSize:11, ...((p.status||'draft')===k?{background:'var(--grad)',color:'#fff',border:'none'}:{}) }}
                  onClick={()=>updStatus(p.id,k)}>{v.icon} {v.label}</button>
              ))}
              <button style={{ ...C.btn('danger'), padding:'3px 9px', fontSize:11, marginLeft:'auto' }} onClick={()=>del(p.id)}>🗑</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ViewDashboard({ savedProps }) {
  if (!savedProps.length) return (
    <div className="fade-in">
      <div style={{ marginBottom:18 }}><div style={{ fontSize:20, fontWeight:800 }}>📊 Dashboard</div></div>
      <div style={{ textAlign:'center', padding:60, color:'var(--t2)' }}>No proposals yet — generate your first proposal to see stats</div>
    </div>
  )
  const total    = savedProps.length
  const won      = savedProps.filter(p=>p.status==='won').length
  const lost     = savedProps.filter(p=>p.status==='lost').length
  const winRate  = won+lost>0 ? Math.round(won/(won+lost)*100) : 0
  const wonVal   = savedProps.filter(p=>p.status==='won').reduce((s,p)=>s+(p.total||0),0)
  const pipeline = savedProps.filter(p=>p.status==='sent'||p.status==='review').reduce((s,p)=>s+(p.total||0),0)
  const totalVal = savedProps.reduce((s,p)=>s+(p.total||0),0)
  const avgVal   = total>0 ? totalVal/total : 0

  const stats = [
    { label:'Total Proposals', value:total,          icon:'📄', color:'var(--blue)',  sub:'all time' },
    { label:'Win Rate',        value:winRate+'%',     icon:'🏆', color:'var(--green)', sub:`${won} won / ${lost} lost` },
    { label:'Won Value',       value:'SAR '+fmt(wonVal), icon:'💰', color:'var(--gold)', sub:'total contracted' },
    { label:'Pipeline',        value:'SAR '+fmt(pipeline), icon:'🔄', color:'#a78bfa', sub:`${savedProps.filter(p=>p.status==='sent'||p.status==='review').length} in progress` },
  ]

  return (
    <div className="fade-in">
      <div style={{ marginBottom:18 }}><div style={{ fontSize:20, fontWeight:800 }}>📊 Dashboard</div><div style={{ fontSize:12, color:'var(--t2)', marginTop:3 }}>Proposals performance overview</div></div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:18 }}>
        {stats.map(s=>(
          <div key={s.label} style={{ background:'var(--s1)', border:'1px solid var(--bd)', borderRadius:11, padding:16 }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--t2)', textTransform:'uppercase', letterSpacing:'.05em' }}>{s.label}</div>
            <div style={{ fontSize:20, fontWeight:800, color:s.color, marginTop:5, ...C.mono }}>{s.value}</div>
            <div style={{ fontSize:11, color:'var(--t3)', marginTop:3 }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18 }}>
        <div style={C.card}>
          <div style={C.ch}><div style={C.chL}><span>📊</span><span style={{ fontWeight:600 }}>Status Breakdown</span></div></div>
          <div style={C.cb}>
            {Object.entries(PROP_STATUS).map(([k,v])=>{
              const count = savedProps.filter(p=>(p.status||'draft')===k).length
              const pct   = total>0 ? Math.round(count/total*100) : 0
              return (
                <div key={k} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:12 }}>{v.icon} {v.label}</span>
                    <span style={{ fontSize:12, ...C.mono, color:'var(--t2)' }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ background:'var(--bd)', borderRadius:4, height:6, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:4, background:'var(--grad)', width:`${pct}%`, transition:'width .4s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div style={C.card}>
          <div style={C.ch}><div style={C.chL}><span>🕐</span><span style={{ fontWeight:600 }}>Recent Proposals</span></div></div>
          <div style={{ padding:10 }}>
            {savedProps.slice(0,5).map(p => (
              <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 8px', borderRadius:7, marginBottom:4, background:'var(--bg)' }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:600 }}>{p.projName}</div>
                  <div style={{ fontSize:10, color:'var(--t2)' }}>{p.client}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--gold)', ...C.mono }}>SAR {fmt(p.total)}</div>
                  <Tag color={PROP_TAG[p.status||'draft']}>{PROP_STATUS[p.status||'draft']?.icon} {PROP_STATUS[p.status||'draft']?.label}</Tag>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={C.card}>
        <div style={C.ch}><div style={C.chL}><span>📈</span><span style={{ fontWeight:600 }}>Value Summary</span></div></div>
        <div style={C.cb}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
            {[['Total Portfolio Value','SAR '+fmt(totalVal),'var(--text)'],['Average Proposal Size','SAR '+fmt(avgVal),'var(--blue)'],['Active Pipeline','SAR '+fmt(pipeline),'#a78bfa']].map(([l,v,c])=>(
              <div key={l} style={{ background:'var(--bg)', border:'1px solid var(--bd)', borderRadius:9, padding:14, textAlign:'center' }}>
                <div style={{ fontSize:11, color:'var(--t2)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>{l}</div>
                <div style={{ fontSize:18, fontWeight:800, color:c, ...C.mono }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ViewRateCard({ rcEditable = [], setRcEditable }) {
  const depts = [...new Set(RC.map(r => r.dept))]
  // Merge RC with any edits
  const getRate = (role, field) => {
    const edit = rcEditable.find(e => e.role === role)
    if (edit) return edit[field]
    const orig = RC.find(r => r.role === role)
    return orig ? orig[field] : 0
  }
  return (
    <div className="fade-in">
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:20, fontWeight:800 }}>📋 Rate Card 2026</div>
        <div style={{ fontSize:12, color:'var(--t2)', marginTop:3 }}>22 days/month · 8 hrs/day · SAR · Click any rate to edit</div>
      </div>
      {depts.map(dept=>(
        <div key={dept} style={C.card}>
          <div style={C.ch}><div style={C.chL}><span>📋</span><span style={{ fontWeight:600 }}>{dept}</span></div></div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>
                {['Role','Monthly SAR','Daily SAR','Hourly SAR'].map(h=>(
                  <th key={h} style={{ textAlign:h==='Role'?'left':'right', fontSize:10, fontWeight:700, color:'var(--t2)', textTransform:'uppercase', padding:'9px 14px', borderBottom:'1px solid var(--bd)', background:'var(--s2)' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {RC.filter(r=>r.dept===dept).map(r=>{
                  const monthly = getRate(r.role, 'monthly')
                  const daily   = getRate(r.role, 'daily')
                  const isEdited = rcEditable.some(e => e.role === r.role)
                  return (
                    <tr key={r.role} style={{ borderBottom:'1px solid var(--bd)', background: isEdited ? 'rgba(91,63,160,.06)' : 'transparent' }}>
                      <td style={{ padding:'9px 14px', fontSize:13, fontWeight:500 }}>
                        {r.role} {isEdited && <span style={{ fontSize:10, color:'#a78bfa', marginLeft:4 }}>✏️ edited</span>}
                      </td>
                      <td style={{ padding:'6px 14px', textAlign:'right' }}>
                        <input type="number" value={monthly}
                          style={{ ...C.fi, width:110, textAlign:'right', padding:'4px 8px', fontFamily:"'JetBrains Mono',monospace", color:'var(--gold)', fontWeight:600, fontSize:12 }}
                          onChange={e => {
                            const val = +e.target.value
                            setRcEditable(prev => {
                              const exists = prev.find(x => x.role === r.role)
                              if (exists) return prev.map(x => x.role===r.role ? {...x, monthly:val} : x)
                              return [...prev, { role:r.role, monthly:val, daily: getRate(r.role,'daily') }]
                            })
                          }}
                        />
                      </td>
                      <td style={{ padding:'6px 14px', textAlign:'right' }}>
                        <input type="number" value={daily}
                          style={{ ...C.fi, width:110, textAlign:'right', padding:'4px 8px', fontFamily:"'JetBrains Mono',monospace", fontSize:12 }}
                          onChange={e => {
                            const val = +e.target.value
                            setRcEditable(prev => {
                              const exists = prev.find(x => x.role === r.role)
                              if (exists) return prev.map(x => x.role===r.role ? {...x, daily:val} : x)
                              return [...prev, { role:r.role, daily:val, monthly: getRate(r.role,'monthly') }]
                            })
                          }}
                        />
                      </td>
                      <td style={{ padding:'9px 14px', textAlign:'right', ...C.mono, color:'var(--t2)' }}>{Math.round(daily/8)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

function ViewSettings({ ohBase, setOhBase, rcEditable, setRcEditable, saveNow }) {
  const [editing, setEditing] = useState(null) // 'oh' | 'cats' | null
  const [ohInput, setOhInput] = useState(ohBase)
  const [cats, setCats] = useState({
    small:  { label:'Small',      range:'≤ 250K',    pct: 15 },
    medium: { label:'Medium',     range:'250K – 1M', pct: 20 },
    large:  { label:'Large',      range:'1M – 2M',   pct: 25 },
    enterprise: { label:'Enterprise', range:'> 2M',  pct: 40 },
  })

  const saveOH = () => { setOhBase(ohInput); saveNow(); setEditing(null); toast('✅ OH Base updated', 'ok') }
  const saveCats = () => { saveNow(); setEditing(null); toast('✅ Categories updated', 'ok') }

  return (
    <div className="fade-in">
      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:20, fontWeight:800 }}>⚙️ Settings</div>
        <div style={{ fontSize:12, color:'var(--t2)', marginTop:3 }}>Pricing configuration</div>
      </div>

      {/* ── OH CATEGORIES ── */}
      <div style={C.card}>
        <div style={C.ch}>
          <div style={C.chL}><span>📊</span><div><div style={{ fontWeight:600 }}>OH Categories & Rates</div><div style={{ fontSize:11, color:'var(--t2)' }}>Project size thresholds and overhead percentages</div></div></div>
          {editing !== 'cats'
            ? <button style={{ ...C.btn('g'), padding:'5px 12px', fontSize:12 }} onClick={() => setEditing('cats')}>✏️ Edit</button>
            : <div style={{ display:'flex', gap:6 }}>
                <button style={{ ...C.btn('success'), padding:'5px 12px', fontSize:12 }} onClick={saveCats}>💾 Save</button>
                <button style={{ ...C.btn('g'), padding:'5px 12px', fontSize:12 }} onClick={() => setEditing(null)}>Cancel</button>
              </div>
          }
        </div>
        <div style={C.cb}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {Object.entries(cats).map(([key, cat]) => (
              <div key={key} style={{ background:'var(--s2)', border:'1px solid var(--bd)', borderRadius:10, padding:16, textAlign:'center' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--t2)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>{cat.label}</div>
                <div style={{ fontSize:12, color:'var(--t2)', marginBottom:12 }}>{cat.range}</div>
                {editing === 'cats'
                  ? <div>
                      <input type="number" value={cat.pct} min={0} max={100}
                        style={{ ...C.fi, textAlign:'center', fontSize:20, fontWeight:800, color:'var(--gold)', padding:'8px', width:'80px', margin:'0 auto', display:'block' }}
                        onChange={e => setCats(prev => ({...prev, [key]: {...prev[key], pct: +e.target.value}}))}
                      />
                      <div style={{ fontSize:11, color:'var(--t2)', marginTop:4 }}>%</div>
                    </div>
                  : <div style={{ fontSize:28, fontWeight:900, color:'var(--gold)' }}>{cat.pct}<span style={{ fontSize:16 }}>%</span></div>
                }
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── OH BASE ── */}
      <div style={C.card}>
        <div style={C.ch}>
          <div style={C.chL}><span>💡</span><div><div style={{ fontWeight:600 }}>Overhead Base Amount</div><div style={{ fontSize:11, color:'var(--t2)' }}>Monthly fixed overhead · OH = OH Base × Category %</div></div></div>
          {editing !== 'oh'
            ? <button style={{ ...C.btn('g'), padding:'5px 12px', fontSize:12 }} onClick={() => { setOhInput(ohBase); setEditing('oh') }}>✏️ Edit</button>
            : <div style={{ display:'flex', gap:6 }}>
                <button style={{ ...C.btn('success'), padding:'5px 12px', fontSize:12 }} onClick={saveOH}>💾 Save</button>
                <button style={{ ...C.btn('g'), padding:'5px 12px', fontSize:12 }} onClick={() => setEditing(null)}>Cancel</button>
              </div>
          }
        </div>
        <div style={C.cb}>
          <div style={{ maxWidth:400, margin:'0 auto', textAlign:'center' }}>
            {editing === 'oh'
              ? <div>
                  <label style={{ ...C.lbl, display:'block', marginBottom:8 }}>OH Base Amount (SAR)</label>
                  <input type="number" value={ohInput}
                    style={{ ...C.fi, fontSize:24, fontWeight:800, color:'var(--gold)', fontFamily:"'JetBrains Mono',monospace", textAlign:'center', padding:'16px', width:'100%' }}
                    onChange={e => setOhInput(+e.target.value)}
                  />
                </div>
              : <div style={{ background:'var(--s2)', border:'1px solid var(--bd)', borderRadius:12, padding:'28px 20px' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--t2)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>Current OH Base</div>
                  <div style={{ fontSize:36, fontWeight:900, color:'var(--gold)', fontFamily:"'JetBrains Mono',monospace" }}>
                    SAR {fmt(ohBase)}
                  </div>
                  <div style={{ fontSize:11, color:'var(--t3)', marginTop:8 }}>per month</div>
                </div>
            }
          </div>
        </div>
      </div>

      {/* ── EDITED RATE CARD ── */}
      {rcEditable.length > 0 && (
        <div style={C.card}>
          <div style={C.ch}>
            <div style={C.chL}><span>✏️</span><div><div style={{ fontWeight:600 }}>Customized Rates</div><div style={{ fontSize:11, color:'var(--t2)' }}>{rcEditable.length} role(s) with custom rates</div></div></div>
            <button style={{ ...C.btn('danger'), padding:'5px 12px', fontSize:12 }}
              onClick={() => { if(confirm('Reset all rates to defaults?')) { setRcEditable([]); saveNow(); toast('✅ Reset to defaults', 'ok') } }}>
              🔄 Reset All
            </button>
          </div>
          <div style={C.cb}>
            {rcEditable.map(e => {
              const orig = RC.find(r => r.role === e.role)
              return (
                <div key={e.role} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'var(--bg)', border:'1px solid var(--bd)', borderRadius:8, marginBottom:6 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{e.role}</div>
                  <div style={{ display:'flex', gap:20, alignItems:'center', fontSize:12 }}>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:10, color:'var(--t3)' }}>Original</div>
                      <div style={{ ...C.mono, color:'var(--t2)' }}>SAR {fmt(orig?.daily||0)}/day</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:10, color:'var(--t3)' }}>Custom</div>
                      <div style={{ ...C.mono, color:'var(--gold)', fontWeight:700 }}>SAR {fmt(e.daily)}/day</div>
                    </div>
                    <button style={{ ...C.btn('danger'), padding:'3px 9px', fontSize:11 }}
                      onClick={() => setRcEditable(prev => prev.filter(x => x.role !== e.role))}>
                      Reset
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  const [ohInput, setOhInput] = useState(ohBase)
  return (
    <div className="fade-in">
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:20, fontWeight:800 }}>⚙️ Settings</div>
        <div style={{ fontSize:12, color:'var(--t2)', marginTop:3 }}>Configure pricing parameters</div>
      </div>

      {/* OH BASE */}
      <div style={C.card}>
        <div style={C.ch}>
          <div style={C.chL}><span>💡</span><div><div style={{ fontWeight:600 }}>Overhead Base (OH)</div><div style={{ fontSize:11, color:'var(--t2)' }}>Monthly fixed overhead cost · used to calculate OH per project</div></div></div>
        </div>
        <div style={C.cb}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
            <div>
              <div style={{ fontSize:12, color:'var(--t2)', marginBottom:10, lineHeight:1.6 }}>
                الـ OH بيتحسب كالتالي:<br/>
                <b style={{ color:'var(--text)' }}>1.</b> تحديد الكاتيجوري من مجموع (Team + Tools + Vendors)<br/>
                <b style={{ color:'var(--text)' }}>2.</b> الـ OH = OH Base × نسبة الكاتيجوري
              </div>
              <div style={{ background:'var(--s2)', border:'1px solid var(--bd)', borderRadius:8, padding:12, fontSize:12 }}>
                {[['≤ 250K','Small','15%'],['250K – 1M','Medium','20%'],['1M – 2M','Large','25%'],['> 2M','Enterprise','40%']].map(([range,cat,pct])=>(
                  <div key={cat} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid var(--bd)' }}>
                    <span style={{ color:'var(--t2)' }}>{range}</span>
                    <span style={{ color:'var(--text)', fontWeight:500 }}>{cat}</span>
                    <span style={{ color:'var(--gold)', fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}>{pct}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={C.ff}>
                <label style={C.lbl}>OH Base Amount (SAR)</label>
                <input style={{ ...C.fi, fontSize:18, fontWeight:700, color:'var(--gold)', fontFamily:"'JetBrains Mono',monospace", textAlign:'right', padding:'12px 16px' }}
                  type="number" value={ohInput}
                  onChange={e => setOhInput(+e.target.value)}
                />
                <div style={{ fontSize:11, color:'var(--t2)', marginTop:6 }}>القيمة الحالية: SAR {fmt(ohBase)}</div>
              </div>
              <button style={{ ...C.btn('p'), marginTop:14, width:'100%', justifyContent:'center', padding:'10px' }}
                onClick={() => { setOhBase(ohInput); saveNow(); toast('✅ OH Base updated', 'ok') }}>
                💾 Save OH Base
              </button>
              {rcEditable.length > 0 && (
                <button style={{ ...C.btn('danger'), marginTop:8, width:'100%', justifyContent:'center', padding:'8px' }}
                  onClick={() => { setRcEditable([]); saveNow(); toast('✅ Rate Card reset to defaults', 'ok') }}>
                  🔄 Reset Rate Card to Defaults
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EDITED RATES SUMMARY */}
      {rcEditable.length > 0 && (
        <div style={C.card}>
          <div style={C.ch}><div style={C.chL}><span>✏️</span><div><div style={{ fontWeight:600 }}>Edited Rates</div><div style={{ fontSize:11, color:'var(--t2)' }}>{rcEditable.length} role(s) have custom rates</div></div></div></div>
          <div style={C.cb}>
            {rcEditable.map(e => {
              const orig = RC.find(r => r.role === e.role)
              return (
                <div key={e.role} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'var(--bg)', border:'1px solid var(--bd)', borderRadius:8, marginBottom:5 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{e.role}</div>
                  <div style={{ display:'flex', gap:16, alignItems:'center', fontSize:12 }}>
                    <span style={{ color:'var(--t2)' }}>Original: <span style={{ fontFamily:"'JetBrains Mono',monospace" }}>SAR {fmt(orig?.daily||0)}/day</span></span>
                    <span style={{ color:'var(--gold)', fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}>SAR {fmt(e.daily)}/day</span>
                    <button style={{ ...C.btn('danger'), padding:'2px 8px', fontSize:11 }}
                      onClick={() => setRcEditable(prev => prev.filter(x => x.role !== e.role))}>
                      Reset
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}


