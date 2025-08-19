'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Bus,
  LayoutDashboard,
  Users,
  School as SchoolIcon,
  UserPlus,
  FileText,
  PanelLeft,
  Search,
} from 'lucide-react';
import { useUser, UserProvider } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { UserNav } from '@/components/user-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

type User = {
  name: string;
  email: string;
  role: number;
  schoolId: string | null;
};

function MainNav({ className }: React.HTMLAttributes<HTMLElement>) {
  const { user } = useUser();
  const pathname = usePathname();

  if (!user) return null;

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, minRole: 1 },
    { href: '/dashboard/students', label: 'Alunos', icon: Users, minRole: 1 },
    { href: '/dashboard/schools', label: 'Escolas', icon: SchoolIcon, minRole: 3 },
    { href: '/dashboard/employees', label: 'Funcionários', icon: UserPlus, minRole: 3 },
    { href: '/dashboard/transport', label: 'Solicitações', icon: Bus, minRole: 3 },
    { href: '/dashboard/orders', label: 'Pedidos', icon: FileText, minRole: 3 },
  ].filter(link => user.role >= link.minRole);

  return (
    <nav className={cn('flex flex-col gap-2', className)}>
      {navLinks.map(({ href, label, icon: Icon }) => (
        <Button
          key={href}
          asChild
          variant={pathname === href ? 'default' : 'ghost'}
          className="w-full justify-start gap-2"
        >
          <Link href={href}>
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}


function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useUser();

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Redirecionando para o login...</p>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
              <Bus className="h-6 w-6" />
              <span className="">SchoolRoute</span>
            </Link>
          </div>
          <div className="flex-1">
            <MainNav className="grid items-start px-2 text-sm font-medium lg:px-4" />
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <Link href="#" className="flex items-center gap-2 text-lg font-semibold text-primary mb-4">
                  <Bus className="h-6 w-6" />
                  <span>SchoolRoute</span>
                </Link>
                <MainNav />
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
             {/* Can add a global search here if needed */}
          </div>
          <ThemeToggle />
          <UserNav />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('schoolRouteUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      router.push('/');
    }
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('schoolRouteUser');
    setUser(null);
    router.push('/');
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Carregando...</div>;
  }
  
  return (
    <UserProvider user={user} logout={handleLogout}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </UserProvider>
  );
}
