import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import PublicProfile from "./pages/PublicProfile.tsx";
import AdminDataEntry from "./pages/AdminDataEntry.tsx";
import ProfileSettings from "./pages/ProfileSettings.tsx";
import { LanguageProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/AuthContext";
import { TAB_ROUTE_PATHS } from "@/lib/routes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Mapa at "/" (home) — every tab below shares the same component,
                  which derives the active page from the pathname so a refresh
                  (or a typed-in URL) lands on the right page. */}
              <Route path="/" element={<Index />} />
              {TAB_ROUTE_PATHS.map((path) => (
                <Route key={path} path={path} element={<Index />} />
              ))}
              {/* Alias kept so both spellings of the Buod page work. */}
              <Route path="/dashboard" element={<Index />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/settings/profile" element={<ProfileSettings />} />
              <Route path="/profile/:userId" element={<PublicProfile />} />
              <Route path="/admin" element={<AdminDataEntry />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>

          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
