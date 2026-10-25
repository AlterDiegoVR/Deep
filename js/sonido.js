// =====================================================================
//  SONIDO: efectos sintetizados con WebAudio (sin archivos)
//  Sonido.tocar('golpe', volumen0a1)  ·  Sonido.retumbo(0..1) para el rumor continuo
// =====================================================================
window.Sonido = (()=>{
  const CFG = window.DATOS.sonido || {activado:true, volumen:0.6};
  let ac = null, master = null, noiseBuf = null, rumble = null, rumbleGain = null;
  let on = CFG.activado;
  try{ const s = localStorage.getItem('pozoviejo-sonido'); if(s !== null) on = s === '1'; }catch(e){}
  const lastAt = {};

  function init(){
    if(ac) { if(ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = on ? CFG.volumen : 0; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate*2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
    // rumor de fondo para cuando cae cosa: ruido grave en bucle
    rumble = ac.createBufferSource(); rumble.buffer = noiseBuf; rumble.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 140;
    rumbleGain = ac.createGain(); rumbleGain.gain.value = 0;
    rumble.connect(lp); lp.connect(rumbleGain); rumbleGain.connect(master); rumble.start();
  }
  ['pointerdown','keydown','touchstart'].forEach(ev => addEventListener(ev, init, {passive:true}));

  // piezas básicas
  function noise(t0, dur, vol, type, f0, f1, q){
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t0); if(f1) f.frequency.exponentialRampToValueAtTime(f1, t0+dur);
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0+dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t0, Math.random()*1.5); s.stop(t0+dur+0.02);
  }
  function tone(t0, dur, vol, type, f0, f1){
    const o = ac.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t0); if(f1) o.frequency.exponentialRampToValueAtTime(f1, t0+dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0+0.008); g.gain.exponentialRampToValueAtTime(0.001, t0+dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0+dur+0.02);
  }

  const SFX = {
    golpe(t,v){ noise(t, 0.06, 0.5*v, 'bandpass', 900+Math.random()*300, 0, 1.4); tone(t, 0.06, 0.25*v, 'triangle', 160, 90); },
    clin(t,v){ tone(t, 0.12, 0.25*v, 'square', 1250, 900); noise(t, 0.05, 0.3*v, 'highpass', 3000); },
    rompe(t,v){ noise(t, 0.16, 0.6*v, 'lowpass', 2200, 300); tone(t, 0.1, 0.3*v, 'triangle', 260, 70); },
    escombro(t,v){ for(let i=0;i<4;i++) noise(t+i*0.035+Math.random()*0.02, 0.07, 0.45*v, 'bandpass', 500+Math.random()*700, 0, 0.9); },
    crac(t,v){ for(let i=0;i<5;i++) noise(t+i*0.03+Math.random()*0.03, 0.025, 0.5*v, 'highpass', 1800+Math.random()*1500); tone(t, 0.2, 0.08*v, 'sawtooth', 90, 60); },
    cae(t,v){ tone(t, 0.22, 0.6*v, 'sine', 110, 38); noise(t, 0.18, 0.45*v, 'lowpass', 900, 120); },
    aterriza(t,v){ tone(t, 0.14, 0.5*v, 'sine', 140, 50); noise(t, 0.08, 0.3*v, 'lowpass', 700); },
    trampilla(t,v){ tone(t, 0.08, 0.3*v, 'square', 300, 200); tone(t+0.07, 0.1, 0.25*v, 'square', 200, 120); },
    poner(t,v){ tone(t, 0.07, 0.3*v, 'triangle', 520, 380); noise(t, 0.05, 0.2*v, 'bandpass', 1500); },
    aceite(t,v){ tone(t, 0.18, 0.25*v, 'sine', 880); tone(t+0.09, 0.28, 0.25*v, 'sine', 1320); },
    mochila(t,v){ [523,659,784,1047].forEach((f,i) => tone(t+i*0.08, 0.2, 0.22*v, 'triangle', f)); },
    sala(t,v){ [392,523,659].forEach((f,i) => tone(t+i*0.11, 0.35, 0.2*v, 'triangle', f)); },
    polilla(t,v){ tone(t, 0.25, 0.18*v, 'sawtooth', 380, 140); },
    explosion(t,v){ noise(t, 0.9, 0.9*v, 'lowpass', 1800, 60); tone(t, 0.6, 0.6*v, 'sine', 90, 30); },
    tropiezo(t,v){ tone(t, 0.18, 0.35*v, 'square', 420, 160); noise(t+0.1, 0.1, 0.35*v, 'lowpass', 600); },
    muerte(t,v){ [392,330,262,196].forEach((f,i) => tone(t+i*0.16, 0.3, 0.2*v, 'triangle', f)); },
    paso(t,v){ noise(t, 0.03, 0.12*v, 'lowpass', 600); },
  };

  function tocar(name, v = 1){
    if(!ac || !on || !SFX[name] || v <= 0.01) return;
    const now = ac.currentTime;
    if(lastAt[name] && now - lastAt[name] < 0.045) return;   // que no se amontonen
    lastAt[name] = now;
    try{ SFX[name](now, Math.min(1, v)); }catch(e){}
  }
  function retumbo(k){
    if(!ac || !rumbleGain) return;
    rumbleGain.gain.setTargetAtTime(on ? Math.min(1, k)*0.7 : 0, ac.currentTime, 0.12);
  }
  function activar(v){
    on = !!v; try{ localStorage.setItem('pozoviejo-sonido', on ? '1' : '0'); }catch(e){}
    if(master) master.gain.value = on ? CFG.volumen : 0;
  }
  return {tocar, retumbo, activar, get activado(){ return on; }};
})();
