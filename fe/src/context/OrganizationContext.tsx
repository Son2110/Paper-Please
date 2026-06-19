/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  organizationApi,
  type OrganizationDTO,
} from "@/api/organizationApi";
import { useAuth } from "@/context/AuthContext";

const ACTIVE_ORGANIZATION_STORAGE_KEY = "paperPlease.activeOrganizationId";

interface OrganizationContextValue {
  organizations: OrganizationDTO[];
  activeOrganization: OrganizationDTO | null;
  activeOrganizationId: string | null;
  isLoading: boolean;
  error: string | null;
  refreshOrganizations: () => Promise<OrganizationDTO[]>;
  setActiveOrganizationId: (id: string | null) => void;
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(
  undefined,
);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationDTO[]>([]);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<
    string | null
  >(() => window.localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY));
  const [isLoading, setIsLoading] = useState(
    () => Boolean(window.localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY)),
  );
  const [error, setError] = useState<string | null>(null);

  const setActiveOrganizationId = useCallback((id: string | null) => {
    setActiveOrganizationIdState(id);
    if (id) {
      window.localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, id);
      return;
    }
    window.localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
  }, []);

  const refreshOrganizations = useCallback(async () => {
    if (!isAuthenticated) {
      setOrganizations([]);
      setActiveOrganizationId(null);
      setIsLoading(false);
      return [];
    }

    setIsLoading(true);
    setError(null);
    try {
      const nextOrganizations = await organizationApi.getMine();
      setOrganizations(nextOrganizations);

      const hasActive = nextOrganizations.some(
        (organization) => organization.id === activeOrganizationId,
      );
      if (!hasActive) {
        setActiveOrganizationId(nextOrganizations[0]?.id ?? null);
      }

      return nextOrganizations;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể tải danh sách tổ chức.";
      setError(message);
      setOrganizations([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [activeOrganizationId, isAuthenticated, setActiveOrganizationId]);

  useEffect(() => {
    if (isInitializing) return;
    refreshOrganizations();
  }, [isInitializing, refreshOrganizations]);

  const activeOrganization = useMemo(
    () =>
      organizations.find(
        (organization) => organization.id === activeOrganizationId,
      ) ?? null,
    [activeOrganizationId, organizations],
  );

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organizations,
      activeOrganization,
      activeOrganizationId,
      isLoading,
      error,
      refreshOrganizations,
      setActiveOrganizationId,
    }),
    [
      activeOrganization,
      activeOrganizationId,
      error,
      isLoading,
      organizations,
      refreshOrganizations,
      setActiveOrganizationId,
    ],
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }
  return context;
}
