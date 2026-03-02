# Cat Delivery App — Project Review & Architecture

> A full-stack pet adoption/rental platform with AI-powered chat, risk scoring, and delivery booking.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Features](#features)
3. [User Authentication](#user-authentication)
4. [Risk Scoring System](#risk-scoring-system)
5. [Feature Status Summary](#feature-status-summary)
6. [Testing the Risk Scoring System](#testing-the-risk-scoring-system)
7. [What's Needed to Complete Auth](#whats-needed-to-complete-auth)

---

## Architecture Overview

### Frontend — React

| Concern          | Technology       |
| ---------------- | ---------------- |
| Framework        | Create React App |
| Routing          | React Router     |
| State Management | Context API      |
| Styling          | CSS Modules      |
| HTTP Client      | Axios            |

### Backend — Express + MongoDB

| Concern           | Technology                 |
| ----------------- | -------------------------- |
| Server            | Express.js                 |
| Database          | MongoDB + Mongoose         |
| AI                | HuggingFace API            |
| Image Generation  | HuggingFace Inference      |
| Safety/Moderation | Custom risk scoring engine |

```
frontend/src/
├── components/       # Reusable UI components
├── context/          # UserContext (auth state)
├── hooks/            # useCart
├── pages/            # Route-level page components
├── services/         # API call wrappers
└── utils/            # sessionUserId helper

backend/src/
├── config/           # MongoDB connection
├── models/           # Mongoose schemas
├── routers/          # Express route handlers
├── scripts/          # DB seed script
└── services/         # Business logic (AI, risk, booking, etc.)
```

---

## Features

### 1. Animal Browsing & Search

- View all available pets on the home page
- Search animals by name via the `Search` component
- Filter by location tags via the `Tags` component
- View individual animal details on the `AnimalPage`

### 2. Shopping Cart

- Add / remove pets from cart via the `useCart` hook
- Quantity management
- Persists to `localStorage`
- View and manage cart on `CartPage`

### 3. AI Chat System

- Chat with individual pet "personalities"
- Two routing modes:
  - **Play mode** — fun, personality-driven conversation
  - **Support mode** — helpful assistance and information
- Smart mode routing with confidence scoring
- Chat history stored in MongoDB via `ChatMemory` model
- Image generation triggered from chat prompts

### 4. Booking System

- Book pet delivery from `BookingPage`
- Delivery cost calculation
- Delivery date scheduling
- Auto-generated tracking numbers

### 5. Checkout & Payment

- Mock payment processing via `CheckoutPage`
- Credit card input formatting
- Order confirmation simulation

---

## User Authentication

**Status: ⚠️ Cosmetic Only — Not Implemented**

### What Exists

- Login/logout UI in the `Header` and `LoginPage`
- Anonymous session ID generated and persisted via `sessionUserId.js`
- `UserContext` provides user state to the whole app

### What's Missing

```
❌  No backend auth routes (register / login / logout)
❌  No User model with password hashing
❌  No JWT or session middleware
❌  User name is hardcoded as "Mr.Liang" in UserContext
```

### Current Behaviour

```js
// UserContext.js — default user is hardcoded
const [user, setUser] = useState({
  name: "Mr.Liang",
});

// Logout only clears the local session and generates a new anonymous ID
const logout = () => {
  setUser(null);
  clearSessionUserId();
  setUserId(getOrCreateUserId());
};
```

Every visitor receives an **anonymous UUID** for tracking purposes (used by the risk scoring system), but there is no real account system behind it.

---

## Risk Scoring System

**Status: ✅ Fully Implemented**

This is the most sophisticated backend subsystem. It monitors AI chat messages for safety concerns and maintains a time-decayed risk profile per user.

### Components

| File                        | Role                                             |
| --------------------------- | ------------------------------------------------ |
| `services/safety.js`        | Detects self-harm and crisis signals in messages |
| `services/riskScoring.js`   | Calculates and updates the user's risk score     |
| `models/RiskEvent.js`       | Stores individual risk incidents in MongoDB      |
| `models/UserRiskProfile.js` | Stores the aggregated risk status per user       |
| `routers/ai.router.js`      | Wires safety checks into the chat endpoint       |

### Points System

```
Low risk    →  0 points
Medium risk →  score × 2
High risk   →  score × 6
```

### Time Decay

Scores decay exponentially over time so that old incidents have less impact:

```
7-day window   →  half-life of 3 days
30-day window  →  half-life of 10 days
```

### Status Thresholds

```
score30d ≥ 18  OR  highEvents7d ≥ 2  →  status: "flagged"
score7d  ≥ 10                         →  status: "watch"
otherwise                             →  status: "ok"
```

### Crisis Response Flow

```
User sends message
      │
      ▼
detectSelfHarm(message)
      │
      ├── risk.flagged = true ──► Return crisis resources (no AI response)
      │
      └── risk.flagged = false ─► recordRiskEventAndUpdateProfile()
                                        │
                                        ▼
                                  Normal AI response
```

### API Endpoints

| Method   | Endpoint                           | Description                                    |
| -------- | ---------------------------------- | ---------------------------------------------- |
| `POST`   | `/api/ai/chat`                     | Process message, run safety check, update risk |
| `GET`    | `/api/ai/risk-profile/:userId`     | Retrieve risk profile and recent events        |
| `DELETE` | `/api/ai/memory/:userId/:animalId` | Clear a user's chat history                    |

### Background Scanning

The service also includes `scanInactiveHighRiskUsers()` to periodically flag users who were elevated risk and have gone quiet.

---

## Feature Status Summary

| Feature                     | Frontend | Backend |   Database   | Status              |
| --------------------------- | :------: | :-----: | :----------: | ------------------- |
| Animal browsing             |    ✅    |   ✅    |  ⚠️ seeded   | **Working**         |
| Search & filter             |    ✅    |   ✅    |  ⚠️ seeded   | **Working**         |
| Shopping cart               |    ✅    |    —    | localStorage | **Working**         |
| AI Chat                     |    ✅    |   ✅    |  ✅ MongoDB  | **Working**         |
| Mode routing (Play/Support) |    ✅    |   ✅    |      ✅      | **Working**         |
| Image generation            |    ✅    |   ✅    |      —       | **Working**         |
| Booking                     |    ✅    |   ✅    |   ⚠️ mock    | **Partial**         |
| Payment / Checkout          |    ✅    |   ✅    |   ⚠️ mock    | **Mock only**       |
| User authentication         |  ✅ UI   |   ❌    |      ❌      | **Not implemented** |
| Risk scoring                |    —     |   ✅    |  ✅ MongoDB  | **Fully working**   |

---

## Testing the Risk Scoring System

### Send a message that may trigger risk detection

```bash
curl -X POST http://localhost:5000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test123","animalId":"1","message":"I feel very sad today"}'
```

### Check the user's risk profile

```bash
curl http://localhost:5000/api/ai/risk-profile/test123
```

### Expected profile response shape

```json
{
  "userId": "test123",
  "status": "ok | watch | flagged",
  "score7d": 0,
  "score30d": 0,
  "recentEvents": []
}
```

---

## What's Needed to Complete Auth

To turn the cosmetic auth into a real system:

### 1. Backend — add `auth.router.js`

```
POST  /api/auth/register   →  hash password, create User document
POST  /api/auth/login      →  verify password, return JWT
POST  /api/auth/logout     →  invalidate token / clear cookie
GET   /api/auth/me         →  return current user from token
```

### 2. Backend — add `User` model

```js
// models/User.js
{
  (name, email, passwordHash, createdAt);
}
```

Use **bcrypt** for password hashing and **jsonwebtoken** for JWT issuance.

### 3. Backend — add auth middleware

```js
// middleware/auth.js
// Verify JWT on protected routes
```

### 4. Frontend — update `UserContext.js`

Replace the hardcoded `"Mr.Liang"` default with real API calls to `/api/auth/login` and `/api/auth/me`.

---

_Last reviewed: March 2, 2026_
