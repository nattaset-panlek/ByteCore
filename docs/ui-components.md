# UI components (`app/src/ui`)

Fluent dark controls matching Figma 02 Components. Import from `../ui`. Styles are in `ui/ui.css`; colors come from `styles/tokens.css`.
No shadows on any component. These are for OS UI only: websites inside Browser build their own controls (STYLE_NOTES, "Websites inside Browser").

| Component | Props (main) | Notes |
| :-- | :-- | :-- |
| `Icon` | `name`, `size=16` | PNG icon from Figma, e.g. `"icon/search"`, `"app/Terminal"` |
| `Button` | `variant: "standard" \| "accent" \| "subtle"`, `icon?` | 32px tall |
| `IconButton` | `icon`, `label`, `size=32` | Square subtle button; `label` is the tooltip and aria label |
| `TextBox` | `value`, `onChange(v)`, `icon?`, `header?` | Accent underline on focus; other input props pass through |
| `ComboBox` | `value`, `options: {value,label}[]`, `onChange`, `width=160` | Flyout list with selection pill |
| `CheckBox` | `checked`, `onChange`, `label?` | |
| `ToggleSwitch` | `checked`, `onChange`, `onText="On"`, `offText="Off"` | |
| `Card` | children | #2B2B2B, pad 16, gap 10 |
| `StatCard` | `icon?`, `label`, `value`, `sub?`, `tone?` | |
| `SettingsCard` | `icon?`, `title`, `description?`, children = control, `onClick?` | Clickable rows show a chevron |
| `Meter` | `label?`, `value` (0..1), `text?`, `tone` | 4px bar with a caption row. Not for 24px status bars. |
| `Badge` | `tone: neutral \| accent \| success \| caution \| critical` | |
| `RarityLabel` | `rarity` | Colors from `--rarity-*` |
| `KeyValue` | `k`, `v` | Label left, value right |
| `InfoBar` | `severity: info \| success \| warning \| error`, `title`, `message?`, `action?`, `onClose?` | |
| `ContentDialog` | `open`, `title`, `primary?`, `secondary?`, `close="Cancel"`, handlers | Covers the nearest positioned parent (a window body) with a smoke layer |
| `NavigationViewItem` | `icon?`, `label`, `selected?`, `onClick` | 36px row, 3x16 accent pill when selected |
| `TabViewItem` | `icon?`, `label`, `selected?`, `onClick`, `onClose?` | Use inside `TabRow` |
| `ToastNotification` | `icon`, `app`, `title`, `message?`, `actions?`, `onDismiss` | Usually shown through `notify()` |

Text styles: `.t-caption`, `.t-body`, `.t-body-strong`, `.t-subtitle`, `.t-title`, `.t-mono`; colors `.c-secondary`, `.c-tertiary`, `.c-accent`, `.c-success`, `.c-caution`, `.c-critical`.
