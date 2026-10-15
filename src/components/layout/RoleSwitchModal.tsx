import React from 'react';
import { UserRole } from '../../types';
import { Dialog } from '../common/Dialog';
import { Button } from '../common/Button';

export interface RoleSwitchModalProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onResetDemo: () => void;
  onClose: () => void;
}

export const RoleSwitchModal: React.FC<RoleSwitchModalProps> = ({
  currentRole,
  onSelectRole,
  onResetDemo,
  onClose
}) => {
  const roles: Array<{ id: UserRole; title: string; desc: string }> = [
    { id: 'finder', title: 'Finder', desc: 'Thandi Mokoena · Owns found reports, reviews claims' },
    { id: 'claimant', title: 'Claimant', desc: 'Kabelo Dlamini · Owns lost reports, can submit claims' },
    { id: 'unverified', title: 'Unverified', desc: 'Sipho Zulu · Restricted access pending campus verification' },
    { id: 'admin', title: 'Admin', desc: 'Refilwe Molefe · Moderation access for flagged listings' }
  ];

  return (
    <Dialog title="Prototype controls" onClose={onClose}>
      <p className="dialog-copy">
        Switch demonstration roles to test finder, claimant, unverified restrictions, and moderation experiences.
        All records and identities are isolated and simulated.
      </p>

      <div className="role-grid">
        {roles.map(r => (
          <button
            key={r.id}
            type="button"
            className={currentRole === r.id ? 'selected' : ''}
            onClick={() => {
              onSelectRole(r.id);
            }}
          >
            <span className="role-radio" />
            <b>{r.title}</b>
            <small>{r.desc}</small>
          </button>
        ))}
      </div>

      <div className="dialog-actions">
        <Button
          variant="danger"
          onClick={() => {
            onResetDemo();
            onClose();
          }}
        >
          Reset demo data
        </Button>
        <Button onClick={onClose}>Done</Button>
      </div>
    </Dialog>
  );
};

