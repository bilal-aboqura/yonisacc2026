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

import ClientSettings from "./pages/client/ClientSettings";
import PaymentPage from "./pages/client/PaymentPage";
import BranchManagement from "./pages/client/BranchManagement";
import CreateSalesInvoice from "./pages/client/CreateSalesInvoice";
import CreateContact from "./pages/client/CreateContact";
import EditContact from "./pages/client/EditContact";
import ViewInvoice from "./pages/client/ViewInvoice";
import CreatePurchaseInvoice from "./pages/client/CreatePurchaseInvoice";
import CreateJournalEntry from "./pages/client/CreateJournalEntry";
import ViewJournalEntry from "./pages/client/ViewJournalEntry";
import EditJournalEntry from "./pages/client/EditJournalEntry";
import CreateAccount from "./pages/client/CreateAccount";
import EditAccount from "./pages/client/EditAccount";
import CreateTreasuryTransaction from "./pages/client/CreateTreasuryTransaction";
import ViewTreasuryTransaction from "./pages/client/ViewTreasuryTransaction";
import EditTreasuryTransaction from "./pages/client/EditTreasuryTransaction";
import CreateProduct from "./pages/client/CreateProduct";
import EditProduct from "./pages/client/EditProduct";
import OpeningBalances from "./pages/client/OpeningBalances";
import IncomeStatement from "./pages/client/reports/IncomeStatement";
import BalanceSheet from "./pages/client/reports/BalanceSheet";
import CashFlow from "./pages/client/reports/CashFlow";
import TrialBalance from "./pages/client/reports/TrialBalance";
import VATReport from "./pages/client/reports/VATReport";
import SalesReports from "./pages/client/reports/SalesReports";
import PurchaseReports from "./pages/client/reports/PurchaseReports";
import OperationalReports from "./pages/client/reports/OperationalReports";
import InventoryDetailedReports from "./pages/client/reports/InventoryDetailedReports";

// New Client Pages
import CostCenters from "./pages/client/CostCenters";
import CreateCostCenter from "./pages/client/CreateCostCenter";
import CostCenterReports from "./pages/client/CostCenterReports";
import GeneralLedger from "./pages/client/GeneralLedger";
import OperationsLog from "./pages/client/OperationsLog";
import Customers from "./pages/client/Customers";
import Vendors from "./pages/client/Vendors";
import Quotes from "./pages/client/Quotes";
import CreateQuote from "./pages/client/CreateQuote";
import PurchaseOrders from "./pages/client/PurchaseOrders";
import CreatePurchaseOrder from "./pages/client/CreatePurchaseOrder";

// Auto Parts
import CarBrands from "./pages/client/autoparts/CarBrands";
import CarModels from "./pages/client/autoparts/CarModels";
import PartsCatalog from "./pages/client/autoparts/PartsCatalog";
import AutoPartsDashboard from "./pages/client/autoparts/AutoPartsDashboard";
import AutoPartsReports from "./pages/client/autoparts/AutoPartsReports";
import AutoPartsAccountSetup from "./pages/client/autoparts/AutoPartsAccountSetup";

// Inventory
import UnitsManagement from "./pages/client/inventory/UnitsManagement";
import CategoriesManagement from "./pages/client/inventory/CategoriesManagement";
import StockOverview from "./pages/client/inventory/StockOverview";
import StockAdjustments from "./pages/client/inventory/StockAdjustments";
import StockTransfers from "./pages/client/inventory/StockTransfers";
import InternalConsumptions from "./pages/client/inventory/InternalConsumptions";
import Manufacturing from "./pages/client/inventory/Manufacturing";
import InventoryReports from "./pages/client/inventory/InventoryReports";
import ProductCard from "./pages/client/inventory/ProductCard";

// POS
import POSScreen from "./pages/client/pos/POSScreen";
import POSTables from "./pages/client/pos/POSTables";
import POSSettings from "./pages/client/pos/POSSettings";
import POSMenuManager from "./pages/client/pos/POSMenuManager";
import POSPromotions from "./pages/client/pos/POSPromotions";
import POSTargets from "./pages/client/pos/POSTargets";
import POSReports from "./pages/client/pos/POSReports";
import POSCoupons from "./pages/client/pos/POSCoupons";
import POSUsers from "./pages/client/pos/POSUsers";
import POSUserLogs from "./pages/client/pos/POSUserLogs";
import POSInvoices from "./pages/client/pos/POSInvoices";
import POSIntegrations from "./pages/client/pos/POSIntegrations";

// Fixed Assets
import FixedAssets from "./pages/client/assets/FixedAssets";
import CreateFixedAsset from "./pages/client/assets/CreateFixedAsset";
import ViewFixedAsset from "./pages/client/assets/ViewFixedAsset";
import AssetCategories from "./pages/client/assets/AssetCategories";
import DepreciationRun from "./pages/client/assets/DepreciationRun";
import AssetReports from "./pages/client/assets/AssetReports";
import AssetAccountSetup from "./pages/client/assets/AssetAccountSetup";

// Clinic
import Patients from "./pages/client/clinic/Patients";
import CreatePatient from "./pages/client/clinic/CreatePatient";
import ViewPatient from "./pages/client/clinic/ViewPatient";
import Doctors from "./pages/client/clinic/Doctors";
import CreateDoctor from "./pages/client/clinic/CreateDoctor";
import ClinicAppointments from "./pages/client/clinic/Appointments";
import CreateAppointment from "./pages/client/clinic/CreateAppointment";
import Prescriptions from "./pages/client/clinic/Prescriptions";
import CreatePrescription from "./pages/client/clinic/CreatePrescription";
import ViewPrescription from "./pages/client/clinic/ViewPrescription";
import ClinicBilling from "./pages/client/clinic/ClinicBilling";
import CreateClinicInvoice from "./pages/client/clinic/CreateClinicInvoice";
import PayClinicInvoice from "./pages/client/clinic/PayClinicInvoice";
import ClinicReports from "./pages/client/clinic/ClinicReports";
import ClinicAccountSetup from "./pages/client/clinic/ClinicAccountSetup";

// Real Estate
import REProperties from "./pages/client/realestate/Properties";
import CreateProperty from "./pages/client/realestate/CreateProperty";
import REUnits from "./pages/client/realestate/Units";
import CreateUnit from "./pages/client/realestate/CreateUnit";
import RETenants from "./pages/client/realestate/Tenants";
import CreateTenant from "./pages/client/realestate/CreateTenant";
import RELeases from "./pages/client/realestate/Leases";
import CreateLease from "./pages/client/realestate/CreateLease";
import RentInvoices from "./pages/client/realestate/RentInvoices";
import CreateRentInvoice from "./pages/client/realestate/CreateRentInvoice";
import PayRentInvoice from "./pages/client/realestate/PayRentInvoice";
import MaintenanceRequests from "./pages/client/realestate/MaintenanceRequests";
import CreateMaintenanceRequest from "./pages/client/realestate/CreateMaintenanceRequest";
import RealEstateReports from "./pages/client/realestate/RealEstateReports";
import RealEstateAccountSetup from "./pages/client/realestate/RealEstateAccountSetup";

// Delivery
import DeliveryDashboard from "./pages/client/delivery/DeliveryDashboard";
import DeliveryOrders from "./pages/client/delivery/DeliveryOrders";
import CreateDeliveryOrder from "./pages/client/delivery/CreateDeliveryOrder";
import ViewDeliveryOrder from "./pages/client/delivery/ViewDeliveryOrder";
import DeliveryDrivers from "./pages/client/delivery/DeliveryDrivers";
import CreateDeliveryDriver from "./pages/client/delivery/CreateDeliveryDriver";
import DeliveryAreas from "./pages/client/delivery/DeliveryAreas";
import CreateDeliveryArea from "./pages/client/delivery/CreateDeliveryArea";
import DeliveryReports from "./pages/client/delivery/DeliveryReports";
import DeliveryAccountSetup from "./pages/client/delivery/DeliveryAccountSetup";
import DriverSettlement from "./pages/client/delivery/DriverSettlement";

// Fuel Station
import FuelDashboard from "./pages/client/fuel/FuelDashboard";
import FuelCustomers from "./pages/client/fuel/FuelCustomers";
import CreateFuelCustomer from "./pages/client/fuel/CreateFuelCustomer";
import FuelCustomerStatement from "./pages/client/fuel/FuelCustomerStatement";
import FuelWallets from "./pages/client/fuel/FuelWallets";
import RechargeWallet from "./pages/client/fuel/RechargeWallet";
import FuelPumps from "./pages/client/fuel/FuelPumps";
import CreateFuelPump from "./pages/client/fuel/CreateFuelPump";
import FuelTanks from "./pages/client/fuel/FuelTanks";
import CreateFuelTank from "./pages/client/fuel/CreateFuelTank";
import RefillTank from "./pages/client/fuel/RefillTank";
import FuelPOS from "./pages/client/fuel/FuelPOS";
import FuelPrices from "./pages/client/fuel/FuelPrices";
import FuelReports from "./pages/client/fuel/FuelReports";
import FuelAccountSetup from "./pages/client/fuel/FuelAccountSetup";

// Gold & Jewelry
import GoldItems from "./pages/client/gold/GoldItems";
import CreateGoldItem from "./pages/client/gold/CreateGoldItem";
import GoldPurchases from "./pages/client/gold/GoldPurchases";
import CreateGoldPurchase from "./pages/client/gold/CreateGoldPurchase";
import GoldSales from "./pages/client/gold/GoldSales";
import CreateGoldSale from "./pages/client/gold/CreateGoldSale";
import GoldPriceSettings from "./pages/client/gold/GoldPriceSettings";
import GoldReports from "./pages/client/gold/GoldReports";
import ZatcaSettings from "./pages/client/ZatcaSettings";

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
import HRAccountSetup from "./pages/client/hr/HRAccountSetup";
import PenaltyRules from "./pages/client/hr/PenaltyRules";
import Deductions from "./pages/client/hr/Deductions";
import LeaveSettings from "./pages/client/hr/LeaveSettings";
import FiscalYearManagement from "./pages/client/FiscalYearManagement";
import SalesAccountSetup from "./pages/client/setup/SalesAccountSetup";
import PurchasesAccountSetup from "./pages/client/setup/PurchasesAccountSetup";
import InventoryAccountSetup from "./pages/client/setup/InventoryAccountSetup";
import POSAccountSetup from "./pages/client/setup/POSAccountSetup";
import GoldAccountSetup from "./pages/client/setup/GoldAccountSetup";

// Owner Portal
import OwnerLayout from "./components/owner/OwnerLayout";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerSubscribers from "./pages/owner/OwnerSubscribers";
import OwnerSubscriptions from "./pages/owner/OwnerSubscriptions";
import OwnerPlans from "./pages/owner/OwnerPlans";
// OwnerScreens removed - screen access now controlled by RBAC
import OwnerMessages from "./pages/owner/OwnerMessages";
import OwnerReports from "./pages/owner/OwnerReports";
import OwnerSettings from "./pages/owner/OwnerSettings";
import OwnerLandingContent from "./pages/owner/OwnerLandingContent";
import OwnerAuditLogs from "./pages/owner/OwnerAuditLogs";
import OwnerActivities from "./pages/owner/OwnerActivities";
import ManageCompanyAccess from "./pages/owner/ManageCompanyAccess";
import CreateSubscriber from "./pages/owner/CreateSubscriber";
import SubscriptionExpired from "./pages/SubscriptionExpired";
import AcceptInvitation from "./pages/AcceptInvitation";

import { useAutoLogout } from "@/hooks/useAutoLogout";

const queryClient = new QueryClient();

const AutoLogoutWrapper = ({ children }: { children: React.ReactNode }) => {
  useAutoLogout();
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AutoLogoutWrapper>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />

              <Route path="/register-company" element={<CompanyRegistration />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/subscription-expired" element={<SubscriptionExpired />} />
              <Route path="/invite/accept" element={<AcceptInvitation />} />

              {/* Client Portal Routes */}
              <Route path="/client" element={<ClientLayout />}>
                <Route index element={<ClientDashboard />} />

                {/* Financial Accounting */}
                <Route path="accounts" element={<ClientAccounts />} />
                <Route path="accounts/new" element={<CreateAccount />} />
                <Route path="accounts/:id/edit" element={<EditAccount />} />
                <Route path="accounts/opening-balances" element={<OpeningBalances />} />
                <Route path="cost-centers" element={<CostCenters />} />
                <Route path="cost-centers/new" element={<CreateCostCenter />} />
                <Route path="cost-centers/reports" element={<CostCenterReports />} />
                <Route path="journal" element={<ClientJournal />} />
                <Route path="journal/new" element={<CreateJournalEntry />} />
                <Route path="journal/:id" element={<ViewJournalEntry />} />
                <Route path="journal/:id/edit" element={<EditJournalEntry />} />
                <Route path="treasury" element={<ClientTreasury />} />
                <Route path="treasury/new" element={<CreateTreasuryTransaction />} />
                <Route path="treasury/:id" element={<ViewTreasuryTransaction />} />
                <Route path="treasury/:id/edit" element={<EditTreasuryTransaction />} />
                <Route path="ledger" element={<GeneralLedger />} />
                <Route path="operations-log" element={<OperationsLog />} />

                {/* Sales */}
                <Route path="customers" element={<Customers />} />
                <Route path="quotes" element={<Quotes />} />
                <Route path="quotes/new" element={<CreateQuote />} />
                <Route path="quotes/:id" element={<ViewInvoice />} />
                <Route path="quotes/:id/edit" element={<CreateQuote />} />
                <Route path="sales" element={<ClientSales />} />
                <Route path="sales/new" element={<CreateSalesInvoice />} />
                <Route path="sales/:id" element={<ViewInvoice />} />
                <Route path="sales/:id/edit" element={<CreateSalesInvoice />} />
                <Route path="sales/:id" element={<ViewInvoice />} />
                {/* sales/setup removed - available in settings */}
                {/* Purchases */}
                <Route path="vendors" element={<Vendors />} />
                <Route path="purchase-orders" element={<PurchaseOrders />} />
                <Route path="purchase-orders/new" element={<CreatePurchaseOrder />} />
                <Route path="purchase-orders/:id" element={<ViewInvoice />} />
                <Route path="purchase-orders/:id/edit" element={<CreatePurchaseOrder />} />
                <Route path="purchases" element={<ClientPurchases />} />
                <Route path="purchases/new" element={<CreatePurchaseInvoice />} />
                <Route path="purchases/:id" element={<ViewInvoice />} />
                <Route path="purchases/:id/edit" element={<CreatePurchaseInvoice />} />
                {/* purchases/setup removed - available in settings */}
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
                <Route path="hr/penalty-rules" element={<PenaltyRules />} />
                <Route path="hr/deductions" element={<Deductions />} />
                <Route path="hr/leave-settings" element={<LeaveSettings />} />
                <Route path="hr/setup" element={<HRAccountSetup />} />

                {/* Auto Parts */}
                <Route path="auto-parts" element={<AutoPartsDashboard />} />
                <Route path="auto-parts/catalog" element={<PartsCatalog />} />
                <Route path="auto-parts/brands" element={<CarBrands />} />
                <Route path="auto-parts/models" element={<CarModels />} />
                <Route path="auto-parts/reports" element={<AutoPartsReports />} />
                <Route path="auto-parts/setup" element={<AutoPartsAccountSetup />} />

                {/* Inventory */}
                <Route path="inventory" element={<ClientInventory />} />
                <Route path="inventory/new" element={<CreateProduct />} />
                <Route path="inventory/product/:id" element={<ProductCard />} />
                <Route path="inventory/edit/:id" element={<EditProduct />} />
                <Route path="inventory/units" element={<UnitsManagement />} />
                <Route path="inventory/categories" element={<CategoriesManagement />} />
                <Route path="inventory/stock" element={<StockOverview />} />
                <Route path="inventory/adjustments" element={<StockAdjustments />} />
                <Route path="inventory/transfers" element={<StockTransfers />} />
                <Route path="inventory/consumptions" element={<InternalConsumptions />} />
                <Route path="inventory/manufacturing" element={<Manufacturing />} />
                <Route path="inventory/reports" element={<InventoryReports />} />
                <Route path="inventory/setup" element={<InventoryAccountSetup />} />
                <Route path="inventory/movements" element={<ClientInventory tab="movements" />} />

                {/* POS */}
                <Route path="pos" element={<POSScreen />} />
                <Route path="pos/tables" element={<POSTables />} />
                <Route path="pos/settings" element={<POSSettings />} />
                <Route path="pos/menus" element={<POSMenuManager />} />
                <Route path="pos/promotions" element={<POSPromotions />} />
                <Route path="pos/coupons" element={<POSCoupons />} />
                <Route path="pos/targets" element={<POSTargets />} />
                <Route path="pos/reports" element={<POSReports />} />
                <Route path="pos/users" element={<POSUsers />} />
                <Route path="pos/user-logs" element={<POSUserLogs />} />
                <Route path="pos/invoices" element={<POSInvoices />} />
                <Route path="pos/account-setup" element={<POSAccountSetup />} />
                <Route path="pos/integrations" element={<POSIntegrations />} />

                {/* Fixed Assets */}
                <Route path="assets" element={<FixedAssets />} />
                <Route path="assets/new" element={<CreateFixedAsset />} />
                <Route path="assets/:id" element={<ViewFixedAsset />} />
                <Route path="assets/:id/edit" element={<CreateFixedAsset />} />
                <Route path="assets/categories" element={<AssetCategories />} />
                <Route path="assets/depreciation" element={<DepreciationRun />} />
                <Route path="assets/reports" element={<AssetReports />} />
                <Route path="assets/setup" element={<AssetAccountSetup />} />

                {/* Clinic */}
                <Route path="clinic/patients" element={<Patients />} />
                <Route path="clinic/patients/new" element={<CreatePatient />} />
                <Route path="clinic/patients/:id" element={<ViewPatient />} />
                <Route path="clinic/patients/:id/edit" element={<CreatePatient />} />
                <Route path="clinic/doctors" element={<Doctors />} />
                <Route path="clinic/doctors/new" element={<CreateDoctor />} />
                <Route path="clinic/doctors/:id/edit" element={<CreateDoctor />} />
                <Route path="clinic/appointments" element={<ClinicAppointments />} />
                <Route path="clinic/appointments/new" element={<CreateAppointment />} />
                <Route path="clinic/prescriptions" element={<Prescriptions />} />
                <Route path="clinic/prescriptions/new" element={<CreatePrescription />} />
                <Route path="clinic/prescriptions/:id" element={<ViewPrescription />} />
                <Route path="clinic/billing" element={<ClinicBilling />} />
                <Route path="clinic/billing/new" element={<CreateClinicInvoice />} />
                <Route path="clinic/billing/:id/pay" element={<PayClinicInvoice />} />
                <Route path="clinic/reports" element={<ClinicReports />} />
                <Route path="clinic/setup" element={<ClinicAccountSetup />} />

                {/* Real Estate */}
                <Route path="realestate/properties" element={<REProperties />} />
                <Route path="realestate/properties/new" element={<CreateProperty />} />
                <Route path="realestate/properties/:id/edit" element={<CreateProperty />} />
                <Route path="realestate/units" element={<REUnits />} />
                <Route path="realestate/units/new" element={<CreateUnit />} />
                <Route path="realestate/units/:id/edit" element={<CreateUnit />} />
                <Route path="realestate/tenants" element={<RETenants />} />
                <Route path="realestate/tenants/new" element={<CreateTenant />} />
                <Route path="realestate/tenants/:id/edit" element={<CreateTenant />} />
                <Route path="realestate/leases" element={<RELeases />} />
                <Route path="realestate/leases/new" element={<CreateLease />} />
                <Route path="realestate/leases/:id/edit" element={<CreateLease />} />
                <Route path="realestate/invoices" element={<RentInvoices />} />
                <Route path="realestate/invoices/new" element={<CreateRentInvoice />} />
                <Route path="realestate/invoices/:id/pay" element={<PayRentInvoice />} />
                <Route path="realestate/maintenance" element={<MaintenanceRequests />} />
                <Route path="realestate/maintenance/new" element={<CreateMaintenanceRequest />} />
                <Route path="realestate/reports" element={<RealEstateReports />} />
                <Route path="realestate/setup" element={<RealEstateAccountSetup />} />

                {/* Delivery */}
                <Route path="delivery" element={<DeliveryDashboard />} />
                <Route path="delivery/orders" element={<DeliveryOrders />} />
                <Route path="delivery/orders/new" element={<CreateDeliveryOrder />} />
                <Route path="delivery/orders/:id" element={<ViewDeliveryOrder />} />
                <Route path="delivery/orders/:id/edit" element={<CreateDeliveryOrder />} />
                <Route path="delivery/drivers" element={<DeliveryDrivers />} />
                <Route path="delivery/drivers/new" element={<CreateDeliveryDriver />} />
                <Route path="delivery/drivers/:id/edit" element={<CreateDeliveryDriver />} />
                <Route path="delivery/areas" element={<DeliveryAreas />} />
                <Route path="delivery/areas/new" element={<CreateDeliveryArea />} />
                <Route path="delivery/areas/:id/edit" element={<CreateDeliveryArea />} />
                <Route path="delivery/reports" element={<DeliveryReports />} />
                <Route path="delivery/setup" element={<DeliveryAccountSetup />} />
                <Route path="delivery/settlement" element={<DriverSettlement />} />

                {/* Gold & Jewelry */}
                <Route path="gold/items" element={<GoldItems />} />
                <Route path="gold/items/new" element={<CreateGoldItem />} />
                <Route path="gold/items/:id/edit" element={<CreateGoldItem />} />
                <Route path="gold/purchases" element={<GoldPurchases />} />
                <Route path="gold/purchases/new" element={<CreateGoldPurchase />} />
                <Route path="gold/sales" element={<GoldSales />} />
                <Route path="gold/sales/new" element={<CreateGoldSale />} />
                <Route path="gold/prices" element={<GoldPriceSettings />} />
                <Route path="gold/reports" element={<GoldReports />} />
                <Route path="gold/setup" element={<GoldAccountSetup />} />

                {/* Other */}
                <Route path="contacts" element={<ClientContacts />} />
                <Route path="contacts/new" element={<CreateContact />} />
                <Route path="contacts/:id/edit" element={<EditContact />} />
                <Route path="reports" element={<ClientReports />} />
                <Route path="reports/income-statement" element={<IncomeStatement />} />
                <Route path="reports/balance-sheet" element={<BalanceSheet />} />
                <Route path="reports/cash-flow" element={<CashFlow />} />
                <Route path="reports/trial-balance" element={<TrialBalance />} />
                <Route path="reports/vat" element={<VATReport />} />
                <Route path="reports/sales" element={<SalesReports />} />
                <Route path="reports/purchases" element={<PurchaseReports />} />
                <Route path="reports/operations" element={<OperationalReports />} />
                <Route path="reports/inventory" element={<InventoryDetailedReports />} />

                {/* Settings */}
                <Route path="settings" element={<ClientSettings />} />
                <Route path="settings/team" element={<ClientSettings tab="team" />} />
                <Route path="settings/roles" element={<ClientSettings tab="roles" />} />
                <Route path="settings/profile" element={<ClientSettings tab="profile" />} />
                <Route path="settings/branch-management" element={<BranchManagement />} />
                <Route path="settings/branches" element={<ClientSettings tab="branches" />} />
                <Route path="settings/print" element={<ClientSettings tab="print" />} />
                <Route path="settings/payment-methods" element={<ClientSettings tab="payment-methods" />} />
                <Route path="settings/appearance" element={<ClientSettings tab="appearance" />} />
                <Route path="settings/danger" element={<ClientSettings tab="danger" />} />
                <Route path="settings/zatca" element={<ZatcaSettings />} />
                <Route path="fiscal-year-management" element={<FiscalYearManagement />} />

                {/* Payment & Subscription */}
                <Route path="payment" element={<PaymentPage />} />
              </Route>


              {/* Owner Portal Routes */}
              <Route path="/owner" element={<OwnerLayout />}>
                <Route index element={<OwnerDashboard />} />
                <Route path="subscribers" element={<OwnerSubscribers />} />
                <Route path="subscribers/create" element={<CreateSubscriber />} />
                <Route path="subscribers/:id/access" element={<ManageCompanyAccess />} />
                <Route path="subscriptions" element={<OwnerSubscriptions />} />
                <Route path="plans" element={<OwnerPlans />} />

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
          </AutoLogoutWrapper>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
