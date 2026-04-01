
-- Drop the overly permissive policies
DROP POLICY "Authenticated can insert agendamentos" ON public.agendamentos;
DROP POLICY "Authenticated can update agendamentos" ON public.agendamentos;

-- Re-create with role-based checks
CREATE POLICY "Authenticated can insert agendamentos" ON public.agendamentos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'dono') OR public.has_role(auth.uid(), 'barbeiro')
  );

CREATE POLICY "Authenticated can update agendamentos" ON public.agendamentos
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'dono') OR public.has_role(auth.uid(), 'barbeiro')
  );
