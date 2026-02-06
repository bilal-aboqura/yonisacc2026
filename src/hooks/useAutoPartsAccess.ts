import { useTenantIsolation } from "./useTenantIsolation";

/**
 * Hook to check if the current company has auto parts features enabled
 * Auto parts screens show only when company activity_type is 'auto_parts'
 */
export const useAutoPartsAccess = () => {
  const { company, isLoadingCompany } = useTenantIsolation();

  const isAutoPartsCompany = company?.activity_type === "auto_parts";

  return {
    isAutoPartsCompany,
    isLoading: isLoadingCompany,
  };
};

export default useAutoPartsAccess;
