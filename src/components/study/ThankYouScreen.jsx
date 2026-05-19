import { useState } from 'react';
import { generateCSV, downloadCSV } from '../../utils/csvExport';
import { contracts } from '../../data/contracts';
import ResultsReview from './ResultsReview';

function formatTime(seconds) {
  if (seconds === undefined || seconds === null || seconds === '') return '—';
  const s = Number(seconds);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function RoundTable({ contractOrder, contractResults }) {
  return (
    <table className="summary-table">
      <thead>
        <tr>
          <th>Contract</th>
          <th>Label</th>
          <th>Time Spent</th>
          <th>Timer Expired</th>
        </tr>
      </thead>
      <tbody>
        {contractOrder && contractOrder.map((contractId, idx) => {
          const result = contractResults[contractId];
          const contract = contracts[contractId];
          return (
            <tr key={contractId}>
              <td>{idx + 1}</td>
              <td>{contract ? contract.label : contractId}</td>
              <td>{result ? formatTime(result.timeSpent) : '—'}</td>
              <td>{result ? (result.timerExpired ? 'Yes' : 'No') : '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ThankYouScreen({ participantId, backgroundAnswers, contractOrder, contractResults, sessionSeed, rounds, numRounds = 1 }) {
  const [showReview, setShowReview] = useState(false);

  const handleDownload = () => {
    if (numRounds > 1 && rounds && rounds.length > 0) {
      const csvRows = rounds.map(r =>
        generateCSV(participantId, backgroundAnswers, r.contract_order, r.contract_results, r.session_seed)
      );
      const header = csvRows[0].split('\n')[0];
      const dataLines = csvRows.map(r => r.split('\n').slice(1).join('\n')).filter(Boolean);
      const combined = [header, ...dataLines].join('\n');
      downloadCSV(combined, `contractlens_${participantId.slice(0, 8)}_${Date.now()}.csv`);
    } else {
      const csv = generateCSV(participantId, backgroundAnswers, contractOrder, contractResults, sessionSeed);
      downloadCSV(csv, `contractlens_${participantId.slice(0, 8)}_${Date.now()}.csv`);
    }
  };

  return (
    <div className="screen-container">
      <div className="thankyou-card">
        <div className="thankyou-header">
          <div className="thankyou-icon">&#10003;</div>
          <h1 className="thankyou-title">Thank You!</h1>
          <p className="thankyou-subtitle">Your responses have been recorded.</p>
        </div>

        <div className="participant-info">
          <p className="participant-label">Participant ID (for your reference):</p>
          <code className="participant-id">{participantId}</code>
        </div>

        <div className="summary-section">
          <h3 className="summary-title">Time Spent Per Contract</h3>
          {numRounds > 1 && rounds && rounds.length > 0 ? (
            rounds.map(r => (
              <div key={r.round_number} style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Round {r.round_number}
                </p>
                <RoundTable contractOrder={r.contract_order} contractResults={r.contract_results} />
              </div>
            ))
          ) : (
            <RoundTable contractOrder={contractOrder} contractResults={contractResults} />
          )}
        </div>

        <div className="download-section">
          <p className="download-instructions">
            Please download your results file and submit it as instructed by the researcher.
          </p>
          <div className="thankyou-actions">
            <button className="btn-primary btn-large" onClick={handleDownload}>
              Download Results (CSV)
            </button>
            <button className="btn-secondary btn-large" onClick={() => setShowReview(true)}>
              Review My Answers
            </button>
          </div>
        </div>

        {showReview && (
          <ResultsReview
            contractOrder={contractOrder}
            contractResults={contractResults}
            onClose={() => setShowReview(false)}
          />
        )}

        <p className="admin-footer-link">
          <a href="#admin">Admin</a>
        </p>
      </div>
    </div>
  );
}

export default ThankYouScreen;
