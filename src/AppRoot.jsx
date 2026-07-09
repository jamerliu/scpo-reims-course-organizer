import { useState } from 'react';
import { useAuth } from './auth/AuthContext';
import LoginScreen from './auth/LoginScreen';
import ProfileOnboarding from './auth/ProfileOnboarding';
import HomeScreen from './auth/HomeScreen';
import App from './App';
import './auth/handdrawn.css';

export default function AppRoot() {
  const { session, isProfileComplete } = useAuth();
  // null = home, 'planner' = planner, 'marketplace' = marketplace
  const [destination, setDestination] = useState(null);

  // Loading session
  if (session === undefined) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: 'Patrick Hand, cursive',
        background: '#fdfbf7', color: '#888', fontSize: '1.1rem',
        backgroundImage: 'radial-gradient(#e5e0d8 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}>
        Loading…
      </div>
    );
  }

  // Not logged in → login screen
  if (!session) return <LoginScreen />;

  // Logged in but profile not set up → onboarding
  if (!isProfileComplete) return <ProfileOnboarding />;

  // Home screen
  if (!destination) {
    return (
      <HomeScreen
        onPlanner={() => setDestination('planner')}
        onMarketplace={() => setDestination('marketplace')}
      />
    );
  }

  // Planner or Marketplace — App handles both via its step system
  return <App initialStep={destination} onGoHome={() => setDestination(null)} />;
}
