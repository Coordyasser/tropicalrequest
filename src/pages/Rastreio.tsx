import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Search, FileText, Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RastreioData {
  id: string;
  data_aprovacao: string;
  aprovado_por: string;
  requisicao: {
    id: number;
    destino: string;
    solicitante: string;
  };
  itens: Array<{
    produto: string;
    quantidade: number;
    unidade: string;
  }>;
}

const Rastreio = () => {
  const [data, setData] = useState<RastreioData[]>([]);
  const [filteredData, setFilteredData] = useState<RastreioData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const { toast } = useToast();

  const fetchRastreio = async () => {
    setLoading(true);
    try {
      // Buscar rastreios
      const { data: rastreios, error: rastreioError } = await supabase
        .from("rastreio")
        .select(
          `
          *,
          requisicao:requisicoes (
            id,
            destino,
            solicitante
          )
        `
        )
        .order("data_aprovacao", { ascending: false });

      if (rastreioError) throw rastreioError;

      // Para cada rastreio, buscar os itens
      const rastreiosComItens = await Promise.all(
        (rastreios || []).map(async (rastreio) => {
          const { data: itens } = await supabase
            .from("itens_requisicao")
            .select("produto, quantidade, unidade")
            .eq("requisicao_id", rastreio.requisicao.id);

          return {
            ...rastreio,
            itens: itens || [],
          };
        })
      );

      setData(rastreiosComItens);
      setFilteredData(rastreiosComItens);

      // Calcular total de itens dos últimos 7 dias
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentItems = rastreiosComItens
        .filter((r) => new Date(r.data_aprovacao) >= sevenDaysAgo)
        .reduce((sum, r) => sum + r.itens.length, 0);

      setTotalItems(recentItems);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar rastreio",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRastreio();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = data.filter(
        (item) =>
          item.requisicao?.destino
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          item.requisicao?.solicitante
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          item.itens.some((i) =>
            i.produto.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(data);
    }
  }, [searchTerm, data]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-3xl font-bold">Rastreio e Histórico</h2>
          
          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por destino, solicitante ou produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={fetchRastreio}>
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Total de Requisições
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                      {data.length}
                    </p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Itens - Últimos 7 dias
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                      {totalItems}
                    </p>
                  </div>
                  <div className="p-3 bg-status-aprovada/10 rounded-lg">
                    <Calendar className="h-6 w-6 text-status-aprovada" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
                      <TableHead>Data Aprovação</TableHead>
                      <TableHead>Requisição</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Produtos</TableHead>
                      <TableHead className="text-right">Qtd Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-12 text-muted-foreground"
                        >
                          {searchTerm
                            ? "Nenhum resultado encontrado"
                            : "Nenhuma requisição aprovada"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {format(
                              new Date(item.data_aprovacao),
                              "dd/MM/yyyy HH:mm",
                              { locale: ptBR }
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            #{item.requisicao?.id}
                          </TableCell>
                          <TableCell>{item.requisicao?.destino}</TableCell>
                          <TableCell>{item.requisicao?.solicitante}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {item.itens.slice(0, 2).map((produto, i) => (
                                <div key={i} className="text-sm">
                                  {produto.produto}
                                </div>
                              ))}
                              {item.itens.length > 2 && (
                                <div className="text-xs text-muted-foreground">
                                  +{item.itens.length - 2} mais
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.itens.reduce(
                              (sum, i) => sum + Number(i.quantidade),
                              0
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
      </div>
    </Layout>
  );
};

export default Rastreio;
