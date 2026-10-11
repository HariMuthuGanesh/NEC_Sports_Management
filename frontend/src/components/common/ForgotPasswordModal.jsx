import React, { useState } from "react";
import { Modal } from "../common/Modal";
import Button from "../common/Button";
import { KeyRound, AlertCircle, CheckCircle2 } from "lucide-react";
import { authApi } from "../../services/api/apiServices";
import "./ForgotPasswordModal.css";

/**
 * ForgotPasswordModal
 * Two-step UI:
 *   Step 1 — enter email / username / register number
 *   Step 2 — generic success (never reveals whether account exists)
 *
 * Usage:
 *   <ForgotPasswordModal isOpen={open} onClose={() => setOpen(false)} />
 */
export default function ForgotPasswordModal({ isOpen, onClose }) {
  const [step, setStep]           = useState(1); // 1 = input, 2 = done
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  // Reset state when modal closes
  const handleClose = () => {
    setStep(1);
    setIdentifier("");
    setError(null);
    setLoading(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Please enter your registered email, username, or roll number.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // The backend always returns success (timing-safe) — no need to inspect the response
      await authApi.forgotPassword(identifier.trim());
      setStep(2);
    } catch (err) {
      setError(err.message || "Unable to submit your request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Forgot Password"
      size="sm"
    >
      {step === 1 ? (
        <form onSubmit={handleSubmit} className="fp-form" noValidate>
          <div className="fp-icon-wrap">
            <KeyRound size={32} className="fp-icon" />
          </div>


          <div className="fp-field">
            <label htmlFor="fp-identifier" className="fp-label">
              Email / Username / Roll Number
            </label>
            <input
              id="fp-identifier"
              type="text"
              className={`fp-input${error ? " fp-input--error" : ""}`}
              placeholder="e.g. 20CSR001 or john@nec.edu.in"
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setError(null); }}
              disabled={loading}
              autoComplete="username"
              autoFocus
            />
            {error && (
              <div className="fp-error">
                <AlertCircle size={13} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="fp-actions">
            <Button variant="outline" size="sm" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={loading}>
              Request Reset
            </Button>
          </div>
        </form>
      ) : (
        <div className="fp-success">
          <div className="fp-success-icon">
            <CheckCircle2 size={40} />
          </div>
          <h4 className="fp-success-title">Request Submitted</h4>
          <p className="fp-success-body">If that account exists, the administrator has been notified.</p>
          <Button variant="primary" size="sm" onClick={handleClose} className="fp-done-btn">
            Got it
          </Button>
        </div>
      )}
    </Modal>
  );
}
