import { contracts as CONTRACT_DATA, contractsRound2, contractsRound3 } from '../data/contracts';

const ALL_CONTRACTS = { ...CONTRACT_DATA, ...contractsRound2, ...contractsRound3 }
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

function getApiKey() {
  return import.meta.env.VITE_GROQ_KEY;
}

async function callGroq(prompt, items) {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_groq_api_key_here') return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    });
    if (!response.ok) throw new Error(`Groq ${response.status}`);
    const data = await response.json();
    const raw = data.choices[0].message.content.trim();
    const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(jsonStr);
    const result = {};
    parsed.forEach((entry, i) => {
      if (items[i]) result[items[i].key] = {
        score: Math.min(1, Math.max(0, Number(entry.score ?? 0))),
        feedback: entry.feedback ?? '',
      };
    });
    return result;
  } catch (err) {
    console.error('AI grading failed:', err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function collectTextItems(contractOrder, contractResults) {
  const items = [];
  for (const contractId of contractOrder) {
    const result = contractResults?.[contractId];
    const contract = ALL_CONTRACTS[contractId];
    if (!result || !contract) continue;
    for (const q of contract.questions) {
      if (q.type !== 'text') continue;
      const answer = (result.canonicalAnswers ?? result.answers)?.[q.id];
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
  return items;
}

function buildPrompt(items) {
  const itemsText = items.map((item, i) =>
    `[${i + 1}] Contract: ${item.contractLabel}\nQuestion: ${item.question}\nExpected answer: ${item.correctAnswer}\nParticipant answer: ${item.participantAnswer}`
  ).join('\n\n');

  return `You are evaluating a developer's answers to Solidity smart contract comprehension questions.

For each numbered item, assess the participant's answer against the expected answer and return a JSON array.
Each element must have:
- "score": a number from 0.0 to 1.0 (e.g. 1.0 = fully correct, 0.8 = mostly correct, 0.5 = partially correct, 0.2 = mostly wrong, 0.0 = completely wrong)
- "feedback": one concise sentence (max 20 words) explaining the score

Be lenient — award 1.0 if the core idea is right even if wording differs.
Award 0.5–0.8 if the answer is on the right track but misses details.
Award 0.0–0.3 only if the answer is clearly wrong or shows a fundamental misunderstanding.

Return ONLY a valid JSON array with exactly ${items.length} objects, no explanation, no markdown.

${itemsText}`;
}

/**
 * Grade all open-text answers for a full session (single or multi-round).
 * Returns grades keyed by "contractId_questionId", e.g. { "A_q1": { score: 0.8, feedback: "..." } }
 */
export async function gradeAllRounds(session) {
  const items = [];
  if (session.rounds && session.rounds.length > 0) {
    for (const round of session.rounds) {
      items.push(...collectTextItems(round.contract_order ?? [], round.contract_results ?? {}));
    }
  } else {
    items.push(...collectTextItems(session.contractOrder ?? [], session.contractResults ?? {}));
  }
  if (items.length === 0) return {};
  return (await callGroq(buildPrompt(items), items)) ?? {};
}

/**
 * Legacy: grade a single round's answers (used by ResultsReview).
 */
export async function gradeOpenTextAnswers(contractOrder, contractResults) {
  const items = collectTextItems(contractOrder, contractResults);
  if (items.length === 0) return {};
  return (await callGroq(buildPrompt(items), items)) ?? {};
}
