import { useState, useEffect, useRef, useCallback } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import Timer from '../ui/Timer';
import QuestionRenderer from '../ui/QuestionRenderer';
import { generateContractVariation } from '../../services/aiVariation';

// Word-boundary replace — avoids mangling English words like "voted", "voting" when renaming "vote"
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wbReplace = (str, mapping) =>
  Object.entries(mapping).reduce(
    (s, [oldName, newName]) => s.replace(new RegExp(`\\b${esc(oldName)}\\b`, 'g'), newName),
    str
  );

function applyNameMapping(questions, mapping) {
  if (!mapping || Object.keys(mapping).length === 0) return questions;
  const replace = (str) => (str ? wbReplace(str, mapping) : str);
  return questions.map((q) => ({
    ...q,
    prompt: replace(q.prompt),
    ...(q.options && { options: q.options.map(replace) }),
    ...(q.correctAnswer && { correctAnswer: replace(q.correctAnswer) }),
    ...(q.explanation && { explanation: replace(q.explanation) }),
  }));
}

function reverseMapAnswers(answers, mapping) {
  if (!mapping || Object.keys(mapping).length === 0) return answers;
  const rev = Object.fromEntries(Object.entries(mapping).map(([k, v]) => [v, k]));
  const replace = (str) => (str ? wbReplace(str, rev) : str);
  return Object.fromEntries(
    Object.entries(answers).map(([qId, val]) => [qId, typeof val === 'string' ? replace(val) : val])
  );
}

function ContractGroup({ contract, contractIndex, onComplete, totalRounds = 1, currentRound = 1 }) {
  const [variedCode, setVariedCode] = useState(null);
  const [variedQuestions, setVariedQuestions] = useState(contract.questions);
  const [nameMapping, setNameMapping] = useState({});
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const timerExpiredRef = useRef(false);
  const elapsedRef = useRef(0);

  // Split-pane state
  const [splitPct, setSplitPct] = useState(50);
  const dragging = useRef(false);
  const containerRef = useRef(null);

  const onMouseDown = useCallback(() => { dragging.current = true; }, []);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = Math.min(80, Math.max(20, ((e.clientX - rect.left) / rect.width) * 100));
      setSplitPct(pct);
    };
    const onMouseUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    generateContractVariation(contract).then(({ variedCode, nameMapping: mapping }) => {
      if (!cancelled) {
        setVariedCode(variedCode);
        setVariedQuestions(applyNameMapping(contract.questions, mapping));
        setNameMapping(mapping);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [contract.id]);

  const handleAnswerChange = (id, value) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const allAnswered = variedQuestions.every((q) => {
    const val = answers[q.id];
    if (q.type === 'text') return val && val.trim().length > 0;
    return val !== undefined && val !== '';
  });

  const handleSubmit = () => {
    if (submitted) return;
    setSubmitted(true);
    onComplete({
      timeSpent: elapsedRef.current,
      timerExpired: timerExpiredRef.current,
      answers: { ...answers },
      canonicalAnswers: reverseMapAnswers(answers, nameMapping),
      variedCode: variedCode || contract.code,
      variedQuestions,
    });
  };

  const handleTimerExpire = () => {
    timerExpiredRef.current = true;
    handleSubmit();
  };

  const handleTick = (elapsed) => {
    elapsedRef.current = elapsed;
  };

  const isLastContract = contractIndex === 3;
  const isLastRound = currentRound === totalRounds;

  if (loading) {
    return (
      <div className="screen-container">
        <div className="loading-card">
          <div className="loading-spinner"></div>
          <p className="loading-text">Preparing contract...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="split-screen-container">
      {/* Top bar: progress + timer */}
      <div className="split-topbar">
        <div className="progress-indicator">
          {totalRounds > 1 && <span className="round-badge">Round {currentRound}/{totalRounds} &mdash; </span>}
          Contract {contractIndex + 1} of 4 &mdash; <strong>Contract {contract.id}</strong>
        </div>
        <Timer
          totalSeconds={contract.timerSeconds}
          onExpire={handleTimerExpire}
          onTick={handleTick}
        />
      </div>

      {/* Split pane */}
      <div className="split-pane" ref={containerRef}>
        {/* Left: code */}
        <div className="split-left" style={{ width: `${splitPct}%` }}>
          <SyntaxHighlighter
            language="solidity"
            style={vs2015}
            showLineNumbers={true}
            customStyle={{
              borderRadius: '0',
              fontSize: '14px',
              lineHeight: '1.6',
              margin: 0,
              minHeight: '100%',
            }}
          >
            {variedCode || contract.code}
          </SyntaxHighlighter>
        </div>

        {/* Divider */}
        <div
          className="split-divider"
          onMouseDown={onMouseDown}
          title="Drag to resize"
        />

        {/* Right: questions */}
        <div className="split-right" style={{ width: `${100 - splitPct}%` }}>
          <div className="split-right-inner">
            <div className="questions-section">
              <h3 className="questions-heading">Comprehension Questions</h3>
              <p className="questions-subheading">
                Please answer all questions based on the contract shown above.
              </p>
              <QuestionRenderer
                questions={variedQuestions}
                answers={answers}
                onChange={handleAnswerChange}
              />
            </div>

            <div className="contract-footer">
              <button
                className="btn-primary btn-large"
                onClick={handleSubmit}
                disabled={!allAnswered || submitted}
              >
                {isLastContract
                  ? (isLastRound ? 'Complete Study' : `Complete Round ${currentRound}`)
                  : 'Next Contract'}
              </button>
              {!allAnswered && (
                <p className="submit-hint">Please answer all questions to continue.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContractGroup;
