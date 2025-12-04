import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Trash2, Send, Loader2 } from "lucide-react";
import { produtos, produtoToFinalidade } from "@/data/produtosFinalidade";

interface Item {
  produto: string;
  unidade: string;
  quantidade: string;
  finalidade: string;
}

// URL do webhook N8N - pode ser configurada via variável de ambiente
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || "https://n8nevo-n8n.3fmybz.easypanel.host/webhook/8ca0b57f-4a07-41e9-8f90-7839821235ed";

// Lista base de locais sugeridos; o usuário pode digitar novos locais livremente
const locaisBase = ["Vila Diamantina", "Deck Condominio", "Galpoes", "Outros"];
const destinos = ["Setor de Compras"];
const unidades = ["Peça", "Caixa", "Saco", "Pacote", "Rolo", "m³", "m²", "Metro", "Barra", "Litro", "Galão", "Balde", "Lata", "Kg", "Carrada", "Serviço", "Pares"];

const formatFinalidade = (valor: string): string => {
  if (!valor) return "";
  const lower = valor.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

// Detectar se está no Chrome Android
const isChromeAndroid = () => {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /android/.test(ua) && /chrome/.test(ua) && !/firefox/.test(ua);
};

// Componente separado para o Input de busca - otimizado para Chrome Android
// No Chrome Android, o teclado virtual causa mudanças no visualViewport que podem
// fazer o componente perder foco. Esta solução monitora e restaura o foco agressivamente.
const ProdutoSearchInput = React.memo(({ 
  value, 
  onChange 
}: { 
  value: string; 
  onChange: (value: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const wasFocusedRef = useRef(false);
  const restoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isChromeAndroidRef = useRef(isChromeAndroid());

  // Estratégia agressiva para Chrome Android: monitorar múltiplos eventos
  useEffect(() => {
    if (!isChromeAndroidRef.current) return;

    const restoreFocus = () => {
      if (wasFocusedRef.current && inputRef.current) {
        if (restoreTimeoutRef.current) {
          clearTimeout(restoreTimeoutRef.current);
        }
        
        // Usar requestAnimationFrame + setTimeout para garantir execução após re-render
        requestAnimationFrame(() => {
          restoreTimeoutRef.current = setTimeout(() => {
            if (inputRef.current && wasFocusedRef.current) {
              const activeElement = document.activeElement;
              if (activeElement !== inputRef.current) {
                // Forçar foco e scroll para garantir visibilidade
                inputRef.current.focus({ preventScroll: false });
                // Pequeno scroll para garantir que o input está visível
                inputRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }
            }
          }, 100); // Delay maior para Chrome Android
        });
      }
    };

    // Monitorar visualViewport (principal causa no Chrome Android)
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", restoreFocus);
      window.visualViewport.addEventListener("scroll", restoreFocus);
    }

    // Monitorar window resize como fallback
    window.addEventListener("resize", restoreFocus, { passive: true });

    // Monitorar mudanças de foco no documento
    const handleFocusChange = () => {
      if (wasFocusedRef.current && document.activeElement !== inputRef.current) {
        restoreFocus();
      }
    };
    
    document.addEventListener("focusin", handleFocusChange);
    document.addEventListener("focusout", handleFocusChange);

    // Monitorar eventos de scroll que podem causar perda de foco
    const handleScroll = () => {
      if (wasFocusedRef.current && document.activeElement !== inputRef.current) {
        restoreFocus();
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", restoreFocus);
        window.visualViewport.removeEventListener("scroll", restoreFocus);
      }
      window.removeEventListener("resize", restoreFocus);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("focusin", handleFocusChange);
      document.removeEventListener("focusout", handleFocusChange);
      if (restoreTimeoutRef.current) {
        clearTimeout(restoreTimeoutRef.current);
      }
    };
  }, []);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    wasFocusedRef.current = true;
    // No Chrome Android, garantir que o foco está realmente ativo
    if (isChromeAndroidRef.current) {
      requestAnimationFrame(() => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus();
        }
      });
    }
  }, []);

  const handleBlur = useCallback(() => {
    // Delay maior para Chrome Android - o blur pode ser temporário
    const delay = isChromeAndroidRef.current ? 300 : 200;
    const timeoutId = setTimeout(() => {
      if (document.activeElement !== inputRef.current) {
        wasFocusedRef.current = false;
      } else {
        // Se ainda está focado, manter o estado
        wasFocusedRef.current = true;
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLInputElement>) => {
    e.stopPropagation();
    // No Chrome Android, garantir foco imediatamente ao tocar
    if (isChromeAndroidRef.current) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, []);

  return (
    <Input
      ref={inputRef}
      placeholder="Digite para buscar..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onTouchStart={handleTouchStart}
      className="h-8 text-sm"
      autoComplete="off"
      inputMode="search"
      // Adicionar atributos específicos para Chrome Android
      {...(isChromeAndroidRef.current && {
        "data-chrome-android": "true",
        style: { WebkitUserSelect: "text" as const }
      })}
    />
  );
}, (prevProps, nextProps) => {
  return prevProps.value === nextProps.value;
});

ProdutoSearchInput.displayName = "ProdutoSearchInput";

const NovaRequisicao = () => {
  const [solicitante, setSolicitante] = useState("");
  const [localOrigem, setLocalOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [observacao, setObservacao] = useState("");
  const [itens, setItens] = useState<Item[]>([
    { produto: "", unidade: "", quantidade: "", finalidade: "" },
  ]);
  const [produtoSearch, setProdutoSearch] = useState("");
  const [locaisSugeridos, setLocaisSugeridos] = useState<string[]>(locaisBase);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isChromeAndroidRef = useRef(isChromeAndroid());

  // Memoizar produtos filtrados para evitar re-renderizações desnecessárias
  const produtosFiltrados = useMemo(() => {
    if (!produtoSearch.trim()) return produtos;
    const searchLower = produtoSearch.toLowerCase();
    return produtos.filter((prod) =>
      prod.toLowerCase().includes(searchLower)
    );
  }, [produtoSearch]);

  // Preencher solicitante com o email do usuário ao carregar
  // e carregar sugestões de locais de origem existentes nas requisições
  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setSolicitante(user.email);
      }

      const { data: requisicoes } = await supabase
        .from("requisicoes")
        .select("local_origem");

      const locaisFromDb =
        requisicoes?.map((r: any) => r.local_origem as string).filter(Boolean) ||
        [];

      const uniqueLocais = Array.from(
        new Set<string>([...locaisBase, ...locaisFromDb])
      );

      setLocaisSugeridos(uniqueLocais);
    };
    fetchInitialData();
  }, []);

  const addItem = () => {
    setItens([...itens, { produto: "", unidade: "", quantidade: "", finalidade: "" }]);
  };

  const removeItem = (index: number) => {
    if (itens.length > 1) {
      setItens(itens.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof Item, value: string) => {
    const newItens = [...itens];
    newItens[index][field] = value;
    
    // Auto-preencher finalidade quando produto é selecionado
    if (field === "produto" && value) {
      const finalidadeBruta = produtoToFinalidade[value] || "";
      newItens[index].finalidade = formatFinalidade(finalidadeBruta);
      // Limpar busca quando produto é selecionado
      setProdutoSearch("");
    }
    
    setItens(newItens);
  };

  const handleLocalOrigemChange = (value: string) => {
    if (value === "__novo__") {
      const novoLocal = window.prompt("Digite o novo local de origem:");

      if (novoLocal && novoLocal.trim()) {
        const novoTrimado = novoLocal.trim();

        setLocaisSugeridos((prev) =>
          prev.includes(novoTrimado) ? prev : [...prev, novoTrimado]
        );
        setLocalOrigem(novoTrimado);
      }

      return;
    }

    if (value === "__remover__") {
      if (!localOrigem) return;

      setLocaisSugeridos((prev) =>
        prev.filter((local) => local !== localOrigem)
      );
      setLocalOrigem("");
      return;
    }

    setLocalOrigem(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!solicitante || !localOrigem || !destino) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
      });
      return;
    }

    const itemsValidos = itens.filter(
      (item) => item.produto && item.unidade && item.quantidade
    );

    if (itemsValidos.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Adicione pelo menos um item válido",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Criar requisição
      const { data: requisicao, error: reqError } = await supabase
        .from("requisicoes")
        .insert({
          solicitante,
          local_origem: localOrigem,
          destino,
          observacao,
          status: "pendente",
          user_id: user.id,
        })
        .select()
        .single();

      if (reqError) throw reqError;

      // Inserir itens
      const { error: itensError } = await supabase
        .from("itens_requisicao")
        .insert(
          itemsValidos.map((item) => ({
            requisicao_id: requisicao.id,
            produto: item.produto,
            unidade: item.unidade,
            quantidade: parseFloat(item.quantidade),
          }))
        );

      if (itensError) throw itensError;

      // Notificar via N8N webhook
      try {
        const webhookPayload = {
          requisicao_id: requisicao.id,
          solicitante,
          local_origem: localOrigem,
          destino,
          observacao,
          status: "pendente",
          data_criacao: new Date().toISOString(),
          itens: itemsValidos.map((item) => ({
            produto: item.produto,
            unidade: item.unidade,
            quantidade: item.quantidade,
          })),
        };

        console.log("Enviando dados para N8N webhook:", webhookPayload);

        const response = await fetch(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(webhookPayload),
        });

        if (!response.ok) {
          throw new Error(`Webhook retornou status ${response.status}`);
        }

        console.log("Notificação enviada com sucesso para N8N");
      } catch (webhookError) {
        console.error("Erro ao enviar webhook para o n8n:", webhookError);
        // Não bloqueia o fluxo principal se o webhook falhar
      }

      toast({
        title: "Requisição enviada!",
        description: "Sua requisição foi criada com sucesso.",
      });

      navigate("/fila");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar requisição",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Nova Requisição</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Solicitante *
                </label>
                <Input
                  value={solicitante}
                  onChange={(e) => setSolicitante(e.target.value)}
                  placeholder="Nome do solicitante"
                  className="rounded-lg"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Local de Origem *
                  </label>
                  <Select
                    value={localOrigem}
                    onValueChange={handleLocalOrigemChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione ou cadastre um local..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {locaisSugeridos.map((local) => (
                        <SelectItem key={local} value={local}>
                          {local}
                        </SelectItem>
                      ))}
                      <SelectItem value="__novo__">
                        + Adicionar novo local...
                      </SelectItem>
                      {localOrigem && (
                        <SelectItem value="__remover__">
                          Remover local selecionado
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Use &quot;+ Adicionar novo local...&quot; para incluir um novo
                    local de origem na lista.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Destino *</label>
                  <Select value={destino} onValueChange={setDestino}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {destinos.map((dest) => (
                        <SelectItem key={dest} value={dest}>
                          {dest}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Observação</label>
                <Textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Informações adicionais..."
                  className="min-h-24"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Itens</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {itens.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex flex-wrap gap-3 items-end"
                    >
                      <div className="flex-1 min-w-[200px] space-y-2">
                        <label className="text-sm">Produto</label>
                        <Select
                          value={item.produto}
                          onValueChange={(value) =>
                            updateItem(index, "produto", value)
                          }
                          onOpenChange={(open) => {
                            // Limpar busca quando o Select fecha
                            if (!open) {
                              setProdutoSearch("");
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent 
                            className="bg-popover z-50 max-h-[300px]"
                            position="popper"
                            onEscapeKeyDown={(e) => {
                              // Prevenir fechamento quando o input está focado
                              const activeElement = document.activeElement;
                              if (activeElement?.tagName === "INPUT") {
                                e.preventDefault();
                                return;
                              }
                              // No Chrome Android, ser mais permissivo - não fechar se há busca ativa
                              if (isChromeAndroidRef.current && produtoSearch.trim()) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <div className="p-2 sticky top-0 z-10 bg-popover border-b">
                              <ProdutoSearchInput
                                value={produtoSearch}
                                onChange={setProdutoSearch}
                              />
                            </div>
                            {produtosFiltrados.map((prod) => (
                              <SelectItem key={prod} value={prod}>
                                {prod}
                              </SelectItem>
                            ))}
                            {produtosFiltrados.length === 0 && (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                Nenhum produto encontrado
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-32 space-y-2">
                        <label className="text-sm">Finalidade</label>
                        <Input
                          value={item.finalidade}
                          readOnly
                          disabled
                          placeholder="Automático"
                          className="bg-muted"
                        />
                      </div>
                      <div className="w-28 space-y-2">
                        <label className="text-sm">Unidade</label>
                        <Select
                          value={item.unidade}
                          onValueChange={(value) =>
                            updateItem(index, "unidade", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="UN" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            {unidades.map((un) => (
                              <SelectItem key={un} value={un}>
                                {un}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24 space-y-2">
                        <label className="text-sm">Quantidade</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.quantidade}
                          onChange={(e) =>
                            updateItem(index, "quantidade", e.target.value)
                          }
                          placeholder="0"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => removeItem(index)}
                        disabled={itens.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gap-2 shadow-lg"
                size="lg"
                disabled={loading}
              >
                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                <Send className="h-5 w-5" />
                Enviar Requisição
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </Layout>
  );
};

export default NovaRequisicao;
