import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { AboutSection } from "@/components/AboutSection";
import { GamesList } from "@/components/GamesList";

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Gaming Mania Delhi",
    url: "https://gamingmaniadelhi.com",
    areaServed: "Kalkaji, Delhi",
    description: "Premium PC gaming and console lounge in Delhi.",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <Hero />
      <Services />
      <AboutSection />
      <GamesList />
    </>
  );
}
