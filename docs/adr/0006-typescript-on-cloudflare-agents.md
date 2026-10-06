# The backend is TypeScript on Cloudflare Agents

The site's backend is TypeScript on the Agents SDK (Durable Objects), in the same language and deploy as the vinext site. An Agent polls ESPN on its own schedule, keeps its state in its own storage, and pushes changes to viewers over WebSocket. The workload is polling a few ESPN endpoints and diffing JSON, so nothing about it needs more than that, and it runs inside the Workers Paid plan at about $5/month.

## Considered Options

- **A separate long-lived service on its own host**, in another language: it would add a second toolchain, an image build, a keep-alive or a second vendor, a proxy in front of it, and API types generated across the language boundary, and its in-memory state would be lost on every restart.

## Consequences

- Live updates are WebSocket, and TypeScript types are shared by import.
- State survives restarts and deploys.
- A prototype confirmed the two things this rested on: ESPN serves requests from Cloudflare's network, and the Agents SDK's `useAgent` works under vinext.

Detail: [One Agent per live game feeding a vinext page](https://github.com/ryanyogan/yogan-hockey-2026/issues/26), [map](https://github.com/ryanyogan/yogan-hockey-2026/issues/1).
