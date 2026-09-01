(function () {
  // Gerador de números pseudo-aleatórios com semente (sempre dá o
  // mesmo resultado pra mesma semente, mas cada carregamento de
  // página usa uma semente diferente).
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Desenha metade de uma mancha de tinta: parte de um ponto no eixo
   * central (topo), balança pra fora e pra dentro de forma irregular
   * (como tinta que escorreu), e volta pro eixo central (embaixo).
   * A borda é feita de segmentos retos, não curvas suaves - é isso
   * que dá a aparência de mancha e não de "bolha".
   */
  function desenharMetade(rng, opts) {
    const { cx, topY, bottomY, baseR, jag, points, lobes, maxR } = opts;
    const pontos = [];

    for (let i = 0; i <= points; i++) {
      const t = i / points;
      const envelope = Math.sin(Math.PI * t); // 0 no topo/base, pico no meio
      const ondulacao = 1 + 0.4 * Math.sin(t * Math.PI * lobes + rng() * 6);
      const irregular = 1 + (rng() - 0.5) * jag;
      let r = baseR * envelope * ondulacao * irregular;
      r = Math.max(0, Math.min(r, maxR));
      const y = topY + t * (bottomY - topY);
      pontos.push([cx + r, y]);
    }

    // Garante que começa e termina exatamente no eixo central
    pontos[0] = [cx, topY];
    pontos[pontos.length - 1] = [cx, bottomY];

    return 'M ' + pontos.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L ') + ' Z';
  }

  /**
   * Pequenos respingos de tinta ao lado da mancha principal -
   * detalhe clássico das manchas de Rorschach de verdade.
   */
  function desenharRespingos(rng, cx, faixaY, quantidade) {
    let svg = '';
    for (let i = 0; i < quantidade; i++) {
      const y = faixaY[0] + rng() * (faixaY[1] - faixaY[0]);
      const distancia = 6 + rng() * 20;
      const raio = 2.5 + rng() * 6;
      svg += `<circle cx="${(cx + distancia).toFixed(1)}" cy="${y.toFixed(1)}" r="${raio.toFixed(1)}" />`;
    }
    return svg;
  }

  function gerarForma(seed) {
    const rng = mulberry32(seed);
    const d = desenharMetade(rng, {
      cx: 100,
      topY: 24,
      bottomY: 216,
      baseR: 55 + rng() * 15,
      jag: 0.5,
      points: 20,
      lobes: 2 + Math.floor(rng() * 2),
      maxR: 85,
    });
    const respingos = desenharRespingos(rng, 100, [70, 170], 2 + Math.floor(rng() * 3));
    return { d, respingos };
  }

  function montarSvg(svgEl, indiceSemente) {
    const letras = ['a', 'b', 'c'];
    const formas = letras.map((_, i) => gerarForma(1000 + indiceSemente * 137 + i * 53));

    let conteudo = '<g>';
    formas.forEach((forma, i) => {
      conteudo += `<g class="blot-path blot-${letras[i]}"><path d="${forma.d}" />${forma.respingos}</g>`;
    });
    conteudo += '</g>';

    conteudo += '<g transform="scale(-1,1) translate(-200,0)"><g>';
    formas.forEach((forma, i) => {
      conteudo += `<g class="blot-path blot-${letras[i]}"><path d="${forma.d}" />${forma.respingos}</g>`;
    });
    conteudo += '</g></g>';

    svgEl.innerHTML = conteudo;
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.blot-svg').forEach((svg, i) => {
      montarSvg(svg, i + Math.floor(Math.random() * 1000));
    });
  });
})();
