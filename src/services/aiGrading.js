import { contracts } from '../data/contracts';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

/**
 * Builds a list of all open-text questions across all answered contracts,
 * then sends them to Groq in a single batched request.
 *
 * Returns an object keyed by "contractId_questionId" with shape:
 *   { score: 'correct' | 'partial' | 'incorrect', feedback: string }
 */
export async function gradeOpenTextAnswers(contractOrder, contractResults) {
  const apiKey = import.meta.env.VITE_GROQ_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') return {};

  // Collect all text questions that have a non-empty answer
  const items = [];
  for (const contractId of contractOrder) {
    const result = contractResults[contractId];
    const contract = contracts[contractId];
    if (!result || !contract) continue;

    for (const q of contract.questions) {
      if (q.type !== 'text') continue;
      const answer = result.answers?.[q.id];
      if (!answer || answer.trim() === '') continue;

      items.push({
        key: `${contractId}_${q.id}`,
        contractLabel: contract.label,
        question: q.prompt,
        correctAnswer: q.correctAnswer,
        participantAnswer: answer.trim(),
      });
    }
  }

  if (items.length === 0) return {};

  const itemsText = items
    .map(
      (item, i) =>
        `[${i + 1}] Contract: ${item.contractLabel}\nQuestion: ${item.question}\nExpected answer: ${item.correctAnswer}\nParticipant answer: ${item.participantAnswer}`
    )
    .join('\n\n');

  const prompt = `You are evaluating a developer's answers to Solidity smart contract comprehension questions.

For each numbered item below, assess the participant's answer against the expected answer and return a JSON array.
Each element must have:
- "score": one of "correct", "partial", or "incorrect"
- "feedback": one concise sentence (max 20 words) explaining the score

Be lenient — award "correct" if the core idea is right even if wording differs.
Award "partial" if the answer is on the right track but misses a key detail.
Award "incorrect" only if the answer is clearly wrong or shows a fundamental misunderstanding.

Return ONLY a valid JSON array with exactly ${items.length} objects, no explanation, no markdown.

${itemsText}`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!response.ok) throw new Error(`Groq ${response.status}`);
    const data = await response.json();
    const raw = data.choices[0].message.content.trim();

    // Strip markdown code fences if present
    const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(jsonStr);

    const result = {};
    parsed.forEach((entry, i) => {
      if (items[i]) result[items[i].key] = entry;
    });
    return result;
  } catch (err) {
    console.error('AI grading failed:', err);
    return {};
  }
}
