import WebSocket from "ws";
const ws=new WebSocket("ws://localhost:3055");
ws.on("open",()=>{ws.send(JSON.stringify({id:"j1",type:"join",channel:"flowux"}));setTimeout(()=>ws.send(JSON.stringify({id:"c1",type:"message",channel:"flowux",message:{id:"c1",command:"get_document_info",params:{commandId:"c1"}}})),500);});
ws.on("message",d=>console.log(d.toString().slice(0,300)));
setTimeout(()=>process.exit(0),8000);
