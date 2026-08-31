import React from "react";
import { AboutSection } from "@/components/AboutSection";

export const metadata = {
  title: "About Protocol | Gaming Mania Delhi",
  description: "Our mission and story.",
};

export default function AboutPage() {
  return <div className="bg-obsidian min-h-screen"><AboutSection /></div>;
}
