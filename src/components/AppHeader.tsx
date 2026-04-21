import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, UtensilsCrossed } from "lucide-react";

export function AppHeader() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 glass">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <UtensilsCrossed className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="text-gradient">Midnight Eats</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              {role === "staff" ? (
                <Link to="/staff" className="px-3 py-1.5 rounded-lg hover:bg-secondary">Dashboard</Link>
              ) : (
                <>
                  <Link to="/menu" className="px-3 py-1.5 rounded-lg hover:bg-secondary">Menu</Link>
                  <Link to="/orders" className="px-3 py-1.5 rounded-lg hover:bg-secondary">My Orders</Link>
                </>
              )}
              <Link to="/display" className="hidden sm:block px-3 py-1.5 rounded-lg hover:bg-secondary">Live Board</Link>
              <Button size="sm" variant="ghost" onClick={async () => { await signOut(); navigate({ to: "/login" }); }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/display" className="px-3 py-1.5 rounded-lg hover:bg-secondary">Live Board</Link>
              <Link to="/login"><Button size="sm" variant="default" className="bg-gradient-primary">Sign in</Button></Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
