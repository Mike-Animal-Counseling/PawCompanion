# Case study: PawCompanion

> A companionship app for pet people. Online AI company between visits, verified in-person visits when being alone is too much. This is a personal product/engineering project, currently a portfolio-ready demo rather than a launched consumer business.

## The problem

A lot of people who love animals cannot have one: renters, shift workers, people grieving a pet, people whose circumstances changed. At the same time, shelters and cafés have animals and quiet hours that go unused, and many people want low-pressure company without a clinical appointment or a dating-app dynamic.

Existing pet products optimise for transactions: find a pet, book a walker, buy food. The unmet need is **continuity** — someone (or some animal) who remembers you between visits, and a way to see them that does not require a phone call or a high-commitment subscription.

## The user

**Maya, 29, Portland.** Works remotely, lives alone, loves cats but cannot adopt. Her week oscillates between fine and flat. She does not want therapy; she wants company, a small routine and something to look forward to. She will pay for a café visit if booking is clear and she knows the animal and host are safe.

**Willow & Whiskers Cat Café.** Has resident cats, quiet rooms and staff who already host guests. Wants incremental bookings without building software. Needs control over availability, the ability to decline a request, and a public profile that reflects how they treat animals.

**Avery, operations.** Reviews safety signals, suspends partners that break trust, hides listings or reviews that should not be public, and needs an audit trail. Does not want to read private conversations.

## The product bet

1. **Two tracks, one relationship.** Online companionship is not a chatbot bolted onto a marketplace; offline companionship is not a booking widget bolted onto a chat app. They share the companion, identity, favourites, notifications and safety profile.
2. **Low pressure is a feature.** No streaks that punish, no forced subscription, no countdown urgency. The check-in explicitly says “no scores to chase”.
3. **Safety is product design.** The companion changes rhythm when someone is struggling; a high-risk message stops the model and returns crisis resources; operators see derived signals, not raw text.
4. **A booking should behave like a real booking.** Availability, atomic reservation, host confirmation, refund, reschedule and review are part of the product, not a mock checkout.

## What was built

| Surface | Capabilities |
| --- | --- |
| Guest | Discovery with filters/facets, companion detail, reviews, favourites, safety page, register/login |
| Member | Personal home, daily check-in + journal + seven-day chart, digital pet with memory/support mode, bond, bookings, visits, notifications, account and data deletion |
| Partner | 30-day dashboard, listings + image upload, 21-day availability, visit accept/decline/complete/reschedule, review replies, business profile |
| Operator | Platform overview, safety queue, derived risk events, partner suspension, listing/review moderation, audit trail |
| Platform | Rotating refresh sessions, RBAC, Zod validation, shared rate budgets, structured logs, health/readiness, Docker, CI |

## The two flows

### Online

```
check-in → safety screen → companion reply → check-in row + chat memory → bond
```

If a note is high risk, the reply is a crisis card and the model is not called. A medium signal raises a private risk event. The guest can delete chats, check-ins and risk data at any time.

### Offline

```
service + date + slot → atomic reservation → sandbox payment
→ host accept/decline → visit → completion → review → rating recompute
```

A partial unique index guarantees one live booking per companion/date/start time. A cancellation releases the slot and refunds the sandbox payment. Unconfirmed past requests are auto-declined; confirmed past visits are completed by the sweep.

## Trust and safety model

- Local English/Chinese high-risk patterns run synchronously before any model call.
- Medium-risk patterns raise a signal without interrupting.
- Optional classifier and LLM router can improve recall/tone but cannot bypass the keyword layer.
- Risk events store level, score, source and timestamp — never raw message text.
- 7/30-day decayed scores produce `ok`, `watch` or `flagged`; operators can acknowledge/resolve.
- Crisis card includes 988, findahelpline.com and emergency services; it does not contact services automatically.
- The product states plainly: companionship, not therapy or emergency care.

See [SAFETY.md](SAFETY.md) for the operating model and its limits.

## Business model hypothesis

Not implemented; this is a product hypothesis, not a revenue claim.

- **8% guest service fee** on in-person bookings (already reflected in pricing logic).
- **Partner tools** (availability, analytics, review replies) as a lightweight subscription for high-volume hosts.
- **Plus membership** for guests: priority booking windows, a small monthly digital-pet credit, and advanced memory — optional, never required for basic companionship.
- No ads and no sale of conversation data. The trust position is the moat.

## Metrics I would use

| Question | Metric | Why |
| --- | --- | --- |
| Is the relationship forming? | 7-day check-in retention; conversations per active guest | Continuity, not signups |
| Does online lead to offline? | Chat/check-in → first booking conversion | The dual-track thesis |
| Is supply healthy? | Host acceptance time; repeat guest rate per companion | Liquidity and trust |
| Is safety working? | Time to acknowledge watch/flagged; % high-risk messages that got resources | Operational quality |
| Is quality real? | Review rate after completion; rating distribution | Trust, not vanity stars |
| Is it sustainable? | Contribution after service fee; CAC per first visit | Business viability |

I would instrument these with privacy review; no message content in analytics.

## Launch plan

1. **Closed Portland beta:** 5–8 partners, 50–100 guests, one operator on call during beta hours.
2. **Safety readiness:** localised helplines, reviewed copy, documented escalation, incident log, data deletion rehearsal.
3. **Payments:** live provider with webhooks, idempotency, refunds and reconciliation; remove all sandbox copy from the guest path.
4. **Trust supply:** partner verification, insurance/background checks where required, animal welfare guidelines.
5. **Distribution:** PWA install + SEO city pages. The product is web/PWA-only; native shells and app-store listings are intentionally out of scope.

## Risks and trade-offs

- **Supply is hard.** A beautiful booking flow cannot fix unreliable hosts. Concentrate on one city and a small number of high-quality partners.
- **Safety cannot be fully automated.** Keyword detection is a floor. A real launch needs human escalation and clinical/legal review.
- **AI can harm if over-claimed.** The product deliberately says it is not therapy, keeps a deterministic crisis floor, and requires a configured primary model for chat rather than hiding provider failures behind keyword replies.
- **Two tracks can blur.** The UI keeps online check-ins and in-person visits distinct, while the companion and bond connect them.
- **Payments are sandboxed.** The lifecycle is complete and auditable, but no money moves. Live payments are a launch blocker.
- **No native app by design.** The PWA is the product shell. Native distribution is intentionally out of scope, which keeps the surface area and compliance burden focused on the web app.

## What this project demonstrates

- Product thinking: a clear user, a non-obvious dual-track thesis, explicit trade-offs and a launch plan.
- Full-stack execution: domain modelling, atomic booking, auth/session rotation, validation, rate limits, admin/moderation, responsive design.
- Safety engineering: layered detection, privacy-preserving risk data, operator workflows and honest limitations.
- Engineering quality: 47 backend tests, browser E2E, CI, Docker, structured logs, graceful shutdown and documentation.

## Next

Live payments · deep audio embeddings · LLM trait extraction · recurring partner schedules · real-time notifications · PWA polish · TypeScript/OpenAPI contracts · production safety operations.

---

*All people, animals, reviews and bookings in the demo are fictional. The sandbox payment provider does not charge a card.*
