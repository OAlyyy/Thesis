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
      .order('created_at', { ascending: false })
    if (!error && data) return data.map(fromRow)
    console.warn('Supabase fetch failed, falling back to localStorage:', error)
  }
  return getLocalSessions()
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
