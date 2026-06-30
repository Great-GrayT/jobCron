"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, X, Mail, AtSign, MapPin, Briefcase, Phone, ShieldCheck, Calendar, ExternalLink } from "lucide-react";
import { users, type UserCard } from "@/lib/api/users";
import { admin } from "@/lib/api/admin";
import type { AdminUserDetail } from "@/lib/api/types";
import "@/components/user-info.css";

interface Props {
  userId: string;
  /** Shown immediately while the full record loads. */
  fallbackName: string;
  fallbackAvatar?: string | null;
  /** When the viewer is an admin we load full detail + show a deep link. */
  viewerIsAdmin: boolean;
  onClose: () => void;
}

function Row({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="ui-row">
      <Icon size={15} />
      <span className="ui-label">{label}</span>
      <span className="ui-value">{value}</span>
    </div>
  );
}

export function UserInfoModal({ userId, fallbackName, fallbackAvatar, viewerIsAdmin, onClose }: Props) {
  const [card, setCard] = useState<UserCard | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (viewerIsAdmin) {
          const d = await admin.user(userId);
          if (alive) setDetail(d);
        } else {
          const c = await users.card(userId);
          if (alive) setCard(c);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, viewerIsAdmin]);

  const u = detail?.user ?? card; // fields common to both shapes
  const name =
    u?.name ||
    (card ? [card.firstName, card.lastName].filter(Boolean).join(" ") : "") ||
    fallbackName;
  const avatar = card?.avatarData || u?.avatarUrl || fallbackAvatar;
  const address = u ? [u.city, u.country].filter(Boolean).join(", ") : "";
  const phone =
    detail?.user && (detail.user.phoneNumber || detail.user.mobileNumber)
      ? [
          detail.user.phoneDialCode && detail.user.phoneNumber
            ? `${detail.user.phoneDialCode} ${detail.user.phoneNumber}`
            : null,
          detail.user.mobileDialCode && detail.user.mobileNumber
            ? `${detail.user.mobileDialCode} ${detail.user.mobileNumber}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : "";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card ui-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ui-close" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="ui-head">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="ui-avatar" src={avatar} alt={name} />
          ) : (
            <span className="ui-avatar ui-avatar-fallback">{(name[0] || "?").toUpperCase()}</span>
          )}
          <div>
            <div className="ui-name">{name}</div>
            {u?.role === "admin" && <span className="ui-role-badge">Admin</span>}
          </div>
        </div>

        {loading ? (
          <div className="ui-loading"><Loader2 className="spin" size={18} /> loading…</div>
        ) : error ? (
          <div className="auth-error">{error}</div>
        ) : (
          <div className="ui-body">
            <Row icon={AtSign} label="Username" value={u?.username || "—"} />
            <Row icon={Mail} label="Email" value={u?.email} />
            <Row icon={MapPin} label="Address" value={address || "—"} />
            <Row icon={Briefcase} label="Speciality" value={u?.speciality || "—"} />

            {detail && (
              <>
                <Row icon={Phone} label="Phone" value={phone || "—"} />
                <Row
                  icon={ShieldCheck}
                  label="Status"
                  value={detail.user.emailVerified ? "Verified" : "Unverified"}
                />
                <Row
                  icon={Calendar}
                  label="Joined"
                  value={new Date(detail.user.createdAt).toLocaleDateString()}
                />
                <div className="ui-counts">
                  <span>{detail.feeds.length} feeds</span>
                  <span>{detail.channels.length} channels</span>
                  <span>{detail.schedules.length} crons</span>
                  <span>{detail.applied.length} applied</span>
                </div>
                <Link href={`/admin?user=${userId}`} className="button is-primary is-fullwidth ui-admin-link" onClick={onClose}>
                  <ExternalLink size={15} /> Open in User Management
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
