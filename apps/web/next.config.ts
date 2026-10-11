import type { NextConfig } from "next";
import { legacyTeamTabRedirects } from "./lib/team-page";

const nextConfig: NextConfig = {
  // How long the browser's router keeps a page it has drawn, in seconds (spec section 2). A
  // page is rendered per request, which the router would otherwise never keep: going back to
  // the page just left would ask the server again.
  // `inlineCss`: the stylesheet is written into the document (10 kB gzipped) rather than linked,
  // so the first paint does not wait a second round trip for it (#127).
  experimental: { staleTimes: { dynamic: 30, static: 300 }, inlineCss: true },
  async redirects() {
    return legacyTeamTabRedirects();
  },
};

export default nextConfig;
