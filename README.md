# PawCompanion — AI Pet Companion Platform

> An AI-powered full-stack web app with emotional support chat, safety risk scoring, and a seamless booking experience for people with mental health needs.

[Demo](#demo) · [Features](#key-features) · [Run Locally](#getting-started) · [Documentation](#documentation)

## Demo

### Home Page — Browse & Filter Pets

<img src="./docs/screenshots/AI-Pet-HomePage.PNG" width="100%" alt="Home Page" />

---

<details>
<summary>Explore AI chat, booking, checkout, merchant tools, and risk profiles</summary>

### AI Chat — Play Mode, Support Mode & Image Generation

| Chat Modes + Safety                                                                        | Image Generation                                                                                |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| <img src="./docs/screenshots/AI-Pet-ChatModes+Safety.PNG" width="100%" alt="Chat Modes" /> | <img src="./docs/screenshots/Ai-Pet-ImageGeneration.PNG" width="100%" alt="Image Generation" /> |

---

### Booking & Checkout Flow

|                                                                                             |                                                                                           |
| :-----------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------: |
|                                        **Pet Cards**                                        |                                    **Booking Details**                                    |
|     <img src="./docs/screenshots/AI-Pet-AnimalsCard.PNG" width="92%" alt="Pet Cards" />     | <img src="./docs/screenshots/AI-Pet-BookingCard.PNG" width="92%" alt="Booking Details" /> |
|                                      **Shopping Cart**                                      |                                        **Payment**                                        |
|  <img src="./docs/screenshots/AI-Pet-BookingCard2.PNG" width="92%" alt="Shopping Cart" />   |      <img src="./docs/screenshots/AI-Pet-Checkout.PNG" width="92%" alt="Payment" />       |
|                                   **Checkout Successful**                                   |                                       **My Orders**                                       |
| <img src="./docs/screenshots/AI-Pet-Checkout2.PNG" width="92%" alt="Checkout Successful" /> |     <img src="./docs/screenshots/AI-Pet-MyOrders.PNG" width="92%" alt="My Orders" />      |

---

### Merchant Portal

|                                          Merchant Portal Login                                           |                                        Merchant Portal Dashboard                                         |
| :------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------: |
| <img src="./docs/screenshots/AI-Pet-MerchantPortal.PNG" width="100%" alt="Merchant Portal Login Page" /> | <img src="./docs/screenshots/AI-Pet-MerchantPortal2.PNG" width="100%" alt="Merchant Portal Dashboard" /> |

---

### Risk Profile (Admin / Developer View)

<img src="./docs/screenshots/AI-Pet-RiskScoreSystem.PNG" width="100%" alt="Risk Profile" />

---

</details>

## What This App Does

This app lets users browse, search, and book the delivery of adoptable pets. Each pet has its own AI personality that users can chat with — for fun or emotional support. Behind the scenes, the app monitors conversations for safety signals and maintains a time-decayed risk profile per user.

---

## Key Features

### Pet Browsing & Search

- Browse all available animals with photos, names, and prices
- Search by name or filter by location tags
- View individual pet detail pages

### Shopping Cart

- Add multiple pets to a cart
- Adjust quantities, remove items
- Cart persists across page refreshes via localStorage

### AI Chat System

- Every pet has a unique personality profile
- **Play mode** — lighthearted, fun, character-driven conversation
- **Support mode** — warm, emotionally validating responses (STF-N framework)
- Automatic mode switching based on message content with confidence scoring
- Chat history saved per user per pet (MongoDB)
- Image generation from chat prompts

### Booking & Delivery

- Select delivery date and address
- Automatic delivery cost calculation
- Tracking number generation

### Checkout & Payment

- Step-by-step checkout flow
- Credit card input with formatting
- Order confirmation screen

### Safety & Risk Scoring

- Every chat message is scanned for self-harm signals
- User risk scores calculated with time-decay (7-day and 30-day windows)
- Risk status: `ok` → `watch` → `flagged`
- Crisis response with helpline resources returned automatically when needed
- Background scanner for inactive high-risk users

---

## Tech Stack

| Layer            | Technology                                          |
| ---------------- | --------------------------------------------------- |
| Frontend         | React, Vite, React Router, CSS Modules |
| State            | React Context API                                   |
| HTTP             | Axios                                               |
| Backend          | Node.js, Express.js                                 |
| Database         | MongoDB, Mongoose                                   |
| AI / NLP         | HuggingFace Inference API                           |
| Image Generation | HuggingFace Inference API                           |
| Safety Engine    | Custom keyword + scoring system                     |

---

## Project Structure

```
PawCompanion/
├── README.md                  ← You are here
├── Architecture.md            ← Full technical review and design notes
├── frontend/                  ← React app
│   ├── src/
│   │   ├── components/        ← Reusable UI components
│   │   ├── pages/             ← Route-level pages
│   │   ├── context/           ← Global state (UserContext)
│   │   ├── hooks/             ← useCart
│   │   └── services/          ← API call wrappers
│   └── README.md              ← Frontend setup guide
└── backend/                   ← Express API server
    ├── src/
    │   ├── routers/           ← Route handlers
    │   ├── services/          ← Business logic
    │   ├── models/            ← Mongoose schemas
    │   └── config/            ← Database connection
    ├── README.md              ← Backend setup guide
    ├── AI_SETUP_GUIDE.md      ← HuggingFace API configuration
    └── TEST_GUIDE.md          ← Manual and automated test instructions
```

---

## Getting Started

### Prerequisites

- Node.js 24+
- npm
- MongoDB (local or Atlas) — required for AI Chat and risk scoring
- HuggingFace API key — required when enabling AI responses and image generation

---

### 1. Clone the Repository

```bash
git clone https://github.com/Mike-Animal-Counseling/PawCompanion.git
cd PawCompanion
```

### 2. Configure the Backend

```bash
cd backend
cp .env.example .env
```

Use [`backend/.env.example`](backend/.env.example) as the source of truth. Set `MONGO_URI` to your MongoDB connection string and generate a fresh `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Paste the output into `JWT_SECRET` in `backend/.env`. Keep `CORS_ORIGIN=http://localhost:3000` for local use. To try AI features, set `ENABLE_AI=true` and supply `HUGGINGFACE_API_KEY`.

### 3. Start the Backend

Continue in the `backend` directory:

```bash
npm ci
npm run seed      # optional: populate the database with sample animals
npm run dev
```

Backend runs at: `http://localhost:5000`

### 4. Start the Frontend

In a second terminal, from the repository root:

```bash
cd frontend
npm ci
npm start
```

Frontend runs at: `http://localhost:3000`

---

## API Overview

| Method   | Endpoint                           | Description           |
| -------- | ---------------------------------- | --------------------- |
| `GET`    | `/api/animals`                     | List all animals      |
| `GET`    | `/api/animals/:id`                 | Get one animal        |
| `GET`    | `/api/animals/search/:term`        | Search animals        |
| `GET`    | `/api/animals/tag/:tag`            | Filter by tag         |
| `POST`   | `/api/ai/chat`                     | Send a chat message   |
| `GET`    | `/api/ai/memory/:userId/:animalId` | Get chat history      |
| `DELETE` | `/api/ai/memory/:userId/:animalId` | Clear chat history    |
| `GET`    | `/api/ai/risk-profile/:userId`     | Get user risk profile |
| `POST`   | `/api/booking`                     | Create a booking      |
| `POST`   | `/api/payment/checkout`            | Process a payment     |

---

## Safety System — How It Works

```
User sends a message
        |
        v
detectSelfHarm(message)          <- in-memory analysis, no DB required
        |
        |-- flagged = true  -->  Return crisis response + helpline numbers
        |
        |-- flagged = false -->  Record risk event in MongoDB
                                 Update user's time-decayed risk score
                                 Return normal AI response
```

**Risk score thresholds:**

| Condition                                       | Status    |
| ----------------------------------------------- | --------- |
| score30d >= 18 or 2+ high-risk events in 7 days | `flagged` |
| score7d >= 10                                   | `watch`   |
| Default                                         | `ok`      |

---

## Documentation

| File                                                     | Contents                                              |
| -------------------------------------------------------- | ----------------------------------------------------- |
| [Architecture.md](./Architecture.md)                     | Full project review, design decisions, feature status |
| [backend/README.md](./backend/README.md)                 | Backend setup and endpoint reference                  |
| [backend/AI_SETUP_GUIDE.md](./backend/AI_SETUP_GUIDE.md) | HuggingFace API configuration                         |
| [backend/TEST_GUIDE.md](./backend/TEST_GUIDE.md)         | Manual curl tests and automated test script           |

---

## Known Limitations

| Area                | Status                                       |
| ------------------- | -------------------------------------------- |
| User authentication | Backend JWT authentication with account ownership and role checks |
| Payment processing  | Prototype only; production checkout and booking changes are disabled until real payments and atomic reservations are integrated |
| Animal data         | Seeded static data — no admin CMS            |
| Image generation    | Requires active HuggingFace API key          |

## Security and deployment

Read the [security policy](SECURITY.md) and [production requirements](docs/PRODUCTION_SECURITY.md) before deployment.
