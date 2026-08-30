(function () {
  const btnAvatarMenu = document.getElementById('btnAvatarMenu');
  if (!btnAvatarMenu) return; // essa página não tem o editor de avatar

  const avatarMenu = document.getElementById('avatarMenu');
  const btnTirarFoto = document.getElementById('btnTirarFoto');
  const btnEscolherArquivo = document.getElementById('btnEscolherArquivo');
  const fileInput = document.getElementById('fileInput');

  const cameraModal = document.getElementById('cameraModal');
  const cameraVideo = document.getElementById('cameraVideo');
  const cameraErro = document.getElementById('cameraErro');
  const btnCapturar = document.getElementById('btnCapturar');
  const btnCancelarCamera = document.getElementById('btnCancelarCamera');

  const cropModal = document.getElementById('cropModal');
  const cropMask = document.getElementById('cropMask');
  const cropImg = document.getElementById('cropImg');
  const zoomRange = document.getElementById('zoomRange');
  const btnSalvarCrop = document.getElementById('btnSalvarCrop');
  const btnCancelarCrop = document.getElementById('btnCancelarCrop');

  const avatarForm = document.getElementById('avatarForm');
  const hiddenFotoInput = document.getElementById('hiddenFotoInput');

  let cameraStream = null;

  // ---------- Menu (Tirar foto / Selecionar do dispositivo) ----------
  btnAvatarMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    avatarMenu.hidden = !avatarMenu.hidden;
  });
  document.addEventListener('click', (e) => {
    if (!avatarMenu.hidden && !avatarMenu.contains(e.target) && e.target !== btnAvatarMenu) {
      avatarMenu.hidden = true;
    }
  });

  // ---------- Selecionar do dispositivo ----------
  btnEscolherArquivo.addEventListener('click', () => {
    avatarMenu.hidden = true;
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => abrirRecorte(e.target.result);
    reader.readAsDataURL(file);
  });

  // ---------- Tirar foto agora ----------
  btnTirarFoto.addEventListener('click', async () => {
    avatarMenu.hidden = true;
    cameraErro.hidden = true;
    cameraModal.hidden = false;

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      cameraVideo.srcObject = cameraStream;
    } catch (err) {
      cameraErro.textContent = 'Não foi possível acessar a câmera. Verifique as permissões do navegador, ou selecione uma foto do dispositivo.';
      cameraErro.hidden = false;
    }
  });

  function pararCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      cameraStream = null;
    }
  }

  btnCancelarCamera.addEventListener('click', () => {
    pararCamera();
    cameraModal.hidden = true;
  });

  btnCapturar.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = cameraVideo.videoWidth;
    canvas.height = cameraVideo.videoHeight;
    canvas.getContext('2d').drawImage(cameraVideo, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    pararCamera();
    cameraModal.hidden = true;
    abrirRecorte(dataUrl);
  });

  // ---------- Recorte (arrastar + zoom) ----------
  const MASK_SIZE = 240;
  let escalaBase = 1;
  let escalaExtra = 1;
  let posX = 0;
  let posY = 0;
  let arrastando = false;
  let inicioX = 0;
  let inicioY = 0;

  function abrirRecorte(dataUrl) {
    cropImg.onload = () => {
      const nw = cropImg.naturalWidth;
      const nh = cropImg.naturalHeight;
      escalaBase = Math.max(MASK_SIZE / nw, MASK_SIZE / nh);
      escalaExtra = 1;
      zoomRange.value = 1;

      const largura = nw * escalaBase;
      const altura = nh * escalaBase;
      posX = (MASK_SIZE - largura) / 2;
      posY = (MASK_SIZE - altura) / 2;

      aplicarTransform();
      cropModal.hidden = false;
    };
    cropImg.src = dataUrl;
  }

  function aplicarTransform() {
    const escala = escalaBase * escalaExtra;
    cropImg.style.width = `${cropImg.naturalWidth * escala}px`;
    cropImg.style.height = `${cropImg.naturalHeight * escala}px`;
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

  cropMask.addEventListener('mousedown', (e) => iniciarArraste(e.clientX, e.clientY));
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
    escalaExtra = parseFloat(zoomRange.value);
    limitarPosicao();
    aplicarTransform();
  });

  btnCancelarCrop.addEventListener('click', () => {
    cropModal.hidden = true;
    fileInput.value = '';
  });

  // ---------- Salvar: gera a imagem final recortada e envia ----------
  btnSalvarCrop.addEventListener('click', () => {
    const OUTPUT = 400;
    const escala = escalaBase * escalaExtra;

    // Região visível (dentro do círculo) em pixels reais da imagem original
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
