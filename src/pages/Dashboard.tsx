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
  Target
} from "lucide-react";
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

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(210, 70%, 50%)",
  "hsl(280, 70%, 50%)",
  "hsl(30, 70%, 50%)",
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
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
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

        // Dados para o gráfico de destino - últimos 30 dias
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: requisicoes } = await supabase
          .from("requisicoes")
          .select("destino, local_origem")
          .gte("created_at", thirtyDaysAgo.toISOString());

        // Agrupar por destino
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

        // Dados para o gráfico de pizza - Local de Origem
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

        // Dados para o gráfico de barras - Finalidade
        const { data: itensData } = await supabase
          .from("itens_requisicao")
          .select("produto, quantidade, requisicao:requisicoes!inner(created_at)")
          .gte("requisicao.created_at", thirtyDaysAgo.toISOString());

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
          .slice(0, 10); // Top 10 finalidades

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
  }, [toast]);

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

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart - Destino */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Requisições por Destino - Últimos 30 dias
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="destino" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="quantidade" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    Nenhuma requisição nos últimos 30 dias
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Chart - Local de Origem (Pie) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-chart-2" />
                  Requisições por Local de Origem
                </CardTitle>
              </CardHeader>
              <CardContent>
                {origemData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={origemData as any}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {origemData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    Nenhum dado de origem disponível
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Chart - Finalidade */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-chart-3" />
                Quantidade por Finalidade - Últimos 30 dias (Top 10)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {finalidadeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={finalidadeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="finalidade" type="category" width={150} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="quantidade" fill="hsl(var(--chart-3))" radius={[0, 8, 8, 0]} />
                  </BarChart>
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
