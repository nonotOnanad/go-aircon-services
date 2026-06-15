import { useState, useCallback, useEffect, useMemo } from 'react'
import { db } from '../supabaseClient.js'
import logoUrl from '../assets/logo.jpg'
import Modal, { ModalHead } from './Modal.jsx'

const fmtDate = iso => { if (!iso) return '—'; const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) }
const fmtDT   = iso => { if (!iso) return '—'; return new Date(iso).toLocaleString('en-PH') }
const fmtMo   = iso => { if (!iso) return '—'; const d = new Date(iso + '-01'); return d.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' }) }
const todayISO = () => new Date().toISOString().slice(0, 10)
const initials = n => (n||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase()
const moKey = iso => iso ? iso.slice(0,7) : null   // "2025-04"

const TABS = [
  { key:'bookings',  label:'Bookings',          icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  { key:'quotes',    label:'Quotations',         icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="9" y1="13" x2="15" y2="13"/></svg> },
  { key:'ocular',    label:'Ocular Visits',      icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { key:'clients',   label:'Clients',            icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { key:'calendar',  label:'Calendar',           icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg> },
  { key:'analytics', label:'Sales Analytics',    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { key:'staff',     label:'Staff Management',   icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>, adminOnly: true },
  { key:'settings',  label:'Data Management',    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M20 12h-2M6 12H4M4.93 4.93l1.41 1.41M18.66 18.66l1.41-1.41M12 4V2M12 22v-2"/></svg>, adminOnly: true },
]

const BSTATUS = ['Pending','Confirmed','In Progress','Completed','Cancelled']
const QSTATUS = ['New','Quoted','Approved','Closed']
const SERVICES = ['Aircon Maintenance','Washing Machine Maintenance','Refrigerator Maintenance']

function StatusBadge({ s }) {
  const map = { Pending:'b-pending', Confirmed:'b-confirmed', 'In Progress':'b-progress', Completed:'b-completed', Cancelled:'b-cancelled', New:'b-new', Quoted:'b-quoted', Approved:'b-approved', Closed:'b-closed' }
  return <span className={`badge ${map[s]||'b-pending'}`}>{s}</span>
}
function OcularStatusBadge({ s }) {
  const map = { Pending:'b-pending', Scheduled:'b-confirmed', Completed:'b-completed', Cancelled:'b-cancelled' }
  return <span className={`badge ${map[s]||'b-pending'}`}>{s}</span>
}
function Stat({ icon, label, value, sub, accent }) {
  return (
    <div className="stat" style={accent ? { borderTop: `3px solid ${accent}` } : {}}>
      <div className="lab">{icon}{label}</div>
      <div className="val" style={accent ? { color: accent } : {}}>{value}</div>
      {sub && <div style={{fontSize:'.75rem',color:'var(--slate)',marginTop:2}}>{sub}</div>}
    </div>
  )
}
function Empty({ title, msg }) {
  return (
    <div className="empty">
      <div className="eic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div>
      <b>{title}</b><p>{msg}</p>
    </div>
  )
}

export default function Dashboard({ user, logout, addToast }) {
  const [tab, setTab]           = useState('bookings')
  const [sideOpen, setSideOpen] = useState(false)
  const [bookings, setBookings] = useState([])
  const [quotes, setQuotes]     = useState([])
  const [ocular, setOcular]     = useState([])
  const [staff, setStaff]       = useState([])
  const [loading, setLoading]   = useState(false)
  const [modal, setModal]       = useState(null)
  const [calRef, setCalRef]     = useState(new Date())
  const [bQ, setBQ]             = useState(''); const [bStatus, setBStatus] = useState(''); const [bTestFilter, setBTestFilter] = useState('real')
  const [qQ, setQQ]             = useState(''); const [qStatus, setQStatus] = useState('')
  const [cQ, setCQ]             = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [{ data: b }, { data: q }, { data: o }, { data: s }] = await Promise.all([
      db.bookings().select('*').order('created_at', { ascending: false }),
      db.quotations().select('*').order('created_at', { ascending: false }),
      db.ocular().select('*').order('created_at', { ascending: false }),
      db.staff().select('*').order('created_at'),
    ])
    setBookings(b || []); setQuotes(q || []); setOcular(o || []); setStaff(s || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ---- Bookings ----
  const filteredB = bookings.filter(b => {
    if (bTestFilter === 'real' && b.is_test) return false
    if (bTestFilter === 'test' && !b.is_test) return false
    if (bStatus && b.status !== bStatus) return false
    if (bQ) { const q = bQ.toLowerCase(); return (b.client_name+b.phone+b.ref+b.service+b.address).toLowerCase().includes(q) }
    return true
  })

  const deleteBooking = async id => {
    const { error } = await db.bookings().delete().eq('id', id)
    if (error) { addToast('Delete failed', error.message, 'err'); return }
    await loadAll(); setModal(null); addToast('Booking deleted', '', 'info')
  }

  const sendConfirmationEmail = async (booking) => {
    if (!booking.email) return
    try {
      const res = await fetch('/api/send-confirmation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: booking.email, name: booking.client_name, ref: booking.ref, service: booking.service, work_type: booking.work_type, schedule: booking.schedule || booking.pref_date, time: booking.pref_time, address: booking.address, units: booking.units, model: booking.model, notes: booking.notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      addToast('Email sent!', `Confirmation sent to ${booking.email}`, 'ok')
    } catch (err) {
      addToast('Email not sent', err.message || 'Check the RESEND_API_KEY env var.', 'info')
    }
  }

  const saveBooking = async (id, patch) => {
    const prev = bookings.find(b => b.id === id)
    const { error } = await db.bookings().update(patch).eq('id', id)
    if (error) { addToast('Save failed', error.message, 'err'); return }
    if (patch.status === 'Confirmed' && prev?.status !== 'Confirmed') {
      const updated = { ...prev, ...patch }
      await sendConfirmationEmail(updated)
    }
    await loadAll(); setModal(null); addToast('Booking updated', '', 'ok')
  }

  // ---- Quotes ----
  const filteredQ = quotes.filter(q => {
    if (qStatus && q.status !== qStatus) return false
    if (qQ) { const s = qQ.toLowerCase(); return (q.client_name+q.phone+q.ref+q.unit_type).toLowerCase().includes(s) }
    return true
  })

  const saveQuote = async (id, patch) => {
    const { error } = await db.quotations().update(patch).eq('id', id)
    if (error) { addToast('Save failed', error.message, 'err'); return }
    await loadAll(); setModal(null); addToast('Quotation updated', '', 'ok')
  }

  const deleteQuote = async id => {
    const { error } = await db.quotations().delete().eq('id', id)
    if (error) { addToast('Delete failed', error.message, 'err'); return }
    await loadAll(); setModal(null); addToast('Quotation deleted', '', 'info')
  }

  // ---- Clients ----
  const addMonths = (isoDate, n) => {
    if (!isoDate) return null
    const d = new Date(isoDate + 'T00:00:00'); d.setMonth(d.getMonth() + n)
    return d.toISOString().slice(0, 10)
  }
  const clientMap = {}
  bookings.forEach(b => {
    const k = b.phone
    if (!clientMap[k]) clientMap[k] = { name: b.client_name, phone: b.phone, email: b.email, address: b.address, bookings: 0, quotes: 0, last: b.created_at, lastBooking: null }
    clientMap[k].bookings++
    if (b.created_at > clientMap[k].last) clientMap[k].last = b.created_at
    const bDate = b.schedule || b.pref_date
    if (bDate && (!clientMap[k].lastBooking || bDate > clientMap[k].lastBooking.date)) {
      clientMap[k].lastBooking = { date: bDate, service: b.service, next_service_date: b.next_service_date, tech_notes: b.tech_notes, ref: b.ref, id: b.id }
    }
  })
  quotes.forEach(q => {
    const k = q.phone
    if (!clientMap[k]) clientMap[k] = { name: q.client_name, phone: q.phone, email: q.email, address: q.address, bookings: 0, quotes: 0, last: q.created_at, lastBooking: null }
    clientMap[k].quotes++
    if (q.created_at > clientMap[k].last) clientMap[k].last = q.created_at
  })
  const clients = Object.values(clientMap)
    .sort((a, b) => (b.last||'').localeCompare(a.last||''))
    .filter(c => !cQ || (c.name+c.phone+(c.email||'')+(c.address||'')).toLowerCase().includes(cQ.toLowerCase()))

  // ---- Analytics ----
  const analytics = useMemo(() => {
    const realBookings = bookings.filter(b => !b.is_test)
    const realQuotes   = quotes.filter(q => !q.is_test)

    // Monthly booking counts (last 6 months)
    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(d.toISOString().slice(0,7))
    }

    const bookingsByMonth = {}
    months.forEach(m => { bookingsByMonth[m] = { total: 0, completed: 0, cancelled: 0, pending: 0 } })
    realBookings.forEach(b => {
      const m = moKey(b.created_at)
      if (bookingsByMonth[m]) {
        bookingsByMonth[m].total++
        if (b.status === 'Completed')  bookingsByMonth[m].completed++
        if (b.status === 'Cancelled')  bookingsByMonth[m].cancelled++
        if (b.status === 'Pending')    bookingsByMonth[m].pending++
      }
    })

    // Service breakdown
    const svcCounts = {}
    realBookings.forEach(b => {
      const svc = b.service || 'Other'
      svcCounts[svc] = (svcCounts[svc] || 0) + 1
    })

    // Work type breakdown (Clean, Repair, Install, etc.)
    const workCounts = {}
    realBookings.forEach(b => {
      const w = b.work_type || 'Unspecified'
      workCounts[w] = (workCounts[w] || 0) + 1
    })

    // Completion rate
    const completed  = realBookings.filter(b => b.status === 'Completed').length
    const cancelled  = realBookings.filter(b => b.status === 'Cancelled').length
    const compRate   = realBookings.length ? Math.round(completed / realBookings.length * 100) : 0
    const cancelRate = realBookings.length ? Math.round(cancelled / realBookings.length * 100) : 0

    // Quote conversion
    const qApproved = realQuotes.filter(q => q.status === 'Approved').length
    const qRate     = realQuotes.length ? Math.round(qApproved / realQuotes.length * 100) : 0

    // Repeat clients
    const phoneCount = {}
    realBookings.forEach(b => { phoneCount[b.phone] = (phoneCount[b.phone] || 0) + 1 })
    const repeatClients = Object.values(phoneCount).filter(c => c > 1).length
    const totalClients  = Object.keys(phoneCount).length

    // Pending / overdue
    const today = todayISO()
    const overdue = realBookings.filter(b => {
      const d = b.schedule || b.pref_date
      return d && d < today && b.status !== 'Completed' && b.status !== 'Cancelled'
    }).length

    // Next service due in 30 days
    const in30 = addMonths(today, 1)
    const dueSoon = realBookings.filter(b => {
      const ns = b.next_service_date
      return ns && ns >= today && ns <= in30 && b.status === 'Completed'
    }).length

    return { months, bookingsByMonth, svcCounts, workCounts, compRate, cancelRate, qRate, repeatClients, totalClients, overdue, dueSoon, totalBookings: realBookings.length, totalQuotes: realQuotes.length }
  }, [bookings, quotes])

  // ---- Staff ----
  const addModerator = async ({ name, username, password }) => {
    if (staff.some(s => s.username.toLowerCase() === username.toLowerCase())) { addToast('Username taken', 'Choose a different one.', 'err'); return }
    const { error } = await db.staff().insert({ name, username: username.toLowerCase(), password, role: 'moderator' })
    if (error) { addToast('Error', error.message, 'err'); return }
    await loadAll(); setModal(null); addToast('Moderator added', name + ' can now log in.', 'ok')
  }
  const removeModerator = async id => {
    const { error } = await db.staff().delete().eq('id', id)
    if (error) { addToast('Error', error.message, 'err'); return }
    await loadAll(); setModal(null); addToast('Moderator removed', '', 'info')
  }
  const canChangePassword = (actor, target) => {
    if (!actor || !target) return false
    if (actor.id === target.id) return true
    if (actor.role === 'admin')     return target.role !== 'admin'
    if (actor.role === 'moderator') return target.role === 'owner'
    return false
  }
  const changePassword = async (targetId, newPassword) => {
    const { error } = await db.staff().update({ password: newPassword }).eq('id', targetId)
    if (error) { addToast('Error', error.message, 'err'); return }
    await loadAll(); setModal(null); addToast('Password updated', 'The new password is active immediately.', 'ok')
  }

  // ---- Bulk delete test data ----
  const deleteTestData = async (tables) => {
    let count = 0
    if (tables.includes('bookings')) {
      const r = await db.bookings().delete().eq('is_test', true)
      if (r.error) { addToast('Error', r.error.message, 'err'); return }
      count += bookings.filter(b => b.is_test).length
    }
    if (tables.includes('quotations')) {
      const r = await db.quotations().delete().eq('is_test', true)
      if (r.error) { addToast('Error', r.error.message, 'err'); return }
      count += quotes.filter(q => q.is_test).length
    }
    if (tables.includes('ocular')) {
      const r = await db.ocular().delete().eq('is_test', true)
      if (r.error) { addToast('Error', r.error.message, 'err'); return }
      count += ocular.filter(o => o.is_test).length
    }
    await loadAll(); setModal(null)
    addToast('Test data deleted', `${count} test record${count !== 1 ? 's' : ''} removed.`, 'ok')
  }

  const deleteTestUsers = async () => {
    const testStaff = staff.filter(s => s.role !== 'admin' && s.username.startsWith('test'))
    if (!testStaff.length) { addToast('No test users found', 'No staff accounts with username starting with "test" exist.', 'info'); return }
    for (const s of testStaff) {
      const { error } = await db.staff().delete().eq('id', s.id)
      if (error) { addToast('Error removing ' + s.name, error.message, 'err'); return }
    }
    await loadAll(); setModal(null)
    addToast('Test users deleted', `${testStaff.length} test account${testStaff.length !== 1 ? 's' : ''} removed.`, 'ok')
  }

  // ---- Calendar ----
  const calByDate = {}
  bookings.filter(b => !b.is_test).forEach(b => { const d = b.schedule || b.pref_date; if (d) { (calByDate[d] = calByDate[d] || []).push(b) } })

  const renderCal = () => {
    const y = calRef.getFullYear(), m = calRef.getMonth()
    const first = new Date(y, m, 1), startDow = first.getDay(), daysIn = new Date(y, m+1, 0).getDate()
    const prevDays = new Date(y, m, 0).getDate()
    const cells = []
    for (let i = startDow-1; i >= 0; i--) cells.push({ other: true, day: prevDays - i, iso: null })
    for (let d = 1; d <= daysIn; d++) {
      const iso = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      cells.push({ day: d, iso })
    }
    while (cells.length % 7 !== 0) cells.push({ other: true, day: cells.length - startDow - daysIn + 1, iso: null })
    const tod = todayISO()
    return cells.map((c, i) => {
      if (c.other) return <div key={i} className="cal-cell other"><span className="dn">{c.day}</span></div>
      const evs = calByDate[c.iso] || []
      return (
        <div key={i} className={`cal-cell${c.iso === tod ? ' today' : ''}${evs.length ? ' has' : ''}`}
          onClick={() => evs.length && setModal({ type: 'dayDetail', data: { date: c.iso, evs } })}>
          <span className="dn">{c.day}</span>
          {evs.slice(0,2).map(b => (
            <div key={b.id} className={`ev c-${b.status.toLowerCase().replace(/\s/g,'')}`}>
              {b.client_name.split(' ')[0]} · {b.service.includes('Air') ? 'aircon' : b.service.includes('Wash') ? 'washer' : 'fridge'}
            </div>
          ))}
          {evs.length > 2 && <div className="more">+{evs.length-2} more</div>}
        </div>
      )
    })
  }

  // ---- Analytics helpers ----
  const BAR_COLORS = { total: '#2563a8', completed: '#16a34a', cancelled: '#dc2626', pending: '#d97706' }
  const SVC_COLORS = ['#2563a8','#16a34a','#e65100','#7c3aed','#0891b2']

  const BarChart = ({ data, maxVal, color, height = 80 }) => (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: '.62rem', color: 'var(--slate)', fontWeight: 700 }}>{d.val || ''}</div>
          <div style={{ width: '100%', background: color, borderRadius: '4px 4px 0 0', minHeight: 4,
            height: maxVal ? `${Math.max(4, (d.val / maxVal) * (height - 28))}px` : 4 }} />
          <div style={{ fontSize: '.6rem', color: 'var(--slate)', textAlign: 'center', lineHeight: 1.2 }}>{d.label}</div>
        </div>
      ))}
    </div>
  )

  const DonutRing = ({ pct, color, size = 72, stroke = 10 }) => {
    const r = (size - stroke) / 2
    const circ = 2 * Math.PI * r
    const offset = circ - (pct / 100) * circ
    return (
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}/>
        <text x={size/2} y={size/2+5} textAnchor="middle" fontSize="14" fontWeight="700" fill={color}>{pct}%</text>
      </svg>
    )
  }

  const tabs = TABS.filter(t => !t.adminOnly || user.role === 'admin')

  // ---- test data counts ----
  const testCounts = {
    bookings:   bookings.filter(b => b.is_test).length,
    quotations: quotes.filter(q => q.is_test).length,
    ocular:     ocular.filter(o => o.is_test).length,
    users:      staff.filter(s => s.role !== 'admin' && s.username.startsWith('test')).length,
  }

  return (
    <div className="app-shell">
      <div className={`sideback${sideOpen?' show':''}`} onClick={() => setSideOpen(false)} />
      <aside className={`side${sideOpen?' show':''}`}>
        <div className="sbrand">
          <span className="mark"><img src={logoUrl} alt="logo" /></span>
          <div><b>GO Aircon</b><br/><small>Operations</small></div>
        </div>
        <nav className="navi">
          {tabs.map(t => (
            <button key={t.key} className={`navi-btn${tab===t.key?' active':''}`} onClick={() => { setTab(t.key); setSideOpen(false) }}>
              {t.icon}<span>{t.label}</span>
              {t.key==='bookings' && <span className="cnt">{bookings.filter(b=>!b.is_test).length}</span>}
              {t.key==='quotes'   && <span className="cnt">{quotes.length}</span>}
              {t.key==='ocular'   && <span className="cnt">{ocular.filter(o=>!o.is_test).length}</span>}
            </button>
          ))}
        </nav>
        <div className="spacer" />
        <button className="side-foot-btn" onClick={() => { setSideOpen(false); window.scrollTo(0,0) }} style={{marginBottom:5}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          View website
        </button>
        <button className="side-foot-btn" onClick={logout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Log out
        </button>
      </aside>

      <div className="main">
        <div className="topbar">
          <div style={{display:'flex',alignItems:'center',gap:11}}>
            <button className="menu-toggle" onClick={() => setSideOpen(o=>!o)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>
            </button>
            <h1>{TABS.find(t=>t.key===tab)?.label}</h1>
          </div>
          <div className="who">
            <div className="nm" style={{textAlign:'right'}}>
              <b>{user.name}</b>
              <span className={`role-badge role-${user.role}`}>{user.role}</span>
            </div>
            <div className="av">{initials(user.name)}</div>
          </div>
        </div>

        <div className="pad">
          {loading && <p className="muted" style={{marginBottom:16}}>Loading…</p>}

          {/* ─── BOOKINGS ─── */}
          {tab === 'bookings' && (
            <>
              <div className="stats">
                <Stat icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>} label="Total (real)" value={bookings.filter(b=>!b.is_test).length} />
                <Stat icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>} label="Pending" value={bookings.filter(b=>!b.is_test&&b.status==='Pending').length} />
                <Stat icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>} label="Upcoming" value={bookings.filter(b=>!b.is_test&&(b.schedule||b.pref_date)>=todayISO()&&b.status!=='Cancelled'&&b.status!=='Completed').length} />
                <Stat icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} label="Completed" value={bookings.filter(b=>!b.is_test&&b.status==='Completed').length} />
              </div>
              <div className="toolbar">
                <div className="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input placeholder="Search name, phone, ref…" value={bQ} onChange={e=>setBQ(e.target.value)}/></div>
                <select value={bStatus} onChange={e=>setBStatus(e.target.value)}>
                  <option value="">All statuses</option>{BSTATUS.map(s=><option key={s}>{s}</option>)}
                </select>
                <select value={bTestFilter} onChange={e=>setBTestFilter(e.target.value)}>
                  <option value="real">Real only</option>
                  <option value="test">Test only</option>
                  <option value="all">All records</option>
                </select>
              </div>
              {bTestFilter === 'test' && testCounts.bookings > 0 && (
                <div style={{background:'#fff3e0',border:'1px solid #ffcc80',borderRadius:9,padding:'10px 16px',marginBottom:12,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                  <span style={{fontSize:'.88rem',color:'#bf360c',fontWeight:600}}>
                    {testCounts.bookings} test booking{testCounts.bookings!==1?'s':''} showing — these are safe to delete.
                  </span>
                  <button className="btn btn-danger btn-sm" onClick={() => setModal({ type:'deleteTest', target:'bookings' })}>
                    Delete all test bookings
                  </button>
                </div>
              )}
              <div className="tablecard">
                {filteredB.length ? (
                  <div className="tbl-scroll"><table className="tbl">
                    <thead><tr><th>Ref</th><th>Client</th><th>Service</th><th>Schedule</th><th>Status</th></tr></thead>
                    <tbody>{filteredB.map(b => (
                      <tr key={b.id} onClick={() => setModal({ type:'booking', data:b })} style={b.is_test?{opacity:.6,background:'#fff8f0'}:{}}>
                        <td><span className="ref">{b.ref}</span>{b.is_test&&<span style={{marginLeft:5,fontSize:'.68rem',background:'#ffe0b2',color:'#e65100',borderRadius:4,padding:'1px 5px',fontWeight:700}}>TEST</span>}</td>
                        <td className="nm"><b>{b.client_name}</b><span>{b.phone}</span></td>
                        <td>{b.service}<br/><span className="muted" style={{fontSize:'.77rem'}}>{b.work_type}</span></td>
                        <td>{fmtDate(b.schedule||b.pref_date)}<br/><span className="muted" style={{fontSize:'.77rem'}}>{b.pref_time}</span></td>
                        <td><StatusBadge s={b.status}/></td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                ) : <Empty title="No bookings" msg="Bookings appear here automatically." />}
              </div>
            </>
          )}

          {/* ─── QUOTES ─── */}
          {tab === 'quotes' && (
            <>
              <div className="stats">
                <Stat icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>} label="Total" value={quotes.length} />
                <Stat icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>} label="New" value={quotes.filter(q=>q.status==='New').length} />
                <Stat icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16h16V8z"/></svg>} label="Quoted" value={quotes.filter(q=>q.status==='Quoted').length} />
                <Stat icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} label="Approved" value={quotes.filter(q=>q.status==='Approved').length} />
              </div>
              <div className="toolbar">
                <div className="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input placeholder="Search name, phone, ref…" value={qQ} onChange={e=>setQQ(e.target.value)}/></div>
                <select value={qStatus} onChange={e=>setQStatus(e.target.value)}>
                  <option value="">All statuses</option>{QSTATUS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="tablecard">
                {filteredQ.length ? (
                  <div className="tbl-scroll"><table className="tbl">
                    <thead><tr><th>Ref</th><th>Client</th><th>Unit</th><th>Qty</th><th>Status</th></tr></thead>
                    <tbody>{filteredQ.map(q => (
                      <tr key={q.id} onClick={() => setModal({ type:'quote', data:q })}>
                        <td><span className="ref">{q.ref}</span></td>
                        <td className="nm"><b>{q.client_name}</b><span>{q.phone}</span></td>
                        <td>{q.unit_type}<br/><span className="muted" style={{fontSize:'.77rem'}}>{q.hp}</span></td>
                        <td>{q.quantity}</td>
                        <td><StatusBadge s={q.status}/></td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                ) : <Empty title="No quotation requests yet" msg="New-unit requests appear here." />}
              </div>
            </>
          )}

          {/* ─── OCULAR ─── */}
          {tab === 'ocular' && (
            <>
              <div className="stats">
                <Stat icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>} label="Total (real)" value={ocular.filter(o=>!o.is_test).length} />
                <Stat icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>} label="Pending" value={ocular.filter(o=>!o.is_test&&o.status==='Pending').length} />
                <Stat icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>} label="Scheduled" value={ocular.filter(o=>!o.is_test&&o.status==='Scheduled').length} />
                <Stat icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} label="Completed" value={ocular.filter(o=>!o.is_test&&o.status==='Completed').length} />
              </div>
              <div className="tablecard">
                {ocular.filter(o=>!o.is_test).length ? (
                  <div className="tbl-scroll"><table className="tbl">
                    <thead><tr><th>Ref</th><th>Client</th><th>Purpose</th><th>Preferred Date</th><th>Status</th></tr></thead>
                    <tbody>{ocular.filter(o=>!o.is_test).map(o => (
                      <tr key={o.id} onClick={() => setModal({ type:'ocular', data:o })}>
                        <td><span className="ref" style={{color:'#e65100'}}>{o.ref}</span></td>
                        <td className="nm"><b>{o.client_name}</b><span>{o.phone}</span></td>
                        <td style={{fontSize:'.85rem'}}>{o.purpose}</td>
                        <td>{fmtDate(o.schedule || o.pref_date)}<br/><span className="muted" style={{fontSize:'.77rem'}}>{o.pref_time}</span></td>
                        <td><OcularStatusBadge s={o.status}/></td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                ) : <Empty title="No ocular visit requests yet" msg="Ocular visit requests from the website will appear here." />}
              </div>
            </>
          )}

          {/* ─── CLIENTS ─── */}
          {tab === 'clients' && (
            <>
              <div className="toolbar">
                <div className="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input placeholder="Search name, phone, address…" value={cQ} onChange={e=>setCQ(e.target.value)}/></div>
                <span className="muted" style={{fontSize:'.85rem'}}>{clients.length} client{clients.length!==1?'s':''}</span>
              </div>
              <div style={{display:'grid',gap:14}}>
                {clients.length ? clients.map(c => {
                  const lb = c.lastBooking
                  const nextDate = lb?.next_service_date || (lb?.date ? addMonths(lb.date, 3) : null)
                  const nextIsOverdue = nextDate && nextDate < todayISO()
                  const nextIsSoon   = nextDate && !nextIsOverdue && nextDate <= addMonths(todayISO(), 1)
                  return (
                    <div key={c.phone} style={{background:'#fff',border:'1px solid var(--line)',borderRadius:'var(--r)',padding:'18px 20px'}}>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexWrap:'wrap',marginBottom:14}}>
                        <div>
                          <b style={{fontFamily:'var(--disp)',fontSize:'1.05rem'}}>{c.name}</b>
                          <div style={{display:'flex',gap:14,marginTop:4,flexWrap:'wrap'}}>
                            <a href={`tel:${c.phone}`} style={{color:'var(--brand)',fontWeight:600,fontSize:'.88rem'}}>{c.phone}</a>
                            {c.email && <span style={{color:'var(--slate)',fontSize:'.88rem'}}>{c.email}</span>}
                          </div>
                        </div>
                        <div style={{display:'flex',gap:8}}>
                          <span style={{background:'var(--ice)',color:'var(--navy)',borderRadius:20,padding:'.28em .7em',fontSize:'.78rem',fontWeight:600}}>{c.bookings} booking{c.bookings!==1?'s':''}</span>
                          <span style={{background:'var(--ice)',color:'var(--navy)',borderRadius:20,padding:'.28em .7em',fontSize:'.78rem',fontWeight:600}}>{c.quotes} quote{c.quotes!==1?'s':''}</span>
                        </div>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'10px 24px'}}>
                        <div>
                          <div style={{fontFamily:'var(--mono)',fontSize:'.67rem',letterSpacing:'.09em',textTransform:'uppercase',color:'var(--slate)',marginBottom:3}}>Address</div>
                          <div style={{fontSize:'.9rem',color:'var(--ink)'}}>{c.address||'—'}</div>
                        </div>
                        <div>
                          <div style={{fontFamily:'var(--mono)',fontSize:'.67rem',letterSpacing:'.09em',textTransform:'uppercase',color:'var(--slate)',marginBottom:3}}>Last service</div>
                          <div style={{fontSize:'.9rem',color:'var(--ink)'}}>{lb ? <>{fmtDate(lb.date)} <span style={{color:'var(--slate)',fontSize:'.82rem'}}>· {lb.service}</span></> : '—'}</div>
                        </div>
                        <div>
                          <div style={{fontFamily:'var(--mono)',fontSize:'.67rem',letterSpacing:'.09em',textTransform:'uppercase',color:'var(--slate)',marginBottom:3}}>Next recommended service</div>
                          <div style={{fontSize:'.9rem',display:'flex',alignItems:'center',gap:7}}>
                            {nextDate
                              ? <><span style={{color: nextIsOverdue ? 'var(--bad)' : nextIsSoon ? 'var(--warn)' : 'var(--ok)',fontWeight:600}}>{fmtDate(nextDate)}</span>
                                  <span style={{fontSize:'.72rem',padding:'.18em .5em',borderRadius:20,fontWeight:700,
                                    background: nextIsOverdue ? 'var(--bad-bg)' : nextIsSoon ? 'var(--warn-bg)' : 'var(--ok-bg)',
                                    color:      nextIsOverdue ? 'var(--bad)'    : nextIsSoon ? 'var(--warn)'    : 'var(--ok)'}}>
                                    {nextIsOverdue ? 'Overdue' : nextIsSoon ? 'Due soon' : 'Upcoming'}
                                  </span></>
                              : <span style={{color:'var(--slate)'}}>—</span>}
                          </div>
                        </div>
                        <div style={{gridColumn:'1 / -1'}}>
                          <div style={{fontFamily:'var(--mono)',fontSize:'.67rem',letterSpacing:'.09em',textTransform:'uppercase',color:'var(--slate)',marginBottom:3}}>Technician notes (last visit)</div>
                          <div style={{fontSize:'.88rem',color: lb?.tech_notes ? 'var(--ink)' : 'var(--slate-2)',
                            background:'var(--ice)',borderRadius:9,padding:'9px 12px',minHeight:38,lineHeight:1.5}}>
                            {lb?.tech_notes || <em>No notes yet — add them from the booking record after service.</em>}
                          </div>
                        </div>
                      </div>
                      {lb && (
                        <div style={{marginTop:12,textAlign:'right'}}>
                          <button className="btn btn-soft btn-sm" onClick={() => {
                            const bk = bookings.find(x=>x.id===lb.id)
                            if(bk) setModal({ type:'booking', data:bk })
                          }}>Open booking {lb.ref} →</button>
                        </div>
                      )}
                    </div>
                  )
                }) : <div className="tablecard"><Empty title="No clients yet" msg="Built automatically from bookings and quotation requests." /></div>}
              </div>
            </>
          )}

          {/* ─── CALENDAR ─── */}
          {tab === 'calendar' && (
            <>
              <div className="cal-head">
                <h3>{calRef.toLocaleDateString('en-PH',{month:'long',year:'numeric'})}</h3>
                <div className="cal-nav">
                  <button onClick={() => setCalRef(d=>new Date(d.getFullYear(),d.getMonth()-1,1))} aria-label="Previous">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <button className="btn btn-soft btn-sm" onClick={() => setCalRef(new Date())} style={{width:'auto',height:'auto'}}>Today</button>
                  <button onClick={() => setCalRef(d=>new Date(d.getFullYear(),d.getMonth()+1,1))} aria-label="Next">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              </div>
              <div className="calgrid">
                <div className="cal-week">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d}>{d}</div>)}</div>
                <div className="cal-days">{renderCal()}</div>
              </div>
              <p className="muted" style={{fontSize:'.82rem',marginTop:11}}>Click a day with scheduled jobs to see details. Test bookings are excluded.</p>
            </>
          )}

          {/* ─── SALES ANALYTICS ─── */}
          {tab === 'analytics' && (
            <>
              {/* KPI row */}
              <div className="stats">
                <Stat accent="#2563a8" label="Total Bookings" value={analytics.totalBookings}
                  sub="excluding test records"
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}/>
                <Stat accent="#16a34a" label="Completion Rate" value={`${analytics.compRate}%`}
                  sub={`${bookings.filter(b=>!b.is_test&&b.status==='Completed').length} completed`}
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}/>
                <Stat accent="#7c3aed" label="Quote Conversion" value={`${analytics.qRate}%`}
                  sub={`${analytics.totalQuotes} total requests`}
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>}/>
                <Stat accent="#d97706" label="Repeat Clients" value={analytics.repeatClients}
                  sub={`of ${analytics.totalClients} total`}
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>}/>
              </div>

              {/* second row: alerts */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginBottom:20}}>
                {/* Overdue */}
                <div style={{background: analytics.overdue>0 ? '#fef2f2':'#f0fdf4', border:`1px solid ${analytics.overdue>0?'#fca5a5':'#86efac'}`, borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', gap:14}}>
                  <div style={{fontSize:'1.8rem'}}>{analytics.overdue > 0 ? '⚠️' : '✅'}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:'1.05rem',color:analytics.overdue>0?'#dc2626':'#16a34a'}}>{analytics.overdue} Overdue</div>
                    <div style={{fontSize:'.8rem',color:'var(--slate)'}}>Bookings past schedule date without completion</div>
                  </div>
                </div>
                {/* Due soon */}
                <div style={{background:'#fff7ed',border:'1px solid #fdba74',borderRadius:12,padding:'16px 20px',display:'flex',alignItems:'center',gap:14}}>
                  <div style={{fontSize:'1.8rem'}}>🔔</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:'1.05rem',color:'#d97706'}}>{analytics.dueSoon} Due for service</div>
                    <div style={{fontSize:'.8rem',color:'var(--slate)'}}>Clients due for their next service within 30 days</div>
                  </div>
                </div>
                {/* Cancellation alert */}
                <div style={{background: analytics.cancelRate>20?'#fef2f2':'#f8fafc', border:`1px solid ${analytics.cancelRate>20?'#fca5a5':'var(--border)'}`,borderRadius:12,padding:'16px 20px',display:'flex',alignItems:'center',gap:14}}>
                  <div style={{fontSize:'1.8rem'}}>{analytics.cancelRate>20?'📉':'📊'}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:'1.05rem',color:analytics.cancelRate>20?'#dc2626':'var(--text)'}}>{analytics.cancelRate}% Cancellation Rate</div>
                    <div style={{fontSize:'.8rem',color:'var(--slate)'}}>{analytics.cancelRate>20?'High — review booking process':'Within normal range'}</div>
                  </div>
                </div>
              </div>

              {/* Charts row */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:16,marginBottom:20}}>

                {/* Bookings per month */}
                <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'20px'}}>
                  <div style={{fontFamily:'var(--disp)',fontWeight:700,marginBottom:4}}>Monthly Bookings</div>
                  <div style={{fontSize:'.78rem',color:'var(--slate)',marginBottom:14}}>Last 6 months — real records only</div>
                  <BarChart
                    data={analytics.months.map(m => ({ val: analytics.bookingsByMonth[m]?.total || 0, label: fmtMo(m).split(' ')[0] }))}
                    maxVal={Math.max(1, ...analytics.months.map(m => analytics.bookingsByMonth[m]?.total || 0))}
                    color="#2563a8" height={100}
                  />
                  {/* completed vs cancelled overlay */}
                  <div style={{marginTop:14,display:'flex',gap:16,flexWrap:'wrap'}}>
                    {[['Completed','#16a34a'],['Pending','#d97706'],['Cancelled','#dc2626']].map(([lbl,col])=>(
                      <div key={lbl} style={{display:'flex',alignItems:'center',gap:5,fontSize:'.75rem'}}>
                        <div style={{width:10,height:10,borderRadius:2,background:col}}/>
                        <span style={{color:'var(--slate)'}}>{lbl}: {analytics.months.reduce((acc,m)=>acc+(analytics.bookingsByMonth[m]?.[lbl.toLowerCase()]||0),0)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Service breakdown */}
                <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'20px'}}>
                  <div style={{fontFamily:'var(--disp)',fontWeight:700,marginBottom:4}}>Service Breakdown</div>
                  <div style={{fontSize:'.78rem',color:'var(--slate)',marginBottom:14}}>Which services are most requested</div>
                  {Object.keys(analytics.svcCounts).length ? (
                    <>
                      {Object.entries(analytics.svcCounts).sort((a,b)=>b[1]-a[1]).map(([svc,cnt],i) => {
                        const total = Object.values(analytics.svcCounts).reduce((a,b)=>a+b,0)
                        const pct = Math.round(cnt/total*100)
                        return (
                          <div key={svc} style={{marginBottom:10}}>
                            <div style={{display:'flex',justifyContent:'space-between',fontSize:'.82rem',marginBottom:4}}>
                              <span style={{fontWeight:600}}>{svc}</span>
                              <span style={{color:'var(--slate)'}}>{cnt} ({pct}%)</span>
                            </div>
                            <div style={{height:8,background:'var(--border)',borderRadius:4}}>
                              <div style={{height:'100%',width:`${pct}%`,background:SVC_COLORS[i%SVC_COLORS.length],borderRadius:4,transition:'width .4s'}}/>
                            </div>
                          </div>
                        )
                      })}
                    </>
                  ) : <div style={{color:'var(--slate)',fontSize:'.85rem',textAlign:'center',padding:'20px 0'}}>No data yet</div>}
                </div>

                {/* Work type breakdown */}
                <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'20px'}}>
                  <div style={{fontFamily:'var(--disp)',fontWeight:700,marginBottom:4}}>Work Type Mix</div>
                  <div style={{fontSize:'.78rem',color:'var(--slate)',marginBottom:14}}>Clean vs Repair vs Install breakdown</div>
                  {Object.keys(analytics.workCounts).length ? (
                    Object.entries(analytics.workCounts).sort((a,b)=>b[1]-a[1]).map(([w,cnt],i) => {
                      const total = Object.values(analytics.workCounts).reduce((a,b)=>a+b,0)
                      const pct = Math.round(cnt/total*100)
                      return (
                        <div key={w} style={{marginBottom:10}}>
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:'.82rem',marginBottom:4}}>
                            <span style={{fontWeight:600}}>{w}</span>
                            <span style={{color:'var(--slate)'}}>{cnt} ({pct}%)</span>
                          </div>
                          <div style={{height:8,background:'var(--border)',borderRadius:4}}>
                            <div style={{height:'100%',width:`${pct}%`,background:SVC_COLORS[(i+2)%SVC_COLORS.length],borderRadius:4,transition:'width .4s'}}/>
                          </div>
                        </div>
                      )
                    })
                  ) : <div style={{color:'var(--slate)',fontSize:'.85rem',textAlign:'center',padding:'20px 0'}}>No data yet</div>}
                </div>

                {/* Health gauges */}
                <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'20px'}}>
                  <div style={{fontFamily:'var(--disp)',fontWeight:700,marginBottom:4}}>Performance Health</div>
                  <div style={{fontSize:'.78rem',color:'var(--slate)',marginBottom:16}}>Key rate indicators</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,textAlign:'center'}}>
                    <div>
                      <DonutRing pct={analytics.compRate} color="#16a34a"/>
                      <div style={{fontSize:'.72rem',fontWeight:600,marginTop:4,color:'var(--slate)'}}>Completion</div>
                      <div style={{fontSize:'.65rem',color:'var(--slate-2)'}}>Target ≥ 80%</div>
                    </div>
                    <div>
                      <DonutRing pct={analytics.qRate} color="#7c3aed"/>
                      <div style={{fontSize:'.72rem',fontWeight:600,marginTop:4,color:'var(--slate)'}}>Quote Conv.</div>
                      <div style={{fontSize:'.65rem',color:'var(--slate-2)'}}>Target ≥ 40%</div>
                    </div>
                    <div>
                      <DonutRing pct={analytics.totalClients ? Math.round(analytics.repeatClients/analytics.totalClients*100) : 0} color="#d97706"/>
                      <div style={{fontSize:'.72rem',fontWeight:600,marginTop:4,color:'var(--slate)'}}>Retention</div>
                      <div style={{fontSize:'.65rem',color:'var(--slate-2)'}}>Repeat clients</div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Improvement tips */}
              <div style={{background:'linear-gradient(135deg,#eff6ff,#f0fdf4)',border:'1px solid #bfdbfe',borderRadius:12,padding:'20px 24px'}}>
                <div style={{fontFamily:'var(--disp)',fontWeight:700,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                  <span>💡</span> Continuous Improvement Tips
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:12}}>
                  {analytics.cancelRate > 20 && (
                    <div style={{background:'#fff',borderRadius:9,padding:'12px 14px',border:'1px solid #fca5a5'}}>
                      <div style={{fontWeight:700,color:'#dc2626',fontSize:'.88rem',marginBottom:4}}>📉 High cancellation rate ({analytics.cancelRate}%)</div>
                      <div style={{fontSize:'.8rem',color:'var(--slate)'}}>Consider SMS reminders 1 day before schedule. Follow up with cancelled clients to reschedule.</div>
                    </div>
                  )}
                  {analytics.dueSoon > 0 && (
                    <div style={{background:'#fff',borderRadius:9,padding:'12px 14px',border:'1px solid #fdba74'}}>
                      <div style={{fontWeight:700,color:'#d97706',fontSize:'.88rem',marginBottom:4}}>🔔 {analytics.dueSoon} clients due soon</div>
                      <div style={{fontSize:'.8rem',color:'var(--slate)'}}>Proactively call or message clients whose 3-month service is coming up. Re-book before they go elsewhere.</div>
                    </div>
                  )}
                  {analytics.qRate < 40 && analytics.totalQuotes > 3 && (
                    <div style={{background:'#fff',borderRadius:9,padding:'12px 14px',border:'1px solid #c4b5fd'}}>
                      <div style={{fontWeight:700,color:'#7c3aed',fontSize:'.88rem',marginBottom:4}}>📋 Low quote conversion ({analytics.qRate}%)</div>
                      <div style={{fontSize:'.8rem',color:'var(--slate)'}}>Follow up quotes within 48 hours. Consider offering a free delivery / installation promo to close more deals.</div>
                    </div>
                  )}
                  {analytics.compRate >= 80 && (
                    <div style={{background:'#fff',borderRadius:9,padding:'12px 14px',border:'1px solid #86efac'}}>
                      <div style={{fontWeight:700,color:'#16a34a',fontSize:'.88rem',marginBottom:4}}>✅ Strong completion rate ({analytics.compRate}%)</div>
                      <div style={{fontSize:'.8rem',color:'var(--slate)'}}>Your team is delivering consistently. Ask completed clients for a Google review to boost local SEO.</div>
                    </div>
                  )}
                  {analytics.repeatClients > 0 && (
                    <div style={{background:'#fff',borderRadius:9,padding:'12px 14px',border:'1px solid #bfdbfe'}}>
                      <div style={{fontWeight:700,color:'#2563a8',fontSize:'.88rem',marginBottom:4}}>🔄 {analytics.repeatClients} repeat client{analytics.repeatClients!==1?'s':''}</div>
                      <div style={{fontSize:'.8rem',color:'var(--slate)'}}>Loyal customers are your best source of referrals. Consider a "refer a friend" discount to grow your base.</div>
                    </div>
                  )}
                  {analytics.overdue > 0 && (
                    <div style={{background:'#fff',borderRadius:9,padding:'12px 14px',border:'1px solid #fca5a5'}}>
                      <div style={{fontWeight:700,color:'#dc2626',fontSize:'.88rem',marginBottom:4}}>⚠️ {analytics.overdue} overdue booking{analytics.overdue!==1?'s':''}</div>
                      <div style={{fontSize:'.8rem',color:'var(--slate)'}}>Address overdue jobs today — update status, reschedule, or cancel. Overdue records affect your completion rate.</div>
                    </div>
                  )}
                  {analytics.totalBookings === 0 && (
                    <div style={{background:'#fff',borderRadius:9,padding:'12px 14px',border:'1px solid var(--border)',gridColumn:'1/-1',textAlign:'center',color:'var(--slate)'}}>
                      No booking data yet. Analytics will populate as real customers book through your website.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ─── STAFF ─── */}
          {tab === 'staff' && user.role === 'admin' && (
            <>
              <div className="toolbar">
                <span className="muted" style={{flex:1,fontSize:'.9rem'}}>Admins have full access. Moderators manage bookings, quotations, clients and calendar.</span>
                <button className="btn btn-primary btn-sm" onClick={() => setModal({ type:'addStaff' })}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:15,height:15}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add moderator
                </button>
              </div>
              <div className="tablecard">
                <div className="tbl-scroll"><table className="tbl">
                  <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Added</th><th></th></tr></thead>
                  <tbody>{staff.map(s => (
                    <tr key={s.id} style={{cursor:'default'}}>
                      <td><b style={{fontFamily:'var(--disp)'}}>{s.name}</b>{s.username.startsWith('test')&&<span style={{marginLeft:6,fontSize:'.68rem',background:'#ffe0b2',color:'#e65100',borderRadius:4,padding:'1px 5px',fontWeight:700}}>TEST</span>}</td>
                      <td style={{fontFamily:'var(--mono)',fontSize:'.84rem'}}>{s.username}</td>
                      <td><span className={`role-badge role-${s.role}`}>{s.role}</span></td>
                      <td>{fmtDate((s.created_at||'').slice(0,10))}</td>
                      <td style={{textAlign:'right'}}>
                        <div style={{display:'flex',gap:6,justifyContent:'flex-end',flexWrap:'wrap'}}>
                          {s.id === user.id
                            ? <button className="btn btn-soft btn-sm" onClick={() => setModal({ type:'changePassword', data:s })}>Change my password</button>
                            : <>
                                {canChangePassword(user, s) && (
                                  <button className="btn btn-soft btn-sm" onClick={() => setModal({ type:'changePassword', data:s })}>Change password</button>
                                )}
                                {s.role !== 'admin' && user.role === 'admin' && (
                                  <button className="btn btn-danger btn-sm" onClick={() => setModal({ type:'confirmRemove', data:s })}>Remove</button>
                                )}
                              </>
                          }
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table></div>
              </div>
            </>
          )}

          {/* ─── DATA MANAGEMENT ─── */}
          {tab === 'settings' && user.role === 'admin' && (
            <>
              {/* Test data summary */}
              <div style={{background:'#fff7ed',border:'1px solid #fdba74',borderRadius:12,padding:'18px 22px',marginBottom:20}}>
                <div style={{fontFamily:'var(--disp)',fontWeight:700,fontSize:'1rem',marginBottom:6,color:'#92400e',display:'flex',alignItems:'center',gap:8}}>
                  <span>🧪</span> Test Data Summary
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:14}}>
                  {[
                    ['Test Bookings',   testCounts.bookings,   '#2563a8'],
                    ['Test Quotations', testCounts.quotations, '#7c3aed'],
                    ['Test Ocular',     testCounts.ocular,     '#e65100'],
                    ['Test Staff Users',testCounts.users,      '#dc2626'],
                  ].map(([label,count,color])=>(
                    <div key={label} style={{background:'#fff',borderRadius:9,padding:'12px 14px',border:'1px solid #fed7aa',textAlign:'center'}}>
                      <div style={{fontSize:'1.6rem',fontWeight:800,color: count>0?color:'var(--slate)'}}>{count}</div>
                      <div style={{fontSize:'.75rem',color:'var(--slate)',marginTop:2}}>{label}</div>
                    </div>
                  ))}
                </div>
                <div style={{fontSize:'.82rem',color:'#92400e'}}>
                  Test transactions are bookings/quotations/ocular records where <code style={{background:'#fff3e0',padding:'1px 5px',borderRadius:3}}>is_test = true</code>.
                  Test users are staff accounts whose username starts with <code style={{background:'#fff3e0',padding:'1px 5px',borderRadius:3}}>test</code>.
                </div>
              </div>

              {/* Delete test transactions */}
              <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'22px',marginBottom:16}}>
                <div style={{fontFamily:'var(--disp)',fontWeight:700,fontSize:'1rem',marginBottom:4}}>Delete Test Transactions</div>
                <div style={{fontSize:'.85rem',color:'var(--slate)',marginBottom:16,lineHeight:1.6}}>
                  Permanently removes all records marked as test data from the database. 
                  When creating test bookings through the website, tick the "This is a test" checkbox (if enabled), or use the toggle below to flag existing records.
                  This action <b>cannot be undone</b>.
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
                  {[
                    ['Bookings',   'bookings',   testCounts.bookings],
                    ['Quotations', 'quotations', testCounts.quotations],
                    ['Ocular',     'ocular',     testCounts.ocular],
                  ].map(([label, key, count]) => (
                    <button key={key}
                      className={`btn btn-sm ${count > 0 ? 'btn-danger' : 'btn-soft'}`}
                      disabled={count === 0}
                      onClick={() => setModal({ type:'deleteTest', target:key, count })}
                      style={{justifyContent:'center',gap:8}}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      Delete Test {label} {count > 0 ? `(${count})` : '(none)'}
                    </button>
                  ))}
                  <button
                    className={`btn btn-sm ${testCounts.bookings+testCounts.quotations+testCounts.ocular > 0 ? 'btn-danger' : 'btn-soft'}`}
                    disabled={testCounts.bookings+testCounts.quotations+testCounts.ocular === 0}
                    onClick={() => setModal({ type:'deleteTest', target:'all', count: testCounts.bookings+testCounts.quotations+testCounts.ocular })}
                    style={{justifyContent:'center',gap:8}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    Delete ALL Test Data ({testCounts.bookings+testCounts.quotations+testCounts.ocular})
                  </button>
                </div>
              </div>

              {/* Delete test users */}
              <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'22px',marginBottom:16}}>
                <div style={{fontFamily:'var(--disp)',fontWeight:700,fontSize:'1rem',marginBottom:4}}>Delete Test Staff Accounts</div>
                <div style={{fontSize:'.85rem',color:'var(--slate)',marginBottom:16,lineHeight:1.6}}>
                  Removes all non-admin staff accounts whose username starts with <code style={{background:'#f1f5f9',padding:'1px 6px',borderRadius:3}}>test</code> (e.g. <code style={{background:'#f1f5f9',padding:'1px 6px',borderRadius:3}}>test_user1</code>, <code style={{background:'#f1f5f9',padding:'1px 6px',borderRadius:3}}>testmoderator</code>).
                  Admin accounts are never deleted regardless of username.
                </div>
                {testCounts.users > 0 ? (
                  <>
                    <div style={{marginBottom:12}}>
                      {staff.filter(s=>s.role!=='admin'&&s.username.startsWith('test')).map(s=>(
                        <div key={s.id} style={{display:'inline-flex',alignItems:'center',gap:6,background:'#fff7ed',border:'1px solid #fdba74',borderRadius:20,padding:'.3em .8em',marginRight:7,marginBottom:7,fontSize:'.82rem'}}>
                          <span className={`role-badge role-${s.role}`}>{s.role}</span>
                          <b>{s.name}</b><span style={{color:'var(--slate)'}}>({s.username})</span>
                        </div>
                      ))}
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => setModal({ type:'deleteTestUsers', count: testCounts.users })}
                      style={{gap:8}}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="23" y2="14"/><line x1="23" y1="8" x2="17" y2="14"/></svg>
                      Delete {testCounts.users} test account{testCounts.users!==1?'s':''}
                    </button>
                  </>
                ) : (
                  <div style={{color:'var(--slate)',fontSize:'.85rem',padding:'10px 0'}}>
                    ✅ No test staff accounts found.
                  </div>
                )}
              </div>

              {/* Mark existing records as test */}
              <div style={{background:'#f8fafc',border:'1px solid var(--border)',borderRadius:12,padding:'22px'}}>
                <div style={{fontFamily:'var(--disp)',fontWeight:700,fontSize:'1rem',marginBottom:4}}>How to Mark Records as Test</div>
                <div style={{fontSize:'.85rem',color:'var(--slate)',lineHeight:1.7}}>
                  <b>Option 1 — From the booking/quotation detail modal:</b> Open any booking, quotation, or ocular record. 
                  At the bottom of the form there is a checkbox: <em>"Mark as test record"</em>. 
                  Check this to flag it. Save changes. The record will show a <b style={{color:'#e65100'}}>TEST</b> badge and will appear under the test data count above.<br/><br/>
                  <b>Option 2 — Via Supabase directly:</b> Run <code style={{background:'#f1f5f9',padding:'2px 6px',borderRadius:3,fontSize:'.8rem'}}>UPDATE goac_bookings SET is_test = true WHERE client_name ILIKE '%test%';</code> in the Supabase SQL editor.
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── MODALS ─── */}
      {modal?.type === 'booking' && <BookingModal b={modal.data} onClose={() => setModal(null)} onSave={saveBooking} onDelete={deleteBooking} />}
      {modal?.type === 'quote'   && <QuoteModal   q={modal.data} onClose={() => setModal(null)} onSave={saveQuote}   onDelete={deleteQuote}   />}
      {modal?.type === 'ocular'  && <OcularModal  o={modal.data} onClose={() => setModal(null)}
          onSave={async (id, patch) => {
            const { error } = await db.ocular().update(patch).eq('id', id)
            if (error) { addToast('Save failed', error.message, 'err'); return }
            await loadAll(); setModal(null); addToast('Ocular visit updated', '', 'ok')
          }}
          onDelete={async id => {
            const { error } = await db.ocular().delete().eq('id', id)
            if (error) { addToast('Delete failed', error.message, 'err'); return }
            await loadAll(); setModal(null); addToast('Record deleted', '', 'info')
          }}
        />}
      {modal?.type === 'dayDetail' && (
        <Modal onClose={() => setModal(null)}>
          <ModalHead title={fmtDate(modal.data.date)} onClose={() => setModal(null)} />
          <div className="modal-body">
            {modal.data.evs.map(b => (
              <div key={b.id} style={{border:'1px solid var(--line)',borderRadius:11,padding:'12px 14px',marginBottom:10,cursor:'pointer'}}
                onClick={() => setModal({ type:'booking', data:b })}>
                <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center'}}>
                  <b style={{fontFamily:'var(--disp)'}}>{b.client_name}</b><StatusBadge s={b.status}/>
                </div>
                <div className="muted" style={{fontSize:'.84rem',marginTop:3}}>{b.service} · {b.pref_time} · {b.phone}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {modal?.type === 'addStaff' && <AddStaffModal onClose={() => setModal(null)} onAdd={addModerator} />}
      {modal?.type === 'changePassword' && (
        <ChangePasswordModal target={modal.data} actor={user} onClose={() => setModal(null)} onSave={changePassword} />
      )}
      {modal?.type === 'confirmRemove' && (
        <Modal onClose={() => setModal(null)}>
          <ModalHead title={`Remove ${modal.data.name}?`} onClose={() => setModal(null)} />
          <div className="modal-body">
            <p className="muted" style={{marginBottom:18}}>They will no longer be able to log in to the dashboard.</p>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-soft" style={{flex:1}} onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-danger" style={{flex:1}} onClick={() => removeModerator(modal.data.id)}>Yes, remove</button>
            </div>
          </div>
        </Modal>
      )}
      {modal?.type === 'deleteTest' && (
        <Modal onClose={() => setModal(null)}>
          <ModalHead title="Confirm Delete Test Data" onClose={() => setModal(null)} />
          <div className="modal-body">
            <div style={{background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:9,padding:'14px',marginBottom:16,fontSize:'.88rem',color:'#dc2626',fontWeight:600}}>
              ⚠️ This will permanently delete {modal.data.count} test record{modal.data.count!==1?'s':''} from <b>{modal.data.target === 'all' ? 'all tables' : modal.data.target}</b>. This cannot be undone.
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-soft" style={{flex:1}} onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-danger" style={{flex:1}} onClick={() => deleteTestData(modal.data.target === 'all' ? ['bookings','quotations','ocular'] : [modal.data.target])}>
                Yes, delete permanently
              </button>
            </div>
          </div>
        </Modal>
      )}
      {modal?.type === 'deleteTestUsers' && (
        <Modal onClose={() => setModal(null)}>
          <ModalHead title="Delete Test Staff Accounts?" onClose={() => setModal(null)} />
          <div className="modal-body">
            <div style={{background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:9,padding:'14px',marginBottom:16,fontSize:'.88rem',color:'#dc2626',fontWeight:600}}>
              ⚠️ This will permanently remove {modal.data.count} staff account{modal.data.count!==1?'s':''} whose username starts with "test". Admin accounts are protected. This cannot be undone.
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-soft" style={{flex:1}} onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-danger" style={{flex:1}} onClick={deleteTestUsers}>Yes, delete accounts</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function BookingModal({ b, onClose, onSave, onDelete }) {
  const [status,      setStatus]      = useState(b.status)
  const [schedule,    setSchedule]    = useState(b.schedule || b.pref_date || '')
  const [time,        setTime]        = useState(b.pref_time || '')
  const [techNotes,   setTechNotes]   = useState(b.tech_notes || '')
  const [nextService, setNextService] = useState(b.next_service_date || '')
  const [isTest,      setIsTest]      = useState(b.is_test || false)

  const suggestNext = () => {
    const base = schedule || b.pref_date
    if (!base) return
    const d = new Date(base + 'T00:00:00'); d.setMonth(d.getMonth() + 3)
    setNextService(d.toISOString().slice(0, 10))
  }

  return (
    <Modal onClose={onClose} wide>
      <ModalHead title={b.client_name} sub={b.ref} onClose={onClose} />
      <div className="modal-body">
        {b.is_test && <div style={{background:'#fff3e0',border:'1px solid #ffcc80',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:'.82rem',color:'#bf360c',fontWeight:700}}>🧪 This is a test record</div>}
        <dl className="dl">
          <dt>Service</dt><dd>{b.service} — {b.work_type}</dd>
          <dt>Units</dt><dd>{b.units||1}{b.model ? ` · ${b.model}` : ''}</dd>
          <dt>Phone</dt><dd><a href={`tel:${b.phone}`}>{b.phone}</a></dd>
          {b.email && <><dt>Email</dt><dd>{b.email}</dd></>}
          <dt>Address</dt><dd>{b.address}</dd>
          <dt>Preferred</dt><dd>{b.pref_date ? `${b.pref_date} · ${b.pref_time||''}` : '—'}</dd>
          {b.notes && <><dt>Client notes</dt><dd>{b.notes}</dd></>}
          <dt>Booked</dt><dd>{new Date(b.created_at).toLocaleString('en-PH')}</dd>
        </dl>
        <div style={{height:1,background:'var(--line)',margin:'4px 0 16px'}}/>
        <div className="field"><label>Status</label>
          <select value={status} onChange={e=>setStatus(e.target.value)}>
            {['Pending','Confirmed','In Progress','Completed','Cancelled'].map(s=><option key={s}>{s}</option>)}
          </select>
          {status === 'Confirmed' && b.status !== 'Confirmed' && (
            <div style={{marginTop:7,padding:'8px 12px',background:'#e0ecfb',borderRadius:8,fontSize:'.82rem',color:'#1d5fb8',fontWeight:500}}>
              📧 {b.email ? <>A confirmation email will be sent to <b>{b.email}</b> when you save.</> : <>No email on file — confirmation email will <b>not</b> be sent.</>}
            </div>
          )}
        </div>
        <div className="frow">
          <div className="field"><label>Scheduled date</label><input type="date" value={schedule} onChange={e=>setSchedule(e.target.value)}/></div>
          <div className="field"><label>Time window</label><input value={time} onChange={e=>setTime(e.target.value)} placeholder="e.g. Morning"/></div>
        </div>
        <div style={{height:1,background:'var(--line)',margin:'4px 0 16px'}}/>
        <div className="field">
          <label>Technician notes <span style={{fontWeight:400,color:'var(--slate)',fontSize:'.8rem'}}>(after service)</span></label>
          <textarea value={techNotes} onChange={e=>setTechNotes(e.target.value)} placeholder="e.g. Cleaned filters, recharged freon 0.5kg, compressor running well." style={{minHeight:80}}/>
        </div>
        <div className="field">
          <label style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            Next recommended service date
            <button type="button" className="btn btn-soft btn-sm" onClick={suggestNext} style={{fontWeight:600,fontSize:'.75rem'}}>Auto (+3 months)</button>
          </label>
          <input type="date" value={nextService} onChange={e=>setNextService(e.target.value)}/>
          <div className="hint">Auto-filled as 3 months after the scheduled date. Shown on the client record.</div>
        </div>
        <div style={{height:1,background:'var(--line)',margin:'4px 0 14px'}}/>
        <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',fontSize:'.87rem',marginBottom:14,padding:'10px 12px',background:isTest?'#fff7ed':'#f8fafc',borderRadius:8,border:`1px solid ${isTest?'#fdba74':'var(--border)'}`}}>
          <input type="checkbox" checked={isTest} onChange={e=>setIsTest(e.target.checked)} style={{accentColor:'#e65100',width:16,height:16}}/>
          <span><b style={{color:isTest?'#bf360c':'var(--text)'}}>Mark as test record</b> — will appear in test data counts and can be bulk-deleted from Data Management</span>
        </label>
        <div style={{display:'flex',gap:10,marginTop:4}}>
          <button className="btn btn-primary" style={{flex:1}} onClick={() => onSave(b.id, { status, schedule: schedule||null, pref_time: time||null, tech_notes: techNotes||null, next_service_date: nextService||null, is_test: isTest })}>Save changes</button>
          <button className="btn btn-danger" onClick={() => onDelete(b.id)}>Delete</button>
        </div>
      </div>
    </Modal>
  )
}

function QuoteModal({ q, onClose, onSave, onDelete }) {
  const [status, setStatus] = useState(q.status)
  const [isTest, setIsTest] = useState(q.is_test || false)
  return (
    <Modal onClose={onClose} wide>
      <ModalHead title={q.client_name} sub={q.ref} onClose={onClose} />
      <div className="modal-body">
        {q.is_test && <div style={{background:'#fff3e0',border:'1px solid #ffcc80',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:'.82rem',color:'#bf360c',fontWeight:700}}>🧪 This is a test record</div>}
        <dl className="dl">
          <dt>Unit</dt><dd>{q.quantity}× {q.unit_type} · {q.hp}</dd>
          {q.brand  && <><dt>Brand</dt><dd>{q.brand}</dd></>}
          {q.budget && <><dt>Budget</dt><dd>{q.budget}</dd></>}
          <dt>Phone</dt><dd><a href={`tel:${q.phone}`}>{q.phone}</a></dd>
          {q.email  && <><dt>Email</dt><dd>{q.email}</dd></>}
          <dt>Address</dt><dd>{q.address}</dd>
          {q.notes  && <><dt>Notes</dt><dd>{q.notes}</dd></>}
          <dt>Requested</dt><dd>{new Date(q.created_at).toLocaleString('en-PH')}</dd>
        </dl>
        <div className="field"><label>Status</label>
          <select value={status} onChange={e=>setStatus(e.target.value)}>
            {['New','Quoted','Approved','Closed'].map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div style={{height:1,background:'var(--line)',margin:'4px 0 14px'}}/>
        <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',fontSize:'.87rem',marginBottom:14,padding:'10px 12px',background:isTest?'#fff7ed':'#f8fafc',borderRadius:8,border:`1px solid ${isTest?'#fdba74':'var(--border)'}`}}>
          <input type="checkbox" checked={isTest} onChange={e=>setIsTest(e.target.checked)} style={{accentColor:'#e65100',width:16,height:16}}/>
          <span><b style={{color:isTest?'#bf360c':'var(--text)'}}>Mark as test record</b></span>
        </label>
        <div style={{display:'flex',gap:10,marginTop:8}}>
          <button className="btn btn-primary" style={{flex:1}} onClick={() => onSave(q.id, { status, is_test: isTest })}>Save changes</button>
          <button className="btn btn-danger" onClick={() => onDelete(q.id)}>Delete</button>
        </div>
      </div>
    </Modal>
  )
}

function OcularModal({ o, onClose, onSave, onDelete }) {
  const [status,    setStatus]    = useState(o.status)
  const [schedule,  setSchedule]  = useState(o.schedule || o.pref_date || '')
  const [time,      setTime]      = useState(o.pref_time || '')
  const [techNotes, setTechNotes] = useState(o.tech_notes || '')
  const [isTest,    setIsTest]    = useState(o.is_test || false)

  const fmtDate = iso => { if (!iso) return '—'; const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) }

  return (
    <Modal onClose={onClose} wide>
      <ModalHead title={o.client_name} sub={o.ref} onClose={onClose} />
      <div className="modal-body">
        <div style={{background:'#fff3e0',border:'1px solid #ffe0b2',borderRadius:9,padding:'10px 14px',marginBottom:16,fontSize:'.88rem',color:'#bf360c',fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:17,height:17,flex:'none'}}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Ocular Visit Request{o.is_test ? ' · 🧪 Test record' : ''}
        </div>
        <dl className="dl">
          <dt>Purpose</dt><dd>{o.purpose}</dd>
          <dt>Phone</dt><dd><a href={`tel:${o.phone}`}>{o.phone}</a></dd>
          {o.email   && <><dt>Email</dt><dd>{o.email}</dd></>}
          <dt>Address</dt><dd>{o.address}</dd>
          <dt>Preferred</dt><dd>{o.pref_date ? `${fmtDate(o.pref_date)} · ${o.pref_time||''}` : '—'}</dd>
          {o.notes   && <><dt>Client notes</dt><dd>{o.notes}</dd></>}
          <dt>Requested</dt><dd>{new Date(o.created_at).toLocaleString('en-PH')}</dd>
        </dl>
        <div style={{height:1,background:'var(--line)',margin:'4px 0 16px'}}/>
        <div className="field"><label>Status</label>
          <select value={status} onChange={e=>setStatus(e.target.value)}>
            {['Pending','Scheduled','Completed','Cancelled'].map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="frow">
          <div className="field"><label>Scheduled visit date</label><input type="date" value={schedule} onChange={e=>setSchedule(e.target.value)}/></div>
          <div className="field"><label>Time window</label><input value={time} onChange={e=>setTime(e.target.value)} placeholder="e.g. Morning"/></div>
        </div>
        <div style={{height:1,background:'var(--line)',margin:'4px 0 16px'}}/>
        <div className="field">
          <label>Technician notes <span style={{fontWeight:400,color:'var(--slate)',fontSize:'.8rem'}}>(after the visit)</span></label>
          <textarea value={techNotes} onChange={e=>setTechNotes(e.target.value)} placeholder="e.g. 2-bedroom unit, recommending 1.5HP split-type per room." style={{minHeight:80}}/>
        </div>
        <div style={{height:1,background:'var(--line)',margin:'4px 0 14px'}}/>
        <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',fontSize:'.87rem',marginBottom:14,padding:'10px 12px',background:isTest?'#fff7ed':'#f8fafc',borderRadius:8,border:`1px solid ${isTest?'#fdba74':'var(--border)'}`}}>
          <input type="checkbox" checked={isTest} onChange={e=>setIsTest(e.target.checked)} style={{accentColor:'#e65100',width:16,height:16}}/>
          <span><b style={{color:isTest?'#bf360c':'var(--text)'}}>Mark as test record</b></span>
        </label>
        <div style={{display:'flex',gap:10,marginTop:4}}>
          <button className="btn btn-primary" style={{flex:1,background:'#e65100',boxShadow:'0 6px 16px rgba(230,81,0,.28)'}}
            onClick={() => onSave(o.id, { status, schedule: schedule||null, pref_time: time||null, tech_notes: techNotes||null, is_test: isTest })}>
            Save changes
          </button>
          <button className="btn btn-danger" onClick={() => onDelete(o.id)}>Delete</button>
        </div>
      </div>
    </Modal>
  )
}

function ChangePasswordModal({ target, actor, onClose, onSave }) {
  const [pass, setPass]       = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy]       = useState(false)
  const [err, setErr]         = useState('')
  const isSelf = actor.id === target.id
  const submit = async e => {
    e.preventDefault(); setErr('')
    if (pass.length < 6) { setErr('Password must be at least 6 characters.'); return }
    if (pass !== confirm) { setErr('Passwords do not match.'); return }
    setBusy(true); await onSave(target.id, pass); setBusy(false)
  }
  return (
    <Modal onClose={onClose}>
      <ModalHead title={isSelf ? 'Change your password' : `Change password — ${target.name}`} onClose={onClose} />
      <div className="modal-body">
        {!isSelf && (
          <div style={{background:'var(--warn-bg)',color:'var(--warn)',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:'.85rem'}}>
            Changing password for <b>{target.name}</b> <span className={`role-badge role-${target.role}`}>{target.role}</span>.
          </div>
        )}
        <form onSubmit={submit}>
          <div className="field"><label>New password <span className="req">*</span></label><input type="password" value={pass} onChange={e=>setPass(e.target.value)} required minLength={6} placeholder="Min 6 characters" autoFocus/></div>
          <div className="field"><label>Confirm new password <span className="req">*</span></label><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required minLength={6} placeholder="Re-enter password"/></div>
          {err && <div style={{color:'var(--danger)',fontSize:'.85rem',marginBottom:10}}>{err}</div>}
          <div style={{display:'flex',gap:10,marginTop:4}}>
            <button type="button" className="btn btn-soft" style={{flex:1}} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{flex:1}} disabled={busy}>{busy?'Saving…':'Update password'}</button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

function AddStaffModal({ onClose, onAdd }) {
  const [name, setName] = useState(''); const [user, setUser] = useState(''); const [pass, setPass] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async e => { e.preventDefault(); setBusy(true); await onAdd({ name:name.trim(), username:user.trim(), password:pass }); setBusy(false) }
  return (
    <Modal onClose={onClose}>
      <ModalHead title="Add a moderator" onClose={onClose} />
      <div className="modal-body">
        <form onSubmit={submit}>
          <div className="field"><label>Full name <span className="req">*</span></label><input value={name} onChange={e=>setName(e.target.value)} required placeholder="Maria Santos"/></div>
          <div className="field"><label>Username <span className="req">*</span></label><input value={user} onChange={e=>setUser(e.target.value)} required placeholder="maria" autoCapitalize="off"/></div>
          <div className="field"><label>Temporary password <span className="req">*</span></label><input type="password" value={pass} onChange={e=>setPass(e.target.value)} required minLength={6} placeholder="Min 6 characters"/></div>
          <div className="field"><label>Role</label><input value="Moderator" readOnly/><div className="hint">Only Admins can add staff. New accounts are Moderators.</div></div>
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy?'Adding…':'Create moderator account'}</button>
        </form>
      </div>
    </Modal>
  )
}
