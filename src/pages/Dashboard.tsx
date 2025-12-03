import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { 
  Clock, 
  CheckCircle, 
  TrendingUp,
  FileText,
  Users,
  MapPin,
  Target,
  Filter,
  Calendar
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { produtoToFinalidade } from "@/data/produtosFinalidade";

interface Stats {
  pendentes: number;
  aprovadas: number;
  ultimosDias: number;
  solicitantesUnicos: number;
}

interface ChartData {
  destino: string;
  quantidade: number;
}

interface FinalidadeChartData {
  finalidade: string;
  quantidade: number;
}

interface OrigemChartData {
  name: string;
  value: number;
}

interface StatusChartData {
  status: string;
  quantidade: number;
}

// Paleta de cores do dashboard (preto, vermelho e amarelo)
// Utilizada em todos os gráficos para manter consistência visual
const COLORS = [
  "#000000", // preto
  "#B71C1C", // vermelho escuro
  "#F44336", // vermelho
  "#FBC02D", // amarelo escuro
  "#FFC107", // amarelo
  "#FFEB3B", // amarelo claro
];

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    pendentes: 0,
    aprovadas: 0,
    ultimosDias: 0,
    solicitantesUnicos: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [finalidadeData, setFinalidadeData] = useState<FinalidadeChartData[]>([]);
  const [origemData, setOrigemData] = useState<OrigemChartData[]>([]);
  const [statusData, setStatusData] = useState<StatusChartData[]>([]);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  // Filtros
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [localOrigemFilter, setLocalOrigemFilter] = useState<string>("todos");
  const [locaisOrigem, setLocaisOrigem] = useState<string[]>([]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchLocaisOrigem = async () => {
      const { data } = await supabase.from("requisicoes").select("local_origem");
      const uniqueLocais = [...new Set(data?.map(r => r.local_origem) || [])];
      setLocaisOrigem(uniqueLocais);
    };
    fetchLocaisOrigem();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Requisições pendentes
        const { count: pendentes } = await supabase
          .from("requisicoes")
          .select("*", { count: "exact", head: true })
          .eq("status", "pendente");

        // Requisições aprovadas
        const { count: aprovadas } = await supabase
          .from("requisicoes")
          .select("*", { count: "exact", head: true })
          .eq("status", "aprovada");

        // Itens dos últimos 7 dias
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: recentItems } = await supabase
          .from("itens_requisicao")
          .select("quantidade, requisicao:requisicoes!inner(created_at)")
          .gte("requisicao.created_at", sevenDaysAgo.toISOString());

        const totalItems = recentItems?.reduce(
          (sum, item) => sum + Number(item.quantidade),
          0
        ) || 0;

        // Solicitantes únicos
        const { data: allRequisicoes } = await supabase
          .from("requisicoes")
          .select("solicitante");

        const uniqueSolicitantes = new Set(
          allRequisicoes?.map((r) => r.solicitante) || []
        ).size;

        setStats({
          pendentes: pendentes || 0,
          aprovadas: aprovadas || 0,
          ultimosDias: totalItems,
          solicitantesUnicos: uniqueSolicitantes,
        });

        // Aplicar filtros de data
        let query = supabase.from("requisicoes").select("destino, local_origem, created_at");
        
        if (dataInicio) {
          query = query.gte("created_at", new Date(dataInicio).toISOString());
        } else {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          query = query.gte("created_at", thirtyDaysAgo.toISOString());
        }
        
        if (dataFim) {
          const endDate = new Date(dataFim);
          endDate.setHours(23, 59, 59, 999);
          query = query.lte("created_at", endDate.toISOString());
        }
        
        if (localOrigemFilter && localOrigemFilter !== "todos") {
          query = query.eq("local_origem", localOrigemFilter);
        }

        const { data: requisicoes } = await query;

        // Agrupar por destino (para gráfico de pizza)
        const groupedDestino = requisicoes?.reduce((acc: any, req) => {
          acc[req.destino] = (acc[req.destino] || 0) + 1;
          return acc;
        }, {});

        const chartData = Object.entries(groupedDestino || {}).map(
          ([destino, quantidade]) => ({
            destino,
            quantidade: quantidade as number,
          })
        );

        setChartData(chartData);

        // Agrupar por Local de Origem (para gráfico de barras horizontal)
        const groupedOrigem = requisicoes?.reduce((acc: any, req) => {
          acc[req.local_origem] = (acc[req.local_origem] || 0) + 1;
          return acc;
        }, {});

        const origemChartData = Object.entries(groupedOrigem || {}).map(
          ([name, value]) => ({
            name,
            value: value as number,
          })
        );

        setOrigemData(origemChartData);

        // Buscar dados de status para o gráfico
        let statusQuery = supabase.from("requisicoes").select("status, created_at, local_origem");
        
        if (dataInicio) {
          statusQuery = statusQuery.gte("created_at", new Date(dataInicio).toISOString());
        }
        
        if (dataFim) {
          const endDate = new Date(dataFim);
          endDate.setHours(23, 59, 59, 999);
          statusQuery = statusQuery.lte("created_at", endDate.toISOString());
        }
        
        if (localOrigemFilter && localOrigemFilter !== "todos") {
          statusQuery = statusQuery.eq("local_origem", localOrigemFilter);
        }

        const { data: statusRequisicoes } = await statusQuery;

        const groupedStatus = statusRequisicoes?.reduce((acc: any, req) => {
          const statusLabel = req.status === "pendente" ? "Pendente" : 
                             req.status === "aprovada" ? "Aprovada" : req.status;
          acc[statusLabel] = (acc[statusLabel] || 0) + 1;
          return acc;
        }, {});

        const statusChartData = Object.entries(groupedStatus || {}).map(
          ([status, quantidade]) => ({
            status,
            quantidade: quantidade as number,
          })
        );

        setStatusData(statusChartData);

        // Dados para o gráfico de barras - Finalidade (com filtros)
        let itensQuery = supabase
          .from("itens_requisicao")
          .select("produto, quantidade, requisicao:requisicoes!inner(created_at, local_origem)");

        if (dataInicio) {
          itensQuery = itensQuery.gte("requisicao.created_at", new Date(dataInicio).toISOString());
        } else {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          itensQuery = itensQuery.gte("requisicao.created_at", thirtyDaysAgo.toISOString());
        }

        if (dataFim) {
          const endDate = new Date(dataFim);
          endDate.setHours(23, 59, 59, 999);
          itensQuery = itensQuery.lte("requisicao.created_at", endDate.toISOString());
        }

        if (localOrigemFilter && localOrigemFilter !== "todos") {
          itensQuery = itensQuery.eq("requisicao.local_origem", localOrigemFilter);
        }

        const { data: itensData } = await itensQuery;

        const groupedFinalidade = itensData?.reduce((acc: any, item) => {
          const finalidade = produtoToFinalidade[item.produto] || "Outros";
          acc[finalidade] = (acc[finalidade] || 0) + Number(item.quantidade);
          return acc;
        }, {});

        const finalidadeChartData = Object.entries(groupedFinalidade || {})
          .map(([finalidade, quantidade]) => ({
            finalidade,
            quantidade: quantidade as number,
          }))
          .sort((a, b) => b.quantidade - a.quantidade)
          .slice(0, 10);

        setFinalidadeData(finalidadeChartData);

      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Erro ao carregar estatísticas",
          description: error.message,
        });
      }
    };

    fetchStats();
  }, [toast, dataInicio, dataFim, localOrigemFilter]);

  const cards = [
    {
      title: "Requisições Pendentes",
      value: stats.pendentes,
      icon: Clock,
      color: "text-status-pendente",
      bgColor: "bg-status-pendente/10",
    },
    {
      title: "Requisições Aprovadas",
      value: stats.aprovadas,
      icon: CheckCircle,
      color: "text-status-aprovada",
      bgColor: "bg-status-aprovada/10",
    },
    {
      title: "Itens - Últimos 7 dias",
      value: stats.ultimosDias,
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Solicitantes Únicos",
      value: stats.solicitantesUnicos,
      icon: Users,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Olá, {user?.email} 👋
          </h2>
          <p className="text-muted-foreground">
            Bem-vindo ao sistema de requisições internas
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${card.bgColor}`}>
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">
                      {card.value}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5 text-primary" />
                Filtros dos Gráficos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="dataInicio" className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Data de Início
                  </Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataFim" className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Data Fim
                  </Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="localOrigem" className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Local de Origem
                  </Label>
                  <Select value={localOrigemFilter} onValueChange={setLocalOrigemFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os locais" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os locais</SelectItem>
                      {locaisOrigem.map((local) => (
                        <SelectItem key={local} value={local}>
                          {local}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDataInicio("");
                    setDataFim("");
                    setLocalOrigemFilter("todos");
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Chart - Local de Origem (Horizontal Bar - Full Width) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-chart-4" />
                Requisições por Local de Origem
              </CardTitle>
            </CardHeader>
            <CardContent>
              {origemData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={origemData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={150}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                      {origemData.map((_, index) => (
                        <Cell
                          key={`origem-cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  Nenhum dado de origem disponível
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Chart - Finalidade (Pizza) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-chart-3" />
                Quantidade por Finalidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              {finalidadeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={finalidadeData as any}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={120}
                      dataKey="quantidade"
                      nameKey="finalidade"
                      label={({ name, percent }: any) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {finalidadeData.map((_, index) => (
                        <Cell
                          key={`finalidade-cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  Nenhum dado de finalidade disponível
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Dashboard;
