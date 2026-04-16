'use client';

import { useEffect, useRef } from 'react';
import { useEditorStore } from './store';
import { DesignObject } from './types';

export function useServerSync() {
  const lastServerVersionRef = useRef(0);
  const pushingRef = useRef(false);

  // Poll server for changes (from MCP or other agents)
  useEffect(() => {
    const poll = async () => {
      if (pushingRef.current) return;
      try {
        const res = await fetch('/api/objects');
        if (!res.ok) return;
        const data: { objects: DesignObject[]; version: number } = await res.json();
        if (data.version > lastServerVersionRef.current) {
          lastServerVersionRef.current = data.version;
          const store = useEditorStore.getState();
          // Only update if objects actually differ (avoid overwriting in-flight local changes)
          if (JSON.stringify(store.objects) !== JSON.stringify(data.objects)) {
            useEditorStore.setState({ objects: data.objects });
          }
        }
      } catch {
        // Server unavailable, skip
      }
    };

    poll(); // initial load
    const interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, []);

  // Push local changes to server
  useEffect(() => {
    const unsub = useEditorStore.subscribe((state, prev) => {
      if (state.objects !== prev.objects) {
        pushingRef.current = true;
        fetch('/api/objects/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ objects: state.objects }),
        })
          .then(res => res.json())
          .then((data: { version: number }) => {
            lastServerVersionRef.current = data.version;
          })
          .catch(() => {})
          .finally(() => {
            pushingRef.current = false;
          });
      }
    });
    return unsub;
  }, []);
}
