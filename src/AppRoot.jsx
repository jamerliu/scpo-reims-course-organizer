import { useEffect, useState } from 'react';
import { useAuth } from './auth/AuthContext';
import { supabase } from './utils/supabase';
import LoginScreen from './auth/LoginScreen';
import ProfileOnboarding from './auth/ProfileOnboarding';
import HomeScreen from './auth/HomeScreen';
import ResetPasswordScreen from './auth/ResetPasswordScreen';
import App from './App';
import './auth/handdrawn.css';

export default function AppRoot() {
  const { session, isProfileComplete } = useAuth();
  const [destination, setDestination] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  // Detect password reset flow — Supabase fires PASSWORD_RECOVERY event
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsResetting(true);
      // After they update password, SIGNED_IN fires — clear reset mode
      if (event === 'USER_UPDATED') setIsResetting(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Loading
  if (session === undefined) {
    return (
      <div style={{
        minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily:'Patrick Hand, cursive', background:'#fdfbf7', color:'#888', fontSize:'1.1rem',
        backgroundImage:'radial-gradient(#e5e0d8 1px, transparent 1px)', backgroundSize:'24px 24px',
      }}>
        Loading…
      </div>
    );
  }

  // Password reset flow — user clicked email link
  if (isResetting) return <ResetPasswordScreen />;

  // Not logged in
  if (!session) return <LoginScreen />;

  // Profile incomplete
  if (!isProfileComplete) return <ProfileOnboarding />;

  // Home
  if (!destination) {
    return (
      <HomeScreen
        onPlanner={() => setDestination('planner')}
        onMarketplace={() => setDestination('marketplace')}
      />
    );
  }

  return <App initialStep={destination} onGoHome={() => setDestination(null)} />;
}
