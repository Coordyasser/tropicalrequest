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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Eye, CheckCircle, RefreshCw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Requisicao {
  id: number;
  solicitante: string;
  destino: string;
  status: string;
  created_at: string;
  observacao: string;
}

interface Item {
  produto: string;
  unidade: string;
  quantidade: number;
}

const FilaRequisicoes = () => {
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [selectedReq, setSelectedReq] = useState<Requisicao | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

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

  useEffect(() => {
    fetchRequisicoes();
  }, []);

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
            <CardContent className="p-0">
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
                    {requisicoes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          Nenhuma requisição encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      requisicoes.map((req) => (
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
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewDetails(req)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver
                            </Button>
                            {req.status === "pendente" && (
                              <Button
                                size="sm"
                                onClick={() => handleAprovar(req)}
                                disabled={processing}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Aprovar
                              </Button>
                            )}
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
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default FilaRequisicoes;
