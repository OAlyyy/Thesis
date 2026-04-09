import { contracts } from '../../data/contracts'

const CONTRACT_COLORS = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B']
const CONTRACT_IDS = ['A', 'B', 'C', 'D']

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: '0.625rem', padding: '1rem 1.25rem', flex: '1', minWidth: '140px',
    }}>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: color || 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{sub}</div>}
    </div>
  )
}

function HBar({ label, value, max, color, suffix = '', total }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const showPct = total !== undefined && total > 0
  return (
    <div style={{ marginBottom: '0.55rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem', color: 'var(--text-secondary)' }}>
        <span style={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{label}</span>
        <span style={{ fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0, marginLeft: '0.5rem' }}>
          {value}{suffix}{showPct ? ` (${Math.round(value / total * 100)}%)` : ''}
        </span>
      </div>
      <div style={{ height: '18px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: color,
          borderRadius: '3px', transition: 'width 0.5s ease', minWidth: pct > 0 ? '4px' : '0',
        }} />
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{
        fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: '0.875rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)',
      }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function TwoCol({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
      {children}
    </div>
  )
}

function avg(arr) { return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0 }
function avgF(arr) { return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : '—' }

function AdminAnalytics({ sessions }) {
  if (sessions.length === 0) {
    return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>No participant data yet.</p>
  }

  const n = sessions.length

  // ── Time ────────────────────────────────────────────────────
  function getTimes(id) {
    return sessions.map(s => s.contractResults?.[id]?.timeSpent)
      .filter(t => t !== undefined && t !== null && t !== '')
      .map(Number).filter(n => !isNaN(n))
  }
  const avgTimes = Object.fromEntries(CONTRACT_IDS.map(id => [id, avg(getTimes(id))]))
  const maxAvgTime = Math.max(...Object.values(avgTimes), 1)

  const avgTotalTime = avg(sessions.map(s =>
    CONTRACT_IDS.reduce((sum, id) => sum + (Number(s.contractResults?.[id]?.timeSpent) || 0), 0)
  ))

  // ── Difficulty ──────────────────────────────────────────────
  function getDiffs(id) {
    return sessions.map(s => s.contractResults?.[id]?.answers?.difficulty)
      .filter(v => v !== undefined && v !== null && v !== '')
      .map(Number).filter(n => !isNaN(n))
  }
  const avgDiffs = Object.fromEntries(CONTRACT_IDS.map(id => [id, Number(avgF(getDiffs(id))) || 0]))

  // ── Timer expiry ─────────────────────────────────────────────
  const expiry = Object.fromEntries(CONTRACT_IDS.map(id => [
    id, sessions.filter(s => s.contractResults?.[id]?.timerExpired).length
  ]))

  // ── Completion ───────────────────────────────────────────────
  const fullyComplete = sessions.filter(s =>
    s.contractOrder?.every(id => s.contractResults?.[id])
  ).length

  // ── Hardest contract ─────────────────────────────────────────
  const hardest = CONTRACT_IDS
    .filter(id => avgDiffs[id] > 0)
    .sort((a, b) => avgDiffs[b] - avgDiffs[a])[0]

  // ── Background ───────────────────────────────────────────────
  const withBg = sessions.filter(s => s.backgroundAnswers).length

  function scaleDist(key) {
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    sessions.forEach(s => {
      const v = Number(s.backgroundAnswers?.[key])
      if (v >= 1 && v <= 5) dist[v]++
    })
    return dist
  }

  const proxyYes = sessions.filter(s => {
    const v = s.backgroundAnswers?.proxy_experience
    return v === true || v === 'true' || v === 'Yes' || v === 'yes' || v === 1 || v === '1'
  }).length

  const solidityDist = scaleDist('solidity_experience')
  const blockchainDist = scaleDist('blockchain_familiarity')
  const peerDist = scaleDist('peer_experience')

  const avgSolidity = avgF(sessions.flatMap(s => {
    const v = Number(s.backgroundAnswers?.solidity_experience)
    return isNaN(v) ? [] : [v]
  }))
  const avgBlockchain = avgF(sessions.flatMap(s => {
    const v = Number(s.backgroundAnswers?.blockchain_familiarity)
    return isNaN(v) ? [] : [v]
  }))

  // ── MC answer distributions ───────────────────────────────────
  function getMcDist(contractId, questionId) {
    const dist = {}
    sessions.forEach(s => {
      const result = s.contractResults?.[contractId]
      const ans = result?.canonicalAnswers?.[questionId] ?? result?.answers?.[questionId]
      if (ans) dist[ans] = (dist[ans] || 0) + 1
    })
    return dist
  }


  // ── Presentation order analysis ───────────────────────────────
  const orderCounts = {}
  sessions.forEach(s => {
    const key = s.contractOrder?.join('→')
    if (key) orderCounts[key] = (orderCounts[key] || 0) + 1
  })
  const maxOrderCount = Math.max(...Object.values(orderCounts), 1)

  return (
    <div>
      {/* ── Overview cards ── */}
      <Section title="Overview">
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <StatCard label="Total participants" value={n} />
          <StatCard
            label="Fully completed"
            value={fullyComplete}
            sub={`${Math.round(fullyComplete / n * 100)}% completion rate`}
            color="var(--success)"
          />
          <StatCard
            label="Avg total time"
            value={`${Math.floor(avgTotalTime / 60)}m ${avgTotalTime % 60}s`}
          />
          {hardest && (
            <StatCard
              label={`Hardest — Contract ${hardest}`}
              value={`${avgDiffs[hardest]}/5`}
              sub="avg difficulty"
              color="var(--danger-text)"
            />
          )}
          <StatCard
            label="Proxy-experienced"
            value={`${Math.round(proxyYes / n * 100)}%`}
            sub={`${proxyYes} of ${n} participants`}
            color="var(--primary-text)"
          />
        </div>
      </Section>

      <TwoCol>
        {/* ── Time per contract ── */}
        <Section title="Avg Time per Contract">
          {CONTRACT_IDS.map((id, i) => (
            <HBar
              key={id}
              label={`Contract ${id} — ${contracts[id]?.label?.split('—')[1]?.trim() || ''}`}
              value={avgTimes[id]}
              max={maxAvgTime}
              color={CONTRACT_COLORS[i]}
              suffix="s"
            />
          ))}
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Limits: A/B = 400s, C/D = 600s
          </p>
        </Section>

        {/* ── Difficulty per contract ── */}
        <Section title="Avg Difficulty Rating (1–5)">
          {CONTRACT_IDS.map((id, i) => (
            <HBar
              key={id}
              label={`Contract ${id}`}
              value={avgDiffs[id]}
              max={5}
              color={CONTRACT_COLORS[i]}
            />
          ))}
        </Section>
      </TwoCol>

      {/* ── Timer expiry ── */}
      <Section title="Timer Expiry Rate (ran out of time)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {CONTRACT_IDS.map((id, i) => (
            <div key={id} style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: '0.5rem', padding: '0.75rem 1rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: expiry[id] > 0 ? 'var(--danger-text)' : 'var(--success)', lineHeight: 1 }}>
                {expiry[id]}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Contract {id} ({Math.round(expiry[id] / n * 100)}%)
              </div>
            </div>
          ))}
        </div>
      </Section>

      <TwoCol>
        {/* ── Solidity experience ── */}
        <Section title={`Solidity Experience (avg ${avgSolidity}/5)`}>
          {[1, 2, 3, 4, 5].map(v => (
            <HBar
              key={v}
              label={`Level ${v}`}
              value={solidityDist[v]}
              max={Math.max(...Object.values(solidityDist), 1)}
              color="#4F46E5"
              total={withBg || 1}
            />
          ))}
        </Section>

        {/* ── Blockchain familiarity ── */}
        <Section title={`Blockchain Familiarity (avg ${avgBlockchain}/5)`}>
          {[1, 2, 3, 4, 5].map(v => (
            <HBar
              key={v}
              label={`Level ${v}`}
              value={blockchainDist[v]}
              max={Math.max(...Object.values(blockchainDist), 1)}
              color="#0EA5E9"
              total={withBg || 1}
            />
          ))}
        </Section>
      </TwoCol>

      <TwoCol>
        {/* ── Proxy experience ── */}
        <Section title="Prior Proxy Pattern Experience">
          <HBar label="Yes — has worked with proxies" value={proxyYes} max={n} color="var(--success)" total={n} />
          <HBar label="No — never worked with proxies" value={n - proxyYes} max={n} color="var(--danger)" total={n} />
        </Section>

        {/* ── Peer experience ── */}
        <Section title="Self-rated Peer Experience (1–5)">
          {[1, 2, 3, 4, 5].map(v => (
            <HBar
              key={v}
              label={`Level ${v}`}
              value={peerDist[v]}
              max={Math.max(...Object.values(peerDist), 1)}
              color="#10B981"
              total={withBg || 1}
            />
          ))}
        </Section>
      </TwoCol>

      {/* ── Presentation order distribution ── */}
      <Section title="Contract Presentation Order Distribution">
        {Object.entries(orderCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([order, count]) => (
            <HBar key={order} label={order} value={count} max={maxOrderCount} color="#8B5CF6" total={n} />
          ))}
      </Section>

      {/* ── MC question answer distributions ── */}
      <Section title="Multiple Choice Answer Distributions (green = correct)">
        {CONTRACT_IDS.map((contractId, ci) => {
          const radioQs = contracts[contractId]?.questions?.filter(q => q.type === 'radio') || []
          const qsWithData = radioQs.map(q => {
            const dist = getMcDist(contractId, q.id)
            const total = Object.values(dist).reduce((a, b) => a + b, 0)
            return { q, dist, total }
          }).filter(({ total }) => total > 0)
          if (qsWithData.length === 0) return null
          return (
            <div key={contractId} style={{ marginBottom: '1.75rem' }}>
              <div style={{
                fontSize: '0.75rem', fontWeight: 700, color: CONTRACT_COLORS[ci],
                textTransform: 'uppercase', letterSpacing: '0.05em',
                marginBottom: '0.875rem', paddingBottom: '0.35rem',
                borderBottom: `2px solid ${CONTRACT_COLORS[ci]}22`,
              }}>
                Contract {contractId} — {contracts[contractId]?.label?.split('—')[1]?.trim()}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {qsWithData.map(({ q, dist, total }) => {
                  const maxCount = Math.max(...Object.values(dist), 1)
                  return (
                    <div key={q.id}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                        {q.prompt}
                      </div>
                      {q.options.map(opt => (
                        <HBar
                          key={opt}
                          label={opt}
                          value={dist[opt] || 0}
                          max={maxCount}
                          color={opt === q.correctAnswer ? 'var(--success)' : '#94A3B8'}
                          total={total}
                        />
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </Section>
    </div>
  )
}

export default AdminAnalytics
