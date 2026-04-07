import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import WelcomeScreen from './components/WelcomeScreen'
import BackgroundQuestionnaire from './components/BackgroundQuestionnaire'
import ContractGroup from './components/ContractGroup'
import ThankYouScreen from './components/ThankYouScreen'
import AdminPanel from './components/AdminPanel'
import { contracts } from './data/contracts'
import { seededShuffle } from './utils/randomize'
import { saveSession, getStudyOpen } from './utils/storage'
import './App.css'

function App() {
  const [isAdmin, setIsAdmin] = useState(() => window.location.hash === '#admin')
  const [theme, setTheme] = useState(() => localStorage.getItem('proxyscope_theme') || 'light')

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

  const [screen, setScreen] = useState('welcome')
  const [participantId] = useState(() => uuidv4())
  const [sessionSeed] = useState(() => Math.floor(Math.random() * 1000000))
  const [backgroundAnswers, setBackgroundAnswers] = useState(null)
  const [contractOrder, setContractOrder] = useState(null)
  const [currentContractIndex, setCurrentContractIndex] = useState(0)
  const [contractResults, setContractResults] = useState({})

  const handleStart = () => setScreen('questionnaire')

  const handleQuestionnaireComplete = (answers) => {
    const order = seededShuffle(['A', 'B', 'C', 'D'], sessionSeed)
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
    } else {
      const sessionData = {
        participantId,
        sessionSeed,
        timestamp: new Date().toISOString(),
        backgroundAnswers,
        contractOrder,
        contractResults: newResults,
      }
      await saveSession(sessionData)
      setScreen('thankyou')
    }
  }

  if (isAdmin) return <AdminPanel />

  if (!getStudyOpen()) return (
    <div className="study-closed-screen">
      <div className="study-closed-box">
        <p className="study-closed-icon">&#128274;</p>
        <h2 className="study-closed-title">Study Closed</h2>
        <p className="study-closed-text">This study is not currently accepting participants. Please contact the researcher.</p>
      </div>
    </div>
  )

  if (screen === 'welcome') return <WelcomeScreen onStart={handleStart} theme={theme} onToggleTheme={toggleTheme} />
  if (screen === 'questionnaire') return <BackgroundQuestionnaire onComplete={handleQuestionnaireComplete} />
  if (screen === 'contract') {
    const contractId = contractOrder[currentContractIndex]
    return (
      <ContractGroup
        key={contractId}
        contract={contracts[contractId]}
        contractIndex={currentContractIndex}
        onComplete={handleContractComplete}
      />
    )
  }
  if (screen === 'thankyou') return (
    <ThankYouScreen
      participantId={participantId}
      backgroundAnswers={backgroundAnswers}
      contractOrder={contractOrder}
      contractResults={contractResults}
      sessionSeed={sessionSeed}
    />
  )
}

export default App
