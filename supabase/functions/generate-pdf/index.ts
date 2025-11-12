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

    // Helper to detect image type by magic bytes
    const isPngBytes = (bytes: Uint8Array) => {
      const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      return sig.every((b, i) => bytes[i] === b);
    };

    // Header - Logo - Upload to storage if not exists, then fetch
    let headerBottomY = height - 140;
    try {
      // Check if logo exists in storage
      const { data: files } = await supabase.storage.from('imagem').list('', { search: 'tropical.jpg' });
      
      // If logo doesn't exist, upload it from public URL
      if (!files || files.length === 0) {
        console.log('Logo not found in storage, uploading...');
        const publicLogoRes = await fetch('https://cjupfccqeoftscmysemb.supabase.co/storage/v1/object/public/imagem/tropical.jpg');
        if (publicLogoRes.ok) {
          const logoBlob = await publicLogoRes.blob();
          await supabase.storage.from('imagem').upload('tropical.jpg', logoBlob, {
            contentType: 'image/jpeg',
            upsert: true
          });
        }
      }
      
      // Fetch logo from storage
      const logoUrl = `${supabaseUrl}/storage/v1/object/public/imagem/tropical.jpg`;
      const res = await fetch(logoUrl);
      if (!res.ok) throw new Error(`Falha ao carregar logo: ${res.status}`);
      const buf = await res.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const logoImage = isPngBytes(bytes)
          ? await pdfDoc.embedPng(bytes)
          : await pdfDoc.embedJpg(bytes);
        // Scale logo to fit a box ~260x80 preserving aspect ratio
        const maxLogoWidth = 260;
        const maxLogoHeight = 80;
        const widthScale = maxLogoWidth / logoImage.width;
        const heightScale = maxLogoHeight / logoImage.height;
        const scale = Math.min(widthScale, heightScale);
        const drawW = logoImage.width * scale;
        const drawH = logoImage.height * scale;
        const logoY = height - 40 - drawH; // 40 top margin
        page.drawImage(logoImage, {
          x: 50,
          y: logoY,
          width: drawW,
          height: drawH,
        });
        headerBottomY = logoY;
      } catch (error) {
        console.error('Erro ao carregar a logo:', error);
      }
    }

    // Right-side header title and requisition number
    const titleY = height - 70;
    const titleText = "REQUISIÇÃO DE  MATERIAL";
    const titleSize = 14;
    const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);
    const titleX = width - 60 - titleWidth; // right aligned inside margin
    page.drawText(titleText, {
      x: titleX,
      y: titleY,
      size: titleSize,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    const idBoxPaddingX = 8;
    const idBoxPaddingY = 6;
    const idText = `<<${requisicaoId}>>`;
    const idSize = 12;
    const idTextWidth = font.widthOfTextAtSize(idText, idSize);
    const idBoxWidth = idTextWidth + idBoxPaddingX * 2;
    const idBoxHeight = idSize + idBoxPaddingY * 2;
    const idBoxX = width - 60 - idBoxWidth;
    const idBoxY = titleY - 28;
    // Box
    page.drawRectangle({
      x: idBoxX,
      y: idBoxY,
      width: idBoxWidth,
      height: idBoxHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });
    // ID text
    page.drawText(idText, {
      x: idBoxX + idBoxPaddingX,
      y: idBoxY + idBoxPaddingY - 1,
      size: idSize,
      font,
      color: rgb(0.8, 0, 0),
    });

    // Company info under logo (left block)
    let infoY = headerBottomY - 10;
    page.drawText("CONSTRUTORA E IMOBILIÁRIA TROPICAL LTDA.", {
      x: 50,
      y: infoY,
      size: 10,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    infoY -= 14;
    page.drawText("Av. Presidente Kennedy, nº 336 - São Cristóvão - CEP: 64.052-335", {
      x: 50,
      y: infoY,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    });
    infoY -= 14;
    page.drawText("Fone: (86) 3232-3979 / Fax: (86) 3231-1832 - Teresina-Piauí", {
      x: 50,
      y: infoY,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    });

    // De / Para row
    infoY -= 20;
    page.drawText("De:", { x: 50, y: infoY, size: 11, font: fontBold, color: rgb(0,0,0) });
    page.drawText(`${requisicao.local_origem || "Escritório"}`, { x: 85, y: infoY, size: 11, font, color: rgb(0,0,0) });
    page.drawText("Para:", { x: width/2 + 60, y: infoY, size: 11, font: fontBold, color: rgb(0,0,0) });
    page.drawText(`${requisicao.destino}`, { x: width/2 + 105, y: infoY, size: 11, font, color: rgb(0,0,0) });

    // Separator
    yPos = infoY - 18;
    page.drawLine({
      start: { x: 50, y: yPos },
      end:   { x: width - 50, y: yPos },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });
    
    yPos -= 20;
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
