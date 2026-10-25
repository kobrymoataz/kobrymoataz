/* V29 static build regression for geographical context and evidence; runtime behavior
 * is additionally exercised in scripts/qa_perspective_v29.py (browser-only). */
import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
const get=p=>readFileSync(resolve('docs',p),'utf8');
const html=get('index.html'),globe=get('globe.js'),ui=get('perspective.js'),styles=get('perspective.css');
const translate=get('i18n.js'),atlas=get('assets/img/regional-atlas.svg');
for(const key of ['data-perspective-mode="atlas"','data-perspective-mode="earth"','atlasPins','atlasNetwork','placeCoordinates','placeSource','repoEvidenceRefresh'])assert.ok(html.includes(key),'Missing V29 element '+key);
for(const key of ['setMode(mode)','setConnections(enabled)','setLighting(enabled)','getState()','mk:perspective-place','webglcontextlost','dataset.yaw'])assert.ok(globe.includes(key),'Globe bridge missing '+key);
assert.ok(!globe.includes("getContext('webgl2'"),'GLSL 1.00 must not be passed as a WebGL2 shader');
assert.ok(globe.includes("getContext('webgl'"),'GLSL 1.00 WebGL1 renderer missing');
for(const key of ['mk:globe-unavailable','perspectiveAtlasInstruction','select(id)','atlasPins','status.textContent','updateEvidence','getRepo'])assert.ok(ui.includes(key),'Perspective interaction missing '+key);
for(const key of ['grid-template-columns:repeat(3','@media(max-width:430px)','prefers-reduced-motion','globe-stage[data-mode="atlas"]'])assert.ok(styles.includes(key),'Responsive styling missing '+key);
for(const lang of ['en','fr','es','ar']){
  assert.ok(translate.includes(`"${lang}": {`),'Missing locale '+lang);
  for(const key of ['dossierMadrid','dossierRabat','dossierBrussels','dossierCiudad','perspectiveEarth','perspectiveAtlas','evidenceTitle']){
    const range=translate.slice(translate.indexOf(`"${lang}": {`),translate.indexOf(`"${lang}": {`)+8500);
    assert.ok(range.includes(`"${key}"`),'Locale missing '+lang+' / '+key);
  }
}
assert.ok(atlas.includes('<path')&&atlas.includes('WGS84'),'Regional atlas should be a real geographic illustration');
assert.ok(existsSync('docs/assets/img/earth-texture.webp'),'Local Earth texture missing');
assert.ok(html.includes('mailto:president@mycdic.org')&&!html.includes('Moataz_Kobry_Professional_CV.pdf'),'Private CV contact policy broken');
console.log('V29 PERSPECTIVE REGRESSION PASS | interactive globe/atlas + source links + GitHub live evidence + four locales');
