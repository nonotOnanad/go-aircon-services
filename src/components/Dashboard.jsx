import { useState, useCallback, useEffect } from 'react'
import { db } from '../supabaseClient.js'
import logoUrl from '../assets/logo.jpg'
import Modal, { ModalHead } from './Modal.jsx'

const fmtDate = iso => { if (!iso) return '—'; const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) }
const fmtDT   = iso => { if (!iso) return '—'; return new Date(iso).toLocaleString('en-PH') }
const todayISO = () => new Date().toISOString().slice(0, 10)
const initials = n => (n||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase()

const TABS = [
  { key:'bookings',  label:'Bookings',          icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  { key:'quotes',    label:'Quotations',         icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="9" y1="13" x2="15" y2="13"/></svg> },
  { key:'clients',   label:'Clients',            icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { key:'calendar',  label:'Calendar',           icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg> },
  { key:'staff',     label:'Staff Management',   icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>, adminOnly: true },
]

const BSTATUS = ['Pending','Confirmed','In Progress','Completed','Cancelled']
const QSTATUS = ['New','Quoted','Approved','Closed']

function StatusBadge({ s }) {
  const map = { Pending:'b-pending', Confirmed:'b-confirmed', 'In Progress':'b-progress', Completed:'b-completed', Cancelled:'b-cancelled', New:'b-new', Quoted:'b-quoted', Approved:'b-approved', Closed:'b-closed' }
  return <span className={`badge ${map[s]||'b-pending'}`}>{s}</span>
}

function Stat({ icon, label, value }) {
  return (
    <div className="stat">
      <div className="lab">{icon}{label}</div>
      <div className="val">{value}</div>
    </div>
  )
}

export default function Dashboard({ user, logout, addToast }) {
  const [tab, setTab]           = useState('bookings')
  const [sideOpen, setSideOpen] = useState(false)
  const [bookings, setBookings] = useState([])
  const [quotes, setQuotes]     = useState([])
  const [staff, setStaff]       = useState([])
  const [loading, setLoading]   = useState(false)
  const [modal, setModal]       = useState(null)  // { type, data }
  const [calRef, setCalRef]     = useState(new Date())
  const [bQ, setBQ]             = useState(''); const [bStatus, setBStatus] = useState('')
  const [qQ, setQQ]             = useState(''); const [qStatus, setQStatus] = useState('')
  const [cQ, setCQ]             = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [{ data: b }, { data: q }, { data: s }] = await Promise.all([
      db.bookings().select('*').order('created_at', { ascending: false }),
      db.quotations().select('*').order('created_at', { ascending: false }),
      db.staff().select('*').order('created_at'),
    ])
    setBookings(b || []); setQuotes(q || []); setStaff(s || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ---- Bookings ----
  const filteredB = bookings.filter(b => {
    if (bStatus && b.status !== bStatus) return false
    if (bQ) { const q = bQ.toLowerCase(); return (b.client_name+b.phone+b.ref+b.service+b.address).toLowerCase().includes(q) }
    return true
  })

  const saveBooking = async (id, patch) => {
    const { error } = await db.bookings().update(patch).eq('id', id)
    if (error) { addToast('Save failed', error.message, 'err'); return }
    await loadAll(); setModal(null)
    addToast('Booking updated', '', 'ok')
  }

  const deleteBooking = async id => {
    const { error } = await db.bookings().delete().eq('id', id)
    if (error) { addToast('Delete failed', error.message, 'err'); return }
    await loadAll(); setModal(null); addToast('Booking deleted', '', 'info')
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
  const clientMap = {}
  bookings.forEach(b => {
    const k = b.phone; if (!clientMap[k]) clientMap[k] = { name: b.client_name, phone: b.phone, email: b.email, bookings: 0, quotes: 0, last: b.created_at }
    clientMap[k].bookings++; if (b.created_at > clientMap[k].last) clientMap[k].last = b.created_at
  })
  quotes.forEach(q => {
    const k = q.phone; if (!clientMap[k]) clientMap[k] = { name: q.client_name, phone: q.phone, email: q.email, bookings: 0, quotes: 0, last: q.created_at }
    clientMap[k].quotes++; if (q.created_at > clientMap[k].last) clientMap[k].last = q.created_at
  })
  const clients = Object.values(clientMap).sort((a, b) => (b.last||'').localeCompare(a.last||''))
    .filter(c => !cQ || (c.name+c.phone+(c.email||'')).toLowerCase().includes(cQ.toLowerCase()))

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

  // ---- Calendar ----
  const calByDate = {}
  bookings.forEach(b => { const d = b.schedule || b.pref_date; if (d) { (calByDate[d] = calByDate[d] || []).push(b) } })

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

  // ---- Render tabs ----
  const PanelIcon = ({ k }) => TABS.find(t=>t.key===k)?.icon

  const tabs = TABS.filter(t => !t.adminOnly || user.role === 'admin')

  return (
    <div className="app-shell">
      {/* sidebar backdrop mobile */}
      <div className={`sideback${sideOpen?' show':''}`} onClick={() => setSideOpen(false)} />

      {/* sidebar */}
      <aside className={`side${sideOpen?' show':''}`}>
        <div className="sbrand">
          <span className="mark"><img src={logoUrl} alt="logo" /></span>
          <div><b>GO Aircon</b><br/><small>Operations</small></div>
        </div>
        <nav className="navi">
          {tabs.map(t => (
            <button key={t.key} className={`navi-btn${tab===t.key?' active':''}`} onClick={() => { setTab(t.key); setSideOpen(false) }}>
              {t.icon}<span>{t.label}</span>
              {t.key==='bookings' && <span className="cnt">{bookings.length}</span>}
              {t.key==='quotes'   && <span className="cnt">{quotes.length}</span>}
            </button>
          ))}
        </nav>
        <div className="spacer" />
        <button className="side-foot-btn" onClick={() => { setSideOpen(false); window.scrollTo(0,0) }}
          style={{marginBottom:5}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          View website
        </button>
        <button className="side-foot-btn" onClick={logout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Log out
        </button>
      </aside>

      {/* main */}
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

          {/* BOOKINGS */}
          {tab === 'bookings' && (
            <>
              <div className="stats">
                <Stat icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>} label="Total" value={bookings.length} />
                <Stat icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>} label="Pending" value={bookings.filter(b=>b.status==='Pending').length} />
                <Stat icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>} label="Upcoming" value={bookings.filter(b=>(b.schedule||b.pref_date)>=todayISO()&&b.status!=='Cancelled'&&b.status!=='Completed').length} />
                <Stat icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} label="Completed" value={bookings.filter(b=>b.status==='Completed').length} />
              </div>
              <div className="toolbar">
                <div className="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input placeholder="Search name, phone, ref…" value={bQ} onChange={e=>setBQ(e.target.value)}/></div>
                <select value={bStatus} onChange={e=>setBStatus(e.target.value)}>
                  <option value="">All statuses</option>{BSTATUS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="tablecard">
                {filteredB.length ? (
                  <div className="tbl-scroll"><table className="tbl">
                    <thead><tr><th>Ref</th><th>Client</th><th>Service</th><th>Schedule</th><th>Status</th></tr></thead>
                    <tbody>{filteredB.map(b => (
                      <tr key={b.id} onClick={() => setModal({ type:'booking', data:b })}>
                        <td><span className="ref">{b.ref}</span></td>
                        <td className="nm"><b>{b.client_name}</b><span>{b.phone}</span></td>
                        <td>{b.service}<br/><span className="muted" style={{fontSize:'.77rem'}}>{b.work_type}</span></td>
                        <td>{fmtDate(b.schedule||b.pref_date)}<br/><span className="muted" style={{fontSize:'.77rem'}}>{b.pref_time}</span></td>
                        <td><StatusBadge s={b.status}/></td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                ) : <Empty title="No bookings yet" msg="Bookings from the website appear here automatically." />}
              </div>
            </>
          )}

          {/* QUOTES */}
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

          {/* CLIENTS */}
          {tab === 'clients' && (
            <>
              <div className="toolbar">
                <div className="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input placeholder="Search clients…" value={cQ} onChange={e=>setCQ(e.target.value)}/></div>
                <span className="muted" style={{fontSize:'.85rem'}}>{clients.length} client{clients.length!==1?'s':''}</span>
              </div>
              <div className="tablecard">
                {clients.length ? (
                  <div className="tbl-scroll"><table className="tbl">
                    <thead><tr><th>Client</th><th>Email</th><th>Bookings</th><th>Quotes</th><th>Last activity</th></tr></thead>
                    <tbody>{clients.map(c => (
                      <tr key={c.phone} style={{cursor:'default'}}>
                        <td className="nm"><b>{c.name}</b><span><a href={`tel:${c.phone}`} style={{color:'var(--brand)'}}>{c.phone}</a></span></td>
                        <td>{c.email||'—'}</td>
                        <td><b style={{fontFamily:'var(--disp)'}}>{c.bookings}</b></td>
                        <td><b style={{fontFamily:'var(--disp)'}}>{c.quotes}</b></td>
                        <td>{fmtDate((c.last||'').slice(0,10))}</td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                ) : <Empty title="No clients yet" msg="Built automatically from bookings and quotation requests." />}
              </div>
            </>
          )}

          {/* CALENDAR */}
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
              <p className="muted" style={{fontSize:'.82rem',marginTop:11}}>Click a day with scheduled jobs to see details.</p>
            </>
          )}

          {/* STAFF */}
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
                      <td><b style={{fontFamily:'var(--disp)'}}>{s.name}</b></td>
                      <td style={{fontFamily:'var(--mono)',fontSize:'.84rem'}}>{s.username}</td>
                      <td><span className={`role-badge role-${s.role}`}>{s.role}</span></td>
                      <td>{fmtDate((s.created_at||'').slice(0,10))}</td>
                      <td style={{textAlign:'right'}}>
                        {s.id === user.id ? <span className="muted" style={{fontSize:'.77rem'}}>You</span>
                          : s.role === 'admin' ? <span className="muted" style={{fontSize:'.77rem'}}>—</span>
                          : <button className="btn btn-danger btn-sm" onClick={() => setModal({ type:'confirmRemove', data:s })}>Remove</button>}
                      </td>
                    </tr>
                  ))}</tbody>
                </table></div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODALS */}
      {modal?.type === 'booking' && <BookingModal b={modal.data} onClose={() => setModal(null)} onSave={saveBooking} onDelete={deleteBooking} />}
      {modal?.type === 'quote'   && <QuoteModal   q={modal.data} onClose={() => setModal(null)} onSave={saveQuote}   onDelete={deleteQuote}   />}
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

function BookingModal({ b, onClose, onSave, onDelete }) {
  const [status,   setStatus]   = useState(b.status)
  const [schedule, setSchedule] = useState(b.schedule || b.pref_date || '')
  const [time,     setTime]     = useState(b.pref_time || '')
  return (
    <Modal onClose={onClose} wide>
      <ModalHead title={b.client_name} sub={b.ref} onClose={onClose} />
      <div className="modal-body">
        <dl className="dl">
          <dt>Service</dt><dd>{b.service} — {b.work_type}</dd>
          <dt>Units</dt><dd>{b.units||1}{b.model ? ` · ${b.model}` : ''}</dd>
          <dt>Phone</dt><dd><a href={`tel:${b.phone}`}>{b.phone}</a></dd>
          {b.email && <><dt>Email</dt><dd>{b.email}</dd></>}
          <dt>Address</dt><dd>{b.address}</dd>
          <dt>Preferred</dt><dd>{b.pref_date ? `${b.pref_date} · ${b.pref_time||''}` : '—'}</dd>
          {b.notes && <><dt>Notes</dt><dd>{b.notes}</dd></>}
          <dt>Booked</dt><dd>{new Date(b.created_at).toLocaleString('en-PH')}</dd>
        </dl>
        <div className="field"><label>Status</label>
          <select value={status} onChange={e=>setStatus(e.target.value)}>
            {['Pending','Confirmed','In Progress','Completed','Cancelled'].map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="frow">
          <div className="field"><label>Scheduled date</label><input type="date" value={schedule} onChange={e=>setSchedule(e.target.value)}/></div>
          <div className="field"><label>Time window</label><input value={time} onChange={e=>setTime(e.target.value)} placeholder="e.g. Morning"/></div>
        </div>
        <div style={{display:'flex',gap:10,marginTop:8}}>
          <button className="btn btn-primary" style={{flex:1}} onClick={() => onSave(b.id, { status, schedule: schedule||null, pref_time: time||null })}>Save changes</button>
          <button className="btn btn-danger" onClick={() => onDelete(b.id)}>Delete</button>
        </div>
      </div>
    </Modal>
  )
}

function QuoteModal({ q, onClose, onSave, onDelete }) {
  const [status, setStatus] = useState(q.status)
  return (
    <Modal onClose={onClose} wide>
      <ModalHead title={q.client_name} sub={q.ref} onClose={onClose} />
      <div className="modal-body">
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
        <div style={{display:'flex',gap:10,marginTop:8}}>
          <button className="btn btn-primary" style={{flex:1}} onClick={() => onSave(q.id, { status })}>Save changes</button>
          <button className="btn btn-danger" onClick={() => onDelete(q.id)}>Delete</button>
        </div>
      </div>
    </Modal>
  )
}

function AddStaffModal({ onClose, onAdd }) {
  const [name, setName]     = useState('')
  const [user, setUser]     = useState('')
  const [pass, setPass]     = useState('')
  const [busy, setBusy]     = useState(false)
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
