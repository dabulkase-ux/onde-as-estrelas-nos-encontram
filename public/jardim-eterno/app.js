/* Máquina de cenas + relógio único. Cada transição cancela a linha do tempo anterior. */
(() => {
  "use strict";
  document.body.classList.toggle("embedded", parent !== window);
  const C = GARDEN_CONFIG,
    $ = (id) => document.getElementById(id),
    renderer = new GardenRenderer($("garden")),
    audio = new GardenAudio(C.audio);
  class Timeline {
    constructor() {
      this.token = 0;
      this.jobs = [];
      this.time = 0;
      this.last = 0;
      this.tick = this.tick.bind(this);
      this.frame = requestAnimationFrame(this.tick);
    }
    tick(t) {
      if (!document.hidden && this.last)
        this.time += Math.min(t - this.last, 80);
      this.last = t;
      this.jobs = this.jobs.filter((job) => {
        if (job.token !== this.token) {
          job.resolve(false);
          return false;
        }
        if (this.time >= job.at) {
          job.resolve(true);
          return false;
        }
        return true;
      });
      this.frame = requestAnimationFrame(this.tick);
    }
    cancel() {
      this.token++;
      for (const j of this.jobs) j.resolve(false);
      this.jobs = [];
    }
    expedite() { for (const job of this.jobs) job.resolve(true); this.jobs = []; }
    dispose() { this.cancel(); cancelAnimationFrame(this.frame); }
    wait(ms) {
      return new Promise((resolve) =>
        this.jobs.push({ at: this.time + ms, token: this.token, resolve }),
      );
    }
  }
  const clock = new Timeline();
  let state = "", targets = [], busy = false, captionExpiry = 0,
    pointerStart = null, cordFired = false, cordSettled = false, cordReturnFrame = 0,
    terminalRunning = false, skipLine = false, terminalPhase = "idle", lastAdvance = -Infinity,
    pendingFile = null, currentFile = null, explored = new Set();
  function show(el, value = true) {
    $(el).classList.toggle("hidden", !value);
  }
  function caption(text, ms = C.timing.phrase) {
    $("caption").textContent = text;
    $("caption").classList.add("visible");
    captionExpiry = clock.time + ms;
  }
  async function say(lines, hold = C.timing.phrase) {
    for (const line of lines) {
      caption(line, hold);
      if (!(await clock.wait(hold + 240))) return false;
    }
    return true;
  }
  function setScene(name) {
    clock.cancel();
    terminalRunning = false;
    terminalPhase = "idle";
    pendingFile = null;
    $("terminal").dataset.phase = "idle";
    $("terminal").classList.remove("nexus-fault", "nexus-recovery", "nexus-freeze");
    state = name;
    document.body.dataset.scene = name;
    $("experience").dataset.scene = name;
    captionExpiry = 0;
    $("caption").classList.remove("visible");
    clearTargets();
  }
  function clearTargets() {
    targets = [];
    $("targets").replaceChildren();
  }
  function bindFlowers(flowers) {
    clearTargets();
    for (const f of flowers) {
      if (!f.interactive || !f.visible) continue;
      const button = document.createElement("button");
      button.className = "flower-target";
      button.dataset.flower = f.id;
      button.setAttribute(
        "aria-label",
        `${({rose:"Rosa curiosa",tulip:"Tulipa companheira",lily:"Lírio tímido",color:"Flor que muda de cor",fireflies:"Flor dos vagalumes",pair:"Flores companheiras"})[f.interaction] || (f.type === "rose" ? "Rosa" : f.type === "tulip" ? "Tulipa" : f.type === "blue" ? "Flor azul" : "Margarida")} — tocar`,
      );
      button.addEventListener("click", (e) => {
        audio.unlock();
        let selected = f;
        if (e.detail > 0) {
          let nearest = Infinity;
          for (const target of targets) {
            if (!target.f.visible || target.f.retract) continue;
            const p = renderer.position(target.f),
              distance = Math.hypot(p.x - e.clientX, p.y - e.clientY);
            if (distance < nearest) {
              nearest = distance;
              selected = target.f;
            }
          }
        }
        touchFlower(selected, e);
      });
      $("targets").append(button);
      targets.push({ f, button });
    }
    updateTargets();
  }
  function updateTargets() {
    for (const { f, button } of targets) {
      const p = renderer.position(f);
      button.style.left = p.x + "px";
      button.style.top = p.y + "px";
      button.style.display = f.visible && f.sink < 0.35 ? "block" : "none";
    }
    if (captionExpiry && clock.time >= captionExpiry) {
      $("caption").classList.remove("visible");
      captionExpiry = 0;
    }
  }
  renderer.onFrame = updateTargets;
  function header(title, sub, chapter) {
    $("scene-title").textContent = title;
    $("scene-subtitle").textContent = sub;
    $("chapter").textContent = chapter;
    show("scene-header");
    $("scene-header").style.opacity = 1;
  }
  async function terminal(scriptName) {
    const lines = GARDEN_STORY.scripts[scriptName],
      types = GARDEN_STORY.scriptTypes[scriptName];
    $("terminal-lines").replaceChildren(); show("terminal"); $("terminal").style.opacity = 1;
    show("terminal-file", false); pendingFile = null;
    show("progress", false); document.querySelector(".terminal-bottom").style.display = "none";
    terminalRunning = true; show("terminal-advance", false);
    const token = clock.token;
    for (let index = 0; index < lines.length; index++) {
      if(token !== clock.token) return false;
      const text = lines[index], type = types[index];
      skipLine = false;
      const line = document.createElement("div");
      const speaker = type === "dialogue" ? text.slice(0, text.indexOf(":")) : null;
      const dialogue = type === "dialogue";
      setTerminalPhase(dialogue ? renderer.reduced.matches ? "reading" : "typing" : type === "error" ? "error" : "system");
      show("terminal-advance", dialogue);
      if(dialogue) $("terminal-advance").focus({preventScroll:true});
      if(speaker){line.className="speaker-"+speaker.toLowerCase(); const name=document.createElement("strong");name.textContent=speaker+": ";line.append(name);}
      const content = document.createElement("span");line.append(content); $("terminal-lines").append(line);
      const body = speaker ? text.slice(speaker.length+2) : "> "+text;
      const characterDelay = dialogue ? 55 : 18;
      if(renderer.reduced.matches) content.textContent=body;
      else for(let i=0;i<body.length;i++){
        content.textContent=body.slice(0,i+1);
        scrollTerminal(line);
        if(skipLine) break;
        const punctuation = dialogue ? body[i] === "," ? 220 : /[.!?]/.test(body[i]) && body[i+1] !== body[i] ? 420 : 0 : 0;
        if(!(await clock.wait(characterDelay + punctuation))) {terminalRunning=false;return false;}
      }
      content.textContent=body; scrollTerminal(line);
      if(dialogue) line.dataset.readingMs = String(Math.max(2500, body.trim().split(/\s+/).length * 300));
      if(type === "error") {
        line.classList.add("terminal-error");
        if(!(await nexusInterruption())) return false;
      }
      if(dialogue) {
        setTerminalPhase("reading");
        if(!(await clock.wait(Infinity))) {terminalRunning=false;return false;}
      } else if(index < lines.length - 1 && !(await clock.wait(type === "error" ? 450 : 300))) {
        terminalRunning=false;return false;
      }
    }
    terminalRunning=false;setTerminalPhase("idle");show("terminal-advance",false);return true;
  }
  function setTerminalPhase(phase) {
    terminalPhase = phase;
    $("terminal").dataset.phase = phase;
    $("terminal-advance").disabled = phase === "error" || phase === "system";
    $("terminal-advance").textContent = phase === "typing" ? "Concluir fala" : phase === "error" ? "Retomando execução..." : "Continuar";
  }
  function scrollTerminal(line) {
    const history = $("terminal-lines");
    // Rola somente o histórico, sem deslocar o iframe ou ocultar controles.
    if(line.getBoundingClientRect().bottom > history.getBoundingClientRect().bottom)
      history.scrollTo({top:history.scrollHeight, behavior:renderer.reduced.matches ? "instant" : "smooth"});
  }
  async function nexusInterruption() {
    const panel = $("terminal");
    setTerminalPhase("error"); panel.classList.add("nexus-freeze");
    if(!(await clock.wait(320))) return false;
    panel.classList.remove("nexus-freeze"); panel.classList.add("nexus-fault");
    if(!(await clock.wait(renderer.reduced.matches ? 600 : 900))) return false;
    panel.classList.remove("nexus-fault"); panel.classList.add("nexus-recovery");
    if(!(await clock.wait(500))) return false;
    panel.classList.remove("nexus-recovery");
    return clock.wait(450);
  }
  function advanceSpeech(event){
    if(!terminalRunning || !["typing","reading"].includes(terminalPhase)) return;
    if(event?.detail > 1 || clock.time - lastAdvance < 450) return;
    lastAdvance = clock.time;
    if(terminalPhase === "typing") skipLine=true;
    clock.expedite();
  }
  $("terminal-advance").addEventListener("click",event=>{event.stopPropagation();advanceSpeech(event);});
  $("terminal-advance").addEventListener("keydown",event=>{if(event.repeat && ["Enter"," "].includes(event.key))event.preventDefault();});
  $("terminal").addEventListener("click",event=>{if(!event.target.closest("button"))advanceSpeech(event);});
  function offerFile(name) {
    pendingFile = name; setTerminalPhase("file"); show("terminal-advance",false);
    $("terminal-file").textContent = `[ Abrir ${name} ]`;
    show("terminal-file"); $("terminal-file").focus({preventScroll:true});
  }
  $("terminal-file").addEventListener("click",event=>{
    event.stopPropagation();
    if(terminalPhase !== "file" || !pendingFile || event.detail > 1) return;
    const name = pendingFile; pendingFile = null;
    show("terminal-file",false); openFile(name);
  });
  async function boot() {
    setScene("BOOT"); renderer.setActive(false); $("veil").style.opacity=1;
    if(await terminal("opening")) offerFile("canada.txt");
  }
  function openFile(name){
    currentFile=name;busy=false;setScene(name==="canada.txt"?"CANADA_FILE":name==="convencido.txt"?"CONVENCIDO_FILE":"PRA_ELA_FILE");
    show("terminal",false);$("file-title").textContent=name;$("final-message").textContent=C.files[name];
    $("file").classList.remove("closing");show("file");$("file-scroll").scrollTop=0;$("file-scroll").focus({preventScroll:true});
  }
  async function closeFile(){
    if(!state.endsWith("_FILE")||busy)return;busy=true;const name=currentFile;
    $("file").classList.add("closing");if(!(await clock.wait(renderer.reduced.matches?0:C.timing.fileClose)))return;
    show("file",false);$("file").classList.remove("closing");currentFile=null;
    if(name==="canada.txt") {
      setScene("LIGHTING_CONVERSATION");if(!(await terminal("lighting")))return;
      show("terminal",false);setScene("LIGHT_PULL");cordFired=false;cordSettled=false;
      cord.classList.remove("entering","recoiling","dragging");show("cord");void cord.offsetWidth;cord.classList.add("entering");
      if(renderer.reduced.matches)cordSettled=true;cord.focus({preventScroll:true});
    } else if(name==="convencido.txt") {
      setScene("RESUMING");if(await terminal("resuming"))offerFile("pra ela.txt");
    } else finalShutdown();
  }
  function touchFlower(f){
    if(state!=="EXPLORATION")return;audio.note();f.hits++;explored.add(f.id);f.impulse=renderer.reduced.matches?.25:1.1;
    switch(f.interaction){
      case "rose":f.targetLean=.22;caption("Essa aqui disse que gosta bastante do seu cabelo. Acho que ela tem bom gosto.",4000);break;
      case "tulip":renderer.grow(f,0,renderer.reduced.matches?.2:1.2);caption("Essa prefere os momentos simples. Aqueles em que a companhia já é suficiente.",4000);break;
      case "lily":f.closed=.85;f.closeSpeed=1.1;caption("Calma, ela só ficou com vergonha. Acontece quando encontra alguém bonito.",4000);break;
      case "color":f.color=f.hits%2?"#8eaed5":"#dba38c";caption("Ela resolveu experimentar uma cor nova.",3000);break;
      case "fireflies":renderer.fireflies(f,renderer.reduced.matches?3:6);caption("Algumas luzinhas vieram fazer companhia.",3000);break;
      case "pair":{
        const neighbor=renderer.flowers.find(other=>other.interaction==="partner");
        f.targetLean=.25;if(neighbor)neighbor.targetLean=-.25;caption("Essas duas gostam de ficar por perto.",3000);break;
      }
      default:{
        const action=f.hits%4;if(action===0)f.closed=.5;else if(action===1)renderer.burst(f,renderer.reduced.matches?1:4);else if(action===2)f.targetLean=f.hits%2?.2:-.2;else f.gust=.7;
        caption(C.playground[(f.hits-1)%C.playground.length],2400);
      }
    }
    $("notes-count").textContent="um lugar para ficar um pouco";
  }
  const cord = $("cord");
  function cordVisual(pull, x = 0) {
    const tension = clamp(pull / 110),
      sway = 1 - tension;
    $("cord-line").setAttribute(
      "d",
      `M30 0 Q${30 + x * 0.3 * sway} ${90 + pull * 0.42} ${30 + x * 0.2} ${183 + pull}`,
    );
    $("cord-line").style.strokeWidth = `${1.5 + tension * 0.55}px`;
    $("cord-line").style.stroke = `rgb(${147 + tension * 35}, ${153 + tension * 30}, ${140 + tension * 26})`;
    $("cord-handle").setAttribute("transform", `translate(${x * 0.2} ${pull})`);
  }
  function animateCordReturn(pull, x) {
    if (cordReturnFrame) cancelAnimationFrame(cordReturnFrame);
    const started = performance.now(),
      duration = renderer.reduced.matches ? 330 : 620;
    const frame = (now) => {
      const progress = clamp((now - started) / duration),
        returnScale = renderer.reduced.matches
          ? 1 - ease(progress)
          : Math.exp(-progress * 4.7) * Math.cos(progress * Math.PI * 3.2);
      cordVisual(pull * returnScale, x * returnScale);
      if (progress < 1) cordReturnFrame = requestAnimationFrame(frame);
      else {
        cordReturnFrame = 0;
        cordVisual(0);
      }
    };
    cordReturnFrame = requestAnimationFrame(frame);
  }
  cord.addEventListener("animationend", (event) => {
    if (event.target !== cord) return;
    if (event.animationName.startsWith("cord-drop")) {
      cord.classList.remove("entering");
      cordSettled = true;
    } else if (event.animationName.startsWith("cord-recoil")) {
      cord.classList.remove("recoiling");
      show("cord", false);
    }
  });
  cord.addEventListener("pointerdown", (e) => {
    if (state !== "LIGHT_PULL" || cordFired || !cordSettled) return;
    audio.unlock();
    if (cordReturnFrame) cancelAnimationFrame(cordReturnFrame);
    cordReturnFrame = 0;
    pointerStart = { y: e.clientY, x: e.clientX, id: e.pointerId, pull: 0, offsetX: 0 };
    cord.setPointerCapture(e.pointerId);
    cord.classList.add("dragging");
  });
  cord.addEventListener("pointermove", (e) => {
    if (!pointerStart || e.pointerId !== pointerStart.id) return;
    const pull = clamp(e.clientY - pointerStart.y, 0, 110);
    pointerStart.pull = pull;
    pointerStart.offsetX = clamp(e.clientX - pointerStart.x, -50, 50);
    cordVisual(pointerStart.pull, pointerStart.offsetX);
    if (pull >= C.interaction.cordThreshold) lightOn();
  });
  function releaseCord() {
    if (!pointerStart) return;
    const { pull, offsetX } = pointerStart;
    pointerStart = null;
    cord.classList.remove("dragging");
    if (!cordFired) animateCordReturn(pull, offsetX);
  }
  cord.addEventListener("pointerup", releaseCord);
  cord.addEventListener("pointercancel", releaseCord);
  cord.addEventListener("lostpointercapture", releaseCord);
  cord.addEventListener("keydown", (e) => {
    if (
      (e.key === "Enter" || e.key === " ") &&
      state === "LIGHT_PULL" &&
      cordSettled
    ) {
      e.preventDefault();
      audio.unlock();
      lightOn();
    }
  });
  async function lightOn() {
    if (cordFired || state !== "LIGHT_PULL") return;
    cordFired = true;
    pointerStart = null;
    cordSettled = false;
    if (cordReturnFrame) cancelAnimationFrame(cordReturnFrame);
    cordReturnFrame = 0;
    cord.classList.remove("dragging", "entering");
    cordVisual(0);
    cord.classList.add("recoiling");
    audio.note("click");
    setScene("BIG_GARDEN");
    renderer.field();
    renderer.lighting = 0;
    renderer.lightFlash = 1;
    for (const flower of renderer.flowers) {
      if (!flower.background && flower.size > 0.5) {
        flower.impulse = 0.2;
        flower.gust = 0.48;
      }
    }
    renderer.setActive(true);
    $("veil").style.transitionDuration = "1.2s";
    $("veil").style.opacity = 0;
    header(
      "Era só o começo.",
      "algumas coisas não cabem num pequeno jardim.",
      "ESTUDO BOTÂNICO / 002",
    );
    $("scene-header").style.opacity = 0;
    if (!(await clock.wait(260))) return;
    $("scene-header").style.opacity = 1;
    show("field-notes");
    if (!(await say(C.light, 1600))) return;
    setScene("EXPLORATION");
    busy = false;
    bindFlowers(renderer.flowers.filter((f) => f.interactive));
    show("end");$("end").focus({preventScroll:true});
  }
  async function ending(){
    if(state!=="EXPLORATION")return;setScene("ENDING");show("end",false);show("field-notes",false);show("scene-header",false);
    const started=clock.time,duration=renderer.reduced.matches?160:1600;
    while(clock.time-started<duration){renderer.wind=0;renderer.fade=1-ease((clock.time-started)/duration);if(!(await clock.wait(30)))return;}
    $("veil").style.opacity=1;renderer.setActive(false);setScene("INTERRUPTION");
    if(await terminal("interruption"))offerFile("convencido.txt");
  }
  function buildLilies(){
    const art=$("botanical-art"), defs=art.querySelector("defs");
    if(art.querySelector(".blue-lily"))return;
    const template=document.createElementNS("http://www.w3.org/2000/svg","g");
    for(const child of [...art.children])if(child!==defs)template.append(child);
    const stops=defs.querySelectorAll("#lily-petal-fill stop");["#a7d8ef","#629ad0","#315879"].forEach((color,i)=>stops[i].setAttribute("stop-color",color));
    defs.querySelectorAll("#lily-glow stop").forEach(stop=>stop.setAttribute("stop-color","#8fbce4"));
    [[75,700,.47],[130,690,.65],[183,720,.75],[237,680,.6],[290,710,.52],[157,746,.46],[255,753,.41]].forEach(([x,y,scale],i)=>{
      const group=template.cloneNode(true);group.classList.add("blue-lily");group.setAttribute("transform",`translate(${x} ${y}) scale(${scale}) translate(-203 -687)`);group.style.setProperty("--lily-delay",`${i*.45}s`);art.append(group);
    });
  }
  async function finalShutdown(){
    setScene("FAKE_SHUTDOWN");if(!(await terminal("final")))return;
    show("sound",false);setScene("CRT_SHUTDOWN");const screen=$("screen-layer"),crt=$("crt-effect");
    show("crt-effect");screen.classList.remove("crt-shutdown");void screen.offsetWidth;screen.classList.add("crt-shutdown");crt.classList.add("active");
    if(!(await clock.wait(renderer.reduced.matches?C.timing.crtReduced:C.timing.crt)))return;
    show("crt-effect",false);show("screen-layer",false);$("experience").classList.add("epilogue-mode");show("epilogue");show("hesitation",false);
    buildLilies();$("epilogue").classList.remove("lily-growing");$("botanical-art").querySelectorAll(".blue-lily").forEach(group=>group.classList.remove("is-grown"));void $("epilogue").offsetWidth;setScene("LILY_GROWTH");$("epilogue-lines").replaceChildren();show("epilogue-actions",false);$("epilogue").classList.add("lily-growing");
    for(const group of $("botanical-art").querySelectorAll(".blue-lily")){group.classList.add("is-grown");if(!(await clock.wait(renderer.reduced.matches?110:450)))return;}
    if(!(await clock.wait(renderer.reduced.matches?100:4700)))return;
    setScene("FINAL_LINES");
    for(const text of GARDEN_STORY.finalLines){const p=document.createElement("p");p.textContent=text;$("epilogue-lines").append(p);if(!(await clock.wait(renderer.reduced.matches?650:1800)))return;}
    setScene("FINAL_END");show("epilogue-actions");$("back-garden").focus({preventScroll:true});
  }
  function backToGarden(){
    if(state!=="FINAL_END")return;show("epilogue",false);show("screen-layer");$("experience").classList.remove("epilogue-mode");$("screen-layer").classList.remove("crt-shutdown");$("crt-effect").classList.remove("active");
    show("terminal",false);show("sound");setScene("EXPLORATION");renderer.fade=1;renderer.wind=.8;renderer.setActive(true);$("veil").style.opacity=0;
    header("Era só o começo.","algumas coisas não cabem num pequeno jardim.","ESTUDO BOTÂNICO / 002");show("field-notes");show("end");bindFlowers(renderer.flowers.filter(f=>f.interactive));$("end").focus({preventScroll:true});
  }
  // A segunda metade de um clique duplo de abertura pode atingir este botão
  // quando as animações estão reduzidas. Ela não representa um fechamento.
  $("file-close").addEventListener("click",event=>{if(event.detail < 2)closeFile();});
  $("end").addEventListener("click",ending);
  $("back-garden").addEventListener("click",backToGarden);
  $("back-universe").addEventListener("click",()=>{if(state==="FINAL_END")parent.postMessage({type:"garden:exit"},"*");});
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&state.endsWith("_FILE")){event.preventDefault();closeFile();}});
  $("sound").addEventListener("click", () => {
    const on = audio.toggle();
    $("sound").setAttribute("aria-pressed", String(on));
    $("sound").setAttribute("aria-label", on ? "Desativar som" : "Ativar som");
    $("sound").querySelector("span").textContent = on
      ? "som ligado"
      : "som desligado";
    $("sound-waves").setAttribute(
      "d",
      on ? "M17 8q5 4 0 8m2-11q8 7 0 14" : "m17 9 5 6m0-6-5 6",
    );
  });
  addEventListener(
    "pointermove",
    (e) => {
      renderer.pointer.x = (e.clientX / innerWidth) * 2 - 1;
      renderer.pointer.y = (e.clientY / innerHeight) * 2 - 1;
    },
    { passive: true },
  );
  document.addEventListener("pointerdown", () => audio.unlock(), {
    once: true,
  });
  // Interface somente de leitura para inspeção e testes; não altera a narrativa.
  window.gardenExperience = {
    get state() {
      return state;
    },
    get stats() {
      return {flowers:renderer.flowers.length,particles:renderer.particles.length,cordFired,interactions:explored.size,lilies:$("botanical-art").querySelectorAll(".blue-lily").length
      };
    },
  };
  addEventListener("pagehide",()=>{clock.dispose();renderer.setActive(false);if(cordReturnFrame)cancelAnimationFrame(cordReturnFrame);audio.ambience?.pause();void audio.context?.close();},{once:true});
  boot();
})();
