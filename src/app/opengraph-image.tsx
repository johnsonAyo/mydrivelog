import { socialCard, socialCardSize } from "@/lib/social-card";

export const alt = "MyDriveLog — Keep every lesson on track";
export const size = socialCardSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return socialCard("home");
}
