# Route Map — NeuroFeed Cognitive Learning OS

## 1. Frontend Application Router

The client routing is powered by `react-router-dom` and mapped to secure layout views inside `App.tsx`:

| Client Route | Page Component | Protected? | Description |
| :--- | :--- | :---: | :--- |
| `/login` | `Login.tsx` | No | Credentials and authentication portal. |
| `/` | `Index.tsx` | Yes | Adaptive swipe card stream (curated particles). |
| `/daily-challenge` | `DailyChallenge.tsx` | Yes | Daily checklist flow and claim panel. |
| `/explore` | `Explore.tsx` | Yes | Domain filtering and discovery metrics. |
| `/ai-labs` | `AiLabs.tsx` | Yes | AI Chat, arXiv parser, analogy explainer, roadmap planner. |
| `/quiz` | `Quiz.tsx` | Yes | Dynamic knowledge verify assessments. |
| `/leaderboard` | `Leaderboard.tsx` | Yes | Weekly student progression lists. |
| `/profile` | `Profile.tsx` | Yes | XP stats, learning graphs, and the streak store. |
| `/reviews` | `ReviewDeck.tsx` [NEW] | Yes | Dedicated due spaced-repetition review cards. |
| `/enterprise` | `Enterprise.tsx` [NEW] | Yes | Organization metrics dashboard and management panel. |

---

## 2. Backend REST API Router

All REST endpoints map to secure database transactions and are prefixed by `/api`:

### Authentication & Sessions
* `GET /api/test-auth` - Validate active token validity.
* `POST /api/sessions/start` - Create learning session.
* `POST /api/sessions/{session_id}/end` - Close active learning session and compile session XP rewards.

### Core Particles & Spaced Repetition Feed
* `GET /api/feed` - Return ranked stream of due spaced-repetition cards and new domain concepts.
* `GET /api/feed/completed` - Retrieve archive of successfully completed concepts.
* `GET /api/cards/{card_id}` - Retrieve details and discussion logs of a specific card.
* `POST /api/cards/{card_id}/interact` - Log basic user interaction details (views, saves, skips).
* `POST /api/cards/{card_id}/unsave` - Delete card save status.
* `POST /api/cards/{card_id}/confidence` - Submit SM-2 rating (1-4) and calculate next due dates.
* `POST /api/cards/{card_id}/simplify` - Call analogy generator (ELI5 summary).
* `POST /api/cards/{card_id}/deepdive` - Fetch high-fidelity technical bullet insights.

### Assessment & Daily Challenge
* `GET /api/quiz/feed` - Generate random quiz cards based on domain filters.
* `POST /api/quiz/{card_id}/answer` - Check attempt correctness, log results, award secure XP.
* `GET /api/daily-challenge/today` - Fetch active challenge list today.
* `POST /api/daily-challenge/complete` - Lock user profile, verify full completions, and award XP.

### Peer Leaderboards & Alerts
* `GET /api/leaderboard/weekly` - Returns ordered lists of peer rankings for active domain tracks.
* `POST /api/notifications/subscribe` - Persist WebPush user key subscriptions.
* `POST /api/notifications/test` - Trigger test WebPush push alert dispatch.
