const sec = figma.currentPage.children.find(n=>n.name==='02 Components');
const out=[];
for (const n of sec.children){
  if(n.type!=='COMPONENT_SET' && n.type!=='COMPONENT') continue;
  const props = n.type==='COMPONENT_SET' || !(n.parent&&n.parent.type==='COMPONENT_SET') ? Object.entries(n.componentPropertyDefinitions).map(([k,v])=>k+':'+v.type+(v.variantOptions?'['+v.variantOptions.join('/')+']':'')) : [];
  const sample = n.type==='COMPONENT_SET'? n.defaultVariant : n;
  const texts = sample.findAllWithCriteria({types:['TEXT']}).map(t=>t.name+'="'+t.characters.slice(0,20)+'"');
  const inst = sample.findAllWithCriteria({types:['INSTANCE']}).map(i=>i.name).slice(0,6);
  out.push(`${n.name} ${n.id} ${Math.round(sample.width)}x${Math.round(sample.height)} | ${props.join(', ')} | T: ${texts.join('; ')} | I: ${inst.join(',')}`);
}
return out;
