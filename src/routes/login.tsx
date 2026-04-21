import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { UtensilsCrossed } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  // signin
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // signup
  const [suEmail, setSuEmail] = useState("");
  const [suPass, setSuPass] = useState("");
  const [suName, setSuName] = useState("");
  const [suRole, setSuRole] = useState<"student" | "staff">("student");

  useEffect(() => {
    if (!loading && user && role) {
      navigate({ to: role === "staff" ? "/staff" : "/menu" });
    }
  }, [user, role, loading, navigate]);

  const COLLEGE_DOMAIN = "@karnavatiuniversity.edu.in";
  const KU_ID_REGEX = /^ku\d{3,6}u\d{3,6}@karnavatiuniversity\.edu\.in$/i;

  function isValidCollegeEmail(em: string) {
    return KU_ID_REGEX.test(em.trim().toLowerCase());
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidCollegeEmail(email)) {
      return toast.error(`Use your college email ending with ${COLLEGE_DOMAIN}`);
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidCollegeEmail(suEmail)) {
      return toast.error(`Signup allowed only with ${COLLEGE_DOMAIN} email`);
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: suEmail.trim().toLowerCase(),
      password: suPass,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: suName, role: suRole },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created! You're signed in.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 font-bold text-2xl mb-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <UtensilsCrossed className="h-6 w-6 text-primary-foreground" />
          </span>
          <span className="text-gradient">Midnight Eats</span>
        </Link>

        <div className="bg-gradient-card border border-border rounded-2xl p-6 shadow-card">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="email">College email (KU ID)</Label>
                  <Input id="email" type="email" required placeholder="ku2507u068@karnavatiuniversity.edu.in"
                    value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required minLength={6}
                    value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-gradient-primary shadow-glow">
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="suname">Full name</Label>
                  <Input id="suname" required value={suName} onChange={(e) => setSuName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="suemail">College email (KU ID)</Label>
                  <Input id="suemail" type="email" required placeholder="ku2507u068@karnavatiuniversity.edu.in"
                    value={suEmail} onChange={(e) => setSuEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="supass">Password</Label>
                  <Input id="supass" type="password" required minLength={6}
                    value={suPass} onChange={(e) => setSuPass(e.target.value)} />
                </div>
                <div>
                  <Label>I am a</Label>
                  <RadioGroup value={suRole} onValueChange={(v) => setSuRole(v as "student" | "staff")}
                    className="grid grid-cols-2 gap-2 mt-2">
                    <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer ${suRole==="student"?"border-primary bg-secondary":""}`}>
                      <RadioGroupItem value="student" /> Student
                    </label>
                    <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer ${suRole==="staff"?"border-primary bg-secondary":""}`}>
                      <RadioGroupItem value="staff" /> Canteen staff
                    </label>
                  </RadioGroup>
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-gradient-primary shadow-glow">
                  {busy ? "Creating…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">
          For demo: any email/password works. Pick "Canteen staff" to access the dashboard.
        </p>
      </div>
    </div>
  );
}
