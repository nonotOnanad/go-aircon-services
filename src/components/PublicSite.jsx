import { useState, useEffect } from 'react'
import { db } from '../supabaseClient.js'
import logoUrl from '../assets/logo.jpg'
import { GALLERY } from '../assets/gallery.js'

const PHONE_RE = /^09\d{9}$/

function genRef(prefix) {
  return prefix + '-' + (Math.floor(1000 + Math.random() * 9000))
}

const SERVICES = [
  { key: 'aircon', title: 'Aircon Maintenance', desc: 'Check-up & repair, cleaning, freon recharging, leak testing, dismantle, relocation and pull-down cleaning.', tags: ['Cleaning','Repair','Freon','Leak Test'], svc: 'Aircon Maintenance' },
  { key: 'newunit', title: 'Brand New Aircon Units', desc: 'Supply & installation of new units. Get a free written quotation tailored to your space.', tags: ['Window','Split','Inverter','Cassette'], feat: true },
  { key: 'washer', title: 'Washing Machine', desc: 'Deep cleaning, troubleshooting and repair for top-load and front-load machines.', tags: ['Deep Clean','Repair'], svc: 'Washing Machine Maintenance' },
  { key: 'fridge', title: 'Refrigerator Maintenance', desc: 'Diagnostics, cleaning and repair to keep your refrigerator cold and efficient.', tags: ['Diagnostics','Repair'], svc: 'Refrigerator Maintenance' },
]

const SVC_ICONS = {
  aircon:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="9" rx="2"/><line x1="5" y1="9.5" x2="19" y2="9.5"/><path d="M8 18c0-1.4 1-1.4 1-2.8"/><path d="M12 19c0-1.6 1-1.6 1-3.2"/><path d="M16 18c0-1.4 1-1.4 1-2.8"/></svg>,
  newunit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="9" rx="2"/><line x1="5" y1="10.5" x2="14" y2="10.5"/><path d="M19 2v6M16 5h6"/></svg>,
  washer:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2.5" width="16" height="19" rx="2.5"/><circle cx="12" cy="13" r="4.2"/><circle cx="7.5" cy="6" r=".9" fill="currentColor"/></svg>,
  fridge:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2.5" width="14" height="19" rx="2.5"/><line x1="5" y1="9.5" x2="19" y2="9.5"/><line x1="8.5" y1="5.5" x2="8.5" y2="7.5"/><line x1="8.5" y1="12.5" x2="8.5" y2="15.5"/></svg>,
}

const PhoneIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
const CheckIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>

const today = () => new Date().toISOString().slice(0, 10)

export default function PublicSite({ openLogin, addToast }) {
  const [navOpen, setNavOpen]       = useState(false)
  const [galFilter, setGalFilter]   = useState('All')
  const [lbIdx, setLbIdx]           = useState(null)
  const [bookForm, setBookForm]     = useState({ name:'',phone:'',email:'',address:'',service:'',work:'Cleaning',units:1,model:'',date:'',time:'',notes:'' })
  const [quoteForm, setQuoteForm]   = useState({ name:'',phone:'',email:'',address:'',unitType:'',hp:'',quantity:1,brand:'',budget:'',notes:'' })
  const [bookLoading, setBookLoading] = useState(false)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [refModal, setRefModal]     = useState(null)  // { ref, kind }

  const galCats = ['All', ...Array.from(new Set(GALLERY.map(g => g.cat)))]
  const galItems = galFilter === 'All' ? GALLERY : GALLERY.filter(g => g.cat === galFilter)

  const scrollTo = id => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setNavOpen(false) }

  const submitBooking = async e => {
    e.preventDefault()
    const phone = bookForm.phone.replace(/\s/g, '')
    if (!PHONE_RE.test(phone)) { addToast('Check mobile number', 'Use 11-digit format: 09171234567', 'err'); return }
    setBookLoading(true)
    const ref = genRef('GOAC')
    const payload = {
      ref, client_name: bookForm.name.trim(), phone,
      email: bookForm.email.trim() || null,
      address: bookForm.address.trim(),
      service: bookForm.service, work_type: bookForm.work,
      units: parseInt(bookForm.units) || 1,
      model: bookForm.model.trim() || null,
      pref_date: bookForm.date || null,
      pref_time: bookForm.time || null,
      schedule: bookForm.date || null,
      notes: bookForm.notes.trim() || null,
      status: 'Pending',
    }
    const { error } = await db.bookings().insert(payload)
    if (error) { setBookLoading(false); addToast('Booking failed', error.message, 'err'); return }

    // Notify GO Aircon business email
    fetch('/api/notify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'booking',
        ref, name: payload.client_name, phone, email: payload.email,
        address: payload.address, service: payload.service,
        work_type: payload.work_type, units: payload.units,
        model: payload.model, pref_date: payload.pref_date,
        pref_time: payload.pref_time, notes: payload.notes,
      }),
    }).catch(() => {}) // fire-and-forget — don't block the UI

    setBookLoading(false)
    setBookForm({ name:'',phone:'',email:'',address:'',service:'',work:'Cleaning',units:1,model:'',date:'',time:'',notes:'' })
    setRefModal({ ref, kind: 'booking' })
  }

  const submitQuote = async e => {
    e.preventDefault()
    const phone = quoteForm.phone.replace(/\s/g, '')
    if (!PHONE_RE.test(phone)) { addToast('Check mobile number', 'Use 11-digit format: 09171234567', 'err'); return }
    setQuoteLoading(true)
    const ref = genRef('GOAQ')
    const payload = {
      ref, client_name: quoteForm.name.trim(), phone,
      email: quoteForm.email.trim() || null,
      address: quoteForm.address.trim(),
      unit_type: quoteForm.unitType, hp: quoteForm.hp,
      quantity: parseInt(quoteForm.quantity) || 1,
      brand: quoteForm.brand.trim() || null,
      budget: quoteForm.budget || null,
      notes: quoteForm.notes.trim() || null,
      status: 'New',
    }
    const { error } = await db.quotations().insert(payload)
    if (error) { setQuoteLoading(false); addToast('Request failed', error.message, 'err'); return }

    // Notify GO Aircon business email
    fetch('/api/notify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'quotation',
        ref, name: payload.client_name, phone, email: payload.email,
        address: payload.address, unit_type: payload.unit_type,
        hp: payload.hp, quantity: payload.quantity,
        brand: payload.brand, budget: payload.budget, notes: payload.notes,
      }),
    }).catch(() => {}) // fire-and-forget

    setQuoteLoading(false)
    setQuoteForm({ name:'',phone:'',email:'',address:'',unitType:'',hp:'',quantity:1,brand:'',budget:'',notes:'' })
    setRefModal({ ref, kind: 'quote' })
  }

  const bf = (k, v) => setBookForm(f => ({ ...f, [k]: v }))
  const qf = (k, v) => setQuoteForm(f => ({ ...f, [k]: v }))

  return (
    <div id="site">
      {/* top strip */}
      <div className="topstrip">
        <div className="wrap">
          <div className="calls">
            <span className="lab">Call us</span>
            <a className="num" href="tel:09452536433">0945 253 6433</a>
            <a className="num" href="tel:09558958908">0955 895 8908</a>
            <a className="num" href="tel:09773851187">0977 385 1187</a>
          </div>
          <div className="hrs">Cleaning · Repair · Maintenance</div>
        </div>
      </div>

      {/* nav */}
      <nav className={`nav${navOpen ? ' open' : ''}`}>
        <div className="wrap">
          <a className="brand" href="#home" onClick={() => window.scrollTo(0,0)}>
            <span className="mark"><img src={logoUrl} alt="GO Aircon Services logo" /></span>
            <span><b>GO Aircon Services</b><small>Cleaning · Repair · Maintenance</small></span>
          </a>
          <div className="navlinks">
            <a onClick={() => scrollTo('services')}>Services</a>
            <a onClick={() => scrollTo('work')}>Our Work</a>
            <a onClick={() => scrollTo('book')}>Book a Service</a>
            <a onClick={() => scrollTo('quote')}>Get a Quote</a>
            <a onClick={() => scrollTo('contact')}>Contact</a>
          </div>
          <div className="nav-cta">
            <button className="btn btn-ghost btn-sm" onClick={openLogin}>Staff Login</button>
            <button className="btn btn-primary btn-sm" onClick={() => scrollTo('book')}>Book Now</button>
            <button className="menu-btn" onClick={() => setNavOpen(o => !o)} aria-label="Menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>
            </button>
          </div>
        </div>
      </nav>

      {/* hero */}
      <header className="hero" id="home">
        <div className="wrap">
          <div>
            <span className="eyebrow">Aircon · Washing Machine · Refrigerator</span>
            <h1>Beat the heat.<br /><span className="cool">Book cooling care</span> in minutes.</h1>
            <p className="lead">Maintenance, cleaning and repair for your aircon, washing machine and refrigerator — plus free quotations for brand-new aircon units.</p>
            <div className="cta-row">
              <button className="btn btn-primary" onClick={() => scrollTo('book')}>Book a Service</button>
              <button className="btn btn-frost" onClick={() => scrollTo('quote')}>Quote a New Unit</button>
            </div>
            <div className="trust">
              <span><CheckIcon /> No account needed to book</span>
              <span><CheckIcon /> Written quotations</span>
              <span><CheckIcon /> Scheduled home visits</span>
            </div>
          </div>
          <div className="panel">
            <div className="ptop"><span className="dot" /><b>GO · Comfort Control</b></div>
            <div className="dial">
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="9"/>
                <circle cx="60" cy="60" r="50" fill="none" stroke="#46c6ef" strokeWidth="9"
                  strokeLinecap="round" strokeDasharray="314" strokeDashoffset="86"
                  transform="rotate(-90 60 60)" style={{filter:'drop-shadow(0 0 6px rgba(70,198,239,.6))'}}/>
                <text x="60" y="56" textAnchor="middle" fill="#fff" fontFamily="Space Grotesk" fontSize="26" fontWeight="700">21°</text>
                <text x="60" y="76" textAnchor="middle" fill="#9fd5ee" fontFamily="Space Mono" fontSize="9" letterSpacing="2">COOL</text>
              </svg>
              <div>
                <div className="temp">Fast <small>service</small></div>
                <div className="sub">Tell us what needs attention.</div>
              </div>
            </div>
            <div className="pq">
              <span>What do you need today?</span>
              <div className="qgrid">
                {['Aircon Maintenance','Washing Machine Maintenance','Refrigerator Maintenance'].map(s => (
                  <button key={s} className="qbtn" onClick={() => { bf('service', s); scrollTo('book') }}>
                    {SVC_ICONS[s.includes('Air') ? 'aircon' : s.includes('Wash') ? 'washer' : 'fridge']}
                    {s.split(' ')[0]}
                  </button>
                ))}
                <button className="qbtn" onClick={() => scrollTo('quote')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  New Unit
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* services */}
      <section className="block" id="services">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Services offered</span>
            <h2>Everything that keeps your home cool & running</h2>
            <p>From routine cleaning to brand-new installations, here's what we take care of.</p>
          </div>
          <div className="svc-grid">
            {SERVICES.map(s => (
              <div key={s.key} className={`svc${s.feat ? ' feat' : ''}`}>
                <span className="ic">{SVC_ICONS[s.key]}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <div className="tags">{s.tags.map(t => <span key={t}>{t}</span>)}</div>
                {s.feat
                  ? <button className="btn btn-frost btn-sm" onClick={() => scrollTo('quote')}>Get a quote</button>
                  : <button className="btn btn-soft btn-sm" onClick={() => { bf('service', s.svc); scrollTo('book') }}>Book this service</button>
                }
              </div>
            ))}
          </div>
          <p className="svc-note">We accept <b>all types & brands</b> — Inverter or Non-inverter · Window Type · Split Type · Floor Mounted · Ceiling Cassette</p>
        </div>
      </section>

      {/* gallery */}
      <section className="block" id="work">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Our work · Malinis at pulido ang gawa</span>
            <h2>Real jobs, real results</h2>
            <p>Recent cleaning, repair and installation work by the GO Aircon Services team.</p>
          </div>
          <div className="gal-filters">
            {galCats.map(c => (
              <button key={c} className={`gal-chip${galFilter === c ? ' on' : ''}`} onClick={() => setGalFilter(c)}>
                {c === 'All' ? 'All work' : c}
              </button>
            ))}
          </div>
          <div className="gal-grid">
            {galItems.map((g, i) => (
              <div key={i} className="gal-item" onClick={() => setLbIdx(GALLERY.indexOf(g))}
                tabIndex={0} role="button" aria-label={g.cap}
                onKeyDown={e => e.key === 'Enter' && setLbIdx(GALLERY.indexOf(g))}>
                <span className="tagchip">{g.cat}</span>
                <img loading="lazy" src={g.src} alt={g.cap} />
                <div className="cap">{g.cap}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* book */}
      <section className="block" id="book">
        <div className="wrap two-up">
          <div className="info-aside">
            <span className="eyebrow">Book a service</span>
            <h3>Schedule a maintenance visit</h3>
            <p className="muted">Fill in the form and pick a preferred date. You'll get a reference number right away.</p>
            {[['Calendar','Pick your own date','Choose a day and time window that fits your schedule.'],
              ['Check','Get a reference number','Track your booking with a unique GOAC reference.'],
              ['Phone','We confirm before we come','A team member calls to lock the final schedule.']].map(([ic,title,desc]) => (
              <div key={title} className="why">
                <span className="wic">
                  {ic === 'Calendar' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>}
                  {ic === 'Check' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
                  {ic === 'Phone' && <PhoneIcon />}
                </span>
                <div><b>{title}</b><p>{desc}</p></div>
              </div>
            ))}
          </div>
          <div className="formcard">
            <h3>Service booking</h3>
            <p className="fsub">Aircon, washing machine & refrigerator maintenance.</p>
            <form onSubmit={submitBooking}>
              <div className="frow">
                <div className="field"><label>Full name <span className="req">*</span></label><input value={bookForm.name} onChange={e=>bf('name',e.target.value)} required placeholder="Juan Dela Cruz"/></div>
                <div className="field"><label>Mobile number <span className="req">*</span></label><input value={bookForm.phone} onChange={e=>bf('phone',e.target.value)} required placeholder="09XX XXX XXXX" inputMode="tel"/></div>
              </div>
              <div className="field"><label>Email (optional)</label><input type="email" value={bookForm.email} onChange={e=>bf('email',e.target.value)} placeholder="you@email.com"/></div>
              <div className="field"><label>Service address <span className="req">*</span></label><input value={bookForm.address} onChange={e=>bf('address',e.target.value)} required placeholder="House no., street, barangay, city"/></div>
              <div className="frow">
                <div className="field"><label>Service type <span className="req">*</span></label>
                  <select value={bookForm.service} onChange={e=>bf('service',e.target.value)} required>
                    <option value="">Choose a service…</option>
                    <option>Aircon Maintenance</option>
                    <option>Washing Machine Maintenance</option>
                    <option>Refrigerator Maintenance</option>
                  </select>
                </div>
                <div className="field"><label>Type of work</label>
                  <select value={bookForm.work} onChange={e=>bf('work',e.target.value)}>
                    <option>Cleaning</option>
                    <option>Check-up &amp; Repair</option>
                    <option>Freon Recharging</option>
                    <option>Aircon Leak Testing</option>
                    <option>Aircon Installation</option>
                    <option>Aircon Dismantle</option>
                    <option>Aircon Relocation</option>
                    <option>Pull-down Cleaning</option>
                  </select>
                </div>
              </div>
              <div className="frow">
                <div className="field"><label>Preferred date <span className="req">*</span></label><input type="date" value={bookForm.date} onChange={e=>bf('date',e.target.value)} min={today()} required/></div>
                <div className="field"><label>Preferred time <span className="req">*</span></label>
                  <select value={bookForm.time} onChange={e=>bf('time',e.target.value)} required>
                    <option value="">Choose…</option>
                    <option>Morning (8 AM – 12 NN)</option>
                    <option>Afternoon (1 PM – 5 PM)</option>
                  </select>
                </div>
              </div>
              <div className="frow">
                <div className="field"><label>No. of units</label><input type="number" min="1" value={bookForm.units} onChange={e=>bf('units',e.target.value)}/></div>
                <div className="field"><label>Brand / model (optional)</label><input value={bookForm.model} onChange={e=>bf('model',e.target.value)} placeholder="e.g. Carrier 1.5HP"/></div>
              </div>
              <div className="field"><label>Notes (optional)</label><textarea value={bookForm.notes} onChange={e=>bf('notes',e.target.value)} placeholder="Describe the issue or any special instructions…"/></div>
              <button className="btn btn-primary btn-block" type="submit" disabled={bookLoading}>{bookLoading ? 'Submitting…' : 'Submit booking'}</button>
            </form>
          </div>
        </div>
      </section>

      {/* quote */}
      <section className="block" id="quote">
        <div className="wrap two-up">
          <div className="formcard">
            <h3>Quotation request</h3>
            <p className="fsub">Brand-new aircon units — supply & installation.</p>
            <form onSubmit={submitQuote}>
              <div className="frow">
                <div className="field"><label>Full name <span className="req">*</span></label><input value={quoteForm.name} onChange={e=>qf('name',e.target.value)} required placeholder="Juan Dela Cruz"/></div>
                <div className="field"><label>Mobile number <span className="req">*</span></label><input value={quoteForm.phone} onChange={e=>qf('phone',e.target.value)} required placeholder="09XX XXX XXXX" inputMode="tel"/></div>
              </div>
              <div className="field"><label>Email (optional)</label><input type="email" value={quoteForm.email} onChange={e=>qf('email',e.target.value)} placeholder="you@email.com"/></div>
              <div className="field"><label>Installation address <span className="req">*</span></label><input value={quoteForm.address} onChange={e=>qf('address',e.target.value)} required placeholder="House no., street, barangay, city"/></div>
              <div className="frow">
                <div className="field"><label>Unit type <span className="req">*</span></label>
                  <select value={quoteForm.unitType} onChange={e=>qf('unitType',e.target.value)} required>
                    <option value="">Choose…</option>
                    <option>Window-type</option><option>Split-type (wall-mounted)</option>
                    <option>Inverter Split-type</option><option>Floor-mounted</option><option>Cassette / Ceiling</option>
                  </select>
                </div>
                <div className="field"><label>Capacity (HP) <span className="req">*</span></label>
                  <select value={quoteForm.hp} onChange={e=>qf('hp',e.target.value)} required>
                    <option value="">Choose…</option>
                    <option>0.75 HP</option><option>1.0 HP</option><option>1.5 HP</option><option>2.0 HP</option><option>2.5 HP+</option>
                  </select>
                </div>
              </div>
              <div className="frow">
                <div className="field"><label>Quantity <span className="req">*</span></label><input type="number" min="1" value={quoteForm.quantity} onChange={e=>qf('quantity',e.target.value)} required/></div>
                <div className="field"><label>Preferred brand (optional)</label><input value={quoteForm.brand} onChange={e=>qf('brand',e.target.value)} placeholder="e.g. Carrier, Panasonic, LG"/></div>
              </div>
              <div className="field"><label>Budget range (optional)</label>
                <select value={quoteForm.budget} onChange={e=>qf('budget',e.target.value)}>
                  <option value="">No preference</option>
                  <option>Below ₱25,000</option><option>₱25,000 – ₱40,000</option>
                  <option>₱40,000 – ₱60,000</option><option>Above ₱60,000</option>
                </select>
              </div>
              <div className="field"><label>Notes (optional)</label><textarea value={quoteForm.notes} onChange={e=>qf('notes',e.target.value)} placeholder="Room size, mounting location, timeline…"/></div>
              <button className="btn btn-frost btn-block" type="submit" disabled={quoteLoading}>{quoteLoading ? 'Submitting…' : 'Request quotation'}</button>
            </form>
          </div>
          <div className="info-aside">
            <span className="eyebrow">Brand new units</span>
            <h3>Get a free, no-obligation quote</h3>
            <p className="muted">Looking to install a new aircon? We'll prepare a written quotation including the unit, materials, and installation.</p>
            {[
              [<svg key="d" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="9" y1="13" x2="15" y2="13"/></svg>,'Itemised quotation','Clear breakdown so you know exactly what you\'re paying for.'],
              [<svg key="c" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,'Quick turnaround','We get back to you with options and pricing fast.'],
              [<svg key="h" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,'Supply & install','From sourcing the unit to mounting it properly at home.'],
            ].map(([ic,title,desc]) => (
              <div key={title} className="why"><span className="wic">{ic}</span><div><b>{title}</b><p>{desc}</p></div></div>
            ))}
          </div>
        </div>
      </section>

      {/* contact */}
      <section className="block" id="contact">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Get in touch</span>
            <h2>Talk to GO Aircon Services</h2>
            <p>Call any of our lines — we're happy to help you book or answer questions.</p>
          </div>
          <div className="contact-grid">
            <div className="call-cards">
              {[['Mobile / Globe','0945 253 6433','tel:09452536433'],['Mobile 2','0955 895 8908','tel:09558958908'],['Mobile 3','0977 385 1187','tel:09773851187']].map(([lab,num,href]) => (
                <a key={lab} className="call-card" href={href}>
                  <span className="cic"><PhoneIcon /></span>
                  <div><div className="lab">{lab}</div><div className="num">{num}</div></div>
                </a>
              ))}
            </div>
            <div className="contact-info">
              {[
                [<svg key="e" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/></svg>,'Email',<a href="mailto:go.aircon.services.business@gmail.com">go.aircon.services.business@gmail.com</a>],
                [<svg key="f" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>,'Facebook',<a href="https://www.facebook.com/go.aircon.services" target="_blank" rel="noopener">fb.com/go.aircon.services</a>],
                [<svg key="l" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,'Address','Blk 23 Lot 81 Gentree Villas, Pasong Kawayan 1, General Trias, Cavite'],
                [<svg key="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,'Service area','Parañaque · Las Piñas · Muntinlupa · Laguna · Cavite'],
              ].map(([ic,label,val]) => (
                <div key={label} className="row"><span>{ic}</span><div><b>{label}</b><span>{val}</span></div></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="footer">
        <div className="wrap">
          <div className="foot-brand">
            <img src={logoUrl} alt="GO Aircon Services" />
            <div>
              © {new Date().getFullYear()} GO Aircon Services · Cleaning · Repair · Maintenance<br />
              <span style={{color:'#6f93a9',fontSize:'.81rem'}}>General Trias, Cavite · <a href="https://www.facebook.com/go.aircon.services" target="_blank" rel="noopener">Facebook</a></span>
            </div>
          </div>
          <button className="staff-link" onClick={openLogin}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Staff / Admin Login
          </button>
        </div>
      </footer>

      {/* lightbox */}
      {lbIdx !== null && (
        <div className="modal-bg" onClick={() => setLbIdx(null)}>
          <div className="modal wide" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{GALLERY[lbIdx].cap}</h3>
              <button className="x" onClick={() => setLbIdx(null)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <img className="lb-img" src={GALLERY[lbIdx].src} alt={GALLERY[lbIdx].cap} />
              <p className="muted" style={{marginTop:10,fontSize:'.83rem'}}>{GALLERY[lbIdx].cat} · GO Aircon Services</p>
            </div>
          </div>
        </div>
      )}

      {/* ref confirmation modal */}
      {refModal && (
        <div className="modal-bg" onClick={() => setRefModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{refModal.kind === 'booking' ? "You're booked 🎉" : 'Request sent ✅'}</h3>
              <button className="x" onClick={() => setRefModal(null)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="muted" style={{marginBottom:14}}>
                {refModal.kind === 'booking'
                  ? 'We received your booking request. Keep your reference number — our team will call to confirm the schedule.'
                  : 'We\'ll prepare a written quotation and contact you with options and pricing soon.'}
              </p>
              <div className="login-hint" style={{textAlign:'center'}}>
                <span className="muted" style={{fontSize:'.75rem',letterSpacing:'.1em',textTransform:'uppercase'}}>Reference number</span><br/>
                <b style={{fontSize:'1.5rem',color: refModal.kind === 'booking' ? 'var(--brand)' : 'var(--frost-d)'}}>{refModal.ref}</b>
              </div>
              <button className="btn btn-primary btn-block" style={{marginTop:16}} onClick={() => setRefModal(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
