function RoundCompleteScreen({ completedRound, totalRounds, onContinue }) {
  return (
    <div className="screen-container">
      <div className="roundcomplete-card">
        <div className="roundcomplete-icon">&#10003;</div>
        <h1 className="roundcomplete-title">Round {completedRound} of {totalRounds} Complete</h1>
        <p className="roundcomplete-body">
          Great work! You have finished reviewing all four contracts in Round {completedRound}.
        </p>
        <p className="roundcomplete-body">
          Round {completedRound + 1} will present the same four contracts in a different order.
          Take a short break if you need one.
        </p>
        <div className="roundcomplete-progress">
          {Array.from({ length: totalRounds }, (_, i) => (
            <div
              key={i}
              className={`roundcomplete-pip ${i < completedRound ? 'pip-done' : 'pip-upcoming'}`}
            />
          ))}
        </div>
        <button className="btn-primary btn-large" onClick={onContinue}>
          Start Round {completedRound + 1}
        </button>
      </div>
    </div>
  )
}

export default RoundCompleteScreen
