# ContractLens (ProxyScope)

A web-based research study tool investigating how Ethereum smart contract proxy patterns affect developer comprehension. Participants review four Solidity contracts and answer comprehension questions; responses are saved to Supabase and exportable as CSV.

## Setup & Run

**Prerequisites:** Node.js 18+

```bash
cd ContractLens
npm install
```

Create a `.env` file:
```
VITE_GROQ_KEY=your_groq_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

```bash
npm run dev      # dev server at http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview production build
```

## Project Structure

```
src/
├── components/
│   ├── study/     # Study flow: WelcomeScreen, BackgroundQuestionnaire,
│   │              #   ContractGroup, ThankYouScreen, ResultsReview
│   ├── admin/     # Admin dashboard: AdminPanel, AdminAnalytics
│   └── ui/        # Shared UI: Timer, QuestionRenderer
├── data/
│   └── contracts.js       # Four Solidity contracts + questions
├── services/              # API & database calls
│   ├── supabase.js        # Supabase client
│   ├── storage.js         # Session persistence (Supabase + localStorage fallback)
│   ├── aiGrading.js       # Groq AI grading of open-text answers
│   └── aiVariation.js     # Groq AI contract code variation
└── utils/                 # Pure utilities
    ├── csvExport.js        # CSV generation & download
    └── randomize.js        # Seeded shuffle for reproducible contract order
```

## Admin Panel

Navigate to `/#admin` to access the admin dashboard. From there you can toggle the study open/closed, enable/disable AI generation, view participant sessions, and export data as CSV or JSON.
