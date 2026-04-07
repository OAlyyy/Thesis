function WelcomeScreen({ onStart, theme, onToggleTheme }) {
  return (
    <div className="screen-container">
      <div className="top-bar">
        <button className="top-bar-btn" onClick={onToggleTheme} title="Toggle dark/light mode">
          {theme === 'dark' ? '☀ Light' : '☾ Dark'}
        </button>
        <a href="#admin" className="top-bar-btn">Admin</a>
      </div>

      <div className="welcome-card">

        <div className="welcome-institution">
          <span className="research-badge">Research Study</span>
          <span className="institution-name">
            University of Duisburg-Essen &middot; Chair of Software Engineering
          </span>
        </div>

        <div className="welcome-hero">
          <h1 className="app-title">ProxyScope</h1>
          <p className="app-subtitle">Smart Contract Comprehension Study</p>
          <p className="intro-text">
            This study investigates how proxy patterns in Ethereum smart contracts influence
            developer comprehension. You will review four Solidity contracts and answer
            comprehension questions about each one.
          </p>
        </div>

        <div className="study-facts">
          <div className="study-fact">
            <span className="fact-icon">&#9200;</span>
            <div>
              <p className="fact-label">20 – 40 min</p>
              <p className="fact-desc">Estimated duration</p>
            </div>
          </div>
          <div className="study-fact">
            <span className="fact-icon">&#128274;</span>
            <div>
              <p className="fact-label">Anonymous</p>
              <p className="fact-desc">No personal data stored</p>
            </div>
          </div>
          <div className="study-fact">
            <span className="fact-icon">&#128203;</span>
            <div>
              <p className="fact-label">4 Contracts</p>
              <p className="fact-desc">With comprehension questions</p>
            </div>
          </div>
        </div>

        <div className="study-steps">
          <p className="steps-heading">What you will do</p>
          <ol className="steps-list">
            <li>Complete a short background questionnaire</li>
            <li>Read four Solidity smart contracts, one at a time</li>
            <li>Answer comprehension questions for each contract</li>
            <li>Download your anonymized results at the end</li>
          </ol>
        </div>

        <div className="welcome-divider-line" />

        <div className="welcome-footer">
          <div className="researcher-info">
            <div className="researcher-row">
              <span className="researcher-role">Researcher</span>
              <span className="researcher-name">Omar Aly</span>
            </div>
            <div className="researcher-row">
              <span className="researcher-role">Supervisor</span>
              <span className="researcher-name">Michael Hettmer, M.Sc.</span>
            </div>
          </div>

          <div className="welcome-cta">
            <button className="btn-primary btn-large" onClick={onStart}>
              Begin Study
            </button>
            <p className="consent-note">
              By proceeding, you agree that your anonymized responses may be used for academic research.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default WelcomeScreen;
