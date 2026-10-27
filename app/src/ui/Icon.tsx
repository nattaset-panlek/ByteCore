import { iconUrl } from "../os/icons";

/** Image icon exported from Figma, e.g. <Icon name="icon/search" />. */
export function Icon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  return <img className={className} src={iconUrl(name)} width={size} height={size} alt="" draggable={false} />;
}
