import React, { useState } from 'react';
import api, { errorMessage } from '../../lib/api';
import { useFetch, useDocumentTitle } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { formatDateShort, initials } from '../../lib/format';
import Icon from '../../components/Icon';
import Rating from '../../components/Rating';
import EmptyState from '../../components/EmptyState';
import { PageLoader, Pagination } from '../../components/Feedback';
import classes from './MerchantReviewsPage.module.css';

const TABS = [
  { key: 'all', label: 'All reviews' },
  { key: 'unreplied', label: 'Needs a reply' },
  { key: 'replied', label: 'Replied' },
];

export default function MerchantReviewsPage() {
  useDocumentTitle('Reviews');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState('all');
  const { data: reviews, meta, loading, error, refetch } = useFetch(`/api/merchant/reviews?page=${page}&pageSize=12`);
  const [replyOpen, setReplyOpen] = useState(null);
  const [replyBody, setReplyBody] = useState('');
  const [saving, setSaving] = useState(false);

  const visible = (reviews || []).filter((review) => {
    if (tab === 'unreplied') return !review.merchantReply;
    if (tab === 'replied') return Boolean(review.merchantReply);
    return true;
  });

  const startReply = (review) => {
    setReplyOpen(review.id);
    setReplyBody(review.merchantReply?.body || '');
  };

  const submitReply = async (review) => {
    if (!replyBody.trim()) return;
    setSaving(true);
    try {
      await api.post(`/api/merchant/reviews/${review.id}/reply`, { body: replyBody.trim() });
      toast.success('Reply published.');
      setReplyOpen(null);
      setReplyBody('');
      await refetch();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not publish that reply.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={classes.page}>
      <div className={classes.head}>
        <div>
          <span className="eyebrow">Reviews</span>
          <h1>What guests remember</h1>
          <p>Specific, warm replies build trust. They are public and appear under the companion profile.</p>
        </div>
        <div className={classes.summary}>
          <Icon name="star-filled" size={18} />
          <div>
            <strong>{meta?.total ?? 0}</strong>
            <span>published review{meta?.total === 1 ? '' : 's'}</span>
          </div>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Review filters">
        {TABS.map((item) => (
          <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} className={`tab ${tab === item.key ? 'tab-active' : ''}`} onClick={() => setTab(item.key)}>
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader label="Loading reviews…" />
      ) : error ? (
        <EmptyState icon="alert" title="Could not load reviews" action={<button type="button" className="btn" onClick={refetch}>Try again</button>}>
          The partner API did not respond.
        </EmptyState>
      ) : !visible.length ? (
        <EmptyState icon="star" title={tab === 'all' ? 'No reviews yet' : 'Nothing in this filter'} action={tab !== 'all' ? <button type="button" className="btn" onClick={() => setTab('all')}>Show all</button> : <LinkToBookings />}>
          {tab === 'all' ? 'Reviews appear after a completed visit. Guests are prompted automatically.' : 'Try another filter.'}
        </EmptyState>
      ) : (
        <div className={classes.list}>
          {visible.map((review) => (
            <article key={review.id} className={classes.card}>
              <div className={classes.cardHead}>
                <span className="avatar" style={{ background: review.author?.avatarColor || undefined }}>{initials(review.author?.name || 'Guest')}</span>
                <div className={classes.author}>
                  <strong>{review.author?.name || 'Verified guest'}</strong>
                  <span>{review.animal?.name} · {formatDateShort(review.createdAt)}</span>
                </div>
                <Rating value={review.rating} showValue={false} size={14} />
              </div>

              {review.title && <h2>{review.title}</h2>}
              {review.body && <p className={classes.body}>{review.body}</p>}

              {review.merchantReply ? (
                <div className={classes.reply}>
                  <div className={classes.replyHead}>
                    <span>Your reply</span>
                    <button type="button" onClick={() => startReply(review)}>Edit</button>
                  </div>
                  <p>{review.merchantReply.body}</p>
                </div>
              ) : (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => startReply(review)}>
                  <Icon name="chat" size={14} /> Reply publicly
                </button>
              )}

              {replyOpen === review.id && (
                <div className={classes.replyForm}>
                  <label className="label" htmlFor={`reply-${review.id}`}>Your public reply</label>
                  <textarea
                    id={`reply-${review.id}`}
                    className="textarea"
                    rows={3}
                    maxLength={1000}
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    placeholder="Thank the guest, add context, or explain what changed."
                  />
                  <div className={classes.replyActions}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReplyOpen(null)}>Cancel</button>
                    <button type="button" className="btn btn-sm" onClick={() => submitReply(review)} disabled={saving || !replyBody.trim()}>
                      {saving ? 'Publishing…' : 'Publish reply'}
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <Pagination page={meta?.page || 1} totalPages={meta?.totalPages || 1} onChange={setPage} />
    </div>
  );
}

function LinkToBookings() {
  return (
    <a href="/merchant/bookings" className="btn btn-secondary">
      See bookings
    </a>
  );
}
