import React from 'react';
import { formatDateShort } from '../../lib/format';
import classes from './BarChart.module.css';

export default function BarChart({ data = [], height = 180, formatValue = (value) => value, label = 'Chart' }) {
  const max = Math.max(1, ...data.map((item) => Number(item.value) || 0));
  return (
    <div className={classes.chart} style={{ height }} role="img" aria-label={label}>
      <div className={classes.gridLines} aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <div className={classes.bars}>
        {data.map((item, index) => {
          const value = Number(item.value) || 0;
          const showLabel = data.length <= 14 || index === 0 || index === data.length - 1 || index % Math.ceil(data.length / 6) === 0;
          return (
            <div key={`${item.date}-${index}`} className={classes.barWrap} title={`${formatDateShort(item.date)} · ${formatValue(value)}`}>
              <div className={classes.barTrack}>
                <div className={classes.bar} style={{ height: `${Math.max(value > 0 ? 4 : 1.5, (value / max) * 100)}%` }} />
              </div>
              {showLabel && <span className={classes.barLabel}>{formatDateShort(item.date)}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
