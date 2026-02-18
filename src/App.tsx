import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import OTPVerification from "./pages/OTPVerification";
import OTPSetup from "./pages/OTPSetup";
import VaultDashboard from "./pages/VaultDashboard";
import SecurityPanel from "./pages/SecurityPanel";
import AttackSimulation from "./pages/AttackSimulation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/otp" element={<OTPVerification />} />
          <Route path="/otp-setup" element={<OTPSetup />} />
          <Route path="/vault" element={<VaultDashboard />} />
          <Route path="/security" element={<SecurityPanel />} />
          <Route path="/attack-sim" element={<AttackSimulation />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
