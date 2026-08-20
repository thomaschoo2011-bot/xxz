(function () {
  if (!document.querySelector("script[data-site-analytics]")) {
    const analytics = document.createElement("script");
    analytics.src = "/analytics.js";
    analytics.dataset.siteAnalytics = "true";
    document.head.appendChild(analytics);
  }
  const data = window.ACADEMIC_DATA || {};
  const path = location.pathname.split("/").pop() || "index.html";
  const nav = [
    ["index.html", "Home"],
    ["publications.html", "Publications"],
    ["projects.html", "Projects"],
    ["conferences.html", "Conferences"],
    ["software.html", "Software"],
    ["articles.html", "Articles"],
    ["news.html", "News"]
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
    const text = `${item.title || ""} ${item.venue || ""}`.toLowerCase();
    const svg = (label, body) => `<svg viewBox="0 0 160 120" role="img" aria-label="${label}"><title>${label}</title><rect width="160" height="120" fill="${c[0]}"/>${body}</svg>`;
    if (/driv|vehicle|pedestrian|tracking|traffic/.test(text)) return svg("Vehicle and vision research", `<path d="M12 94L60 52h42l46 42" fill="none" stroke="${c[2]}" stroke-width="2"/><path d="M71 52l9-22h20l10 22M52 94h58" fill="none" stroke="${c[1]}" stroke-width="3"/><circle cx="61" cy="94" r="9" fill="${c[1]}"/><circle cx="118" cy="94" r="9" fill="${c[1]}"/><path d="M19 35h33M25 45h22" stroke="${c[2]}"/><circle cx="132" cy="27" r="6" fill="${c[1]}"/>`);
    if (/topolog|morphable|optimization/.test(text)) return svg("Structural topology optimization", `<path d="M13 81C30 25 55 17 72 43c15 23 23-18 48-10 18 6 25 31 27 54-26 19-49-5-67 8-26 19-43-13-67-14Z" fill="${c[1]}" opacity=".88"/><g fill="${c[0]}"><ellipse cx="44" cy="61" rx="14" ry="9"/><ellipse cx="82" cy="68" rx="18" ry="12"/><ellipse cx="121" cy="54" rx="12" ry="16"/></g><path d="M13 98h134" stroke="${c[2]}"/>`);
    if (/spline|isogeometric|nurbs|b\+\+|cad|geometry/.test(text)) return svg("Spline and isogeometric analysis", `<g fill="none" stroke="${c[2]}"><path d="M14 92C45 17 98 18 146 78" stroke="${c[1]}" stroke-width="3"/><path d="M18 31C58 62 100 79 145 48"/><path d="M35 19C55 53 59 80 51 104M77 14c8 30 6 62-2 95M119 21c-6 35-2 63 14 80"/></g><g fill="${c[1]}"><circle cx="14" cy="92" r="4"/><circle cx="51" cy="45" r="4"/><circle cx="96" cy="38" r="4"/><circle cx="146" cy="78" r="4"/></g>`);
    if (/flow|fluid|turbine|impeller|cylinder|aero/.test(text)) return svg("Flow and turbomachinery research", `<g fill="none" stroke="${c[2]}"><path d="M7 35c38-21 65 22 102 0 17-10 31-5 46 1M5 60c37-20 70 21 105 0 18-11 33-5 46 1M7 85c36-18 68 19 102 0 18-10 31-6 46 0"/></g><circle cx="92" cy="60" r="21" fill="${c[0]}" stroke="${c[1]}" stroke-width="3"/><g fill="${c[1]}"><path d="M92 60l5-28c14 5 18 14 8 23Z"/><path d="M92 60l27 9c-7 13-17 15-25 4Z"/><path d="M92 60L72 80c-9-12-7-22 7-24Z"/></g>`);
    if (/neural|deep learning|data-driven|prediction|actor-critic/.test(text)) return svg("Artificial intelligence computation", `<g stroke="${c[2]}" stroke-width="1">${[25,60,95].map(x=>[30,60,90].map(y=>`<path d="M${x} ${y}L${x+35} 45M${x} ${y}L${x+35} 75"/>`).join("")).join("")}</g><g fill="${c[1]}">${[25,60,95,130].map((x,i)=>[i?45:30,i?75:60,i===0?90:null].filter(Boolean).map(y=>`<circle cx="${x}" cy="${y}" r="5"/>`).join("")).join("")}</g>`);
    if (/membrane|oxygen|ceramic|material|honeycomb|kagome/.test(text)) return svg("Material microstructure", `<defs><pattern id="p${index}" width="28" height="24" patternUnits="userSpaceOnUse"><path d="M7 1h14l7 11-7 11H7L0 12Z" fill="none" stroke="${c[2]}"/></pattern></defs><rect x="10" y="12" width="140" height="96" fill="url(#p${index})"/><circle cx="80" cy="60" r="17" fill="${c[1]}" opacity=".85"/><path d="M52 60h56" stroke="white" stroke-width="3" stroke-dasharray="5 4"/>`);
    if (/chemical|polymer|amination|olefin/.test(text)) return svg("Molecular structure research", `<g stroke="${c[2]}" stroke-width="3"><path d="M31 67l25-29 34 13 29-23M56 38l7 42 38 11 18-63M63 80l-32-13M101 91l27 12"/></g><g fill="${c[1]}">${[[31,67],[56,38],[63,80],[90,51],[101,91],[119,28],[128,103]].map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="7"/>`).join("")}</g>`);
    if (/vibration|buckling|elastic|stress|crack/.test(text)) return svg("Structural mechanics response", `<path d="M13 88h134" stroke="${c[2]}" stroke-width="3"/><path d="M18 85Q48 15 80 85T143 85" fill="none" stroke="${c[1]}" stroke-width="4"/><path d="M80 20v62m-7-11 7 12 7-12" fill="none" stroke="${c[2]}"/><g fill="${c[1]}"><circle cx="18" cy="85" r="4"/><circle cx="80" cy="85" r="4"/><circle cx="143" cy="85" r="4"/></g>`);
    if (/manufactur|stamping|welding|forming/.test(text)) return svg("Manufacturing and forming research", `<path d="M18 84C41 34 70 100 94 50c11-23 25-18 48-7v42Z" fill="${c[2]}" opacity=".7"/><path d="M18 73C43 23 70 89 94 39c11-22 26-17 48-7" fill="none" stroke="${c[1]}" stroke-width="4"/><path d="M80 12v42m-8-10 8 11 8-11" fill="none" stroke="${c[1]}"/><path d="M11 96h138" stroke="${c[1]}" stroke-width="3"/>`);
    return svg("Computational science research", `<g stroke="${c[2]}" fill="none"><path d="M19 18h122v84H19z"/><path d="M19 46h122M19 74h122M50 18v84M80 18v84M110 18v84M19 18l31 28-31 28 31 28M141 18l-31 28 31 28-31 28"/></g><circle cx="80" cy="74" r="7" fill="${c[1]}"/>`);
  }

  function record(item, index) {
    const links = (item.links || []).map(x => `<a href="${x.url}" target="_blank" rel="noreferrer">${x.label} ↗</a>`).join("");
    const visual = item.image_url
      ? `<img src="${item.image_url}" alt="First page of ${item.title}" loading="lazy">`
      : art(item, index);
    return `<article class="record" id="${item.id}"><div class="record-thumb">${visual}</div><div><span class="record-type">${item.type}</span><h2>${item.links?.[0] ? `<a href="${item.links[0].url}" target="_blank" rel="noreferrer">${item.title}</a>` : item.title}</h2><p class="record-meta">${item.authors} · ${item.venue}</p><span class="record-date">${item.date}</span><div class="record-links">${links}</div></div><button class="copy" data-copy="${item.id}" aria-label="Copy item link">⌁</button></article>`;
  }

  const researchTopics = [
    ["Solid Mechanics", /solid|structur|mechanic|elastic|plastic|stress|strain|vibration|buckling|fracture|crack|contact|impact|composite|shell|beam/i],
    ["Isogeometric Analysis", /isogeometric|spline|nurbs|b\+\+|b-rep|cad|embedded domain|geometry/i],
    ["AI Simulation", /neural|deep learning|machine learning|data-driven|artificial intelligence|physics-informed|pinn|actor-critic|prediction/i],
    ["Mathematics", /mathemat|algorithm|numerical method|optimization method|finite element method|equation/i],
    ["Battery & Energy", /battery|fuel cell|energy|oxygen permeation|membrane/i]
  ];

  function topicFor(item) {
    if (Array.isArray(item.topics) && item.topics.length) return item.topics;
    const text = `${item.title || ""} ${item.venue || ""} ${item.abstract || ""}`;
    const matched = researchTopics.filter(([, rule]) => rule.test(text)).map(([name]) => name);
    return matched.length ? matched : ["Other"];
  }

  async function itemsFor(kind) {
    try {
      const response = await fetch(`/api/content?kind=${kind}&locale=en`);
      if (response.ok) {
        const remote = (await response.json()).items || [];
        if (remote.length) return remote.map((x, i) => ({ ...x, color: x.color || ["teal","blue","orange"][i % 3] }));
      }
    } catch {}
    return data[kind] || [];
  }

  window.AcademicSite = {
    async renderListing(kind) {
      const source = await itemsFor(kind);
      const list = document.querySelector("#record-list");
      const search = document.querySelector("#search");
      const year = document.querySelector("#year-filter");
      const type = document.querySelector("#type-filter");
      const topic = document.querySelector("#topic-filter");
      const years = [...new Set(source.map(x => x.year))].sort((a, b) => b - a);
      const publicationTypes = ["Preprint", "Journal Article", "Conference Paper", "Academic Book", "Book Chapter", "Research Report"];
      const types = [...new Set([...(kind === "publications" ? publicationTypes : []), ...source.map(x => x.type)])];
      year.innerHTML = `<option value="">All years</option>${years.map(x => `<option>${x}</option>`).join("")}`;
      type.innerHTML = `<option value="">All types</option>${types.map(x => `<option>${x}</option>`).join("")}`;
      if (topic && kind === "publications") {
        const topicNames = researchTopics.map(([name]) => name);
        topic.innerHTML = [`<button type="button" class="active" data-topic="">All fields</button>`, ...topicNames.map(x => `<button type="button" data-topic="${x}">${x}</button>`), `<button type="button" data-topic="Other">Other</button>`].join("");
      }
      function draw() {
        const q = search.value.trim().toLowerCase();
        const selectedTopic = topic?.querySelector(".active")?.dataset.topic || "";
        const items = source.filter(x => (!q || `${x.title}${x.authors}${x.venue}`.toLowerCase().includes(q)) && (!year.value || String(x.year) === year.value) && (!type.value || x.type === type.value) && (!selectedTopic || topicFor(x).includes(selectedTopic)));
        document.querySelector("#result-count").textContent = items.length;
        list.innerHTML = items.length ? items.map(record).join("") : `<div class="empty">No records are available yet. Additional items can be added in content-en.js.</div>`;
        list.querySelectorAll(".copy").forEach(btn => btn.addEventListener("click", () => navigator.clipboard.writeText(`${location.href.split("#")[0]}#${btn.dataset.copy}`)));
      }
      [search, year, type].forEach(el => el.addEventListener(el.tagName === "INPUT" ? "input" : "change", draw));
      topic?.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => {
        topic.querySelector(".active")?.classList.remove("active");
        btn.classList.add("active");
        draw();
      }));
      draw();
    },
    async renderHome() {
      const [publications, software, articles] = await Promise.all(["publications","software","articles"].map(itemsFor));
      const features = [...publications.filter(x=>x.featured).slice(0,2), ...software.filter(x=>x.featured).slice(0,2), ...articles.filter(x=>x.featured).slice(0,2)];
      if (!features.length) features.push(...publications.slice(0,2), ...software.slice(0,2), ...articles.slice(0,2));
      document.querySelector("#waterfall").innerHTML = features.map((x, i) => {
        const page = publications.includes(x) ? "publications.html" : software.includes(x) ? "software.html" : "articles.html";
        const visual = x.image_url ? `<img src="${x.image_url}" alt="Thumbnail for ${x.title}" loading="lazy">` : art(x, i);
        return `<a class="feature" href="${page}#${x.id}"><div class="feature-visual">${visual}</div><div class="feature-body"><span class="label">${x.type}</span><h3>${x.title}</h3><p>${x.abstract}</p></div></a>`;
      }).join("");
    }
  };
})();
