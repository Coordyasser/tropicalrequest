import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OpcaoFormulario {
  id: string;
  tipo: string;
  valor: string;
  finalidade: string | null;
  ativo: boolean;
}

export function useOpcoesFormulario() {
  const [locaisOrigem, setLocaisOrigem] = useState<string[]>([]);
  const [destinos, setDestinos] = useState<string[]>([]);
  const [produtos, setProdutos] = useState<string[]>([]);
  const [unidades, setUnidades] = useState<string[]>([]);
  const [produtoToFinalidade, setProdutoToFinalidade] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchOpcoes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("opcoes_formulario")
        .select("*")
        .eq("ativo", true)
        .order("valor");

      if (error) throw error;

      const opcoes = data as OpcaoFormulario[];

      setLocaisOrigem(opcoes.filter(o => o.tipo === "local_origem").map(o => o.valor));
      setDestinos(opcoes.filter(o => o.tipo === "destino").map(o => o.valor));
      setUnidades(opcoes.filter(o => o.tipo === "unidade").map(o => o.valor));
      
      const produtosData = opcoes.filter(o => o.tipo === "produto");
      setProdutos(produtosData.map(o => o.valor));
      
      const mapping: Record<string, string> = {};
      produtosData.forEach(p => {
        if (p.finalidade) {
          mapping[p.valor] = p.finalidade;
        }
      });
      setProdutoToFinalidade(mapping);
    } catch (error) {
      console.error("Erro ao carregar opções:", error);
    } finally {
      setLoading(false);
    }
  };

  const addOpcao = async (tipo: string, valor: string, finalidade?: string) => {
    try {
      const { error } = await supabase
        .from("opcoes_formulario")
        .insert({ tipo, valor, finalidade: finalidade || null });

      if (error) throw error;
      await fetchOpcoes();
      return true;
    } catch (error) {
      console.error("Erro ao adicionar opção:", error);
      return false;
    }
  };

  const removeOpcao = async (tipo: string, valor: string) => {
    try {
      const { error } = await supabase
        .from("opcoes_formulario")
        .delete()
        .eq("tipo", tipo)
        .eq("valor", valor);

      if (error) throw error;
      await fetchOpcoes();
      return true;
    } catch (error) {
      console.error("Erro ao remover opção:", error);
      return false;
    }
  };

  useEffect(() => {
    fetchOpcoes();
  }, []);

  return {
    locaisOrigem,
    destinos,
    produtos,
    unidades,
    produtoToFinalidade,
    loading,
    addOpcao,
    removeOpcao,
    refetch: fetchOpcoes,
  };
}
