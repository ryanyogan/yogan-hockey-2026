import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The fictional player's address on the Parity Reference, which the cutover sends here.
  async redirects() {
    return [
      {
        source: "/players/easter-egg-rylan-yogan",
        destination: "/players/rylan-yogan",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
