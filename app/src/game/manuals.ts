import { pdfContent } from "./pdfdoc";

// Player manuals shipped as in-game PDFs (game/pdfdoc.ts markup), opened in PDF Reader.

export const HOW_TO_PLAY_PDF = pdfContent(
  "How to play",
  `
# How to play
Your first job, step by step. Follow the steps in order: each one tells you where to go and what to do.

> The whole loop: **Contract → scan → probe → crack → connect → pull → disconnect → sell → upgrade.** Repeat it with harder targets.

## 1. Take a contract
Open **Contracts** from the taskbar or Start. Pick a job and press **Accept**. It tells you what data to bring back.

## 2. Find targets
Open **Terminal** and type:
\`\`\`
scan
\`\`\`
Scan runs as a job. Type \`jobs\` to see its progress. When it finishes you get a list of addresses (for example \`10.0.0.12\`).

## 3. Look at a target
\`\`\`
probe <addr>
\`\`\`
You see its security level and open ports. Start with low security.

## 4. Break in
\`\`\`
crack <addr>
\`\`\`
Cracking needs CPU and takes time. If it fails, Heat goes up; try again.

## 5. Log in
\`\`\`
connect <addr>
\`\`\`
A Remote session tab opens and the trace meter starts climbing. The target's drive also shows in File Explorer as **Remote (Z:)**.

## 6. Look around
Type \`ls\`, then \`cd <folder>\` and \`cat <file>\`. Files with data (.db, .sql, .dat, .key) are the ones that sell. Their rarity (Common, Rare, Epic, Legendary) shows in File Explorer.

## 7. Take the file
\`\`\`
pull <path>
\`\`\`
Or right-click the file on Remote (Z:) and choose **Download to This PC**. The copy lands in your **Downloads** folder. Bigger files take longer, so watch the trace.

## 8. Leave
\`\`\`
disconnect
\`\`\`
Get out before the trace reaches 100%.

---page

## 9. Sell the data
Open **Browser** and go to **Core Exchange**. Your files are listed with their value. Tick them and press **Sell selected** (or Sell all). You can also select a file in File Explorer and press **Sell**.
- Each file sells once.
- Files marked Locked need a higher level.

## 10. Claim the reward
Back in **Contracts**, press **Claim** on the finished job for the bonus.

## 11. Upgrade your rig
Browser → Market → PC Builder: order a better CPU, RAM, network card or disk. When the "Package delivered" toast shows, press **Install** in Rig Manager. Spare parts wait in Rig Stock.
> A faster rig means faster scans, cracks and pulls.

## 12. Keep Heat low
Failed cracks and long sessions raise Heat. Too much Heat brings the Federal Cyber Division.

## Next
When you know the loop by heart, automate it in the IDE. Start from \`C:/Scripts/example.js\` and read **getting-started.pdf** for the command list.
`
);

export const GETTING_STARTED_PDF = pdfContent(
  "Getting started",
  `
# Getting started
A one-page reference for the Terminal commands and the money loop.

## Recon
| Command | What it does |
| \`scan\` | Find targets on the network |
| \`probe <addr>\` | Reveal a target's security and open ports |
| \`crack <addr>\` | Break in. Needs CPU; may fail and raise Heat |

## Access
| Command | What it does |
| \`connect <addr>\` | Open a remote session |
| \`ls\` / \`cd\` / \`cat\` | Look around the target |
| \`pull <path> [dir]\` | Copy a file to your rig (default: Downloads). Watch the trace! |
| \`disconnect\` | Leave cleanly |

## Jobs
| Command | What it does |
| \`jobs\` | List running jobs |
| \`kill <id>\` | Stop a job |
| \`wget <url> [dir]\` | Download a file (apps, scripts) |

## Money
- Sell pulled data on **Core Exchange**. Each file sells once; rarer files are worth more.
- Spend credits in the **Market** on CPU, memory, network and storage.

## Automation
The IDE runs JavaScript with the ByteCore API. Automate the whole loop once you are comfortable doing it by hand. The **Xea App SDK** folder in Documents shows how to build your own apps.
`
);
