import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Plus,
  Clock,
  History,
  LogOut,
  Menu,
  KanbanSquare,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

const CHAVE_MENU_RECOLHIDO = "menu-lateral-recolhido";

const lerMenuRecolhido = () => {
  try {
    return localStorage.getItem(CHAVE_MENU_RECOLHIDO) === "1";
  } catch {
    return false;
  }
};

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/nova-requisicao", label: "Nova Requisição", icon: Plus },
  { path: "/fila", label: "Fila de Requisições", icon: Clock },
  { path: "/rastreio", label: "Rastreio", icon: History },
  { path: "/kanban", label: "Kanban", icon: KanbanSquare },
];

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [recolhido, setRecolhido] = useState(lerMenuRecolhido);

  const alternarMenu = () => {
    setRecolhido((atual) => {
      try {
        localStorage.setItem(CHAVE_MENU_RECOLHIDO, atual ? "0" : "1");
      } catch {
        // sem localStorage (aba anônima etc.): só não lembra a escolha
      }
      return !atual;
    });
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: error.message,
      });
    } else {
      navigate("/auth");
    }
  };

  const NavLinks = ({ compacto = false }: { compacto?: boolean }) => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;

        const link = (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg py-2.5 transition-colors",
              compacto ? "justify-center px-0" : "px-3",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!compacto && <span className="font-medium truncate">{item.label}</span>}
          </Link>
        );

        if (!compacto) return link;

        return (
          <Tooltip key={item.path} delayDuration={0}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {/* Menu - Mobile */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-primary mb-6">
                    Requisições
                  </h2>
                  <nav className="space-y-1">
                    <NavLinks />
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            <img
              src="/tropical_vetor.png"
              alt="Logo"
              className="h-14 w-auto shrink-0"
            />
            <h1 className="text-lg sm:text-xl font-bold text-primary truncate">
              Sistema de Requisições
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-2 shrink-0"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      {/* Menu - Desktop: preso na borda esquerda, recolhível */}
      <aside
        className={cn(
          "hidden lg:flex fixed left-0 top-16 bottom-0 z-40 flex-col border-r border-border bg-card transition-[width] duration-200",
          recolhido ? "w-16" : "w-60"
        )}
      >
        <nav className={cn("flex-1 space-y-1 overflow-y-auto py-4", recolhido ? "px-2" : "px-3")}>
          <NavLinks compacto={recolhido} />
        </nav>
        <div className={cn("border-t border-border p-2", !recolhido && "px-3")}>
          <Button
            variant="ghost"
            size="sm"
            onClick={alternarMenu}
            className={cn("w-full gap-3 text-muted-foreground", recolhido ? "justify-center px-0" : "justify-start px-3")}
            title={recolhido ? "Expandir menu" : "Recolher menu"}
          >
            {recolhido ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5" />
                <span>Recolher menu</span>
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          "min-w-0 p-4 lg:p-6 transition-[padding] duration-200",
          recolhido ? "lg:pl-[5.5rem]" : "lg:pl-[16.5rem]"
        )}
      >
        {children}
      </main>
    </div>
  );
};
