/* Isolated sky flight effect for the ClipRise closing CTA. */
(() => {
  const section = document.querySelector('.site main > section.bl.cta.skyfx-anchor');
  const layer = section?.querySelector('.skyfx-layer');
  if (!section || !layer || layer.dataset.skyfxReady === 'true') return;
  layer.dataset.skyfxReady = 'true';

  const sky = layer.querySelector('.skyfx-bg');
  const star = layer.querySelector('.skyfx-star');
  const bob = layer.querySelector('.skyfx-bob');
  const trail = layer.querySelector('.skyfx-trail');
  const stretch = layer.querySelector('.skyfx-stretch');
  const nav = document.querySelector('#nav .nv');
  const headerShield = document.createElement('div');
  headerShield.className = 'skyfx-header-shield';
  layer.appendChild(headerShield);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (min, max) => min + Math.random() * (max - min);
  const animations = [];
  const particles = new Map();
  const clouds = [];
  const colors = ['#fff', '#fff', '#cfe3ff', '#1a6dff'];
  const svgNS = 'http://www.w3.org/2000/svg';
  let current = 1;
  let pass = null;
  let passTimer = 0;
  let frameId = 0;
  let visible = !('IntersectionObserver' in window);
  let alive = true;
  let inside = false;
  let wasHit = false;
  let pointerX = -999;
  let pointerY = -999;
  let startedAt = 0;
  let fromSpeed = 1;
  let lastEmit = 0;
  let lastLaunch = 0;
  let shieldFrame = 0;

  const updateHeaderShield = () => {
    if (!nav || !alive) return;
    const layerBox = layer.getBoundingClientRect();
    const navBox = nav.getBoundingClientRect();
    const left = Math.max(layerBox.left, navBox.left);
    const top = Math.max(layerBox.top, navBox.top);
    const right = Math.min(layerBox.right, navBox.right);
    const bottom = Math.min(layerBox.bottom, navBox.bottom);
    if (right <= left || bottom <= top) {
      headerShield.style.opacity = '0';
      return;
    }
    headerShield.style.left = `${left - layerBox.left}px`;
    headerShield.style.top = `${top - layerBox.top}px`;
    headerShield.style.width = `${right - left}px`;
    headerShield.style.height = `${bottom - top}px`;
    headerShield.style.borderRadius = getComputedStyle(nav).borderRadius;
    headerShield.style.opacity = '1';
  };
  const scheduleHeaderShield = () => {
    if (shieldFrame) return;
    shieldFrame = requestAnimationFrame(() => {
      shieldFrame = 0;
      updateHeaderShield();
    });
  };

  if (reduceMotion) {
    star.style.left = '60%';
    star.style.top = '30%';
    star.style.transform = 'translateX(-50%)';
    updateHeaderShield();
    window.addEventListener('scroll', scheduleHeaderShield, { passive: true });
    window.addEventListener('resize', scheduleHeaderShield, { passive: true });
    const reducedMotionPageHide = event => {
      if (event.persisted) return;
      cancelAnimationFrame(shieldFrame);
      window.removeEventListener('scroll', scheduleHeaderShield);
      window.removeEventListener('resize', scheduleHeaderShield);
      window.removeEventListener('pagehide', reducedMotionPageHide);
    };
    window.addEventListener('pagehide', reducedMotionPageHide);
    return;
  }

  const addAnimation = (animation, weight = 1) => {
    animations.push([animation, weight]);
    animation.playbackRate = 1 + (current - 1) * weight;
    return animation;
  };
  const forgetAnimation = animation => {
    const index = animations.findIndex(item => item[0] === animation);
    if (index >= 0) animations.splice(index, 1);
  };

  addAnimation(sky.animate(
    [{ transform: 'translateX(-6%) scale(1.08)' }, { transform: 'translateX(6%) scale(1.14)' }],
    { duration: 30000, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' }
  ), .6);

  for (let i = 0; i < 7; i++) {
    const width = rand(220, 520);
    const depth = width / 520;
    const cloud = document.createElementNS(svgNS, 'svg');
    cloud.setAttribute('viewBox', '0 0 200 80');
    cloud.setAttribute('class', 'skyfx-cloud');
    cloud.setAttribute('aria-hidden', 'true');
    cloud.innerHTML = '<circle cx="50" cy="50" r="26"/><circle cx="85" cy="38" r="32"/><circle cx="125" cy="46" r="28"/><circle cx="155" cy="54" r="22"/><rect x="40" y="50" width="130" height="26" rx="13"/>';
    cloud.style.width = width + 'px';
    cloud.style.top = rand(2, 78) + '%';
    cloud.style.opacity = (0.35 + depth * 0.4).toFixed(2);
    layer.insertBefore(cloud, star);
    clouds.push(cloud);
    const animation = addAnimation(cloud.animate(
      [{ transform: 'translateX(-40cqw)' }, { transform: 'translateX(125cqw)' }],
      { duration: 70000 - depth * 40000, iterations: Infinity, easing: 'linear' }
    ));
    animation.currentTime = rand(0, 60000);
  }

  addAnimation(bob.animate(
    [{ transform: 'translateY(-18px) rotate(-7deg)' }, { transform: 'translateY(18px) rotate(5deg)' }],
    { duration: 1700, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' }
  ), .3);
  addAnimation(trail.animate(
    [{ transform: 'scaleX(1)', opacity: 1 }, { transform: 'scaleX(.72)', opacity: .85 }],
    { duration: 260, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' }
  ), .5);

  const removeParticle = (animation, element) => {
    particles.delete(animation);
    element.remove();
  };
  const animateParticle = (element, keyframes, options) => {
    const animation = element.animate(keyframes, options);
    particles.set(animation, element);
    animation.onfinish = () => removeParticle(animation, element);
  };

  const starPosition = () => {
    const layerBox = layer.getBoundingClientRect();
    const starBox = bob.getBoundingClientRect();
    return {
      x: starBox.left - layerBox.left + starBox.width * .75,
      y: starBox.top - layerBox.top + starBox.height / 2,
      visible: starBox.right > layerBox.left && starBox.left < layerBox.right && starBox.bottom > layerBox.top && starBox.top < layerBox.bottom
    };
  };
  const spark = (x, y, dx, dy, size, duration, isStar) => {
    const element = document.createElement('i');
    element.className = 'skyfx-spark' + (isStar ? ' skyfx-spark-star' : '');
    element.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${colors[(Math.random() * colors.length) | 0]}`;
    layer.appendChild(element);
    const spin = rand(-200, 200);
    animateParticle(element, [
      { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(0) rotate(${spin}deg)`, opacity: 0 }
    ], { duration, easing: 'cubic-bezier(.1,.7,.3,1)' });
  };
  const burst = () => {
    const position = starPosition();
    if (!position.visible) return;
    const ring = document.createElement('div');
    ring.className = 'skyfx-ring';
    ring.style.cssText = `left:${position.x}px;top:${position.y}px`;
    layer.appendChild(ring);
    animateParticle(ring, [
      { transform: 'scale(.6)', opacity: .9 },
      { transform: 'scale(9)', opacity: 0 }
    ], { duration: 650, easing: 'cubic-bezier(.1,.7,.3,1)' });
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() < .65 ? Math.PI + rand(-1.2, 1.2) : rand(0, Math.PI * 2);
      const distance = rand(70, 240);
      spark(position.x, position.y, Math.cos(angle) * distance, Math.sin(angle) * distance, rand(5, 14), rand(600, 1100), i % 3 === 0);
    }
  };
  const exhaust = () => {
    const position = starPosition();
    if (!position.visible) return;
    for (let i = 0; i < 2; i++) {
      spark(position.x - 45, position.y + rand(-14, 14), -rand(90, 220), rand(-40, 40), rand(4, 10), rand(450, 800), Math.random() < .3);
    }
  };

  const fly = () => {
    if (!alive || !visible || document.hidden) return;
    star.style.top = rand(8, 60) + '%';
    const climb = rand(20, 60);
    if (pass) {
      pass.onfinish = null;
      pass.cancel();
      forgetAnimation(pass);
    }
    pass = addAnimation(star.animate([
      { transform: `translate(-22cqw,${climb}px)`, easing: 'cubic-bezier(.1,.6,.5,.9)' },
      { transform: 'translate(45cqw,0px)', offset: .5, easing: 'cubic-bezier(.5,.1,.9,.4)' },
      { transform: `translate(112cqw,${-climb}px)` }
    ], { duration: rand(9000, 12000), fill: 'forwards' }));
    pass.onfinish = () => {
      const finished = pass;
      if (finished) forgetAnimation(finished);
      pass = null;
      passTimer = window.setTimeout(() => { passTimer = 0; fly(); }, rand(200, 900));
    };
  };
  const scheduleFlight = () => {
    if (!pass && !passTimer && visible && !document.hidden) fly();
  };

  const launch = () => {
    lastLaunch = performance.now();
    startedAt = lastLaunch;
    fromSpeed = current;
    burst();
    ensureFrame();
  };
  const isPointerOnStar = () => {
    const rect = bob.getBoundingClientRect();
    const margin = 24;
    return pointerX > rect.left - margin && pointerX < rect.right + margin && pointerY > rect.top - margin && pointerY < rect.bottom + margin;
  };
  const tick = now => {
    frameId = 0;
    if (!alive || !visible || document.hidden) return;
    if (inside) {
      const hit = isPointerOnStar();
      if (hit && !wasHit && now - lastLaunch > 500) launch();
      wasHit = hit;
      const elapsed = (now - startedAt) / 1000;
      if (elapsed < .15) {
        const progress = elapsed / .15;
        current = fromSpeed + (9 - fromSpeed) * (1 - (1 - progress) ** 3);
      } else current = 2.2 + (9 - 2.2) * Math.exp(-(elapsed - .15) / .55);
      if (elapsed < 1.4 && now - lastEmit > 40) { lastEmit = now; exhaust(); }
    } else {
      current += (1 - current) * .05;
      if (current < 1.005) current = 1;
    }
    animations.forEach(([animation, weight]) => { animation.playbackRate = 1 + (current - 1) * weight; });
    const stretchAmount = 1 + Math.min(current - 1, 8) * .18;
    stretch.setAttribute('transform', `translate(108 50) scale(${stretchAmount} 1) translate(-108 -50)`);
    if (inside || current > 1.005) frameId = requestAnimationFrame(tick);
  };
  function ensureFrame() {
    if (alive && visible && !document.hidden && !frameId) frameId = requestAnimationFrame(tick);
  }

  const pause = () => {
    cancelAnimationFrame(frameId);
    frameId = 0;
    animations.forEach(([animation]) => animation.pause());
    particles.forEach((_element, animation) => animation.pause());
    if (passTimer) { clearTimeout(passTimer); passTimer = 0; }
  };
  const resume = () => {
    if (!alive || !visible || document.hidden) return;
    animations.forEach(([animation]) => animation.play());
    particles.forEach((_element, animation) => animation.play());
    scheduleFlight();
    if (inside || current > 1.005) ensureFrame();
  };
  const pointerEnter = event => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    inside = true;
    wasHit = isPointerOnStar();
    launch();
  };
  const pointerMove = event => { pointerX = event.clientX; pointerY = event.clientY; };
  const pointerDown = event => {
    pointerMove(event);
    if (!inside) { inside = true; wasHit = isPointerOnStar(); launch(); }
  };
  const pointerLeave = () => { inside = false; wasHit = false; ensureFrame(); };
  const visibilityChange = () => { if (document.hidden) pause(); else resume(); };
  const pageShow = event => { if (event.persisted) resume(); };
  const pageHide = event => { if (!event.persisted) cleanup(); };

  section.addEventListener('pointerenter', pointerEnter);
  section.addEventListener('pointermove', pointerMove);
  section.addEventListener('pointerdown', pointerDown);
  section.addEventListener('pointerleave', pointerLeave);
  window.addEventListener('scroll', scheduleHeaderShield, { passive: true });
  window.addEventListener('resize', scheduleHeaderShield, { passive: true });
  document.addEventListener('visibilitychange', visibilityChange);
  window.addEventListener('pageshow', pageShow);
  window.addEventListener('pagehide', pageHide);

  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) resume(); else pause();
  }, { threshold: .01 }) : null;
  if (observer) observer.observe(section);
  else { visible = true; resume(); }
  updateHeaderShield();

  function cleanup() {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(shieldFrame);
    shieldFrame = 0;
    pause();
    if (pass) { pass.onfinish = null; pass.cancel(); pass = null; }
    animations.forEach(([animation]) => animation.cancel());
    animations.length = 0;
    particles.forEach((element, animation) => { animation.onfinish = null; animation.cancel(); element.remove(); });
    particles.clear();
    clouds.forEach(cloud => cloud.remove());
    observer?.disconnect();
    section.removeEventListener('pointerenter', pointerEnter);
    section.removeEventListener('pointermove', pointerMove);
    section.removeEventListener('pointerdown', pointerDown);
    section.removeEventListener('pointerleave', pointerLeave);
    window.removeEventListener('scroll', scheduleHeaderShield);
    window.removeEventListener('resize', scheduleHeaderShield);
    document.removeEventListener('visibilitychange', visibilityChange);
    window.removeEventListener('pageshow', pageShow);
    window.removeEventListener('pagehide', pageHide);
    delete layer.dataset.skyfxReady;
  }
})();
