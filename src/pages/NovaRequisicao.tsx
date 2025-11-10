import { useState, useEffect } from "react";
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

interface Item {
  produto: string;
  unidade: string;
  quantidade: string;
}

const locais = ["Almoxarifado", "Escritório", "Produção", "Manutenção"];
const destinos = ["Produção", "Manutenção", "Escritório", "Obras"];
const unidades = ["UN", "CX", "KG", "L", "M", "M²", "M³"];

const NovaRequisicao = () => {
  const [solicitante, setSolicitante] = useState("");
  const [localOrigem, setLocalOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [observacao, setObservacao] = useState("");
  const [itens, setItens] = useState<Item[]>([
    { produto: "", unidade: "", quantidade: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Preencher solicitante com o email do usuário ao carregar
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setSolicitante(user.email);
      }
    };
    fetchUser();
  }, []);

  const addItem = () => {
    setItens([...itens, { produto: "", unidade: "", quantidade: "" }]);
  };

  const removeItem = (index: number) => {
    if (itens.length > 1) {
      setItens(itens.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof Item, value: string) => {
    const newItens = [...itens];
    newItens[index][field] = value;
    setItens(newItens);
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
                  <Select value={localOrigem} onValueChange={setLocalOrigem}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {locais.map((local) => (
                        <SelectItem key={local} value={local}>
                          {local}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      className="flex gap-3 items-end"
                    >
                      <div className="flex-1 space-y-2">
                        <label className="text-sm">Produto</label>
                        <Input
                          value={item.produto}
                          onChange={(e) =>
                            updateItem(index, "produto", e.target.value)
                          }
                          placeholder="Nome do produto"
                        />
                      </div>
                      <div className="w-32 space-y-2">
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
                      <div className="w-32 space-y-2">
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
