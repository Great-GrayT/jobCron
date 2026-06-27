"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import "@/components/dashboard.css";

function Result() {
  const ok = useSearchParams().get("ok") === "1";
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>{ok ? <><CheckCircle2 size={18} /> EMAIL VERIFIED</> : <><XCircle size={18} /> LINK INVALID</>}</h1>
        <p className="sub">
          {ok
            ? "Your email is confirmed. You can now sign in."
            : "This verification link is invalid or has expired. Request a new one from the login page."}
        </p>
        <Link className="btn block" href="/login">GO TO SIGN IN</Link>
      </div>
    </div>
  );
}

export default function VerifiedPage() {
  return (
    <Suspense fallback={null}>
      <Result />
    </Suspense>
  );
}
