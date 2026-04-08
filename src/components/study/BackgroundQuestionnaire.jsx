import { useState } from 'react';

function ScaleRadio({ name, value, onChange, min, max, minLabel, maxLabel }) {
  const options = [];
  for (let i = min; i <= max; i++) {
    options.push(i);
  }
  return (
    <div className="scale-radio">
      <div className="scale-options">
        {options.map((opt) => (
          <label key={opt} className="scale-option">
            <input
              type="radio"
              name={name}
              value={String(opt)}
              checked={value === String(opt)}
              onChange={() => onChange(String(opt))}
            />
            <span className="scale-number">{opt}</span>
          </label>
        ))}
      </div>
      <div className="scale-labels">
        <span className="scale-label-min">{minLabel}</span>
        <span className="scale-label-max">{maxLabel}</span>
      </div>
    </div>
  );
}

function BackgroundQuestionnaire({ onComplete }) {
  const [answers, setAnswers] = useState({
    years_programming: '',
    years_professional: '',
    solidity_experience: '',
    proxy_experience: '',
    peer_experience: '',
    occupation: '',
    blockchain_familiarity: '',
  });
  const [errors, setErrors] = useState({});

  const setField = (field, value) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: false }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (answers.years_programming === '') newErrors.years_programming = true;
    if (answers.years_professional === '') newErrors.years_professional = true;
    if (!answers.solidity_experience) newErrors.solidity_experience = true;
    if (!answers.proxy_experience) newErrors.proxy_experience = true;
    if (!answers.peer_experience) newErrors.peer_experience = true;
    if (!answers.occupation.trim()) newErrors.occupation = true;
    if (!answers.blockchain_familiarity) newErrors.blockchain_familiarity = true;
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onComplete({
      years_programming: Number(answers.years_programming),
      years_professional: Number(answers.years_professional),
      solidity_experience: answers.solidity_experience,
      proxy_experience: answers.proxy_experience,
      peer_experience: answers.peer_experience,
      occupation: answers.occupation.trim(),
      blockchain_familiarity: answers.blockchain_familiarity,
    });
  };

  return (
    <div className="screen-container">
      <div className="form-card">
        <h2 className="section-title">Background Questionnaire</h2>
        <p className="section-subtitle">
          Please answer the following questions about your background. This information
          helps contextualize your responses and is collected anonymously.
        </p>

        <form onSubmit={handleSubmit} noValidate>

          <div className={`form-group ${errors.years_programming ? 'has-error' : ''}`}>
            <label className="form-label">
              <span className="q-num">1</span>
              How many years have you been programming?
            </label>
            <input
              type="number"
              min="0"
              className="form-input"
              value={answers.years_programming}
              onChange={(e) => setField('years_programming', e.target.value)}
              placeholder="0"
            />
            {errors.years_programming && (
              <span className="error-msg">This field is required.</span>
            )}
          </div>

          <div className={`form-group ${errors.years_professional ? 'has-error' : ''}`}>
            <label className="form-label">
              <span className="q-num">2</span>
              How many years have you been programming professionally?
            </label>
            <input
              type="number"
              min="0"
              className="form-input"
              value={answers.years_professional}
              onChange={(e) => setField('years_professional', e.target.value)}
              placeholder="0"
            />
            {errors.years_professional && (
              <span className="error-msg">This field is required.</span>
            )}
          </div>

          <div className={`form-group ${errors.solidity_experience ? 'has-error' : ''}`}>
            <label className="form-label">
              <span className="q-num">3</span>
              How would you rate your Solidity experience?
            </label>
            <ScaleRadio
              name="solidity_experience"
              value={answers.solidity_experience}
              onChange={(v) => setField('solidity_experience', v)}
              min={1}
              max={5}
              minLabel="1 — No experience"
              maxLabel="5 — Expert"
            />
            {errors.solidity_experience && (
              <span className="error-msg">Please select an option.</span>
            )}
          </div>

          <div className={`form-group ${errors.proxy_experience ? 'has-error' : ''}`}>
            <label className="form-label">
              <span className="q-num">4</span>
              Have you worked with proxy contracts before?
            </label>
            <div className="radio-group">
              {['Yes', 'No'].map((opt) => (
                <label key={opt} className="radio-option">
                  <input
                    type="radio"
                    name="proxy_experience"
                    value={opt}
                    checked={answers.proxy_experience === opt}
                    onChange={() => setField('proxy_experience', opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
            {errors.proxy_experience && (
              <span className="error-msg">Please select an option.</span>
            )}
          </div>

          <div className={`form-group ${errors.peer_experience ? 'has-error' : ''}`}>
            <label className="form-label">
              <span className="q-num">5</span>
              How do you rate your programming experience compared to your peers?
            </label>
            <ScaleRadio
              name="peer_experience"
              value={answers.peer_experience}
              onChange={(v) => setField('peer_experience', v)}
              min={1}
              max={5}
              minLabel="1 — Below average"
              maxLabel="5 — Well above average"
            />
            {errors.peer_experience && (
              <span className="error-msg">Please select an option.</span>
            )}
          </div>

          <div className={`form-group ${errors.occupation ? 'has-error' : ''}`}>
            <label className="form-label">
              <span className="q-num">6</span>
              What is your current occupation or study program?
            </label>
            <input
              type="text"
              className="form-input form-input--full"
              value={answers.occupation}
              onChange={(e) => setField('occupation', e.target.value)}
              placeholder="e.g. Software Engineer, Computer Science Student"
            />
            {errors.occupation && (
              <span className="error-msg">This field is required.</span>
            )}
          </div>

          <div className={`form-group ${errors.blockchain_familiarity ? 'has-error' : ''}`}>
            <label className="form-label">
              <span className="q-num">7</span>
              How familiar are you with Ethereum / blockchain in general?
            </label>
            <ScaleRadio
              name="blockchain_familiarity"
              value={answers.blockchain_familiarity}
              onChange={(v) => setField('blockchain_familiarity', v)}
              min={1}
              max={5}
              minLabel="1 — Not familiar"
              maxLabel="5 — Very familiar"
            />
            {errors.blockchain_familiarity && (
              <span className="error-msg">Please select an option.</span>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary btn-large">
              Continue to Contracts
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default BackgroundQuestionnaire;
