import { getStore } from '@netlify/blobs';
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';

const seed = [
  ['03d7989f-2208-4f35-b42e-cf1ed193d21c.jpeg','Saree Collection 01',null,true],
  ['0d7c198b-bcd9-46cb-bb60-001325640242.jpeg','Saree Collection 02',null,true],
  ['18f593eb-e815-40fb-82aa-c51754bf4b6e.jpeg','Saree Collection 03',null,true],
  ['25e1bda3-0c86-49ff-af2f-7577c875950e.jpeg','Saree Collection 04',null,true],
  ['44788866-4037-4e5e-9668-65ae5a7a6099.jpeg','Saree Collection 05',null,true],
  ['47759725-176F-42B8-93F8-547E922E2674.png','Saree Collection 06',null,true],
  ['4e07232c-2a95-4719-b145-ed8e3cf351e5.jpeg','Saree Collection 07',null,true],
  ['5147ff8c-abc7-4c22-a7dd-f1bed26552db.jpeg','Saree Collection 08',null,true],
  ['56617170-931b-4411-89e1-be4777f54b23.jpeg','Saree Collection 09',null,true],
  ['5c24f46b-b5bb-4ad8-9a23-7a0b71fcb0ed.jpeg','Saree Collection 10',null,true],
  ['79937d37-a5d5-43f7-ac43-5326dc8c6150.jpeg','Saree Collection 11',null,true],
  ['81bb7eb4-12e3-40f9-9b56-bb30dbed31af.jpeg','Saree Collection 12',null,true],
  ['9c4b50b2-89f4-44e8-a8bf-328290174637.jpeg','Saree Collection 13',null,true],
  ['a80d2593-aee9-4c82-8482-59cdac067f11.jpeg','Saree Collection 14',null,true],
  ['a9b005e2-3d95-4208-a0c9-2424c060f66e.jpeg','Saree Collection 15',null,true],
  ['b277cd2f-b33c-4538-8f2d-ba1e5c325371.jpeg','Saree Collection 16',null,true],
  ['ca48ad9c-ad90-4ff7-8396-d5839fa4e85a.jpeg','Saree Collection 17',null,true],
  ['dec6ef7e-0572-4ed2-98b0-048264bdf23f.jpeg','Saree Collection 18',null,true]
];

const store = () => getStore('shafee-products', { consistency: 'strong' });
const password = () => Netlify.env.get('ADMIN_PASSWORD') || '';

function tokenFor(ts) {
  return `${ts}.${createHmac('sha256', password()).update(String(ts)).digest('base64url')}`;
}
function validToken(token) {
  if (!token) return false;
  const [ts, sig] = token.split('.');
  if (!ts || !sig || Date.now() - Number(ts) > 12 * 60 * 60 * 1000) return false;
  const expected = createHmac('sha256', password()).update(ts).digest('base64url');
  return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
function auth(req) { return validToken((req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')); }
async function products() { return (await store().get('products', { type: 'json' })) || seed; }
function json(data, status=200) { return new Response(JSON.stringify(data), { status, headers: { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' } }); }

export default async (req) => {
  const url = new URL(req.url);

  if (url.pathname === '/products.js' && req.method === 'GET') {
    const all = await products();
    const live = all.filter(p => p[3] !== false).map(p => p.slice(0,3));
    return new Response(`const PRODUCTS = ${JSON.stringify(live)};`, { headers: { 'content-type':'application/javascript; charset=utf-8', 'cache-control':'no-store' } });
  }

  if (url.pathname === '/product-image' && req.method === 'GET') {
    const key = url.searchParams.get('key');
    if (!key) return new Response('Missing image key', { status:400 });
    const blob = await store().get(key, { type:'blob' });
    if (!blob) return new Response('Not found', { status:404 });
    return new Response(blob, { headers: { 'cache-control':'public, max-age=31536000, immutable' } });
  }

  if (url.pathname !== '/admin-api') return new Response('Not found', { status:404 });

  if (req.method === 'POST') {
    const type = req.headers.get('content-type') || '';
    if (type.includes('application/json')) {
      const body = await req.json();
      if (body.action === 'login') {
        if (!password() || body.password !== password()) return json({ ok:false, error:'Wrong password' }, 401);
        return json({ ok:true, token:tokenFor(Date.now()) });
      }
      if (!auth(req)) return json({ ok:false, error:'Unauthorized' }, 401);
      if (body.action === 'save') {
        if (!Array.isArray(body.products)) return json({ ok:false, error:'Invalid products' }, 400);
        await store().setJSON('products', body.products);
        return json({ ok:true });
      }
    }

    if (type.includes('multipart/form-data')) {
      if (!auth(req)) return json({ ok:false, error:'Unauthorized' }, 401);
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) return json({ ok:false, error:'No image selected' }, 400);
      const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase() || 'jpg';
      const key = `images/${randomUUID()}.${ext}`;
      await store().set(key, file, { metadata: { contentType: file.type || 'image/jpeg' } });
      return json({ ok:true, url:`/product-image?key=${encodeURIComponent(key)}` });
    }
  }

  if (req.method === 'GET') {
    if (!auth(req)) return json({ ok:false, error:'Unauthorized' }, 401);
    return json({ ok:true, products:await products() });
  }

  return json({ ok:false, error:'Method not allowed' }, 405);
};

export const config = { path: ['/products.js','/product-image','/admin-api'], preferStatic: false };
