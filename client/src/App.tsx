import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";

// Define Mantine theme to match our aesthetic
const theme = createTheme({
  primaryColor: 'violet',
  fontFamily: 'Inter, sans-serif',
  headings: {
    fontFamily: 'Playfair Display, serif',
  },
  defaultRadius: 'md',
  colors: {
    // Custom shades if needed, otherwise using defaults
  }
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <Notifications position="top-right" />
        <Toaster />
        <Router />
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;
