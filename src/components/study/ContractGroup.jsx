import { useState, useEffect, useRef } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import Timer from '../ui/Timer';
import QuestionRenderer from '../ui/QuestionRenderer';
import { generateContractVariation } from '../../services/aiVariation';

function ContractGroup({ contract, contractIndex, onComplete }) {
  const [variedCode, setVariedCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const timerExpiredRef = useRef(false);
  const elapsedRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    generateContractVariation(contract.code).then((code) => {
      if (!cancelled) {
        setVariedCode(code);
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

  const allAnswered = contract.questions.every((q) => {
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
      variedCode: variedCode || contract.code,
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
    <div className="screen-container">
      <div className="contract-card">
        <div className="contract-header">
          <div className="progress-indicator">
            Contract {contractIndex + 1} of 4
          </div>
          <h2 className="contract-label">{contract.label}</h2>
        </div>

        <div className="timer-wrapper">
          <Timer
            totalSeconds={contract.timerSeconds}
            onExpire={handleTimerExpire}
            onTick={handleTick}
          />
        </div>

        <div className="code-block-wrapper">
          <SyntaxHighlighter
            language="solidity"
            style={vs2015}
            showLineNumbers={true}
            customStyle={{
              borderRadius: '8px',
              fontSize: '14px',
              lineHeight: '1.6',
              margin: 0,
            }}
          >
            {variedCode || contract.code}
          </SyntaxHighlighter>
        </div>

        <div className="questions-section">
          <h3 className="questions-heading">Comprehension Questions</h3>
          <p className="questions-subheading">
            Please answer all questions based on the contract shown above.
          </p>
          <QuestionRenderer
            questions={contract.questions}
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
            {isLastContract ? 'Complete Study' : 'Next Contract'}
          </button>
          {!allAnswered && (
            <p className="submit-hint">Please answer all questions to continue.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContractGroup;
