/** Worker secrets. `cloudflare.config.ts` cannot declare one, so `cf workers types` leaves them out. */
declare namespace Cloudflare {
  interface Env {
    /** The ntfy.sh topic the Agents' alerts go to. Unset locally and in tests: nothing is sent. */
    NTFY_TOPIC?: string;
  }
}
