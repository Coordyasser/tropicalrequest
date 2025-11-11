import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requisicaoId } = await req.json();
    
    if (!requisicaoId) {
      throw new Error("ID da requisição é obrigatório");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch requisição data
    const { data: requisicao, error: reqError } = await supabase
      .from('requisicoes')
      .select('*')
      .eq('id', requisicaoId)
      .single();

    if (reqError) throw reqError;

    // Fetch items
    const { data: itens, error: itensError } = await supabase
      .from('itens_requisicao')
      .select('*')
      .eq('requisicao_id', requisicaoId);

    if (itensError) throw itensError;

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let yPos = height - 50;
    
    // Header - Company name
    page.drawText("CONSTRUTORA", {
      x: width / 2 - 60,
      y: yPos,
      size: 16,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    
    yPos -= 20;
    page.drawText("CONSTRUTORA E IMOBILIÁRIA TROPICAL LTDA.", {
      x: width / 2 - 140,
      y: yPos,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });
    
    yPos -= 15;
    page.drawText("Av. Presidente Kennedy, nº 336 - São Cristóvão - CEP: 64.052-335", {
      x: width / 2 - 185,
      y: yPos,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    });
    
    yPos -= 15;
    page.drawText("Fone: (86) 3232-3979 / Fax: (86) 3231-1832 - Teresina-Piauí", {
      x: width / 2 - 160,
      y: yPos,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    });
    
    yPos -= 30;
    page.drawText(`De: ${requisicao.local_origem || "Almoxarifado"}`, {
      x: 50,
      y: yPos,
      size: 11,
      font,
      color: rgb(0, 0, 0),
    });
    
    yPos -= 20;
    page.drawText(`Para: ${requisicao.destino}`, {
      x: 50,
      y: yPos,
      size: 11,
      font,
      color: rgb(0, 0, 0),
    });
    
    yPos -= 30;
    page.drawText("Autorizo a entrega ao portador dos itens discriminados abaixo:", {
      x: 50,
      y: yPos,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });
    
    // Items table header
    yPos -= 25;
    page.drawRectangle({
      x: 50,
      y: yPos - 5,
      width: 495,
      height: 20,
      color: rgb(0.9, 0.9, 0.9),
    });
    
    page.drawText("Item", {
      x: 60,
      y: yPos,
      size: 10,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    
    page.drawText("Produto", {
      x: 120,
      y: yPos,
      size: 10,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    
    page.drawText("Unid.", {
      x: 400,
      y: yPos,
      size: 10,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    
    page.drawText("Quant.", {
      x: 480,
      y: yPos,
      size: 10,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    
    // Items
    yPos -= 25;
    itens?.forEach((item: any, index: number) => {
      if (yPos < 100) {
        // Add new page if needed
        const newPage = pdfDoc.addPage([595, 842]);
        yPos = height - 50;
      }
      
      page.drawText(`${index + 1}`, {
        x: 60,
        y: yPos,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
      
      const produtoText = item.produto.length > 50 ? item.produto.substring(0, 47) + "..." : item.produto;
      page.drawText(produtoText, {
        x: 120,
        y: yPos,
        size: 9,
        font,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(item.unidade, {
        x: 400,
        y: yPos,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(item.quantidade.toString(), {
        x: 480,
        y: yPos,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
      
      yPos -= 20;
    });
    
    // Date
    yPos -= 20;
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    page.drawText(`Teresina, ${dataAtual}`, {
      x: 50,
      y: yPos,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });
    
    // Signature fields
    yPos -= 40;
    page.drawLine({
      start: { x: 50, y: yPos },
      end: { x: 200, y: yPos },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    page.drawText("Autorização", {
      x: 90,
      y: yPos - 15,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    });
    
    yPos -= 40;
    page.drawLine({
      start: { x: 50, y: yPos },
      end: { x: 200, y: yPos },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    page.drawText("Assinatura Recebedor", {
      x: 75,
      y: yPos - 15,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    });
    
    page.drawLine({
      start: { x: 345, y: yPos },
      end: { x: 495, y: yPos },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    page.drawText("Assinatura Entregador", {
      x: 365,
      y: yPos - 15,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    });
    
    // Footer - Control table
    yPos -= 50;
    page.drawText("Controle de Registro:", {
      x: 50,
      y: yPos,
      size: 8,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    
    yPos -= 15;
    page.drawRectangle({
      x: 50,
      y: yPos - 5,
      width: 495,
      height: 15,
      color: rgb(0.9, 0.9, 0.9),
    });
    
    const footerHeaders = [
      { text: "IDENTIFICAÇÃO", x: 55 },
      { text: "ARMAZENAMENTO", x: 150 },
      { text: "PROTEÇÃO", x: 255 },
      { text: "RECUPERAÇÃO", x: 330 },
      { text: "TEMPO DE RETENÇÃO", x: 410 },
      { text: "DESCARTE", x: 500 }
    ];
    
    footerHeaders.forEach(header => {
      page.drawText(header.text, {
        x: header.x,
        y: yPos,
        size: 7,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
    });
    
    yPos -= 15;
    const footerData = [
      { text: "REQUISIÇÃO DE MATERIAL", x: 55 },
      { text: "PASTA", x: 170 },
      { text: "POR MÊS", x: 330 },
      { text: "DA OBRA", x: 425 },
      { text: "DESTRUIR", x: 500 }
    ];
    
    footerData.forEach(data => {
      page.drawText(data.text, {
        x: data.x,
        y: yPos,
        size: 7,
        font,
        color: rgb(0, 0, 0),
      });
    });
    
    yPos -= 20;
    page.drawText("1ª VIA BRANCA / 2ª VIA AZUL", {
      x: width / 2 - 65,
      y: yPos,
      size: 7,
      font,
      color: rgb(0, 0, 0),
    });
    
    page.drawText("FORM. 071/00", {
      x: width / 2 - 30,
      y: yPos - 10,
      size: 7,
      font,
      color: rgb(0, 0, 0),
    });
    
    // Convert PDF to bytes
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = new Uint8Array(pdfBytes);
    
    // Upload to storage
    const fileName = `requisicao_${requisicaoId}_${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('requisicoes_pdfs')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('requisicoes_pdfs')
      .getPublicUrl(fileName);

    // Update requisição with PDF URL
    const { error: updateError } = await supabase
      .from('requisicoes')
      .update({ pdf_url: publicUrl })
      .eq('id', requisicaoId);

    if (updateError) throw updateError;

    console.log('PDF generated successfully:', fileName);

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdfUrl: publicUrl,
        fileName 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});