# TASK-040: Stable Connection via Tailscale
Status: IN PROGRESS
Milestone: M12

## Goal
Replace the temporary `trycloudflare.com` URL (changes on restart) with a stable Tailscale hostname. Install Tailscale on the laptop so the Android app can reach PocketCoach reliably from any network.

## Subtasks
- [ ] Install Tailscale on laptop (`ssh goodold@192.168.18.16`)
- [ ] Install Tailscale on Android phone (Play Store)
- [ ] Log in to same Tailscale account on both devices
- [ ] Get stable laptop hostname (e.g. `goodold.tail1234.ts.net`)
- [ ] Update Android app with new stable URL
- [ ] Test: phone reaches API via Tailscale hostname
- [x] ~~Cloudflare tunnel approach~~ → replaced by Tailscale (free, private, no domain needed)

## Decisions
- Use Tailscale instead of Cloudflare tunnel — free, private, works from any device with Tailscale installed
- Buy a domain only if/when PocketCoach is shared with others

## Notes
- Laptop SSH: `ssh goodold@192.168.18.16`
- Android app URL is stored in SharedPreferences (set via Settings screen in the app)
- Tailscale must be running on both laptop and phone for connection to work
