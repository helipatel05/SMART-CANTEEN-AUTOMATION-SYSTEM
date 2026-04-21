
-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('student', 'staff');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + default student role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  desired_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));

  desired_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, desired_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profiles policies
CREATE POLICY "Profiles viewable by self or staff" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Roles policies (read-only to user; staff can read all)
CREATE POLICY "View own roles" ON public.user_roles
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'staff'));

-- Menu items
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  prep_minutes INT NOT NULL DEFAULT 10,
  available BOOLEAN NOT NULL DEFAULT true,
  emoji TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Menu readable by all authenticated" ON public.menu_items
FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage menu" ON public.menu_items
FOR ALL TO authenticated USING (public.has_role(auth.uid(),'staff')) WITH CHECK (public.has_role(auth.uid(),'staff'));

-- Orders
CREATE TYPE public.order_status AS ENUM ('preparing','ready','collected','cancelled');

CREATE SEQUENCE public.token_seq START 1001;

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_number INT NOT NULL DEFAULT nextval('public.token_seq'),
  items JSONB NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  status public.order_status NOT NULL DEFAULT 'preparing',
  estimated_minutes INT NOT NULL DEFAULT 10,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ready_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own orders, staff view all" ON public.orders
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "Users create own orders" ON public.orders
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Staff update orders" ON public.orders
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'staff')) WITH CHECK (public.has_role(auth.uid(),'staff'));

-- Public read for live display board (anonymous-safe: only token+status+timing, no user info)
CREATE OR REPLACE VIEW public.public_board AS
SELECT token_number, status, estimated_minutes, created_at, ready_at
FROM public.orders
WHERE status IN ('preparing','ready')
ORDER BY created_at ASC;
GRANT SELECT ON public.public_board TO anon, authenticated;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
