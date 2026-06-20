"use client";

import dynamic from "next/dynamic";

// ssr:false keeps idb / window access out of the prerender, mirroring the home
// page. In Next 16 this is only allowed inside a Client Component.
const SessionHistory = dynamic(() => import("@/components/SessionHistory"), { ssr: false });

export default function Page() {
  return <SessionHistory />;
}
