// 08 Apps: Profile (Settings-style page: avatar header, level Meter, SettingsCard rows)
const sec = figma.currentPage.children.find((n) => n.type === "SECTION" && n.name === "08 Apps");

const { page } = await settingsWindow(sec, "Window/Profile", "Profile", "app/Profile", 120, 2880, {
  navHeader: { picture: await personPicture("PN"), title: "player_name", caption: "player@xea.local" },
  search: "Find a setting",
  nav: [["Your info", "icon/home"], ["Appearance", "icon/paint_brush"], ["Inventory", "icon/square_multiple"], ["Privacy", "icon/lock_closed"], ["Notifications", "icon/speaker_2"], ["Linked accounts", "icon/globe"]],
  selected: "Your info",
  footer: ["Settings", "icon/settings"],
  pageTitle: "Your info",
});

// Avatar header (Settings "Home" header pattern)
const head = AL("H", { name: "Profile header", pad: [0, 0, 16, 0], gap: 20, cross: "CENTER" });
add(page, head, { fw: true });
head.appendChild(await personPicture("PN", 72));
const who = AL("V", { name: "text", gap: 2 });
head.appendChild(who);
who.appendChild(await T("player_name", "Subtitle", "text/primary"));
who.appendChild(await T("Member since 0000  ·  ID 0000-0000", "Body", "text/secondary"));
const tags = AL("H", { name: "badges", gap: 8, pad: [6, 0, 0, 0] });
who.appendChild(tags);
for (const [tone, label] of [["Accent", "Rank placeholder"], ["Success", "Online"]]) {
  const b = inst("Badge", { Tone: tone });
  props(b, { Label: label });
  tags.appendChild(b);
}
add(head, spacer(), { grow: true });
head.appendChild(btn("Edit profile"));

// Level card
const lvl = card("Card/Level", { gap: 12 });
add(page, lvl, { fw: true });
const lh = AL("H", { name: "header", gap: 12, cross: "CENTER" });
add(lvl, lh, { fw: true });
const lt = AL("V", { name: "text", gap: 0 });
lh.appendChild(lt);
lt.appendChild(await T("Level 00", "Subtitle", "text/primary"));
lt.appendChild(await T("0,000 XP to the next level", "Caption", "text/secondary"));
add(lh, spacer(), { grow: true });
const kvs = AL("H", { name: "stats", gap: 32 });
lh.appendChild(kvs);
for (const [k, v] of [["Total XP", "00,000"], ["Contracts", "000"], ["Play time", "000 h"]]) {
  const s = AL("V", { name: k, gap: 0, cross: "MAX" });
  s.appendChild(await T(k, "Caption", "text/secondary"));
  s.appendChild(await T(v, "Body Strong", "text/primary"));
  kvs.appendChild(s);
}
const meter = inst("Meter", { Level: "Low" });
props(meter, { Label: "Progress to Level 00", Value: "00%" });
add(lvl, meter, { fw: true });

// SettingsCard rows
await groupTitle(page, "Account");
const rows = [
  ["Display name", "Shown to other players", "icon/rename", "Text", "player_name"],
  ["Avatar", "Choose a picture or initials", "icon/color", "Button", "Change"],
  ["Region", "Used for placeholder features", "icon/globe", "ComboBox", "Placeholder"],
];
for (const r of rows) add(page, await settingsCard(...r), { fw: true });
await groupTitle(page, "Privacy");
for (const r of [
  ["Show online status", "Other players can see when you are online", "icon/info", "ToggleOn"],
  ["Share activity", null, "icon/share", "ToggleOff"],
]) add(page, await settingsCard(...r), { fw: true });
return sec.id;
