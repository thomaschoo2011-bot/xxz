'use strict';
(function(root){
const zeros=(m,n)=>Array.from({length:m},()=>Array(n).fill(0));
const mv=(a,x)=>a.map(r=>r.reduce((s,v,j)=>s+v*x[j],0));
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
function material(E,nu,plane='stress'){
 if(!(E>0&&nu>-1&&nu<.5))throw Error('材料参数不合法');
 return plane==='strain'?[[1-nu,nu,0],[nu,1-nu,0],[0,0,(1-2*nu)/2]].map(r=>r.map(v=>v*E/((1+nu)*(1-2*nu)))):[[1,nu,0],[nu,1,0],[0,0,(1-nu)/2]].map(r=>r.map(v=>v*E/(1-nu*nu)));
}
function cst(p,E=210000,nu=.3,t=10,plane='stress'){
 const [[x1,y1],[x2,y2],[x3,y3]]=p,A=((x2-x1)*(y3-y1)-(x3-x1)*(y2-y1))/2;
 if(A<=1e-12)throw Error('三角形须逆时针编号且面积为正');
 const b=[y2-y3,y3-y1,y1-y2],c=[x3-x2,x1-x3,x2-x1];
 const B=[b.flatMap(v=>[v/(2*A),0]),c.flatMap(v=>[0,v/(2*A)]),b.flatMap((v,i)=>[c[i]/(2*A),v/(2*A)])],D=material(E,nu,plane),k=zeros(6,6);
 for(let i=0;i<6;i++)for(let j=0;j<6;j++)for(let a=0;a<3;a++)for(let d=0;d<3;d++)k[i][j]+=t*A*B[a][i]*D[a][d]*B[d][j];
 return {A,B,D,k};
}
function solve(A,b){const n=b.length,a=A.map((r,i)=>[...r,b[i]]),scale=Math.max(...A.map((r,i)=>Math.abs(r[i])));for(let i=0;i<n;i++){let p=i;for(let j=i+1;j<n;j++)if(Math.abs(a[j][i])>Math.abs(a[p][i]))p=j;if(Math.abs(a[p][i])<scale*1e-13)throw Error('刚度矩阵奇异，请检查约束');[a[p],a[i]]=[a[i],a[p]];for(let j=i+1;j<n;j++){const f=a[j][i]/a[i][i];for(let k=i;k<=n;k++)a[j][k]-=f*a[i][k];}}const x=Array(n).fill(0);for(let i=n-1;i>=0;i--)x[i]=(a[i][n]-a[i].slice(i+1,n).reduce((s,v,j)=>s+v*x[i+1+j],0))/a[i][i];return x;}
function constrain(K,F,bc){const free=F.map((_,i)=>i).filter(i=>!(i in bc)),d=F.map((_,i)=>bc[i]??0);const rhs=free.map(i=>F[i]-Object.entries(bc).reduce((s,[j,v])=>s+K[i][j]*v,0));const u=solve(free.map(i=>free.map(j=>K[i][j])),rhs);free.forEach((i,j)=>d[i]=u[j]);const kd=mv(K,d),R=kd.map((v,i)=>v-F[i]);return {d,R,free,energy:.5*dot(d,kd),residual:Math.max(0,...free.map(i=>Math.abs(R[i])))};}
const rules={1:{x:[0],w:[2]},2:{x:[-1/Math.sqrt(3),1/Math.sqrt(3)],w:[1,1]},3:{x:[-Math.sqrt(3/5),0,Math.sqrt(3/5)],w:[5/9,8/9,5/9]},4:{x:[-.8611363115940526,-.3399810435848563,.3399810435848563,.8611363115940526],w:[.3478548451374538,.6521451548625461,.6521451548625461,.3478548451374538]}};
function edgeLoad(L,fun,order=3){const {x,w}=rules[order];let f=[0,0];for(let g=0;g<x.length;g++){const r=(x[g]+1)/2,q=fun(r);f[0]+=(1-r)*q*L/2*w[g];f[1]+=r*q*L/2*w[g];}return f;}
function model({kind='patch',nx=2,E=210000,nu=.3,t=10,load=10,plane='stress'}={}){
 const L=1000,H=500,ny=Math.max(1,Math.round(nx/2)),nodes=[],elems=[];
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++)nodes.push([L*i/nx,H*j/ny]);const id=(i,j)=>j*(nx+1)+i;
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=id(i,j),b=id(i+1,j),c=id(i+1,j+1),d=id(i,j+1);if(nx>1&&i>=nx/2)elems.push([a,b,d],[b,c,d]);else elems.push([a,b,c],[a,c,d]);}
 const K=zeros(nodes.length*2,nodes.length*2),F=Array(nodes.length*2).fill(0),data=[];
 for(const ns of elems){const e=cst(ns.map(i=>nodes[i]),E,nu,t,plane),map=ns.flatMap(i=>[2*i,2*i+1]);map.forEach((i,a)=>map.forEach((j,b)=>K[i][j]+=e.k[a][b]));data.push({...e,map,ns});}
 const bc={};for(let j=0;j<=ny;j++){bc[2*id(0,j)]=0;if(kind==='cantilever'||kind==='fixed')bc[2*id(0,j)+1]=0;}if(kind==='patch')bc[1]=0;
 if(kind==='fixed')for(let j=0;j<=ny;j++){bc[2*id(nx,j)]=0;bc[2*id(nx,j)+1]=0;}
 if(kind==='patch'||kind==='cantilever'){const dir=kind==='patch'?0:1,q=kind==='patch'?load*t:-load*t;for(let j=0;j<ny;j++){F[2*id(nx,j)+dir]+=q*H/ny/2;F[2*id(nx,j+1)+dir]+=q*H/ny/2;}}
 else for(let i=0;i<nx;i++){F[2*id(i,ny)+1]-=load*t*L/nx/2;F[2*id(i+1,ny)+1]-=load*t*L/nx/2;}
 const result=constrain(K,F,bc);data.forEach(e=>{e.strain=mv(e.B,e.map.map(i=>result.d[i]));e.stress=mv(e.D,e.strain);const [x,y,xy]=e.stress;e.vm=plane==='strain'?Math.sqrt(((x-y)**2+(y-nu*(x+y))**2+(nu*(x+y)-x)**2)/2+3*xy**2):Math.sqrt(x*x-x*y+y*y+3*xy*xy);});
 return {...result,nodes,elems,data,K,F,bc,L,H,nx,ny,kind,E,nu,t,load,plane};
}
root.FEM={zeros,mv,dot,material,cst,solve,constrain,edgeLoad,rules,model};if(typeof module!=='undefined')module.exports=root.FEM;
})(typeof window==='undefined'?globalThis:window);

