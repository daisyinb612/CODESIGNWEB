import type { Metadata } from "next";
import { BrickBuddyStudy } from "./BrickBuddyStudy";

export const metadata: Metadata = {
  title: "BrickBuddy Family Co-Design",
  description: "A co-design research tool for children and parents to shape a voice assistant for brick building.",
};

export default function Home() {
  return <BrickBuddyStudy />;
}
