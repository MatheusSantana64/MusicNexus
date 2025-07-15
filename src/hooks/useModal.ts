// src/hooks/useModal.ts
// Hook for managing modal visibility and actions
import { useState, useCallback } from 'react';
import { ModalAction } from '../components/OptionsModal';

interface ShowModalOptions {
  title: string;
  message?: string;
  actions: ModalAction[];
}

export function useModal() {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState<string | undefined>();
  const [actions, setActions] = useState<ModalAction[]>([]);

  const showModal = useCallback(({ title, message, actions }: ShowModalOptions) => {
    setTitle(title);
    setMessage(message);
    setActions(actions);
    setVisible(true);
  }, []);

  const hideModal = useCallback(() => {
    setVisible(false);
  }, []);

  const modalProps = {
    visible,
    title,
    message,
    actions: actions.map(action => ({
      ...action,
      onPress: () => {
        action.onPress();
        hideModal();
      },
    })),
    onBackdropPress: hideModal,
  };

  return {
    showModal,
    hideModal,
    modalProps,
  };
}