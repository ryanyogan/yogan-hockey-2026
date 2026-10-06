const B="https://site.api.espn.com/apis/site/v2/sports/hockey/nhl";
const j=async u=>{const r=await fetch(u,{headers:{"accept-encoding":"gzip"}});return {r,d:await r.json()}};
const dates=["20261005","20260415","20251015","20241015","20221015","20181015"];
const q=(a,p)=>a.length?a[Math.min(a.length-1,Math.floor(a.length*p))]:null;
for(const dt of dates){
  const {d:sb}=await j(`${B}/scoreboard?dates=${dt}`);
  const ev=(sb.events||[]).filter(e=>e.status.type.completed)[0];
  if(!ev){console.log(dt,"no completed game");continue}
  const raw=await fetch(`${B}/summary?event=${ev.id}`);
  const txt=await raw.text(); const d=JSON.parse(txt);
  const gz=(await import("node:zlib")).gzipSync(txt).length;
  const plays=d.plays||[];
  const st=d.header.competitions[0].status;
  const withWall=plays.filter(p=>p.wallclock), withMod=plays.filter(p=>p.modified), withXY=plays.filter(p=>p.coordinate);
  const lag=plays.filter(p=>p.wallclock&&p.modified).map(p=>(Date.parse(p.modified)-Date.parse(p.wallclock))/60000).sort((a,b)=>a-b);
  const end=Math.max(...withWall.map(p=>Date.parse(p.wallclock)));
  const after=plays.filter(p=>p.modified&&Date.parse(p.modified)>end+60000).length;
  let seqOk=true,wallOk=true,prevS=-1,prevW=0;const ids=new Set();
  for(const p of plays){const s=Number(p.sequenceNumber);if(s<=prevS)seqOk=false;prevS=s;const w=Date.parse(p.wallclock||0);if(w&&w<prevW-1000)wallOk=false;if(w)prevW=w;ids.add(p.id)}
  const types={};for(const p of plays)types[p.type?.text]=(types[p.type?.text]||0)+1;
  console.log(`${dt} ${ev.shortName} id=${ev.id} bytes=${txt.length} gzip=${gz} cc=${raw.headers.get("cache-control")} status=${st.type.name}/${st.type.state} plays=${plays.length} wallclock=${withWall.length} modified=${withMod.length} coords=${withXY.length} uniqueIds=${ids.size} seqAscending=${seqOk} wallclockAscending=${wallOk}`);
  if(lag.length)console.log(`   modified-wallclock minutes: p10=${q(lag,.1).toFixed(1)} median=${q(lag,.5).toFixed(1)} p90=${q(lag,.9).toFixed(1)} max=${lag.at(-1).toFixed(1)}; plays modified after the last play: ${after}`);
  if(dt==="20261005")console.log("   types:",JSON.stringify(types));
}
const {d:sb}=await j(`${B}/scoreboard`);const names={};for(const e of sb.events)names[e.status.type.name+"/"+e.status.type.state]=(names[e.status.type.name+"/"+e.status.type.state]||0)+1;console.log("today's scoreboard statuses:",JSON.stringify(names));
