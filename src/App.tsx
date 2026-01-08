import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import CompanyRegistration from "./pages/CompanyRegistration";

// Client Portal
import ClientLayout from "./components/client/ClientLayout";
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientSales from "./pages/client/ClientSales";
import ClientPurchases from "./pages/client/ClientPurchases";
import ClientJournal from "./pages/client/ClientJournal";
import ClientAccounts from "./pages/client/ClientAccounts";
import ClientTreasury from "./pages/client/ClientTreasury";
import ClientInventory from "./pages/client/ClientInventory";
import ClientContacts from "./pages/client/ClientContacts";
import ClientReports from "./pages/client/ClientReports";
import ClientAnalytics from "./pages/client/ClientAnalytics";
import ClientSettings from "./pages/client/ClientSettings";
import CreateSalesInvoice from "./pages/client/CreateSalesInvoice";
import CreateContact from "./pages/client/CreateContact";

// Owner Portal
import OwnerLayout from "./components/owner/OwnerLayout";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerSubscribers from "./pages/owner/OwnerSubscribers";
import OwnerSubscriptions from "./pages/owner/OwnerSubscriptions";
import OwnerPlans from "./pages/owner/OwnerPlans";
import OwnerScreens from "./pages/owner/OwnerScreens";
import OwnerMessages from "./pages/owner/OwnerMessages";
import OwnerReports from "./pages/owner/OwnerReports";
import OwnerSettings from "./pages/owner/OwnerSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/register-company" element={<CompanyRegistration />} />
            
            {/* Client Portal Routes */}
            <Route path="/client" element={<ClientLayout />}>
              <Route index element={<ClientDashboard />} />
              <Route path="sales" element={<ClientSales />} />
              <Route path="sales/new" element={<CreateSalesInvoice />} />
              <Route path="purchases" element={<ClientPurchases />} />
              <Route path="journal" element={<ClientJournal />} />
              <Route path="accounts" element={<ClientAccounts />} />
              <Route path="treasury" element={<ClientTreasury />} />
              <Route path="inventory" element={<ClientInventory />} />
              <Route path="contacts" element={<ClientContacts />} />
              <Route path="contacts/new" element={<CreateContact />} />
              <Route path="reports" element={<ClientReports />} />
              <Route path="analytics" element={<ClientAnalytics />} />
              <Route path="settings" element={<ClientSettings />} />
            </Route>
            
            {/* Owner Portal Routes */}
            <Route path="/owner" element={<OwnerLayout />}>
              <Route index element={<OwnerDashboard />} />
              <Route path="subscribers" element={<OwnerSubscribers />} />
              <Route path="subscriptions" element={<OwnerSubscriptions />} />
              <Route path="plans" element={<OwnerPlans />} />
              <Route path="screens" element={<OwnerScreens />} />
              <Route path="messages" element={<OwnerMessages />} />
              <Route path="reports" element={<OwnerReports />} />
              <Route path="settings" element={<OwnerSettings />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
