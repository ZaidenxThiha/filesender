import { AdSlots } from "@/components/ad-slots";
import { TransferWorkspace } from "@/components/transfer-workspace";

export default function Home() {
  return (
    <main className="page-shell">
      <TransferWorkspace />
      <AdSlots />
    </main>
  );
}
