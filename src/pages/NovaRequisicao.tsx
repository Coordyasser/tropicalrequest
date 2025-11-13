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
const unidades = ["Peça", "Caixa", "Saco", "Pacote", "Rolo", "m³", "m²", "Metro", "Barra", "Litro", "Galão", "Balde", "Lata", "Kg", "Carrada", "Serviço", "Pares"];

const produtos = [
  "Cimento CP II",
  "Tijolos 8 furos 9×19×29",
  "Furadeira de mandril",
  "Furadeira de impacto",
  "Serra Circular manual",
  "Serra mármore",
  "Esmerilhadeira",
  "Extensão monofasica",
  "Seixo médio (m³)",
  "Extensão trifásico",
  "Motor vibrador",
  "Tábua de pinus - 20 cm",
  "Tábua de pinus - 25 cm",
  "Concreto Usinado Conv. - 30 mPa",
  "Policorte",
  "Prego 16x21 (kg)",
  "Prego 18x27 (kg)",
  "Disco policorte 14x1\"",
  "Isopor 0,50x1m",
  "Eletroduto rígido 25mm( IPE)",
  "Tela tapume ( laranja )",
  "Ponteiro ferro 1\"",
  "Talhadeira 1\"",
  "Marreta 1 kg",
  "Pá com cabo",
  "Enxada com cabo",
  "Balde de zinco 10 litros",
  "Picareta estreita c/ cabo",
  "Xibanca",
  "Madeirite",
  "Pe de cabra",
  "Espacador circular grande",
  "Bianco (200 L)",
  "Vedalit (200 L)",
  "Carros de mão",
  "Areia Fina (carrada 12 m³)",
  "Areia Grossa (carrada 12 m³)",
  "Tela Q 61",
  "Joelho LR latão 25x1/2",
  "Reg esf sold 32mm",
  "Te sold 25mm",
  "Te sold 32X25",
  "Te sold 40x32",
  "Grua",
  "Adesivo epoxi para concreto 1kg",
  "Cantoneira 3/4x1/8 (6m) - 5,22 kg/barra",
  "Espuma D 16 (2x2,5 m²)",
  "Aço corte e dobra 10.00mm",
  "Aço corte e dobra 5.00mm (1,848 kg/br)",
  "Aço corte e dobra 8.00mm (4,74 kg/br)",
  "Aço corte e dobra 12.50mm",
  "Aço corte e dobra 16.00mm",
  "Aço corte e dobra 20.00mm",
  "Aço corte e dobra 25.00mm",
  "Aço corte e dobra 6.30mm (2,94 kg/br)",
  "Concreto Usinado Bomb. - 30 mPa",
  "Porca de ancoragem 5/8 flangeada",
  "Arame recozido 18 (35 kg/rolo)",
  "Broca sds Plus 16x310mm (grua)",
  "Broca chata 25x1\"",
  "Cabo p/ foice",
  "Foice rocadeira",
  "Disco p/ serra circular manual 7 1/4\"x24",
  "Manta de alumínio de 3mm (rolo)",
  "Corpo de prova para ensaio de compressao",
  "Bloco de concreto 0,14x0,19x0,39",
  "Joelho eg 45 100",
  "Joelho eg 45 40",
  "Joelho eg 90 100",
  "Luva eg 100",
  "Espacador cadeirinha (mil und)",
  "Eletrodo 6013 2,50mm (kg)",
  "Capacete",
  "Disco desbaste 7x1/4x7/8",
  "Disco p/ banca de Serra (350mmx48D)",
  "Porcelanato Denver 74x74",
  "Porcelanato Itajaí amber 20,5x125",
  "Óleo industrial AW iso 46 (20L)",
  "Luva látex multiuso G",
  "Protetor plug copolimero",
  "Corda 12mm poliamida",
  "Arruela lisa 1\" (kg)",
  "Porca sext 1\" chv 1 1/2\"",
  "Barra roscada 1\"x1000",
  "Argamassa ACII",
  "Base de registro gaveta de bronze",
  "Luva vaqueta mista",
  "Luva raspa",
  "Carneira para capacete",
  "Bota de couro 38",
  "Maquete física do empreendimento",
  "Telha galvanizada 0,47",
  "Chapa drywall ST 1,20x1,80",
  "Chapa cimentica 6mm 1,20x2,40",
  "Cinto paraquedista DG 4002",
  "Cinta para elevação 2TN 3mx50mm poliester",
  "Sinaleiro LED SNA - 24",
  "Comut 2 pos s bloco (SLMB8D0)",
  "Bloco INA S-LPL42",
  "Luva pigmentada",
  "Parafuso drywall ponta agulha 3,5x25",
  "Parafuso drywall ponta broca 3,5x25",
  "Fita telada azul 100m",
  "Massa em po drywall 25kg",
  "Caibro (3,5 m)",
  "Caibro (4,0 m)",
  "Cantoneira L 1.1/2\"x3/16\" - 16,5 kg/barra",
  "Vassoura de nylon",
  "Disco de corte lixadeira 7x1/8x7/8",
  "Argamassa ACIII interna (15 kg)",
  "Canaleta tipo U 11,5x19x29",
  "Caçamba estacionária",
  "Respirador semi facial",
  "Protetor auricular K-30",
  "Câmara de ar 3,25x8'",
  "Bloco de contato p/ botão BE101",
  "Contato inferior p/ botão M20/P20",
  "Botão de comando pulsador",
  "Fim de curso INA+INF haste roldana",
  "Arruela lisa ZB 1\"",
  "Arruela lisa ZB 3/4\"",
  "Porca SX 3/4\"",
  "Botão emergência COG 40mm c/ chave + bloco",
  "Bloco de contato SPL42/BCAINF",
  "Botão comando SLCG8TOC",
  "Fita telada p/ pl cimenticia 50 mm",
  "Massa p/ pl cimenticia 15 kg",
  "Aço corte e dobra 4.20mm",
  "Parafuso PA PB placa cimenticia 3,5x2,5",
  "Esquadrias stand + decorado",
  "Móveis apt + decorado",
  "PU 25 cinza 900g",
  "Refrigerador Electrolux 590 L",
  "Luminárias Stand",
  "Pedra Juazeiro Branca 100x80",
  "Pivô para porta de 100 kg",
  "Fechadura stam 1005 tetra rolete",
  "Textura acrílica externa branco gelo",
  "Textura acrílica externa concreto",
  "Máscara PFF1",
  "Caixa de luz trifásica padrão equat",
  "Expansor SRA 460",
  "Óculos RJ fume",
  "Óculos imperial incolor",
  "Fechadura externa preto fosco (stand)",
  "Fechadura bwc preto fosco (stand)",
  "Dobradiça 3,5\"x2 5/16\"x 1,7mm preto",
  "Lona plástica preta 4x100m",
  "Seixo fino (12 m³)",
  "Chumbador 3/8\" X 3 3/4\" (parabolt)",
  "Self acrílico 16 L - Tubarão cinza",
  "Self efeito marmorado 3.7 kg - Elefante",
  "Interruptor simples 16A",
  "Modulo de Interruptor paralelo 16A",
  "Módulo de interruptor simples",
  "Interruptor paralelo 16A",
  "Interruptor duplo 16A",
  "Interruptor triplo 16A",
  "Tomada simples 10A",
  "Tomada conjugada (T+I)",
  "Bota pvc",
  "Pneu",
  "Mudas de Grama",
  "Painel digital de chamada para elevadores",
  "Botão de chamada de andar para elevador",
  "Botão de emergência cogumelo trava verm",
  "Botão de impulso plástico 22mm verde",
  "Rodizio v roldafer 2.1/2''",
  "Palmeira Real Indiana",
  "Moreia",
  "Mesa apt decorado",
  "Eletroduto flexível DN 20x50 (m)",
  "Tanque cisterna 20000 L",
  "Tela Pinteiro p/ contrapiso flutuante (1x50m)",
  "Manta acústica 5 mm (1,2x50m)",
  "Tubo esgoto 40 mm",
  "Tubo esgoto 50 mm",
  "Tubo esgoto 75 mm",
  "Tubo esgoto 100 mm",
  "Caixa sifonada Ralo molhado",
  "Caixa sifonada Ralo seco",
  "Base registro gaveta",
  "Base registro pressao",
  "Tubo de cobre flexível 1/2 (em m) (0,263 kg/m)",
  "Tubo de cobre flexível 1/4 (em m) (0,123 kg/m)",
  "Tubo de cobre flexível 3/8 (em m) (0,2 kg/m)",
  "Esponjoso para tubo de cobre 1/2 (em m)",
  "Esponjoso para tubo de cobre 1/4 (em m)",
  "Esponjoso para tubo de cobre 3/8 (em m)",
  "Tijolo 9 furos 14x19x29",
  "Eletroduto flexível DN 32x25(m)",
  "Caixa acoplada para stand de vendas",
  "Bacia sanitária cerâmica para stand de vendas",
  "Joelho 90 sold 25mm",
  "Tubo soldavel 20 mm",
  "Jugular para capacete",
  "Gesso pronto (kg)",
  "Mecanismo para bacia sanitaria",
  "Decanel",
  "Parafuso para fixação de vaso (par)",
  "Talabarte e abs",
  "Flange 20 mm",
  "Flange 25 mm",
  "Flange 32 mm",
  "Cuba de inox (56x35)",
  "Tanque de inox (50x40)",
  "Revestimento azul claro piscina 10x10",
  "Cadeado 60 mm",
  "Aspersor P4 para mangueira de jardim",
  "Óleo diesel 15W40 (20L)",
  "Revisão maquina",
  "Águas de Teresina",
  "Piso metálico p/ andaime",
  "Guarda-corpo p/ andaime",
  "Parafina (caixa 5kg)",
  "Disco de corte p/ porcelanato continuo",
  "Rebotec (caixa)",
  "Água sanitaria",
  "Desinfetante",
  "Sabão em po",
  "Sabão liquido",
  "Lâmpada 9 W",
  "Joelho sold 40",
  "Redução sold 50x32",
  "Boia mecânica Dn 32",
  "Cabo guia",
  "Cabo flex vermelho 2,5mm",
  "Cabo flex azul 2,5mm",
  "Cabo flex verde 2,5mm",
  "Fita isolante",
  "Copo sifonado articulado",
  "Brita 19mm (carrada)",
  "Disjuntor Trifásico 100A",
  "Energia equatorial",
  "Vassourao",
  "Válvula inox p/ pia cozinha",
  "Serra starret",
  "Parafuso agulha estrutura",
  "Dobradiça reforçada",
  "Telha translúcida 4,30 x 1m",
  "Fechadura bwc comum",
  "Fechadura quarto comum",
  "Parafuso sextavado c/ arruela autobrocante p/ telha 12x3/4",
  "Pinhão Z-11 (11 dentes) p/ betoneira 600L",
  "Broca sds Plus 12 mm",
  "Broca sds Plus 8mm",
  "Rolamento p/ peneira eletrica",
  "Lona grossa (m)",
  "Óleo diesel BS-10",
  "Tela p/ peneira (m²)",
  "Latex preto 15L",
  "Eletroduto flexível DN 25x50m",
  "Enchimento EPS H08 (2,00x0,35)",
  "Lixa ferro G-120",
  "Massa plástica c/ catalisador",
  "Parafuso S8",
  "Bucha S8 (mil und)",
  "Esmalte sintético verde (galão)",
  "Desmoldante MF (200 L)",
  "Ponteiro SDS max 28x400 mm",
  "Carrada massará (12 m³)",
  "Martelo rompedor",
  "Plantas + plantio stand",
  "Veda trinca (tubo 400g)",
  "Pistola p/ silicone",
  "Óleo diesel BS 500",
  "Vigota trelicada forro H-08 2,00 m",
  "Vigota trelicada forro H-08 4,20m",
  "Barbante",
  "Silicone incolor",
  "Cabo PP 2x2,5mm",
  "Papel higiênico",
  "Tubo multicamadas pex gás 16mm",
  "Tubo multicamadas pex gás 20mm",
  "Tubo multicamadas pex gás 25mm",
  "Cotovelo gas 16mm",
  "Cotovelo gás 20mm",
  "Conexão fixa macho p gás 25mm-1\"",
  "TEE c/ saída rosca femea p/ gás 16mm-1/2\"",
  "TEE p/ gás 16-16-16mm",
  "TEE c/ redução p gás 20-16-20mm",
  "TEE c/ redução p/ gás 20-16-16mm",
  "TEE c/ redução p/ gás 25-20-20mm",
  "Válvula esfera c/ alavanca rosca femea 1\"",
  "Máquina de solda portátil",
  "Pinhão Z-09 (9 dentes) p/ betoneira 600L",
  "Chave L 8mm",
  "Soquete p/ parafuso autobrocante sextavado 3/4",
  "Vigota trelicada piso H-08 1,1m",
  "Vigota trelicada piso H-08 1,5m",
  "Vigota trelicada piso H-08 2,3m",
  "Vigota trelicada piso H-08 4,2m",
  "Cabo flex 1,5mm preto",
  "Cabo flex 4,0mm vermelho",
  "Cabo flex 4,0mm azul",
  "Cabo flex 4,0mm verde",
  "Máquina de solda grande",
  "Conexão macho p/ gás 16mm-1/2\"",
  "Cotovelo c/ rosca femea 16mm-1/2\"",
  "Válvula 90 rosca macho 1/2\"",
  "Tanque de louça 500x380mm",
  "Cuba de embutir oval branco gelo 490x365mm",
  "Parafuso p/ fixação de tanque de louça",
  "Bacia sanitaria Aspen",
  "Caixa acoplada com acionamento duo Aspen",
  "Fardamento M (TROPICAL)",
  "Fardamento G (TROPICAL)",
  "Fardamento GG (TROPICAL)",
  "Placa de gesso (50cmx50cm)",
  "Torneira para jardim",
  "Acabamento de registro Link 1/2, 3/4 ou 1",
  "Transformador 112,5 KVA trifásico classe 15 kv",
  "Fita aluminio",
  "Sisal (kg)",
  "Gesso em po (saco) - 40kg",
  "Broxa",
  "Luva eg 50",
  "Luva sd 25",
  "Joelho 45 25mm",
  "Joelho eg 90 40mm",
  "Broca sds Plus 10 mm",
  "Alavanca de ferro 1\"x1,5m",
  "Calça M",
  "Calça G",
  "Calça GG",
  "Óleo gear SAE 90 (20L)",
  "Disjuntor Trifásico 40A",
  "Disjuntor Trifásico 63A",
  "Disjuntor Trifásico 80A",
  "Disjuntor Trifásico 125A",
  "Disjuntor Trifásico 250A",
  "Disjuntor Monofásico 16A",
  "Disjuntor Monofásico 20A",
  "Disjuntor Monofásico 25A",
  "Disjuntor DPS 40KA",
  "Disjuntor DR 25A",
  "Disjuntor DR 32A",
  "Kit de primeiro socorros",
  "Parafuso pitao com bucha (pct 100 und)",
  "Abraçadeira de nylon (pct com 100 und)",
  "Adesivo plástico 175g",
  "Café da manha",
  "Abraçadeira D com cunha leve 3/4\" (chaveta)",
  "Eletroduto rígido DN 32 (und)",
  "Caixa octogonal 4x4",
  "Caixinha 4x2",
  "Caixinha 4x4",
  "Plug monofasico macho",
  "Plug monofasico femea",
  "Fita crepe",
  "Terminal de olhal 10mm",
  "Abafador de ruído tipo concha",
  "Avental de raspa",
  "Luva raspa cano longo",
  "Máscara com filtro P2",
  "Avental de napa",
  "Serra copo 35 mm",
  "Terminal olhal 10mm",
  "Terminal olhal 16mm",
  "Terminal olhal 35mm",
  "Terminal olhal 50mm",
  "Terminal olhal 25mm",
  "Terminal pino 35mm",
  "Conector gut para aterramento",
  "Haste de aterramento",
  "Flange 50mm",
  "Torneira boia 1/2\"",
  "Registro esfera 20mm",
  "Registro esfera 32mm",
  "Bancada cozinha Diamantina (pia+ espelho + borda + balcão + borda)/ 3,12 m²",
  "Bancada gourmet Diamantina (pia+ espelho + borda)/ 1,30 m²",
  "Bancada bwc Diamantina (pias+ espelhos + bordas)/ 2,51 m²",
  "Bancada soleiras Diamantina (soleiras)/ 0,30 m²",
  "Escova carvão martelete",
  "Escova carvão mandril",
  "Terminal olhal 4mm",
  "Terminal pino 4mm",
  "Terminal olhal 2,5mm",
  "Terminal pino 2,5mm",
  "Duto coletor de entulho",
  "Boca para duto coletor de entulho",
  "Cabo de aço para grua (m)",
  "Monoete tanque",
  "Elevatória 1000L",
  "Kit elevatória c/ cesto; parafusos; corrente; ganchos; guia",
  "MB submersivel p/ esgoto 0,4 HP 380v",
  "Bomba submersivel p/ água suja/limpa 1hp 220v",
  "Bomba dosadora 220v",
  "Biorremediador a base de microorganismos naturais ativos (L)",
  "Biomassa vegetal de bambu (m³)",
  "Painel de comando ETE",
  "Eletrodo 6013 3,25mm",
  "Solda foscoper 1,5mm 1/8 (kg)",
  "Graxa para elevador (balde)",
  "Vedacalha (bisnaga)",
  "Prego 15x15 (kg)",
  "Bocal E27 com rabicho",
  "Rodo",
  "Espacador cruzeta 3 mm (pct 100 und)",
  "Plug femea 5 polos",
  "Perfil 5\" ENR",
  "Mangote p/ vibrador 45mm",
  "Disco segmentado p/ makita",
  "Fita autofusao",
  "Cadeirinha p/ descida em fachadas",
  "Caixa polar para split",
  "Parafuso maq PH 4x40 (ele. crema)",
  "Arruela lisa 3/16 ZB (ele. crema)",
  "Porca sex 4mm (ele. crema)",
  "Te EG 100/50",
  "Junção 100/100",
  "Joelho eg 45 de 50",
  "Te eg 50/50",
  "Joelho eg 90 de 50",
  "Junção eg 90 de 40",
  "Junção eg 50/50",
  "Joelho eg 90 de 75",
  "Junção eg 50/75",
  "Junção 75/75",
  "Vassoura de palha",
  "Kit batente + alizares",
  "Porta madeira 60 cm",
  "Porta madeira 70 cm",
  "Porta madeira 80 cm",
  "Joelho reforçado de 100 ESG",
  "Joelho 90 de 40 com anel",
  "Detergente",
  "Trena starret 8m",
  "Broca para concreto 25mmx260cm (elevador)",
  "Joelho sd 45 de 32",
  "Te sd de 32mm",
  "Torneira p/ cozinha parede com arejador",
  "Cadeado 40 mm",
  "Churrasqueira em alvenaria(80x60)",
  "Cantoneira 1\"x3/16\" ( p/ bancadas) - 10,8 kg/barra",
  "Zarcao (18 L)",
  "Parafuso com porca e arruela (betoneira)",
  "Tela p/ protecao de fachada (veu de noiva) - m²",
  "Perfil de aluminio p/ contramarco (m)",
  "Cantoneira p/ perfil de contramarco",
  "Botoeira de seg. para banca de serra c/ chave",
  "Protetor de cremalheira (betoneira)",
  "Plástico p/ projetos",
  "Rejunte siliconado cinza platina (kg)",
  "Revestimento externo branco (Eliane Mesh 10x10)",
  "Revestimento externo cinza (Eliane Mesh Neutral Agave 10x10)",
  "Revestimento externo terracota ( Eliane Mesh neutral conto 10x10)",
  "Tela Sol FN Q92",
  "Tubo de cobre 15",
  "Cotovelo de bronze 15x1/2",
  "Conector bico de mamadeira",
  "Cotovelo de bronze 15 90°",
  "Luva fg 2 1/2",
  "Cotovelo 90 FG 2 1/2",
  "Te FG 2 1/2",
  "Nipple 2 1/2",
  "Registro gaveta 2 1/2",
  "Registro esfera 1 1/2",
  "Válvula retenção horizontal 2 1/2",
  "Cotovelo 45 FG 2 1/2",
  "Tubo FG 1 1/4",
  "Tubo FG 2 1/2",
  "Válvula retenção vertical 1 1/4",
  "Redução FG 2 1/2x 1 1/4",
  "Te reduzido FG 2 1/2x 1 1/4",
  "Barra de parafuso rosqueado 3/8",
  "Porca 3/8",
  "Broca aço rápido 1/2\"",
  "Zarcao vermelho (3,6 L)",
  "Rolo anti respingo",
  "Caixa de incendio 90x60 com tampa",
  "Broca chata 1\"x150",
  "Registro angular 2 1/2x45°",
  "Mangueira de incendio 1 1/2 (15 m)",
  "Esguicho regulavel",
  "Chave de mangueira 2 1/2 X 1 1/2",
  "Adaptador storz 2 1/2",
  "Sinalizador audiovisual convencional (110 dB/m - 24 Vcc)",
  "Acionador manual enderecavel",
  "Central de alarme enderecavel",
  "Bateria 12 Vcc",
  "Botijao de gas",
  "Corda trancada 10 mm",
  "Régua de alumínio (2m)",
  "Barbante de nylon (100 m)",
  "PCF90 89x2,10 (vão 0,80)",
  "Regulador de gás 2° estagio",
  "Medidor de gas",
  "Luva eg 75",
  "Disco p/ serra circular manual 7 1/4\"x36",
  "Brita 12mm (carrada)",
  "Tábuas 1,40x0,1",
  "Redução 150x100 EG",
  "Tubo sd 25 mm",
  "Joelho sd 90 20mm",
  "Adaptador sd 20mm",
  "Te sd 20mm",
  "Joelho sd 45 20mm",
  "Caps sd 20mm",
  "Luva sd 20",
  "Gás MAP 400g para maçarico",
  "Tubo FG 4\"",
  "Curva 90 longa 4\" (rosca interna)",
  "Registro gaveta bruto 4\"",
  "Niple 4\" FG",
  "União FG 4\"",
  "Maçarico de boca 5cm",
  "Filtro para bebedouro",
  "Carregador para pilhas AA e 9V",
  "Compressor p/ bebedouro",
  "Botoeira p/ minigrua",
  "Vizeira incolor",
  "Atuador AZM 161",
  "Roldana 2,5\" para portão",
  "Parafuso 5/8 (réguas elev.)",
  "Porca 5/8 (régua elev.)",
  "Arruela 5/8 (régua elev.)",
  "Chave de segurança com travamento AZM 161",
  "Ponteiro SDS Max 18x300 (rompedor)",
  "Argamassa estabilizada (m³)",
  "Luva eg 40",
  "Redução EG 50x40",
  "Bateria minicarregadeira M60GD",
  "Cabo 10mm azul",
  "Cabo 10mm verde",
  "Cabo 10mm vermelho",
  "Cabo 16mm azul",
  "Cabo 16mm verde",
  "Cabo 16mm vermelho",
  "Revestimento amadeirado p/ fachada (Bosco camel 19x90)",
  "Espatula",
  "Esmalte sintético preto",
  "Esmalte sintético amarelo",
  "Torneira p/ cozinha bancada",
  "Chassi chuveiro AF Pex",
  "Chassi travessa AF Pex",
  "Alargador Pex 20/25/32",
  "Alargador Pex 12/16/20/25",
  "Prensa Pex 32/25/20/26",
  "Conexão fixa macho 25x3/4\"",
  "Tesoura corta tubos Pex 16-40mm",
  "Arruela vedação 1\" Pex",
  "Coifa pex 16-32mm",
  "Coifa pex 16-40mm",
  "Coifa pex 16-50-75mm",
  "Canopla acabamento FLE/Pex",
  "Cotovelo Pex 32mm",
  "Cotovelo rosca movel Pex 16x1/2\"",
  "Conexão movel Pex 16x1/2\"",
  "Conexão movel Pex 20x3/4\"",
  "Conexão movel Pex 32x1\"",
  "TEE Conexão PEX 20x16x16",
  "TEE Conexão PEX 20x20x20",
  "TEE Conexão PEX 32x25x32",
  "TEE Conexão PEX 32x25x25",
  "Conexão de derivação Pex 16x1/2\"",
  "União macho Pex 1/2\"",
  "Tubo PERT 16x12,4mm",
  "Tubo PERT 20x16,2mm",
  "Tubo PERT 25x20,4mm",
  "Tubo PERT 32x26,2mm",
  "Mangueira de aço inox 35mm Pex",
  "Porcelanato interno Chicago Nebbia 80x80",
  "Porcelanato externo Tribeca Nebbia 90x90",
  "Assento p /vaso sanitario",
  "Arame galvanizado (n° 18)",
  "Rodel p/ riscadeira 7x100mm",
  "Luva de emenda compressão 10mm",
  "Nível a laser (esquadro)",
  "Graxa para maquinas",
  "Tela arame galvanizada onda 2\"",
  "Telha GL TZ 0,4 (m²)",
  "Telha cumeeira GL TZ 0,4 600 mm (und)",
  "Lente T-10 verde 50x107 tons 10",
  "Bateria manipulador",
  "Lavatório plastico 36x28",
  "Tomada simples 20A",
  "Caixa descarga",
  "Recarga extintor BC 6kg",
  "Recarga extintor ABC 6kg",
  "Riscadeira 125 cm",
  "Base 45°corte porcelanato",
  "Ventosa dupla p/ pisos 90kg",
  "Espacador nivelador 1,5mm (1000 und)",
  "Cunhas p/ nivelamento (500 und)",
  "Metalon 20x30 (n° 18)",
  "Metalon 20x20 (n° 18)",
  "Metalon 20x50 (n° 18)",
  "Montante 48 mm p/ drywall",
  "Guia 48 mm p/ drywall",
  "Correia para peneira eletrica(A-43)",
  "Batente PCF P90 90,5x2,12 (vão 0,80)",
  "Cabo p/ picareta",
  "Cabo p/ Enxada",
  "Chapa 14 (1,00x2,00) - 32,04 kg/chapa",
  "Porta de aluminio preta 700 x 2100",
  "Perfil 4\" ENR (100x40) - 17,43 kg/und",
  "Perfil 3\" ENR (75x40) - 15,57 kg/und",
  "Talhadeira SDS p/ furadeira 250mm",
  "Ponteiro SDS p/furadeira 250 mm",
  "Maxim-ar aluminio preta 1500 x 500",
  "Argamassa ACIII interna e externa (15 kg)",
  "Tubo sd 32 mm",
  "Piso amadeirado 60x60",
  "Quadro distribuicao 5 circuitos",
  "Luva sd 50",
  "Joelho sd 90 50mm",
  "Te sd 50x50",
  "Tubo sd 50mm",
  "Registro esfera vs 25mm",
  "Registro esfera vs 50mm",
  "Espacador nivelador 2mm",
  "Torneira de bancada p/ bwc",
  "Chuveiro",
  "Chuveirao",
  "Acabamento de registro (Diamantina)",
  "Armador batom cromatizado (cx c/ 10 pares)",
  "Terminal de pino 10mm",
  "Curva sd 90 50mm",
  "Uniao sd 50mm",
  "Solda estanho em fio (bobina)",
  "Espaçador cruzeta 2mm (pct 100und)",
  "Lixa p/ massa 120 (resma)",
  "Rebotecflex laje (balde 20kg)",
  "Esponja abrasiva",
  "Linhas de 6x13 (3m)",
  "Ralo quebra onda latao",
  "Fonte de alimentação 12V",
  "Conjunto de conexoes",
  "Areia filtrante para piscina (kg)",
  "Bomba p/ piscina 1 cv",
  "Refletor led 9W 12 V 80mm",
  "Ralo fundo inox 50mm",
  "Dispositivo aspiração 1 1/2",
  "Dispositivo retorno 50mm",
  "Filtro 12,5m³/h 1 cv",
  "Veneno p/ rato",
  "Contrapiso bombeado",
  "Escova carvão makita",
  "Escova carvão policorte",
  "Estilete",
  "Tesoura funileiro 10\"",
  "Fita perfurada 19mmx30m (caixa c/ 5 und)",
  "Broca aço rápido 1/4\"",
  "Protetor facial",
  "Barra chata 1\"x3/16\"",
  "Rolo de espuma 10 cm",
  "Luva sd bucha de latão 25x3/4\"",
  "Bucha p/ limpeza",
  "Bomba recalque água 9,59 CV (19,09 m³/h)",
  "Desengripante",
  "Escova carvão serra circular manual",
  "Rolo de la",
  "Rolo de espuma 15 cm",
  "Arame p/ cerca",
  "Isolador p/ cerca",
  "Parafuso p/ cerca",
  "Agua raz",
  "Esmalte sintético marrom (galao)",
  "Tubo ind quadrado 50x50x3,00mm",
  "Broca aço rápido 5/8",
  "Bloco intertravado 6cm",
  "Bloco intertravado 8cm",
  "Canaleta F530",
  "Cantoneira 25x30",
  "União de canaleta",
  "Parafuso metal metal PA",
  "Regulador p/ gesso acartonado",
  "Arame 10 p/ drywall (kg)",
  "Parafuso flangeado p/ bucha 8mm",
  "Chapa drywall RU 1,20x1,80",
  "Prego Gold 12x13",
  "Tabica p/ pé solto (perfil cadeirinha) - TN",
  "Lampada 24W embutir",
  "Suporte para rolo",
  "Tubo galvanizado 1\" (n 18 / 1,2 mm)",
  "Carrada de paralelepípedo (12m²)",
  "Cotovelo fixo longo PEX 20x1/2\"",
  "Cotovelo rosca movel PEX 16x1/2\"",
  "Cotovelo fixo macho PEX 16x3/4\"",
  "Conexão fixo macho PEX 16x3/4\"",
  "Conexão fixo macho PEX 20x3/4\"",
  "Conexão fixo macho PEX 25x3/4\"",
  "TEE Conexão PEX 20x16x20",
  "TEE Conexão PEX 25x20x25",
  "TEE Conexão PEX 25x32x25",
  "TEE Conexão PEX 32x32x32",
  "Vedante PEX",
  "Serra copo 1\"",
  "Escova de aço tipo copo 75 mm",
  "Coifa pex 20-50-75mm",
  "Barra chata 1 1/2\"x3/16\"",
  "Bobina galvalume 0,4x700",
  "Bobina galvalume 0,4x900",
  "Eletrodo 2,50x3,50 mm",
  "DF9 - Membrana PU p/ banheiros (m²)",
  "Broca aço rápido 3/16\"",
  "Disco script abrasivo 5\"",
  "Cabo cci 2 vias",
  "Concreto Usinado Conv. - 20 mPa",
  "Parafuso para catraca pequeno",
  "Parafuso médio para gaiola",
  "Arruela para parafuso médio de gaiola",
  "Parafuso para catraca grande",
  "Arruela para parafuso de catraca grande",
  "Esticador para balancinho",
  "Rolete para elevador cremalheira",
  "Breu para calçamento",
  "Chave liga desliga botao",
  "Perfil I para elevadores (2,40 m) W150x18",
  "Madeirite rosa p/ fechamento (1,10x2,20)",
  "Tubo galvanizado 1 1/4\" (n 16/1,55mm)",
  "Serra copo diamantado 1 1/4\" sds plus",
  "Rejunte siliconado cinza grafite (kg)",
  "Cantoneira 1 1/4\"x1/8\"",
  "Máscara para solda",
  "Acido muriatico",
  "Fita gomada",
  "Quadro de distruibuicao 12 circuitos",
  "Quadro de distruibuicao 24 circuitos ou 16 nema",
  "Quadro de distruibuicao 10 circuitos",
  "Quadro de distruibuicao 36 circuitos",
  "Quadro de distruibuicao 24 circuitos ou 18 nema",
  "Uniao FG 2 1/2\"",
  "Rejunte externo",
  "Disco de corte contínuo eco",
  "Disco de corte 4\" 1/2x3/64 (politriz)",
  "Caixa de passagem de embutir fundo metálico 40x40",
  "Caixa de passagem de embutir fundo metálico tampa lisa 40x40",
  "Caixa de passagem de embutir fundo metálico tampa lisa 60x60",
  "Caixa de passagem de embutir fundo metálico tampa lisa 80x80",
  "Caixa de passagem de embutir fundo metálico tampa de abrir 100x100",
  "Caixa de passagem de embutir fundo metálico tampa de abrir 120x120",
  "Caixa de passagem de embutir fundo madeira tampa lisa 60x60",
  "Caixa de passagem de embutir fundo madeira tampa abrir 60x60",
  "Caixa de passagem de embutir fundo madeira tampa abrir 40x40",
  "Caixa de passagem de embutir fundo madeira tampa abrir 80x80",
  "Caixa de passagem de embutir fundo madeira tampa abrir 20x20",
  "Caixa de passagem de embutir fundo metálico tampa de abrir 70x60",
  "Caixa de passagem de embutir fundo metálico tampa de abrir 40x40",
  "Tampa de abrir 60x60",
  "Arrebitador manual",
  "Caixa arrebitado 1 1/2 (100 und)",
  "Reforço curva duto entulho",
  "Janela de Correr em Aluminio (1500x1100)",
  "Janela de Correr em Aluminio (1200x1100)",
  "Janela com limitador (600x500)",
  "Janela com limitador (500x800)",
  "Janela Fixo (450x1100x500)",
  "Pingadeira (1500x120)",
  "Pingadeira (1100x120)",
  "Pingadeira (850x120)",
  "Pingadeira (800x120)",
  "Pingadeira (1900x120)",
  "Pingadeira (400x120)",
  "Pingadeira (2000x120)",
  "Janela com limitador (400x700)",
  "Janela de Correr em Aluminio (1750x1100)",
  "Porta de correr (1800x2100)",
  "Porta de correr (1200x2100)",
  "Porta de correr (1170x2100)",
  "Porta FDE (700x2100)",
  "Porta FDE (600x2100)",
  "Janela de Correr em Aluminio (3400x1000)",
  "Janela com limitador(1100x500)",
  "Janela com limitador(850x500)",
  "Janela com limitador(800x500)",
  "Janela com limitador(500x800)",
  "Janela de Correr em Aluminio (3500x500)",
  "Janela de Correr em Aluminio (2500x500)",
  "Porta de correr (2900x2100)",
  "Porta de correr (2500x2100)",
  "Pingado(5500x120)",
  "Pingado(4200x120)",
  "Pingado(3400x120)",
  "Barra lisa 18",
  "Massa corrida (18L)",
  "Vidro laminado 3+3",
  "Porta FDD (600x2100)",
  "Trava quedas de segurança",
  "Disco de corte inox (lixadeira pequena) 7x1/16x7/8",
  "1404 Deck - Ana Paula",
  "Janela JCFX (4200x1700)",
  "Porta FDE (800x2100)",
  "Porta FFD (800x2100)",
  "Porta FFE (800x2100)",
  "Porta FFD (900x2100)",
  "Porta de correr (4100x2100)",
  "Janela JCFX (5500x1700)",
  "Janela com limitador(2000x500)",
  "Janela de Correr em Aluminio (1900x500)",
  "Janela com limitador(1800x500)",
  "Janela com limitador(1500x500)",
  "Janela com limitador(1100x800)",
  "Janela com limitador(800x600)",
  "Porta FDD (800x2100)",
  "Esmerilhadeira 720W (politriz)",
  "Rolamento para patinha",
  "Roda para patinha",
  "Marcador permanente",
  "Barramento pente 54 modulos",
  "Cadeado 50 mm",
  "Espelho cozinha verde ubatuba (1,60x0,10)",
  "Espelho cozinha verde ubatuba (1,24x0,12)",
  "Espelho cozinha verde ubatuba (0,60x0,12)",
  "Espelho cozinha verde ubatuba (0,64x0,12)",
  "Bancada lavabo bege T01 (61x50)",
  "Bancada lavabo bege T02 (58x50)",
  "Bancada verde ubatuba coz cooktop (1,60x60)",
  "Bancada verde ubatuba coz cuba (1,27x60)",
  "Bancada verde ubatuba coz tanque (67x60)",
  "Bancada bege Master T02 (70x62)",
  "Bancada bege Reversivel T02 (80x50)",
  "Bancada bege Reversivel T01 (88x50)",
  "Bancada bege Master T01 (106x60)",
  "Bancada churrasqueira são gabriel (130x50)",
  "Espelho bege Master T1 (24x10)",
  "Espelho bege Reversivel T1 (88x10)",
  "Espelho bege Master T1 (60x10)",
  "Espelho bege Reversivel T2 (50x10)",
  "Espelho bege Reversivel T2 (80x10)",
  "Espelho bege Master T2 (70x10)",
  "Espelho bege Master T2 (62x10)",
  "Espelho bege Reversivel T1 (50x10)",
  "Pino para pistola",
  "Ventilador para painel elétrico (elevador cremalheira)",
  "Tábuas de pinus 30cm - 3m",
  "Barrote de pinus 6x6 - 3m",
  "Metalon 30x50 (n 18)",
  "Metalon 40x40 (n 18)",
  "Barra chata 2\"x1/16\"",
  "Chapa 18 (1,00x2,00)",
  "Chapa 20 (1,00x2,00)",
  "Perfil de U 2\"",
  "Cantoneira 5/8\"x1/8\"",
  "Tubo 2\" (n 18)",
  "Tubo 2\" (n 20)",
  "Tubo 1\" (n 18)",
  "Curva 2\" (n 18)",
  "Cantoneira 1\"x1/8\"",
  "Caixa elétrica 4x2 p/ drywall",
  "Caixa p/ comando 40x40x19",
  "Tela p/ Reforço fachada 25x25",
  "Rolamento p/ rolete",
  "Frechal (3m)",
  "Grampo para cabo de aco ASM",
  "Disco desbaste diamantado 115mm",
  "Latex amarelo 3 L",
  "Cabo flex 6,0 mm vermelho",
  "Vedamat (caixa)",
  "Cabo PP 4x1,5mm",
  "Bateria 23A 12v",
  "Redução sd 25x20",
  "Bucha p/ drywall",
  "Telha para perímetro canteiro 2700mm",
  "Pincel",
  "Disjuntor DR 30A",
  "Escova de aço 4 fileiras",
  "Elevador Atlas Schindler",
  "Disjuntor Trifásico 40A cx moldada",
  "Superfachada 36h",
  "Broca aço rápido 3/8\"",
  "Broca sds Plus 7mm",
  "Pistola para fixacao",
  "Fincapino Cal 27 amarelo",
  "Pino liso 14x27",
  "Eletroduto rígido DN 50",
  "Manta fria de aluminio",
  "Soprador termico",
  "Tampa cega 4x2",
  "Bucha S7",
  "Chave combinada 32",
  "Clipe 3/8",
  "Chave contatora",
  "Disjuntor Trifásico 20A",
  "Quadro agrupado p/ 32 medidores",
  "Quadro agrupado p/ 24 medidores",
  "CPG",
  "União FG 1 1/4\"",
  "Concertina",
  "Tela de poliester p/ impermeabilizacao",
  "Caixa plástica com furos 22 mm",
  "Chapa drywall RF 1,20x1,80",
  "Vedafriso (12 kg)",
  "Tarucel 20mm",
  "PU 25 (980 g)",
  "PU 40 (400 g)",
  "Lubrificante para pistola",
  "Ferrolho",
  "Calha para girica",
  "Barra roscada 5/8\"",
  "Bloco de concreto 0,14x0,19x0,19 (banda)",
  "Cabo flex 6,0 mm verde",
  "Cabo flex 6,0 mm azul",
  "Cabo de cobre 35 mm",
  "Cabo de cobre nu 50 mm",
  "Canaleta de concreto 0,14x0,19x0,39",
  "Lampada 15W",
  "Cabo de cobre nu 35mm",
  "Placa de forro PVC",
  "Quadro agrupados de 6 medidores",
  "Fechadura para porta principal + puxador",
  "Fechadura para bwc",
  "Fechadura interna",
  "Fechadura externa",
  "Folha de porta de pivo de 100 cm",
  "Folha de porta de giro 90 cm",
  "Folha de porta de giro 80 cm",
  "Folha de porta de giro 70 cm",
  "Folha de porta de giro 60 cm",
  "Batente p/ parede 14cm",
  "Batente p/ parede 15cm",
  "Batente p/ parede 16cm",
  "Fechadura para porta de correr",
  "Folha de porta de correr 70 cm",
  "Batente p/ parede 22cm",
  "Espacador cruzeta 4 mm (pct 100 und)",
  "Fardamento M (EM VASCONCELOS)",
  "Fardamento G (EM VASCONCELOS)",
  "Fardamento GG (EM VASCONCELOS)",
  "Fardamento M (DM VASCONCELOS)",
  "Fardamento G (DM VASCONCELOS)",
  "Fardamento GG (DM VASCONCELOS)",
  "Bota de couro 39",
  "Bota de couro 40",
  "Bota de couro 41",
  "Bota de couro 42",
  "Bota de couro 43",
  "Bota de couro 44",
  "Bota de couro 45",
  "Oleo ISO VG 220",
];

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

      // Notificar via N8N webhook
      try {
        await fetch("http://116a2f5e9f5b.ngrok-free.app/webhook/27efb4ea-eeb6-42d9-8742-7e21f9c3c704", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          mode: "no-cors",
          body: JSON.stringify({
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
          }),
        });
        console.log("Notificação enviada via N8N");
      } catch (webhookError) {
        console.error("Erro ao enviar notificação N8N:", webhookError);
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
                        <Select
                          value={item.produto}
                          onValueChange={(value) =>
                            updateItem(index, "produto", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50 max-h-[300px]">
                            {produtos.map((prod) => (
                              <SelectItem key={prod} value={prod}>
                                {prod}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
