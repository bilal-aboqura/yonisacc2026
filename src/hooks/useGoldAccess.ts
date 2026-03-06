import { useTenantIsolation } from "./useTenantIsolation";

/**
 * Hook to check if the current company has gold & jewelry features enabled
 * Gold screens show only when company activity_type is 'Gold & Jewelry Shops'
 */
export const useGoldAccess = () => {
  const { company, isLoadingCompany } = useTenantIsolation();

  const isGoldCompany = company?.activity_type === "Gold & Jewelry Shops";

  return {
    isGoldCompany,
    isLoading: isLoadingCompany,
  };
};

export default useGoldAccess;
