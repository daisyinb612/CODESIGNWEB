import { createRoot } from "react-dom/client";
import { BrickBuddyStudy } from "../app/BrickBuddyStudy";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) throw new Error("Root element not found");

createRoot(root).render(<BrickBuddyStudy />);
