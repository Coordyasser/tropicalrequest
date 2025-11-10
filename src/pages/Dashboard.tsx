import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { 
  Clock, 
  CheckCircle, 
  TrendingUp,
  FileText 
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useToast } from "@/hooks/use-toast";

interface Stats {
  pendentes: number;
  aprovadas: number;
  ultimosDias: number;
}

interface ChartData {
  destino: string;
  quantidade: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    pendentes: 0,
    aprovadas: 0,
    ultimosDias: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
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

        setStats({
          pendentes: pendentes || 0,
          aprovadas: aprovadas || 0,
          ultimosDias: totalItems,
        });

        // Dados para o gráfico - últimos 30 dias
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: requisicoes } = await supabase
          .from("requisicoes")
          .select("destino")
          .gte("created_at", thirtyDaysAgo.toISOString());

        // Agrupar por destino
        const grouped = requisicoes?.reduce((acc: any, req) => {
          acc[req.destino] = (acc[req.destino] || 0) + 1;
          return acc;
        }, {});

        const chartData = Object.entries(grouped || {}).map(
          ([destino, quantidade]) => ({
            destino,
            quantidade: quantidade as number,
          })
        );

        setChartData(chartData);
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        {/* Chart */}
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
      </div>
    </Layout>
  );
};

export default Dashboard;
