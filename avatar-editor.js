(function () {
  const btnEscolherArquivo = document.getElementById('btnEscolherArquivo');
  if (!btnEscolherArquivo) return; // essa página não tem o editor de avatar

  const fileInput = document.getElementById('fileInput');

  const cropModal = document.getElementById('cropModal');
  const cropMask = document.getElementById('cropMask');
  const cropImg = document.getElementById('cropImg');
  const zoomRange = document.getElementById('zoomRange');
  const btnSalvarCrop = document.getElementById('btnSalvarCrop');
  const btnCancelarCrop = document.getElementById('btnCancelarCrop');

  const avatarForm = document.getElementById('avatarForm');
  const hiddenFotoInput = document.getElementById('hiddenFotoInput');

  // ---------- Abrir seletor de arquivo ----------
  btnEscolherArquivo.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => abrirAjuste(e.target.result);
    reader.readAsDataURL(file);
  });

  // ---------- Ajuste (arrastar + zoom) ----------
  const MASK_SIZE = 240;
  let escalaBase = 1;
  let escalaExtra = 1;
  let posX = 0;
  let posY = 0;
  let arrastando = false;
  let inicioX = 0;
  let inicioY = 0;

  function abrirAjuste(dataUrl) {
    // Pré-carrega numa imagem separada pra já sabermos o tamanho
    // antes de mostrar qualquer coisa na tela (evita ficar em branco).
    const preload = new Image();
    preload.onload = () => {
      const nw = preload.naturalWidth;
      const nh = preload.naturalHeight;

      escalaBase = Math.max(MASK_SIZE / nw, MASK_SIZE / nh);
      escalaExtra = 1;
      zoomRange.value = 1;

      const largura = nw * escalaBase;
      const altura = nh * escalaBase;
      posX = (MASK_SIZE - largura) / 2;
      posY = (MASK_SIZE - altura) / 2;

      cropImg.src = dataUrl;
      cropImg.style.width = `${largura}px`;
      cropImg.style.height = `${altura}px`;
      cropImg.style.transform = `translate(${posX}px, ${posY}px)`;

      cropModal.hidden = false;
    };
    preload.onerror = () => {
      alert('Não foi possível carregar essa imagem. Tente outro arquivo.');
    };
    preload.src = dataUrl;
  }

  function aplicarTransform() {
    cropImg.style.transform = `translate(${posX}px, ${posY}px)`;
  }

  function limitarPosicao() {
    const escala = escalaBase * escalaExtra;
    const largura = cropImg.naturalWidth * escala;
    const altura = cropImg.naturalHeight * escala;

    const minX = MASK_SIZE - largura;
    const minY = MASK_SIZE - altura;

    posX = Math.min(0, Math.max(minX, posX));
    posY = Math.min(0, Math.max(minY, posY));
  }

  function iniciarArraste(x, y) {
    arrastando = true;
    inicioX = x - posX;
    inicioY = y - posY;
  }
  function moverArraste(x, y) {
    if (!arrastando) return;
    posX = x - inicioX;
    posY = y - inicioY;
    limitarPosicao();
    aplicarTransform();
  }
  function pararArraste() { arrastando = false; }

  cropMask.addEventListener('mousedown', (e) => { e.preventDefault(); iniciarArraste(e.clientX, e.clientY); });
  window.addEventListener('mousemove', (e) => moverArraste(e.clientX, e.clientY));
  window.addEventListener('mouseup', pararArraste);

  cropMask.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    iniciarArraste(t.clientX, t.clientY);
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (!arrastando) return;
    const t = e.touches[0];
    moverArraste(t.clientX, t.clientY);
  }, { passive: true });
  window.addEventListener('touchend', pararArraste);

  zoomRange.addEventListener('input', () => {
    // Mantém o centro do que já está visível ao dar zoom, em vez de
    // pular o canto da imagem pra um lugar estranho.
    const escalaAntiga = escalaBase * escalaExtra;
    escalaExtra = parseFloat(zoomRange.value);
    const escalaNova = escalaBase * escalaExtra;

    const centroX = MASK_SIZE / 2;
    const centroY = MASK_SIZE / 2;
    posX = centroX - ((centroX - posX) / escalaAntiga) * escalaNova;
    posY = centroY - ((centroY - posY) / escalaAntiga) * escalaNova;

    const largura = cropImg.naturalWidth * escalaNova;
    const altura = cropImg.naturalHeight * escalaNova;
    cropImg.style.width = `${largura}px`;
    cropImg.style.height = `${altura}px`;

    limitarPosicao();
    aplicarTransform();
  });

  function fecharModal() {
    cropModal.hidden = true;
    fileInput.value = '';
  }

  btnCancelarCrop.addEventListener('click', fecharModal);

  // ---------- Salvar: gera a imagem final recortada e envia ----------
  btnSalvarCrop.addEventListener('click', () => {
    const OUTPUT = 400;
    const escala = escalaBase * escalaExtra;

    const srcX = -posX / escala;
    const srcY = -posY / escala;
    const srcSize = MASK_SIZE / escala;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(cropImg, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT, OUTPUT);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const arquivo = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      const dt = new DataTransfer();
      dt.items.add(arquivo);
      hiddenFotoInput.files = dt.files;

      cropModal.hidden = true;

      if (avatarForm.requestSubmit) {
        avatarForm.requestSubmit();
      } else {
        avatarForm.submit();
      }
    }, 'image/jpeg', 0.9);
  });
})();
