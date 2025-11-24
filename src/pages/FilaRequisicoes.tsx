import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Eye, CheckCircle, RefreshCw, Loader2, FileText, CalendarIcon, X, Edit, Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Requisicao {
  id: number;
  solicitante: string;
  destino: string;
  local_origem: string;
  status: string;
  created_at: string;
  observacao: string;
}

interface Item {
  id?: string;
  produto: string;
  unidade: string;
  quantidade: number;
}

const actionButtonClass = "h-8 px-2 text-xs gap-1 rounded-full";

const FilaRequisicoes = () => {
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [selectedReq, setSelectedReq] = useState<Requisicao | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [filtroDestino, setFiltroDestino] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [editingReq, setEditingReq] = useState<Requisicao | null>(null);
  const [editForm, setEditForm] = useState({
    destino: "",
    local_origem: "",
    observacao: "",
    itens: [] as Item[]
  });
  const { toast } = useToast();

  // Lista de destinos únicos
  const destinosUnicos = Array.from(
    new Set(requisicoes.map((req) => req.destino))
  ).sort();

  const fetchRequisicoes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("requisicoes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequisicoes(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar requisições",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGerarPdf = async (req: Requisicao) => {
    setGeneratingId(req.id);
    try {
      const { data: pdfData, error: pdfError } = await supabase.functions.invoke(
        'generate-pdf',
        {
          body: { requisicaoId: req.id }
        }
      );

      if (pdfError) throw pdfError;

      const pdfUrl = (pdfData as any)?.pdfUrl as string | undefined;
      const fileName = (pdfData as any)?.fileName as string | undefined;
      if (pdfUrl) {
        try {
          const response = await fetch(pdfUrl);
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName || `requisicao_${req.id}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch {
          window.open(pdfUrl, '_blank');
        }
      }

      toast({
        title: "PDF gerado!",
        description: "O download da ficha foi iniciado.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF",
        description: error.message,
      });
    } finally {
      setGeneratingId(null);
    }
  };

  useEffect(() => {
    fetchRequisicoes();
  }, []);

  const handleEditarRequisicao = async (req: Requisicao) => {
    try {
      // Buscar itens da requisição
      const { data: itensData, error } = await supabase
        .from("itens_requisicao")
        .select("*")
        .eq("requisicao_id", req.id);

      if (error) throw error;

      setEditingReq(req);
      setEditForm({
        destino: req.destino,
        local_origem: req.local_origem,
        observacao: req.observacao || "",
        itens: itensData?.map(item => ({
          id: item.id,
          produto: item.produto,
          unidade: item.unidade,
          quantidade: Number(item.quantidade)
        })) || []
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: error.message,
      });
    }
  };

  const handleSalvarEdicao = async () => {
    if (!editingReq) return;

    try {
      setProcessing(true);

      // Atualizar dados da requisição
      const { error: reqError } = await supabase
        .from("requisicoes")
        .update({
          destino: editForm.destino,
          local_origem: editForm.local_origem,
          observacao: editForm.observacao,
        })
        .eq("id", editingReq.id);

      if (reqError) throw reqError;

      // Obter itens atuais
      const { data: itensAtuais } = await supabase
        .from("itens_requisicao")
        .select("id")
        .eq("requisicao_id", editingReq.id);

      const idsAtuais = itensAtuais?.map(i => i.id) || [];
      const idsEditados = editForm.itens.filter(i => i.id).map(i => i.id!);
      
      // Deletar itens removidos
      const idsParaDeletar = idsAtuais.filter(id => !idsEditados.includes(id));
      if (idsParaDeletar.length > 0) {
        const { error: delError } = await supabase
          .from("itens_requisicao")
          .delete()
          .in("id", idsParaDeletar);
        
        if (delError) throw delError;
      }

      // Atualizar itens existentes e inserir novos
      for (const item of editForm.itens) {
        if (item.id) {
          // Atualizar item existente
          const { error: updateError } = await supabase
            .from("itens_requisicao")
            .update({
              produto: item.produto,
              unidade: item.unidade,
              quantidade: item.quantidade,
            })
            .eq("id", item.id);
          
          if (updateError) throw updateError;
        } else {
          // Inserir novo item
          const { error: insertError } = await supabase
            .from("itens_requisicao")
            .insert({
              requisicao_id: editingReq.id,
              produto: item.produto,
              unidade: item.unidade,
              quantidade: item.quantidade,
            });
          
          if (insertError) throw insertError;
        }
      }

      toast({
        title: "Requisição atualizada",
        description: "As alterações foram salvas com sucesso.",
      });

      setEditingReq(null);
      fetchRequisicoes();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  const viewDetails = async (req: Requisicao) => {
    try {
      const { data, error } = await supabase
        .from("itens_requisicao")
        .select("*")
        .eq("requisicao_id", req.id);

      if (error) throw error;
      setItens(data || []);
      setSelectedReq(req);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar itens",
        description: error.message,
      });
    }
  };

  const handleAprovar = async (req: Requisicao) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Generate PDF
      const { data: pdfData, error: pdfError } = await supabase.functions.invoke(
        'generate-pdf',
        {
          body: { requisicaoId: req.id }
        }
      );

      if (pdfError) throw pdfError;

      // Disparar download do PDF gerado
      const pdfUrl = (pdfData as any)?.pdfUrl as string | undefined;
      const fileName = (pdfData as any)?.fileName as string | undefined;
      if (pdfUrl) {
        try {
          const response = await fetch(pdfUrl);
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName || `requisicao_${req.id}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch {
          // Fallback: abre em nova aba caso o download direto falhe
          window.open(pdfUrl, '_blank');
        }
      }

      // Atualizar status
      const { error: updateError } = await supabase
        .from("requisicoes")
        .update({ status: "aprovada" })
        .eq("id", req.id);

      if (updateError) throw updateError;

      // Criar rastreio
      const { error: rastreioError } = await supabase
        .from("rastreio")
        .insert({
          requisicao_id: req.id,
          aprovado_por: user.email,
          observacao: "Requisição aprovada e PDF gerado",
        });

      if (rastreioError) throw rastreioError;

      toast({
        title: "Requisição aprovada!",
        description: "PDF gerado com sucesso e registrado no rastreio.",
      });

      setSelectedReq(null);
      fetchRequisicoes();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao aprovar requisição",
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  // Filtrar requisições
  const requisicoesFiltered = requisicoes.filter((req) => {
    // Filtro por destino
    if (filtroDestino !== "todos" && req.destino !== filtroDestino) {
      return false;
    }

    // Filtro por status
    if (filtroStatus !== "todos" && req.status !== filtroStatus) {
      return false;
    }

    // Filtro por data
    const dataReq = new Date(req.created_at);
    if (dataInicio && dataReq < dataInicio) {
      return false;
    }
    if (dataFim) {
      const fimDia = new Date(dataFim);
      fimDia.setHours(23, 59, 59, 999);
      if (dataReq > fimDia) {
        return false;
      }
    }

    return true;
  });

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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Fila de Requisições</h2>
          <Button onClick={fetchRequisicoes} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="shadow-lg">
            <CardContent className="p-6">
              {/* Filtros */}
              <div className="mb-6 flex flex-wrap gap-4 pb-6 border-b">
                {/* Filtro por Destino */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Destino</label>
                  <Select value={filtroDestino} onValueChange={setFiltroDestino}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Todos os destinos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os destinos</SelectItem>
                      {destinosUnicos.map((destino) => (
                        <SelectItem key={destino} value={destino}>
                          {destino}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por Status */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os status</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="aprovada">Aprovada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro Data Início */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Data Início</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[200px] justify-start text-left font-normal",
                          !dataInicio && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dataInicio}
                        onSelect={setDataInicio}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {dataInicio && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDataInicio(undefined)}
                      className="w-fit px-2"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>

                {/* Filtro Data Fim */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Data Fim</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[200px] justify-start text-left font-normal",
                          !dataFim && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataFim ? format(dataFim, "dd/MM/yyyy") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dataFim}
                        onSelect={setDataFim}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {dataFim && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDataFim(undefined)}
                      className="w-fit px-2"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requisicoesFiltered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          Nenhuma requisição encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      requisicoesFiltered.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">#{req.id}</TableCell>
                          <TableCell>
                            {format(new Date(req.created_at), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell>{req.solicitante}</TableCell>
                          <TableCell>{req.destino}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(req.status)}>
                              {req.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`${actionButtonClass} border`}
                                onClick={() => viewDetails(req)}
                              >
                                <Eye className="h-4 w-4" />
                                Ver
                              </Button>
                              {req.status === "pendente" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className={`${actionButtonClass} border`}
                                    onClick={() => handleEditarRequisicao(req)}
                                  >
                                    <Edit className="h-4 w-4" />
                                    Editar
                                  </Button>
                                  <Button
                                    size="sm"
                                    className={`${actionButtonClass} bg-primary text-primary-foreground`}
                                    onClick={() => handleAprovar(req)}
                                    disabled={processing}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    Aprovar
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`${actionButtonClass} border`}
                                onClick={() => handleGerarPdf(req)}
                                disabled={generatingId === req.id}
                              >
                                {generatingId === req.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                                PDF
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Modal de Detalhes */}
        <Dialog open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Requisição #{selectedReq?.id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Solicitante</p>
                  <p className="font-medium">{selectedReq?.solicitante}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Destino</p>
                  <p className="font-medium">{selectedReq?.destino}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {selectedReq &&
                      format(new Date(selectedReq.created_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(selectedReq?.status || "")}>
                    {selectedReq?.status}
                  </Badge>
                </div>
              </div>

              {selectedReq?.observacao && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Observação</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">
                    {selectedReq.observacao}
                  </p>
                </div>
              )}

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  onClick={() => selectedReq && handleGerarPdf(selectedReq)}
                  className="w-full gap-2"
                  variant="secondary"
                  disabled={!!selectedReq && generatingId === selectedReq.id}
                >
                  {selectedReq && generatingId === selectedReq.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  Gerar PDF
                </Button>

              {selectedReq?.status === "pendente" && (
                <Button
                  onClick={() => handleAprovar(selectedReq)}
                  className="w-full gap-2"
                  disabled={processing}
                >
                  {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                  <CheckCircle className="h-4 w-4" />
                  Aprovar e Gerar PDF
                </Button>
              )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Edição */}
        <Dialog open={!!editingReq} onOpenChange={() => setEditingReq(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Requisição #{editingReq?.id}</DialogTitle>
            </DialogHeader>
            {editingReq && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="destino">Destino</Label>
                    <Input
                      id="destino"
                      value={editForm.destino}
                      onChange={(e) => setEditForm({ ...editForm, destino: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="local_origem">Local de Origem</Label>
                    <Input
                      id="local_origem"
                      value={editForm.local_origem}
                      onChange={(e) => setEditForm({ ...editForm, local_origem: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="observacao">Observação</Label>
                  <Textarea
                    id="observacao"
                    value={editForm.observacao}
                    onChange={(e) => setEditForm({ ...editForm, observacao: e.target.value })}
                    rows={3}
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Itens</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditForm({
                        ...editForm,
                        itens: [...editForm.itens, { produto: "", unidade: "", quantidade: 1 }]
                      })}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Item
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {editForm.itens.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5">
                          <Label>Produto</Label>
                          <Input
                            value={item.produto}
                            onChange={(e) => {
                              const newItens = [...editForm.itens];
                              newItens[index].produto = e.target.value;
                              setEditForm({ ...editForm, itens: newItens });
                            }}
                            placeholder="Nome do produto"
                          />
                        </div>
                        <div className="col-span-3">
                          <Label>Unidade</Label>
                          <Input
                            value={item.unidade}
                            onChange={(e) => {
                              const newItens = [...editForm.itens];
                              newItens[index].unidade = e.target.value;
                              setEditForm({ ...editForm, itens: newItens });
                            }}
                            placeholder="Ex: Unidade"
                          />
                        </div>
                        <div className="col-span-3">
                          <Label>Quantidade</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantidade}
                            onChange={(e) => {
                              const newItens = [...editForm.itens];
                              newItens[index].quantidade = Number(e.target.value);
                              setEditForm({ ...editForm, itens: newItens });
                            }}
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => {
                              const newItens = editForm.itens.filter((_, i) => i !== index);
                              setEditForm({ ...editForm, itens: newItens });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setEditingReq(null)}
                    disabled={processing}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSalvarEdicao}
                    disabled={processing || editForm.itens.length === 0}
                  >
                    {processing ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default FilaRequisicoes;
