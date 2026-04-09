import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useGetMe } from "@workspace/api-client-react";

export function ProtectedRoute({ 
  component: Component, 
  adminOnly = false,
  redirectToProjects = false
}: { 
  component: any, 
  adminOnly?: boolean,
  redirectToProjects?: boolean
}) {
  const { token, user, isAdmin, logout, login } = useAuth();
  const [, setLocation] = useLocation();

  const { data: me, isError } = useGetMe({
    query: {
      enabled: !!token && !user,
      retry: false,
    }
  });

  useEffect(() => {
    if (me && !user) {
      login(token!, me);
    }
  }, [me, user, login, token]);

  useEffect(() => {
    if (!token || isError) {
      if (isError) logout();
      setLocation("/login");
    } else if (adminOnly && user && !isAdmin) {
      setLocation("/projects");
    } else if (redirectToProjects && token && (user || me)) {
      setLocation("/projects");
    }
  }, [token, isError, setLocation, adminOnly, user, me, isAdmin, logout, redirectToProjects]);

  if (!token) return null;
  if (!user && !isError) return <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">Loading session...</div>;
  if (adminOnly && !isAdmin) return null;
  if (redirectToProjects) return null;

  return <Component />;
}