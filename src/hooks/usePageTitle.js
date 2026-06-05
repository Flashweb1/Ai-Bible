import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} · Scripturai` : 'Scripturai — The Living Word';
    return () => { document.title = prev; };
  }, [title]);
}
