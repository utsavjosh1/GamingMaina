import { AboutSection } from "@/components/AboutSection";
import { LocationAndFaq, VenueGallery } from "@/components/HomeSections";

export const metadata = {
  title: "About Gaming Mania Delhi | Kalkaji Gaming Lounge & Esports Arena",
  description: "Learn about Gaming Mania Delhi, South Delhi's premier physical gaming lounge founded in 2018 in Kalkaji with 24+ PC rigs, PS5 consoles, racing rigs, and VR.",
};

export default function AboutPage() {
  return (
    <div className="pb-4 pt-24 lg:pt-28">
      <div className="gm-container">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ember">About the arena</p>
        <h1 className="ops-heading mt-3 max-w-[20ch] font-heading text-4xl font-extrabold tracking-tight text-paper sm:text-6xl">
          South Delhi&rsquo;s living room for gamers.
        </h1>
      </div>
      <AboutSection />
      <VenueGallery />
      <LocationAndFaq />
    </div>
  );
}
