import React from "react";
import { GamesList } from "@/components/GamesList";

export const metadata = {
  title: "Arsenal | Gaming Mania Delhi",
  description: "Browse our complete library of PS5, PC, and VR games.",
};

export default function GamesPage() {
  return (
    <div className="pt-20 bg-obsidian min-h-screen">
      <GamesList />
    </div>
  );
}
