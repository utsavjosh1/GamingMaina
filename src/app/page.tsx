import { Hero } from "@/components/Hero";
import { HomeDeferredSections } from "@/components/home/HomeDeferredSections";
import { businessInfo, faqs } from "@/lib/public-content";

export default function Home() {
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: businessInfo.name,
    alternateName: businessInfo.shortName,
    url: "https://gamingmaniadelhi.com",
    image: "https://gamingmaniadelhi.com/og-image.svg",
    telephone: businessInfo.phone,
    email: businessInfo.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: "B-95, Kalkaji",
      addressLocality: "New Delhi",
      addressRegion: "Delhi",
      postalCode: "110019",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: businessInfo.geo.latitude,
      longitude: businessInfo.geo.longitude,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "10:00",
        closes: "23:00",
      },
    ],
    priceRange: "₹100 - ₹250",
    currenciesAccepted: "INR",
    paymentAccepted: "Cash, UPI, Credit Card, Debit Card",
    areaServed: {
      "@type": "AdministrativeArea",
      name: "South Delhi",
    },
    description:
      "Premier physical gaming lounge in B-95 Kalkaji, South Delhi offering 240Hz RTX PC stations, PlayStation 5 lounges, force-feedback racing simulators, VR, and billiards.",
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Hero />
      <HomeDeferredSections />
    </>
  );
}
