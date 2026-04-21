import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChefHat, PackageCheck, UtensilsCrossed } from "lucide-react";

export const Route = createFileRoute("/display")({
  component: DisplayPage,
});

interface BoardRow {
  token_number: number;
  status: "preparing" | "ready";
  estimated_minutes: number;
}

function DisplayPage() {
  const [rows, setRows] = useState<BoardRow[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await supabase
        .from("orders")
        .select("token_number,status,estimated_minutes,created_at")
        .in("status", ["preparing", "ready"])
        .order("created_at", { ascending: true });
      if (active) setRows((data ?? []) as BoardRow[]);
    }
    load();
    const ch = supabase.channel("public-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    const t = setInterval(load, 15000);
    return () => { active = false; supabase.removeChannel(ch); clearInterval(t); };
  }, []);

  const preparing = rows.filter(r => r.status === "preparing");
  const ready = rows.filter(r => r.status === "ready");

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <header className="flex items-center justify-center gap-3 mb-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
          <UtensilsCrossed className="h-6 w-6 text-primary-foreground" />
        </span>
        <h1 className="text-3xl sm:text-5xl font-bold text-gradient">Live Order Board</h1>
      </header>

      <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
        <Panel title="Preparing" Icon={ChefHat} tone="warning" tokens={preparing.map(p => p.token_number)} />
        <Panel title="Ready for Pickup" Icon={PackageCheck} tone="success" pulse tokens={ready.map(p => p.token_number)} />
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">
        Updates live · Midnight Eats Smart Canteen
      </p>
    </div>
  );
}

function Panel({ title, Icon, tone, tokens, pulse }: {
  title: string; Icon: React.ComponentType<{ className?: string }>;
  tone: "warning" | "success"; tokens: number[]; pulse?: boolean;
}) {
  const toneClass = tone === "warning" ? "text-warning" : "text-success";
  return (
    <section className="bg-gradient-card border border-border rounded-3xl p-6 shadow-card">
      <div className="flex items-center gap-2 mb-5">
        <Icon className={`h-7 w-7 ${toneClass}`} />
        <h2 className="text-2xl font-bold">{title}</h2>
        <span className="ml-auto text-sm text-muted-foreground">{tokens.length}</span>
      </div>
      {tokens.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">—</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {tokens.map(t => (
            <div key={t}
              className={`aspect-square rounded-2xl border border-border flex items-center justify-center text-3xl sm:text-4xl font-bold bg-surface-elevated ${pulse ? "pulse-ready text-success" : "text-foreground"}`}>
              #{t}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
