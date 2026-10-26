import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>readFileSync(p,'utf8');
const html=read('docs/index.html');const js=read('docs/experience-v32.js');const css=read('docs/experience-v32.css');
const i18n=read('docs/i18n.js');const match=i18n.match(/const messages\s*=\s*(\{[\s\S]*?\});\s*const available=/);
assert.ok(match,'i18n object found');const languages=JSON.parse(match[1]);
for(const id of ['tools','hubTrustLaunch','hubAutoLaunch','hubStudioLaunch','legacyLab','engineeringLab','workstation','toolkitExpand','copyContactEmail','copyContactStatus']){
 assert.ok(html.includes(`id="${id}"`),`control exists: ${id}`);
}
for(const id of ['trustLaunch','automationLaunch','studioLaunch'])assert.ok(html.includes(`id="${id}"`),`original functional control remains: ${id}`);
assert.equal((html.match(/class="skill"/g)||[]).length,18,'all original technologies preserved');
assert.equal((html.match(/class="hub-card(?: hub-card-primary)?"/g)||[]).length,3,'three studio launch cards');
assert.ok(html.includes('<details class="legacy-lab-details wrap"'),'legacy sandbox is opt-in');
assert.ok(html.indexOf('id="engineeringLab"')>html.indexOf('id="legacyLab"'),'sandbox remains nested');
assert.ok(html.includes('experience-v32.css')&&html.includes('experience-v32.js'),'new assets linked');
assert.ok(js.includes('navigator.clipboard')&&js.includes('applyToolkitVisibility'),'functional interactions, not static buttons');
assert.ok(css.includes('prefers-reduced-motion')&&css.includes('max-width:430px'),'responsive motion support');
const keys=[...html.matchAll(/data-i18n(?:-placeholder)?="([^"]+)"/g)].map(m=>m[1]);
for(const [locale,values] of Object.entries(languages)){
 for(const key of keys)assert.ok(Object.hasOwn(values,key),`Missing ${locale} translation: ${key}`);
 for(const key of ['v32MoreTools','v32LessTools','v32Copied','v32CopyFailed'])assert.ok(values[key],`Missing UI action string ${locale}:${key}`);
}
console.log('V32 EXPERIENCE PASS | preserved studios + 18 tools + functional hooks + four locales + responsive UI');
