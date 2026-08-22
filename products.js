// Shafee Saree Collection — fast live product data from GitHub
const RAW_BASE='https://raw.githubusercontent.com/shabazmomin980-cmd/shafee-saree-collection/main/';
const DATA_URL=RAW_BASE+'products.json';

const _FALLBACK_PRODUCTS = [
['03d7989f-2208-4f35-b42e-cf1ed193d21c.jpeg','Saree Collection 01',null,true],['0d7c198b-bcd9-46cb-bb60-001325640242.jpeg','Saree Collection 02',null,true],['18f593eb-e815-40fb-82aa-c51754bf4b6e.jpeg','Saree Collection 03',null,true],['25e1bda3-0c86-49ff-af2f-7577c875950e.jpeg','Saree Collection 04',null,true],['44788866-4037-4e5e-9668-65ae5a7a6099.jpeg','Saree Collection 05',null,true],['47759725-176F-42B8-93F8-547E922E2674.png','Saree Collection 06',null,true],['4e07232c-2a95-4719-b145-ed8e3cf351e5.jpeg','Saree Collection 07',null,true],['5147ff8c-abc7-4c22-a7dd-f1bed26552db.jpeg','Saree Collection 08',null,true],['56617170-931b-4411-89e1-be4777f54b23.jpeg','Saree Collection 09',null,true],['5c24f46b-b5bb-4ad8-9a23-7a0b71fcb0ed.jpeg','Saree Collection 10',null,true],['79937d37-a5d5-43f7-ac43-5326dc8c6150.jpeg','Saree Collection 11',null,true],['81bb7eb4-12e3-40f9-9b56-bb30dbed31af.jpeg','Saree Collection 12',null,true],['9c4b50b2-89f4-44e8-a8bf-328290174637.jpeg','Saree Collection 13',null,true],['a80d2593-aee9-4c82-8482-59cdac067f11.jpeg','Saree Collection 14',null,true],['a9b005e2-3d95-4208-a0c9-2424c060f66e.jpeg','Saree Collection 15',null,true],['b277cd2f-b33c-4538-8f2d-ba1e5c325371.jpeg','Saree Collection 16',null,true],['ca48ad9c-ad90-4ff7-8396-d5839fa4e85a.jpeg','Saree Collection 17',null,true],['dec6ef7e-0572-4ed2-98b0-048264bdf23f.jpeg','Saree Collection 18',null,true]
];

function liveImage(path){
  if(!path) return '';
  if(/^https?:\/\//i.test(path)) return path;
  return RAW_BASE + path.replace(/^\/+/, '');
}
function normalize(p){
  return [liveImage(p.image||''),p.name||'Saree',p.price==null||p.price===''?null:Number(p.price),p.inStock!==false,p.id];
}

let _LIVE_PRODUCTS=_FALLBACK_PRODUCTS.map(x=>[liveImage(x[0]),...x.slice(1)]);
const PRODUCTS=new Proxy(_LIVE_PRODUCTS,{get(t,p){if(p==='map')return cb=>t.filter(x=>x[3]!==false).map((x,i)=>cb(x,i));if(p==='length')return t.filter(x=>x[3]!==false).length;if(/^[0-9]+$/.test(String(p)))return t.filter(x=>x[3]!==false)[Number(p)];return Reflect.get(t,p)}});

(async()=>{
  try{
    // Read the catalogue directly from GitHub's raw content service.
    // This avoids waiting for a GitHub Pages rebuild after every admin change.
    const r=await fetch(DATA_URL+'?v='+Date.now(),{cache:'no-store'});
    if(!r.ok) return;
    const d=await r.json();
    if(Array.isArray(d)){
      _LIVE_PRODUCTS.length=0;
      d.forEach(p=>_LIVE_PRODUCTS.push(normalize(p)));
      window.dispatchEvent(new Event('shafee-products-loaded'));
    }
  }catch(e){console.warn('Using bundled product list',e)}
})();

window.addEventListener('shafee-products-loaded',()=>{
  const s=document.getElementById('search');
  const t=document.getElementById('searchTop');
  if(s) s.dispatchEvent(new Event('input'));
  if(t&&typeof render==='function') render();
  if(_LIVE_PRODUCTS.length){
    ['preview1','preview2','preview3'].forEach((id,i)=>{
      const el=document.getElementById(id);
      if(el) el.src=_LIVE_PRODUCTS[i]?.[0]||_LIVE_PRODUCTS[0][0]
    })
  }
});