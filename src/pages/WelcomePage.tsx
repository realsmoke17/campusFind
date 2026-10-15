import React from 'react';
import { Logo } from '../components/common/Logo';
import { Icon } from '../components/common/Icon';
import { Button } from '../components/common/Button';

export interface WelcomePageProps {
  onSignIn: () => void;
  onRegister: () => void;
  onHelp: () => void;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({
  onSignIn,
  onRegister,
  onHelp
}) => {
  return (
    <main className="welcome">
      <header className="public-header">
        <Logo />
        <nav>
          <button type="button" className="text-btn" onClick={onHelp}>
            Help
          </button>
          <button
            type="button"
            className="text-btn"
            onClick={() => alert('CampusFind is a lost-and-found project developed for students and staff at Tshwane University of Technology.')}
          >
            About project
          </button>
        </nav>
      </header>

      <section className="welcome-grid">
        <div className="hero-copy">
          <span className="eyebrow">FOR THE CAMPUS COMMUNITY</span>
          <h1>
            Lost something
            <br />
            on campus?
          </h1>
          <p>Report lost or found belongings and help them get back to their owners.</p>

          <div className="hero-actions">
            <Button onClick={onSignIn}>Sign in</Button>
            <Button variant="secondary" onClick={onRegister}>
              Create account
            </Button>
          </div>

          <div className="privacy-note">
            <Icon name="shield" />
            <span>Listings are available only to signed-in, verified campus users.</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="Illustration of a backpack and keys">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-bag">
            <Icon name="bag" size={88} />
          </div>
          <div className="hero-key">
            <Icon name="key" size={42} />
          </div>
          <div className="found-pill">
            <Icon name="search" size={18} />
            <span>Recovery starts here</span>
          </div>
        </div>
      </section>

      <section className="steps">
        <div>
          <span>01</span>
          <Icon name="file" />
          <h2>Report</h2>
          <p>Share the useful details while keeping identifying information private.</p>
        </div>
        <div>
          <span>02</span>
          <Icon name="search" />
          <h2>Find a possible match</h2>
          <p>Browse reports by category, location and date.</p>
        </div>
        <div>
          <span>03</span>
          <Icon name="shield" />
          <h2>Verify and collect</h2>
          <p>Prove ownership privately, then arrange a safe handover.</p>
        </div>
      </section>

      <footer>CampusFind — student project for the TUT community.</footer>
    </main>
  );
};

