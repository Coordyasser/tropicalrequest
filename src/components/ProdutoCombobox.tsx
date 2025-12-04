import React, { useState, useRef, useCallback, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface ProdutoComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  produtos: string[];
}

export const ProdutoCombobox = React.memo(({ 
  value, 
  onValueChange, 
  produtos 
}: ProdutoComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
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
    onValueChange(selectedValue);
    setSearch("");
    setOpen(false);
  }, [onValueChange]);

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
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

ProdutoCombobox.displayName = "ProdutoCombobox";
