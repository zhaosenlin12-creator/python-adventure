# Battle Royale Stable Mode

## Server Fit

- Target server: `2 vCPU / 4 GiB`
- This machine is shared with other applications.
- Battle Royale must run in a conservative stable mode, not a high-concurrency mode.

## Production Limits

- Only `1` active Battle Royale room at a time
  - waiting or in-progress both count
- Current launch target: `4-5` real players
- Recommended total participants: `<= 6` including bots
- Do not market or configure this mode as `10+` real-time players on the current shared server

## Why

- `200M` bandwidth is not the primary bottleneck here.
- The real bottleneck is `2 vCPU / 4 GiB` shared compute under real-time websocket sync and browser-hosted battle simulation.
- The current implementation is not a fully server-authoritative dedicated game server.
- Shared ECS pressure can affect all sites if Battle Royale traffic is allowed to spike freely.
- Browser-hosted simulation plus websocket sync is acceptable only in a low-concurrency stable mode.

## Incident Summary

- Symptom: after opening Battle Royale, external sites appeared to timeout even though PM2 and Nginx were still running
- Verified path: external traffic still reached ECS, but the machine was not replying normally with `SYN-ACK`
- Likely layer: local firewall state, conntrack pressure, or shared-host transient pressure

## Emergency Recovery

Run as `root`:

```bash
mkdir -p /root/fw-backup
iptables-save > /root/fw-backup/iptables-$(date +%F-%H%M%S).rules

iptables -I INPUT 1 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -I INPUT 2 -i lo -j ACCEPT
iptables -I INPUT 3 -p tcp --dport 22 -j ACCEPT
iptables -I INPUT 4 -p tcp --dport 80 -j ACCEPT
iptables -I INPUT 5 -p tcp --dport 443 -j ACCEPT

systemctl stop firewalld 2>/dev/null || true
systemctl disable firewalld 2>/dev/null || true

/www/server/nginx/sbin/nginx -t && systemctl restart nginx
```

## Conntrack Hardening

Run as `root`:

```bash
cat >/etc/sysctl.d/99-conntrack.conf <<'EOF'
net.netfilter.nf_conntrack_max = 262144
net.core.somaxconn = 4096
net.ipv4.tcp_max_syn_backlog = 4096
EOF

sysctl --system
```

## Verification

Run on the server:

```bash
curl -I --max-time 5 https://game.codebn.cn
curl -I --max-time 5 https://camp.codebn.cn
ss -lntp | egrep ':80|:443|:3003|:8000'
su - game -c "export PATH=/www/server/nodejs/v20.19.6/bin:$PATH && pm2 logs game-backend --lines 120 --nostream"
```

## Release Rule

- If a future version needs `10+` real players, stop and move Battle Royale to a dedicated game server or re-implement the battle runtime as a true server-authoritative service first.
