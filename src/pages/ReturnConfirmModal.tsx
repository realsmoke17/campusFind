import React, { useState } from 'react';
import { Dialog } from '../components/common/Dialog';
import { Button } from '../components/common/Button';
import { Icon } from '../components/common/Icon';
import { FormField } from '../components/common/FormField';

export interface ReturnConfirmModalProps {
  onClose: () => void;
  onConfirm: (method: 'Direct handover' | 'Campus collection', location: string) => void;
}

export const ReturnConfirmModal: React.FC<ReturnConfirmModalProps> = ({
  onClose,
  onConfirm
}) => {
  const [method, setMethod] = useState<'Direct handover' | 'Campus collection'>('Direct handover');
  const [location, setLocation] = useState('');
  const [confirmedPhysical, setConfirmedPhysical] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = location.trim().length >= 3 && confirmedPhysical;

  const handleSubmit = () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    onConfirm(method, location.trim());
  };

  return (
    <Dialog title="Confirm physical return" onClose={onClose}>
      <div className="warning-box">
        <Icon name="alert" />
        <p>
          <b>Only confirm after handover</b>
          <br />
          Approval reserves an item. This step records that it was physically handed over.
        </p>
      </div>

      <label className="field">
        <span>Handover method</span>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as 'Direct handover' | 'Campus collection')}
        >
          <option value="Direct handover">Direct handover</option>
          <option value="Campus collection">Campus collection</option>
        </select>
      </label>

      <FormField
        label="Handover location"
        placeholder="e.g. Student Centre Info Desk / Library Foyer"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        required
        helperText="Enter the campus location where the physical handover took place."
      />

      <p className="form-help">
        A collection location entered here does not confirm that a university office accepted custody.
      </p>

      <label className="check-row" style={{ marginTop: '14px', marginBottom: '18px' }}>
        <input
          type="checkbox"
          checked={confirmedPhysical}
          onChange={(e) => setConfirmedPhysical(e.target.checked)}
        />
        <span>
          <b>The item has been physically handed over.</b>
          <small>
            This is a simulated prototype confirmation, not independent verification of custody.
          </small>
        </span>
      </label>

      <div className="dialog-actions">
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button disabled={!isValid || isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? 'Recording...' : 'Confirm return'}
        </Button>
      </div>
    </Dialog>
  );
};

