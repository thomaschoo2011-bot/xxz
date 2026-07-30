(function () {
  const data = window.ACADEMIC_DATA || {};
  const path = location.pathname.split("/").pop() || "index.html";
  const nav = [
    ["index.html", "Home"],
    ["publications.html", "Publications"],
    ["conferences.html", "Conferences"],
    ["software.html", "Software"],
    ["articles.html", "Articles"]
  ];

  const header = `
    <a class="skip" href="#main">Skip to main content</a>
    <header class="site-header">
      <div class="utility"><div class="container"><span>Dalian University of Technology · School of Mechanics and Aerospace Engineering</span><span class="utility-links"><a href="mailto:xuefeng@dlut.edu.cn">xuefeng@dlut.edu.cn</a><i></i><a href="../index.html">中文</a><b>EN</b></span></div></div>
      <div class="masthead container">
        <a class="identity" href="index.html"><span class="mark">祝</span><span><strong>Professor Xuefeng Zhu</strong><small>Academic Homepage</small></span></a>
        <button class="menu-button" aria-label="Open navigation" aria-expanded="false">☰</button>
        <nav class="site-nav" aria-label="Primary navigation"><div class="nav-inner">
          ${nav.map(([href, label]) => `<a href="${href}" class="${path === href ? "active" : ""}">${label}</a>`).join("")}
        </div></nav>
      </div>
    </header>`;

  const footer = `
    <footer class="site-footer">
      <div class="footer-grid container"><div><h2>Professor Xuefeng Zhu</h2><p>Computational Mechanics · Intelligent Simulation · Digital Twins · Engineering Software</p></div><div><p>Email: xuefeng@dlut.edu.cn</p><p>Address: No. 2 Linggong Road, Dalian, Liaoning, China</p></div></div>
      <div class="footer-bottom"><div class="container">© ${new Date().getFullYear()} Xuefeng Zhu. Content is continuously updated.</div></div>
    </footer>`;

  document.body.insertAdjacentHTML("afterbegin", header);
  document.body.insertAdjacentHTML("beforeend", footer);
  document.querySelector(".menu-button").addEventListener("click", (e) => {
    const menu = document.querySelector(".site-nav");
    const open = menu.classList.toggle("open");
    e.currentTarget.setAttribute("aria-expanded", open);
  });

  function art(item, index = 0) {
    const colors = { teal: ["#dcecea", "#1e746f", "#8ebcb5"], blue: ["#e1e8ed", "#214f68", "#8ba8b8"], orange: ["#f2e7df", "#b45219", "#d59b72"] };
    const c = colors[item.color] || colors.blue;
    const variant = index % 3;
    if (variant === 0) return `<svg viewBox="0 0 160 120" role="img" aria-label="Research illustration"><rect width="160" height="120" fill="${c[0]}"/><path d="M-10 93 C27 15 64 15 91 70 S145 114 174 32" fill="none" stroke="${c[1]}" stroke-width="2"/><path d="M-7 108 C38 58 62 29 92 55 S132 82 169 18" fill="none" stroke="${c[2]}" stroke-width="1.2"/><g fill="${c[1]}"><circle cx="35" cy="47" r="4"/><circle cx="92" cy="55" r="4"/><circle cx="136" cy="78" r="4"/></g></svg>`;
    if (variant === 1) return `<svg viewBox="0 0 160 120" role="img" aria-label="Computational mesh illustration"><rect width="160" height="120" fill="${c[0]}"/><g stroke="${c[2]}" fill="none"><path d="M19 18h122v84H19z"/><path d="M19 46h122M19 74h122M50 18v84M80 18v84M110 18v84M141 18l-31 28 31 28-31 28M19 18l31 28-31 28 31 28"/></g><circle cx="80" cy="74" r="7" fill="${c[1]}"/></svg>`;
    return `<svg viewBox="0 0 160 120" role="img" aria-label="Geometry analysis illustration"><rect width="160" height="120" fill="${c[0]}"/><g fill="none" stroke="${c[2]}"><ellipse cx="80" cy="61" rx="62" ry="25"/><ellipse cx="80" cy="61" rx="25" ry="52" transform="rotate(30 80 61)"/><ellipse cx="80" cy="61" rx="25" ry="52" transform="rotate(-30 80 61)"/></g><circle cx="80" cy="61" r="6" fill="${c[1]}"/></svg>`;
  }

  function record(item, index) {
    const links = (item.links || []).map(x => `<a href="${x.url}" target="_blank" rel="noreferrer">${x.label} ↗</a>`).join("");
    return `<article class="record" id="${item.id}"><div class="record-thumb">${art(item, index)}</div><div><span class="record-type">${item.type}</span><h2>${item.links?.[0] ? `<a href="${item.links[0].url}" target="_blank" rel="noreferrer">${item.title}</a>` : item.title}</h2><p class="record-meta">${item.authors} · ${item.venue}</p><span class="record-date">${item.date}</span><div class="record-links">${links}</div></div><button class="copy" data-copy="${item.id}" aria-label="Copy item link">⌁</button></article>`;
  }

  window.AcademicSite = {
    renderListing(kind) {
      const source = data[kind] || [];
      const list = document.querySelector("#record-list");
      const search = document.querySelector("#search");
      const year = document.querySelector("#year-filter");
      const type = document.querySelector("#type-filter");
      const years = [...new Set(source.map(x => x.year))].sort((a, b) => b - a);
      const types = [...new Set(source.map(x => x.type))];
      year.innerHTML = `<option value="">All years</option>${years.map(x => `<option>${x}</option>`).join("")}`;
      type.innerHTML = `<option value="">All types</option>${types.map(x => `<option>${x}</option>`).join("")}`;
      function draw() {
        const q = search.value.trim().toLowerCase();
        const items = source.filter(x => (!q || `${x.title}${x.authors}${x.venue}`.toLowerCase().includes(q)) && (!year.value || String(x.year) === year.value) && (!type.value || x.type === type.value));
        document.querySelector("#result-count").textContent = items.length;
        list.innerHTML = items.length ? items.map(record).join("") : `<div class="empty">No records are available yet. Additional items can be added in content-en.js.</div>`;
        list.querySelectorAll(".copy").forEach(btn => btn.addEventListener("click", () => navigator.clipboard.writeText(`${location.href.split("#")[0]}#${btn.dataset.copy}`)));
      }
      [search, year, type].forEach(el => el.addEventListener(el.tagName === "INPUT" ? "input" : "change", draw));
      draw();
    },
    renderHome() {
      const features = [...data.publications.slice(0, 2), ...data.software.slice(0, 2), ...data.articles.slice(0, 2)];
      document.querySelector("#waterfall").innerHTML = features.map((x, i) => {
        const page = data.publications.includes(x) ? "publications.html" : data.software.includes(x) ? "software.html" : "articles.html";
        return `<a class="feature" href="${page}#${x.id}"><div class="feature-visual">${art(x, i)}</div><div class="feature-body"><span class="label">${x.type}</span><h3>${x.title}</h3><p>${x.abstract}</p></div></a>`;
      }).join("");
    }
  };
})();
