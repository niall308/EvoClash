import React from "react";
import { useParams } from "react-router-dom";
import PvpBattleScreen from "@/components/pvpbattle/PvpBattleScreen";

export default function PvpBattle() {
  const { code } = useParams();
  return <PvpBattleScreen matchCode={code} />;
}