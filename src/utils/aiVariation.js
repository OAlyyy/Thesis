import { getAIEnabled } from './storage';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const PROMPT = (code) =>
  `You are a Solidity code transformer. Return the following smart contract with all variable names, function names, and contract names replaced with different but meaningful names. Keep the logic, structure, comments, and architecture completely identical. Return only the modified Solidity code, no explanation, no markdown backticks.\n\n${code}`;

async function callGroq(code, model) {
  const apiKey = import.meta.env.VITE_GROQ_KEY;
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: PROMPT(code) }],
      temperature: 0.7,
    }),
  });
  if (!response.ok) throw new Error(`Groq ${response.status}`);
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

export async function generateContractVariation(originalCode) {
  const apiKey = import.meta.env.VITE_GROQ_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') return originalCode;
  if (!getAIEnabled()) return originalCode;

  // Primary: LLaMA 3.3 70B
  try {
    return await callGroq(originalCode, 'llama-3.3-70b-versatile');
  } catch (primaryError) {
    console.warn('Primary model failed, trying LLaMA 4 Scout:', primaryError);
  }

  // Backup: LLaMA 4 Scout
  try {
    return await callGroq(originalCode, 'meta-llama/llama-4-scout-17b-16e-instruct');
  } catch (backupError) {
    console.error('Both models failed, using original:', backupError);
    return originalCode;
  }
}
