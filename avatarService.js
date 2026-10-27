const supabase = require('../config/supabase');

const BUCKET = 'avatars';
const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Envia o buffer da imagem pro Supabase Storage e retorna a URL
 * pública. Usa o próprio ID da pessoa como nome do arquivo, então
 * subir uma foto nova substitui a antiga automaticamente.
 */
async function uploadAvatar({ personId, buffer, mimetype }) {
  if (!TIPOS_ACEITOS.includes(mimetype)) {
    throw new Error('Formato de imagem não aceito. Use JPG, PNG ou WEBP.');
  }

  const extensao = mimetype.split('/')[1];
  const caminho = `${personId}.${extensao}`;

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, buffer, { contentType: mimetype, upsert: true });

  if (erroUpload) throw erroUpload;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);

  // Adiciona um parâmetro pra "furar" cache do navegador quando a foto muda
  return `${data.publicUrl}?v=${Date.now()}`;
}

module.exports = { uploadAvatar };
