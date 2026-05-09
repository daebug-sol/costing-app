import { DatabaseModule } from "@/components/database/database-module";

export default function DatabasePage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-foreground mb-2 text-2xl font-semibold tracking-tight">
          Database
        </h1>
        <p className="text-muted-foreground text-sm">
          Basis data AHU terstruktur dan custom dynamic grid untuk kebutuhan costing.
        </p>
      </div>
      <DatabaseModule />
    </div>
  );
}
