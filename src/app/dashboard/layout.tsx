
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
  Building,
  History,
} from 'lucide-react';
import { useUser, UserProvider } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { UserNav } from '@/components/user-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { decryptObjectValues } from '@/lib/crypto';


type User = {
  uid: string;
  name: string;
  email: string | null;
  role: number;
  schoolId: string | null;
  schoolName: string | null;
};

const navLinksConfig = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, minRole: 1 },
    { href: '/dashboard/students', label: 'Alunos', icon: Users, minRole: 1 },
    { href: '/dashboard/pass-requests', label: 'Solicitar Passes', icon: Bus, minRole: 2 },
    { href: '/dashboard/schools', label: 'Escolas', icon: SchoolIcon, minRole: 3 },
    { href: '/dashboard/city-halls', label: 'Prefeituras', icon: Building, minRole: 3 },
    { href: '/dashboard/employees', label: 'Funcionários', icon: UserPlus, minRole: 3 },
    { href: '/dashboard/transport', label: 'Solicitações', icon: Bus, minRole: 3 },
    { href: '/dashboard/orders', label: 'Pedidos', icon: FileText, minRole: 3 },
];

function MainNav({ className }: React.HTMLAttributes<HTMLElement>) {
  const { user } = useUser();
  const pathname = usePathname();

  if (!user) return null;
  
  const navLinks = navLinksConfig
   .filter(link => user.role >= link.minRole)
   .filter((link, index, self) => index === self.findIndex((l) => l.href === link.href)); // Remove duplicates


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
  const pathname = usePathname();
  const { user, loading } = useUser();
  
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      const linkConfig = navLinksConfig.find(link => link.href === pathname);
      if (!linkConfig) return;

      const newActivity = {
        href: pathname,
        label: linkConfig.label,
        date: new Date().toISOString(),
      };
      
      const storedActivities = JSON.parse(localStorage.getItem('recentActivities') || '[]');
      
      // Avoid adding duplicates
      const filteredActivities = storedActivities.filter((activity: any) => activity.href !== newActivity.href);
      
      const updatedActivities = [newActivity, ...filteredActivities].slice(0, 5);

      localStorage.setItem('recentActivities', JSON.stringify(updatedActivities));
    }
  }, [pathname, user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!user) {
    // This should ideally not be reached if the provider handles redirection,
    // but serves as a fallback.
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Verificando autenticação...</p>
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const encryptedData = userDoc.data();
              const userData = decryptObjectValues(encryptedData) as any;
              
              if (userData) {
                let schoolName = null;
                if(userData.schoolId) {
                    const schoolDocRef = doc(db, 'schools', userData.schoolId);
                    const schoolDoc = await getDoc(schoolDocRef);
                    if(schoolDoc.exists()){
                        const schoolData = decryptObjectValues(schoolDoc.data());
                        schoolName = schoolData?.name || null;
                    }
                }

                const userProfile = {
                  uid: firebaseUser.uid,
                  name: userData.name,
                  email: firebaseUser.email,
                  role: userData.role,
                  schoolId: userData.schoolId || null,
                  schoolName: schoolName,
                };
                setUser(userProfile);

              } else {
                 // Decryption failed or data malformed
                 throw new Error("Failed to decrypt user data.");
              }
            } else {
               // This case might happen if user exists in Auth but not in Firestore
               // Instead of throwing an error, we sign out and redirect.
               console.error("User profile not found in Firestore. Signing out.");
               await auth.signOut();
               setUser(null);
               router.push('/');
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            await auth.signOut(); // Sign out to prevent inconsistent state
            setUser(null);
            router.push('/');
        }
      } else {
        setUser(null);
        router.push('/');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);


  const handleLogout = async () => {
    try {
        await auth.signOut();
        router.push('/');
    } catch (error) {
        console.error("Logout failed:", error);
    }
  };
  
  return (
    <UserProvider user={user} logout={handleLogout} loading={loading}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </UserProvider>
  );
}
