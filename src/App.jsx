import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import WelcomeScreen from './components/study/WelcomeScreen'
import BackgroundQuestionnaire from './components/study/BackgroundQuestionnaire'
import ContractGroup from './components/study/ContractGroup'
import ThankYouScreen from './components/study/ThankYouScreen'
import RoundCompleteScreen from './components/study/RoundCompleteScreen'
import AdminPanel from './components/admin/AdminPanel'
import AdminLogin from './components/admin/AdminLogin'
import { contractsByRound } from './data/contracts'
import { seededShuffle } from './utils/randomize'
import { upsertRound, getStudyOpen, getNumRounds } from './services/storage'
import { supabase } from './services/supabase'
import './App.css'

function App() {
  const [isAdmin, setIsAdmin] = useState(() => window.location.hash === '#admin')
  const [adminAuthed, setAdminAuthed] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('proxyscope_theme') || 'light')

  useEffect(() => {
    if (!supabase) { setAuthChecked(true); return }
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email
      if (email === 'omar@admin.com') setIsOwner(true)
      if (data.session && isAdmin) setAdminAuthed(true)
      setAuthChecked(true)
    })
  }, [isAdmin])

  useEffect(() => {
    const handleHash = () => setIsAdmin(window.location.hash === '#admin')
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('proxyscope_theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  // ── Resume support ────────────────────────────────────────────
  const PROGRESS_KEY = 'proxyscope_progress'
  const savedProgress = (() => {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) } catch { return null }
  })()

  const [screen, setScreen] = useState(() => {
    const s = savedProgress?.screen
    // Don't resume to welcome/questionnaire — those are quick to redo
    return (s && s !== 'welcome' && s !== 'questionnaire') ? s : 'welcome'
  })
  const [participantId] = useState(() => savedProgress?.participantId || uuidv4())
  const [backgroundAnswers, setBackgroundAnswers] = useState(() => savedProgress?.backgroundAnswers || null)

  const [numRounds, setNumRounds] = useState(() => savedProgress?.numRounds || 1)
  const [currentRound, setCurrentRound] = useState(() => savedProgress?.currentRound || 1)
  const [completedRounds, setCompletedRounds] = useState(() => savedProgress?.completedRounds || [])

  const [roundSeed, setRoundSeed] = useState(() => savedProgress?.roundSeed || Math.floor(Math.random() * 1000000))
  const [contractOrder, setContractOrder] = useState(() => savedProgress?.contractOrder || null)
  const [currentContractIndex, setCurrentContractIndex] = useState(() => savedProgress?.currentContractIndex || 0)
  const [contractResults, setContractResults] = useState(() => savedProgress?.contractResults || {})

  // Save progress to localStorage whenever study state changes
  useEffect(() => {
    if (screen === 'welcome') return // nothing to save yet
    if (screen === 'thankyou') { localStorage.removeItem(PROGRESS_KEY); return }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      participantId, screen, backgroundAnswers,
      numRounds, currentRound, completedRounds,
      roundSeed, contractOrder, currentContractIndex, contractResults,
    }))
  }, [screen, backgroundAnswers, numRounds, currentRound, completedRounds,
      roundSeed, contractOrder, currentContractIndex, contractResults])

  const handleStart = () => setScreen('questionnaire')

  const handleQuestionnaireComplete = (answers) => {
    const n = getNumRounds()
    const roundSet = contractsByRound[1]
    const order = seededShuffle(roundSet.ids, roundSeed)
    setNumRounds(n)
    setBackgroundAnswers(answers)
    setContractOrder(order)
    setScreen('contract')
  }

  const handleContractComplete = async (result) => {
    const contractId = contractOrder[currentContractIndex]
    const newResults = { ...contractResults, [contractId]: result }
    setContractResults(newResults)

    if (currentContractIndex < 3) {
      setCurrentContractIndex(currentContractIndex + 1)
      return
    }

    // Round complete — build round record
    const completedRound = {
      round_number: currentRound,
      session_seed: roundSeed,
      contract_order: contractOrder,
      contract_results: newResults,
    }
    const newCompletedRounds = [...completedRounds, completedRound]
    setCompletedRounds(newCompletedRounds)

    // Top-level columns mirror round 1 for backward compat
    const round1 = newCompletedRounds[0]
    const sessionData = {
      participantId,
      timestamp: new Date().toISOString(),
      sessionSeed: round1.session_seed,
      contractOrder: round1.contract_order,
      backgroundAnswers,
      contractResults: round1.contract_results,
      rounds: numRounds > 1 ? newCompletedRounds : null,
    }
    const isFinalRound = !(numRounds > 1 && currentRound < numRounds)
    await upsertRound(sessionData, isFinalRound)

    if (numRounds > 1 && currentRound < numRounds) {
      setScreen('roundcomplete')
    } else {
      setScreen('thankyou')
    }
  }

  const handleStartNextRound = () => {
    const nextRound = currentRound + 1
    const nextSeed = Math.floor(Math.random() * 1000000)
    const roundSet = contractsByRound[nextRound] || contractsByRound[1]
    const nextOrder = seededShuffle(roundSet.ids, nextSeed)
    setCurrentRound(nextRound)
    setRoundSeed(nextSeed)
    setContractOrder(nextOrder)
    setCurrentContractIndex(0)
    setContractResults({})
    setScreen('contract')
  }

  if (!authChecked) return (
    <div className="splash-screen">
      <span className="splash-title">ProxyScope</span>
      <div className="spinner" />
    </div>
  )

  if (isAdmin) {
    if (!supabase) return <p style={{ padding: '2rem' }}>Supabase not configured.</p>
    if (!adminAuthed) return <AdminLogin onLogin={() => setAdminAuthed(true)} />
    return <AdminPanel onLogout={() => setAdminAuthed(false)} />
  }

  if (!getStudyOpen()) return (
    <div className="study-closed-screen">
      <div className="study-closed-box">
        <p className="study-closed-icon">&#128274;</p>
        <h2 className="study-closed-title">Study Closed</h2>
        <p className="study-closed-text">This study is not currently accepting participants. Please contact the researcher.</p>
      </div>
    </div>
  )

  if (screen === 'welcome') return <WelcomeScreen onStart={handleStart} theme={theme} onToggleTheme={toggleTheme} showThemeToggle={authChecked && isOwner} />
  if (screen === 'questionnaire') return <BackgroundQuestionnaire onComplete={handleQuestionnaireComplete} />
  if (screen === 'roundcomplete') return (
    <RoundCompleteScreen
      completedRound={currentRound}
      totalRounds={numRounds}
      onContinue={handleStartNextRound}
    />
  )
  if (screen === 'contract') {
    const contractId = contractOrder[currentContractIndex]
    const roundContracts = (contractsByRound[currentRound] || contractsByRound[1]).contracts
    return (
      <ContractGroup
        key={`r${currentRound}-${contractId}`}
        contract={roundContracts[contractId]}
        contractIndex={currentContractIndex}
        totalRounds={numRounds}
        currentRound={currentRound}
        onComplete={handleContractComplete}
      />
    )
  }
  if (screen === 'thankyou') return (
    <ThankYouScreen
      participantId={participantId}
      backgroundAnswers={backgroundAnswers}
      contractOrder={completedRounds[0]?.contract_order ?? contractOrder}
      contractResults={completedRounds[0]?.contract_results ?? contractResults}
      sessionSeed={completedRounds[0]?.session_seed ?? roundSeed}
      rounds={completedRounds}
      numRounds={numRounds}
    />
  )
}

export default App
