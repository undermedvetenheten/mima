const fs = require("fs");
let src = fs.readFileSync("mima/mimamap.js", "utf8") + "\nmodule.exports = testMimaMap;";
fs.writeFileSync("./_mm_tmp.js", src);
const M = require("./_mm_tmp.js");
const g = M.grammar;
function esc(s){return s.replace(/[.*+?^=!:${}()|[\]/\\]/g,"\\$&");}
function re(n){return new RegExp("\\b("+g[n].map(esc).join("|")+")\\b","i");}
const order=["worldask","stone","astrology","subcon","food","melted","pelog","still","temp","boob","microtide","name","wonder","showme","notai","bunk","trigger"];
const dest={worldask:"worldgaze",stone:"nebula",subcon:"under",wonder:"lull",showme:"reverie",trigger:"soothe"};
function route(i){for(const p of order)if(g[p]&&re(p).test(i))return (dest[p]||p)+"  via #"+p+"#";return "(falls through)";}
["swamp","a swamp","the swamp","show me a world","a planet","a nebula","a galaxy"].forEach(t=>console.log(route(t).padEnd(24),"<=",t));
console.log("\nworld content pool intact:", JSON.stringify(g.world[0]));
console.log("worldask is triggers:", JSON.stringify(g.worldask[0]));
fs.unlinkSync("./_mm_tmp.js");
