function QuestionRenderer({ questions, answers, onChange }) {
  return (
    <div className="questions-container">
      {questions.map((question, index) => (
        <div key={question.id} className="question-block">
          <p className="question-prompt">
            <span className="question-number">{index + 1}.</span> {question.prompt}
          </p>

          {question.type === 'text' && (
            <textarea
              className="question-textarea"
              value={answers[question.id] || ''}
              onChange={(e) => onChange(question.id, e.target.value)}
              placeholder="Type your answer here..."
              rows={4}
            />
          )}

          {question.type === 'radio' && (
            <div className="radio-group">
              {question.options.map((option) => (
                <label key={option} className="radio-option">
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={answers[question.id] === option}
                    onChange={() => onChange(question.id, option)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          )}

          {question.type === 'scale' && (
            <div className="scale-field">
              <div className="scale-options">
                {Array.from(
                  { length: question.max - question.min + 1 },
                  (_, i) => question.min + i
                ).map((val) => (
                  <label key={val} className="scale-option">
                    <input
                      type="radio"
                      name={question.id}
                      value={String(val)}
                      checked={answers[question.id] === String(val)}
                      onChange={() => onChange(question.id, String(val))}
                    />
                    <span className="scale-number">{val}</span>
                  </label>
                ))}
              </div>
              <div className="scale-labels">
                <span className="scale-label-min">
                  {question.minLabel || `${question.min} (min)`}
                </span>
                <span className="scale-label-max">
                  {question.maxLabel || `${question.max} (max)`}
                </span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default QuestionRenderer;
