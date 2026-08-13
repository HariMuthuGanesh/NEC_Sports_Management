import React from "react";
import { useAuth } from "../../context/AuthContext";
import { Card } from "./Card";
import Button from "./Button";
import { ShieldAlert, Lock } from "lucide-react";

export default function ProtectedRoute({ allowedRoles = [], children, onRedirectPublic }) {
  const { currentUser, ROLES } = useAuth();

  const userRole = currentUser?.role || ROLES.PUBLIC;
  const isAuthorized = allowedRoles.length === 0 || allowedRoles.includes(userRole);

  if (!isAuthorized) {
    return (
      <div style={{ padding: "32px 16px", maxWidth: "600px", margin: "0 auto" }}>
        <Card>
          <div style={{ textAlign: "center", padding: "24px 16px" }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "var(--nec-danger-bg)",
              color: "var(--nec-danger)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px"
            }}>
              <ShieldAlert size={28} />
            </div>
            <h3 style={{ margin: "0 0 8px 0", color: "var(--nec-text-main)", fontSize: "1.2rem" }}>
              Security Access Restricted (HTTP 403 Forbidden)
            </h3>
            <p style={{ margin: "0 0 20px 0", color: "var(--nec-text-muted)", fontSize: "0.9rem" }}>
              Your current access role <strong>"{userRole}"</strong> does not have permission to view or manage this institutional module.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
              {onRedirectPublic && (
                <Button variant="primary" icon={Lock} onClick={onRedirectPublic}>
                  Return to Public Sports Portal
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return children;
}
