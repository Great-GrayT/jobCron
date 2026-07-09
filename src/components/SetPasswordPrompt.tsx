"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PasswordForm } from "@/components/PasswordForm";

/**
 * Admin accounts must have a local password. OAuth-only admins (hasPassword=false)
 * are nagged on every authenticated page until they set one. "Later" closes for the
 * session but it reappears on the next navigation.
 */
export function SetPasswordPrompt() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(Boolean(user) && user!.role === "admin" && user!.hasPassword === false);
  }, [user]);

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card avatar-modal">
        <h3 className="modal-title"><ShieldAlert size={18} /> Set an account password</h3>
        <p className="muted set-pw-note">
          Admin accounts must be secured with a password. You signed in without one | please set it now.
        </p>
        <PasswordForm onDone={() => setOpen(false)} />
        <div className="modal-actions">
          <button type="button" className="btn ghost btn-fx-lift" onClick={() => setOpen(false)}>Later</button>
        </div>
      </div>
    </div>
  );
}
