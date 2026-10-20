import type { Metadata } from "next";
import { Admin } from "@/components/Admin";

export const metadata: Metadata = {
  title: "Sombras do Contágio",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Admin />;
}
