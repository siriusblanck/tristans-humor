import { permanentRedirect } from "next/navigation";

// The letter gallery became the Owl Post front page; keep old links working.
export default function Gallery() {
  permanentRedirect("/");
}
