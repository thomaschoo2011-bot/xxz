/* =====================================================================
   第 4 章 · 平面问题有限元　交互脚本
   零外部依赖：所有线性代数、单元列式、求解器均在此文件内实现
   ===================================================================== */
(function(){
'use strict';

/* ---------------------------------------------------------------- 工具 */
function $(id){ return document.getElementById(id); }
function fmt(v,n){ if(v===undefined||v===null||!isFinite(v)) return '—'; return v.toFixed(n===undefined?3:n); }
function sci(v,n){
  if(!isFinite(v)) return '∞';
  var s=v.toExponential(n===undefined?1:n), p=s.split('e');
  return p[0]+'e'+(p[1].charAt(0)==='-'?'−':'+')+String(Math.abs(parseInt(p[1],10)));
}
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* 缓动动画：step(t) 其中 t ∈ [0,1] */
function tween(dur, step){
  var t0 = (typeof performance!=='undefined'?performance.now():Date.now());
  function frame(now){
    var t = Math.min(1, (now - t0)/dur);
    step(t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2);
    if(t<1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------ 线性代数内核 */
function zeros(n,m){ var A=[]; for(var i=0;i<n;i++) A.push(new Float64Array(m)); return A; }

/* 部分选主元高斯消去；奇异时返回 null */
function solveLin(A0,b0){
  var n=b0.length, A=[], b=new Float64Array(n), i,j,k,s,f;
  for(i=0;i<n;i++){ A.push(Float64Array.from(A0[i])); b[i]=b0[i]; }
  var scale=0;
  for(i=0;i<n;i++) scale=Math.max(scale, Math.abs(A[i][i]));
  if(scale===0) return null;
  for(k=0;k<n;k++){
    var p=k, mx=Math.abs(A[k][k]);
    for(i=k+1;i<n;i++) if(Math.abs(A[i][k])>mx){ mx=Math.abs(A[i][k]); p=i; }
    if(mx < 1e-12*scale) return null;
    if(p!==k){ var tr=A[p]; A[p]=A[k]; A[k]=tr; var tb=b[p]; b[p]=b[k]; b[k]=tb; }
    var akk=A[k][k];
    for(i=k+1;i<n;i++){
      f=A[i][k]/akk; if(f===0) continue;
      var Ai=A[i], Ak=A[k];
      for(j=k;j<n;j++) Ai[j]-=f*Ak[j];
      b[i]-=f*b[k];
    }
  }
  var x=new Float64Array(n);
  for(i=n-1;i>=0;i--){ s=b[i]; for(j=i+1;j<n;j++) s-=A[i][j]*x[j]; x[i]=s/A[i][i]; }
  return x;
}

/* 矩阵秩（相对容差） */
function rankOf(A0){
  var n=A0.length, m=A0[0].length, A=[], i,j,k;
  var big=0;
  for(i=0;i<n;i++){ A.push(Float64Array.from(A0[i])); for(j=0;j<m;j++) big=Math.max(big,Math.abs(A0[i][j])); }
  if(big===0) return 0;
  var tol=1e-9*big, r=0;
  for(j=0;j<m && r<n;j++){
    var p=-1, mx=tol;
    for(i=r;i<n;i++) if(Math.abs(A[i][j])>mx){ mx=Math.abs(A[i][j]); p=i; }
    if(p<0) continue;
    var tr=A[p]; A[p]=A[r]; A[r]=tr;
    for(i=r+1;i<n;i++){
      var f=A[i][j]/A[r][j]; if(f===0) continue;
      for(k=j;k<m;k++) A[i][k]-=f*A[r][k];
    }
    r++;
  }
  return r;
}

/* 对称矩阵的全部特征值（循环 Jacobi），升序返回 */
function eigSym(A0){
  var n=A0.length, A=[], i,j,p,q,k;
  for(i=0;i<n;i++) A.push(Float64Array.from(A0[i]));
  for(var sweep=0; sweep<80; sweep++){
    var off=0;
    for(p=0;p<n;p++) for(q=p+1;q<n;q++) off+=A[p][q]*A[p][q];
    if(off<1e-26) break;
    for(p=0;p<n;p++) for(q=p+1;q<n;q++){
      if(Math.abs(A[p][q])<1e-300) continue;
      var theta=(A[q][q]-A[p][p])/(2*A[p][q]);
      var t=Math.sign(theta||1)/(Math.abs(theta)+Math.sqrt(theta*theta+1));
      var c=1/Math.sqrt(t*t+1), s=t*c;
      for(k=0;k<n;k++){
        var akp=A[k][p], akq=A[k][q];
        A[k][p]=c*akp-s*akq; A[k][q]=s*akp+c*akq;
      }
      for(k=0;k<n;k++){
        var apk=A[p][k], aqk=A[q][k];
        A[p][k]=c*apk-s*aqk; A[q][k]=s*apk+c*aqk;
      }
    }
  }
  var ev=[]; for(i=0;i<n;i++) ev.push(A[i][i]);
  ev.sort(function(a,b){ return a-b; });
  return ev;
}

/* ---------------------------------------------------------- 单元列式 */
function Dmat(E,nu,planeStrain){
  if(planeStrain){
    var f=E/((1+nu)*(1-2*nu));
    return [[f*(1-nu), f*nu, 0],[f*nu, f*(1-nu), 0],[0,0,E/(2*(1+nu))]];
  }
  var g=E/(1-nu*nu);
  return [[g, g*nu, 0],[g*nu, g, 0],[0,0,g*(1-nu)/2]];
}

/* 三节点常应变三角形：返回 B(3×6) 与面积 A */
function cstBA(p){
  var x1=p[0][0],y1=p[0][1], x2=p[1][0],y2=p[1][1], x3=p[2][0],y3=p[2][1];
  var A2=(x2*y3-x3*y2)-(x1*y3-x3*y1)+(x1*y2-x2*y1);
  var b=[y2-y3, y3-y1, y1-y2], c=[x3-x2, x1-x3, x2-x1];
  var B=[new Float64Array(6),new Float64Array(6),new Float64Array(6)];
  for(var k=0;k<3;k++){
    B[0][2*k]=b[k]/A2;  B[1][2*k+1]=c[k]/A2;
    B[2][2*k]=c[k]/A2;  B[2][2*k+1]=b[k]/A2;
  }
  return {B:B, A:A2/2, b:b, c:c, A2:A2};
}
function cstKe(p,D,t){
  var r=cstBA(p), B=r.B, i,j,k,s;
  var DB=zeros(3,6);
  for(i=0;i<3;i++) for(j=0;j<6;j++){ s=0; for(k=0;k<3;k++) s+=D[i][k]*B[k][j]; DB[i][j]=s; }
  var ke=zeros(6,6);
  for(i=0;i<6;i++) for(j=0;j<6;j++){ s=0; for(k=0;k<3;k++) s+=B[k][i]*DB[k][j]; ke[i][j]=s*t*r.A; }
  return {ke:ke, B:B, A:r.A, geo:r};
}
/* 四节点等参四边形，2×2 高斯积分 */
function q4Ke(p,D,t){
  var g=1/Math.sqrt(3), gp=[[-g,-g],[g,-g],[g,g],[-g,g]];
  var ke=zeros(8,8), n,i,j,k,s;
  for(n=0;n<4;n++){
    var xi=gp[n][0], et=gp[n][1];
    var dN=[[-(1-et), (1-et), (1+et), -(1+et)],
            [-(1-xi), -(1+xi), (1+xi), (1-xi)]];
    for(i=0;i<2;i++) for(j=0;j<4;j++) dN[i][j]*=0.25;
    var J=[[0,0],[0,0]];
    for(i=0;i<2;i++) for(j=0;j<2;j++){ s=0; for(k=0;k<4;k++) s+=dN[i][k]*p[k][j]; J[i][j]=s; }
    var det=J[0][0]*J[1][1]-J[0][1]*J[1][0];
    var iJ=[[J[1][1]/det, -J[0][1]/det],[-J[1][0]/det, J[0][0]/det]];
    var dNx=[new Float64Array(4), new Float64Array(4)];
    for(k=0;k<4;k++){
      dNx[0][k]=iJ[0][0]*dN[0][k]+iJ[0][1]*dN[1][k];
      dNx[1][k]=iJ[1][0]*dN[0][k]+iJ[1][1]*dN[1][k];
    }
    var B=[new Float64Array(8),new Float64Array(8),new Float64Array(8)];
    for(k=0;k<4;k++){
      B[0][2*k]=dNx[0][k]; B[1][2*k+1]=dNx[1][k];
      B[2][2*k]=dNx[1][k]; B[2][2*k+1]=dNx[0][k];
    }
    var DB=zeros(3,8);
    for(i=0;i<3;i++) for(j=0;j<8;j++){ s=0; for(k=0;k<3;k++) s+=D[i][k]*B[k][j]; DB[i][j]=s; }
    for(i=0;i<8;i++) for(j=0;j<8;j++){ s=0; for(k=0;k<3;k++) s+=B[k][i]*DB[k][j]; ke[i][j]+=s*det*t; }
  }
  return {ke:ke};
}
/* 组装：els 为节点号数组，ndofPerNode = 2 */
function assemble(nNode, els, kes){
  var K=zeros(2*nNode, 2*nNode), e,a,b;
  for(e=0;e<els.length;e++){
    var el=els[e], ke=kes[e], m=el.length*2, LM=[];
    for(a=0;a<el.length;a++){ LM.push(2*el[a]); LM.push(2*el[a]+1); }
    for(a=0;a<m;a++) for(b=0;b<m;b++) K[LM[a]][LM[b]]+=ke[a][b];
  }
  return K;
}

/* ================================================================ 全局 UI */
(function(){
  var st=document.createElement('style');
  st.textContent='html.anim-off *{animation-play-state:paused!important;transition:none!important}';
  document.head.appendChild(st);

  /* 主题 */
  function setTheme(t){
    document.documentElement.setAttribute('data-theme', t);
    var b=$('btnTheme'); if(b) b.textContent = (t==='dark' ? '☀ 浅色' : '🌙 深色');
    try{ localStorage.setItem('fem-theme', t); }catch(e){}
  }
  var saved=null; try{ saved=localStorage.getItem('fem-theme'); }catch(e){}
  setTheme(saved==='dark' ? 'dark' : 'light');
  if($('btnTheme')) $('btnTheme').onclick=function(){
    setTheme(document.documentElement.getAttribute('data-theme')==='dark' ? 'light' : 'dark');
  };

  /* 动画开关 */
  if($('btnAnim')) $('btnAnim').onclick=function(){
    var off=document.documentElement.classList.toggle('anim-off');
    this.textContent = off ? '▶ 动画' : '⏸ 动画';
  };

  /* 进度条 + 返回顶部 */
  function onScroll(){
    var h=document.documentElement, max=h.scrollHeight-h.clientHeight;
    var pb=$('progbar'); if(pb) pb.style.width=(max>0 ? (h.scrollTop/max*100) : 0)+'%';
    var tt=$('totop'); if(tt) tt.classList.toggle('show', h.scrollTop>600);
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
  if($('totop')) $('totop').onclick=function(){ window.scrollTo({top:0,behavior:'smooth'}); };

  /* 目录高亮 + 顶栏当前章节 */
  var secs=[].slice.call(document.querySelectorAll('main section, main .cover'));
  var links={};
  [].slice.call(document.querySelectorAll('#toc a')).forEach(function(a){
    links[a.getAttribute('href').slice(1)]=a;
  });
  var titles={};
  secs.forEach(function(s){
    var h=s.querySelector('h2, h1');
    titles[s.id]= h ? h.textContent.replace(/^\s*\d+\s*/,'').trim() : s.id;
  });
  if('IntersectionObserver' in window){
    var spy=new IntersectionObserver(function(es){
      var best=null;
      es.forEach(function(e){ if(e.isIntersecting && (!best || e.intersectionRatio>best.intersectionRatio)) best=e; });
      if(!best) return;
      var id=best.target.id;
      for(var k in links) links[k].classList.toggle('active', k===id);
      var tn=$('tbNow'); if(tn && titles[id]) tn.textContent=titles[id];
    }, {rootMargin:'-45% 0px -45% 0px', threshold:[0,0.01,0.2,0.5]});
    secs.forEach(function(s){ spy.observe(s); });

    /* 出场动画：.reveal 与 figure 进入视口后加 .in（.drawin 依赖它） */
    var rev=new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); rev.unobserve(e.target); } });
    }, {rootMargin:'0px 0px -8% 0px', threshold:0.08});
    [].slice.call(document.querySelectorAll('.reveal, figure, .lab')).forEach(function(n){ rev.observe(n); });
  }else{
    [].slice.call(document.querySelectorAll('.reveal, figure, .lab')).forEach(function(n){ n.classList.add('in'); });
  }

  /* 代码块复制按钮 */
  [].slice.call(document.querySelectorAll('pre')).forEach(function(pre){
    if(pre.querySelector('.copybtn')) return;
    pre.style.position='relative';
    var b=document.createElement('button');
    b.className='copybtn'; b.type='button'; b.textContent='复制';
    b.onclick=function(){
      var code=pre.querySelector('code'), txt=code?code.textContent:pre.textContent;
      function done(){ b.textContent='已复制 ✓'; setTimeout(function(){ b.textContent='复制'; },1400); }
      if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(done, done); }
      else{
        var ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta);
        ta.select(); try{ document.execCommand('copy'); }catch(e){} document.body.removeChild(ta); done();
      }
    };
    pre.appendChild(b);
  });

  /* ← → 在章节间跳转 */
  document.addEventListener('keydown', function(e){
    if(e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    if(e.key!=='ArrowLeft' && e.key!=='ArrowRight') return;
    var y=window.scrollY+80, idx=0;
    for(var i=0;i<secs.length;i++) if(secs[i].offsetTop<=y) idx=i;
    idx += (e.key==='ArrowRight' ? 1 : -1);
    idx=Math.max(0, Math.min(secs.length-1, idx));
    secs[idx].scrollIntoView({behavior:'smooth', block:'start'});
  });
})();

/* ================================================== 实验台 1：D 矩阵对照 */
(function(){
  if(!$('l1E')) return;
  var CAP=600; // 柱长满量程 (GPa)
  function bar(x0,y,w,val,col,lab){
    var ww=Math.max(1, Math.min(1, val/CAP)*w);
    var over = val>CAP;
    return '<text x="'+(x0-8)+'" y="'+(y+5)+'" font-size="12" font-family="Consolas,monospace" '
      + 'fill="#7f8c98" text-anchor="end">'+lab+'</text>'
      + '<rect x="'+x0+'" y="'+(y-9)+'" width="'+w+'" height="18" rx="4" fill="#eef4f8" stroke="#dde7ee"/>'
      + '<rect x="'+x0+'" y="'+(y-9)+'" width="'+ww.toFixed(1)+'" height="18" rx="4" fill="'+col+'" opacity="'+(over?0.55:0.9)+'"/>'
      + '<text x="'+(x0+w+8)+'" y="'+(y+5)+'" font-size="12" font-family="Consolas,monospace" fill="'
      + (over?'#b03a2e':'#1f2d3d')+'">'+(over?'>600 ⚠':val.toFixed(1))+'</text>';
  }
  function upd(){
    var E=+$('l1E').value, nu=+$('l1nu').value;
    $('l1Ev').textContent=E+' GPa'; $('l1nuv').textContent=nu.toFixed(3);
    var ps=Dmat(E,nu,false), pe=Dmat(E,nu,true);
    var G=E/(2*(1+nu));
    $('l1a').textContent=fmt(ps[0][0],1);
    $('l1b').textContent=(pe[0][0]>1e5?'→ ∞':fmt(pe[0][0],1));
    $('l1r').textContent=fmt(pe[0][0]/ps[0][0],2);
    $('l1g').textContent=fmt(G,1);
    $('l1nup').textContent=fmt(nu/(1-nu),3);
    var s='';
    s+=bar(150,58,150,ps[0][0],'#2980b9','D11');
    s+=bar(150,100,150,ps[0][1],'#5499c7','D12');
    s+=bar(150,142,150,ps[2][2],'#7fb3d5','D33=G');
    s+=bar(480,58,150,pe[0][0],'#7d3c98','D11');
    s+=bar(480,100,150,pe[0][1],'#9b59b6','D12');
    s+=bar(480,142,150,pe[2][2],'#bb8fce','D33=G');
    $('l1bars').innerHTML=s;
    var note;
    if(nu<0.02){
      note='ν ≈ 0 时两者<b>完全相同</b>——泊松效应消失，平面应力与平面应变的区别本就来自横向约束。';
    }else if(nu>0.47){
      note='ν → 0.5：平面应变的 D₁₁ 含 1/(1−2ν) 因子而<b>发散</b>，材料趋于不可压缩，低阶位移单元会出现<b>体积自锁</b>；'
         + '而平面应力的 D 始终有界，因为板厚方向可以自由收缩。';
    }else{
      note='当前刚度比 D₁₁<sup>pe</sup>/D₁₁<sup>ps</sup> = '+fmt(pe[0][0]/ps[0][0],3)+'：<b>平面应变总是更硬</b>，'
         + '因为它禁止了 z 向自由变形。注意 G 在两种状态下<b>完全相同</b>，剪切行为与横向约束无关。'
         + '等效替换 ν′ = ν/(1−ν) = '+fmt(nu/(1-nu),3)+'，把它代回平面应力公式即得平面应变的 D——这就是 (4.8)。';
    }
    $('l1note').innerHTML=note;
  }
  $('l1E').oninput=upd; $('l1nu').oninput=upd; upd();
})();

/* ============================================== 实验台 2：网格与带宽工坊 */
(function(){
  if(!$('l2nx')) return;
  var shortDir=true;
  function upd(){
    var nx=+$('l2nx').value, ny=+$('l2ny').value;
    $('l2nxv').textContent=nx; $('l2nyv').textContent=ny;
    $('l2dir').innerHTML = shortDir ? '编号方向：沿短边 ✓' : '编号方向：沿长边 ✗';
    $('l2dir').classList.toggle('on', shortDir);
    var nn=(nx+1)*(ny+1), nd=2*nn;
    var D = shortDir ? (ny+2) : (nx+2);
    var B = (D+1)*2;
    var sb = nd*B, sf = nd*nd;
    $('l2nn').textContent=nn; $('l2nd').textContent=nd;
    $('l2D').textContent=D;   $('l2B').textContent=B;
    $('l2sb').textContent=sb; $('l2sf').textContent=sf;
    $('l2sv').textContent=Math.round((1-sb/sf)*1000)/10+'%';
    /* 绘制网格 */
    var X0=56, Y0=34, W=530, H=150;
    var dx=W/nx, dy=H/ny, i,j,s='';
    var id = shortDir ? function(i,j){ return i*(ny+1)+j+1; } : function(i,j){ return j*(nx+1)+i+1; };
    s+='<rect x="'+X0+'" y="'+Y0+'" width="'+W+'" height="'+H+'" fill="#f2f7fb" stroke="#5d7f96" stroke-width="1.8"/>';
    s+='<g stroke="#bcd2e0" stroke-width="1">';
    for(i=1;i<nx;i++) s+='<line x1="'+(X0+i*dx)+'" y1="'+Y0+'" x2="'+(X0+i*dx)+'" y2="'+(Y0+H)+'"/>';
    for(j=1;j<ny;j++) s+='<line x1="'+X0+'" y1="'+(Y0+j*dy)+'" x2="'+(X0+W)+'" y2="'+(Y0+j*dy)+'"/>';
    for(i=0;i<nx;i++) for(j=0;j<ny;j++)
      s+='<line x1="'+(X0+i*dx)+'" y1="'+(Y0+(j+1)*dy)+'" x2="'+(X0+(i+1)*dx)+'" y2="'+(Y0+j*dy)+'"/>';
    s+='</g>';
    /* 高亮第一个单元，标出节点号差 */
    s+='<polygon points="'+X0+','+(Y0+H-0)+' '+(X0+dx)+','+(Y0+H)+' '+(X0+dx)+','+(Y0+H-dy)+' '+X0+','+(Y0+H-dy)+'" '
      +'fill="#fdf0d5" stroke="#bf8f14" stroke-width="2"/>';
    var showNo = nn<=72;
    var r=Math.max(3.2, Math.min(9, 190/nn+3));
    for(i=0;i<=nx;i++) for(j=0;j<=ny;j++){
      var cx=X0+i*dx, cy=Y0+H-j*dy, k=id(i,j);
      s+='<circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="'+r.toFixed(1)+'" fill="#fff" stroke="#1a5276" stroke-width="1.4"/>';
      if(showNo) s+='<text x="'+cx.toFixed(1)+'" y="'+(cy+3.2).toFixed(1)+'" font-size="'+(r*1.15).toFixed(1)
        +'" font-family="Consolas,monospace" fill="#1a5276" text-anchor="middle">'+k+'</text>';
    }
    /* 编号方向箭头 */
    s+='<defs><marker id="l2ar" markerWidth="9" markerHeight="9" refX="7.5" refY="3.2" orient="auto">'
      +'<path d="M0,0 L8,3.2 L0,6.4 z" fill="#bf8f14"/></marker></defs>';
    if(shortDir) s+='<line x1="34" y1="'+(Y0+H)+'" x2="34" y2="'+Y0+'" stroke="#bf8f14" stroke-width="2" marker-end="url(#l2ar)"/>'
      +'<text x="20" y="'+(Y0+H/2)+'" font-size="11.5" fill="#bf8f14" transform="rotate(-90 20 '+(Y0+H/2)+')" text-anchor="middle">先短边</text>';
    else s+='<line x1="'+X0+'" y1="'+(Y0+H+22)+'" x2="'+(X0+W)+'" y2="'+(Y0+H+22)+'" stroke="#bf8f14" stroke-width="2" marker-end="url(#l2ar)"/>'
      +'<text x="'+(X0+W/2)+'" y="'+(Y0+H+36)+'" font-size="11.5" fill="#bf8f14" text-anchor="middle">先长边</text>';
    s+='<text x="'+(X0+dx*0.5)+'" y="'+(Y0+H-dy*0.45)+'" font-size="11.5" font-weight="700" fill="#8a6116" text-anchor="middle">D='+D+'</text>';
    $('l2svg').innerHTML=s;
    var bad=(nx+2), good=(ny+2);
    $('l2note').innerHTML='半带宽 <b>B = (D+1)×f</b>，平面问题 <b>f = 2</b>。当前方案 D = '+D+'，B = '+B+'，'
      +'带状存储只需 '+sb+' 个数，比满阵 '+sf+' 个节省 <b>'+(Math.round((1-sb/sf)*1000)/10)+'%</b>。'
      +(shortDir
        ? '　换成"沿长边编号"，D 会从 '+good+' 涨到 '+bad+'，带宽变成 '+((bad+1)*2)+'——<b>存储量增大 '
          + fmt(((bad+1)*2)/((good+1)*2),2)+' 倍</b>，求解时间大致按带宽平方增长。'
        : '　这是<b>错误</b>的编号方向：沿长边编号使 D = '+bad+'，远大于沿短边的 '+good+'。'
          +'点按钮换回来，看存储量立刻下降。')
      +'　金色单元标出了产生最大节点号差的那一个。';
  }
  $('l2nx').oninput=upd; $('l2ny').oninput=upd;
  $('l2dir').onclick=function(){ shortDir=!shortDir; upd(); };
  upd();
})();

/* ============================================== 实验台 3：形函数观察台 */
(function(){
  if(!$('l3a')) return;
  var which=0, names=['N<sub>i</sub>','N<sub>j</sub>','N<sub>m</sub>'];
  /* 屏幕三角形：i(0,0)→(90,230)  j(1,0)→(330,230)  m(0,1)→(90,30) */
  var Pi=[90,230], Pj=[330,230], Pm=[90,30];
  function pt(Li,Lj,Lm){
    return [Li*Pi[0]+Lj*Pj[0]+Lm*Pm[0], Li*Pi[1]+Lj*Pj[1]+Lm*Pm[1]];
  }
  function upd(){
    var La=+$('l3a').value, Lb=+$('l3b').value;
    if(La+Lb>1){ var k=1/(La+Lb); La*=k; Lb*=k; }
    var Lc=1-La-Lb;
    $('l3av').textContent=fmt(+$('l3a').value,2); $('l3bv').textContent=fmt(+$('l3b').value,2);
    $('l3ni').textContent=fmt(La,3); $('l3nj').textContent=fmt(Lb,3); $('l3nm').textContent=fmt(Lc,3);
    $('l3sum').textContent=fmt(La+Lb+Lc,3);
    $('l3xy').textContent='('+fmt(Lb,3)+', '+fmt(Lc,3)+')';
    $('l3sw').innerHTML='显示：'+names[which]+' 等值线';
    var s='';
    s+='<polygon points="'+Pi+' '+Pj+' '+Pm+'" fill="#f2f7fb" stroke="#1a5276" stroke-width="2"/>';
    /* 等值线：N_which = v 的轨迹是平行于对边的直线 */
    var cols=['#1a5276','#1e8449','#7d3c98'];
    s+='<g stroke="'+cols[which]+'" stroke-width="1.3" opacity="0.65">';
    for(var v=0.2; v<0.99; v+=0.2){
      var a,b;
      if(which===0){ a=pt(v,1-v,0); b=pt(v,0,1-v); }
      else if(which===1){ a=pt(1-v,v,0); b=pt(0,v,1-v); }
      else { a=pt(1-v,0,v); b=pt(0,1-v,v); }
      s+='<line x1="'+a[0].toFixed(1)+'" y1="'+a[1].toFixed(1)+'" x2="'+b[0].toFixed(1)+'" y2="'+b[1].toFixed(1)+'"/>';
      var mx=(a[0]+b[0])/2, my=(a[1]+b[1])/2;
      s+='<text x="'+(mx+4).toFixed(1)+'" y="'+(my-3).toFixed(1)+'" font-size="10.5" font-family="Consolas,monospace" fill="'+cols[which]+'">'+v.toFixed(1)+'</text>';
    }
    s+='</g>';
    /* 节点 */
    var lbl=[['i','(0,0)'],['j','(1,0)'],['m','(0,1)']], P=[Pi,Pj,Pm];
    for(var n=0;n<3;n++){
      s+='<circle cx="'+P[n][0]+'" cy="'+P[n][1]+'" r="7.5" fill="#fff" stroke="#1f2d3d" stroke-width="2.2"/>';
      s+='<text x="'+P[n][0]+'" y="'+(P[n][1]+4)+'" font-size="12" font-weight="700" fill="#1f2d3d" text-anchor="middle">'+lbl[n][0]+'</text>';
      s+='<text x="'+(P[n][0]+(n===1?18:-20))+'" y="'+(P[n][1]+(n===2?-14:18))+'" font-size="11" fill="#7f8c98" text-anchor="middle">'+lbl[n][1]+'</text>';
    }
    /* 探针 */
    var pp=pt(La,Lb,Lc);
    s+='<g><circle cx="'+pp[0].toFixed(1)+'" cy="'+pp[1].toFixed(1)+'" r="16" fill="#bf8f14" opacity="0.14"/>'
      +'<circle cx="'+pp[0].toFixed(1)+'" cy="'+pp[1].toFixed(1)+'" r="5.5" fill="#bf8f14" stroke="#fff" stroke-width="1.6"/></g>';
    for(var n2=0;n2<3;n2++)
      s+='<line x1="'+pp[0].toFixed(1)+'" y1="'+pp[1].toFixed(1)+'" x2="'+P[n2][0]+'" y2="'+P[n2][1]
        +'" stroke="#bf8f14" stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>';
    /* 右侧堆叠柱 */
    var vals=[La,Lb,Lc], BX=430, BY=230, BH=190, BW=54;
    s+='<text x="'+(BX+BW*1.7)+'" y="26" font-size="12.5" font-family="Segoe UI" fill="#1f2d3d" font-weight="700" text-anchor="middle">形函数之和恒为 1</text>';
    var acc=0;
    for(var n3=0;n3<3;n3++){
      var h=vals[n3]*BH;
      s+='<rect x="'+BX+'" y="'+(BY-acc-h).toFixed(1)+'" width="'+BW+'" height="'+Math.max(0,h).toFixed(1)
        +'" fill="'+cols[n3]+'" opacity="0.85" stroke="#fff"/>';
      if(h>15) s+='<text x="'+(BX+BW/2)+'" y="'+(BY-acc-h/2+4).toFixed(1)+'" font-size="11.5" fill="#fff" font-family="Consolas,monospace" text-anchor="middle">'+vals[n3].toFixed(2)+'</text>';
      s+='<text x="'+(BX+BW+12)+'" y="'+(BY-acc-h/2+4).toFixed(1)+'" font-size="12" fill="'+cols[n3]+'" font-family="Consolas,monospace">'
        +['N_i','N_j','N_m'][n3]+' = '+vals[n3].toFixed(3)+'</text>';
      acc+=h;
    }
    s+='<line x1="'+(BX-8)+'" y1="'+BY+'" x2="'+(BX+BW+8)+'" y2="'+BY+'" stroke="#1f2d3d" stroke-width="1.5"/>';
    s+='<line x1="'+(BX-8)+'" y1="'+(BY-BH)+'" x2="'+(BX+BW+8)+'" y2="'+(BY-BH)+'" stroke="#1f2d3d" stroke-width="1.2" stroke-dasharray="5 4"/>';
    s+='<text x="'+(BX-14)+'" y="'+(BY-BH+4)+'" font-size="11.5" fill="#1f2d3d" text-anchor="end">1.0</text>';
    s+='<text x="'+(BX-14)+'" y="'+(BY+4)+'" font-size="11.5" fill="#1f2d3d" text-anchor="end">0</text>';
    $('l3svg').innerHTML=s;
    var mx2=Math.max(La,Lb,Lc), near=['i','j','m'][[La,Lb,Lc].indexOf(mx2)];
    $('l3note').innerHTML='面积坐标 <b>L<sub>i</sub> = N<sub>i</sub></b>：探针离节点 <b>'+near+'</b> 最近，所以 '
      +'N<sub>'+near+'</sub> = '+fmt(mx2,3)+' 最大。三条虚线把三角形分成三块，<b>每块面积与对应的 L 成正比</b>——这就是"面积坐标"的名字来源。'
      +'　把探针拖到任一节点，该点的形函数变成 1、其余为 0（<b>Kronecker 性质</b>）；拖到任一条边上，对面节点的形函数变成 0——'
      +'这正是相邻单元<b>协调</b>（位移不撕裂）的原因，因为边上的位移只由这条边的两个节点决定。';
  }
  $('l3a').oninput=upd; $('l3b').oninput=upd;
  $('l3sw').onclick=function(){ which=(which+1)%3; upd(); };
  upd();
})();

/* ============================================ 实验台 4：常应变实验 */
(function(){
  if(!$('l4uj')) return;
  var SC=0.01;  // 滑块 1 格 = 0.01 的位移（无量纲）
  var nu=1/3, Dn=Dmat(1,nu,false);   // D / E
  var tri=[[0,0],[1,0],[0,1]];
  var geo=cstBA(tri);
  function upd(){
    var uj=+$('l4uj').value*SC, vj=+$('l4vj').value*SC,
        um=+$('l4um').value*SC, vm=+$('l4vm').value*SC;
    $('l4ujv').textContent=$('l4uj').value; $('l4vjv').textContent=$('l4vj').value;
    $('l4umv').textContent=$('l4um').value; $('l4vmv').textContent=$('l4vm').value;
    var d=[0,0,uj,vj,um,vm], eps=[0,0,0], i,k;
    for(i=0;i<3;i++){ var s=0; for(k=0;k<6;k++) s+=geo.B[i][k]*d[k]; eps[i]=s; }
    var sig=[0,0,0];
    for(i=0;i<3;i++){ var s2=0; for(k=0;k<3;k++) s2+=Dn[i][k]*eps[k]; sig[i]=s2; }
    var U=0.5*(eps[0]*sig[0]+eps[1]*sig[1]+eps[2]*sig[2])*geo.A;
    $('l4ex').textContent=fmt(eps[0],3); $('l4ey').textContent=fmt(eps[1],3); $('l4gxy').textContent=fmt(eps[2],3);
    $('l4sx').textContent=fmt(sig[0],4); $('l4sy').textContent=fmt(sig[1],4); $('l4txy').textContent=fmt(sig[2],4);
    $('l4u').textContent=fmt(U,5);
    /* 图形：原三角形 + 变形后（放大 AMP 倍） */
    var X0=110, Y0=210, L=170, AMP=2.4;
    function map(x,y){ return [X0+x*L, Y0-y*L]; }
    var p0=[map(0,0),map(1,0),map(0,1)];
    var dd=[[0,0],[uj,vj],[um,vm]];
    var p1=[map(0+dd[0][0]*AMP, 0+dd[0][1]*AMP), map(1+dd[1][0]*AMP, 0+dd[1][1]*AMP), map(0+dd[2][0]*AMP, 1+dd[2][1]*AMP)];
    function poly(p){ return p.map(function(q){ return q[0].toFixed(1)+','+q[1].toFixed(1); }).join(' '); }
    var s='';
    s+='<polygon points="'+poly(p0)+'" fill="none" stroke="#9fb8c9" stroke-width="1.6" stroke-dasharray="6 4"/>';
    s+='<polygon points="'+poly(p1)+'" fill="#eaf3f9" stroke="#1a5276" stroke-width="2.2" opacity="0.92"/>';
    var lb=['i','j','m'];
    for(var n=0;n<3;n++){
      s+='<line x1="'+p0[n][0].toFixed(1)+'" y1="'+p0[n][1].toFixed(1)+'" x2="'+p1[n][0].toFixed(1)+'" y2="'+p1[n][1].toFixed(1)
        +'" stroke="#bf8f14" stroke-width="1.4" stroke-dasharray="3 3"/>';
      s+='<circle cx="'+p1[n][0].toFixed(1)+'" cy="'+p1[n][1].toFixed(1)+'" r="6.5" fill="#fff" stroke="#1f2d3d" stroke-width="2"/>';
      s+='<text x="'+p1[n][0].toFixed(1)+'" y="'+(p1[n][1]+3.8).toFixed(1)+'" font-size="11.5" font-weight="700" fill="#1f2d3d" text-anchor="middle">'+lb[n]+'</text>';
    }
    s+='<text x="'+X0+'" y="240" font-size="11.5" fill="#7f8c98">虚线＝原始构形，实线＝变形后（放大 '+AMP+' 倍）</text>';
    /* 应力状态方块 */
    var CX=470, CY=110, R=52;
    var mxs=Math.max(1e-9, Math.max(Math.abs(sig[0]),Math.abs(sig[1]),Math.abs(sig[2])));
    s+='<rect x="'+(CX-R)+'" y="'+(CY-R)+'" width="'+(2*R)+'" height="'+(2*R)+'" fill="#f7fbfd" stroke="#5d7f96" stroke-width="1.6"/>';
    function arr(x1,y1,x2,y2,col){ return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)
      +'" stroke="'+col+'" stroke-width="2.4" marker-end="url(#l4ar)"/>'; }
    s='<defs><marker id="l4ar" markerWidth="9" markerHeight="9" refX="7.5" refY="3.2" orient="auto">'
      +'<path d="M0,0 L8,3.2 L0,6.4 z" fill="#b03a2e"/></marker>'
      +'<marker id="l4ab" markerWidth="9" markerHeight="9" refX="7.5" refY="3.2" orient="auto">'
      +'<path d="M0,0 L8,3.2 L0,6.4 z" fill="#1a5276"/></marker></defs>'+s;
    var ax=Math.abs(sig[0])/mxs*34, ay=Math.abs(sig[1])/mxs*34, at=Math.abs(sig[2])/mxs*30;
    var cx1=sig[0]>=0?1:-1, cy1=sig[1]>=0?1:-1;
    if(ax>2){ s+=arr(CX+R, CY, CX+R+cx1*ax, CY, '#b03a2e'); s+=arr(CX-R, CY, CX-R-cx1*ax, CY, '#b03a2e'); }
    if(ay>2){ s+=arr(CX, CY-R, CX, CY-R-cy1*ay, '#b03a2e'); s+=arr(CX, CY+R, CX, CY+R+cy1*ay, '#b03a2e'); }
    if(at>2){
      s+='<line x1="'+(CX-R+6)+'" y1="'+(CY-R-6)+'" x2="'+(CX+R-6)+'" y2="'+(CY-R-6)+'" stroke="#1a5276" stroke-width="2.2" marker-end="url(#l4ab)"/>';
      s+='<line x1="'+(CX+R+6)+'" y1="'+(CY+R-6)+'" x2="'+(CX+R+6)+'" y2="'+(CY-R+6)+'" stroke="#1a5276" stroke-width="2.2" marker-end="url(#l4ab)"/>';
    }
    s+='<text x="'+CX+'" y="'+(CY+4)+'" font-size="11.5" font-family="Consolas,monospace" fill="#7f8c98" text-anchor="middle">σ/E</text>';
    s+='<text x="'+CX+'" y="'+(CY+R+42)+'" font-size="11.5" fill="#7f8c98" text-anchor="middle">单元内应力状态（处处相同）</text>';
    $('l4svg').innerHTML=s;
    var rigid = (Math.abs(eps[0])<1e-12 && Math.abs(eps[1])<1e-12 && Math.abs(eps[2])<1e-12);
    $('l4note').innerHTML = rigid
      ? '<b>应变全部为零</b>——这是一个纯刚体运动（平移或小转动）。它不产生任何应力，也不产生应变能，'
        + '正是 <b>k<sup>e</sup> 秩亏 3</b> 的物理来源：三个刚体自由度落在 k<sup>e</sup> 的零空间里。'
      : '节点 <b>i</b> 固定在原点。注意三个应变在<b>整个单元内都是常数</b>，与位置无关——这是 CST 的定义性特征，'
        + '也是它无法表示弯曲应力分布的根本原因。把 u<sub>j</sub>、v<sub>m</sub> 设为 0，只让 v<sub>j</sub> 与 u<sub>m</sub> 取相反数，'
        + '就得到纯刚体转动，应变应当全部归零（点「演示：刚体转动」）。当前应变能 U/(Et) = <b>'+fmt(U,5)+'</b>。';
  }
  ['l4uj','l4vj','l4um','l4vm'].forEach(function(k){ $(k).oninput=upd; });
  $('l4rb').onclick=function(){
    var tgt=[0,24,-24,0];
    var st=[+$('l4uj').value,+$('l4vj').value,+$('l4um').value,+$('l4vm').value];
    tween(600, function(t){
      $('l4uj').value=st[0]+(tgt[0]-st[0])*t; $('l4vj').value=st[1]+(tgt[1]-st[1])*t;
      $('l4um').value=st[2]+(tgt[2]-st[2])*t; $('l4vm').value=st[3]+(tgt[3]-st[3])*t;
      upd();
    });
  };
  $('l4rs').onclick=function(){
    var st=[+$('l4uj').value,+$('l4vj').value,+$('l4um').value,+$('l4vm').value];
    tween(450, function(t){
      $('l4uj').value=st[0]*(1-t); $('l4vj').value=st[1]*(1-t);
      $('l4um').value=st[2]*(1-t); $('l4vm').value=st[3]*(1-t);
      upd();
    });
  };
  upd();
})();

/* ============================================== 实验台 5：单刚显微镜 */
(function(){
  if(!$('l5nu')) return;
  var blocks=false;
  function upd(){
    var nu=+$('l5nu').value, mx=+$('l5mx').value, my=+$('l5my').value;
    $('l5nuv').textContent=fmt(nu,2); $('l5mxv').textContent=fmt(mx,2); $('l5myv').textContent=fmt(my,2);
    $('l5blk').classList.toggle('on', blocks);
    var tri=[[0,0],[1,0],[mx,my]];
    var D=Dmat(1,nu,false);               // 单位 E
    var r=cstKe(tri, D, 1);               // 单位 Et
    var ke=r.ke, i,j;
    var disp=zeros(6,6);
    for(i=0;i<6;i++) for(j=0;j<6;j++) disp[i][j]=ke[i][j]*16;   // 单位 Et/16
    var nm=['u<sub>i</sub>','v<sub>i</sub>','u<sub>j</sub>','v<sub>j</sub>','u<sub>m</sub>','v<sub>m</sub>'];
    var s='<div class="hd"></div>';
    for(j=0;j<6;j++) s+='<div class="hd">'+nm[j]+'</div>';
    for(i=0;i<6;i++){
      s+='<div class="hd">'+nm[i]+'</div>';
      for(j=0;j<6;j++){
        var v=disp[i][j], cls='kcell';
        if(Math.abs(v)<1e-10) cls+=' zero';
        if(blocks && (Math.floor(i/2)===Math.floor(j/2))) cls+=' tgt';
        s+='<div class="'+cls+'" style="height:38px;font-size:12px">'+(Math.abs(v)<1e-10?'0':v.toFixed(2))+'</div>';
      }
    }
    $('l5grid').innerHTML=s;
    var tr=0; for(i=0;i<6;i++) tr+=ke[i][i];
    var rs=0;
    for(i=0;i<6;i++){
      var sx=0, sy=0;
      for(j=0;j<3;j++){ sx+=ke[i][2*j]; sy+=ke[i][2*j+1]; }
      rs=Math.max(rs, Math.abs(sx), Math.abs(sy));
    }
    var ev=eigSym(ke), nz=ev.filter(function(v){ return v>1e-8*ev[5]; });
    $('l5A').textContent=fmt(r.A,3);
    $('l5tr').textContent=fmt(tr,3);
    $('l5rs').textContent=sci(rs,1);
    $('l5rk').textContent=rankOf(ke);
    $('l5ev').textContent=nz.map(function(v){ return v.toFixed(4); }).join(' / ');
    var deg = Math.abs(r.A)<0.03;
    var sym45 = Math.abs(disp[3][3]-disp[4][4])<1e-8 && Math.abs(disp[3][4]-disp[3][3])<1e-8;
    var note='面积 A = '+fmt(r.A,3)+'，迹 = '+fmt(tr,3)+' Et。<b>秩恒为 3</b>（6 − 3 个刚体自由度），'
      + '<b>每行的 x 方向列之和与 y 方向列之和都是机器零</b>（当前最大 '+sci(rs,1)+'）——这两条是自编程序最好用的靶标。';
    if(Math.abs(nu-1/3)<0.008 && Math.abs(mx)<0.03 && Math.abs(my-1)<0.03)
      note+='　当前恰好是 <b>例题 4-1</b> 的单元（ν = 1/3、直角边长 1），矩阵应当与 (4.40) 逐项吻合：12, 6, −9, −3 …';
    if(sym45) note+='　注意第 4 行与第 5 行完全相同：对<b>直角</b>三角形，"节点 j 上移"与"节点 m 右移"产生同一种纯剪切。'
      + '把节点 m 的 x 拖离 0，这个巧合立刻消失。';
    if(deg) note+='　<span style="color:#b03a2e"><b>警告：</b>单元已接近退化（A → 0），k<sup>e</sup> 的元素急剧增大、条件数恶化——'
      + '这就是第 2 章要求最小内角 > 30° 的数值原因。</span>';
    $('l5note').innerHTML=note;
    /* 三角形示意 */
    var X0=30, Y0=150, L=95;
    var P=[[X0,Y0],[X0+L,Y0],[X0+mx*L, Y0-my*L]];
    var g='<polygon points="'+P.map(function(q){ return q[0].toFixed(1)+','+q[1].toFixed(1); }).join(' ')
      +'" fill="'+(deg?'#fbeceb':'#eaf3f9')+'" stroke="'+(deg?'#b03a2e':'#1a5276')+'" stroke-width="2"/>';
    var lb=['i','j','m'];
    for(var n=0;n<3;n++){
      g+='<circle cx="'+P[n][0].toFixed(1)+'" cy="'+P[n][1].toFixed(1)+'" r="7" fill="#fff" stroke="#1f2d3d" stroke-width="2"/>';
      g+='<text x="'+P[n][0].toFixed(1)+'" y="'+(P[n][1]+3.8).toFixed(1)+'" font-size="11.5" font-weight="700" fill="#1f2d3d" text-anchor="middle">'+lb[n]+'</text>';
    }
    g+='<text x="'+X0+'" y="176" font-size="11" fill="#7f8c98">逆时针 i→j→m，2A = '+fmt(2*r.A,3)+'</text>';
    $('l5tri').innerHTML=g;
  }
  ['l5nu','l5mx','l5my'].forEach(function(k){ $(k).oninput=upd; });
  $('l5blk').onclick=function(){ blocks=!blocks; this.textContent = blocks?'隐藏 2×2 分块':'显示 2×2 分块'; upd(); };
  upd();
})();

/* ========================================== 实验台 6：载荷等效积分器 */
(function(){
  if(!$('l6pre')) return;
  var three=false;
  function qf(kind, n, x){
    if(kind==='u') return 1;
    if(kind==='l1') return 1-x;
    if(kind==='l2') return x;
    if(kind==='p')  return 4*x*(1-x);
    return Math.pow(x, n);
  }
  function Nf(x){ return three ? [(1-x)*(1-2*x), 4*x*(1-x), x*(2*x-1)] : [1-x, x]; }
  function simp(f){                       /* 复化 Simpson，2000 段 */
    var M=2000, h=1/M, s=f(0)+f(1), i;
    for(i=1;i<M;i++) s += f(i*h)*(i%2?4:2);
    return s*h/3;
  }
  function upd(){
    var kind=$('l6pre').value, n=+$('l6n').value;
    $('l6nv').textContent=fmt(n,2);
    $('l6el').innerHTML = three ? '单元边：3 节点（Q8/LST）' : '单元边：2 节点（CST/Q4）';
    $('l6el').classList.toggle('on', three);
    var nd=three?3:2;
    var F=[], k;
    for(k=0;k<nd;k++) F.push(simp(function(x){ return Nf(x)[k]*qf(kind,n,x); }));
    var tot=F.reduce(function(a,b){ return a+b; },0);
    var ex=simp(function(x){ return qf(kind,n,x); });
    var mom=simp(function(x){ return x*qf(kind,n,x); });
    var xk=three?[0,0.5,1]:[0,1], momN=0;
    for(k=0;k<nd;k++) momN+=F[k]*xk[k];
    $('l6fi').textContent=fmt(F[0],4);
    $('l6fj').textContent=fmt(F[nd-1],4);
    $('l6mw').style.display = three ? '' : 'none';
    if(three) $('l6fm').textContent=fmt(F[1],4);
    $('l6tot').textContent=fmt(tot,4);
    $('l6ex').textContent=fmt(ex,4);
    $('l6mom').innerHTML = (Math.abs(mom-momN)<1e-9)
      ? '✓ <span style="font-size:12px">偏差 '+sci(Math.abs(mom-momN),1)+'</span>'
      : '✗ '+fmt(momN-mom,5);
    /* 绘图 */
    var X0=80, X1=520, Y0=170, HH=110, i;
    var s='';
    s+='<defs><marker id="l6ar" markerWidth="9" markerHeight="9" refX="7.5" refY="3.2" orient="auto">'
      +'<path d="M0,0 L8,3.2 L0,6.4 z" fill="#b03a2e"/></marker>'
      +'<marker id="l6ag" markerWidth="10" markerHeight="10" refX="8.5" refY="3.6" orient="auto">'
      +'<path d="M0,0 L9,3.6 L0,7.2 z" fill="#1e8449"/></marker></defs>';
    /* 分布曲线 */
    var qmax=0; for(i=0;i<=100;i++) qmax=Math.max(qmax, qf(kind,n,i/100));
    qmax=Math.max(qmax, 1e-6);
    var pts=[];
    for(i=0;i<=100;i++){
      var x=i/100;
      pts.push((X0+(X1-X0)*x).toFixed(1)+','+(Y0-HH*qf(kind,n,x)/qmax).toFixed(1));
    }
    s+='<polygon points="'+(X0+','+Y0)+' '+pts.join(' ')+' '+(X1+','+Y0)+'" fill="#fdf0d5" stroke="#bf8f14" stroke-width="1.8"/>';
    /* 分布的下压箭头 */
    for(i=0;i<=10;i++){
      var x2=i/10, q=qf(kind,n,x2)/qmax;
      if(q<0.04) continue;
      var px=X0+(X1-X0)*x2;
      s+='<line x1="'+px.toFixed(1)+'" y1="'+(Y0-HH*q).toFixed(1)+'" x2="'+px.toFixed(1)+'" y2="'+(Y0-4)+'" stroke="#bf8f14" stroke-width="1.2" marker-end="url(#l6ar)" opacity="0.7"/>';
    }
    /* 单元边 */
    s+='<line x1="'+X0+'" y1="'+Y0+'" x2="'+X1+'" y2="'+Y0+'" stroke="#1f2d3d" stroke-width="3"/>';
    /* 节点与等效力 */
    var mxF=Math.max.apply(null, F.map(Math.abs));
    var lbl=three?['i','中','j']:['i','j'];
    for(k=0;k<nd;k++){
      var px2=X0+(X1-X0)*xk[k];
      s+='<circle cx="'+px2+'" cy="'+Y0+'" r="7.5" fill="#fff" stroke="#1a5276" stroke-width="2.4"/>';
      s+='<text x="'+px2+'" y="'+(Y0+4)+'" font-size="11" font-weight="700" fill="#1a5276" text-anchor="middle">'+lbl[k]+'</text>';
      var h=Math.max(6, Math.abs(F[k])/Math.max(mxF,1e-9)*58);
      s+='<line x1="'+px2+'" y1="'+(Y0+18)+'" x2="'+px2+'" y2="'+(Y0+18+h).toFixed(1)+'" stroke="#1e8449" stroke-width="4" marker-end="url(#l6ag)"/>';
      s+='<text x="'+px2+'" y="'+(Y0+18+h+18).toFixed(1)+'" font-size="12" font-family="Consolas,monospace" fill="#1e8449" text-anchor="middle">'+F[k].toFixed(4)+'</text>';
    }
    s+='<text x="'+X0+'" y="'+(Y0-HH-14)+'" font-size="12" fill="#bf8f14">q(ξ)　（峰值归一）</text>';
    s+='<text x="'+(X1+16)+'" y="'+(Y0+5)+'" font-size="12" fill="#7f8c98">ξ=1</text>';
    s+='<text x="'+(X0-30)+'" y="'+(Y0+5)+'" font-size="12" fill="#7f8c98">ξ=0</text>';
    /* 右侧数据 */
    s+='<g font-size="12" font-family="Consolas,monospace">';
    s+='<text x="556" y="52" font-family="Segoe UI" font-size="12.5" font-weight="700" fill="#1f2d3d">校核</text>';
    s+='<text x="556" y="76" fill="#1e8449">ΣF  = '+tot.toFixed(4)+'</text>';
    s+='<text x="556" y="96" fill="#bf8f14">∫q  = '+ex.toFixed(4)+'</text>';
    s+='<text x="556" y="120" fill="#1e8449">ΣFξ = '+momN.toFixed(4)+'</text>';
    s+='<text x="556" y="140" fill="#bf8f14">∫qξ = '+mom.toFixed(4)+'</text>';
    s+='</g>';
    $('l6svg').innerHTML=s;
    /* 说明 */
    var txt='全部数值以 <b>q₀tL</b> 为单位。等效节点力 = <b>∫N<sub>k</sub> q ds</b>，'
      + '它自动保证<b>合力相同</b>（ΣN ≡ 1）与<b>合力矩相同</b>（ΣN<sub>k</sub>ξ<sub>k</sub> ≡ ξ）——这两条是"静力等效"的全部内容。';
    if(!three){
      if(kind==='u') txt+='　均布：各 <b>1/2</b>，就是最朴素的"对半分"。';
      else if(kind==='l2') txt+='　线性（j 端最大）：<b>1/6 : 1/3 = 1:2</b>，大头在载荷大的一端。';
      else if(kind==='l1') txt+='　线性（i 端最大）：<b>1/3 : 1/6 = 2:1</b>。';
      else if(kind==='p') txt+='　抛物线：<b>1/3 : 1/3 = 1:1</b>，两端居然均分——因为形函数是线性的，只"看得见"一阶矩。';
      else txt+='　幂次 q = q₀ξ<sup>n</sup>：比例恒为 <b>1 : (n+1)</b>（当前 1 : '+fmt(n+1,2)+'），'
        + '合力 1/(n+1)。n = 0/1/2/3 依次给出 1:1、1:2、1:3、1:4，这是 (4.47) 最漂亮的推论。';
    }else{
      txt+='　三节点边上均布时是 <b>1/6 : 2/3 : 1/6</b>——<b>角节点比中节点少得多</b>，'
        + '与"离得近就分得多"的直觉相反，是最容易记错的一条 (4.55)。当前 '
        + fmt(F[0],4)+' : '+fmt(F[1],4)+' : '+fmt(F[2],4)+'。';
      if(kind==='l1'||kind==='l2') txt+='　注意三节点边上线性分布会出现<b>负的角节点力</b>吗？试试 n 很大的幂次分布。';
    }
    $('l6note').innerHTML=txt;
  }
  $('l6pre').onchange=upd; $('l6n').oninput=upd;
  $('l6el').onclick=function(){ three=!three; upd(); };
  upd();
})();

/* ================================================ 实验台 7：组装台 */
(function(){
  if(!$('l7next')) return;
  var XY=[[0,0],[1,0],[1,1],[0,1],[0.5,0.5]];
  var ELS=[[0,1,4],[1,2,4],[2,3,4],[3,0,4]];
  var D=Dmat(1,1/3,false);
  var KES=ELS.map(function(el){ return cstKe([XY[el[0]],XY[el[1]],XY[el[2]]], D, 1).ke; });
  var K=zeros(10,10), CNT=zeros(10,10), done=0, showCount=false;
  function LMof(el){ var L=[]; el.forEach(function(n){ L.push(2*n); L.push(2*n+1); }); return L; }
  function render(hit){
    var s='', i, j;
    for(i=0;i<10;i++) for(j=0;j<10;j++){
      var v=K[i][j], cls='kcell';
      if(Math.abs(v)<1e-12) cls+=' zero';
      if(CNT[i][j]>1) cls+=' acc';
      if(hit && hit.indexOf(i)>=0 && hit.indexOf(j)>=0) cls+=' hit';
      var txt = showCount ? (CNT[i][j]||'') : (Math.abs(v)<1e-12 ? '·' : v.toFixed(2));
      s+='<div class="'+cls+'" style="height:28px;font-size:10px;border-radius:4px">'+txt+'</div>';
    }
    $('l7grid').innerHTML=s;
    var nz=0; for(i=0;i<10;i++) for(j=0;j<10;j++) if(Math.abs(K[i][j])>1e-12) nz++;
    var rs=0;
    for(i=0;i<10;i++){ var sx=0, sy=0; for(j=0;j<5;j++){ sx+=K[i][2*j]; sy+=K[i][2*j+1]; } rs=Math.max(rs,Math.abs(sx),Math.abs(sy)); }
    $('l7ne').textContent=done+' / 4';
    $('l7nz').textContent=nz;
    $('l7sp').textContent=Math.round((1-nz/100)*1000)/10+'%';
    $('l7rk').textContent=done?rankOf(K):0;
    $('l7rs').textContent=sci(rs,1);
    $('l7mode').innerHTML = showCount ? '显示：贡献次数' : '显示：数值';
    $('l7mode').classList.toggle('on', showCount);
    /* 网格图 */
    var g='', P=[[40,180],[210,180],[210,20],[40,20],[125,100]];
    var cols=['#1a5276','#1e8449','#7d3c98','#bf8f14'];
    for(var e=0;e<4;e++){
      var el=ELS[e];
      g+='<polygon points="'+el.map(function(n){ return P[n][0]+','+P[n][1]; }).join(' ')
        +'" fill="'+(e<done?cols[e]:'#eef4f8')+'" fill-opacity="'+(e<done?0.22:1)+'" stroke="'
        +(e<done?cols[e]:'#c7d6e1')+'" stroke-width="'+(e===done-1?2.8:1.6)+'"/>';
    }
    var cen=[[125,148],[190,100],[125,50],[62,100]];
    for(var e2=0;e2<4;e2++)
      g+='<text x="'+cen[e2][0]+'" y="'+cen[e2][1]+'" font-size="13" font-weight="700" text-anchor="middle" fill="'
        +(e2<done?cols[e2]:'#b9c6d1')+'">'+['①','②','③','④'][e2]+'</text>';
    for(var n2=0;n2<5;n2++){
      g+='<circle cx="'+P[n2][0]+'" cy="'+P[n2][1]+'" r="8" fill="#fff" stroke="#1f2d3d" stroke-width="2.2"/>';
      g+='<text x="'+P[n2][0]+'" y="'+(P[n2][1]+4)+'" font-size="11.5" font-weight="700" fill="#1f2d3d" text-anchor="middle">'+(n2+1)+'</text>';
    }
    g+='<text x="40" y="203" font-size="11" fill="#7f8c98">边长 1 的正方形，中心加节点 5</text>';
    $('l7svg').innerHTML=g;
  }
  function step(){
    if(done>=4) return;
    var el=ELS[done], LM=LMof(el), ke=KES[done], a, b;
    for(a=0;a<6;a++) for(b=0;b<6;b++){ K[LM[a]][LM[b]]+=ke[a][b]; CNT[LM[a]][LM[b]]++; }
    done++;
    $('l7lm').textContent=LM.map(function(v){ return v+1; }).join(',');
    render(LM);
    var note='刚落下单元 <b>'+['①','②','③','④'][done-1]+'</b>（局部顺序 '
      + ELS[done-1].map(function(n){ return n+1; }).join('-')+'，LM = '+LM.map(function(v){ return v+1; }).join(' ')
      + '）。金色格子是本次写入的 <b>36</b> 个位置；紫色数字表示该位置<b>被多个单元累加过</b>——'
      + '共享节点越多，累加次数越多，这正是 (4.63) 的贡献次数矩阵。';
    if(done===4) note+='　<b>全部组装完毕：</b>非零元 '+$('l7nz').textContent+' 个，秩 <b>'
      + $('l7rk').textContent+'</b>（= 10 − 3，符合秩亏 3），最大 |行和| = <b>'+$('l7rs').textContent
      + '</b> ≈ 0。切到「贡献次数」，与 (4.63) 的 5×5 计数矩阵逐项对照：中心节点 5 被 <b>4</b> 个单元共享，'
      + '对角的 1–3、2–4 从未在同一单元里出现过，所以 K₁₃ = K₂₄ = <b>0</b>。';
    $('l7note').innerHTML=note;
  }
  $('l7next').onclick=step;
  $('l7all').onclick=function(){ while(done<4) step(); };
  $('l7reset').onclick=function(){
    K=zeros(10,10); CNT=zeros(10,10); done=0;
    $('l7lm').textContent='—';
    render(null);
    $('l7note').innerHTML='点击「组装下一个单元」，金色格子表示本次写入的 36 个位置，颜色越深表示被累加的次数越多。'
      + '全部组装完后，秩应当是 <b>7</b>，行和应当全为 <b>0</b>。';
  };
  render(null);
})();

/* ==================================== 实验台 8：边界条件四法 + 罚因子扫描 */
(function(){
  if(!$('l8m')) return;
  /* 例题 4-5 的两单元悬臂板 */
  var E=210e9, nu=1/3, t=0.010;
  var XY=[[0,0],[0,1],[2,0],[2,1]];          // 节点 1..4
  var ELS=[[0,2,3],[0,3,1]];                 // ①(1,3,4) ②(1,4,2)，均逆时针
  var D=Dmat(E,nu,false);
  var K0=assemble(4, ELS, ELS.map(function(el){ return cstKe([XY[el[0]],XY[el[1]],XY[el[2]]], D, t).ke; }));
  var F0=new Float64Array(8); F0[4]=10e3; F0[6]=10e3;     // 右端各 10 kN 沿 +x
  var maxdiag=0; for(var q=0;q<8;q++) maxdiag=Math.max(maxdiag,K0[q][q]);

  function presSet(ub){
    var p={0:0, 1:0, 2:0, 3:0};              // 节点 1、2 完全固定
    if(ub>0) p[4]=ub;                        // 非零时强迫 u₃
    return p;
  }
  function exact(ub){                        /* 缩减法（含移项）——参考解 */
    var pres=presSet(ub), d=new Float64Array(8), i,j;
    for(var k in pres) d[+k]=pres[k];
    var free=[]; for(i=0;i<8;i++) if(!(i in pres)) free.push(i);
    var Kf=zeros(free.length, free.length), bf=new Float64Array(free.length);
    for(i=0;i<free.length;i++){
      var s=F0[free[i]];
      for(var m in pres) s-=K0[free[i]][+m]*pres[m];
      bf[i]=s;
      for(j=0;j<free.length;j++) Kf[i][j]=K0[free[i]][free[j]];
    }
    var x=solveLin(Kf,bf);
    if(x) for(i=0;i<free.length;i++) d[free[i]]=x[i];
    var ev=eigSym(Kf);
    return {d:d, cond:ev[ev.length-1]/ev[0], free:free, ok:!!x};
  }
  function condOf(A){ var ev=eigSym(A); return Math.abs(ev[ev.length-1])/Math.max(Math.abs(ev[0]),1e-300); }

  function upd(){
    var meth=+$('l8m').value, p=+$('l8p').value, ub=+$('l8u').value*1e-3;
    $('l8pv').textContent=p; $('l8uv').textContent=fmt(+$('l8u').value,2);
    var pres=presSet(ub), ref=exact(ub), i, j, k;
    var A=zeros(8,8), b=new Float64Array(8), d=null, cond=Infinity, tag=[], singular=false;
    for(i=0;i<8;i++){ b[i]=F0[i]; for(j=0;j<8;j++) A[i][j]=K0[i][j]; }

    if(meth===0){                                  /* 原始，未施加 */
      d=solveLin(A,b); singular=!d; cond=condOf(A);
    }else if(meth===1){                             /* 直接缩减 */
      d=ref.d; cond=ref.cond;
      for(k in pres) tag.push(+k);
    }else if(meth===2){                             /* 化 1 置 0（含移项） */
      for(k in pres){
        var r=+k, v=pres[k];
        for(i=0;i<8;i++) if(!(i in pres)) b[i]-=A[i][r]*v;
        for(i=0;i<8;i++){ A[r][i]=0; A[i][r]=0; }
        A[r][r]=1; b[r]=v; tag.push(r);
      }
      d=solveLin(A,b); cond=condOf(A);
    }else{                                          /* 乘大数（罚函数） */
      var al=Math.pow(10,p)*maxdiag;
      for(k in pres){ var r2=+k; A[r2][r2]+=al; b[r2]+=al*pres[k]; tag.push(r2); }
      d=solveLin(A,b); cond=condOf(A);
    }
    var nmv=['u₃','v₃','u₄','v₄'], outs=['l8a','l8b','l8c','l8d'];
    if(!d || singular){
      outs.forEach(function(o){ $(o).textContent='奇异'; });
      $('l8cond').textContent='∞';
      $('l8viol').textContent='—'; $('l8err').textContent='—';
    }else{
      for(i=0;i<4;i++) $(outs[i]).textContent=fmt(d[4+i]*1e3,6);
      $('l8cond').textContent=sci(cond,2);
      var viol=0; for(k in pres) viol=Math.max(viol, Math.abs(d[+k]-pres[k]));
      $('l8viol').textContent=(viol===0?'0':sci(viol*1e3,1)+' mm');
      var err=0; for(i=0;i<8;i++) err=Math.max(err, Math.abs(d[i]-ref.d[i]));
      $('l8err').textContent=(err===0?'0（参考解本身）':sci(err*1e3,1)+' mm');
    }
    /* 矩阵形态 8×8 */
    var s='';
    for(i=0;i<8;i++) for(j=0;j<8;j++){
      var cls='kcell', txt;
      if(meth===1 && (tag.indexOf(i)>=0 || tag.indexOf(j)>=0)){ cls+=' zero'; txt='—'; }
      else{
        var v=A[i][j];
        if(Math.abs(v)<1e-6){ cls+=' zero'; txt='0'; }
        else if(Math.abs(v)>1e3*maxdiag){ cls+=' acc'; txt=sci(v/1e9,0); }
        else txt=(v/1e9).toFixed(1);
        if(tag.indexOf(i)>=0 && tag.indexOf(j)>=0 && i===j) cls+=' hit';
        else if(tag.indexOf(i)>=0 || tag.indexOf(j)>=0) cls+=' tgt';
      }
      s+='<div class="'+cls+'" style="height:30px;font-size:9.5px;border-radius:4px">'+txt+'</div>';
    }
    $('l8grid').innerHTML=s;
    /* 变形图 */
    var AMP=3000, X0=40, Y0=150, L=110;
    function map(x,y,dx,dy){ return [X0+(x+(dx||0)*AMP)*L, Y0-(y+(dy||0)*AMP)*L]; }
    var g='', e;
    for(e=0;e<2;e++){
      var el=ELS[e];
      g+='<polygon points="'+el.map(function(n){ var q2=map(XY[n][0],XY[n][1]); return q2[0].toFixed(1)+','+q2[1].toFixed(1); }).join(' ')
        +'" fill="none" stroke="#c7d6e1" stroke-width="1.4" stroke-dasharray="5 4"/>';
    }
    if(d) for(e=0;e<2;e++){
      var el2=ELS[e];
      g+='<polygon points="'+el2.map(function(n){ var q3=map(XY[n][0],XY[n][1],d[2*n],d[2*n+1]); return q3[0].toFixed(1)+','+q3[1].toFixed(1); }).join(' ')
        +'" fill="#eaf3f9" fill-opacity="0.75" stroke="#1a5276" stroke-width="2"/>';
    }
    for(var n3=0;n3<4;n3++){
      var q4=d?map(XY[n3][0],XY[n3][1],d[2*n3],d[2*n3+1]):map(XY[n3][0],XY[n3][1]);
      var fixedNode = (n3===0||n3===1);
      g+='<circle cx="'+q4[0].toFixed(1)+'" cy="'+q4[1].toFixed(1)+'" r="6.5" fill="'+(fixedNode?'#7f8c98':'#fff')
        +'" stroke="#1f2d3d" stroke-width="2"/>';
      g+='<text x="'+(q4[0]+(n3<2?-14:14)).toFixed(1)+'" y="'+(q4[1]+4).toFixed(1)
        +'" font-size="11.5" font-weight="700" fill="#1f2d3d" text-anchor="middle">'+(n3+1)+'</text>';
    }
    g+='<text x="'+X0+'" y="178" font-size="10.5" fill="#7f8c98">灰点＝固定；右端两节点各受 10 kN（+x）</text>';
    $('l8svg').innerHTML=g;
    /* 说明 */
    var txt;
    if(meth===0){
      txt='<b>未施加任何边界条件时 K 是奇异的</b>：秩 '+rankOf(K0)+' &lt; 8，亏损正好 <b>3</b>（两个平动 + 一个转动）。'
        + '求解器会报"奇异矩阵 / 负主元 / pivot 过小"。<b>这不是 bug，而是物理：</b>没有支座的结构可以随意飘走。';
    }else if(meth===1){
      txt='<b>直接缩减法</b>是本实验台的<b>参考解</b>：约束自由度被真正删除，矩阵缩成 '
        + ref.free.length+'×'+ref.free.length+'，条件数 <b>'+sci(ref.cond,2)+'</b>——四种方法里最好的。'
        + '代价是要维护"整体编号 ↔ 缩减编号"的映射表，反力必须事后由 R = K<sub>cf</sub>d<sub>f</sub> 回算。';
    }else if(meth===2){
      txt='<b>化 1 置 0 法</b>：约束行列清零、对角置 1，矩阵尺寸不变（便于编程）。'
        + '注意条件数看起来很差（'+sci(cond,2)+'），因为"1"与其余元素（约 10⁹）相差九个数量级；'
        + '但该行列已<b>完全解耦</b>，对精度毫无影响（当前与参考解偏差 '+$('l8err').textContent+'）——'
        + '<b>条件数必须结合矩阵结构来读，不能只看数字。</b>';
      if(ub>0) txt+='　当前有非零强迫位移，程序已按 8.3 节<b>先移项</b>：F<sub>s</sub> ← F<sub>s</sub> − K<sub>sr</sub>·'
        + fmt(ub*1e3,2)+' mm。<b>漏掉这一步是本章头号错误</b>，结果会完全错。';
    }else{
      var al2=Math.pow(10,p);
      txt='<b>乘大数（罚函数）法</b>：α = 10<sup>'+p+'</sup>×max K<sub>ii</sub> = '+sci(al2*maxdiag,2)+'。'
        + '约束违反 <b>'+$('l8viol').textContent+'</b>，与参考解偏差 <b>'+$('l8err').textContent+'</b>，条件数 <b>'+sci(cond,2)+'</b>。';
      if(p<6) txt+='　α <b>太小</b>：约束没有真正压住，位移明显偏离参考解——罚函数是"很硬的弹簧"，不是刚性约束。';
      else if(p>14) txt+='　α <b>太大</b>：条件数已到 '+sci(cond,2)+'，浮点舍入开始吞掉有效位数，'
        + '继续加大 α 精度<b>反而会崩</b>。这就是 8.4 节那张扫描表的结论。';
      else txt+='　这是<b>推荐区间</b>（10⁸~10¹²）：约束违反已远小于工程精度，条件数还在双精度能承受的范围内。'
        + '把滑块拖到两端，看精度如何在"约束不够硬"与"数值不稳"之间被夹住。';
    }
    $('l8note').innerHTML=txt;
  }
  $('l8m').onchange=upd; $('l8p').oninput=upd; $('l8u').oninput=upd;
  upd();
})();

/* ================================ 悬臂深梁：实验台 9 / 10 共用的迷你求解器 */
var BM={L:2.0, H:1.0, t:0.010, E:210e9, nu:1/3, P:10e3};
var BMD=Dmat(BM.E, BM.nu, false);
var MESHES=[[2,1],[4,2],[8,4],[16,8]];
/* 由 verify 脚本（Python/NumPy）算得的更细网格结果，用于画完整收敛曲线 */
var TAB={
  dof:[12,30,90,306,1122,2450],
  lab:['2×1','4×2','8×4','16×8','32×16','48×24'],
  CST:[0.058892,0.104954,0.150113,0.171998,0.179315,0.180918],
  Q4 :[0.120635,0.156453,0.173745,0.179673,0.181585,0.182038]
};
var REF=0.182038, EULER=0.152381, TIMO=0.182857;
function beamMesh(nx,ny){
  var nodes=[], i, j;
  for(j=0;j<=ny;j++) for(i=0;i<=nx;i++) nodes.push([BM.L*i/nx, BM.H*j/ny]);
  var nid=function(i,j){ return j*(nx+1)+i; };
  var tris=[], quads=[];
  for(j=0;j<ny;j++) for(i=0;i<nx;i++){
    var n1=nid(i,j), n2=nid(i+1,j), n3=nid(i+1,j+1), n4=nid(i,j+1);
    quads.push([n1,n2,n3,n4]); tris.push([n1,n2,n3]); tris.push([n1,n3,n4]);
  }
  return {nodes:nodes, tris:tris, quads:quads, nid:nid};
}
var beamCache={};
function beamSolve(nx,ny,kind){
  var key=nx+'_'+ny+'_'+kind;
  if(beamCache[key]) return beamCache[key];
  var M=beamMesh(nx,ny), nodes=M.nodes, nn=nodes.length;
  var els = (kind==='CST') ? M.tris : M.quads;
  var kes = els.map(function(el){
    var p=el.map(function(n){ return nodes[n]; });
    return (kind==='CST') ? cstKe(p,BMD,BM.t).ke : q4Ke(p,BMD,BM.t).ke;
  });
  var K=assemble(nn, els, kes);
  var F=new Float64Array(2*nn), j;
  var right=[], w=[];
  for(j=0;j<=ny;j++) right.push(M.nid(nx,j));
  for(j=0;j<right.length;j++) w.push((j===0||j===right.length-1)?0.5:1);
  var sw=w.reduce(function(a,b){ return a+b; },0);
  for(j=0;j<right.length;j++) F[2*right[j]+1] -= BM.P*w[j]/sw;
  var fixed={};
  for(j=0;j<=ny;j++){ var n=M.nid(0,j); fixed[2*n]=1; fixed[2*n+1]=1; }
  var free=[], i;
  for(i=0;i<2*nn;i++) if(!fixed[i]) free.push(i);
  var Kf=zeros(free.length,free.length), bf=new Float64Array(free.length);
  for(i=0;i<free.length;i++){
    bf[i]=F[free[i]];
    var Ki=K[free[i]], row=Kf[i];
    for(j=0;j<free.length;j++) row[j]=Ki[free[j]];
  }
  var x=solveLin(Kf,bf), u=new Float64Array(2*nn);
  if(x) for(i=0;i<free.length;i++) u[free[i]]=x[i];
  var tip=-(u[2*M.nid(nx,0)+1]+u[2*M.nid(nx,ny)+1])/2;
  /* CST 单元应力 */
  var estress=null;
  if(kind==='CST'){
    estress=M.tris.map(function(el){
      var p=el.map(function(n){ return nodes[n]; }), r=cstBA(p), B=r.B;
      var de=[], k;
      for(k=0;k<3;k++){ de.push(u[2*el[k]]); de.push(u[2*el[k]+1]); }
      var eps=[0,0,0], sg=[0,0,0], a;
      for(a=0;a<3;a++){ var s=0; for(k=0;k<6;k++) s+=B[a][k]*de[k]; eps[a]=s; }
      for(a=0;a<3;a++){ var s2=0; for(k=0;k<3;k++) s2+=BMD[a][k]*eps[k]; sg[a]=s2; }
      return {sig:sg, A:r.A};
    });
  }
  var out={M:M, u:u, tip:tip, ndof:2*nn, nel:els.length, estress:estress, nx:nx, ny:ny};
  beamCache[key]=out;
  return out;
}
function measuredP(kind){
  var a=TAB[kind][2], b=TAB[kind][3], c=TAB[kind][4];
  return Math.log((b-a)/(c-b))/Math.LN2;
}

/* ============================================ 实验台 9：收敛实验台 */
(function(){
  if(!$('l9run')) return;
  function upd(){
    var lvl=+$('l9m').value, kind=$('l9k').value;
    var nx=MESHES[lvl-1][0], ny=MESHES[lvl-1][1];
    $('l9mv').textContent=nx+'×'+ny;
    var R=beamSolve(nx,ny,kind);
    $('l9dof').textContent=R.ndof;
    $('l9ne').textContent=R.nel;
    $('l9d').textContent=fmt(R.tip*1e3,6)+' mm';
    $('l9err').textContent=fmt((R.tip*1e3/(REF*1e3)-1)*100,2)+' %';
    $('l9eu').textContent=fmt(R.tip*1e3/(EULER*1e3),3)+' ×';
    $('l9p').textContent=fmt(measuredP(kind),3);
    /* 左：变形网格 */
    var s='', X0=22, Y0=150, SX=250/BM.L, SY=250/BM.L, AMP=260;
    var nodes=R.M.nodes, u=R.u;
    function mp(n){ return [X0+(nodes[n][0]+u[2*n]*AMP)*SX, Y0-(nodes[n][1]+u[2*n+1]*AMP)*SY]; }
    s+='<rect x="'+X0+'" y="'+(Y0-BM.H*SY)+'" width="'+(BM.L*SX)+'" height="'+(BM.H*SY)
      +'" fill="none" stroke="#c7d6e1" stroke-width="1.2" stroke-dasharray="5 4"/>';
    var els = (kind==='CST')?R.M.tris:R.M.quads;
    s+='<g fill="#eaf3f9" fill-opacity="0.8" stroke="#5d7f96" stroke-width="'+(els.length>120?0.5:1.1)+'">';
    els.forEach(function(el){
      s+='<polygon points="'+el.map(function(n){ var q=mp(n); return q[0].toFixed(1)+','+q[1].toFixed(1); }).join(' ')+'"/>';
    });
    s+='</g>';
    s+='<g stroke="#7f8c98" stroke-width="1.6">';
    for(var yy=Y0-BM.H*SY; yy<Y0; yy+=14) s+='<line x1="'+X0+'" y1="'+yy.toFixed(1)+'" x2="'+(X0-9)+'" y2="'+(yy+9).toFixed(1)+'"/>';
    s+='<line x1="'+X0+'" y1="'+(Y0-BM.H*SY)+'" x2="'+X0+'" y2="'+Y0+'"/></g>';
    s+='<text x="'+X0+'" y="176" font-size="11" fill="#7f8c98">'+kind+'　'+nx+'×'+ny+'　'+R.nel+' 个单元　变形放大 '+AMP+' 倍</text>';
    s+='<text x="'+(X0+BM.L*SX-4)+'" y="'+(Y0+16)+'" font-size="11" fill="#b03a2e" text-anchor="end">P = 10 kN ↓</text>';
    /* 右：误差–自由度双对数曲线 */
    var GX=330, GY=200, GW=300, GH=160;
    s+='<rect x="'+GX+'" y="'+(GY-GH)+'" width="'+GW+'" height="'+GH+'" fill="#fbfdfe" stroke="#dde7ee"/>';
    var lx=function(dof){ return GX+ (Math.log(dof)/Math.LN10-1)/(Math.log(3000)/Math.LN10-1)*GW; };
    var ly=function(err){ return GY - (Math.log(Math.max(err,0.1))/Math.LN10+1)/(Math.log(100)/Math.LN10+1)*GH; };
    var gi;
    s+='<g stroke="#eef4f8" stroke-width="1">';
    for(gi=0;gi<=3;gi++) s+='<line x1="'+GX+'" y1="'+ly(Math.pow(10,gi-1))+'" x2="'+(GX+GW)+'" y2="'+ly(Math.pow(10,gi-1))+'"/>';
    for(gi=1;gi<=3;gi++) s+='<line x1="'+lx(Math.pow(10,gi))+'" y1="'+(GY-GH)+'" x2="'+lx(Math.pow(10,gi))+'" y2="'+GY+'"/>';
    s+='</g>';
    s+='<g font-size="10" fill="#7f8c98" text-anchor="end">';
    for(gi=0;gi<=3;gi++) s+='<text x="'+(GX-4)+'" y="'+(ly(Math.pow(10,gi-1))+3.5)+'">'+[0.1,1,10,100][gi]+'%</text>';
    s+='</g>';
    s+='<g font-size="10" fill="#7f8c98" text-anchor="middle">';
    for(gi=1;gi<=3;gi++) s+='<text x="'+lx(Math.pow(10,gi))+'" y="'+(GY+14)+'">10'+['','¹','²','³'][gi]+'</text>';
    s+='</g>';
    s+='<text x="'+(GX+GW/2)+'" y="'+(GY+30)+'" font-size="11" fill="#1f2d3d" text-anchor="middle">总自由度（对数）</text>';
    s+='<text x="'+(GX-4)+'" y="'+(GY-GH-8)+'" font-size="11" fill="#1f2d3d">相对误差（对数）</text>';
    ['CST','Q4'].forEach(function(kk){
      var col = (kk==='CST') ? '#b03a2e' : '#1e8449';
      var on = (kk===kind);
      var pts=[];
      for(gi=0;gi<5;gi++){
        var er=Math.abs(TAB[kk][gi]/REF-1)*100;
        pts.push(lx(TAB.dof[gi]).toFixed(1)+','+ly(er).toFixed(1));
      }
      s+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+col+'" stroke-width="'+(on?2.6:1.3)
        +'" opacity="'+(on?1:0.35)+'"/>';
      for(gi=0;gi<5;gi++){
        var er2=Math.abs(TAB[kk][gi]/REF-1)*100;
        s+='<circle cx="'+lx(TAB.dof[gi]).toFixed(1)+'" cy="'+ly(er2).toFixed(1)+'" r="'+(on?3.6:2.2)
          +'" fill="'+col+'" opacity="'+(on?1:0.35)+'"/>';
      }
      s+='<text x="'+(GX+GW-6)+'" y="'+(ly(Math.abs(TAB[kk][4]/REF-1)*100)-8)+'" font-size="11" fill="'+col
        +'" text-anchor="end" opacity="'+(on?1:0.45)+'">'+kk+'　p≈'+fmt(measuredP(kk),2)+'</text>';
    });
    var cer=Math.abs(R.tip/REF-1)*100;
    s+='<circle cx="'+lx(R.ndof).toFixed(1)+'" cy="'+ly(cer).toFixed(1)+'" r="8" fill="none" stroke="#bf8f14" stroke-width="2.4"/>';
    $('l9svg').innerHTML=s;
    var txt='当前 '+kind+' '+nx+'×'+ny+'：'+R.ndof+' 个自由度，端部挠度 <b>'+fmt(R.tip*1e3,6)+' mm</b>，'
      + '相对参照解（48×24 Q4 = 0.182038 mm）误差 <b>'+fmt((R.tip/REF-1)*100,2)+' %</b>。'
      + '误差<b>始终为负</b>——有限元解无例外地偏硬，这是最小势能下限性质（5.7 节）。';
    txt+='　双对数曲线的斜率就是收敛阶：实测 '+kind+' 的 <b>p ≈ '+fmt(measuredP(kind),2)+'</b>'
      + '（理论 2，略低是因为固支端存在应力奇异）。'
      + '曲线上 Q4 比 CST <b>整体低一个量级</b>：要达到同样精度，CST 需要数倍的自由度——<b>单元阶次比网格密度更值钱</b>。';
    txt+='　该梁 L/h = 2，属深梁：收敛值 0.1820 mm 接近 Timoshenko 解 0.182857 mm，'
      + '而 Euler 梁只有 0.152381 mm（当前比值 '+fmt(R.tip/EULER,3)+'）——<b>剪切变形贡献了 20 %</b>。';
    $('l9note').innerHTML=txt;
  }
  $('l9m').oninput=upd; $('l9k').onchange=upd; $('l9run').onclick=upd;
  upd();
})();

/* ==================================== 实验台 10：应力云图 原始 vs 平均 */
(function(){
  if(!$('l10m')) return;
  var averaged=false;
  function comp(sig, c){
    if(c<3) return sig[c];
    return Math.sqrt(sig[0]*sig[0]-sig[0]*sig[1]+sig[1]*sig[1]+3*sig[2]*sig[2]);
  }
  function colDiv(t){                       /* t∈[−1,1] 蓝—白—红 */
    t=Math.max(-1,Math.min(1,t));
    var a=[26,82,118], b=[250,252,253], c=[176,58,46], f, p, q2;
    if(t<0){ f=-t; p=b; q2=a; } else { f=t; p=b; q2=c; }
    var r=Math.round(p[0]+(q2[0]-p[0])*f), g=Math.round(p[1]+(q2[1]-p[1])*f), bl=Math.round(p[2]+(q2[2]-p[2])*f);
    return 'rgb('+r+','+g+','+bl+')';
  }
  function colSeq(t){                       /* t∈[0,1] 浅黄—红 */
    t=Math.max(0,Math.min(1,t));
    var a=[253,246,230], b=[176,58,46];
    return 'rgb('+Math.round(a[0]+(b[0]-a[0])*t)+','+Math.round(a[1]+(b[1]-a[1])*t)+','+Math.round(a[2]+(b[2]-a[2])*t)+')';
  }
  function upd(){
    var lvl=+$('l10m').value, c=+$('l10c').value;
    var nx=MESHES[lvl-1][0], ny=MESHES[lvl-1][1];
    $('l10mv').textContent=nx+'×'+ny;
    $('l10mode').textContent = averaged ? '当前：绕节点平均' : '当前：单元常应力';
    $('l10mode').classList.toggle('on', averaged);
    var R=beamSolve(nx,ny,'CST'), tris=R.M.tris, nodes=R.M.nodes, es=R.estress, i, k;
    var ev=es.map(function(e){ return comp(e.sig,c)/1e6; });          // MPa
    /* 面积加权绕节点平均 */
    var acc=new Float64Array(nodes.length), wsum=new Float64Array(nodes.length);
    var vmax=new Float64Array(nodes.length), vmin=new Float64Array(nodes.length), cnt=new Int32Array(nodes.length);
    for(i=0;i<nodes.length;i++){ vmax[i]=-1e30; vmin[i]=1e30; }
    tris.forEach(function(el,e){
      el.forEach(function(n){
        acc[n]+=ev[e]*es[e].A; wsum[n]+=es[e].A; cnt[n]++;
        if(ev[e]>vmax[n]) vmax[n]=ev[e];
        if(ev[e]<vmin[n]) vmin[n]=ev[e];
      });
    });
    var nv=new Float64Array(nodes.length);
    for(i=0;i<nodes.length;i++) nv[i]= wsum[i]>0 ? acc[i]/wsum[i] : 0;
    var jump=0;
    for(i=0;i<nodes.length;i++) if(cnt[i]>1) jump=Math.max(jump, vmax[i]-vmin[i]);
    var lo=Math.min.apply(null, Array.prototype.slice.call(ev)), hi=Math.max.apply(null, Array.prototype.slice.call(ev));
    var alo=Math.min.apply(null, Array.prototype.slice.call(nv)), ahi=Math.max.apply(null, Array.prototype.slice.call(nv));
    var mn = averaged?alo:lo, mx = averaged?ahi:hi;
    var seq = (c===3);
    var sc = seq ? Math.max(Math.abs(mx),1e-9) : Math.max(Math.abs(mn),Math.abs(mx),1e-9);
    function col(v){ return seq ? colSeq(v/sc) : colDiv(v/sc); }
    /* 跨中截面（x = L/2）峰值 */
    var midx=BM.L/2, mid=0;
    if(averaged){
      for(i=0;i<nodes.length;i++) if(Math.abs(nodes[i][0]-midx)<1e-9) if(Math.abs(nv[i])>Math.abs(mid)) mid=nv[i];
    }else{
      tris.forEach(function(el,e){
        var cx=(nodes[el[0]][0]+nodes[el[1]][0]+nodes[el[2]][0])/3;
        if(Math.abs(cx-midx)<BM.L/nx*0.7 && Math.abs(ev[e])>Math.abs(mid)) mid=ev[e];
      });
    }
    $('l10ne').textContent=tris.length;
    $('l10max').textContent=fmt(mx,4);
    $('l10min').textContent=fmt(mn,4);
    $('l10jump').textContent=fmt(jump,4);
    $('l10mid').textContent=fmt(mid,4)+' MPa';
    /* 绘制 */
    var X0=24, Y0=214, SX=480/BM.L, SY=170/BM.H;
    function px(p){ return [X0+p[0]*SX, Y0-p[1]*SY]; }
    var s='';
    var depth = tris.length<=64 ? 2 : (tris.length<=256 ? 1 : 0);
    function tri3(p1,p2,p3,v1,v2,v3,d){
      if(d===0){
        var a=px(p1), b=px(p2), cc=px(p3);
        return '<polygon points="'+a[0].toFixed(1)+','+a[1].toFixed(1)+' '+b[0].toFixed(1)+','+b[1].toFixed(1)
          +' '+cc[0].toFixed(1)+','+cc[1].toFixed(1)+'" fill="'+col((v1+v2+v3)/3)+'" stroke="none" shape-rendering="crispEdges"/>';
      }
      var m12=[(p1[0]+p2[0])/2,(p1[1]+p2[1])/2], m23=[(p2[0]+p3[0])/2,(p2[1]+p3[1])/2], m31=[(p3[0]+p1[0])/2,(p3[1]+p1[1])/2];
      var v12=(v1+v2)/2, v23=(v2+v3)/2, v31=(v3+v1)/2;
      return tri3(p1,m12,m31,v1,v12,v31,d-1)+tri3(m12,p2,m23,v12,v2,v23,d-1)
           + tri3(m31,m23,p3,v31,v23,v3,d-1)+tri3(m12,m23,m31,v12,v23,v31,d-1);
    }
    tris.forEach(function(el,e){
      var p1=nodes[el[0]], p2=nodes[el[1]], p3=nodes[el[2]];
      if(averaged) s+=tri3(p1,p2,p3,nv[el[0]],nv[el[1]],nv[el[2]],depth);
      else{
        var a=px(p1), b=px(p2), cc=px(p3);
        s+='<polygon points="'+a[0].toFixed(1)+','+a[1].toFixed(1)+' '+b[0].toFixed(1)+','+b[1].toFixed(1)
          +' '+cc[0].toFixed(1)+','+cc[1].toFixed(1)+'" fill="'+col(ev[e])+'" stroke="#ffffff" stroke-width="0.35"/>';
      }
    });
    /* 网格线（浅） */
    if(tris.length<=256){
      s+='<g fill="none" stroke="#1f2d3d" stroke-opacity="0.13" stroke-width="0.5">';
      tris.forEach(function(el){
        s+='<polygon points="'+el.map(function(n){ var q=px(nodes[n]); return q[0].toFixed(1)+','+q[1].toFixed(1); }).join(' ')+'"/>';
      });
      s+='</g>';
    }
    /* 跨中截面标线 */
    var mq1=px([midx,0]), mq2=px([midx,BM.H]);
    s+='<line x1="'+mq1[0].toFixed(1)+'" y1="'+mq1[1].toFixed(1)+'" x2="'+mq2[0].toFixed(1)+'" y2="'+mq2[1].toFixed(1)
      +'" stroke="#1f2d3d" stroke-width="1.4" stroke-dasharray="6 4"/>';
    s+='<text x="'+mq2[0].toFixed(1)+'" y="'+(mq2[1]-6)+'" font-size="10.5" fill="#1f2d3d" text-anchor="middle">跨中截面</text>';
    s+='<text x="'+X0+'" y="'+(Y0+18)+'" font-size="11" fill="#7f8c98">'+nx+'×'+ny+' CST（'+tris.length+' 个单元），'
      + (averaged?'绕节点平均（面积加权）':'单元常应力（未平均）')+'</text>';
    /* 色标 */
    var CBX=548, CBY=214, CBH=170, CBW=20, nseg=40;
    for(var g2=0; g2<nseg; g2++){
      var f=g2/(nseg-1), v=mn+(mx-mn)*f;
      s+='<rect x="'+CBX+'" y="'+(CBY-CBH*(g2+1)/nseg).toFixed(1)+'" width="'+CBW+'" height="'+(CBH/nseg+0.6).toFixed(2)
        +'" fill="'+col(v)+'" stroke="none"/>';
    }
    s+='<rect x="'+CBX+'" y="'+(CBY-CBH)+'" width="'+CBW+'" height="'+CBH+'" fill="none" stroke="#7f8c98" stroke-width="1"/>';
    var names=['σx','σy','τxy','von Mises'];
    s+='<text x="'+(CBX+CBW/2)+'" y="'+(CBY-CBH-10)+'" font-size="11.5" font-weight="700" fill="#1f2d3d" text-anchor="middle">'+names[c]+'</text>';
    s+='<text x="'+(CBX+CBW/2)+'" y="'+(CBY-CBH-24)+'" font-size="10" fill="#7f8c98" text-anchor="middle">MPa</text>';
    for(var g3=0;g3<=4;g3++){
      var vv=mn+(mx-mn)*g3/4, yy=CBY-CBH*g3/4;
      s+='<text x="'+(CBX+CBW+6)+'" y="'+(yy+3.5).toFixed(1)+'" font-size="10" font-family="Consolas,monospace" fill="#1f2d3d">'+vv.toFixed(2)+'</text>';
    }
    $('l10svg').innerHTML=s;
    var txt='当前分量 <b>'+names[c]+'</b>，'+(averaged?'绕节点平均':'单元常应力')+'：极值 '
      + fmt(mn,3)+' ~ '+fmt(mx,3)+' MPa，最大节点跳跃 <b>η = '+fmt(jump,3)+' MPa</b>。';
    if(!averaged) txt+='　注意白色缝隙勾出的<b>阶梯状色块</b>——每个 CST 单元内应力是常数，相邻单元各说各话。'
      + '切到「绕节点平均」，阶梯会被抹平，<b>但极值也被削掉一点</b>（这正是平均的代价：一次低通滤波）。';
    else txt+='　云图已连续，形态与梁理论的线性分布吻合；但<b>上下自由表面偏内</b>——'
      + '边界节点只有单侧单元贡献，平均值被内部的较小值拉低（10.2 节的三条"不可平均"之一）。';
    txt+='　跳跃量随加密约按 <b>O(h)</b> 减小（'+nx+'×'+ny+' 时 η = '+fmt(jump,3)+'），'
      + '而平均后的应力误差按 <b>O(h²)</b> 减小——<b>后处理把应力的收敛阶提高了整整一阶</b>。'
      + '注意最粗的两级网格上 η 反而偏小，那是"应力整体都算小了"，不代表精度高：'
      + '<b>误差指示器只有进入渐近收敛区后才可信</b>。';
    $('l10note').innerHTML=txt;
  }
  $('l10m').oninput=upd; $('l10c').onchange=upd;
  $('l10mode').onclick=function(){ averaged=!averaged; upd(); };
  upd();
})();

/* ================================================ 实验台 11：概念快测 */
(function(){
  var box=$('quiz');
  if(!box) return;
  var Q=[
    { q:'一块厚 8 mm 的钢板在平面内受拉，应按哪种问题计算？',
      o:['平面应力','平面应变','轴对称','需要三维实体'], a:0,
      w:'薄板 + 面内载荷 ⇒ 板厚方向应力可忽略，σ_z = 0，属<b>平面应力</b>。长柱横截面（重力坝、厚壁管）才是平面应变 → 复习 §1.2' },
    { q:'三节点常应变三角形单元（CST）内部的应力分布是',
      o:['常数','沿 x 线性','沿 y 线性','双线性'], a:0,
      w:'位移是完全一次多项式，求一次导后降为零次 ⇒ 应变与应力在<b>整个单元内为常数</b>，这是它画不出弯曲应力的根本原因 → 复习 §4.2、§10.1' },
    { q:'单元刚度矩阵 k<sup>e</sup> = ∫B<sup>T</sup>DB t dA 的秩亏为 3，物理原因是',
      o:['三个刚体自由度不产生应变','三个节点','应变有三个分量','D 是 3×3 的'], a:0,
      w:'两个平动 + 一个转动共 3 个刚体模式落在 k<sup>e</sup> 的零空间里，因此秩 = 6 − 3 = 3；表现为每行的 x 列之和与 y 列之和都为零 → 复习 §5.5、思考题 2' },
    { q:'长 L 的单元边上受<b>三角形</b>分布载荷（一端 0、另一端 q），两端节点的等效力之比为',
      o:['1 : 2','1 : 1','1 : 3','2 : 3'], a:0,
      w:'由母公式 (4.47)：q ∝ ξ 时 F_i = qtL/6、F_j = qtL/3，即 <b>1:2</b>。一般规律 q ∝ ξⁿ ⇒ 1:(n+1) → 复习 §6.4、实验台 6' },
    { q:'Q8 单元一条边上受均布压力，三个节点（角-中-角）的等效力之比是',
      o:['1/6 : 2/3 : 1/6','1/4 : 1/2 : 1/4','1/3 : 1/3 : 1/3','1/2 : 0 : 1/2'], a:0,
      w:'<b>角节点比中节点少得多</b>，与直觉相反，是最容易记错的一条。原因是二次形函数在角点附近取负值 → 复习 §6.7、(4.55)' },
    { q:'用"化 1 置 0 法"施加<b>非零</b>强迫位移时，最容易漏掉的一步是',
      o:['把该列对其余方程的贡献移到右端项','把对角元改成 1','把整行清零','重新计算带宽'], a:0,
      w:'必须先做 F_s ← F_s − K_sr·d̄_r 再清零，否则强迫位移对其他自由度的影响全部丢失，结果完全错 → 复习 §8.3、实验台 8' },
    { q:'一个模型约束了 3 个以上自由度、求解器<b>没有任何报警</b>，但结构偏硬、出现本不该有的 σ_y。最可能是',
      o:['过约束','欠约束','网格太粗','载荷等效错误'], a:0,
      w:'<b>欠约束会报错，过约束不会报错</b>，所以后者危险得多。排查法：做一次纯热膨胀或纯重力试算，若算出异常应力即为过约束 → 复习 §8.8、例题 4-5、习题 5' },
    { q:'网格加密一次（h → h/2），位移误差与"相邻单元应力跳跃 η"分别大致降为原来的',
      o:['1/4 与 1/2','1/2 与 1/4','1/4 与 1/4','1/2 与 1/2'], a:0,
      w:'位移是 O(h²) ⇒ 降为 1/4；跳跃量是 O(h) ⇒ 降为 1/2。绕节点平均后应力误差恢复到 O(h²)，这就是后处理的价值 → 复习 §10.6' }
  ];
  var score=0, answered=0;
  function build(){
    score=0; answered=0;
    box.innerHTML=Q.map(function(it,n){
      return '<div class="qz-item" data-n="'+n+'"><div class="qz-q"><i>Q'+(n+1)+'</i>'+it.q+'</div>'
        + '<div class="qz-opts">'+it.o.map(function(o,m){
            return '<div class="qz-o" data-m="'+m+'">'+String.fromCharCode(65+m)+'. '+o+'</div>';
          }).join('')+'</div><div class="qz-why">'+it.w+'</div></div>';
    }).join('');
    $('qzBar').style.width='0%';
    $('qzScore').textContent='0 / '+Q.length;
  }
  box.addEventListener('click', function(ev){
    var o=ev.target.closest ? ev.target.closest('.qz-o') : null;
    if(!o) return;
    var item=o.parentNode.parentNode;
    if(item.classList.contains('done')) return;
    var n=+item.getAttribute('data-n'), m=+o.getAttribute('data-m'), ok=(m===Q[n].a);
    item.classList.add('done');
    o.classList.add(ok?'right':'wrong');
    if(!ok) item.querySelectorAll('.qz-o')[Q[n].a].classList.add('right');
    if(ok) score++;
    answered++;
    $('qzScore').textContent=score+' / '+Q.length;
    $('qzBar').style.width=(answered/Q.length*100)+'%';
    if(answered===Q.length){
      var tip;
      if(score===Q.length) tip='满分，可以去做习题 4 了 🎯';
      else if(score>=6) tip='基础扎实，重点补一下答错那几节';
      else if(score>=4) tip='概念还不稳，建议重读 §5~§8 与各实验台';
      else tip='建议从 §1 重新走一遍逻辑链（图 4.13）';
      $('qzScore').textContent=score+' / '+Q.length+'　'+tip;
    }
  });
  $('qzReset').onclick=build;
  build();
})();

})();
