import { useState, useEffect } from 'react'
import { getAllSessions, deleteSession, clearAllSessions, getAIEnabled, setAIEnabled, getStudyOpen, setStudyOpen } from '../utils/storage'
import { generateCSV, downloadCSV } from '../utils/csvExport'
import { contracts } from '../data/contracts'
import ResultsReview from './ResultsReview'

function exportAll(sessions) {
  if (sessions.length === 0) return
  const rows = sessions.map(s =>
    generateCSV(s.participantId, s.backgroundAnswers, s.contractOrder, s.contractResults, s.sessionSeed)
  )
  const header = rows[0].split('\n')[0]
  const dataRows = rows.map(r => r.split('\n').slice(1).join('\n')).filter(Boolean)
  const combined = [header, ...dataRows].join('\n')
  downloadCSV(combined, `proxyscope_all_${new Date().toISOString().slice(0, 10)}.csv`)
}

function exportSingle(session) {
  const csv = generateCSV(
    session.participantId,
    session.backgroundAnswers,
    session.contractOrder,
    session.contractResults,
    session.sessionSeed
  )
  downloadCSV(csv, `proxyscope_${session.participantId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.csv`)
}

function avgTime(sessions, contractId) {
  const times = sessions
    .map(s => s.contractResults?.[contractId]?.timeSpent)
    .filter(t => t !== undefined && t !== null && t !== '')
    .map(Number).filter(n => !isNaN(n))
  if (times.length === 0) return '—'
  return Math.round(times.reduce((a, b) => a + b, 0) / times.length) + 's'
}

function avgDifficulty(sessions, contractId) {
  const vals = sessions
    .map(s => s.contractResults?.[contractId]?.answers?.difficulty)
    .filter(v => v !== undefined && v !== null && v !== '')
    .map(Number).filter(n => !isNaN(n))
  if (vals.length === 0) return '—'
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
}

function exportJSON(sessions) {
  const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `proxyscope_backup_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const BG_LABELS = {
  years_programming: 'Years programming',
  years_professional: 'Years professional',
  solidity_experience: 'Solidity experience',
  proxy_experience: 'Proxy pattern experience',
  peer_experience: 'Peer review experience',
  occupation: 'Occupation',
  blockchain_familiarity: 'Blockchain familiarity',
}

const apiKeyConfigured = !!import.meta.env.VITE_GROQ_KEY && import.meta.env.VITE_GROQ_KEY !== 'your_groq_api_key_here'

function TogglePill({ label, enabled, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
      <span>{label}</span>
      <button
        onClick={() => onChange(!enabled)}
        style={{
          position: 'relative', width: '40px', height: '22px', borderRadius: '11px',
          border: 'none', cursor: 'pointer', padding: 0,
          background: enabled ? 'var(--primary)' : 'var(--border-strong)', transition: 'background 0.2s',
        }}
      >
        <span style={{
          position: 'absolute', top: '3px', left: enabled ? '21px' : '3px',
          width: '16px', height: '16px', borderRadius: '50%', background: 'white',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
      <span style={{ color: enabled ? 'var(--primary-text)' : 'var(--text-muted)', fontWeight: 600 }}>
        {enabled ? 'ON' : 'OFF'}
      </span>
    </div>
  )
}

function AdminPanel() {
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [reviewSession, setReviewSession] = useState(null)
  const [aiEnabled, setAIEnabledState] = useState(() => getAIEnabled())
  const [studyOpen, setStudyOpenState] = useState(() => getStudyOpen())

  useEffect(() => { getAllSessions().then(setSessions) }, [])

  function refresh() { getAllSessions().then(setSessions) }

  function handleAIToggle(val) {
    setAIEnabled(val)
    setAIEnabledState(val)
  }

  function handleStudyToggle(val) {
    setStudyOpen(val)
    setStudyOpenState(val)
  }

  async function handleDelete(participantId) {
    await deleteSession(participantId)
    refresh()
    if (selectedSession && selectedSession.participantId === participantId) {
      setSelectedSession(null)
    }
    setDeleteConfirm(null)
  }

  async function handleClearAll() {
    await clearAllSessions()
    refresh()
    setSelectedSession(null)
    setConfirmClear(false)
  }

  // --- Detail View ---
  if (selectedSession) {
    const s = selectedSession
    return (
      <div className="admin-panel">
        <div style={{ marginBottom: '1.5rem' }}>
          <button className="btn-secondary" onClick={() => setSelectedSession(null)}>
            &#8592; Back to list
          </button>
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          Participant {s.participantId}
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          {s.timestamp ? new Date(s.timestamp).toLocaleString() : '—'}
        </p>

        {/* Background Questionnaire */}
        <section style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            Background Questionnaire
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <tbody>
              {Object.entries(BG_LABELS).map(([key, label]) => (
                <tr key={key}>
                  <td style={{ padding: '0.4rem 0.75rem', fontWeight: 600, color: 'var(--text-secondary)', width: '40%', borderBottom: '1px solid var(--border)' }}>{label}</td>
                  <td style={{ padding: '0.4rem 0.75rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
                    {s.backgroundAnswers && s.backgroundAnswers[key] !== undefined ? String(s.backgroundAnswers[key]) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Contract Results */}
        <section style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            Contract Results
          </h3>
          {s.contractOrder && s.contractOrder.map((contractId) => {
            const result = s.contractResults && s.contractResults[contractId]
            const contract = contracts[contractId]
            return (
              <div key={contractId} style={{ marginBottom: '1.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {contract ? contract.label : `Contract ${contractId}`}
                  </strong>
                  {result && result.timerExpired && (
                    <span className="expired-badge">Timer expired</span>
                  )}
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Time spent: {result && result.timeSpent !== undefined ? `${result.timeSpent}s` : '—'}
                </p>
                {result && result.variedCode && (
                  <details style={{ marginBottom: '0.75rem' }}>
                    <summary style={{ fontSize: '0.8rem', color: 'var(--primary-text)', cursor: 'pointer', userSelect: 'none', marginBottom: '0.5rem' }}>
                      View contract shown to participant
                    </summary>
                    <pre style={{ background: '#1e1e1e', color: '#d4d4d4', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.78rem', overflowX: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.5, margin: 0 }}>
                      {result.variedCode}
                    </pre>
                  </details>
                )}
                {result && result.answers && contract && contract.questions && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <tbody>
                      {contract.questions.map((q) => (
                        <tr key={q.id}>
                          <td style={{ padding: '0.35rem 0.5rem', fontWeight: 600, color: 'var(--text-secondary)', width: '55%', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                            {q.prompt}
                          </td>
                          <td style={{ padding: '0.35rem 0.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                            {result.answers[q.id] !== undefined ? String(result.answers[q.id]) : '—'}
                          </td>
                        </tr>
                      ))}
                      {result.answers['difficulty'] !== undefined && (
                        <tr>
                          <td style={{ padding: '0.35rem 0.5rem', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                            Difficulty rating
                          </td>
                          <td style={{ padding: '0.35rem 0.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                            {String(result.answers['difficulty'])}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
        </section>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => exportSingle(s)}>
            Export this participant (CSV)
          </button>
          <button className="btn-secondary" onClick={() => setReviewSession(s)}>
            Review Answers
          </button>
        </div>

        {reviewSession && reviewSession.participantId === s.participantId && (
          <ResultsReview
            contractOrder={s.contractOrder}
            contractResults={s.contractResults}
            onClose={() => setReviewSession(null)}
          />
        )}
      </div>
    )
  }

  // --- List View ---
  return (
    <div className="admin-panel">
      {/* Header */}
      <div className="admin-header">
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          ProxyScope &mdash; Admin Panel
        </h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <a
            href="#"
            onClick={() => { window.location.hash = '' }}
            style={{ fontSize: '0.875rem', color: 'var(--primary-text)', textDecoration: 'none' }}
          >
            &#8592; Back to Study
          </a>
          <button className="btn-secondary" onClick={refresh}>&#8635; Refresh</button>
          <button className="btn-secondary" onClick={() => exportAll(sessions)} disabled={sessions.length === 0}>Export CSV</button>
          <button className="btn-secondary" onClick={() => exportJSON(sessions)} disabled={sessions.length === 0}>Backup JSON</button>
          <button className="btn-danger" onClick={() => setConfirmClear(true)} disabled={sessions.length === 0}>Clear All</button>
        </div>
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <TogglePill label="Study" enabled={studyOpen} onChange={handleStudyToggle} />
        <TogglePill label="AI Generation" enabled={aiEnabled} onChange={handleAIToggle} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: apiKeyConfigured ? 'var(--success)' : 'var(--danger)', display: 'inline-block' }} />
          <span style={{ color: apiKeyConfigured ? 'var(--success-text)' : 'var(--danger-text)', fontWeight: 600 }}>
            {apiKeyConfigured ? 'Groq API configured' : 'No API key — using original contracts'}
          </span>
        </div>
      </div>

      {/* Stats bar */}
      <div className="admin-stats">
        <strong>Total participants: {sessions.length}</strong>
        {sessions.length > 0 && (<>
          <span style={{ marginLeft: '1.5rem' }}>
            Avg time &mdash; A: {avgTime(sessions, 'A')} | B: {avgTime(sessions, 'B')} | C: {avgTime(sessions, 'C')} | D: {avgTime(sessions, 'D')}
          </span>
          <span style={{ marginLeft: '1.5rem' }}>
            Avg difficulty &mdash; A: {avgDifficulty(sessions, 'A')} | B: {avgDifficulty(sessions, 'B')} | C: {avgDifficulty(sessions, 'C')} | D: {avgDifficulty(sessions, 'D')}
          </span>
        </>)}
      </div>

      {/* Sessions table */}
      {sessions.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>No participant data yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Participant ID</th>
              <th>Timestamp</th>
              <th>Order</th>
              <th>A time</th>
              <th>B time</th>
              <th>C time</th>
              <th>D time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, idx) => {
              const getTime = (id) => {
                const r = s.contractResults && s.contractResults[id]
                if (!r) return '—'
                const t = r.timeSpent !== undefined ? `${r.timeSpent}s` : '—'
                return (
                  <>
                    {t}
                    {r.timerExpired && <span className="expired-badge">&#9888;</span>}
                  </>
                )
              }
              return (
                <tr key={s.participantId}>
                  <td>{idx + 1}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {s.participantId ? s.participantId.slice(0, 8) + '...' : '—'}
                  </td>
                  <td>{s.timestamp ? new Date(s.timestamp).toLocaleString() : '—'}</td>
                  <td>{s.contractOrder ? s.contractOrder.join('→') : '—'}</td>
                  <td>{getTime('A')}</td>
                  <td>{getTime('B')}</td>
                  <td>{getTime('C')}</td>
                  <td>{getTime('D')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button className="btn-secondary" onClick={() => setSelectedSession(s)}>
                        View
                      </button>
                      <button className="btn-secondary" onClick={() => setReviewSession(s)}>
                        Review
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => setDeleteConfirm(s.participantId)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* Confirm Clear All Modal */}
      {confirmClear && (
        <div className="modal-overlay">
          <div className="modal-box">
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Delete all participant data?
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Are you sure you want to delete ALL participant data? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleClearAll}>
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Review Overlay */}
      {reviewSession && (
        <ResultsReview
          contractOrder={reviewSession.contractOrder}
          contractResults={reviewSession.contractResults}
          onClose={() => setReviewSession(null)}
        />
      )}

      {/* Confirm Delete Single Modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-box">
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Delete this participant?
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Participant ID: <code style={{ fontSize: '0.8rem' }}>{deleteConfirm}</code>
              <br />This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPanel
