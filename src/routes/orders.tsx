import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, ChefHat, PackageCheck, Clock } from "lucide-react";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
});

interface OrderRow {
  id: string;
  token_number: number;
  items: Array<{ name: string; qty: number; emoji?: string | null; price: number }>;
  total: number;
  status: "preparing" | "ready" | "collected" | "cancelled";
  estimated_minutes: number;
  created_at: string;
  ready_at: string | null;
}

const statusMeta = {
  preparing: { label: "Preparing", color: "bg-warning text-warning-foreground", Icon: ChefHat },
  ready: { label: "Ready to collect!", color: "bg-success text-success-foreground", Icon: PackageCheck },
  collected: { label: "Collected", color: "bg-muted text-muted-foreground", Icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-destructive text-destructive-foreground", Icon: CheckCircle2 },
};

function OrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const prevStatuses = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function fetchAll() {
      const { data } = await supabase.from("orders").select("*")
        .eq("user_id", user!.id).order("created_at", { ascending: false });
      if (!active) return;
      const rows = (data ?? []) as unknown as OrderRow[];
      setOrders(rows);
      rows.forEach(o => { prevStatuses.current[o.id] = o.status; });
    }
    fetchAll();

    const ch = supabase.channel("my-orders")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const row = payload.new as OrderRow;
        setOrders(curr => {
          const idx = curr.findIndex(o => o.id === row.id);
          if (idx === -1) return [row, ...curr];
          const copy = [...curr]; copy[idx] = row; return copy;
        });
        const prev = prevStatuses.current[row.id];
        if (prev && prev !== row.status && row.status === "ready") {
          toast.success(`🔔 Token #${row.token_number} is READY for pickup!`, { duration: 8000 });
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification("Order ready!", { body: `Token #${row.token_number} — collect now.` });
          }
        }
        prevStatuses.current[row.id] = row.status;
      })
      .subscribe();

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => { active = false; supabase.removeChannel(ch); };
  }, [user]);

  const active = orders.filter(o => o.status === "preparing" || o.status === "ready");
  const past = orders.filter(o => o.status === "collected" || o.status === "cancelled");

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-3xl font-bold">My Orders</h1>
          <Link to="/menu"><Button variant="outline" size="sm">+ New order</Button></Link>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-16 bg-gradient-card rounded-2xl border border-border">
            <p className="text-muted-foreground mb-4">No orders yet.</p>
            <Link to="/menu"><Button className="bg-gradient-primary">Browse menu</Button></Link>
          </div>
        )}

        {active.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Active</h2>
            <div className="space-y-3">
              {active.map(o => <OrderCard key={o.id} o={o} />)}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">History</h2>
            <div className="space-y-3">
              {past.map(o => <OrderCard key={o.id} o={o} />)}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function OrderCard({ o }: { o: OrderRow }) {
  const meta = statusMeta[o.status];
  const Icon = meta.Icon;
  return (
    <div className={`bg-gradient-card border border-border rounded-2xl p-5 shadow-card ${o.status === "ready" ? "pulse-ready" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Token</div>
          <div className="text-3xl font-bold text-gradient">#{o.token_number}</div>
        </div>
        <Badge className={`${meta.color} gap-1`}><Icon className="h-3 w-3" /> {meta.label}</Badge>
      </div>
      <div className="mt-3 space-y-1 text-sm">
        {o.items.map((it, i) => (
          <div key={i} className="flex justify-between">
            <span>{it.emoji} {it.name} × {it.qty}</span>
            <span className="text-muted-foreground">₹{(it.price * it.qty).toFixed(0)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" /> ~{o.estimated_minutes} min
        </span>
        <span className="font-semibold">Total ₹{Number(o.total).toFixed(0)}</span>
      </div>
    </div>
  );
}
