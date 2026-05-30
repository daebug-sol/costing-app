import { DatabaseModule } from "@/components/database/database-module";
import { PageShell } from "@/components/page-shell";

export default function DatabasePage() {
  return (
    <PageShell
      eyebrow="Master data"
      title="Database"
      description="Basis data AHU terstruktur dan custom dynamic grid untuk kebutuhan costing."
    >
      <DatabaseModule />
    </PageShell>
  );
}
