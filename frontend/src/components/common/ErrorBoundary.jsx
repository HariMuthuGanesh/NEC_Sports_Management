import React from "react";
import { AlertCircle, RefreshCw, LayoutDashboard } from "lucide-react";
import Button from "./Button";
import { Card } from "./Card";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary caught an error]:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "32px 16px", maxWidth: "650px", margin: "40px auto" }}>
          <Card>
            <div style={{ textAlign: "center", padding: "24px 16px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  margin: "0 auto 16px",
                  backgroundColor: "var(--nec-danger-bg, #fef2f2)",
                  color: "var(--nec-danger, #ef4444)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertCircle size={28} />
              </div>
              <h3 style={{ margin: "0 0 8px 0", color: "var(--nec-text-main)", fontSize: "1.2rem", fontWeight: 700 }}>
                Page Component Error
              </h3>
              <p style={{ margin: "0 0 16px 0", color: "var(--nec-text-muted)", fontSize: "0.9rem" }}>
                This module encountered an unexpected error while rendering data.
              </p>
              {this.state.error?.message && (
                <div
                  style={{
                    background: "var(--nec-bg-alt, #f8fafc)",
                    padding: "10px 14px",
                    borderRadius: "6px",
                    fontSize: "0.82rem",
                    color: "var(--nec-danger, #ef4444)",
                    fontFamily: "monospace",
                    marginBottom: "20px",
                    textAlign: "left",
                    overflowX: "auto",
                    border: "1px solid var(--nec-border-light, #e2e8f0)",
                  }}
                >
                  {this.state.error.message}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
                <Button variant="outline" icon={RefreshCw} onClick={this.handleReset}>
                  Try Again
                </Button>
                {this.props.onNavigate && (
                  <Button variant="primary" icon={LayoutDashboard} onClick={() => {
                    this.setState({ hasError: false, error: null });
                    this.props.onNavigate();
                  }}>
                    Return to Dashboard
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
