// AppTitleBar / TerminalTab (07) were replaced by TitleBar / TabViewItem (02). Keep them for history, mark deprecated.
for (const [name, repl] of [["AppTitleBar", "TitleBar"], ["TerminalTab", "TabViewItem"]]) {
  const c = findSet(name);
  if (!c.name.startsWith("⚠")) c.description = `Deprecated: use ${repl} from 02 Components (image app icon). Kept only for reference.`;
}
return "ok";
