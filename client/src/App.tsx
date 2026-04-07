import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import Dashboard from "@/pages/Dashboard";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";

const theme = createTheme({
  primaryColor: 'violet',
  fontFamily: 'Inter, sans-serif',
  headings: {
    fontFamily: 'Playfair Display, serif',
  },
  defaultRadius: 'md',
});

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <Route path="/auth" component={AuthPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <Notifications position="top-right" />
        <Toaster />
        <AuthProvider>
          <Router />
        </AuthProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;
