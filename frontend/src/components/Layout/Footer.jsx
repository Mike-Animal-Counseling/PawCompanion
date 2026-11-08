import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../Logo';
import Icon from '../Icon';
import classes from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={classes.footer}>
      <div className="container">
        <div className={classes.top}>
          <div className={classes.brand}>
            <Logo inverted />
            <p className={classes.desc}>
              Companionship, on your terms. Discover verified animal companions, talk to their AI personalities,
              and book a low-pressure visit.
            </p>
            <div className={classes.safety}>
              <Icon name="shield" size={16} />
              <span>Support mode is safety-reviewed. PawCompanion is not a therapy service.</span>
            </div>
          </div>

          <div className={classes.col}>
            <h3>Explore</h3>
            <Link to="/">Discover companions</Link>
            <Link to="/#how-it-works">How it works</Link>
            <Link to="/safety">Safety &amp; privacy</Link>
          </div>

          <div className={classes.col}>
            <h3>For partners</h3>
            <Link to="/merchant/login">Partner console</Link>
            <Link to="/merchant/register">List a companion</Link>
            <Link to="/safety">Safeguarding standards</Link>
          </div>

          <div className={classes.col}>
            <h3>Need support now?</h3>
            <a href="https://988lifeline.org/" target="_blank" rel="noreferrer">
              US: call or text 988
            </a>
            <a href="https://findahelpline.com/" target="_blank" rel="noreferrer">
              Find a helpline
            </a>
            <a href="tel:911">Emergency: 911</a>
          </div>
        </div>

        <div className={classes.bottom}>
          <span>© {new Date().getFullYear()} PawCompanion. A demonstration platform.</span>
          <span className={classes.meta}>Payments in this build are sandboxed and never charge a real card.</span>
        </div>
      </div>
    </footer>
  );
}
