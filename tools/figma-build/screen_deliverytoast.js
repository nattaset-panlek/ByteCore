// 08 Apps: desktop with the "Package delivered" toast (GDD 3.7), cloned from 03 Shell "Screen/Desktop + Toast"
const sec = figma.currentPage.children.find((n) => n.type === "SECTION" && n.name === "08 Apps");
const NAME = "Screen/Desktop + Delivery toast";
clearByName(sec, NAME);
const src = await figma.getNodeByIdAsync("13:25166");
const s = src.clone();
sec.appendChild(s);
s.name = NAME;
s.x = 120;
s.y = 4720;
const toast = s.findOne((n) => n.type === "INSTANCE" && n.name.startsWith("Toast/"));
toast.name = "Toast/Package delivered";
await setImg(toast.findOne((n) => n.type === "FRAME" && n.name.startsWith("app/")), "app/RigManager");
setTexts(toast, { app: "Rig Manager", title: "Package delivered", message: "Placeholder part has arrived.", message2: "Install it from Rig Manager." });
const labels = toast.findAll((n) => n.type === "TEXT" && n.name === "label");
labels[0].characters = "Open Rig Manager";
labels[1].characters = "Dismiss";
return s.id;
