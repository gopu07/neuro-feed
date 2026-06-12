# Project Backlog — NeuroFeed Cognitive Learning OS

## Epic 1: Critical Bug Patches
* **Task DC-01 (Priority: Critical)**: Fix Daily Challenge Exploit.
  - Implement full completion verification of challenge card array inside `backend/api/routes/daily_challenge.py`.
  - Secure `/complete` using `with_for_update()` database lock.
* **Task NV-01 (Priority: High)**: Mobile Drawer Navigation.
  - Create sliding navigation drawer for mobile route discovery. Expose Leaderboard and Quiz routes.
* **Task AX-01 (Priority: Critical)**: arXiv Summarizer Hallucination Patch.
  - Parse arXiv XML endpoints using paper IDs, feed authentic metadata to Groq LLM.
* **Task CH-01 (Priority: Medium)**: Chat window auto-scroll and anchors.
  - Integrate scroll ref in `AiLabs.tsx` to automatically snap viewport to new messages.

## Epic 2: Accessibility (WCAG AA)
* **Task AC-01 (Priority: High)**: Keyboard hotkey hooks.
  - Listen for key codes `1`-`4` to rate card confidence levels.
* **Task AC-02 (Priority: Medium)**: Screen readers & Contrast.
  - Add semantic ARIA elements and ensure optimal theme color contrast ratios.

## Epic 3: Dedicated Reviews & Learning Analytics
* **Task RV-01 (Priority: High)**: Dedicated Review Deck.
  - Backend route `/api/reviews/queue` to isolate due cards.
  - Frontend page `/reviews` to review due concepts sequentially.
* **Task AN-01 (Priority: High)**: Learning Analytics Dashboard.
  - Aggregate statistics (forgetting curves, recall success rate, mastery charts).

## Epic 4: Gamification & Retention
* **Task GM-01 (Priority: High)**: Streak Store and Streak Shields.
  - Add `POST /api/user/purchase-shield` and a purchase panel in `Profile.tsx`.
* **Task GM-02 (Priority: Medium)**: Variable XP and Celebrations.
  - Securely randomize XP rewards (1x, 1.5x, 2x) on completion.
  - Integrate confetti particle animations.
* **Task GM-03 (Priority: Medium)**: Badge Accomplishments.
  - Build profile awards panel for learning streaks.

## Epic 5: Immersive Swiping & Feed Personalization
* **Task FD-01 (Priority: Critical)**: Vertical Swipe Deck.
  - Re-engineer `Index.tsx` into virtualized vertical card carousels.
* **Task FD-02 (Priority: High)**: Recommendation scoring engine.
  - Score cards dynamically based on user domain affinity.

## Epic 6: Social Loops & Referral Systems
* **Task SC-01 (Priority: Medium)**: Learning Guilds.
  - Database schema and API endpoints for team management.
* **Task SC-02 (Priority: Medium)**: Viral Referral Rewards.
  - Unique sign-up tracking and conversion XP payouts.

## Epic 7: Enterprise Dashboards
* **Task EN-01 (Priority: Medium)**: Team Analytics Panel.
  - Corporate manager analytics console for monitoring employees or students.
* **Task EN-02 (Priority: Medium)**: Instructor Assignments Panel.
  - Educator dashboard to allocate content tracks.
