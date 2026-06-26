"use client";

import { useAuth } from "@/context/AuthContext";

export default function AccountPage() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <section className="panel">
      <h2>ACCOUNT</h2>
      <div className="field">
        <label>Email</label>
        <input value={user.email} readOnly />
      </div>
      <div className="field">
        <label>Name</label>
        <input value={user.name ?? ""} readOnly placeholder="—" />
      </div>
      <div className="field">
        <label>Role</label>
        <input value={user.role} readOnly />
      </div>
      <button className="btn danger" onClick={logout}>LOG OUT</button>
    </section>
  );
}
