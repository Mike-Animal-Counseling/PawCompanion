import React from 'react';
import { Link } from 'react-router-dom';
import { useFetch, useDocumentTitle } from '../hooks/useFetch';
import { relativeTime, speciesLabel } from '../lib/format';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import { PageLoader } from '../components/Feedback';
import { useAuth } from '../context/AuthContext';
import classes from './ChatsPage.module.css';

export default function ChatsPage() {
  useDocumentTitle('Messages');
  const { user } = useAuth();
  const { data: conversations, loading, error } = useFetch('/api/ai/conversations?pageSize=24');

  return (
    <div className={classes.page}>
      <div className="container">
        <div className="page-head">
          <div>
            <span className="eyebrow">Your companions</span>
            <h1 className="page-title" style={{ marginTop: 10 }}>Messages</h1>
            <p className="page-sub">
              The online half of your companionship. {user?.name?.split(' ')[0]}, your conversations are private,
              and you can clear any chat at any time.
            </p>
          </div>
          <div className={classes.headActions}>
            <Link to="/check-in" className="btn btn-secondary">
              <Icon name="heart" size={16} /> Daily check-in
            </Link>
            <Link to="/" className="btn btn-secondary">
              <Icon name="search" size={16} /> Find someone new
            </Link>
          </div>
        </div>

        <div className={classes.safetyStrip}>
          <Icon name="shield" size={18} />
          <div>
            <strong>Support mode is always available.</strong>
            <span>If a conversation gets heavy, the companion slows down and shares crisis resources. It is not therapy.</span>
          </div>
          <Link to="/safety" className="link-arrow">Safety model <Icon name="arrow-right" size={14} /></Link>
        </div>

        {loading ? (
          <PageLoader label="Loading your conversations…" />
        ) : error ? (
          <EmptyState icon="alert" title="Could not load messages" action={<button type="button" className="btn" onClick={() => window.location.reload()}>Reload</button>}>
            The API did not respond. Check the backend and try again.
          </EmptyState>
        ) : !conversations?.length ? (
          <EmptyState
            icon="chat"
            title="No conversations yet"
            action={<Link to="/" className="btn">Meet a companion</Link>}
          >
            Say hello to a companion and the conversation will appear here. There is no pressure to book a visit.
          </EmptyState>
        ) : (
          <div className={classes.list}>
            {conversations.map((conversation) => (
              <Link key={conversation.animalId} to={`/chat/${conversation.animalId}`} className={classes.row}>
                <div className={classes.avatar}>
                  {conversation.imageUrl ? <img src={conversation.imageUrl} alt="" /> : <Icon name="paw" size={26} />}
                </div>
                <div className={classes.body}>
                  <div className={classes.top}>
                    <h2>{conversation.animalName}</h2>
                    <span className={`badge ${conversation.mode === 'support' ? 'badge-danger' : 'badge-info'}`}>
                      {conversation.mode === 'support' ? 'Support mode' : 'Play mode'}
                    </span>
                    <span className={classes.time}>{relativeTime(conversation.lastMessageAt)}</span>
                  </div>
                  <p className={classes.preview}>{conversation.preview || 'Start the conversation.'}</p>
                  <div className={classes.meta}>
                    <span>{speciesLabel(conversation.species)}{conversation.breed ? ` · ${conversation.breed}` : ''}</span>
                    <span>{conversation.messageCount} messages</span>
                  </div>
                </div>
                <span className={classes.arrow}><Icon name="arrow-right" size={17} /></span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
