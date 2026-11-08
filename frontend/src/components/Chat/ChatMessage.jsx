import React from 'react';
import Icon from '../Icon';
import classes from './ChatMessage.module.css';

export default function ChatMessage({ message, animal }) {
  const mine = message.role === 'user';
  const crisis = message.meta?.type === 'crisis';

  return (
    <div className={`${classes.row} ${mine ? classes.mine : ''}`}>
      {!mine && (
        <span className={classes.avatar}>
          {animal?.imageUrl ? <img src={animal.imageUrl} alt="" /> : <Icon name="paw" size={17} />}
        </span>
      )}
      <div className={classes.bubbleWrap}>
        {!mine && <span className={classes.author}>{animal?.name || 'Companion'}</span>}
        <div className={`${classes.bubble} ${mine ? classes.userBubble : ''} ${crisis ? classes.crisisBubble : ''}`}>
          {crisis && (
            <div className={classes.crisisHead}>
              <Icon name="shield" size={17} />
              <span>Support resources</span>
            </div>
          )}
          <p className={classes.content}>{message.content}</p>
          {message.image?.imageUrl && (
            <img className={classes.generated} src={message.image.imageUrl} alt="A generated illustration from your conversation" />
          )}
          {crisis && message.meta?.resources?.length > 0 && (
            <div className={classes.resources}>
              {message.meta.resources.map((resource) => (
                <a key={resource.href} href={resource.href} target={resource.href.startsWith('tel:') ? undefined : '_blank'} rel="noreferrer">
                  <Icon name={resource.href.startsWith('tel:') ? 'phone' : 'globe'} size={14} />
                  {resource.label}
                </a>
              ))}
            </div>
          )}
        </div>
        <span className={classes.time}>
          {message.timestamp
            ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : ''}
        </span>
      </div>
    </div>
  );
}
