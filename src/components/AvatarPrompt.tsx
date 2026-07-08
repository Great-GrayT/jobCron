"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AvatarPicker } from "@/components/AvatarPicker";

/**
 * Nags users with no profile picture to pick one. Renders whenever the logged-in
 * user has neither avatarData nor avatarUrl | so it reappears on every dashboard
 * open until they choose (they can still skip for the session).
 */
export function AvatarPrompt() {
  const { user, updateProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user && !user.avatarData && !user.avatarUrl) setOpen(true);
    else setOpen(false);
  }, [user]);

  if (!open) return null;

  const pick = async (value: string, kind: "url" | "data") => {
    setBusy(true);
    try {
      await updateProfile(kind === "url" ? { avatarUrl: value, avatarData: "" } : { avatarData: value, avatarUrl: "" });
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card avatar-modal">
        <h3 className="modal-title">Choose your avatar</h3>
        <p className="muted" style={{ marginBottom: "1rem" }}>
          Pick a face so people recognise you in messages | or upload your own.
        </p>
        <AvatarPicker current={null} onPick={pick} busy={busy} />
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Skip for now</button>
        </div>
      </div>
    </div>
  );
}
