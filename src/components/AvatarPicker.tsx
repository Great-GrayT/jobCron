"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, Shuffle, Check } from "lucide-react";
import { AVATAR_PRESETS, randomAvatar } from "@/lib/avatars";
import "@/components/avatar.css";

/** How the chosen avatar should be stored: a hosted URL (presets) or base64 (uploads). */
export type AvatarKind = "url" | "data";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

interface Props {
  /** Currently selected avatar (data URL or remote URL) for highlight. */
  current?: string | null;
  /** Called when the user picks a preset (kind "url") or uploads (kind "data"). */
  onPick: (value: string, kind: AvatarKind) => void | Promise<void>;
  /** External busy flag (e.g. the profile save in flight). */
  busy?: boolean;
}

export function AvatarPicker({ current, onPick, busy }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState<string | null>(null);

  // Presets are hosted assets | store the relative URL so it also shows up in
  // chat (the messages API only exposes avatarUrl, not base64 avatarData).
  const pickPreset = async (src: string) => {
    setWorking(src);
    try {
      await onPick(src, "url");
    } finally {
      setWorking(null);
    }
  };

  const onUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      alert("Image too large | max 2MB.");
      return;
    }
    setWorking("upload");
    try {
      await onPick(await fileToDataUrl(file), "data");
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="avatar-picker">
      <div className="avatar-picker-actions">
        <button
          type="button"
          className="button is-light is-small"
          disabled={busy || !!working}
          onClick={() => pickPreset(randomAvatar().src)}
        >
          {working && working !== "upload" ? <Loader2 className="spin" size={14} /> : <Shuffle size={14} />} Surprise me
        </button>
        <button
          type="button"
          className="button is-light is-small"
          disabled={busy || !!working}
          onClick={() => fileRef.current?.click()}
        >
          {working === "upload" ? <Loader2 className="spin" size={14} /> : <Upload size={14} />} Upload your own
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          aria-label="Upload avatar"
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
        />
      </div>

      <div className="avatar-grid">
        {AVATAR_PRESETS.map((a) => {
          const isWorking = working === a.src;
          return (
            <button
              type="button"
              key={a.id}
              className="avatar-cell"
              title={a.label}
              disabled={busy || !!working}
              onClick={() => pickPreset(a.src)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.src} alt={a.label} width={56} height={56} loading="lazy" />
              {isWorking ? (
                <span className="avatar-cell-overlay"><Loader2 className="spin" size={16} /></span>
              ) : null}
            </button>
          );
        })}
      </div>
      {current ? (
        <p className="avatar-picker-hint"><Check size={13} /> Pick a face, hit shuffle, or upload your own.</p>
      ) : (
        <p className="avatar-picker-hint">Pick a face, hit shuffle, or upload your own.</p>
      )}
    </div>
  );
}
