import { socialCard, socialCardSize } from "@/lib/social-card";

export const alt = "MyDriveLog — Choose a driving lesson time";
export const size = socialCardSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return socialCard("booking");
}
