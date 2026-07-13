import { Redirect, Route, Switch, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { useAppStore } from '@/lib/store';

// Shell & Layout
import AppShell from '@/components/layout/AppShell';

// Pages
import Auth from '@/pages/auth';
import Home from '@/pages/home';
import Explore from '@/pages/explore';
import Profile from '@/pages/profile';
import PostDetail from '@/pages/post-detail';
import Messages from '@/pages/messages';
import Communities from '@/pages/communities';
import Articles from '@/pages/articles';
import Videos from '@/pages/videos';
import Settings from '@/pages/settings';
import Notifications from '@/pages/notifications';
import Live from '@/pages/live';
import EventsPage from '@/pages/events';
import Marketplace from '@/pages/marketplace';
import AIAssistant from '@/pages/ai-assistant';
import Achievements from '@/pages/achievements';
import Dashboard from '@/pages/dashboard';

const queryClient = new QueryClient();

function ProtectedRoutes() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/explore" component={Explore} />
        <Route path="/post/:id" component={PostDetail} />
        <Route path="/profile/:id?" component={Profile} />
        <Route path="/messages/:id?" component={Messages} />
        <Route path="/communities/:id?" component={Communities} />
        <Route path="/articles/:id?" component={Articles} />
        <Route path="/videos/:id?" component={Videos} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/live/:id?" component={Live} />
        <Route path="/events/:id?" component={EventsPage} />
        <Route path="/marketplace/:id?" component={Marketplace} />
        <Route path="/ai" component={AIAssistant} />
        <Route path="/achievements" component={Achievements} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function Router() {
  const { currentUser } = useAppStore();

  return (
    <Switch>
      {!currentUser && <Route path="/auth" component={Auth} />}
      {!currentUser && <Route component={Auth} />}
      {currentUser && <Route path="/auth" component={() => <Redirect to="/" />} />}
      {currentUser && <ProtectedRoutes />}
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
