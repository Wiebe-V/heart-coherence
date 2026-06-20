"use client";

import dynamic from "next/dynamic";

// ssr:false keeps all sensor/browser code (navigator.bluetooth, window,
// requestAnimationFrame) out of the prerender. In Next 16 this is only
// allowed inside a Client Component, hence the "use client" above.
const Trainer = dynamic(() => import("@/components/Trainer"), { ssr: false });

export default function Page() {
  return <Trainer />;
}
