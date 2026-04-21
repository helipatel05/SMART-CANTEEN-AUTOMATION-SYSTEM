import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChefHat, PackageCheck, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/staff")({
  component: StaffPage,
});

interface OrderRow {
  id: string;
  token_number: number;
  items: Array<{ name: string; qty: number; emoji?: string | null; price: number }>;
  total: number;
  status: "preparing" | "ready" | "collected" | "cancelled";
  estimated_minutes: number;
  created_at: string;
}

function StaffPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (role && role !== "staff") navigate({ to: "/menu" });
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (role !== "staff") return;
    let active = true;

    async function load() {
      const { data } = await supabase.from("orders").select("*")
        .order("created_at", { ascending: false }).limit(100);
      if (active) setOrders((data ?? []) as unknown as OrderRow[]);
    }
    load();

    const ch = supabase.channel("staff-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const row = payload.new as OrderRow;
          setOrders(curr => [row, ...curr]);
          toast.info(`🆕 New order — Token #${row.token_number}`);
        } else if (payload.eventType === "UPDATE") {
          const row = payload.new as OrderRow;
          setOrders(curr => curr.map(o => o.id === row.id ? row : o));
        }
      }).subscribe();

    return () => { active = false; supabase.removeChannel(ch); };
  }, [role]);

  async function setStatus(id: string, status: OrderRow["status"]) {
    const patch: { status: OrderRow["status"]; ready_at?: string; collected_at?: string } = { status };
    if (status === "ready") patch.ready_at = new Date().toISOString();
    if (status === "collected") patch.collected_at = new Date().toISOString();
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(`Marked as ${status}`);
  }

  const preparing = orders.filter(o => o.status === "preparing");
  const ready = orders.filter(o => o.status === "ready");
  const recent = orders.filter(o => o.status === "collected").slice(0, 10);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Staff Dashboard</h1>
          <p className="text-muted-foreground text-sm">Live order queue · updates in real time</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <Column title="Preparing" count={preparing.length} Icon={ChefHat} tone="warning">
            {preparing.length === 0 && <Empty msg="No orders cooking." />}
            {preparing.map(o => (
              <OrderTile key={o.id} o={o}>
                <Button onClick={() => setStatus(o.id, "ready")} className="w-full bg-success text-success-foreground hover:opacity-90">
                  <PackageCheck className="h-4 w-4 mr-2" /> Mark as Ready
                </Button>
              </OrderTile>
            ))}
          </Column>

          <Column title="Ready" count={ready.length} Icon={PackageCheck} tone="success">
            {ready.length === 0 && <Empty msg="Nothing waiting." />}
            {ready.map(o => (
              <OrderTile key={o.id} o={o} highlight>
                <Button onClick={() => setStatus(o.id, "collected")} variant="outline" className="w-full">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Collected
                </Button>
              </OrderTile>
            ))}
          </Column>

          <Column title="Recent" count={recent.length} Icon={CheckCircle2} tone="muted">
            {recent.length === 0 && <Empty msg="No recent pickups." />}
            {recent.map(o => <OrderTile key={o.id} o={o} dim />)}
          </Column>
        </div>
      </main>
    </div>
  );
}

function Column({ title, count, Icon, tone, children }: {
  title: string; count: number; Icon: React.ComponentType<{ className?: string }>;
  tone: "warning" | "success" | "muted"; children: React.ReactNode;
}) {
  const toneClass = tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : "text-muted-foreground";
  return (
    <section className="bg-gradient-card border border-border rounded-2xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-semibold">
          <Icon className={`h-5 w-5 ${toneClass}`} /> {title}
        </div>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">{children}</div>
    </section>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="text-center text-sm text-muted-foreground py-8">{msg}</div>;
}

function OrderTile({ o, children, highlight, dim }: {
  o: OrderRow; children?: React.ReactNode; highlight?: boolean; dim?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-border p-3 bg-surface-elevated ${highlight ? "pulse-ready" : ""} ${dim ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-2xl font-bold text-gradient">#{o.token_number}</div>
        <div className="text-xs text-muted-foreground">
          {new Date(o.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      <ul className="text-sm space-y-0.5 mb-3">
        {o.items.map((it, i) => (
          <li key={i}>{it.emoji} {it.name} × {it.qty}</li>
        ))}
      </ul>
      <div className="text-xs text-muted-foreground mb-2">₹{Number(o.total).toFixed(0)} · ETA {o.estimated_minutes}m</div>
      {children}
    </div>
  );
}
