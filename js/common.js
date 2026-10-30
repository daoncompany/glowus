/* GLOWUS 기업소개 — 모든 페이지 공통
   헤더(재질·밝은 구간 반전·현재 메뉴), 등장 모션, 숫자 카운트, 단어 밝아짐, 사진 줄 자동 넘김 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  // 요소가 화면을 지나가는 진행률(0~1)
  const progress = (el, start = 1, end = 0) => {
    const r = el.getBoundingClientRect(), h = innerHeight;
    return clamp((h * start - r.top) / (r.height + h * (start - end)));
  };

  /* 스크롤 연동: 한 프레임에 한 번만 계산 */
  const jobs = [];
  let ticking = false;
  const run = () => { ticking = false; jobs.forEach(f => f()); };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  const onFrame = f => { jobs.push(f); onScroll(); };

  /* 헤더: 스크롤하면 반투명 재질, 밝은 구간 위에 있으면 글자색 반전 */
  const hd = $('#hd'), dock = $('#dock'), lights = $$('.light');
  onFrame(() => {
    hd.classList.toggle('scrolled', scrollY > 10);
    const y = hd.offsetHeight / 2;
    hd.classList.toggle('on-light', lights.some(s => { const r = s.getBoundingClientRect(); return r.top <= y && r.bottom > y; }));
    dock?.classList.toggle('show', scrollY > innerHeight * .8);
  });

  /* 현재 페이지 메뉴 표시 */
  const page = location.pathname.split('/').pop() || 'index.html';
  $$('.gnb>li>a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === page));

  /* 모바일 메뉴: 항목을 누르면 닫힘 */
  const mnav = $('#mnav');
  mnav?.addEventListener('click', e => { if (e.target.closest('a')) mnav.hidePopover(); });

  /* 등장 모션 + 숫자 카운트 */
  const countUp = el => {
    if (reduce) return;
    const to = +el.dataset.count, t0 = performance.now(), d = 1400;
    const tick = now => {
      const k = clamp((now - t0) / d), e = 1 - Math.pow(1 - k, 4);
      el.textContent = Math.round(to * e).toLocaleString('ko-KR');
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    $$('[data-count]', e.target).forEach(countUp);
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -12% 0px' });
  $$('[data-reveal]').forEach(el => io.observe(el));

  /* 문단을 단어로 나눠 스크롤 따라 밝아지게 (span.hl 은 강조색) */
  $$('.fill').forEach(fill => {
    const words = [];
    [...fill.childNodes].forEach(n => {
      if (n.nodeName === 'BR') return;
      const hl = n.nodeType === 1, frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(t => {
        if (!t.trim()) return frag.append(t);
        const s = document.createElement('span');
        s.className = 'w' + (hl ? ' hl' : '');
        s.textContent = t;
        words.push(s); frag.append(s);
      });
      n.replaceWith(frag);
    });
    onFrame(() => {
      const lit = Math.round(progress(fill, .85, .4) * words.length);
      words.forEach((w, i) => w.classList.toggle('lit', reduce || i < lit));
    });
  });

  /* 사진 줄: 3초마다 한 장씩 자동 넘김(끝에서 처음으로) + 마우스로 끌기.
     마우스를 올리거나·만지거나·키보드로 들어오면 멈추고, 화면 밖이면 쉼 */
  const autoRoll = (track, items, dots) => {
    const step = () => items[1].offsetLeft - items[0].offsetLeft;
    let hold = false, seen = false, drag = false, x0 = 0, s0 = 0;
    const pause = () => { hold = true; }, play = () => { hold = false; };
    track.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') pause(); });
    track.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') play(); });
    track.addEventListener('focusin', pause);
    track.addEventListener('focusout', play);
    track.addEventListener('touchstart', pause, { passive: true });
    track.addEventListener('touchend', () => setTimeout(play, 4000), { passive: true });
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; }, { threshold: .3 }).observe(track);
    // 마우스 끌기: 잡은 지점 그대로 따라오고, 놓으면 가까운 장에 맞춤
    track.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button) return;
      drag = true; x0 = e.clientX; s0 = track.scrollLeft;
      track.style.scrollSnapType = 'none'; track.style.cursor = 'grabbing';
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener('pointermove', e => { if (drag) track.scrollLeft = s0 - (e.clientX - x0); });
    const end = () => {
      if (!drag) return; drag = false;
      track.style.scrollSnapType = ''; track.style.cursor = '';
      track.scrollTo({ left: Math.round(track.scrollLeft / step()) * step(), behavior: reduce ? 'auto' : 'smooth' });
    };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    track.addEventListener('dragstart', e => e.preventDefault());
    // 점 표시: 사진 수만큼 만들고 위치 따라 이동
    if (dots) {
      dots.innerHTML = items.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('');
      const ds = $$('i', dots);
      track.addEventListener('scroll', () => {
        const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
        const k = atEnd ? items.length - 1 : Math.round(track.scrollLeft / step());
        ds.forEach((d, i) => d.classList.toggle('on', i === k));
      }, { passive: true });
    }
    if (reduce) return;
    setInterval(() => {
      if (hold || drag || !seen || document.hidden) return;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      track.scrollTo({ left: atEnd ? 0 : track.scrollLeft + step(), behavior: 'smooth' });
    }, 3000);
  };
  $$('[data-roll]').forEach(t => autoRoll(t, $$(':scope > *', t), $(t.dataset.roll)));

  window.G = { $, $$, reduce, clamp, progress, onFrame };
})();
