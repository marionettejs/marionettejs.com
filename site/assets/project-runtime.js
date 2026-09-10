export async function importProject(project, vendor, nonce) {
  const urls = [];
  const makeURL = source => { const url = URL.createObjectURL(new Blob([source], {type:'text/javascript'})); urls.push(url); return url; };
  const vendorURL = makeURL(vendor);
  const imports = { marionette: vendorURL, '@mnjs/data': vendorURL };
  for (const [file, source] of Object.entries(project.modules)) imports['demo:' + file] = makeURL(source);
  const map = document.createElement('script');
  map.type = 'importmap';
  if (nonce) map.nonce = nonce;
  map.textContent = JSON.stringify({ imports });
  document.head.append(map);
  try {
    const library = await import(vendorURL);
    const appModule = await import(imports['demo:' + project.entry]);
    // URLs stay valid for dynamic imports for the lifetime of this iframe or Pen.
    addEventListener('pagehide', () => urls.forEach(url => URL.revokeObjectURL(url)), {once:true});
    return {library,appModule};
  } catch (error) { urls.forEach(url => URL.revokeObjectURL(url)); throw error; }
}
