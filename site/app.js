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
    ["index.html", "首页"],
    ["publications.html", "出版物"],
    ["projects.html", "项目"],
    ["conferences.html", "会议"],
    ["software.html", "软件"],
    ["articles.html", "文章"],
    ["news.html", "新闻"]
  ];

  const header = `
    <a class="skip" href="#main">跳到主要内容</a>
    <header class="site-header">
      <div class="utility"><div class="container"><span>大连理工大学 · 力学与航空航天学院</span><span class="utility-links"><a href="mailto:xuefeng@dlut.edu.cn">xuefeng@dlut.edu.cn</a><i></i><b>中文</b><a href="en/index.html">EN</a></span></div></div>
      <div class="masthead container">
        <a class="identity" href="index.html"><span class="mark">祝</span><span><strong>祝雪峰 教授</strong><small>Xuefeng Zhu · Academic Homepage</small></span></a>
        <button class="menu-button" aria-label="打开导航" aria-expanded="false">☰</button>
        <nav class="site-nav" aria-label="主导航"><div class="nav-inner">
          ${nav.map(([href, label]) => `<a href="${href}" class="${path === href || (path === "" && href === "index.html") ? "active" : ""}">${label}</a>`).join("")}
        </div></nav>
      </div>
    </header>`;

  const footer = `
    <footer class="site-footer">
      <div class="footer-grid container"><div><h2>祝雪峰教授个人学术主页</h2><p>计算力学 · 智能仿真 · 数字孪生 · 工业软件</p></div><div><p>电子邮箱：xuefeng@dlut.edu.cn</p><p>地址：辽宁省大连市甘井子区凌工路2号</p></div></div>
      <div class="footer-bottom"><div class="container">© ${new Date().getFullYear()} Xuefeng Zhu. 内容持续更新。</div></div>
    </footer>`;

  document.body.insertAdjacentHTML("afterbegin", header);
  document.body.insertAdjacentHTML("beforeend", footer);
  document.querySelector(".menu-button").addEventListener("click", (e) => {
    const menu = document.querySelector(".site-nav");
    const open = menu.classList.toggle("open");
    e.currentTarget.setAttribute("aria-expanded", open);
  });

  function art(item, index = 0) {
    const colors = {
      teal: ["#dcecea", "#1e746f", "#8ebcb5"],
      blue: ["#e1e8ed", "#214f68", "#8ba8b8"],
      orange: ["#f2e7df", "#b45219", "#d59b72"]
    };
    const c = colors[item.color] || colors.blue;
    const text = `${item.title || ""} ${item.venue || ""}`.toLowerCase();
    const svg = (label, body) => `<svg viewBox="0 0 160 120" role="img" aria-label="${label}"><title>${label}</title><rect width="160" height="120" fill="${c[0]}"/>${body}</svg>`;
    if (/driv|vehicle|pedestrian|tracking|交通|驾驶|行人|汽车/.test(text)) return svg("智能车辆与视觉研究示意图", `<path d="M12 94L60 52h42l46 42" fill="none" stroke="${c[2]}" stroke-width="2"/><path d="M71 52l9-22h20l10 22M52 94h58" fill="none" stroke="${c[1]}" stroke-width="3"/><circle cx="61" cy="94" r="9" fill="${c[1]}"/><circle cx="118" cy="94" r="9" fill="${c[1]}"/><path d="M19 35h33M25 45h22" stroke="${c[2]}"/><circle cx="132" cy="27" r="6" fill="${c[1]}"/>`);
    if (/topolog|morphable|optimization|优化|渐进结构/.test(text)) return svg("结构拓扑优化示意图", `<path d="M13 81C30 25 55 17 72 43c15 23 23-18 48-10 18 6 25 31 27 54-26 19-49-5-67 8-26 19-43-13-67-14Z" fill="${c[1]}" opacity=".88"/><g fill="${c[0]}"><ellipse cx="44" cy="61" rx="14" ry="9"/><ellipse cx="82" cy="68" rx="18" ry="12"/><ellipse cx="121" cy="54" rx="12" ry="16"/></g><path d="M13 98h134" stroke="${c[2]}"/>`);
    if (/spline|isogeometric|nurbs|b\+\+|cad|geometry|几何|样条/.test(text)) return svg("样条与等几何分析示意图", `<g fill="none" stroke="${c[2]}"><path d="M14 92C45 17 98 18 146 78" stroke="${c[1]}" stroke-width="3"/><path d="M18 31C58 62 100 79 145 48"/><path d="M35 19C55 53 59 80 51 104M77 14c8 30 6 62-2 95M119 21c-6 35-2 63 14 80"/></g><g fill="${c[1]}"><circle cx="14" cy="92" r="4"/><circle cx="51" cy="45" r="4"/><circle cx="96" cy="38" r="4"/><circle cx="146" cy="78" r="4"/></g>`);
    if (/flow|fluid|turbine|impeller|cylinder|aero|流体|叶轮|涡轮/.test(text)) return svg("流动与叶轮研究示意图", `<g fill="none" stroke="${c[2]}"><path d="M7 35c38-21 65 22 102 0 17-10 31-5 46 1M5 60c37-20 70 21 105 0 18-11 33-5 46 1M7 85c36-18 68 19 102 0 18-10 31-6 46 0"/></g><circle cx="92" cy="60" r="21" fill="${c[0]}" stroke="${c[1]}" stroke-width="3"/><g fill="${c[1]}"><path d="M92 60l5-28c14 5 18 14 8 23Z"/><path d="M92 60l27 9c-7 13-17 15-25 4Z"/><path d="M92 60L72 80c-9-12-7-22 7-24Z"/></g>`);
    if (/neural|deep learning|data-driven|prediction|actor-critic|人工智能|深度学习|预测/.test(text)) return svg("人工智能计算示意图", `<g stroke="${c[2]}" stroke-width="1">${[25,60,95].map(x=>[30,60,90].map(y=>`<path d="M${x} ${y}L${x+35} 45M${x} ${y}L${x+35} 75"/>`).join("")).join("")}</g><g fill="${c[1]}">${[25,60,95,130].map((x,i)=>[i?45:30,i?75:60,i===0?90:null].filter(Boolean).map(y=>`<circle cx="${x}" cy="${y}" r="5"/>`).join("")).join("")}</g>`);
    if (/membrane|oxygen|ceramic|material|honeycomb|kagome|膜|材料|蜂窝/.test(text)) return svg("材料微结构示意图", `<defs><pattern id="p${index}" width="28" height="24" patternUnits="userSpaceOnUse"><path d="M7 1h14l7 11-7 11H7L0 12Z" fill="none" stroke="${c[2]}"/></pattern></defs><rect x="10" y="12" width="140" height="96" fill="url(#p${index})"/><circle cx="80" cy="60" r="17" fill="${c[1]}" opacity=".85"/><path d="M52 60h56" stroke="white" stroke-width="3" stroke-dasharray="5 4"/>`);
    if (/chemical|polymer|amination|olefin|化学|聚合/.test(text)) return svg("分子结构研究示意图", `<g stroke="${c[2]}" stroke-width="3"><path d="M31 67l25-29 34 13 29-23M56 38l7 42 38 11 18-63M63 80l-32-13M101 91l27 12"/></g><g fill="${c[1]}">${[[31,67],[56,38],[63,80],[90,51],[101,91],[119,28],[128,103]].map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="7"/>`).join("")}</g>`);
    if (/vibration|buckling|elastic|stress|crack|力学|振动|屈曲|应力|裂纹/.test(text)) return svg("结构力学响应示意图", `<path d="M13 88h134" stroke="${c[2]}" stroke-width="3"/><path d="M18 85Q48 15 80 85T143 85" fill="none" stroke="${c[1]}" stroke-width="4"/><path d="M80 20v62m-7-11 7 12 7-12" fill="none" stroke="${c[2]}"/><g fill="${c[1]}"><circle cx="18" cy="85" r="4"/><circle cx="80" cy="85" r="4"/><circle cx="143" cy="85" r="4"/></g>`);
    if (/manufactur|stamping|welding|forming|展平|冲压|焊接|制造/.test(text)) return svg("制造与成形研究示意图", `<path d="M18 84C41 34 70 100 94 50c11-23 25-18 48-7v42Z" fill="${c[2]}" opacity=".7"/><path d="M18 73C43 23 70 89 94 39c11-22 26-17 48-7" fill="none" stroke="${c[1]}" stroke-width="4"/><path d="M80 12v42m-8-10 8 11 8-11" fill="none" stroke="${c[1]}"/><path d="M11 96h138" stroke="${c[1]}" stroke-width="3"/>`);
    return svg("计算科学研究示意图", `<g stroke="${c[2]}" fill="none"><path d="M19 18h122v84H19z"/><path d="M19 46h122M19 74h122M50 18v84M80 18v84M110 18v84M19 18l31 28-31 28 31 28M141 18l-31 28 31 28-31 28"/></g><circle cx="80" cy="74" r="7" fill="${c[1]}"/>`);
  }

  function links(item) {
    return (item.links || []).map(x => `<a href="${x.url}" target="_blank" rel="noreferrer">${x.label} ↗</a>`).join("");
  }

  const researchTopics = [
    ["固体力学", /solid|structur|mechanic|elastic|plastic|stress|strain|vibration|buckling|fracture|crack|contact|impact|composite|shell|beam|拓扑|结构|固体|力学|弹性|塑性|应力|应变|振动|屈曲|断裂|裂纹|接触|冲击|复合材料|壳|梁/i],
    ["等几何分析", /isogeometric|spline|nurbs|b\+\+|b-rep|cad|embedded domain|几何|样条|嵌入域/i],
    ["AI仿真", /neural|deep learning|machine learning|data-driven|artificial intelligence|physics-informed|pinn|actor-critic|prediction|智能|人工智能|深度学习|机器学习|数据驱动|预测/i],
    ["数学", /mathemat|algorithm|numerical method|optimization method|finite element method|方程|数学|算法|数值方法/i],
    ["电池与能源", /battery|fuel cell|energy|oxygen permeation|membrane|电池|燃料电池|能源|氧渗透|膜/i]
  ];

  function topicFor(item) {
    if (Array.isArray(item.topics) && item.topics.length) return item.topics;
    const text = `${item.title || ""} ${item.venue || ""} ${item.abstract || ""}`;
    const matched = researchTopics.filter(([, rule]) => rule.test(text)).map(([name]) => name);
    return matched.length ? matched : ["其他"];
  }

  function record(item, index) {
    const visual = item.image_url
      ? `<img src="${item.image_url}" alt="${item.title} 首页缩略图" loading="lazy">`
      : art(item, index);
    return `<article class="record" id="${item.id}">
      <div class="record-thumb">${visual}</div>
      <div><span class="record-type">${item.type}</span><h2>${item.links?.[0] ? `<a href="${item.links[0].url}" target="_blank" rel="noreferrer">${item.title}</a>` : item.title}</h2>
      <p class="record-meta">${item.authors} · ${item.venue}</p><span class="record-date">${item.date}</span>
      <div class="record-links">${links(item)}</div></div>
      <button class="copy" data-copy="${item.id}" aria-label="复制条目链接">⌁</button>
    </article>`;
  }

  async function itemsFor(kind) {
    try {
      const response = await fetch(`/api/content?kind=${kind}&locale=zh`);
      if (response.ok) {
        const remote = (await response.json()).items || [];
        if (remote.length) return remote.map((x, i) => ({ ...x, color: x.color || ["teal","blue","orange"][i % 3] }));
      }
    } catch {}
    return data[kind] || [];
  }

  window.AcademicSite = {
    art,
    async renderListing(kind) {
      const source = await itemsFor(kind);
      const list = document.querySelector("#record-list");
      const search = document.querySelector("#search");
      const year = document.querySelector("#year-filter");
      const type = document.querySelector("#type-filter");
      const topic = document.querySelector("#topic-filter");
      const years = [...new Set(source.map(x => x.year))].sort((a, b) => b - a);
      const publicationTypes = ["预印本", "期刊论文", "会议论文", "学术专著", "书籍章节", "研究报告"];
      const types = [...new Set([...(kind === "publications" ? publicationTypes : []), ...source.map(x => x.type)])];
      year.innerHTML = `<option value="">全部年份</option>${years.map(x => `<option>${x}</option>`).join("")}`;
      type.innerHTML = `<option value="">全部类型</option>${types.map(x => `<option>${x}</option>`).join("")}`;
      if (topic && kind === "publications") {
        const topicNames = researchTopics.map(([name]) => name);
        topic.innerHTML = [`<button type="button" class="active" data-topic="">全部方向</button>`, ...topicNames.map(x => `<button type="button" data-topic="${x}">${x}</button>`), `<button type="button" data-topic="其他">其他</button>`].join("");
      }
      function draw() {
        const q = search.value.trim().toLowerCase();
        const selectedTopic = topic?.querySelector(".active")?.dataset.topic || "";
        const items = source.filter(x => (!q || `${x.title}${x.authors}${x.venue}`.toLowerCase().includes(q)) && (!year.value || String(x.year) === year.value) && (!type.value || x.type === type.value) && (!selectedTopic || topicFor(x).includes(selectedTopic)));
        document.querySelector("#result-count").textContent = items.length;
        list.innerHTML = items.length ? items.map(record).join("") : `<div class="empty">暂无匹配内容。可在 content.js 中继续批量添加。</div>`;
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
      const features = [
        ...publications.filter(x => x.featured).slice(0, 2),
        ...software.filter(x => x.featured).slice(0, 2),
        ...articles.filter(x => x.featured).slice(0, 2)
      ];
      if (!features.length) features.push(...publications.slice(0,2), ...software.slice(0,2), ...articles.slice(0,2));
      document.querySelector("#waterfall").innerHTML = features.map((x, i) => {
        const page = publications.includes(x) ? "publications.html" : software.includes(x) ? "software.html" : "articles.html";
        return `<a class="feature" href="${page}#${x.id}"><div class="feature-visual">${art(x, i)}</div><div class="feature-body"><span class="label">${x.type}</span><h3>${x.title}</h3><p>${x.abstract}</p></div></a>`;
      }).join("");
    }
  };
})();
