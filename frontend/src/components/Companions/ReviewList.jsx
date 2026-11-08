import React from 'react';
import Rating from '../Rating';
import Icon from '../Icon';
import { formatDateShort, initials } from '../../lib/format';
import classes from './ReviewList.module.css';

export default function ReviewList({ reviews = [], breakdown = [], average = 0, count = 0 }) {
  const total = breakdown.reduce((sum, item) => sum + item.count, 0) || count;

  return (
    <div className={classes.wrapper}>
      <div className={classes.summary}>
        <div className={classes.score}>
          <strong>{Number(average || 0).toFixed(1)}</strong>
          <Rating value={average} showValue={false} size={16} />
          <span>{count} verified review{count === 1 ? '' : 's'}</span>
        </div>
        <div className={classes.bars}>
          {[5, 4, 3, 2, 1].map((value) => {
            const row = breakdown.find((item) => item.rating === value) || { count: 0 };
            const percent = total ? Math.round((row.count / total) * 100) : 0;
            return (
              <div key={value} className={classes.barRow}>
                <span>{value}</span>
                <div className={classes.bar}>
                  <div style={{ width: `${percent}%` }} />
                </div>
                <span className={classes.barCount}>{row.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className={classes.empty}>
          <Icon name="chat" size={20} />
          <p>No reviews yet. Be the first to share how a visit felt.</p>
        </div>
      ) : (
        <ul className={classes.list}>
          {reviews.map((review) => (
            <li key={review.id} className={classes.review}>
              <div className={classes.head}>
                <span className="avatar avatar-sm" style={{ background: review.author?.avatarColor || undefined }}>
                  {initials(review.author?.name || 'Guest')}
                </span>
                <div className={classes.author}>
                  <strong>{review.author?.name || 'Verified guest'}</strong>
                  <span>{formatDateShort(review.createdAt)}</span>
                </div>
                <Rating value={review.rating} showValue={false} size={13} />
              </div>
              {review.title && <h4 className={classes.title}>{review.title}</h4>}
              {review.body && <p className={classes.body}>{review.body}</p>}
              {review.merchantReply && (
                <div className={classes.reply}>
                  <strong>Host reply</strong>
                  <p>{review.merchantReply.body}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
