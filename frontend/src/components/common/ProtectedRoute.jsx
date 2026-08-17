import React, { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { SecurityLogger, isTokenExpired, getAuthToken } from "../../utils/security";
import { Card } from "./Card";
import Button from "./Button";
import { ShieldAlert, Lock, Clock } from "lucide-react";

export default function ProtectedRoute({ allowedRoles = [], children, onRedirectPublic, routeId }) {
  const { currentUser, ROLES } = useAuth();

  const userRole = currentUser?.role || ROLES.PUBLIC;
  const isAuthorized = allowedRoles.length === 0 || allowedRoles.includes(userRole);

  // Check if session is expired (not just unauthorized)
  const token = getAuthToken();
  const isExpired = token ? isTokenExpired(token) : (userRole !== ROLES.PUBLIC);

  // Log unauthorized access attempt (only once on mount)
  useEffect(() => {
    if (!isAuthorized) {
      SecurityLogger.logUnauthorizedAccess(userRole, routeId || window.location.hash || "unknown_route");
    }
  }, [isAuthorized, userRole, routeId]);

  if (isAuthorized) return children;

  // Session-expired vs truly unauthorized
  const isSessionExpiredState = isExpired && userRole === ROLES.PUBLIC;

  return (
    <div style={{ padding: "32px 16px", maxWidth: "600px", margin: "0 auto" }}>
      <Card>
        <div style={{ textAlign: "center", padding: "32px 20px" }}>
          {/* Icon */}
          <div style={{
            width: "60px", height: "60px", borderRadius: "50%", margin: "0 auto 16px",
            backgroundColor: isSessionExpiredState ? "var(--nec-warning-bg, #fffbeb)" : "var(--nec-danger-bg, #fef2f2)",
            color: isSessionExpiredState ? "var(--nec-warning, #d97706)" : "var(--nec-danger, #dc2626)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            {isSessionExpiredState ? <Clock size={28} /> : <ShieldAlert size={28} />}
          </div>

          {/* Heading */}
          <h3 style={{ margin: "0 0 8px 0", color: "var(--nec-text-main)", fontSize: "1.2rem", fontWeight: 700 }}>
            {isSessionExpiredState ? "Session Expired" : "Access Restricted"}
          </h3>

          {/* Sub-text */}
          <p style={{ margin: "0 0 6px 0", color: "var(--nec-text-muted)", fontSize: "0.9rem" }}>
            {isSessionExpiredState
              ? "Your session has expired due to inactivity. Please sign in again to continue."
              : <>Your current role <strong>"{userRole}"</strong> does not have permission to access this module.</>
            }
          </p>

          {/* Role badge */}
          {!isSessionExpiredState && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              background: "var(--nec-bg-alt)", borderRadius: "20px",
              padding: "4px 12px", margin: "8px 0 16px",
              fontSize: "0.8rem", color: "var(--nec-text-muted)",
              border: "1px solid var(--nec-border-light)"
            }}>
              <Lock size={12} />
              Required: {allowedRoles.map(r => r.split(" ")[0]).join(" or ")}
            </div>
          )}

          {/* Action button */}
          <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "20px" }}>
            {onRedirectPublic && (
              <Button variant="primary" icon={isSessionExpiredState ? Clock : Lock} onClick={onRedirectPublic}>
                {isSessionExpiredState ? "Sign In Again" : "Return to My Portal"}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
