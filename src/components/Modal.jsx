import { useEffect } from 'react'

export default function Modal({ onClose, children, wide }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' wide' : ''}`}>
        {children}
      </div>
    </div>
  )
}

export function ModalHead({ title, sub, onClose }) {
  return (
    <div className="modal-head">
      <div>
        <h3>{title}</h3>
        {sub && <span style={{ fontFamily: 'var(--mono)', fontSize: '.78rem', color: 'var(--brand)', fontWeight: 700 }}>{sub}</span>}
      </div>
      <button className="x" onClick={onClose} aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
        </svg>
      </button>
    </div>
  )
}
