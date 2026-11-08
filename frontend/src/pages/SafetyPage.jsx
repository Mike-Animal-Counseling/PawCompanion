import React from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useFetch';
import Icon from '../components/Icon';
import classes from './SafetyPage.module.css';

const PRINCIPLES = [
  {
    icon: 'shield',
    title: 'Screened before every reply',
    body: 'Each message passes through a local keyword layer and, when configured, a clinical text classifier before the companion responds. A high-risk message interrupts the conversation.',
  },
  {
    icon: 'heart',
    title: 'Support mode slows things down',
    body: 'When distress is detected, the companion switches into a gentler mode: validate first, ask one question at a time, and avoid advice that sounds clinical.',
  },
  {
    icon: 'users',
    title: 'A human can always step in',
    body: 'Sustained or repeated risk signals create a watch profile. Authorised operators see derived levels and timestamps — never your raw messages — and can escalate to human support.',
  },
  {
    icon: 'lock',
    title: 'Collect less, delete easily',
    body: 'The risk log stores a level and a timestamp, not text. You can delete all companion chats and safety data from your account at any time.',
  },
];

const STEPS = [
  { letter: 'S', title: 'Situation', body: '“What happened just before you felt this way?” — a gentle invitation, not an interrogation.' },
  { letter: 'T', title: 'Thought', body: '“What did your mind say about it?” — naming the thought makes it easier to hold.' },
  { letter: 'F', title: 'Feeling', body: 'Validate the emotion. Optionally rate it 0–10 so it has a shape rather than a fog.' },
  { letter: 'N', title: 'Next', body: 'One tiny action and one gentle reframe. Never a list, never a lecture.' },
];

const DATA = [
  { label: 'Digital pet chat history', detail: 'Stored per companion until you delete it. Visible only to you.', retention: 'Until deleted' },
  { label: 'Risk signals', detail: 'Derived level, score and timestamp. No raw message text is stored here.', retention: 'Up to 120 days' },
  { label: 'Bookings & payments', detail: 'Needed for visit logistics, receipts and refunds. Contact details are withheld from public profiles.', retention: 'Account lifetime' },
  { label: 'Account & sessions', detail: 'Email, name, city, hashed password and device sessions. You can revoke sessions at any time.', retention: 'Until deletion' },
];

export default function SafetyPage() {
  useDocumentTitle('Safety & privacy', 'How PawCompanion screens conversations, handles a crisis, and protects your data.');
  return (
    <div className={classes.page}>
      <section className={classes.hero}>
        <div className={`container ${classes.heroGrid}`}>
          <div>
            <span className="eyebrow">Safety &amp; privacy</span>
            <h1 className={classes.title}>
              Companionship that knows its <em>limits.</em>
            </h1>
            <p className={classes.lede}>
              A friendly voice can help a hard day feel less heavy. It cannot replace a therapist, a friend or an
              emergency service. PawCompanion is built around that distinction.
            </p>
            <div className={classes.actions}>
              <a href="#crisis" className="btn">Crisis resources</a>
              <Link to="/" className="btn btn-secondary">Browse companions</Link>
            </div>
          </div>
          <div className={classes.heroCard}>
            <span className={`dot ${classes.liveDot}`} />
            <span className={classes.heroCardLabel}>Support mode · active</span>
            <p className={classes.heroQuote}>“I am really glad you told me. You deserve support from a person right now, not just me.”</p>
            <div className={classes.heroResources}>
              <span><Icon name="phone" size={15} /> US: call or text 988</span>
              <span><Icon name="globe" size={15} /> findahelpline.com</span>
            </div>
            <span className={classes.heroNote}>Crisis messages pause the AI and surface real resources.</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Design principles</span>
              <h2 className="section-title" style={{ marginTop: 10 }}>Four promises we can keep.</h2>
            </div>
            <p>
              Safety is not a content warning at the bottom of the page. It is a set of decisions in the product,
              the data model and the way hosts are onboarded.
            </p>
          </div>
          <div className={classes.principles}>
            {PRINCIPLES.map((principle) => (
              <article key={principle.title} className={classes.principle}>
                <span className={classes.principleIcon}><Icon name={principle.icon} size={21} /></span>
                <h3>{principle.title}</h3>
                <p>{principle.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`section ${classes.supportSection}`}>
        <div className={`container ${classes.supportGrid}`}>
          <div>
            <span className="eyebrow">Inside support mode</span>
            <h2 className="section-title" style={{ marginTop: 12 }}>The STF-N loop, used gently.</h2>
            <p className="lede" style={{ marginTop: 18 }}>
              Support mode is not a script that pretends to be a therapist. It is a slower conversational rhythm:
              one step at a time, always in the companion’s own voice.
            </p>
            <div className={classes.steps}>
              {STEPS.map((step) => (
                <div key={step.letter} className={classes.step}>
                  <span className={classes.stepLetter}>{step.letter}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <aside className={classes.sideNote}>
            <span className={classes.sideIcon}><Icon name="alert" size={21} /></span>
            <h3>When someone is in danger</h3>
            <p>
              If a message contains a clear self-harm signal, PawCompanion stops the normal reply and returns a
              crisis message with local resources. The event is recorded as a risk level, not as text.
            </p>
            <p>
              Two high-risk events in seven days, or a sustained elevated score, places the account in a private
              review queue for a human operator.
            </p>
            <div className={classes.sideRule} />
            <p className={classes.sideSmall}>PawCompanion never contacts emergency services on your behalf. If you are in immediate danger, call your local emergency number.</p>
          </aside>
        </div>
      </section>

      <section className="section" id="crisis">
        <div className="container">
          <div className={classes.crisisCard}>
            <div className={classes.crisisCopy}>
              <span className={classes.crisisEyebrow}>If you need more than a companion</span>
              <h2>Talk to a person. Right now.</h2>
              <p>These services are free, confidential and available to talk about suicidal thoughts, emotional distress or someone you are worried about.</p>
            </div>
            <div className={classes.crisisLinks}>
              <a href="https://988lifeline.org/" target="_blank" rel="noreferrer" className={classes.crisisLink}>
                <span className={classes.crisisIcon}><Icon name="phone" size={20} /></span>
                <span><strong>988 Suicide &amp; Crisis Lifeline</strong><small>US · call or text 988</small></span>
                <Icon name="external" size={16} />
              </a>
              <a href="https://findahelpline.com/" target="_blank" rel="noreferrer" className={classes.crisisLink}>
                <span className={classes.crisisIcon}><Icon name="globe" size={20} /></span>
                <span><strong>Find a helpline</strong><small>International directory</small></span>
                <Icon name="external" size={16} />
              </a>
              <a href="tel:911" className={classes.crisisLink}>
                <span className={classes.crisisIcon}><Icon name="alert" size={20} /></span>
                <span><strong>Emergency services</strong><small>Immediate danger · US 911</small></span>
                <Icon name="arrow-right" size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className={`section ${classes.dataSection}`}>
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Privacy</span>
              <h2 className="section-title" style={{ marginTop: 10 }}>What we keep, and for how long.</h2>
            </div>
            <p>
              You can review and delete companion data from your account. Account and booking records are kept for
              as long as your account exists, unless you ask us to delete them.
            </p>
          </div>
          <div className={classes.dataTable}>
            {DATA.map((row) => (
              <div key={row.label} className={classes.dataRow}>
                <div>
                  <strong>{row.label}</strong>
                  <p>{row.detail}</p>
                </div>
                <span className="badge">{row.retention}</span>
              </div>
            ))}
          </div>
          <div className={classes.dataActions}>
            <Link to="/account" className="btn">Manage your data</Link>
            <span>Deleting companion data removes chats and derived risk signals.</span>
          </div>
        </div>
      </section>

      <section className={`section ${classes.boundaries}`}>
        <div className="container">
          <div className={classes.boundariesCard}>
            <div>
              <span className="eyebrow">Clear boundaries</span>
              <h2>What PawCompanion is not.</h2>
            </div>
            <ul>
              <li><Icon name="close" size={16} /> Not therapy, diagnosis or medical advice.</li>
              <li><Icon name="close" size={16} /> Not monitored 24/7 by a human crisis team.</li>
              <li><Icon name="close" size={16} /> Not a substitute for friends, family or professional care.</li>
              <li><Icon name="check" size={16} /> A warm, safety-aware first step — and a real visit with an animal.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
