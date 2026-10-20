import { Suspense } from "react";
import { Sala } from "@/components/Sala";

export default function Page() {
  return (
    <Suspense fallback={<p className="loading">Abrindo a sala de situação…</p>}>
      <Sala />
    </Suspense>
  );
}
