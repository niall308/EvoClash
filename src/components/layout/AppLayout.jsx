import React from "react";
import { Outlet } from "react-router-dom";
import CoinsBadge from "@/components/layout/CoinsBadge";

export default function AppLayout() {
  return (
    <div className="relative">
      <CoinsBadge />
      <Outlet />
    </div>
  );
}