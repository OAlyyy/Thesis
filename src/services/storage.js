import { supabase } from './supabase'

const STORAGE_KEY = 'proxyscope_sessions'

// ── Helpers ──────────────────────────────────────────────────

function toRow(session) {
  return {
    participant_id:     session.participantId,
    timestamp:          session.timestamp,
    session_seed:       session.sessionSeed,
    contract_order:     session.contractOrder,
    background_answers: session.backgroundAnswers,
    contract_results:   session.contractResults,
    rounds:             session.rounds ?? null,
  }
}

function fromRow(row) {
  return {
    participantId:     row.participant_id,
    timestamp:         row.timestamp,
    sessionSeed:       row.session_seed,
    contractOrder:     row.contract_order,
    backgroundAnswers: row.background_answers,
    contractResults:   row.contract_results,
    rounds:            row.rounds ?? null,
  }
}

function getLocalSessions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

// ── Session persistence ───────────────────────────────────────

export async function saveSession(session) {
  if (supabase) {
    const { error } = await supabase.from('sessions').upsert(toRow(session))
    if (!error) return
    console.warn('Supabase save failed, falling back to localStorage:', error)
  }
  const sessions = getLocalSessions()
  sessions.push(session)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

export async function getAllSessions() {
  if (supabase) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (!error && data) return data.map(fromRow)
    console.warn('Supabase fetch failed, falling back to localStorage:', error)
  }
  return getLocalSessions().filter(s => !s.deleted)
}

export async function deleteSession(participantId) {
  if (supabase) {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('participant_id', participantId)
    if (!error) return
    console.warn('Supabase delete failed, falling back to localStorage:', error)
  }
  const sessions = getLocalSessions().filter(s => s.participantId !== participantId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

export async function updateSession(participantId, updatedSession) {
  if (supabase) {
    const { error } = await supabase
      .from('sessions')
      .update(toRow(updatedSession))
      .eq('participant_id', participantId)
    if (!error) return
    console.warn('Supabase update failed, falling back to localStorage:', error)
  }
  const sessions = getLocalSessions().map(s => s.participantId === participantId ? updatedSession : s)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

export async function clearAllSessions() {
  if (supabase) {
    const { error } = await supabase.from('sessions').delete().neq('participant_id', '')
    if (!error) return
    console.warn('Supabase clear failed, falling back to localStorage:', error)
  }
  localStorage.removeItem(STORAGE_KEY)
}

// ── Settings (always localStorage) ───────────────────────────

export function getAIEnabled() {
  return localStorage.getItem('proxyscope_ai_enabled') !== 'false'
}
export function setAIEnabled(val) {
  localStorage.setItem('proxyscope_ai_enabled', val ? 'true' : 'false')
}

export function getStudyOpen() {
  return localStorage.getItem('proxyscope_study_open') !== 'false'
}
export function setStudyOpen(val) {
  localStorage.setItem('proxyscope_study_open', val ? 'true' : 'false')
}

export async function recoverLocalToSupabase() {
  if (!supabase) return { ok: 0, failed: 0, error: 'Supabase not configured' }

  // Collect sessions from proxyscope_sessions
  const byId = {}
  for (const s of getLocalSessions()) {
    byId[s.participantId] = s
  }

  // Also check proxyscope_progress — may have more complete round data
  try {
    const progress = JSON.parse(localStorage.getItem('proxyscope_progress') || 'null')
    if (progress?.participantId && progress?.completedRounds?.length > 0) {
      const existing = byId[progress.participantId]
      const existingRounds = existing?.rounds?.length ?? 0
      if (progress.completedRounds.length > existingRounds) {
        const r1 = progress.completedRounds[0]
        byId[progress.participantId] = {
          participantId: progress.participantId,
          timestamp: new Date().toISOString(),
          sessionSeed: r1.session_seed,
          contractOrder: r1.contract_order,
          backgroundAnswers: progress.backgroundAnswers,
          contractResults: r1.contract_results,
          rounds: progress.completedRounds,
        }
      }
    }
  } catch { /* ignore */ }

  const sessions = Object.values(byId)
  if (sessions.length === 0) return { ok: 0, failed: 0, error: 'No local sessions found' }

  let ok = 0, failed = 0
  for (const session of sessions) {
    const { error } = await supabase.from('sessions').upsert(toRow(session))
    if (error) { failed++; console.error('Recover upsert error:', error); continue }
    ok++
  }
  return { ok, failed }
}

export function getNumRounds() {
  return localStorage.getItem('proxyscope_num_rounds') === '3' ? 3 : 1
}
export function setNumRounds(val) {
  localStorage.setItem('proxyscope_num_rounds', val === 3 ? '3' : '1')
}

// isFinal=true → also push to Supabase (single insert at end of study)
// isFinal=false → localStorage only (avoids RLS UPDATE issues mid-study)
export async function upsertRound(session, isFinal = false) {
  // Always write to localStorage
  const sessions = getLocalSessions()
  const idx = sessions.findIndex(s => s.participantId === session.participantId)
  if (idx >= 0) sessions[idx] = session
  else sessions.push(session)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))

  if (isFinal && supabase) {
    // Delete any existing row first so we always do a clean INSERT (avoids RLS UPDATE issues)
    await supabase.from('sessions').delete().eq('participant_id', session.participantId)
    const { error } = await supabase.from('sessions').insert(toRow(session))
    if (error) console.warn('Supabase final save failed (data saved locally):', error)
  }
}
