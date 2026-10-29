// Image icons exported from Figma (tools/figma-build/export_icons.js). Name as in Figma: "app/Terminal", "icon/search".
const files = import.meta.glob("../assets/icons/*.png", { eager: true, import: "default" }) as Record<string, string>;

export function iconUrl(name: string): string {
  if (name.startsWith("data:")) return name; // generated icons (installed player apps)
  return files[`../assets/icons/${name.replace("/", "-")}.png`] ?? "";
}
