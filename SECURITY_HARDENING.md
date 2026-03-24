# 🔒 服务器安全加固与企业级部署指南（Alibaba Cloud Linux + 宝塔 + Nginx + PM2）
面向新手的**可直接操作**版本。  
适配当前项目：前端 `3003`、后端 `8000`、SQLite 数据库、Nginx 反代（配置模板在 `game.txt`）。
当前服务器：`120.26.114.244`；宝塔面板端口：`19980`。  
当前管理端公网 IP：`223.77.131.65`（动态 IP，变更后需要更新白名单）。

> 目标：降低被入侵概率（尤其是通过 80/443 应用层），并让服务更稳定、可恢复。

---

## ✅ 一、开始前的准备（非常重要）
1. **先做快照/备份**  
   阿里云控制台 → 实例 → **创建快照**  
2. **记录你本机的公网 IP（管理端 IP）**（后面会做白名单；注意不是服务器 IP）  
3. 确保你还能通过**阿里云控制台**或**宝塔终端**登录，避免把自己锁死。

## ✅ 0. 无 SSH 快速执行顺序（只用宝塔面板/终端，推荐）
> 你当前不开放 22，不使用 SSH，可以按下面顺序做；**不需要重新部署代码包**。

1) **一键基础加固**（开启 firewalld + /dev/shm noexec + sysctl + fail2ban）
```bash
# 先用宝塔把 deploy/hardening-setup-alinux.sh 上传到服务器：/www/wwwroot/hardening-setup-alinux.sh
chmod +x /www/wwwroot/hardening-setup-alinux.sh
bash /www/wwwroot/hardening-setup-alinux.sh
```

2) **上线运行时防护**（自动杀挖矿 + 自动封禁）
```bash
# 先用宝塔把 deploy/runtime-guard.sh 上传到服务器：/www/wwwroot/runtime-guard.sh
# 先用宝塔把 deploy/daily-security-check.sh 上传到服务器：/www/wwwroot/daily-security-check.sh
chmod +x /www/wwwroot/runtime-guard.sh /www/wwwroot/daily-security-check.sh

# 把脚本里的管理端IP改成你当前IP（动态IP变更时再改一次）
sed -i 's/^ADMIN_IPS=("[^"]*")/ADMIN_IPS=("223.77.131.65")/' /www/wwwroot/runtime-guard.sh

# 手动跑一次验证
/www/wwwroot/runtime-guard.sh

tail -50 /www/wwwlogs/runtime-guard.log
```

3) **设置定时任务**（推荐每 5 分钟运行一次）
```bash
crontab -e
# 添加：
*/5 * * * * /www/wwwroot/runtime-guard.sh
0 * * * * /www/wwwroot/daily-security-check.sh

# 保存后验证
crontab -l
```

4) **Nginx 加固**（TLS1.2/1.3 + 安全头 + 限流）
- 站点配置参考：`game.txt` 或 `deploy/nginx.conf`（已按安全加固更新）
- 还需要在 `/www/server/nginx/conf/nginx.conf` 的 `http {}` 中加入限流 zone（见第九章）

5) （强烈建议）**把 PM2 进程改为普通用户 game 运行**（需要短暂重启前后端，见第七章）

---

## ✅ 二、系统更新（必须做）
```bash
cat /etc/os-release
dnf update -y || yum update -y
```

---

## ✅ 三、创建普通管理员账号（可选：仅在使用 SSH 时执行）
> 不使用 SSH 可直接跳过第 3-4 章。
```bash
useradd -m -s /bin/bash admin
passwd admin
usermod -aG wheel admin
```

### 3.1 使用密钥登录（最安全）
在本机生成密钥（Windows PowerShell）：
```powershell
ssh-keygen -t ed25519 -C "admin@120.26.114.244"
type $env:USERPROFILE\.ssh\id_ed25519.pub
```
把输出公钥粘贴到服务器：
```bash
su - admin
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

## ✅ 四、加固 SSH（可选：仅在使用 SSH 时执行）
> 如果你**不使用 SSH**（不开放 22 端口），这一节可直接跳过。
编辑 `/etc/ssh/sshd_config`：
```bash
nano /etc/ssh/sshd_config
```
确认有以下配置（没有就添加）：
```text
PasswordAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
AllowUsers admin
LoginGraceTime 30
MaxAuthTries 3
```
重启 SSH：
```bash
sshd -t && systemctl restart sshd
```

> ⚠️ **确认 admin 可以登录成功后，再关闭 root。**

---

## ✅ 五、防火墙与安全组（只放必要端口）

### 5.1 系统防火墙（firewalld）
> 注意：你截图的是**阿里云安全组/云防火墙**，这里是**服务器系统内 firewalld**，建议两层都开启。
```bash
# 如果提示 firewall-cmd 不存在，先安装：
# dnf install -y firewalld || yum install -y firewalld

systemctl enable --now firewalld

# 说明：这里的 http/https 不是网址！
# --add-service=http  = 放行 80 端口
# --add-service=https = 放行 443 端口
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https

firewall-cmd --reload
```

验证 firewalld 状态：
```bash
systemctl is-active firewalld
firewall-cmd --list-all
```

只允许你的 IP 访问宝塔端口（你的宝塔端口：19980）。  
> 你的管理端公网 IP：`223.77.131.65`（如变更请及时替换）。
如果你**完全不用 SSH**，可以不开放 22 端口。
```bash
# 只允许你的管理端 IP 访问宝塔端口 19980
firewall-cmd --permanent \
  --add-rich-rule='rule family="ipv4" source address="223.77.131.65" port port="19980" protocol="tcp" accept'

# 不用 SSH 的话，确保没有放行 ssh 服务（如果没有这个服务，这条命令失败也没关系）
firewall-cmd --permanent --remove-service=ssh || true

firewall-cmd --reload
```

查看当前放行情况：
```bash
firewall-cmd --list-services
firewall-cmd --list-ports
firewall-cmd --list-rich-rules
```

IP 变更后更新白名单（把下面的 `旧IP` / `新IP` 换成实际值）：
```bash
# 1) 删除旧IP
firewall-cmd --permanent --remove-rich-rule='rule family="ipv4" source address="旧IP" port port="19980" protocol="tcp" accept'
# 2) 添加新IP
firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="新IP" port port="19980" protocol="tcp" accept'
firewall-cmd --reload
```

> 如果你未来要用 SSH，再单独放行你的 SSH 端口（只允许你自己的 IP）。

### 5.2 阿里云安全组
仅开放（无 SSH 版本）：
- 80 / 443（公网）
- 宝塔端口 19980（仅允许你的管理端 IP：223.77.131.65）
- 22 不开放（你不用 SSH）

> 以后如果你想启用 SSH，再在安全组里新增 22（或你的 SSH 端口）并限制你的 IP。

其他端口全部关闭。
> 动态 IP 变更时：**云安全组 + 服务器 firewalld** 都要更新。

### 5.3 一键基础加固脚本（推荐）
项目已提供脚本：`deploy/hardening-setup-alinux.sh`  
执行前请先修改里面的 `ADMIN_IP` 与 `PANEL_PORT`（动态 IP 变更时只需要改 `ADMIN_IP`）。

如果你不想打开编辑器，可以直接用命令替换（保持注释不变）：
```bash
# 把脚本里的 ADMIN_IP / PANEL_PORT 改成当前值
sed -i 's/^ADMIN_IP="[^"]*"/ADMIN_IP="223.77.131.65"/' /www/wwwroot/hardening-setup-alinux.sh
sed -i 's/^PANEL_PORT="[^"]*"/PANEL_PORT="19980"/' /www/wwwroot/hardening-setup-alinux.sh
```

执行：
```bash
# 上传脚本到服务器（建议放 /www/wwwroot/）
chmod +x /www/wwwroot/hardening-setup-alinux.sh
bash /www/wwwroot/hardening-setup-alinux.sh
```
脚本会自动：  
✅ 开启 firewalld 并设置规则  
✅ 禁止 /dev/shm 执行  
✅ 写入 sysctl 加固  
✅ 安装并配置 fail2ban  

---

## ✅ 六、宝塔面板安全设置
进入宝塔面板 → **安全**：
1. 开启 **安全入口（随机路径）**
2. 修改面板端口（不要默认 8888）
3. **授权 IP 访问（只允许你的 IP）**
4. 开启面板 SSL
5. 开启 BasicAuth（二次验证）

---

## ✅ 七、应用必须用普通用户运行（禁止 root 跑）
> ⚠️ 这一步会让前后端**短暂重启**（建议低峰操作）。不需要重新部署代码包。

先停止当前 root 下的 PM2 进程（如果你现在就是 root 跑的）：
```bash
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
pm2 list
pm2 stop game game-backend 2>/dev/null || true
pm2 delete game game-backend 2>/dev/null || true
pm2 save || true
```

创建 `game` 用户并调整目录归属：
```bash
useradd -m -s /bin/bash game
chown -R game:game /www/wwwroot/game-backend
chown -R game:game /www/wwwroot/game
```

切换为 `game` 用户启动：
```bash
su - game
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

# 后端
cd /www/wwwroot/game-backend
pm2 delete game-backend 2>/dev/null
pm2 start "/www/wwwroot/game-backend/venv/bin/python run_prod.py" --name game-backend --cwd /www/wwwroot/game-backend --max-memory-restart 300M

# 前端
cd /www/wwwroot/game
pm2 delete game 2>/dev/null
pm2 start "npm start -- -p 3003" --name game --max-memory-restart 500M
pm2 save
```

### 配置 PM2 开机自启（普通用户）
```bash
pm2 startup systemd -u game --hp /home/game
```
执行输出的命令，然后：
```bash
systemctl daemon-reload
systemctl enable pm2-game
systemctl start pm2-game
pm2 save
```

---

## ✅ 八、文件权限与敏感文件保护
```bash
# .env 和数据库权限
chmod 600 /www/wwwroot/game-backend/.env
chmod 600 /www/wwwroot/game-backend/code_adventure.db

# 限制目录访问
chmod 750 /www/wwwroot/game-backend
chmod 750 /www/wwwroot/game
```

---

## ✅ 九、Nginx 企业级加固（根据 game.txt 修改）
> 实际配置文件一般在：  
`/www/server/panel/vhost/nginx/game.codebn.cn.conf`
你可以直接参考：`game.txt` 或 `deploy/nginx.conf`（已按安全加固更新）

### 9.1 建议修改项（重要）
**把 TLS 协议改为 1.2/1.3：**
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
```

**关闭 server_tokens：**
```nginx
server_tokens off;
```

**限制请求体大小（无文件上传的话）**
```nginx
client_max_body_size 2m;
```

**增加安全头（不会影响正常功能）：**
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### 9.2 限流（防爆破 / 防刷接口）
> 只改 Nginx，**不需要停止前后端**，最后 `reload` 就行。

#### 9.2.1 在全局 nginx.conf 增加 zone（必须）
文件一般在：`/www/server/nginx/conf/nginx.conf`

先备份：
```bash
cp /www/server/nginx/conf/nginx.conf /www/server/nginx/conf/nginx.conf.bak.$(date +%Y%m%d%H%M)
```

在 `http {}` 里面加入（建议放在 `include` 之前）：
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=perip:10m;
```

#### 9.2.2 在站点配置加入 limit_req / limit_conn（必须）
站点配置一般在：`/www/server/panel/vhost/nginx/game.codebn.cn.conf`

先备份：
```bash
cp /www/server/panel/vhost/nginx/game.codebn.cn.conf /www/server/panel/vhost/nginx/game.codebn.cn.conf.bak.$(date +%Y%m%d%H%M)
```

确保你的站点配置里 `location /api` 与 `location /ws` 至少包含下面两行：
- `/api` 里：`limit_req zone=api burst=20 nodelay;`
- `/ws` 里：`limit_conn perip 20;`

（你也可以直接参考 `game.txt` / `deploy/nginx.conf` 里的完整写法）

完整示例（可直接复制到你的站点配置中对照）：
```nginx
location /api {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    limit_req zone=api burst=20 nodelay;
}

location /ws {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_connect_timeout 3600s;
    proxy_send_timeout 3600s;
    proxy_read_timeout 3600s;

    limit_conn perip 20;
}
```

### 9.3 禁用 PHP（如果你没有 PHP）
如果你只有 **Next.js（前端）+ Python（后端）**，通常不需要 PHP。

在站点配置中找到这一行：
```nginx
include enable-php-00.conf;
```
把它改成注释即可（前面加 `#`）：
```nginx
# include enable-php-00.conf;
```

> 如果你服务器上还有别的 PHP 网站，请不要禁用或先确认影响范围。

### 9.4 禁用 API 文档（生产环境）
如果后端是 FastAPI，建议屏蔽：
```nginx
location ~ ^/(docs|redoc|openapi\.json)$ {
    return 404;
}
```

最后统一验证并重载 Nginx：
```bash
# 在宝塔环境中，Nginx 通常不是 systemd 管理的，推荐用：
nginx -t                      # 语法检查
/etc/init.d/nginx reload      # 或在宝塔面板里点击“重载配置”
```

---

## ✅ 十、系统层防护（推荐）
### 10.1 启用 SELinux（如果支持）
```bash
getenforce
```
如果是 `Permissive`，编辑 `/etc/selinux/config`：
```
SELINUX=enforcing
```
然后重启服务器。

### 10.2 禁止 /dev/shm 执行（防挖矿）
```bash
mount -o remount,noexec,nosuid /dev/shm
echo "tmpfs /dev/shm tmpfs defaults,noexec,nosuid 0 0" >> /etc/fstab
```

---

## ✅ 十一、运行时检测与自动封禁（重点）
项目已提供两个脚本（位于 `deploy/`）：  
- `daily-security-check.sh`（安全巡检）  
- `runtime-guard.sh`（**运行时自动杀 + 自动封禁**）
请用宝塔把脚本上传到服务器 `/www/wwwroot/` 目录（便于统一路径）。  
> 管理端公网 IP 变更时，记得同步更新 `runtime-guard.sh` 里的 `ADMIN_IPS`。

### 11.1 上传脚本并赋权
```bash
# 建议放到 /www/wwwroot/
chmod +x /www/wwwroot/daily-security-check.sh
chmod +x /www/wwwroot/runtime-guard.sh
```

> 如果脚本是从 Windows 上传，运行时报 `^M` 或 `bad interpreter: /bin/bash^M`，说明换行符是 CRLF，先执行：
> ```bash
> sed -i 's/\r$//' /www/wwwroot/hardening-setup-alinux.sh
> sed -i 's/\r$//' /www/wwwroot/runtime-guard.sh
> sed -i 's/\r$//' /www/wwwroot/daily-security-check.sh
> ```
> 然后再 `chmod +x` 与运行脚本。

### 11.2 修改 runtime-guard.sh 里的管理IP
方式 A（推荐，命令替换）：
```bash
# 把 runtime-guard.sh 里的管理IP改成你当前IP
sed -i 's/^ADMIN_IPS=("[^"]*")/ADMIN_IPS=("223.77.131.65")/' /www/wwwroot/runtime-guard.sh
```

方式 B（用宝塔文件管理器编辑）：
打开 `/www/wwwroot/runtime-guard.sh`，找到这一行并修改：
```bash
ADMIN_IPS=("223.77.131.65")
```

### 11.3 手动运行验证
```bash
/www/wwwroot/runtime-guard.sh
tail -50 /www/wwwlogs/runtime-guard.log
tail -50 /www/wwwlogs/runtime-guard-ban.log
```
> runtime-guard 依赖 firewalld 进行封禁，请确保 firewalld 正在运行。

### 11.4 设置定时任务（推荐每5分钟）
```bash
crontab -e
*/5 * * * * /www/wwwroot/runtime-guard.sh
0 * * * * /www/wwwroot/daily-security-check.sh
```

> runtime-guard 会自动：  
> ✅ 杀掉已知挖矿进程  
> ✅ 清理 /dev/shm / /tmp 可疑可执行文件  
> ✅ 清理可疑 crontab  
> ✅ 根据日志封禁扫描/爆破 IP  

---

## ✅ 十二、升级依赖安全检查（企业级建议）
```bash
cd /www/wwwroot/game-backend
./venv/bin/python -m pip install -U pip setuptools wheel
./venv/bin/pip install pip-audit
./venv/bin/pip-audit -r requirements.txt
```

前端依赖检查：
```bash
cd /www/wwwroot/game
npm audit --production
```

---

## ✅ 十三、快速自检（每周一次）
```bash
# 1) 端口监听（你不使用 SSH，就不需要关注 22）
ss -tlnp | grep -E "80|443|3003|8000|19980"

# 2) 可疑进程
ps aux --sort=-%cpu | head -10

# 3) 异常连接
netstat -an | grep ESTABLISHED | wc -l

# 4) 最近修改的脚本
find /www/wwwroot -name "*.sh" -mtime -7
```

---

## ✅ 十四、企业级增强（可选）
1. 阿里云 WAF（直接挡应用层攻击）
2. 阿里云安全中心（专业版）  
3. 日志集中化（ELK / Loki）
4. CDN + DDoS 防护

---

## ✅ 结语（核心结论）
你的防火墙只开放 80/443 是正确的，**但应用层漏洞仍可通过 80/443 进来**。  
要降低风险必须做到：  
✅ **系统补丁**  
✅ **管理面收紧**  
✅ **应用不运行 root**  
✅ **Nginx 限流 + 安全头**  
✅ **定时检测 + 快速清理**  

---

如需我继续：  
✅ **根据你当前后端代码做安全审计**  
✅ **把 Nginx 配置直接替换成安全版**  
✅ **写“一键加固脚本”**  
告诉我即可。
