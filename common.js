/* 두 페이지 공통: 헤더 재질, 하단 버튼, 등장 모션, 숫자 카운트, 메뉴 현재 위치 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  // 요소가 화면을 지나가는 진행률(0~1): 상단이 start 지점에 닿을 때 0, 하단이 end 지점을 지날 때 1
  const progress = (el, start = 1, end = 0) => {
    const r = el.getBoundingClientRect(), h = innerHeight;
    return clamp((h * start - r.top) / (r.height + h * (start - end)));
  };

  /* 스크롤 연동: 한 프레임에 한 번만 계산. 페이지별 작업은 G.onFrame 으로 등록 */
  const jobs = [];
  const hd = $('#hd'), dock = $('#dock');
  jobs.push(() => {
    hd.classList.toggle('scrolled', scrollY > 10);
    dock?.classList.toggle('show', scrollY > innerHeight * .9);
  });
  let ticking = false;
  const run = () => { ticking = false; jobs.forEach(f => f()); };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);

  /* 등장 모션 + 숫자 카운트 */
  const countUp = el => {
    if (reduce) return;
    const to = +el.dataset.count, t0 = performance.now(), d = 1200;
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

  /* 헤더 메뉴: 같은 페이지 안 구역이면 현재 위치 표시 */
  const links = $$('.nav a[href^="#"]');
  const navIo = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.hash === '#' + e.target.id));
  }), { rootMargin: '-40% 0px -55% 0px' });
  links.forEach(a => { const t = $(a.hash); if (t) navIo.observe(t); });

  /* 모바일 메뉴: 항목을 누르면 닫힘 */
  const menu = $('#menu');
  menu?.addEventListener('click', e => { if (e.target.closest('a')) menu.hidePopover(); });

  window.G = { $, $$, reduce, clamp, progress, onFrame: f => { jobs.push(f); onScroll(); } };
  onScroll();
})();
