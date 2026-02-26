import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TrackProvider } from "@/contexts/TrackContext";
import { ViewpointProvider } from "@/contexts/ViewpointContext";
import { CinematicProvider } from "@/contexts/CinematicContext";
import { OverlayProvider } from "@/contexts/OverlayContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TrackEditor from "./pages/TrackEditor";
import EventOps from "./pages/EventOps";
import MediaIntelligence from "./pages/MediaIntelligence";
import FanExperience from "./pages/FanExperience";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Utah2026 from "./pages/Utah2026";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/utah-2026" element={<Utah2026 />} />

            {/* Protected routes with app layout */}
            <Route
              element={
              <ProtectedRoute>
                <TrackProvider>
                  <ViewpointProvider>
                    <CinematicProvider>
                      <OverlayProvider>
                        <AppLayout />
                      </OverlayProvider>
                    </CinematicProvider>
                  </ViewpointProvider>
                </TrackProvider>
              </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route
                path="/editor"
                element={
                  <ProtectedRoute requiredView="editor">
                    <TrackEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ops"
                element={
                  <ProtectedRoute requiredView="ops">
                    <EventOps />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/media"
                element={
                  <ProtectedRoute requiredView="media">
                    <MediaIntelligence />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fan"
                element={
                  <ProtectedRoute requiredView="fan">
                    <FanExperience />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute requiredView="settings">
                    <Settings />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
