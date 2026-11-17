// 95 LIVE RANKING server starter
// Requires Node.js and the community TikTok LIVE connector package.
const express = require('express');
const { WebcastPushConnection } = require('tiktok-live-connector');
const app = express();
app.use(express.json());
app.use(express.static('public'));
let live = null;
let clients = new Set();
let status = { connected:false, username:'', message:'ยังไม่ได้เชื่อมต่อ' };
function send(type, data) {
  const msg = `event: ${type}\\ndata: ${JSON.stringify(data)}\\n\\n`;
  for (const client of clients) client.write(msg);
}
app.get('/events', (req,res) => {
  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.setHeader('Connection','keep-alive');
  clients.add(res); res.write(`event: status\\ndata: ${JSON.stringify(status)}\\n\\n`);
  req.on('close',()=>clients.delete(res));
});
app.get('/status',(req,res)=>res.json(status));
app.post('/connect',async(req,res)=>{
  const username=String(req.body.username||'').replace(/^@/,'').trim();
  if(!username) return res.status(400).json({error:'กรุณาใส่ชื่อบัญชี'});
  try {
    if(live) { try { await live.disconnect(); } catch(e) {} }
    live=new WebcastPushConnection(username);
    live.on('connected',()=>{status={connected:true,username,message:'เชื่อมต่อแล้ว'};send('status',status)});
    live.on('gift',d=>send('gift',{username:d.uniqueId||d.nickname||'ผู้ชม',nickname:d.nickname||d.uniqueId||'ผู้ชม',giftName:d.giftName||'ของขวัญ',diamondCount:d.diamondCount||0,repeatCount:d.repeatCount||1}));
    live.on('disconnected',()=>{status={connected:false,username,message:'ตัดการเชื่อมต่อแล้ว'};send('status',status)});
    await live.connect();
    status={connected:true,username,message:'เชื่อมต่อแล้ว'};
    res.json({ok:true,status});
  } catch(e) { status={connected:false,username,message:e.message||'เชื่อมต่อไม่สำเร็จ'};send('status',status);res.status(500).json({error:status.message}); }
});
app.listen(process.env.PORT||3000);
