import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Minus, Plus, ShoppingBag, Clock } from "lucide-react";

export const Route = createFileRoute("/menu")({
  component: MenuPage,
});

interface Item {
  id: string; name: string; description: string | null; category: string;
  price: number; prep_minutes: number; available: boolean; emoji: string | null;
}

function MenuPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [cat, setCat] = useState<string>("All");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
    if (!loading && role === "staff") navigate({ to: "/staff" });
  }, [user, role, loading, navigate]);

  useEffect(() => {
    supabase.from("menu_items").select("*").eq("available", true).order("category")
      .then(({ data }) => setItems((data ?? []) as Item[]));
  }, []);

  const categories = useMemo(() => ["All", ...Array.from(new Set(items.map(i => i.category)))], [items]);
  const visible = cat === "All" ? items : items.filter(i => i.category === cat);

  const cartLines = items.filter(i => cart[i.id]).map(i => ({
    item: i, qty: cart[i.id], subtotal: Number(i.price) * cart[i.id],
  }));
  const total = cartLines.reduce((s, l) => s + l.subtotal, 0);
  const eta = cartLines.reduce((m, l) => Math.max(m, l.item.prep_minutes), 0);
  const totalCount = cartLines.reduce((s, l) => s + l.qty, 0);

  function add(id: string) { setCart(c => ({ ...c, [id]: (c[id] ?? 0) + 1 })); }
  function sub(id: string) {
    setCart(c => {
      const next = { ...c }; const n = (c[id] ?? 0) - 1;
      if (n <= 0) delete next[id]; else next[id] = n;
      return next;
    });
  }

  async function placeOrder() {
    if (!user || cartLines.length === 0) return;
    setPlacing(true);
    const payload = cartLines.map(l => ({
      id: l.item.id, name: l.item.name, qty: l.qty, price: Number(l.item.price), emoji: l.item.emoji,
    }));
    const { data, error } = await supabase.from("orders").insert({
      user_id: user.id, items: payload, total, estimated_minutes: eta || 10,
    }).select("token_number").single();
    setPlacing(false);
    if (error) return toast.error(error.message);
    toast.success(`Order placed! Token #${data.token_number}`);
    setCart({});
    navigate({ to: "/orders" });
  }

  return (
    <div className="min-h-screen pb-32">
      <AppHeader />
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
          <div>
            <h1 className="text-3xl font-bold">Today's Menu</h1>
            <p className="text-muted-foreground text-sm">Tap to add items, then place your order.</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-4 px-4">
          {categories.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm border transition ${
                cat === c ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow"
                          : "bg-secondary border-border hover:bg-muted"}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map(i => (
            <div key={i.id} className="bg-gradient-card border border-border rounded-2xl p-4 shadow-card flex gap-4">
              <div className="text-5xl select-none">{i.emoji ?? "🍽️"}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold leading-tight">{i.name}</h3>
                    <Badge variant="secondary" className="mt-1 text-[10px]">{i.category}</Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">₹{Number(i.price).toFixed(0)}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                      <Clock className="h-3 w-3" />{i.prep_minutes}m
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{i.description}</p>
                <div className="mt-3">
                  {cart[i.id] ? (
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => sub(i.id)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="font-semibold w-6 text-center">{cart[i.id]}</span>
                      <Button size="icon" className="h-8 w-8 bg-gradient-primary" onClick={() => add(i.id)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => add(i.id)} className="bg-gradient-primary shadow-glow">
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {totalCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-border">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" /> {totalCount} item{totalCount>1?"s":""}
              </div>
              <div className="text-xs text-muted-foreground">~{eta || 10} min · ₹{total.toFixed(0)}</div>
            </div>
            <Button onClick={placeOrder} disabled={placing} className="bg-gradient-primary shadow-glow">
              {placing ? "Placing…" : `Place order · ₹${total.toFixed(0)}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
