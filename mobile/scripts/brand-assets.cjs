// Deterministic rasterization of the repository's exact Figma wordmark.
const fs = require('node:fs');
const {Resvg} = require('@resvg/resvg-js');
const mark = fs.readFileSync('assets/figma/brand.svg','utf8').replace(/<svg[^>]*>/,'<g>').replace('</svg>','</g>');
for(const [name,background] of [['icon','#0C0D12'],['adaptive-icon','transparent']]) {
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">'+(background==='transparent'?'':'<rect width="1024" height="1024" fill="'+background+'"/>')+'<g transform="translate(222 472) scale(2.56)">'+mark+'</g></svg>';
 fs.writeFileSync('assets/'+name+'.png',new Resvg(svg).render().asPng());
}
