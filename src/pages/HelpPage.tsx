import React from 'react';
import { Icon } from '../components/common/Icon';

export const HelpPage: React.FC = () => {
  const steps = [
    {
      num: '1',
      title: 'Report an item',
      desc: 'Create a lost or found report with useful public details so fellow campus members can identify potential matches.'
    },
    {
      num: '2',
      title: 'Submit private evidence',
      desc: 'For a found item, the possible owner describes a distinct private detail that was kept hidden from the public listing.'
    },
    {
      num: '3',
      title: 'Approve, then return',
      desc: 'Approval only reserves the item and rejects other pending claims. Physical handover confirmation occurs after meeting safely.'
    }
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">GUIDANCE</span>
          <h1>Help and safety</h1>
          <p>Understand the recovery process and protect your personal information.</p>
        </div>
      </div>

      <div className="help-grid">
        <section className="help-main">
          <h2>How CampusFind works</h2>
          {steps.map((s) => (
            <div key={s.num} className="help-step">
              <span>{s.num}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </section>

        <aside className="safety-card">
          <Icon name="shield" size={28} />
          <h2>Stay safe</h2>
          <ul>
            <li>Meet at a safe public campus location (such as the campus library or student center info desk).</li>
            <li>Never share passwords, PINs or device unlock codes.</li>
            <li>Do not post full identity numbers, bank details or student numbers publicly.</li>
            <li>Use “Report inappropriate content” whenever a listing contains prohibited personal information.</li>
          </ul>
        </aside>
      </div>
    </>
  );
};

