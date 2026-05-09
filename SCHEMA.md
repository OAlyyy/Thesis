# Database Schema — ContractLens (ProxyScope)

**Thesis:** An Empirical Study on the Effect of Proxy Patterns on Smart Contract Comprehension

Backend: **Supabase (PostgreSQL)**

---

## Tables

### `sessions`

Stores one row per completed participant session. All JSON columns are stored as `jsonb`.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               sessions                                      │
├──────────────────────┬─────────────────┬──────────┬────────────────────────┤
│ Column               │ Type            │ Nullable │ Description            │
├──────────────────────┼─────────────────┼──────────┼────────────────────────┤
│ participant_id       │ text (UUID)     │ NOT NULL │ Primary key, client-   │
│                      │                 │          │ generated via uuidv4() │
├──────────────────────┼─────────────────┼──────────┼────────────────────────┤
│ timestamp            │ timestamptz     │ NOT NULL │ ISO timestamp of       │
│                      │                 │          │ session submission     │
├──────────────────────┼─────────────────┼──────────┼────────────────────────┤
│ session_seed         │ integer         │ NOT NULL │ Random seed used to    │
│                      │                 │          │ shuffle contract order │
├──────────────────────┼─────────────────┼──────────┼────────────────────────┤
│ contract_order       │ jsonb (text[])  │ NOT NULL │ Presentation order of  │
│                      │                 │          │ the 4 contracts        │
├──────────────────────┼─────────────────┼──────────┼────────────────────────┤
│ background_answers   │ jsonb (object)  │ NOT NULL │ Background             │
│                      │                 │          │ questionnaire answers  │
├──────────────────────┼─────────────────┼──────────┼────────────────────────┤
│ contract_results     │ jsonb (object)  │ NOT NULL │ Per-contract answers,  │
│                      │                 │          │ timing, and AI output  │
├──────────────────────┼─────────────────┼──────────┼────────────────────────┤
│ created_at           │ timestamptz     │ NOT NULL │ Auto-set by Supabase   │
├──────────────────────┼─────────────────┼──────────┼────────────────────────┤
│ deleted_at           │ timestamptz     │ NULL     │ Soft-delete; null =    │
│                      │                 │          │ active record          │
└──────────────────────┴─────────────────┴──────────┴────────────────────────┘

  PRIMARY KEY: participant_id
  SOFT DELETE: rows with deleted_at IS NOT NULL are excluded from all queries
```

---

## JSON Column Schemas

### `contract_order` — `text[]`

Ordered array of the four contract IDs as presented to the participant. The order is deterministically derived from `session_seed` using a seeded Fisher-Yates shuffle.

```json
["B", "D", "A", "C"]
```

| Value | Contract |
|-------|----------|
| `"A"` | Simple, No Proxy |
| `"B"` | Transparent Proxy |
| `"C"` | UUPS Proxy |
| `"D"` | Diamond / Multi-Facet Proxy |

---

### `background_answers` — object

Collected before contract evaluation. All scale fields are stored as numeric strings `"1"`–`"5"`.

```
┌─────────────────────────┬──────────────────┬───────────────────────────────────┐
│ Field                   │ Type             │ Description                       │
├─────────────────────────┼──────────────────┼───────────────────────────────────┤
│ years_programming       │ number           │ Total years programming           │
├─────────────────────────┼──────────────────┼───────────────────────────────────┤
│ years_professional      │ number           │ Years programming professionally   │
├─────────────────────────┼──────────────────┼───────────────────────────────────┤
│ solidity_experience     │ "1" – "5"        │ Solidity skill (1=none, 5=expert) │
├─────────────────────────┼──────────────────┼───────────────────────────────────┤
│ proxy_experience        │ "Yes" | "No"     │ Prior proxy contract experience   │
├─────────────────────────┼──────────────────┼───────────────────────────────────┤
│ peer_experience         │ "1" – "5"        │ Self-rated skill vs. peers        │
├─────────────────────────┼──────────────────┼───────────────────────────────────┤
│ occupation              │ string           │ Current role / study program      │
├─────────────────────────┼──────────────────┼───────────────────────────────────┤
│ blockchain_familiarity  │ "1" – "5"        │ Ethereum/blockchain familiarity   │
└─────────────────────────┴──────────────────┴───────────────────────────────────┘
```

**Example:**
```json
{
  "years_programming": 4,
  "years_professional": 1,
  "solidity_experience": "2",
  "proxy_experience": "No",
  "peer_experience": "3",
  "occupation": "Computer Science Student",
  "blockchain_familiarity": "2"
}
```

---

### `contract_results` — object

Keyed by contract ID (`"A"`, `"B"`, `"C"`, `"D"`). One entry per contract reviewed.

```
contract_results
├── "A"  →  ContractResult
├── "B"  →  ContractResult
├── "C"  →  ContractResult
└── "D"  →  ContractResult
```

**ContractResult shape:**

```
┌──────────────────┬──────────────────┬──────────────────────────────────────────┐
│ Field            │ Type             │ Description                              │
├──────────────────┼──────────────────┼──────────────────────────────────────────┤
│ timeSpent        │ number (seconds) │ Elapsed time when participant submitted  │
├──────────────────┼──────────────────┼──────────────────────────────────────────┤
│ timerExpired     │ boolean          │ true if auto-submitted on timer expiry   │
├──────────────────┼──────────────────┼──────────────────────────────────────────┤
│ answers          │ object           │ Raw answers keyed by question ID         │
│                  │                  │ (may use AI-varied names)                │
├──────────────────┼──────────────────┼──────────────────────────────────────────┤
│ canonicalAnswers │ object           │ Answers mapped back to canonical names   │
│                  │                  │ (suitable for scoring and comparison)    │
├──────────────────┼──────────────────┼──────────────────────────────────────────┤
│ variedCode       │ string           │ The Solidity source shown to participant │
│                  │                  │ (original or AI-varied variant)          │
├──────────────────┼──────────────────┼──────────────────────────────────────────┤
│ variedQuestions  │ Question[]       │ Question prompts/options as shown        │
│                  │                  │ (may reflect renamed identifiers)        │
└──────────────────┴──────────────────┴──────────────────────────────────────────┘
```

**answers / canonicalAnswers keys per contract:**

| Question ID  | Type   | Description                                    |
|--------------|--------|------------------------------------------------|
| `q1`         | text   | Open-text contract description                 |
| `q2`         | radio  | Execution location (direct / proxy / unsure)   |
| `q3`         | radio  | Storage location                               |
| `q4`         | text   | State mutation scenario                        |
| `q5`         | text   | Privileged access reasoning                    |
| `q6`         | radio  | Redeployment / upgrade behaviour               |
| `difficulty` | scale  | Perceived difficulty (1=very easy, 5=very hard)|

**Example:**
```json
{
  "A": {
    "timeSpent": 214,
    "timerExpired": false,
    "answers": {
      "q1": "Stores a single uint256 value on-chain.",
      "q2": "SimpleStorage directly",
      "q3": "In SimpleStorage",
      "q4": "The second value overwrites the first.",
      "q5": "No, there is no owner mechanism.",
      "q6": "The value is lost, the new contract starts fresh",
      "difficulty": "2"
    },
    "canonicalAnswers": { "...": "same as answers when no name variation" },
    "variedCode": "pragma solidity ^0.8.0;\n\ncontract DataVault { ... }",
    "variedQuestions": []
  }
}
```

---

## Data Flow

```
Participant
    │
    ▼
WelcomeScreen
    │  generates: participantId (UUID), sessionSeed (int)
    ▼
BackgroundQuestionnaire
    │  produces: backgroundAnswers {}
    ▼
ContractGroup × 4  (order from seededShuffle(seed))
    │  produces per contract: { timeSpent, timerExpired, answers,
    │                           canonicalAnswers, variedCode, variedQuestions }
    ▼
saveSession()
    │
    ├─► Supabase  →  sessions table  (primary store)
    └─► localStorage  (fallback if Supabase unavailable)
```

---

## localStorage Fallback

When Supabase is not configured or a request fails, sessions are persisted in the browser under the key `proxyscope_sessions` as a JSON array of the same session shape (camelCase field names instead of snake_case).

| localStorage key          | Value                                |
|---------------------------|--------------------------------------|
| `proxyscope_sessions`     | `Session[]` — fallback session store |
| `proxyscope_ai_enabled`   | `"true"` / `"false"`                 |
| `proxyscope_study_open`   | `"true"` / `"false"`                 |
| `proxyscope_theme`        | `"light"` / `"dark"`                 |
