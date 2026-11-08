import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../Logo';
import Icon from '../Icon';
import classes from './AuthLayout.module.css';

export default function AuthLayout({ image, quote, attribution, eyebrow, title, subtitle, children, footer, wide = false }) {
  return (
    <div className={classes.page}>
      <div className={`${classes.shell} ${wide ? classes.wide : ''}`}>
        <aside className={classes.visual} aria-hidden="true">
          <img src={image} alt="" />
          <div className={classes.visualOverlay} />
          <div className={classes.visualBrand}>
            <Logo inverted />
          </div>
          <blockquote className={classes.quote}>
            <Icon name="sparkles" size={20} />
            <p>{quote}</p>
            <cite>{attribution}</cite>
          </blockquote>
        </aside>

        <div className={classes.formSide}>
          <div className={classes.mobileBrand}>
            <Logo />
          </div>
          <div className={classes.formWrap}>
            <Link to="/" className={classes.back}>
              <Icon name="arrow-left" size={15} /> Back to discovering
            </Link>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h1 className={classes.title}>{title}</h1>
            {subtitle && <p className={classes.subtitle}>{subtitle}</p>}
            <div className={classes.form}>{children}</div>
            {footer && <div className={classes.footer}>{footer}</div>}
          </div>
          <p className={classes.legal}>
            By continuing you agree to our community guidelines. PawCompanion is companionship, not therapy or
            medical care. <Link to="/safety">Read the safety model</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
