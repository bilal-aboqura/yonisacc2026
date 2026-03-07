/**
 * Hook to check which screens are enabled for the current company.
 * Currently all screens are enabled by default for all companies.
 * Screen-level access control has been removed — plans only control usage limits.
 */
export const useScreenAccess = () => {
  const isScreenEnabled = (_screenKey: string): boolean => true;

  return {
    enabledScreenKeys: new Set<string>(),
    isLoading: false,
    isScreenEnabled,
    hasNoScreenConfig: true,
  };
};

export default useScreenAccess;
