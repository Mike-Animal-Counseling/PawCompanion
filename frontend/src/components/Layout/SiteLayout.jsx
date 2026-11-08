import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import MobileTabBar from './MobileTabBar';
import classes from './SiteLayout.module.css';

export default function SiteLayout() {
  return (
    <div className={classes.shell}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main" className={classes.main}>
        <Outlet />
      </main>
      <Footer />
      <MobileTabBar />
    </div>
  );
}
