import { useState, useEffect } from 'react';
import { contracts } from '../data/contracts';
import { gradeOpenTextAnswers } from '../utils/aiGrading';

const SCORE_LABEL = { correct: 'Correct', partial: 'Partial', incorrect: 'Incorrect' };
const SCORE_CLASS = { correct: 'grade-correct', partial: 'grade-partial', incorrect: 'grade-incorrect' };

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
          <span className={`review-badge ${SCORE_CLASS[grade.score]}`}>
            {SCORE_LABEL[grade.score]}
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

export default function ResultsReview({ contractOrder, contractResults, onClose }) {
  const [grading, setGrading] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gradeOpenTextAnswers(contractOrder, contractResults)
      .then(result => setGrading(result))
      .finally(() => setLoading(false));
  }, [contractOrder, contractResults]);

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
            <p>Grading your open-text answers…</p>
          </div>
        )}

        {!loading && contractOrder.map((contractId) => {
          const contract = contracts[contractId];
          const result = contractResults[contractId];
          if (!contract || !result) return null;

          const answers = result.answers || {};

          return (
            <section key={contractId} className="review-contract-section">
              <h3 className="review-contract-title">{contract.label}</h3>

              {contract.questions.map((q) => {
                if (q.type === 'scale') {
                  return <ScaleResult key={q.id} question={q} answer={answers[q.id]} />;
                }
                if (q.type === 'radio') {
                  return <RadioResult key={q.id} question={q} answer={answers[q.id]} />;
                }
                if (q.type === 'text') {
                  return (
                    <TextResult
                      key={q.id}
                      question={q}
                      answer={answers[q.id]}
                      grading={grading || {}}
                      contractId={contractId}
                    />
                  );
                }
                return null;
              })}
            </section>
          );
        })}

        <div className="review-footer">
          <button className="btn-primary" onClick={onClose}>Close Review</button>
        </div>
      </div>
    </div>
  );
}
