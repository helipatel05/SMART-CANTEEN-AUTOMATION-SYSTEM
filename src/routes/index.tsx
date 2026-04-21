import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { Clock, Bell, Smartphone, ChefHat } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user) return;
    if (role === "staff") navigate({ to: "/staff" });
    else if (role === "student") navigate({ to: "/menu" });
  }, [user, role, loading, navigate]);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="container mx-auto px-4 pt-12 pb-20">
        <section className="text-center max-w-3xl mx-auto">
          <span className="inline-block rounded-full glass px-4 py-1.5 text-xs font-medium tracking-wide mb-6">
            🎓 Smart College Canteen
          </span>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
            Order. Track. <span className="text-gradient">Eat.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Skip the queue. Place orders from your phone, get a digital token, and we'll
            ping you the moment your food is ready.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/login">
              <Button size="lg" className="bg-gradient-primary shadow-glow w-full sm:w-auto">
                Sign in with college email
              </Button>
            </Link>
            <Link to="/display">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                View live board
              </Button>
            </Link>
          </div>
        </section>

        <section className="mt-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: ChefHat, title: "10+ items", desc: "Dosa, thalis, chai & more" },
            { icon: Clock, title: "Live ETA", desc: "Real prep-time estimates" },
            { icon: Bell, title: "Instant alerts", desc: "Pinged when ready" },
            { icon: Smartphone, title: "Mobile first", desc: "Works on every phone" },
          ].map((f) => (
            <div key={f.title} className="bg-gradient-card rounded-2xl p-5 border border-border shadow-card">
              <f.icon className="h-6 w-6 text-accent mb-3" />
              <div className="font-semibold">{f.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{f.desc}</div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
