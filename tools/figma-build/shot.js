const n = await figma.getNodeByIdAsync(ARG);
const bytes = await n.exportAsync({format:'PNG', constraint:{type:'SCALE', value: __S__}});
return figma.base64Encode(bytes);
