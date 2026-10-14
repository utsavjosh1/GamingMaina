import { mediaPaths } from "@/lib/media";

export const businessInfo = {
  name: "Gaming Mania Delhi",
  shortName: "Gaming Mania",
  address: "B-95, Kalkaji, New Delhi – 110019",
  area: "Kalkaji, South Delhi",
  landmark: "Near Kalkaji Mandir Metro & Nehru Place",
  geo: {
    latitude: 28.5492,
    longitude: 77.2588,
  },
  hours: "10:00 AM – 11:00 PM",
  phone: "+91 98110 00000",
  email: "contact@gamingmaniadelhi.com",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=Gaming%20Mania%20B-95%20Kalkaji%20New%20Delhi",
  metroStations: ["Kalkaji Mandir (Violet & Magenta Lines)", "Nehru Place (Violet Line)"],
};

export const stationDetails: Record<
  string,
  {
    summary: string;
    specs: { gpu: string; display: string; controls: string };
    tags: string[];
    accent: "violet" | "cyan" | "green" | "neutral";
  }
> = {
  "PC-RTX": {
    summary: "High-frame-rate PC battle stations with 240Hz Fast IPS panels and 4ms server latency for rank push.",
    specs: {
      gpu: "NVIDIA RTX 40-Series",
      display: "240Hz Fast IPS (1ms G-Sync)",
      controls: "Mechanical Keyboard + Optical 8KHz Mouse",
    },
    tags: ["COMPETITIVE", "PC-RTX", "240 HZ", "ESPORTS"],
    accent: "violet",
  },
  "PC-GTX": {
    summary: "Reliable PC gaming stations for casual co-op sessions, GTA Online, and casual squad grinds.",
    specs: {
      gpu: "GTX 1660 / RTX 3050",
      display: "144Hz Full HD IPS",
      controls: "RGB Mechanical Keyboard + Gaming Headset",
    },
    tags: ["CASUAL", "PC-GTX", "144 HZ", "SQUAD"],
    accent: "cyan",
  },
  PS5: {
    summary: "PlayStation 5 console lounge with 4K 120FPS HDR displays and plush couch seating for groups.",
    specs: {
      gpu: "AMD RDNA 2 (10.3 TFLOPS)",
      display: "Ultra-HD 4K 120Hz HDR",
      controls: "Sony DualSense Wireless Controllers",
    },
    tags: ["NEXT-GEN", "PS5", "4K 120FPS", "LOUNGE"],
    accent: "violet",
  },
  PS4: {
    summary: "Comfortable PlayStation 4 stations for classic split-screen multiplayer and cooperative story titles.",
    specs: {
      gpu: "Custom GCN Engine",
      display: "Full HD 1080p 60Hz",
      controls: "DualShock 4 Wireless Controllers",
    },
    tags: ["CO-OP", "PS4", "SPLIT-SCREEN", "RETRO"],
    accent: "neutral",
  },
  "Virtual Reality": {
    summary: "Room-scale 6DoF Virtual Reality holodeck with motion controllers and padded play boundary.",
    specs: {
      gpu: "High-Resolution 6DoF Headset",
      display: "Dual OLED 90Hz Displays",
      controls: "Precision Wireless Motion Trackers",
    },
    tags: ["IMMERSIVE", "VR", "6DOF", "HOLODECK"],
    accent: "cyan",
  },
  "Racing Wheel": {
    summary: "Force-feedback racing cockpit with realistic steering resistance, steel pedal box, and paddle shifters.",
    specs: {
      gpu: "Force Feedback Servo System",
      display: "Ultra-Wide Panoramic View",
      controls: "Steel Pedals + Paddle Shifter Wheel",
    },
    tags: ["SIMULATOR", "RACING WHEEL", "FORCE FEEDBACK", "COCKPIT"],
    accent: "green",
  },
  Billiards: {
    summary: "Tournament-grade slate pool table with overhead arena lighting for relaxed squad rounds.",
    specs: {
      gpu: "Tournament Precision Slate Table",
      display: "Direct Overhead Pendant Lighting",
      controls: "Aramith Tournament Balls + Balanced Cues",
    },
    tags: ["LOUNGE", "BILLIARDS", "SQUAD PLAY", "TOURNAMENT"],
    accent: "neutral",
  },
  "Air Hockey": {
    summary: "Fast arcade air hockey table with digital scoreboard for instant 1v1 challenger rounds.",
    specs: {
      gpu: "High-Velocity Air Blower",
      display: "Electronic Digital Scoreboard",
      controls: "Dual Heavy-Duty Pushers & Pucks",
    },
    tags: ["ARCADE", "AIR HOCKEY", "1V1 CHALLENGE", "PARTY"],
    accent: "cyan",
  },
  Shooting: {
    summary: "Interactive laser target-shooting station for quick reaction-speed competitions.",
    specs: {
      gpu: "High-Precision Optical Tracker",
      display: "High-Contrast Target Screen",
      controls: "Tactical Force-Feedback Blaster",
    },
    tags: ["CASUAL", "SHOOTING", "REACTION", "AIM TRAIN"],
    accent: "violet",
  },
};

export const gameCategories = [
  {
    title: "Competitive Esports & FPS",
    label: "240HZ MATCH READY",
    stationClass: "PC-RTX Battle Station",
    games: [
      { name: "Valorant", image: mediaPaths.spiderman, genre: "Tactical FPS", platform: "PC" },
      { name: "Counter-Strike 2", image: mediaPaths.gta5, genre: "Competitive FPS", platform: "PC" },
      { name: "Call of Duty: Warzone", image: mediaPaths.rdr2, genre: "Battle Royale", platform: "PC" },
      { name: "Apex Legends", image: mediaPaths.bmw, genre: "Movement Shooter", platform: "PC" },
      { name: "DOTA 2", image: mediaPaths.gow, genre: "MOBA", platform: "PC" },
      { name: "PUBG: Battlegrounds", image: mediaPaths.spiderman, genre: "Battle Royale", platform: "PC" },
    ],
  },
  {
    title: "PlayStation 5 Cinematic & Sports",
    label: "4K 120FPS LOUNGE",
    stationClass: "PS5 Lounge",
    games: [
      { name: "EA Sports FC 24 / FC 25", image: mediaPaths.gta5, genre: "Sports Versus", platform: "PS5" },
      { name: "Tekken 8", image: mediaPaths.gow, genre: "Fighting Tournament", platform: "PS5" },
      { name: "Marvel's Spider-Man 2", image: mediaPaths.spiderman, genre: "Action Adventure", platform: "PS5" },
      { name: "God of War Ragnarök", image: mediaPaths.gow, genre: "Action RPG", platform: "PS5" },
      { name: "Mortal Kombat 1", image: mediaPaths.rdr2, genre: "Fighting", platform: "PS5" },
      { name: "WWE 2K24", image: mediaPaths.bmw, genre: "Sports Entertainment", platform: "PS5" },
    ],
  },
  {
    title: "Sim Racing & Virtual Reality",
    label: "FORCE FEEDBACK & 6DOF",
    stationClass: "Sim Rig & VR Holodeck",
    games: [
      { name: "Forza Horizon 5", image: mediaPaths.bmw, genre: "Open-World Racing", platform: "Sim Rig" },
      { name: "F1 23 / F1 24", image: mediaPaths.bmw, genre: "Formula Sim", platform: "Sim Rig" },
      { name: "Assetto Corsa Competizione", image: mediaPaths.bmw, genre: "GT3 Telemetry", platform: "Sim Rig" },
      { name: "Beat Saber", image: mediaPaths.gow, genre: "Rhythm VR", platform: "VR" },
      { name: "Superhot VR", image: mediaPaths.rdr2, genre: "Tactical VR", platform: "VR" },
    ],
  },
];

export const venueBenefits = [
  {
    stat: "24+",
    label: "Physical Setups",
    title: "Dedicated Play Zones",
    body: "Separate PC battle rows, PS5 sofa setups, racing simulator cockpits, VR zones, and billiards tables under one roof in Kalkaji.",
  },
  {
    stat: "2018",
    label: "Established",
    title: "South Delhi Gaming Legacy",
    body: "Operating continuously in Kalkaji for over 7 years as the trusted home for local collegiate squads and competitive rank grinders.",
  },
  {
    stat: "10–23",
    label: "Open Hours",
    title: "Open Daily in Delhi",
    body: "Open every day from 10:00 AM to 11:00 PM (IST). Online booking slots match real arena operations with a 15-minute reservation grace period.",
  },
  {
    stat: "UPI",
    label: "Zero Friction",
    title: "Pay at Venue Counter",
    body: "Reserve online to guarantee your station with zero advance payment. Settle at the counter via UPI (GPay/PhonePe/Paytm), Cash, or Card.",
  },
];

export const faqs = [
  {
    question: "How does online booking work at Gaming Mania?",
    answer:
      "Select your station class (e.g. PC-RTX, PS5, Sim Rig), pick your preferred date and start time, and confirm your duration. Your slot is locked for 15 minutes past start time. You pay at the venue desk upon arrival.",
  },
  {
    question: "What payment methods do you accept at the counter?",
    answer:
      "We accept all major UPI apps (Google Pay, PhonePe, Paytm), cash, and debit/credit cards at the front desk.",
  },
  {
    question: "Where is Gaming Mania located in Delhi?",
    answer:
      "We are located at B-95, Kalkaji, New Delhi – 110019 in South Delhi. We are within 5 to 7 minutes walking distance from both Kalkaji Mandir Metro Station (Violet & Magenta lines) and Nehru Place Metro Station.",
  },
  {
    question: "What are the standard hourly rates and packages?",
    answer:
      "Standard rates range from ₹100/hr (PC-GTX) to ₹150/hr (PC-RTX 240Hz), ₹200/hr (PS5 4K Lounge), ₹180/hr (Racing Wheel), and ₹250/hr (VR). We also offer a 5-Hour PC-RTX Pass for ₹650 (save ₹100) and Weekday Happy Hours (Mon–Thu 11 AM – 4 PM) with 20% off.",
  },
  {
    question: "Can I bring my own gaming accounts and peripherals?",
    answer:
      "Yes! You can log into your own Steam, Riot, Epic Games, Battle.net, or PlayStation Network accounts. You are also welcome to bring your own mouse, keyboard, or headset if you prefer personal gear.",
  },
  {
    question: "Do you accept walk-ins without booking?",
    answer:
      "Yes, walk-ins are always welcome. However, during evenings (5 PM – 10 PM) and weekends, we strongly recommend booking online 1–2 hours in advance to guarantee zero waiting time.",
  },
];
