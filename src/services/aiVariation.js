import { getAIEnabled } from './storage';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Plain replaceAll (no word boundaries) — used on code so _value, _implementation etc. are also renamed
function applyCodeMapping(code, mapping) {
  return Object.entries(mapping).reduce(
    (s, [oldName, newName]) => s.replaceAll(oldName, newName),
    code
  );
}

const PROMPT = (code) =>
  `You are a Solidity code transformer. Transform the following smart contract by replacing all variable names, function names, and contract names with different but meaningful names. Keep the logic, structure, comments, and architecture completely identical.

Return a JSON object with exactly two fields:
- "code": the complete modified Solidity code as a string
- "renames": an object mapping every original identifier to its new name (e.g. {"SimpleStorage": "DataVault", "setValue": "storeData", "value": "amount"})

Return only the JSON object, no explanation, no markdown backticks.

${code}`;

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
  const raw = data.choices[0].message.content.trim();
  const parsed = JSON.parse(raw);
  return { variedCode: parsed.code, nameMapping: parsed.renames || {} };
}

const NO_VARIATION = { variedCode: null, nameMapping: {} };

function staticVariant(contract) {
  const variants = contract.variants;
  if (!variants || variants.length === 0) return NO_VARIATION;
  const nameMapping = variants[Math.floor(Math.random() * variants.length)];
  return { variedCode: applyCodeMapping(contract.code, nameMapping), nameMapping };
}

export async function generateContractVariation(contract) {
  const apiKey = import.meta.env.VITE_GROQ_KEY;
  const aiEnabled = apiKey && apiKey !== 'your_groq_api_key_here' && getAIEnabled();

  if (aiEnabled) {
    // Primary: LLaMA 3.3 70B
    try {
      return await callGroq(contract.code, 'llama-3.3-70b-versatile');
    } catch (primaryError) {
      console.warn('Primary model failed, trying LLaMA 4 Scout:', primaryError);
    }
    // Backup: LLaMA 4 Scout
    try {
      return await callGroq(contract.code, 'meta-llama/llama-4-scout-17b-16e-instruct');
    } catch (backupError) {
      console.warn('Both AI models failed, falling back to static variant:', backupError);
    }
  }

  return staticVariant(contract);
}
