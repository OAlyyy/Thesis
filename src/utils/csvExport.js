function escapeField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// All contract IDs in fixed order for consistent CSV columns across all rounds
const ALL_CONTRACT_IDS = ['A','B','C','D','E','F','G','H','I','J','K','L']

export function generateCSV(participantId, backgroundAnswers, contractOrder, contractResults, sessionSeed, grades) {
  const bg = backgroundAnswers || {}

  // Build dynamic question columns for each contract
  const contractCols = ALL_CONTRACT_IDS.flatMap(id => {
    const contract = ALL_CONTRACTS[id]
    if (!contract) return []
    const prefix = `contract_${id.toLowerCase()}`
    const questionCols = contract.questions
      .filter(q => q.id !== 'difficulty')
      .map(q => `${prefix}_${q.id}`)
    return [`${prefix}_time_seconds`, `${prefix}_timer_expired`, ...questionCols, `${prefix}_difficulty`]
  })

  // Score columns for open-text questions only
  const scoreCols = ALL_CONTRACT_IDS.flatMap(id => {
    const contract = ALL_CONTRACTS[id]
    if (!contract) return []
    return contract.questions
      .filter(q => q.type === 'text')
      .map(q => `contract_${id.toLowerCase()}_${q.id}_score`)
  })

  const headers = [
    'participant_id', 'timestamp', 'session_seed', 'presentation_order',
    'years_programming', 'years_professional', 'solidity_experience',
    'proxy_experience', 'peer_experience', 'occupation', 'blockchain_familiarity',
    ...contractCols,
    ...scoreCols,
  ]

  const getField = (contractId, field) => {
    const result = contractResults?.[contractId]
    if (!result) return ''
    if (field === 'time_seconds') return result.timeSpent ?? ''
    if (field === 'timer_expired') return result.timerExpired !== undefined ? String(result.timerExpired) : ''
    if (field === 'difficulty') return result.answers?.difficulty ?? ''
    return result.answers?.[field] ?? ''
  }

  const contractValues = ALL_CONTRACT_IDS.flatMap(id => {
    const contract = ALL_CONTRACTS[id]
    if (!contract) return []
    const questionIds = contract.questions.filter(q => q.id !== 'difficulty').map(q => q.id)
    return [
      getField(id, 'time_seconds'),
      getField(id, 'timer_expired'),
      ...questionIds.map(qid => getField(id, qid)),
      getField(id, 'difficulty'),
    ]
  })

  const scoreValues = ALL_CONTRACT_IDS.flatMap(id => {
    const contract = ALL_CONTRACTS[id]
    if (!contract) return []
    return contract.questions
      .filter(q => q.type === 'text')
      .map(q => grades?.[`${id}_${q.id}`]?.score ?? '')
  })

  const row = [
    participantId,
    new Date().toISOString(),
    sessionSeed,
    contractOrder ? contractOrder.join(',') : '',
    bg.years_programming ?? '', bg.years_professional ?? '',
    bg.solidity_experience ?? '', bg.proxy_experience ?? '',
    bg.peer_experience ?? '', bg.occupation ?? '', bg.blockchain_familiarity ?? '',
    ...contractValues,
    ...scoreValues,
  ]

  return headers.map(escapeField).join(',') + '\r\n' + row.map(escapeField).join(',') + '\r\n'
}

// ── Jamovi export ─────────────────────────────────────────────────────────────
// One row per participant. Columns: experience avg + time/error per round×contract.
// Contract mapping: A=small_noproxy, B=small_proxy, C=large_noproxy, D=large_proxy
// Error % = wrong MC (radio) answers / total MC answers × 100. Open-text excluded.

import { contracts as CONTRACT_DATA, contractsRound2, contractsRound3, ROUND_CATEGORY_MAP } from '../data/contracts'

const ALL_CONTRACTS = { ...CONTRACT_DATA, ...contractsRound2, ...contractsRound3 }
const CONTRACT_COLS = ['small_noproxy', 'small_proxy', 'large_noproxy', 'large_proxy']
const NUM_ROUNDS    = 3

function calcExperience(bg) {
  if (!bg) return ''
  const vals = [bg.solidity_experience, bg.peer_experience, bg.blockchain_familiarity]
    .map(Number).filter(n => !isNaN(n) && n >= 1 && n <= 5)
  if (vals.length === 0) return ''
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
}

function calcError(contractId, contractResult) {
  if (!contractResult) return ''
  const mcQuestions = (ALL_CONTRACTS[contractId]?.questions || []).filter(q => q.type === 'radio')
  if (mcQuestions.length === 0) return ''
  const answers = contractResult.canonicalAnswers || contractResult.answers || {}
  const wrong = mcQuestions.filter(q => answers[q.id] !== q.correctAnswer).length
  return Math.round((wrong / mcQuestions.length) * 100)
}

export function generateJamoviCSV(sessions) {
  const roundLabels = Array.from({ length: NUM_ROUNDS }, (_, i) => `r${i + 1}`)

  const headers = [
    'participant_id',
    'experience',
    ...roundLabels.flatMap(r => CONTRACT_COLS.map(c => `time_${r}_${c}`)),
    ...roundLabels.flatMap(r => CONTRACT_COLS.map(c => `error_${r}_${c}`)),
    ...roundLabels.flatMap(r => CONTRACT_COLS.map(c => `textscore_${r}_${c}`)),
  ]

  const rows = sessions.map(session => {
    // Build array of round data (up to NUM_ROUNDS)
    const roundData = []
    if (session.rounds && session.rounds.length > 0) {
      for (let i = 0; i < NUM_ROUNDS; i++) {
        roundData.push(session.rounds[i] || null)
      }
    } else {
      roundData.push({ contract_results: session.contractResults })
      for (let i = 1; i < NUM_ROUNDS; i++) roundData.push(null)
    }

    // For each round, find the contract ID for each category using ROUND_CATEGORY_MAP
    const getCategoryId = (roundNumber, category) => {
      const map = ROUND_CATEGORY_MAP[roundNumber] || ROUND_CATEGORY_MAP[1]
      return Object.entries(map).find(([, cat]) => cat === category)?.[0]
    }

    const timeValues = roundLabels.flatMap((_, ri) => {
      const rd = roundData[ri]
      const roundNumber = ri + 1
      return CONTRACT_COLS.map(cat => {
        const id = getCategoryId(roundNumber, cat)
        return rd?.contract_results?.[id]?.timeSpent ?? ''
      })
    })

    const errorValues = roundLabels.flatMap((_, ri) => {
      const rd = roundData[ri]
      const roundNumber = ri + 1
      return CONTRACT_COLS.map(cat => {
        const id = getCategoryId(roundNumber, cat)
        return calcError(id, rd?.contract_results?.[id])
      })
    })

    const textScoreValues = roundLabels.flatMap((_, ri) => {
      const roundNumber = ri + 1
      return CONTRACT_COLS.map(cat => {
        const id = getCategoryId(roundNumber, cat)
        if (!id) return ''
        const contract = ALL_CONTRACTS[id]
        if (!contract) return ''
        const textQs = contract.questions.filter(q => q.type === 'text')
        if (textQs.length === 0) return ''
        const scores = textQs
          .map(q => session.grades?.[`${id}_${q.id}`]?.score)
          .filter(s => s !== undefined && s !== null && s !== '')
          .map(Number).filter(n => !isNaN(n))
        if (scores.length === 0) return ''
        return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(3)
      })
    })

    return [
      session.participantId,
      calcExperience(session.backgroundAnswers),
      ...timeValues,
      ...errorValues,
      ...textScoreValues,
    ]
  })

  const lines = [
    headers.map(escapeField).join(','),
    ...rows.map(r => r.map(escapeField).join(',')),
  ]
  return lines.join('\r\n') + '\r\n'
}

export function downloadCSV(csvString, filename) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
