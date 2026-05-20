import { useState, useEffect } from 'react';
import { contracts, contractsRound2, contractsRound3 } from '../../data/contracts';
import { gradeOpenTextAnswers } from '../../services/aiGrading';
const ALL_CONTRACTS = { ...contracts, ...contractsRound2, ...contractsRound3 };

function scoreClass(score) {
  if (score >= 0.75) return 'grade-correct'
  if (score >= 0.4) return 'grade-partial'
  return 'grade-incorrect'
}

function RadioResult({ question, answer }) {
  const isCorrect = answer === question.correctAnswer;
  return (
    <div className="review-question">
      <p className="review-q-prompt">{question.prompt}</p>
      <div className="review-answer-row">
        <span className={`review-badge ${isCorrect ? 'grade-correct' : 'grade-incorrect'}`}>
          {isCorrect ? 'Correct' : 'Incorrect'}
        </span>
        <span className="review-your-answer">Your answer: <strong>{answer || '—'}</strong></span>
      </div>
      {!isCorrect && (
        <div className="review-correct-block">
          <span className="review-correct-label">Correct answer:</span> {question.correctAnswer}
          {question.explanation && (
            <p className="review-explanation">{question.explanation}</p>
          )}
        </div>
      )}
      {isCorrect && question.explanation && (
        <p className="review-explanation">{question.explanation}</p>
      )}
    </div>
  );
}

function TextResult({ question, answer, grading, contractId }) {
  const key = `${contractId}_${question.id}`;
  const grade = grading[key];

  return (
    <div className="review-question">
      <p className="review-q-prompt">{question.prompt}</p>
      <div className="review-text-answer">
        <span className="review-text-label">Your answer:</span>
        <p className="review-text-content">{answer || <em>No answer provided</em>}</p>
      </div>
      {grade ? (
        <div className="review-grade-block">
          <span className={`review-badge ${scoreClass(grade.score)}`}>
            {typeof grade.score === 'number' ? `${grade.score.toFixed(1)} / 1.0` : grade.score}
          </span>
          <span className="review-ai-feedback">{grade.feedback}</span>
        </div>
      ) : answer ? (
        <p className="review-no-grade">AI grading unavailable</p>
      ) : null}
      <div className="review-correct-block">
        <span className="review-correct-label">Model answer:</span> {question.correctAnswer}
      </div>
    </div>
  );
}

function ScaleResult({ question, answer }) {
  return (
    <div className="review-question review-question--scale">
      <p className="review-q-prompt">{question.prompt}</p>
      <span className="review-scale-value">{answer ?? '—'} / {question.max}</span>
    </div>
  );
}

export default function ResultsReview({ contractOrder, contractResults, rounds, onClose }) {
  const [grading, setGrading] = useState(null);
  const [loading, setLoading] = useState(true);

  // Build a flat list of rounds to display
  const allRounds = rounds?.length > 0
    ? rounds
    : [{ round_number: 1, contract_order: contractOrder, contract_results: contractResults }];

  useEffect(() => {
    // Grade all rounds together
    const allOrder = allRounds.flatMap(r => r.contract_order ?? []);
    const allResults = Object.assign({}, ...allRounds.map(r => r.contract_results ?? {}));
    gradeOpenTextAnswers(allOrder, allResults)
      .then(result => setGrading(result))
      .finally(() => setLoading(false));
  }, []);

  function renderRound(roundData) {
    return (roundData.contract_order ?? []).map((contractId) => {
      const contract = ALL_CONTRACTS[contractId];
      const result = (roundData.contract_results ?? {})[contractId];
      if (!contract || !result) return null;

      const answers = result.answers || {};
      const questions = result.variedQuestions || contract.questions;

      return (
        <section key={contractId} className="review-contract-section">
          <h3 className="review-contract-title">Contract {contractId}</h3>
          {questions.map((q) => {
            if (q.type === 'scale') return <ScaleResult key={q.id} question={q} answer={answers[q.id]} />;
            if (q.type === 'radio') return <RadioResult key={q.id} question={q} answer={answers[q.id]} />;
            if (q.type === 'text') return (
              <TextResult key={q.id} question={q} answer={answers[q.id]} grading={grading || {}} contractId={contractId} />
            );
            return null;
          })}
        </section>
      );
    });
  }

  return (
    <div className="review-overlay">
      <div className="review-panel">
        <div className="review-header">
          <h2 className="review-title">Answer Review</h2>
          <p className="review-subtitle">
            Radio questions are marked automatically. Open-text answers are evaluated by AI.
          </p>
          <button className="review-close-btn" onClick={onClose} title="Close review">&#10005;</button>
        </div>

        {loading && (
          <div className="review-loading">
            <div className="review-spinner" />
            <p>Grading open-text answers…</p>
          </div>
        )}

        {!loading && allRounds.map((roundData) => (
          <div key={roundData.round_number}>
            {allRounds.length > 1 && (
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', margin: '1.5rem 0 0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>
                Round {roundData.round_number}
              </h3>
            )}
            {renderRound(roundData)}
          </div>
        ))}

        <div className="review-footer">
          <button className="btn-primary" onClick={onClose}>Close Review</button>
        </div>
      </div>
    </div>
  );
}
