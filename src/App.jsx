import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AppLayout from '@/components/layout/AppLayout';
import AdminRoute from '@/components/AdminRoute';

const Home = lazy(() => import('@/pages/Home'));
const Deck = lazy(() => import('@/pages/Deck'));
const CardGenerate = lazy(() => import('@/pages/CardGenerate'));
const Play = lazy(() => import('@/pages/Play'));
const HumanBattle = lazy(() => import('@/pages/HumanBattle'));
const Friends = lazy(() => import('@/pages/Friends'));
const Battle = lazy(() => import('@/pages/Battle'));
const PvpBattle = lazy(() => import('@/pages/PvpBattle'));
const Profile = lazy(() => import('@/pages/Profile'));
const BattleHistory = lazy(() => import('@/pages/BattleHistory'));
const AdminPanel = lazy(() => import('@/pages/AdminPanel'));
const AdminCreatures = lazy(() => import('@/pages/AdminCreatures'));
const AdminAiDecks = lazy(() => import('@/pages/AdminAiDecks'));
const AdminMilestones = lazy(() => import('@/pages/AdminMilestones'));
const AdminCardBackgrounds = lazy(() => import('@/pages/AdminCardBackgrounds'));
const AdminSounds = lazy(() => import('@/pages/AdminSounds'));
const HowToPlay = lazy(() => import('@/pages/HowToPlay'));
const NotificationSettings = lazy(() => import('@/pages/NotificationSettings'));
const CardUpgrade = lazy(() => import('@/pages/CardUpgrade'));
const Leaderboards = lazy(() => import('@/pages/Leaderboards'));
const PowerUps = lazy(() => import('@/pages/PowerUps'));
const Milestones = lazy(() => import('@/pages/Milestones'));
const BuyCoins = lazy(() => import('@/pages/BuyCoins'));
const CoinHistory = lazy(() => import('@/pages/CoinHistory'));
const Lobby = lazy(() => import('@/pages/Lobby'));
const CreateLobby = lazy(() => import('@/pages/CreateLobby'));
const JoinLobby = lazy(() => import('@/pages/JoinLobby'));
const CreateOfflineLobby = lazy(() => import('@/pages/CreateOfflineLobby'));
const Trades = lazy(() => import('@/pages/Trades'));
const StoryMap = lazy(() => import('@/pages/StoryMap'));
const StoryBattle = lazy(() => import('@/pages/StoryBattle'));
const Battle3v3 = lazy(() => import('@/pages/Battle3v3'));
const EggStore = lazy(() => import('@/pages/EggStore'));
// Add page imports here

function RouteLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
    </div>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/deck" element={<Deck />} />
            <Route path="/generate" element={<CardGenerate />} />
            <Route path="/play" element={<Play />} />
            <Route path="/human-battle" element={<HumanBattle />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/history" element={<BattleHistory />} />
            <Route path="/how-to-play" element={<HowToPlay />} />
            <Route path="/notification-settings" element={<NotificationSettings />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/admin/creatures" element={<AdminCreatures />} />
              <Route path="/admin/ai-decks" element={<AdminAiDecks />} />
              <Route path="/admin/milestones" element={<AdminMilestones />} />
              <Route path="/admin/card-backgrounds" element={<AdminCardBackgrounds />} />
              <Route path="/admin/sounds" element={<AdminSounds />} />
            </Route>
            <Route path="/card-upgrade/:id" element={<CardUpgrade />} />
            <Route path="/leaderboards" element={<Leaderboards />} />
            <Route path="/power-ups" element={<PowerUps />} />
            <Route path="/milestones" element={<Milestones />} />
            <Route path="/buy-coins" element={<BuyCoins />} />
            <Route path="/coin-history" element={<CoinHistory />} />
            <Route path="/lobby" element={<Lobby />} />
            <Route path="/create-lobby" element={<CreateLobby />} />
            <Route path="/join-lobby/:code" element={<JoinLobby />} />
            <Route path="/create-offline-lobby" element={<CreateOfflineLobby />} />
            <Route path="/trades" element={<Trades />} />
            <Route path="/egg-store" element={<EggStore />} />
            <Route path="/story" element={<StoryMap />} />
            <Route path="/story-battle/:stage/:match" element={<StoryBattle />} />
          </Route>
          <Route path="/battle" element={<Battle />} />
          <Route path="/battle-3v3" element={<Battle3v3 />} />
          <Route path="/pvp-battle/:code" element={<PvpBattle />} />
        </Route>
        {/* Add your page Route elements here */}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App