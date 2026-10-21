const fs=require('fs'),path=require('path');
const brands=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/@fortawesome/free-brands-svg-icons');
const root='/mnt/data/Moataz_Kobry_Profile_V14';
const out=path.join(root,'docs','logos');
fs.mkdirSync(out,{recursive:true});
const map={
 javascript:['faJs','#E1BD58'],typescript:['faJs','#4F8BB7'],python:['faPython','#93B1C6'],java:['faJava','#D4A083'],php:['faPhp','#9A9FCB'],react:['faReact','#76C4D1'],nodejs:['faNodeJs','#88B982'],github:['faGithub','#EAE5D9'],git:['faGitAlt','#DA956A'],googleworkspace:['faGoogle','#D3C8AE'],microsoft365:['faMicrosoft','#D9AF8D'],docker:['faDocker','#78A4C4'],html:['faHtml5','#D7A17A'],css:['faCss3Alt','#78A6C4'],npm:['faNpm','#C77E77'],wordpress:['faWordpress','#9EB6C9']
};
for(const [name,[key,color]] of Object.entries(map)){
 const o=brands[key];if(!o){console.log('missing',name,key);continue;}
 const [w,h,, ,d]=o.icon;
 const p=Array.isArray(d)?d.join(' '):d;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${name}"><path fill="${color}" d="${p}"/></svg>`;
 fs.writeFileSync(path.join(out,name+'.svg'),svg);
}
// self-drawn neutral monogram icons for tools without FontAwesome brand icon
const custom={
 n8n:{fill:'#E4A99C',label:'n8n'},
 mongodb:{fill:'#88B294',label:'DB'},
 postgresql:{fill:'#9AB5CF',label:'SQL'},
 reactnative:{fill:'#80BCD0',label:'RN'},
 prompt:{fill:'#B5AD8F',label:'>_'},
 aicoding:{fill:'#C7B39A',label:'AI'},
 mail:{fill:'#9DAFBD',label:'@'},
 cybersecurity:{fill:'#C6AE8A',label:'SEC'}
};
for(const [name,{fill,label}] of Object.entries(custom)){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="${name}"><rect x="8" y="8" width="112" height="112" rx="26" fill="#1C272D" stroke="#56616A" stroke-width="3"/><text x="64" y="76" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${label.length>3?37:43}" fill="${fill}" text-anchor="middle">${label}</text></svg>`;
 fs.writeFileSync(path.join(out,name+'.svg'),svg);
}
// Copy also into README icons folder
fs.mkdirSync(path.join(root,'assets','logos'),{recursive:true});
for(const file of fs.readdirSync(out))fs.copyFileSync(path.join(out,file),path.join(root,'assets','logos',file));
console.log('Generated',fs.readdirSync(out).length,'logos');
