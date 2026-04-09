# Cloudflare Tunnel Setup

Cloudflare Tunnel lets you expose your locally-running app to the internet without opening router ports or using a static IP. Traffic goes through Cloudflare's edge, so even a laptop behind NAT works.

## Prerequisites

- `cloudflared` installed on the laptop
- App running (`docker compose up -d`)
- (For a persistent tunnel) A domain managed by Cloudflare

---

## Quick start — temporary URL (no account needed)

This gives you a random `trycloudflare.com` URL. It changes every time you run it and stops when the process stops. Good for a quick test.

```bash
cloudflared tunnel --url http://localhost:3000
```

The URL is printed in the output. Open it in your browser — you should see the PocketCoach login page.

**Limitations:** URL changes on every restart, process must stay running in the foreground.

---

## Persistent tunnel (named tunnel — needs Cloudflare account + domain)

This gives you a stable URL like `pocketcoach.yourdomain.com` that survives restarts.

### One-time setup

**1. Log in to Cloudflare**
```bash
cloudflared login
```
A browser window opens. Select the domain you want to use.

**2. Create the tunnel**
```bash
cloudflared tunnel create pocketcoach
```
This creates a tunnel and saves credentials to `~/.cloudflared/<tunnel-id>.json`.

**3. Note the tunnel ID**
```bash
cloudflared tunnel list
```
Copy the ID (looks like `a1b2c3d4-...`).

**4. Create the config file**

Create `~/.cloudflared/config.yml`:
```yaml
tunnel: <tunnel-id>
credentials-file: /home/<your-username>/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: pocketcoach.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

Replace `<tunnel-id>`, `<your-username>`, and `yourdomain.com`.

**5. Create the DNS record**
```bash
cloudflared tunnel route dns pocketcoach pocketcoach.yourdomain.com
```

**6. Test it**
```bash
cloudflared tunnel run pocketcoach
```
Open `https://pocketcoach.yourdomain.com` — should load the app.

---

## Run as a systemd service (survives reboots)

Once the named tunnel is working, set it up as a service so it starts automatically.

**1. Install the service**
```bash
sudo cloudflared service install
```
This installs using the config at `~/.cloudflared/config.yml`.

**2. Enable and start**
```bash
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

**3. Check status**
```bash
sudo systemctl status cloudflared
journalctl -u cloudflared -f   # live logs
```

**4. Restart after config changes**
```bash
sudo systemctl restart cloudflared
```

---

## Troubleshooting

**Tunnel connects but login fails / app shows blank page**
- Make sure the app is actually running: `docker ps`
- Check `http://localhost:3000` works locally first

**`cloudflared` not found**
- Ubuntu install: `sudo apt install cloudflared` (if repo is set up) or download binary directly from [Cloudflare's GitHub releases](https://github.com/cloudflare/cloudflared/releases)

**Service fails to start after reboot**
- Docker might not be up yet when cloudflared starts — the tunnel itself will connect fine regardless, requests will just fail until Docker starts
- Fix: add a Docker startup dependency to the systemd unit, or just accept that it may take a minute after boot

**Temporary URL only (no domain yet)**
- Run the temporary tunnel command in a `tmux` or `screen` session so it persists after SSH disconnect:
  ```bash
  tmux new -s tunnel
  cloudflared tunnel --url http://localhost:3000
  # Ctrl+B then D to detach
  ```
