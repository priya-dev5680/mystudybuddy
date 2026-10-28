import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

/** Keeps the app in sync with the persisted Supabase session. */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let authEventReceived = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true;
      if (active) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    // getUser verifies the stored session with Supabase on initial load.
    supabase.auth.getUser()
      .then(({ data, error }) => {
        if (active && !authEventReceived) setUser(error ? null : data.user);
      })
      .catch(() => {
        if (active && !authEventReceived) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return { user, loading, signOut };
}
