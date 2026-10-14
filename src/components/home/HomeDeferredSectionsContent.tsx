"use client";

import { ExperienceMatrix } from "@/components/marketing/ExperienceMatrix";
import { VenueBentoGrid } from "@/components/marketing/VenueBentoGrid";
import { GamesList } from "@/components/GamesList";
import { LocationAndFaq, PricingSnapshot, ReviewsSection, VenueGallery } from "@/components/HomeSections";
import { Services, fallbackStationTypes } from "@/components/Services";

export function HomeDeferredSectionsContent() {
  return (
    <>
      <ExperienceMatrix />
      <Services stationTypes={fallbackStationTypes} />
      <VenueBentoGrid />
      <GamesList />
      <PricingSnapshot stationTypes={fallbackStationTypes} />
      <VenueGallery />
      <ReviewsSection />
      <LocationAndFaq />
    </>
  );
}
