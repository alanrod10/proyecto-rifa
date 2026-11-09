'use client';

import { useState, useCallback } from 'react';

export function useCopyToClipboard(resetDelayMs = 2000) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = useCallback(
    async (text: string, fieldName = 'default'): Promise<boolean> => {
      if (!text) return false;
      try {
        await navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => {
          setCopiedField((prev) => (prev === fieldName ? null : prev));
        }, resetDelayMs);
        return true;
      } catch {
        // Fallback para navegadores sin clipboard API
        try {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          setCopiedField(fieldName);
          setTimeout(() => {
            setCopiedField((prev) => (prev === fieldName ? null : prev));
          }, resetDelayMs);
          return true;
        } catch {
          return false;
        }
      }
    },
    [resetDelayMs]
  );

  return {
    copiedField,
    copyToClipboard,
  };
}

export const useCopy = useCopyToClipboard;
export default useCopyToClipboard;
