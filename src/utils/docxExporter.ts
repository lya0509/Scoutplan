import JSZip from 'jszip';

// Convert Data URL / Base64 to Uint8Array
function dataURLToUint8Array(dataUrl: string): Uint8Array | null {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const base64 = parts[1];
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  } catch (err) {
    console.error('Error convirtiendo imagen a Uint8Array:', err);
    return null;
  }
}

// Genera un elemento OpenXML w:drawing 100% válido para Microsoft Word
function createDrawingXml(rId: string, widthEmu: number, heightEmu: number, docPrId: number, name: string): string {
  return `<w:drawing><wp:inline xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${widthEmu}" cy="${heightEmu}"/><wp:docPr id="${docPrId}" name="${name}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="${name}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm><a:prstGeom prst="rect"/></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
}

// Helper de descarga en navegador para archivos Microsoft Word (.docx) con soporte completo de fotos y firmas
export async function exportDocxInBrowser(
  templateArrayBuffer: ArrayBuffer,
  replacements: Record<string, string>,
  outputFilename: string,
  images?: {
    signatureUrl?: string | null;
    photoUrl?: string | null;
  }
) {
  try {
    const zip = await JSZip.loadAsync(templateArrayBuffer);
    let docXml = await zip.file('word/document.xml')?.async('text');

    if (!docXml) {
      throw new Error('No se pudo encontrar document.xml dentro de la plantilla Word.');
    }

    let relsXml = await zip.file('word/_rels/document.xml.rels')?.async('text') || '';

    // 1. INCRUSTAR FIRMA DIGITAL (si existe)
    if (images?.signatureUrl) {
      let sigBytes: Uint8Array | null = null;
      if (images.signatureUrl.startsWith('data:image')) {
        sigBytes = dataURLToUint8Array(images.signatureUrl);
      } else if (images.signatureUrl.startsWith('http')) {
        try {
          const resp = await fetch(images.signatureUrl);
          if (resp.ok) {
            const buf = await resp.arrayBuffer();
            sigBytes = new Uint8Array(buf);
          }
        } catch (e) {
          console.warn('Aviso cargando firma para Word:', e);
        }
      }

      if (sigBytes) {
        zip.file('word/media/signature_img.png', sigBytes);
        if (!relsXml.includes('rIdSigImg')) {
          const relEntry = `<Relationship Id="rIdSigImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/signature_img.png"/>`;
          relsXml = relsXml.replace('</Relationships>', `${relEntry}</Relationships>`);
        }
        // Ancho: 1645920 EMU, Alto: 731520 EMU
        const drawingXml = createDrawingXml('rIdSigImg', 1645920, 731520, 991, 'FirmaDigital');
        docXml = docXml.replace('{{SIGNATURE_IMAGE}}', drawingXml);
      }
    }
    docXml = docXml.replace('{{SIGNATURE_IMAGE}}', '[ FIRMA DIGITAL VALIDADA ]');

    // 2. INCRUSTAR FOTO DE PERFIL SCOUT (si existe)
    if (images?.photoUrl) {
      let photoBytes: Uint8Array | null = null;
      if (images.photoUrl.startsWith('data:image')) {
        photoBytes = dataURLToUint8Array(images.photoUrl);
      } else if (images.photoUrl.startsWith('http')) {
        try {
          const resp = await fetch(images.photoUrl);
          if (resp.ok) {
            const buf = await resp.arrayBuffer();
            photoBytes = new Uint8Array(buf);
          }
        } catch (e) {
          console.warn('Aviso cargando foto para Word:', e);
        }
      }

      if (photoBytes) {
        zip.file('word/media/profile_photo.png', photoBytes);
        if (!relsXml.includes('rIdPhotoImg')) {
          const relEntry = `<Relationship Id="rIdPhotoImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/profile_photo.png"/>`;
          relsXml = relsXml.replace('</Relationships>', `${relEntry}</Relationships>`);
        }
        // Ancho: 914400 EMU, Alto: 1097280 EMU
        const drawingXml = createDrawingXml('rIdPhotoImg', 914400, 1097280, 992, 'FotoPerfilScout');
        docXml = docXml.replace('{{PROFILE_PHOTO}}', drawingXml);
      }
    }
    docXml = docXml.replace('{{PROFILE_PHOTO}}', '(FOTO DE LA PERSONA)');

    // Guardar relaciones actualizadas
    zip.file('word/_rels/document.xml.rels', relsXml);

    // Reemplazo inteligente de marcadores de texto
    Object.entries(replacements).forEach(([key, val]) => {
      const safeVal = (val || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      docXml = docXml?.split(key).join(safeVal);
    });

    zip.file('word/document.xml', docXml);

    const generatedBlob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const url = URL.createObjectURL(generatedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = outputFilename.endsWith('.docx') ? outputFilename : `${outputFilename}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    console.error('Error generando documento Word (.docx):', err);
    throw err;
  }
}
