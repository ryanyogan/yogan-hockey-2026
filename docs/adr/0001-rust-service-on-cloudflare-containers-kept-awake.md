# The Rust service runs on Cloudflare Containers and is kept always awake

The Rust service is one long-lived process holding live state in memory, and it must poll with no viewers. We run it on Cloudflare Containers (the `lite` size, about $6.74/month including Workers Paid) to keep the whole site on one platform and to try Containers out, although Railway is a flat $5/month and always on by default. Containers sleep after 10 minutes without inbound requests, so a Worker on a cron trigger renews the container's activity timeout through its Durable Object; the same cron restarts it after a host move or deploy.

## Considered Options

- **Railway**: cheaper and always on with no glue code. Chosen and then reversed twice on the same day; the pull was one platform and wanting to use Containers.
- **Sleep between games or until the first visitor**: saves at most about $1.74/month and leaves nothing running to poll Tracked Player results or prepare predictions.

## Consequences

- Memory and disk are wiped on every start, and Cloudflare restarts hosts without notice. Everything is rebuilt by polling again; only Claude predictions must be stored outside the container.
- The Durable Object exists for keep-alive and routing only. Application state never goes in it.

Detail: [Where the Rust service runs](https://github.com/ryanyogan/yogan-hockey-2026/issues/9), [Container lifecycle](https://github.com/ryanyogan/yogan-hockey-2026/issues/18), [hosting cost research](https://github.com/ryanyogan/yogan-hockey-2026/issues/2).
