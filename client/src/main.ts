import { Skyline737 } from "./game";

const canvas = document.getElementById("view") as HTMLCanvasElement;
const sim = new Skyline737(canvas);

const loading = document.getElementById("loading")!;
const bar = document.getElementById("load-bar") as HTMLElement;

const tick = setInterval(() => {
  const w = Math.min(92, parseFloat(bar.style.width || "8") + 7);
  bar.style.width = `${w}%`;
}, 120);

sim
  .boot()
  .then(() => {
    clearInterval(tick);
    bar.style.width = "100%";
    setTimeout(() => loading.classList.add("hidden"), 350);
  })
  .catch((err) => {
    console.error(err);
    loading.innerHTML = `<div class="load-card"><h1>Startup fault</h1><p>${String(err)}</p></div>`;
  });

(window as unknown as { sim: Skyline737 }).sim = sim;
