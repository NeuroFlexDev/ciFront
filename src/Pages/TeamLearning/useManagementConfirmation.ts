import { createElement, useEffect, useRef, useState } from 'react';
import ConfirmationDialog, { type Confirmation } from './ManagementConfirmation';

export function useManagementConfirmation() {
  const [pending, setPending] = useState<Confirmation | null>(null);
  const current = useRef<Confirmation | null>(null);
  useEffect(() => () => { current.current = null; }, []);
  const close = () => { current.current = null; setPending(null); };
  return {
    ask: (confirmation: Confirmation) => {
      if (current.current) return;
      current.current = confirmation;
      setPending(confirmation);
    },
    dialog: pending && createElement(ConfirmationDialog, { confirmation: pending, onClose: close }),
  };
}
