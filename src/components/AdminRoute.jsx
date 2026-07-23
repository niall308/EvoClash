import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function AdminRoute() {
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      setLoaded(true);
    });
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A]">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (user?.role !== "admin") return <Navigate to="/" replace />;

  return <Outlet />;
}