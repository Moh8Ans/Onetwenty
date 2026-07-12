// src/hooks/useScorePreview.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';

const API_BASE = 'https://onetwenty-backend.onrender.com';

export function useScorePreview(categoryId: number | undefined, values: { level?: string; tierKey?: string; hours?: string }) {
  const { getToken } = useAuth();
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    if (!categoryId) { setPreview(null); return; }
    let cancelled = false;

    (async () => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/activities/preview-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          categoryId, level: values.level, tierKey: values.tierKey,
          hours: values.hours ? Number(values.hours) : undefined,
        }),
      });
      if (!cancelled && res.ok) setPreview(await res.json());
    })();

    return () => { cancelled = true; };
  }, [categoryId, values.level, values.tierKey, values.hours]);

  return preview;
}