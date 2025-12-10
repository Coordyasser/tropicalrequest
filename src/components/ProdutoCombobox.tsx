import React, { useState, useRef, useCallback, useEffect } from "react";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PinDialog } from "@/components/PinDialog";

interface ProdutoComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  produtos: string[];
  onAddProduto?: (nome: string, finalidade: string) => Promise<boolean>;
  onRemoveProduto?: (nome: string) => Promise<boolean>;
}

const FINALIDADES = [
  "Geral",
  "Alvenaria",
  "Bancada",
  "Calcamento",
  "Canteiro",
  "Contrapiso",
  "Drywall",
  "Eletrica",
  "Epi",
  "Equip",
  "Esquadrias",
  "Estrutura",
  "Fachada",
  "Forro",
  "Gas",
  "Hidraulica",
  "Ic",
  "Impermeabilizacao",
  "Instalações",
  "Lazer",
  "Limpeza",
  "Manutencao",
  "Metalurgica",
  "Modificacao",
  "Pavimentacao",
  "Pintura",
  "Porta",
  "Reboco",
  "Revestimento",
  "Sanitario",
  "Split",
  "Stand",
];

export const ProdutoCombobox = React.memo(({ 
  value, 
  onValueChange, 
  produtos,
  onAddProduto,
  onRemoveProduto,
}: ProdutoComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newProdutoNome, setNewProdutoNome] = useState("");
  const [newProdutoFinalidade, setNewProdutoFinalidade] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<"add" | "remove" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAndroidRef = useRef(
    typeof window !== "undefined" && /android/i.test(window.navigator.userAgent)
  );

  const filteredProdutos = React.useMemo(() => {
    if (!search.trim()) return produtos;
    const searchLower = search.toLowerCase();
    return produtos.filter((prod) =>
      prod.toLowerCase().includes(searchLower)
    );
  }, [search, produtos]);

  // Restaurar foco no input quando o popover abre
  useEffect(() => {
    if (open && inputRef.current) {
      // Delay para garantir que o popover está renderizado
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [open]);

  // Handler para prevenir fechamento indesejado no Android
  const handleInteractOutside = useCallback((e: Event) => {
    // No Android, prevenir fechamento se o target é o input de busca
    if (isAndroidRef.current) {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || containerRef.current?.contains(target)) {
        e.preventDefault();
      }
    }
  }, []);

  const handleSelect = useCallback((selectedValue: string) => {
    if (selectedValue === "__novo__") {
      setPendingAction("add");
      setShowPinDialog(true);
      setOpen(false);
      return;
    }
    if (selectedValue === "__remover__") {
      if (value && onRemoveProduto) {
        setPendingAction("remove");
        setShowPinDialog(true);
      }
      setOpen(false);
      return;
    }
    onValueChange(selectedValue);
    setSearch("");
    setOpen(false);
  }, [onValueChange, value, onRemoveProduto]);

  const handlePinSuccess = useCallback(() => {
    if (pendingAction === "add") {
      setShowAddDialog(true);
    } else if (pendingAction === "remove" && value && onRemoveProduto) {
      onRemoveProduto(value).then((success) => {
        if (success) {
          onValueChange("");
        }
      });
    }
    setPendingAction(null);
  }, [pendingAction, value, onRemoveProduto, onValueChange]);

  const handleAddProduto = async () => {
    if (!newProdutoNome.trim() || !newProdutoFinalidade || !onAddProduto) return;
    
    setIsAdding(true);
    const success = await onAddProduto(newProdutoNome.trim(), newProdutoFinalidade);
    setIsAdding(false);
    
    if (success) {
      onValueChange(newProdutoNome.trim());
      setNewProdutoNome("");
      setNewProdutoFinalidade("");
      setShowAddDialog(false);
    }
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  // Prevenir eventos que causam fechamento no Android
  const handleInputEvents = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="text-muted-foreground">Selecione...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover z-50"
        align="start"
        side="bottom"
        sideOffset={4}
        onInteractOutside={handleInteractOutside}
        onPointerDownOutside={handleInteractOutside}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          // Focar no input após abrir
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
      >
        <div ref={containerRef} className="flex flex-col">
          <div className="p-2 border-b">
            <Input
              ref={inputRef}
              placeholder="Digite para buscar..."
              value={search}
              onChange={handleInputChange}
              onClick={handleInputEvents}
              onMouseDown={handleInputEvents}
              onTouchStart={handleInputEvents}
              onPointerDown={handleInputEvents}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              className="h-9"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              inputMode="search"
            />
          </div>
          <div className="max-h-[250px] overflow-y-auto">
            {filteredProdutos.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nenhum produto encontrado
              </div>
            ) : (
              filteredProdutos.map((produto) => (
                <button
                  key={produto}
                  type="button"
                  onClick={() => handleSelect(produto)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    value === produto && "bg-accent"
                  )}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {value === produto && <Check className="h-4 w-4" />}
                  </span>
                  {produto}
                </button>
              ))
            )}
            {onAddProduto && (
              <button
                type="button"
                onClick={() => handleSelect("__novo__")}
                className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-primary font-medium border-t"
              >
                <Plus className="absolute left-2 h-4 w-4" />
                Adicionar novo produto...
              </button>
            )}
            {value && onRemoveProduto && (
              <button
                type="button"
                onClick={() => handleSelect("__remover__")}
                className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none hover:bg-destructive hover:text-destructive-foreground text-destructive"
              >
                <Trash2 className="absolute left-2 h-4 w-4" />
                Remover produto selecionado
              </button>
            )}
          </div>
        </div>
      </PopoverContent>

      {/* Dialog para adicionar novo produto */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Produto *</label>
              <Input
                value={newProdutoNome}
                onChange={(e) => setNewProdutoNome(e.target.value)}
                placeholder="Digite o nome do produto"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Finalidade *</label>
              <Select value={newProdutoFinalidade} onValueChange={setNewProdutoFinalidade}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a finalidade" />
                </SelectTrigger>
                <SelectContent>
                  {FINALIDADES.map((fin) => (
                    <SelectItem key={fin} value={fin}>
                      {fin}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddProduto} 
              disabled={!newProdutoNome.trim() || !newProdutoFinalidade || isAdding}
            >
              {isAdding ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN Dialog para autenticação */}
      <PinDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        onSuccess={handlePinSuccess}
        title="PIN Necessário"
        description="Digite o PIN para adicionar ou remover produtos"
      />
    </Popover>
  );
});

ProdutoCombobox.displayName = "ProdutoCombobox";
