import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined); // undefined = loading
  const [profile, setProfile]   = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    setLoadingProfile(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle(); // returns null instead of error if no row found
    
    if (!data && !error) {
      // No profile row yet (trigger may not have run) — create it
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').upsert({
          id: userId,
          email: user.email || '',
          full_name: '',
          grade: '',
          program_key: '',
          program_label: '',
        }, { onConflict: 'id' });
        // Fetch again after creating
        const { data: newData } = await supabase
          .from('profiles').select('*').eq('id', userId).maybeSingle();
        setProfile(newData);
      }
    } else {
      setProfile(data);
    }
    setLoadingProfile(false);
    return data;
  }

  async function updateProfile(updates) {
    if (!session) return;
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, email: session.user.email, ...updates }, { onConflict: 'id' })
      .select()
      .maybeSingle();
    if (!error && data) setProfile(data);
    return { data, error };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  const isProfileComplete = profile &&
    profile.full_name &&
    profile.grade &&
    profile.program_key;

  return (
    <AuthContext.Provider value={{
      session,
      profile,
      loadingProfile,
      isProfileComplete,
      fetchProfile,
      updateProfile,
      signOut,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
