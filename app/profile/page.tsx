"use client";

import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(undefined);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  if (user === undefined) return null;
  if (!user) return <div className="mx-auto max-w-md px-4 py-20 text-sm text-slate-500">Log in to view your profile.</div>;

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Profile</h1>
      <div className="card p-6 space-y-3">
        <div>
          <p className="text-xs text-slate-500">Email</p>
          <p className="text-slate-900">{user.email}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Role</p>
          <p className="text-slate-900">{user.role}</p>
        </div>
      </div>
    </div>
  );
}
