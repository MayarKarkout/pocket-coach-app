# TASK-040: Stable Cloudflare Tunnel
Status: TODO
Milestone: M12

## Goal
Replace the temporary `trycloudflare.com` URL (changes on restart) with a named, persistent Cloudflare tunnel backed by a domain. Run `cloudflared` as a systemd service on the laptop so it survives reboots.

## Subtasks
- [ ] Decide on domain: buy one (~$10/yr via Cloudflare Registrar or Namecheap) or use a free subdomain option
- [ ] Create a named tunnel in Cloudflare dashboard: `cloudflared tunnel create pocket-coach`
- [ ] Add DNS CNAME record pointing domain → tunnel
- [ ] Update `config.yml` on laptop with tunnel credentials + hostname
- [ ] Create systemd service for `cloudflared` on the laptop
- [ ] Test: phone can reach app via stable URL after laptop reboot
- [ ] Update Android app settings with the new stable URL

## Decisions
- Open: domain source not yet decided (Miro to decide)

## Notes
- Laptop is accessible via SSH: `ssh goodold@192.168.18.16`
- See `docs/cloudflare-tunnel.md` for existing tunnel setup docs
- This unblocks reliable Android app → PocketCoach data flow
