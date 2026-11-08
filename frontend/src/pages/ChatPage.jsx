import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useFetch, useDocumentTitle } from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import { relativeTime, speciesLabel } from '../lib/format';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { PageLoader } from '../components/Feedback';
import ChatMessage from '../components/Chat/ChatMessage';
import classes from './ChatPage.module.css';

const FALLBACK_PROMPTS = [
  'Tell me about your day.',
  'What is your favourite game?',
  'I had a rough day. Can we talk?',
  'What makes you feel safe?',
];

export default function ChatPage() {
  const { id } = useParams();
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState('play');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const { data: conversation, loading, error: loadError, refetch } = useFetch(`/api/ai/conversations/${id}`);
  const { data: aiStatus } = useFetch('/api/ai/status');
  const animal = conversation?.animal;

  useDocumentTitle(animal ? `Chat with ${animal.name}` : 'Companion chat', 'Talk with a safety-aware AI companion on PawCompanion.');

  useEffect(() => {
    if (conversation) {
      setMessages(conversation.messages || []);
      setMode(conversation.chatMode || 'play');
    }
  }, [conversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const send = async (text) => {
    const content = String(text ?? input).trim();
    if (!content || sending) return;
    if (content.length > 4000) {
      toast.error('Messages must be under 4,000 characters.');
      return;
    }

    const optimistic = { role: 'user', content, timestamp: new Date().toISOString() };
    setMessages((current) => [...current, optimistic]);
    setInput('');
    setSending(true);
    setError('');

    try {
      const response = await api.post('/api/ai/chat', { animalId: id, message: content });
      const payload = response.data.data;
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: payload.response,
          timestamp: new Date().toISOString(),
          meta: payload.meta,
          image: payload.image,
        },
      ]);
      setMode(payload.routeMeta?.mode || mode);
      if (payload.meta?.type === 'crisis') {
        toast.info('Support resources have been shared in the conversation.');
      }
    } catch (err) {
      setMessages((current) => current.filter((message) => message !== optimistic));
      setInput(content);
      setError(errorMessage(err, 'The companion could not reply. Please try again.'));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const submit = (event) => {
    event.preventDefault();
    send();
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const clearHistory = async () => {
    setClearing(true);
    try {
      await api.delete(`/api/ai/conversations/${id}`);
      setMessages([]);
      setMode('play');
      setClearOpen(false);
      toast.success('Conversation cleared.');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not clear the conversation.'));
    } finally {
      setClearing(false);
    }
  };

  if (loading) return <PageLoader label="Opening your conversation…" />;

  if (loadError || !conversation) {
    return (
      <div className="container" style={{ padding: '60px 0' }}>
        <EmptyState
          icon="chat"
          title="This conversation is not available"
          action={<Link to="/chats" className="btn">Back to messages</Link>}
        >
          The companion may have been archived by its host.
        </EmptyState>
      </div>
    );
  }

  const prompts = conversation.suggestedPrompts?.length ? conversation.suggestedPrompts : FALLBACK_PROMPTS;
  const demo = aiStatus?.mode === 'demo';
  const lastCompanionMessage = [...messages].reverse().find((message) => message.role === 'assistant');

  return (
    <div className={classes.page}>
      <div className={`container ${classes.shell}`}>
        <aside className={classes.sidebar}>
          <Link to={`/companions/${animal.id}`} className={classes.profileLink}>
            <div className={classes.avatar}>
              {animal.imageUrl ? <img src={animal.imageUrl} alt={animal.name} /> : <Icon name="paw" size={30} />}
            </div>
            <span className={classes.online}><span /> Online now</span>
            <h1>{animal.name}</h1>
            <p>{speciesLabel(animal.species)} · AI companion</p>
          </Link>

          <div className={classes.modeCard}>
            <span className={mode === 'support' ? classes.modeSupport : classes.modePlay}>
              <Icon name={mode === 'support' ? 'heart' : 'sparkles'} size={16} />
              {mode === 'support' ? 'Support mode' : 'Play mode'}
            </span>
            <p>
              {mode === 'support'
                ? 'I will slow down, ask one question at a time, and stay with you. I am not a therapist.'
                : 'We can play, tell stories or just talk about your day. Support mode is always one hard moment away.'}
            </p>
          </div>

          <div className={classes.sideSection}>
            <span className={classes.sideLabel}>Suggested openers</span>
            <div className={classes.prompts}>
              {prompts.slice(0, 3).map((prompt) => (
                <button key={prompt} type="button" onClick={() => send(prompt)} disabled={sending}>
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className={classes.sideSection}>
            <span className={classes.sideLabel}>Make it real</span>
            <Link to={`/book/${animal.id}`} className="btn btn-secondary btn-block btn-sm">
              <Icon name="calendar" size={15} /> Book a visit or video call
            </Link>
          </div>

          <button type="button" className={classes.clear} onClick={() => setClearOpen(true)} disabled={!messages.length}>
            <Icon name="trash" size={15} /> Clear conversation
          </button>
        </aside>

        <section className={classes.chat}>
          <header className={classes.chatHead}>
            <div>
              <strong>{animal.name}</strong>
              <span>
                <span className={classes.headDot} /> Companion chat
                {demo ? ' · demo voice' : ' · model voice'}
              </span>
            </div>
            <span className={`badge ${mode === 'support' ? 'badge-danger' : 'badge-info'}`}>
              <Icon name={mode === 'support' ? 'heart' : 'sparkles'} size={12} />
              {mode === 'support' ? 'Support' : 'Play'}
            </span>
          </header>

          {mode === 'support' && (
            <div className={classes.supportBanner}>
              <Icon name="shield" size={17} />
              <span>
                Support mode is on. I will ask one question at a time and share crisis resources if things get heavy.
              </span>
            </div>
          )}

          <div className={classes.messages} aria-live="polite">
            {messages.length === 0 ? (
              <div className={classes.welcome}>
                <div className={classes.welcomeAvatar}>
                  {animal.imageUrl ? <img src={animal.imageUrl} alt="" /> : <Icon name="paw" size={34} />}
                </div>
                <h2>Say hello to {animal.name}.</h2>
                <p>{animal.personality || 'A companion who is glad you stopped by.'}</p>
                <div className={classes.welcomePrompts}>
                  {prompts.map((prompt) => (
                    <button key={prompt} type="button" className="chip" onClick={() => send(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <ChatMessage key={`${message.timestamp}-${index}`} message={message} animal={animal} />
              ))
            )}

            {sending && (
              <div className={classes.typing}>
                <span /><span /><span />
                <em>{animal.name} is thinking…</em>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && (
            <div className={`notice notice-danger ${classes.error}`} role="alert">
              <Icon name="alert" size={16} />
              <span>{error}</span>
            </div>
          )}

          <form className={classes.composer} onSubmit={submit}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Message ${animal.name}…`}
              rows={1}
              maxLength={4000}
              aria-label={`Message ${animal.name}`}
            />
            <button type="submit" disabled={sending || !input.trim()} className={classes.send} aria-label="Send message">
              <Icon name="send" size={18} />
            </button>
          </form>
          <p className={classes.disclaimer}>
            <Icon name="shield" size={12} /> Companionship, not therapy. Messages are screened for safety and may
            trigger crisis resources. <Link to="/safety">Learn more</Link>
          </p>
          {lastCompanionMessage?.meta?.type === 'crisis' && (
            <span className={classes.lastCrisis}>Crisis resources were shared in this conversation.</span>
          )}
        </section>
      </div>

      <Modal
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title="Clear this conversation?"
        description="The chat history with this companion will be deleted. Your risk profile and other conversations are not affected."
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setClearOpen(false)}>Keep it</button>
            <button type="button" className="btn btn-danger" onClick={clearHistory} disabled={clearing}>
              {clearing ? 'Clearing…' : 'Clear conversation'}
            </button>
          </>
        }
      >
        <div className="notice">
          <Icon name="trash" size={17} />
          <span>This cannot be undone. You can start a new conversation any time.</span>
        </div>
      </Modal>
    </div>
  );
}
