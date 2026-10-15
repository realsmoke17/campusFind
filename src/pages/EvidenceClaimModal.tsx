import React, { useState } from 'react';
import { LostFoundItem } from '../types';
import { Dialog } from '../components/common/Dialog';
import { Button } from '../components/common/Button';
import { Icon } from '../components/common/Icon';
import { TypeLabel } from '../components/common/TypeLabel';

export interface EvidenceClaimModalProps {
  item: LostFoundItem;
  onClose: () => void;
  onSubmitEvidence: (evidence: string, imageUrl?: string) => void;
}

export const EvidenceClaimModal: React.FC<EvidenceClaimModalProps> = ({
  item,
  onClose,
  onSubmitEvidence
}) => {
  const [evidence, setEvidence] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = evidence.trim().length >= 15;

  const handleSubmit = () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    onSubmitEvidence(evidence.trim());
  };

  return (
    <Dialog title="Submit an ownership claim" onClose={onClose}>
      <div className="claim-summary">
        <span>
          <Icon name={item.icon} />
        </span>
        <div>
          <TypeLabel type="Found" />
          <b>{item.title}</b>
          <small>{item.location}</small>
        </div>
      </div>

      <div className="privacy-box">
        <Icon name="shield" />
        <p>
          <b>Your evidence stays private</b>
          <br />
          Only you and the finder can view this ownership evidence.
        </p>
      </div>

      <label className="field">
        <span>
          Describe something only the owner would know <b aria-hidden="true">*</b>
        </span>
        <textarea
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder="For example, describe an unseen mark, specific stickers, or an item inside the bag."
          rows={4}
          aria-describedby="evidence-help"
        />
        <small id="evidence-help">
          Never share a password, PIN, unlock code or full identity number. Minimum 15 characters.
        </small>
      </label>

      <div className="dialog-actions">
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button disabled={!isValid || isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? 'Submitting...' : 'Submit private evidence'}
        </Button>
      </div>
    </Dialog>
  );
};

