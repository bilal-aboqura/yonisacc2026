import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";

import NotFound from "./pages/NotFound";
import CompanyRegistration from "./pages/CompanyRegistration";
import Activities from "./pages/Activities";

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
import ViewInvoice from "./pages/client/ViewInvoice";
import CreatePurchaseInvoice from "./pages/client/CreatePurchaseInvoice";
import CreateJournalEntry from "./pages/client/CreateJournalEntry";
import CreateAccount from "./pages/client/CreateAccount";
import EditAccount from "./pages/client/EditAccount";
import CreateTreasuryTransaction from "./pages/client/CreateTreasuryTransaction";
import CreateProduct from "./pages/client/CreateProduct";
import OpeningBalances from "./pages/client/OpeningBalances";
import IncomeStatement from "./pages/client/reports/IncomeStatement";
import BalanceSheet from "./pages/client/reports/BalanceSheet";
import CashFlow from "./pages/client/reports/CashFlow";
import TrialBalance from "./pages/client/reports/TrialBalance";

// New Client Pages
import CostCenters from "./pages/client/CostCenters";
import CostCenterReports from "./pages/client/CostCenterReports";
import GeneralLedger from "./pages/client/GeneralLedger";
import OperationsLog from "./pages/client/OperationsLog";
import Customers from "./pages/client/Customers";
import Vendors from "./pages/client/Vendors";
import Quotes from "./pages/client/Quotes";
import CreateQuote from "./pages/client/CreateQuote";
import PurchaseOrders from "./pages/client/PurchaseOrders";
import CreatePurchaseOrder from "./pages/client/CreatePurchaseOrder";

// HR Pages
import HRDashboard from "./pages/client/hr/HRDashboard";
import Employees from "./pages/client/hr/Employees";
import Departments from "./pages/client/hr/Departments";
import Leaves from "./pages/client/hr/Leaves";
import Periods from "./pages/client/hr/Periods";
import Attendance from "./pages/client/hr/Attendance";
import Loans from "./pages/client/hr/Loans";
import Payroll from "./pages/client/hr/Payroll";
import EndOfService from "./pages/client/hr/EndOfService";
import HRReports from "./pages/client/hr/HRReports";

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
import OwnerLandingContent from "./pages/owner/OwnerLandingContent";
import OwnerAuditLogs from "./pages/owner/OwnerAuditLogs";
import OwnerActivities from "./pages/owner/OwnerActivities";

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
            
            <Route path="/register-company" element={<CompanyRegistration />} />
            <Route path="/activities" element={<Activities />} />
            
            {/* Client Portal Routes */}
            <Route path="/client" element={<ClientLayout />}>
              <Route index element={<ClientDashboard />} />
              
              {/* Financial Accounting */}
              <Route path="accounts" element={<ClientAccounts />} />
              <Route path="accounts/new" element={<CreateAccount />} />
              <Route path="accounts/:id/edit" element={<EditAccount />} />
              <Route path="accounts/opening-balances" element={<OpeningBalances />} />
              <Route path="cost-centers" element={<CostCenters />} />
              <Route path="cost-centers/reports" element={<CostCenterReports />} />
              <Route path="journal" element={<ClientJournal />} />
              <Route path="journal/new" element={<CreateJournalEntry />} />
              <Route path="treasury" element={<ClientTreasury />} />
              <Route path="treasury/new" element={<CreateTreasuryTransaction />} />
              <Route path="ledger" element={<GeneralLedger />} />
              <Route path="operations-log" element={<OperationsLog />} />
              
              {/* Sales */}
              <Route path="customers" element={<Customers />} />
              <Route path="quotes" element={<Quotes />} />
              <Route path="quotes/new" element={<CreateQuote />} />
              <Route path="sales" element={<ClientSales />} />
              <Route path="sales/new" element={<CreateSalesInvoice />} />
              <Route path="sales/:id" element={<ViewInvoice />} />
              
              {/* Purchases */}
              <Route path="vendors" element={<Vendors />} />
              <Route path="purchase-orders" element={<PurchaseOrders />} />
              <Route path="purchase-orders/new" element={<CreatePurchaseOrder />} />
              <Route path="purchases" element={<ClientPurchases />} />
              <Route path="purchases/new" element={<CreatePurchaseInvoice />} />
              
              {/* HR */}
              <Route path="hr" element={<HRDashboard />} />
              <Route path="hr/employees" element={<Employees />} />
              <Route path="hr/departments" element={<Departments />} />
              <Route path="hr/leaves" element={<Leaves />} />
              <Route path="hr/periods" element={<Periods />} />
              <Route path="hr/attendance" element={<Attendance />} />
              <Route path="hr/loans" element={<Loans />} />
              <Route path="hr/payroll" element={<Payroll />} />
              <Route path="hr/end-of-service" element={<EndOfService />} />
              <Route path="hr/reports" element={<HRReports />} />
              
              {/* Other */}
              <Route path="inventory" element={<ClientInventory />} />
              <Route path="inventory/new" element={<CreateProduct />} />
              <Route path="contacts" element={<ClientContacts />} />
              <Route path="contacts/new" element={<CreateContact />} />
              <Route path="reports" element={<ClientReports />} />
              <Route path="reports/income-statement" element={<IncomeStatement />} />
              <Route path="reports/balance-sheet" element={<BalanceSheet />} />
              <Route path="reports/cash-flow" element={<CashFlow />} />
              <Route path="reports/trial-balance" element={<TrialBalance />} />
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
              <Route path="landing-content" element={<OwnerLandingContent />} />
              <Route path="messages" element={<OwnerMessages />} />
              <Route path="reports" element={<OwnerReports />} />
              <Route path="audit-logs" element={<OwnerAuditLogs />} />
              <Route path="activities" element={<OwnerActivities />} />
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
