import TrainerMount from "@/components/TrainerMount";

// The interactive trainer is client-only (ssr:false), so on its own the
// prerendered HTML would be an empty shell with nothing for search engines to
// index. This server-rendered section gives crawlers (and screen readers) a
// real heading and description; the visible UI is the Trainer below.
export default function Page() {
  return (
    <>
      <section className="sr-only">
        <h1>Coherence — HRV coherence biofeedback trainer</h1>
        <p>
          Coherence is a calm, local-first heart-rate-variability (HRV)
          biofeedback trainer. Pair a Bluetooth heart-rate monitor, follow the
          breathing pacer, and watch your coherence score update in real time.
          Everything runs on your device — no account, and no data is sent
          anywhere.
        </p>
      </section>
      <TrainerMount />
    </>
  );
}
