import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { LinkDrive } from "@/components/LinkDrive";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetchAll";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Loader2, MoreHorizontal, RefreshCw, User, MapPin, CalendarDays, Search, X } from "lucide-react";

type Fase = "novas" | "aguardando_liberacao" | "em_cotacao" | "finalizadas" | "arquivadas";

const COLUNAS: { fase: Fase; titulo: string }[] = [
  { fase: "novas", titulo: "Novas Requisições (Caixa de Entrada)" },
  { fase: "aguardando_liberacao", titulo: "Aguardando Liberação (Diretoria)" },
  { fase: "em_cotacao", titulo: "Em Cotação" },
  { fase: "finalizadas", titulo: "Finalizadas" },
  { fase: "arquivadas", titulo: "Arquivadas" },
];

// Renderizar milhares de cartões de uma vez trava o navegador (Arquivadas
// acumula todo o histórico). Cada coluna mostra os mais recentes em blocos.
const CARTOES_POR_BLOCO = 50;

const COLUNAS_SELECT =
  "id, solicitante, destino, local_origem, status, observacao, created_at, fase, fase_atualizada_em, drive_url";

interface Requisicao {
  id: number;
  solicitante: string;
  destino: string;
  local_origem: string;
  status: string;
  observacao: string | null;
  created_at: string;
  fase: string;
  fase_atualizada_em: string | null;
  drive_url: string | null;
}

interface Item {
  produto: string;
  unidade: string;
  quantidade: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "pendente":
      return "bg-status-pendente text-white";
    case "aprovada":
      return "bg-status-aprovada text-white";
    case "gerada":
      return "bg-status-gerada text-white";
    default:
      return "bg-muted";
  }
};

const Kanban = () => {
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [loading, setLoading] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overFase, setOverFase] = useState<Fase | null>(null);
  const [limites, setLimites] = useState<Partial<Record<Fase, number>>>({});
  const [busca, setBusca] = useState("");
  const [selectedReq, setSelectedReq] = useState<Requisicao | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const { toast } = useToast();

  const fetchRequisicoes = async () => {
    setLoading(true);
    try {
      const data = await fetchAll<Requisicao>((from, to) =>
        supabase
          .from("requisicoes")
          .select(COLUNAS_SELECT)
          .order("created_at", { ascending: false })
          .range(from, to)
      );
      setRequisicoes(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar quadro",
        description: (error as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisicoes();

    const aplicarAlteracao = (req: Requisicao) => {
      setRequisicoes((prev) => {
        if (prev.some((r) => r.id === req.id)) {
          return prev.map((r) => (r.id === req.id ? { ...r, ...req } : r));
        }
        return [req, ...prev].sort((a, b) => b.created_at.localeCompare(a.created_at));
      });
      setSelectedReq((prev) => (prev?.id === req.id ? { ...prev, ...req } : prev));
    };

    // Todos usam a mesma conta: qualquer mudança feita em outra máquina
    // (mover cartão, nova requisição, aprovação, exclusão) chega por aqui.
    let jaConectou = false;
    const canal = supabase
      .channel("kanban-requisicoes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "requisicoes" }, (payload) =>
        aplicarAlteracao(payload.new as Requisicao)
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "requisicoes" }, (payload) =>
        aplicarAlteracao(payload.new as Requisicao)
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "requisicoes" }, (payload) => {
        const id = (payload.old as { id?: number }).id;
        if (id === undefined) return;
        setRequisicoes((prev) => prev.filter((r) => r.id !== id));
        setSelectedReq((prev) => (prev?.id === id ? null : prev));
      })
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        // Reconexão (queda de rede, notebook que hibernou): recarrega para
        // pegar o que mudou enquanto o canal estava fora.
        if (jaConectou) fetchRequisicoes();
        jaConectou = true;
      });

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  const moverRequisicao = async (id: number, novaFase: Fase) => {
    const anterior = requisicoes.find((r) => r.id === id);
    if (!anterior || anterior.fase === novaFase) return;

    const agora = new Date().toISOString();
    // Atualização otimista: o cartão muda de coluna na hora
    setRequisicoes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, fase: novaFase, fase_atualizada_em: agora } : r))
    );
    setSelectedReq((prev) => (prev?.id === id ? { ...prev, fase: novaFase } : prev));

    const { error } = await supabase
      .from("requisicoes")
      .update({ fase: novaFase, fase_atualizada_em: agora })
      .eq("id", id);

    if (error) {
      setRequisicoes((prev) => prev.map((r) => (r.id === id ? anterior : r)));
      setSelectedReq((prev) => (prev?.id === id ? anterior : prev));
      toast({
        variant: "destructive",
        title: "Erro ao mover requisição",
        description: error.message,
      });
    }
  };

  const abrirDetalhes = async (req: Requisicao) => {
    setSelectedReq(req);
    setItens([]);
    // eslint-disable-next-line no-restricted-syntax -- limitado a uma requisicao (max ~17 itens), nunca chega perto de 1000
    const { data, error } = await supabase
      .from("itens_requisicao")
      .select("produto, unidade, quantidade")
      .eq("requisicao_id", req.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar itens",
        description: error.message,
      });
      return;
    }
    setItens(data || []);
  };

  const buscaNumero = busca.replace(/\D/g, "");

  const porFase = useMemo(() => {
    const grupos = {} as Record<Fase, Requisicao[]>;
    for (const col of COLUNAS) grupos[col.fase] = [];
    for (const r of requisicoes) {
      if (buscaNumero && !String(r.id).includes(buscaNumero)) continue;
      grupos[r.fase as Fase]?.push(r);
    }
    return grupos;
  }, [requisicoes, buscaNumero]);

  const nenhumResultado = COLUNAS.every((col) => porFase[col.fase].length === 0);

  const handleDrop = (e: React.DragEvent, fase: Fase) => {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData("text/plain"));
    setOverFase(null);
    setDraggingId(null);
    if (id) moverRequisicao(id, fase);
  };

  const MenuMover = ({ req }: { req: Requisicao }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
          title="Mover para"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel>Mover para</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {COLUNAS.map((col) => (
          <DropdownMenuItem
            key={col.fase}
            disabled={col.fase === req.fase}
            onClick={() => moverRequisicao(req.id, col.fase)}
          >
            {col.titulo}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-3xl font-bold">Painel de Pedidos de Compra</h2>
          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar pelo nº"
                inputMode="numeric"
                className="pl-9 pr-8"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title="Limpar busca"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button onClick={fetchRequisicoes} variant="outline" className="gap-2" disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </div>

        {buscaNumero && nenhumResultado && !loading && (
          <p className="text-sm text-muted-foreground">
            Nenhuma requisição encontrada com o nº {buscaNumero}.
          </p>
        )}

        {loading && requisicoes.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 items-start">
            {COLUNAS.map((col) => {
              const total = porFase[col.fase].length;
              const limite = limites[col.fase] ?? CARTOES_POR_BLOCO;
              const cartoes = porFase[col.fase].slice(0, limite);
              return (
                <div
                  key={col.fase}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (overFase !== col.fase) setOverFase(col.fase);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverFase(null);
                  }}
                  onDrop={(e) => handleDrop(e, col.fase)}
                  className={cn(
                    "w-72 shrink-0 rounded-xl bg-card shadow-md border flex flex-col max-h-[calc(100vh-14rem)] transition-colors",
                    overFase === col.fase && "ring-2 ring-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
                    <h3 className="font-semibold text-sm leading-snug">{col.titulo}</h3>
                    <span className="text-sm text-muted-foreground">{total}</span>
                  </div>

                  <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[3rem]">
                    {cartoes.map((req) => (
                      <div
                        key={req.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", String(req.id));
                          e.dataTransfer.effectAllowed = "move";
                          setDraggingId(req.id);
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setOverFase(null);
                        }}
                        onClick={() => abrirDetalhes(req)}
                        className={cn(
                          "rounded-lg border bg-background p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/60 transition-all",
                          draggingId === req.id && "opacity-40"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-sm">#{req.id}</span>
                          <div className="flex items-center gap-1">
                            <Badge className={cn("text-[10px] px-1.5 py-0", getStatusColor(req.status))}>
                              {req.status}
                            </Badge>
                            <MenuMover req={req} />
                          </div>
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <p className="flex items-center gap-1.5 truncate">
                            <User className="h-3 w-3 shrink-0" />
                            {req.solicitante}
                          </p>
                          <p className="flex items-center gap-1.5 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {req.local_origem}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <CalendarDays className="h-3 w-3 shrink-0" />
                            {format(new Date(req.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}

                    {total > limite && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() =>
                          setLimites((prev) => ({ ...prev, [col.fase]: limite + CARTOES_POR_BLOCO }))
                        }
                      >
                        Mostrar mais ({total - limite} restantes)
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detalhes do cartão */}
        <Dialog open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Requisição #{selectedReq?.id}</DialogTitle>
            </DialogHeader>
            {selectedReq && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Solicitante</p>
                    <p className="font-medium">{selectedReq.solicitante}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Local de Origem</p>
                    <p className="font-medium">{selectedReq.local_origem}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data</p>
                    <p className="font-medium">
                      {format(new Date(selectedReq.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(selectedReq.status)}>{selectedReq.status}</Badge>
                  </div>
                </div>

                <LinkDrive status={selectedReq.status} driveUrl={selectedReq.drive_url} />

                {selectedReq.observacao && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Observação</p>
                    <p className="text-sm bg-muted p-3 rounded-lg">{selectedReq.observacao}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Fase</p>
                  <div className="flex flex-wrap gap-2">
                    {COLUNAS.map((col) => (
                      <Button
                        key={col.fase}
                        size="sm"
                        variant={selectedReq.fase === col.fase ? "default" : "outline"}
                        onClick={() => moverRequisicao(selectedReq.id, col.fase)}
                      >
                        {col.titulo}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Itens Requisitados</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead className="text-right">Quantidade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itens.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell>{item.produto}</TableCell>
                          <TableCell>{item.unidade}</TableCell>
                          <TableCell className="text-right">{item.quantidade}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Kanban;
