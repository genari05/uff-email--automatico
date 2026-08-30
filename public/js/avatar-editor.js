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

  function enviarArquivo(file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    hiddenFotoInput.files = dt.files;

    if (avatarForm.requestSubmit) {
      avatarForm.requestSubmit();
    } else {
      avatarForm.submit();
    }
  }

  // ---------- Selecionar do dispositivo ----------
  btnEscolherArquivo.addEventListener('click', () => {
    avatarMenu.hidden = true;
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    enviarArquivo(file);
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
    // Recorta automaticamente um quadrado central do vídeo (sem etapa manual)
    const videoW = cameraVideo.videoWidth;
    const videoH = cameraVideo.videoHeight;
    const lado = Math.min(videoW, videoH);
    const offsetX = (videoW - lado) / 2;
    const offsetY = (videoH - lado) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    canvas.getContext('2d').drawImage(cameraVideo, offsetX, offsetY, lado, lado, 0, 0, 400, 400);

    canvas.toBlob((blob) => {
      pararCamera();
      cameraModal.hidden = true;
      if (blob) enviarArquivo(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  });
})();
