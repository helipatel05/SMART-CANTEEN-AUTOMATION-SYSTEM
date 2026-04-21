
DROP VIEW IF EXISTS public.public_board;
CREATE VIEW public.public_board WITH (security_invoker=on) AS
SELECT token_number, status, estimated_minutes, created_at, ready_at
FROM public.orders
WHERE status IN ('preparing','ready');

-- Allow anonymous read of just preparing/ready rows for the display screen
CREATE POLICY "Public can view live board rows" ON public.orders
FOR SELECT TO anon USING (status IN ('preparing','ready'));

GRANT SELECT ON public.public_board TO anon, authenticated;
