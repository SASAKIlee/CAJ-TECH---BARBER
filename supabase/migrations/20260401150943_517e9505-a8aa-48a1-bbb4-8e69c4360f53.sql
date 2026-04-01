
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('dono', 'barbeiro');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create barbeiros table
CREATE TABLE public.barbeiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  comissao_pct NUMERIC NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.barbeiros ENABLE ROW LEVEL SECURITY;

-- Create servicos table
CREATE TABLE public.servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  preco NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

-- Create status enum
CREATE TYPE public.status_agendamento AS ENUM ('Pendente', 'Finalizado', 'Cancelado');

-- Create agendamentos table
CREATE TABLE public.agendamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL,
  horario TEXT NOT NULL,
  nome_cliente TEXT NOT NULL,
  barbeiro_id UUID REFERENCES public.barbeiros(id) NOT NULL,
  servico_id UUID REFERENCES public.servicos(id) NOT NULL,
  status status_agendamento NOT NULL DEFAULT 'Pendente',
  comissao_ganha NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: users see all profiles, edit own
CREATE POLICY "Anyone authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles: viewable by authenticated
CREATE POLICY "Authenticated can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Donos can manage roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'dono'));
CREATE POLICY "Donos can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'dono'));

-- Barbeiros: all authenticated can read, donos can manage
CREATE POLICY "Authenticated can view barbeiros" ON public.barbeiros FOR SELECT TO authenticated USING (true);
CREATE POLICY "Donos can insert barbeiros" ON public.barbeiros FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'dono'));
CREATE POLICY "Donos can update barbeiros" ON public.barbeiros FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'dono'));
CREATE POLICY "Donos can delete barbeiros" ON public.barbeiros FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'dono'));

-- Servicos: all authenticated can read, donos can manage
CREATE POLICY "Authenticated can view servicos" ON public.servicos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Donos can insert servicos" ON public.servicos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'dono'));
CREATE POLICY "Donos can update servicos" ON public.servicos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'dono'));
CREATE POLICY "Donos can delete servicos" ON public.servicos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'dono'));

-- Agendamentos: all authenticated can CRUD
CREATE POLICY "Authenticated can view agendamentos" ON public.agendamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert agendamentos" ON public.agendamentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update agendamentos" ON public.agendamentos FOR UPDATE TO authenticated USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agendamentos_updated_at BEFORE UPDATE ON public.agendamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
