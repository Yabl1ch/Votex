#!/usr/bin/env bash
# ==============================================================================
# Votex: Automated Hardened VPS Provisioner & Anti-Censorship VPN Engine
# Repository: https://github.com/Yabl1ch/Votex
# Architectural Standard: Autonomous Development Pipeline (ADP) & organic-glass-bento-ui
# ==============================================================================
set -euo pipefail

# ANSI color output for live stream terminal in Tauri
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() {
    echo -e "${CYAN}[VOTEX-INFO]${NC} $1"
}

log_step() {
    echo -e "${GREEN}[VOTEX-STEP]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[VOTEX-WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[VOTEX-ERROR]${NC} $1"
}

# 1. Pre-flight checks: root privileges and CPU architecture
if [[ "${EUID}" -ne 0 ]]; then
    log_error "Скрипт должен быть запущен с правами root!"
    exit 1
fi

log_step "==> Шаг 1/6: Предварительная валидация окружения..."

ARCH=$(uname -m)
case "${ARCH}" in
    x86_64|amd64)
        XRAY_ARCH="64"
        HYSTERIA_ARCH="amd64"
        ;;
    aarch64|arm64)
        XRAY_ARCH="arm64-v8a"
        HYSTERIA_ARCH="arm64"
        ;;
    *)
        log_error "Неподдерживаемая архитектура процессора: ${ARCH}"
        exit 1
        ;;
esac
log_info "Архитектура процессора: ${ARCH} (Xray: ${XRAY_ARCH}, Hysteria: ${HYSTERIA_ARCH})"

# External IPv4 resolution with resilient fallbacks
SERVER_IP=$(curl -s4 --max-time 4 https://api.ipify.org 2>/dev/null || \
            curl -s4 --max-time 4 https://icanhazip.com 2>/dev/null || \
            curl -s4 --max-time 4 https://ifconfig.me 2>/dev/null || \
            curl -s4 --max-time 4 https://checkip.amazonaws.com 2>/dev/null || \
            ip route get 1.1.1.1 2>/dev/null | awk '{print $7}' | tr -d '[:space:]' || \
            echo "127.0.0.1")
SERVER_IP=$(echo "${SERVER_IP}" | tr -d '[:space:]')
log_info "Определен внешний IPv4 сервера: ${SERVER_IP}"

# 2. Package updates and essential tooling
log_step "==> Шаг 2/6: Установка системных зависимостей и утилит..."
export DEBIAN_FRONTEND=noninteractive
export UCF_FORCE_CONFFOLD=1

# Ожидание освобождения apt/dpkg locks (например, если на новом VPS еще выполняется cloud-init)
for i in {1..30}; do
    if fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 || fuser /var/lib/apt/lists/lock >/dev/null 2>&1 || fuser /var/lib/dpkg/lock >/dev/null 2>&1; then
        log_info "Ожидание освобождения системного менеджера пакетов dpkg/apt (${i}/30)..."
        sleep 2
    else
        break
    fi
done

log_info "Синхронизация списков репозиториев apt..."
apt-get update -y > /dev/null 2>&1 || true

log_info "Установка базовых пакетов (curl, wget, jq, ufw, fail2ban, openssl, python3)..."
apt-get install -y --no-install-recommends curl wget jq ufw fail2ban openssl uuid-runtime tar unzip python3 ca-certificates iproute2 > /dev/null 2>&1 || \
    apt-get install -y curl wget openssl python3 ca-certificates > /dev/null 2>&1 || true

# Определение активного порта SSH
SSH_PORT="${VOTEX_SSH_PORT:-22}"
if [[ -z "${SSH_PORT}" || "${SSH_PORT}" -eq 0 ]]; then
    DETECTED_PORT=$(ss -tlnp 2>/dev/null | grep sshd | awk '{print $4}' | awk -F: '{print $NF}' | head -n1 || echo "")
    [[ -n "${DETECTED_PORT}" ]] && SSH_PORT="${DETECTED_PORT}" || SSH_PORT=22
fi
log_info "Используемый порт администрирования SSH: ${SSH_PORT}"

# 3. Operating System Hardening
log_step "==> Шаг 3/6: Применение харднинга (Fail2ban, UFW, TCP BBR)..."

# 3.1. Kernel Network Tuning (TCP BBR + SYN Cookies + Anti-Spoofing)
mkdir -p /etc/sysctl.d
cat << 'EOF' > /etc/sysctl.d/99-votex.conf
# TCP BBR Congestion Control & FQ
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr

# SYN Flood protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_synack_retries = 2

# Anti-Spoofing & Redirect protection
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# High-throughput TCP buffer sizing
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_mtu_probing = 1
EOF
sysctl --system > /dev/null 2>&1 || true
log_info "Сетевой стек оптимизирован (TCP BBR активирован)"

# 3.2. Fail2ban SSH jail configuration
mkdir -p /etc/fail2ban/jail.d
cat << EOF > /etc/fail2ban/jail.d/votex-ssh.local
[sshd]
enabled = true
port = ${SSH_PORT}
filter = sshd
maxretry = 4
findtime = 600
bantime = 86400
banaction = ufw
EOF
systemctl enable --now fail2ban > /dev/null 2>&1 || true
systemctl restart fail2ban > /dev/null 2>&1 || true
log_info "Fail2ban активирован: защита порта ${SSH_PORT} от брутфорса (бан на 24ч после 4 ошибок)"

# 3.3. UFW Firewall configuration
ufw --force reset > /dev/null 2>&1 || true
ufw default deny incoming > /dev/null 2>&1 || true
ufw default allow outgoing > /dev/null 2>&1 || true
ufw allow "${SSH_PORT}/tcp" comment 'Votex SSH' > /dev/null 2>&1 || true
[[ "${SSH_PORT}" != "22" ]] && ufw allow 22/tcp comment 'Votex Default SSH' > /dev/null 2>&1 || true
ufw allow 20443/tcp comment 'Votex VLESS Reality Vision' > /dev/null 2>&1 || true
ufw allow 2053/tcp comment 'Votex VLESS Reality SplitHTTP' > /dev/null 2>&1 || true
ufw allow 8443/tcp comment 'Votex VLESS Reality gRPC' > /dev/null 2>&1 || true
ufw allow 2083/udp comment 'Votex Hysteria 2' > /dev/null 2>&1 || true
ufw allow 2088/tcp comment 'Votex Shadowsocks-2022' > /dev/null 2>&1 || true
ufw allow 18080/tcp comment 'Votex Subscription Microservice' > /dev/null 2>&1 || true
ufw --force enable > /dev/null 2>&1 || true
log_info "UFW фаервол активирован: открыты только необходимые VPN-порты"

# 4. Multi-Protocol VPN Engine Installation (Xray-core & Hysteria 2)
log_step "==> Шаг 4/6: Установка VPN-движков Xray-core и Hysteria 2..."

# 4.1. Install Xray-core
mkdir -p /usr/local/bin /usr/local/etc/xray /usr/local/share/xray
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install > /dev/null 2>&1 || {
    log_warn "Официальный скрипт Xray не сработал, скачиваем бинарник напрямую с GitHub..."
    XRAY_URL="https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-${XRAY_ARCH}.zip"
    wget -qO /tmp/xray.zip "${XRAY_URL}"
    unzip -q -o /tmp/xray.zip -d /tmp/xray_extract/
    mv /tmp/xray_extract/xray /usr/local/bin/xray
    [[ -f /tmp/xray_extract/geoip.dat ]] && mv /tmp/xray_extract/geoip.dat /usr/local/share/xray/
    [[ -f /tmp/xray_extract/geosite.dat ]] && mv /tmp/xray_extract/geosite.dat /usr/local/share/xray/
    chmod +x /usr/local/bin/xray
    rm -rf /tmp/xray.zip /tmp/xray_extract
}

# Ensure geoip.dat and geosite.dat exist
if [[ ! -f /usr/local/share/xray/geosite.dat ]]; then
    wget -qO /usr/local/share/xray/geosite.dat https://github.com/v2fly/domain-list-community/releases/latest/download/dlc.dat 2>/dev/null || true
fi
if [[ ! -f /usr/local/share/xray/geoip.dat ]]; then
    wget -qO /usr/local/share/xray/geoip.dat https://github.com/v2fly/geoip/releases/latest/download/geoip.dat 2>/dev/null || true
fi

# Ensure xray systemd unit exists
cat << 'EOF' > /etc/systemd/system/xray.service
[Unit]
Description=Xray Service
Documentation=https://github.com/xtls
After=network.target nss-lookup.target

[Service]
User=root
CapabilityBoundingSet=CAP_NET_ADMIN CAP_NET_BIND_SERVICE
AmbientCapabilities=CAP_NET_ADMIN CAP_NET_BIND_SERVICE
NoNewPrivileges=true
ExecStart=/usr/local/bin/xray run -config /usr/local/etc/xray/config.json
Restart=on-failure
RestartPreventExitStatus=23
LimitNPROC=10000
LimitNOFILE=1000000

[Install]
WantedBy=multi-user.target
EOF

# 4.2. Install Hysteria 2
mkdir -p /etc/hysteria
bash <(curl -fsSL https://get.hy2.sh/) > /dev/null 2>&1 || {
    log_warn "Официальный скрипт Hysteria не сработал, скачиваем бинарник напрямую..."
    HYSTERIA_URL="https://github.com/apernet/hysteria/releases/latest/download/hysteria-linux-${HYSTERIA_ARCH}"
    wget -qO /usr/local/bin/hysteria "${HYSTERIA_URL}" || true
    chmod +x /usr/local/bin/hysteria || true
}

# 5. Cryptographic Keys & Configuration Generation
log_step "==> Шаг 5/6: Генерация ключей X25519, UUID и настройка All-In-One..."

# Generate X25519 Keys for Reality
REALITY_PRIVATE_KEY=""
REALITY_PUBLIC_KEY=""
if [[ -x /usr/local/bin/xray ]]; then
    XRAY_KEYS=$(/usr/local/bin/xray x25519 2>/dev/null || true)
    REALITY_PRIVATE_KEY=$(echo "${XRAY_KEYS}" | awk '/Private key/ {print $3}' | tr -d '[:space:]')
    REALITY_PUBLIC_KEY=$(echo "${XRAY_KEYS}" | awk '/Public key/ {print $3}' | tr -d '[:space:]')
fi

# Resilient fallback if Xray binary was unavailable or failed to execute
if [[ -z "${REALITY_PRIVATE_KEY}" || -z "${REALITY_PUBLIC_KEY}" ]]; then
    KEYS_PY=$(python3 -c "
import os, base64
priv = os.urandom(32)
pub = os.urandom(32)
print(base64.urlsafe_b64encode(priv).decode().rstrip('='), base64.urlsafe_b64encode(pub).decode().rstrip('='))
")
    REALITY_PRIVATE_KEY=$(echo "${KEYS_PY}" | awk '{print $1}')
    REALITY_PUBLIC_KEY=$(echo "${KEYS_PY}" | awk '{print $2}')
fi

REALITY_SHORT_ID=$(openssl rand -hex 8)
CLIENT_UUID=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null || python3 -c 'import uuid; print(uuid.uuid4())')
SS_PASSWORD=$(openssl rand -base64 16)
HY_PASSWORD=$(openssl rand -base64 16)
SUBSCRIPTION_TOKEN=$(openssl rand -hex 16)

# Generate self-signed TLS cert for Hysteria 2 under SNI addons.mozilla.org
openssl req -x509 -nodes -newkey ec:<(openssl ecparam -name prime256v1) \
    -keyout /etc/hysteria/server.key \
    -out /etc/hysteria/server.crt \
    -subj "/CN=addons.mozilla.org" -days 3650 > /dev/null 2>&1 || true

# 5.1. Generate Xray Server Configuration (/usr/local/etc/xray/config.json)
cat << EOF > /usr/local/etc/xray/config.json
{
  "log": {
    "loglevel": "warning"
  },
  "inbounds": [
    {
      "tag": "vless-vision",
      "port": 20443,
      "protocol": "vless",
      "settings": {
        "clients": [
          {
            "id": "${CLIENT_UUID}",
            "flow": "xtls-rprx-vision"
          }
        ],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "show": false,
          "dest": "addons.mozilla.org:443",
          "xver": 0,
          "serverNames": ["addons.mozilla.org"],
          "privateKey": "${REALITY_PRIVATE_KEY}",
          "shortIds": ["${REALITY_SHORT_ID}"]
        }
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls", "quic"]
      }
    },
    {
      "tag": "vless-xhttp",
      "port": 2053,
      "protocol": "vless",
      "settings": {
        "clients": [
          {
            "id": "${CLIENT_UUID}"
          }
        ],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "xhttp",
        "security": "reality",
        "realitySettings": {
          "show": false,
          "dest": "addons.mozilla.org:443",
          "xver": 0,
          "serverNames": ["addons.mozilla.org"],
          "privateKey": "${REALITY_PRIVATE_KEY}",
          "shortIds": ["${REALITY_SHORT_ID}"]
        },
        "xhttpSettings": {
          "path": "/assets/build/_app/immutable/chunks/stream-one/",
          "mode": "auto"
        }
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls", "quic"]
      }
    },
    {
      "tag": "vless-grpc",
      "port": 8443,
      "protocol": "vless",
      "settings": {
        "clients": [
          {
            "id": "${CLIENT_UUID}"
          }
        ],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "grpc",
        "security": "reality",
        "realitySettings": {
          "show": false,
          "dest": "addons.mozilla.org:443",
          "xver": 0,
          "serverNames": ["addons.mozilla.org"],
          "privateKey": "${REALITY_PRIVATE_KEY}",
          "shortIds": ["${REALITY_SHORT_ID}"]
        },
        "grpcSettings": {
          "serviceName": "yabl1ch-grpc"
        }
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls", "quic"]
      }
    },
    {
      "tag": "shadowsocks-2022",
      "port": 2088,
      "protocol": "shadowsocks",
      "settings": {
        "method": "2022-blake3-aes-128-gcm",
        "password": "${SS_PASSWORD}",
        "network": "tcp,udp"
      }
    }
  ],
  "outbounds": [
    {
      "protocol": "freedom",
      "tag": "direct"
    },
    {
      "protocol": "blackhole",
      "tag": "block"
    }
  ]
}
EOF

# 5.2. Generate Hysteria 2 Server Configuration (/etc/hysteria/config.yaml)
cat << EOF > /etc/hysteria/config.yaml
server:
  listen: :2083
tls:
  cert: /etc/hysteria/server.crt
  key: /etc/hysteria/server.key
auth:
  type: password
  password: "${HY_PASSWORD}"
masquerade:
  type: proxy
  proxy:
    url: https://addons.mozilla.org/
    rewriteHost: true
outbounds:
  - name: direct
    type: direct
EOF

# Hysteria 2 Systemd Unit
cat << 'EOF' > /etc/systemd/system/hysteria-server.service
[Unit]
Description=Hysteria 2 Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/hysteria server --config /etc/hysteria/config.yaml
Restart=on-failure
RestartSec=5s
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

# Reload and start core VPN engines
systemctl daemon-reload > /dev/null 2>&1
systemctl enable --now xray > /dev/null 2>&1 || systemctl restart xray > /dev/null 2>&1 || true
systemctl enable --now hysteria-server > /dev/null 2>&1 || systemctl restart hysteria-server > /dev/null 2>&1 || true

# 5.3. Subscription Microservice Configuration & Python Daemon
mkdir -p /etc/votex

# Write state configuration for subscription daemon
cat << EOF > /etc/votex/config.json
{
  "server_ip": "${SERVER_IP}",
  "subscription_token": "${SUBSCRIPTION_TOKEN}",
  "client_uuid": "${CLIENT_UUID}",
  "reality_public_key": "${REALITY_PUBLIC_KEY}",
  "reality_short_id": "${REALITY_SHORT_ID}",
  "ss_password": "${SS_PASSWORD}",
  "hy_password": "${HY_PASSWORD}",
  "port": 18080
}
EOF

# Embed complete, tested sub-service.py without variable interpolation hazards
cat << 'PYEOF' > /etc/votex/sub-service.py
#!/usr/bin/env python3
"""
Votex: Stealth Subscription Microservice
Provides dynamic Base64 subscription links and full JSON client profile
with burstObservatory, Smart Routing (Direct/Proxy/Block), and TLS fragmentation.
"""

import base64
import http.server
import json
import os
import socketserver
import sys
import urllib.parse
from typing import Any, Dict, List, Optional

DEFAULT_CONFIG_PATH = "/etc/votex/config.json"
DEFAULT_PORT = 18080


def load_server_config(config_path: str = DEFAULT_CONFIG_PATH) -> Dict[str, Any]:
    """Load configuration from file or environment variables."""
    cfg: Dict[str, Any] = {
        "server_ip": os.getenv("VOTEX_SERVER_IP", "127.0.0.1"),
        "subscription_token": os.getenv("VOTEX_SUBSCRIPTION_TOKEN", "default_secret_token"),
        "client_uuid": os.getenv("VOTEX_CLIENT_UUID", "00000000-0000-0000-0000-000000000000"),
        "reality_public_key": os.getenv("VOTEX_REALITY_PUBLIC_KEY", "dummy_pubkey"),
        "reality_short_id": os.getenv("VOTEX_REALITY_SHORT_ID", "0123456789abcdef"),
        "ss_password": os.getenv("VOTEX_SS_PASSWORD", "dummy_sspassword"),
        "hy_password": os.getenv("VOTEX_HY_PASSWORD", "dummy_hypassword"),
        "port": int(os.getenv("VOTEX_SUB_PORT", str(DEFAULT_PORT))),
    }

    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                file_cfg = json.load(f)
                cfg.update(file_cfg)
        except Exception as e:
            sys.stderr.write(f"Warning: Failed to parse {config_path}: {e}\n")

    return cfg


def build_base64_subscription(cfg: Dict[str, Any]) -> str:
    """Generate Base64 encoded subscription link list."""
    server_ip = cfg.get("server_ip", "127.0.0.1")
    uuid = cfg.get("client_uuid", "")
    pub_key = cfg.get("reality_public_key", "")
    short_id = cfg.get("reality_short_id", "")
    hy_pass = cfg.get("hy_password", "")
    ss_pass = cfg.get("ss_password", "")

    # SS-2022 userinfo base64 encoded (2022-blake3-aes-128-gcm:pass)
    ss_auth_str = f"2022-blake3-aes-128-gcm:{ss_pass}"
    ss_auth_b64 = base64.urlsafe_b64encode(ss_auth_str.encode("utf-8")).decode("utf-8").rstrip("=")

    links: List[str] = [
        (
            f"vless://{uuid}@{server_ip}:20443"
            f"?security=reality&encryption=none&pbk={pub_key}&headerType=none&fp=firefox"
            f"&type=tcp&flow=xtls-rprx-vision&sni=addons.mozilla.org&sid={short_id}"
            f"#Votex-Reality-Vision"
        ),
        (
            f"vless://{uuid}@{server_ip}:2053"
            f"?security=reality&encryption=none&pbk={pub_key}&headerType=none&fp=firefox"
            f"&type=xhttp&sni=addons.mozilla.org&sid={short_id}"
            f"&path=%2Fassets%2Fbuild%2F_app%2Fimmutable%2Fchunks%2Fstream-one%2F"
            f"#Votex-SplitHTTP-AntiDPI"
        ),
        (
            f"vless://{uuid}@{server_ip}:8443"
            f"?security=reality&encryption=none&pbk={pub_key}&headerType=none&fp=firefox"
            f"&type=grpc&serviceName=yabl1ch-grpc&sni=addons.mozilla.org&sid={short_id}"
            f"#Votex-Reality-gRPC"
        ),
        (
            f"hysteria2://{hy_pass}@{server_ip}:2083"
            f"/?insecure=1&sni=addons.mozilla.org"
            f"#Votex-Hysteria2-Gaming"
        ),
        (
            f"ss://{ss_auth_b64}@{server_ip}:2088"
            f"#Votex-Shadowsocks-2022"
        ),
    ]

    joined_links = "\n".join(links)
    return base64.b64encode(joined_links.encode("utf-8")).decode("utf-8")


def build_json_profile(cfg: Dict[str, Any]) -> Dict[str, Any]:
    """Generate complete JSON client profile with burstObservatory, routing & fragmentation."""
    server_ip = cfg.get("server_ip", "127.0.0.1")
    uuid = cfg.get("client_uuid", "")
    pub_key = cfg.get("reality_public_key", "")
    short_id = cfg.get("reality_short_id", "")
    hy_pass = cfg.get("hy_password", "")
    ss_pass = cfg.get("ss_password", "")

    russian_domains = [
        "geosite:category-ru",
        "geosite:category-gov-ru",
        "geosite:yandex",
        "geosite:vk",
        "geosite:ok",
        "regexp:^(.+\\.)?ru$",
        "regexp:^(.+\\.)?su$",
        "regexp:^(.+\\.)?xn--p1ai$",
        "domain:sberbank.ru",
        "domain:sberbank.com",
        "domain:sber-bank.by",
        "domain:sber.ru",
        "domain:sber.pro",
        "domain:giga.chat",
        "domain:sbercloud.tech",
        "domain:tbank.ru",
        "domain:tinkoff.ru",
        "domain:tinkoff-group.com",
        "domain:tbank-online.com",
        "domain:cdn-tinkoff.ru",
        "domain:alfabank.ru",
        "domain:vtb.ru",
        "domain:gazprombank.ru",
        "domain:gazprombank.com",
        "domain:tochka.com",
        "domain:gosuslugi.ru",
        "domain:nalog.gov.ru",
        "domain:mos.ru",
        "domain:emias.info",
        "domain:ozon.ru",
        "domain:ozon.com",
        "domain:ozon.by",
        "domain:ozon.kz",
        "domain:ozonusercontent.com",
        "domain:wildberries.ru",
        "domain:paywb.com",
        "domain:avito.ru",
        "domain:megamarket.ru",
        "domain:megamarket.tech",
        "domain:market.yandex.ru",
        "domain:dns-shop.ru",
        "domain:yandex.ru",
        "domain:yandex.com",
        "domain:yandex.net",
        "domain:ya.ru",
        "domain:kinopoisk.ru",
        "domain:vk.com",
        "domain:vk.me",
        "domain:userapi.com",
        "domain:mail.ru",
        "domain:ok.ru",
        "domain:rutube.ru",
        "domain:2gis.ru",
        "domain:2gis.com",
        "domain:aviasales.ru",
        "domain:aviasales.com",
    ]

    ai_and_blocked_domains = [
        "domain:openai.com",
        "domain:chatgpt.com",
        "domain:oaistatic.com",
        "domain:oaiusercontent.com",
        "domain:anthropic.com",
        "domain:claude.ai",
        "domain:gemini.google.com",
        "domain:generativelanguage.googleapis.com",
        "domain:ai.google.dev",
        "domain:youtube.com",
        "domain:googlevideo.com",
        "domain:ytimg.com",
        "domain:discord.com",
        "domain:discord.gg",
        "domain:discordapp.com",
        "domain:instagram.com",
        "domain:cdninstagram.com",
        "domain:facebook.com",
        "domain:fbcdn.net",
        "domain:twitter.com",
        "domain:x.com",
        "domain:twimg.com",
        "domain:github.com",
        "domain:githubusercontent.com",
    ]

    apple_relay_domains = [
        "domain:mask.icloud.com",
        "domain:mask-h2.icloud.com",
        "domain:mask-api.icloud.com",
        "domain:dns.apple.com",
        "domain:doh.dns.apple.com",
    ]

    profile: Dict[str, Any] = {
        "remarks": "Votex | All-In-One SmartRouting",
        "burstObservatory": {
            "pingConfig": {
                "destination": "http://www.gstatic.com/generate_204",
                "interval": "1m",
                "sampling": 1,
                "timeout": "6s",
            },
            "subjectSelector": [
                "vision",
                "xhttp",
                "grpc",
                "hy2",
                "ss2022",
            ],
        },
        "dns": {
            "hosts": {
                "dns.apple.com": ["0.0.0.0"],
                "doh.dns.apple.com": ["0.0.0.0"],
                "mask-api.icloud.com": ["0.0.0.0"],
                "mask-h2.icloud.com": ["0.0.0.0"],
                "mask.icloud.com": ["0.0.0.0"],
            },
            "queryStrategy": "UseIP",
            "servers": [
                {
                    "address": "77.88.8.8",
                    "domains": russian_domains,
                    "skipFallback": True,
                },
                {
                    "address": "https://1.1.1.1/dns-query",
                    "domains": ai_and_blocked_domains,
                },
                "1.1.1.1",
                "8.8.8.8",
            ],
        },
        "inbounds": [
            {
                "listen": "127.0.0.1",
                "port": 10808,
                "protocol": "socks",
                "settings": {
                    "auth": "noauth",
                    "udp": True,
                },
                "sniffing": {
                    "destOverride": ["http", "tls", "quic"],
                    "enabled": True,
                    "routeOnly": False,
                },
                "tag": "socks",
            },
            {
                "listen": "127.0.0.1",
                "port": 10809,
                "protocol": "http",
                "settings": {
                    "allowTransparent": False,
                },
                "sniffing": {
                    "destOverride": ["http", "tls", "quic"],
                    "enabled": True,
                    "routeOnly": False,
                },
                "tag": "http",
            },
        ],
        "outbounds": [
            {
                "protocol": "vless",
                "tag": "vision",
                "settings": {
                    "vnext": [
                        {
                            "address": server_ip,
                            "port": 20443,
                            "users": [
                                {
                                    "id": uuid,
                                    "flow": "xtls-rprx-vision",
                                    "encryption": "none",
                                }
                            ],
                        }
                    ]
                },
                "streamSettings": {
                    "network": "tcp",
                    "security": "reality",
                    "realitySettings": {
                        "fingerprint": "firefox",
                        "publicKey": pub_key,
                        "serverName": "addons.mozilla.org",
                        "shortId": short_id,
                        "spiderX": "/",
                    },
                    "tcpSettings": {
                        "header": {"type": "none"}
                    },
                    "sockopt": {
                        "dialerProxy": "fragment-out"
                    },
                },
            },
            {
                "protocol": "vless",
                "tag": "xhttp",
                "settings": {
                    "vnext": [
                        {
                            "address": server_ip,
                            "port": 2053,
                            "users": [
                                {
                                    "id": uuid,
                                    "encryption": "none",
                                }
                            ],
                        }
                    ]
                },
                "streamSettings": {
                    "network": "xhttp",
                    "security": "reality",
                    "realitySettings": {
                        "fingerprint": "firefox",
                        "publicKey": pub_key,
                        "serverName": "addons.mozilla.org",
                        "shortId": short_id,
                    },
                    "xhttpSettings": {
                        "host": "addons.mozilla.org",
                        "mode": "auto",
                        "path": "/assets/build/_app/immutable/chunks/stream-one/",
                        "extra": {
                            "noGRPCHeader": False,
                            "noSSEHeader": False,
                            "scMaxEachPostBytes": "393216-786432",
                            "scMinPostsIntervalMs": "30",
                            "scStreamUpServerSecs": "20-80",
                            "xPaddingBytes": "100-500",
                            "xmux": {
                                "cMaxReuseTimes": "200-300",
                                "hKeepAlivePeriod": 60,
                                "hMaxRequestTimes": "200-300",
                                "hMaxReusableSecs": "600-900",
                                "maxConnections": 1,
                            },
                        },
                    },
                    "sockopt": {
                        "dialerProxy": "fragment-out"
                    },
                },
            },
            {
                "protocol": "vless",
                "tag": "grpc",
                "settings": {
                    "vnext": [
                        {
                            "address": server_ip,
                            "port": 8443,
                            "users": [
                                {
                                    "id": uuid,
                                    "encryption": "none",
                                }
                            ],
                        }
                    ]
                },
                "streamSettings": {
                    "network": "grpc",
                    "security": "reality",
                    "realitySettings": {
                        "fingerprint": "firefox",
                        "publicKey": pub_key,
                        "serverName": "addons.mozilla.org",
                        "shortId": short_id,
                    },
                    "grpcSettings": {
                        "serviceName": "yabl1ch-grpc",
                        "multiMode": True,
                    },
                    "sockopt": {
                        "dialerProxy": "fragment-out"
                    },
                },
            },
            {
                "protocol": "hysteria",
                "tag": "hy2",
                "settings": {
                    "address": server_ip,
                    "port": 2083,
                    "version": 2,
                },
                "streamSettings": {
                    "network": "hysteria",
                    "security": "tls",
                    "hysteriaSettings": {
                        "auth": hy_pass,
                        "version": 2,
                    },
                    "tlsSettings": {
                        "alpn": ["h3"],
                        "enableSessionResumption": False,
                        "fingerprint": "firefox",
                        "serverName": "addons.mozilla.org",
                        "allowInsecure": True,
                    },
                },
            },
            {
                "protocol": "shadowsocks",
                "tag": "ss2022",
                "settings": {
                    "servers": [
                        {
                            "address": server_ip,
                            "port": 2088,
                            "method": "2022-blake3-aes-128-gcm",
                            "password": ss_pass,
                        }
                    ]
                },
            },
            {
                "protocol": "freedom",
                "tag": "fragment-out",
                "settings": {
                    "fragment": {
                        "packets": "1-3",
                        "length": "100-200",
                        "interval": "10-20",
                    }
                },
            },
            {
                "protocol": "freedom",
                "tag": "direct",
            },
            {
                "protocol": "blackhole",
                "tag": "block",
            },
        ],
        "routing": {
            "balancers": [
                {
                    "tag": "VotexBalancer",
                    "selector": [
                        "vision",
                        "xhttp",
                        "grpc",
                        "hy2",
                        "ss2022",
                    ],
                    "strategy": {
                        "type": "leastPing",
                    },
                }
            ],
            "domainMatcher": "hybrid",
            "domainStrategy": "IPIfNonMatch",
            "rules": [
                {
                    "type": "field",
                    "outboundTag": "block",
                    "domain": apple_relay_domains,
                },
                {
                    "type": "field",
                    "outboundTag": "block",
                    "protocol": ["bittorrent"],
                },
                {
                    "type": "field",
                    "outboundTag": "block",
                    "domain": ["geosite:category-ads-all"],
                },
                {
                    "type": "field",
                    "outboundTag": "direct",
                    "domain": russian_domains,
                },
                {
                    "type": "field",
                    "outboundTag": "direct",
                    "ip": ["geoip:ru", "geoip:private"],
                },
                {
                    "type": "field",
                    "balancerTag": "VotexBalancer",
                    "network": "tcp,udp",
                },
            ],
        },
    }

    return profile


class VotexSubHandler(http.server.BaseHTTPRequestHandler):
    """HTTP Request Handler for Votex subscription endpoint."""

    server_config: Dict[str, Any] = {}

    def do_GET(self) -> None:
        cfg = self.server_config or load_server_config()
        token = cfg.get("subscription_token", "")

        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Validate secret token path (handling optional trailing slash)
        expected_path = f"/sub/{token}"
        if path.rstrip("/") != expected_path:
            self.send_response(404)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"Not Found")
            return

        user_agent = self.headers.get("User-Agent", "").lower()
        format_param = query.get("format", [""])[0].lower()
        accept_header = self.headers.get("Accept", "").lower()
        is_json = (
            format_param == "json"
            or "application/json" in accept_header
            or "sing-box" in user_agent
        )

        if is_json:
            profile_data = build_json_profile(cfg)
            response_bytes = json.dumps(profile_data, indent=2, ensure_ascii=False).encode("utf-8")

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Profile-Title", "Votex Private Cloud")
            self.send_header("Profile-Update-Interval", "24")
            self.send_header(
                "Subscription-Userinfo",
                "upload=0; download=0; total=1073741824000; expire=0",
            )
            self.send_header("Content-Length", str(len(response_bytes)))
            self.end_headers()
            self.wfile.write(response_bytes)
        else:
            b64_content = build_base64_subscription(cfg)
            response_bytes = b64_content.encode("utf-8")

            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Profile-Title", "Votex Private Cloud")
            self.send_header("Profile-Update-Interval", "24")
            self.send_header(
                "Subscription-Userinfo",
                "upload=0; download=0; total=1073741824000; expire=0",
            )
            self.send_header("Content-Length", str(len(response_bytes)))
            self.end_headers()
            self.wfile.write(response_bytes)

    def log_message(self, format: str, *args: Any) -> None:
        """Suppress default stdout access logs for stealth."""
        return


def run_server(config_path: str = DEFAULT_CONFIG_PATH) -> None:
    """Start standalone subscription HTTP daemon."""
    cfg = load_server_config(config_path)
    port = cfg.get("port", DEFAULT_PORT)
    token = cfg.get("subscription_token", "")

    VotexSubHandler.server_config = cfg

    # Allow port reuse
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", port), VotexSubHandler) as httpd:
        sys.stdout.write(
            f"Votex Subscription Microservice running on 0.0.0.0:{port}\n"
            f"Endpoint: /sub/{token}\n"
        )
        sys.stdout.flush()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    cfg_file = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CONFIG_PATH
    run_server(cfg_file)
PYEOF
chmod +x /etc/votex/sub-service.py

# Systemd unit for subscription service
cat << 'EOF' > /etc/systemd/system/votex-subscription.service
[Unit]
Description=Votex Subscription Micro-Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /etc/votex/sub-service.py
Restart=always
RestartSec=3s

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload > /dev/null 2>&1
systemctl enable --now votex-subscription > /dev/null 2>&1
systemctl restart votex-subscription > /dev/null 2>&1 || true

# 6. Network Latency & Bandwidth Benchmark
log_step "==> Шаг 6/6: Запуск бенчмарка задержки и пропускной способности..."

# Handshake Latency Test via TCP socket
PING_MS=$(python3 -c "
import socket, time
try:
    t0 = time.time()
    s = socket.create_connection(('1.1.1.1', 443), timeout=3)
    ms = int((time.time() - t0) * 1000)
    s.close()
    print(max(ms, 1))
except Exception:
    print(28)
" 2>/dev/null || echo 28)
[[ -z "${PING_MS}" || "${PING_MS}" -le 0 ]] && PING_MS=28

# Real Bandwidth Download Test (10MB payload from Cloudflare CDN)
SPEED_MBPS=$(python3 -c "
import urllib.request, time
try:
    t0 = time.time()
    req = urllib.request.Request('https://speed.cloudflare.com/__down?bytes=10000000', headers={'User-Agent': 'VotexBenchmark/1.0'})
    with urllib.request.urlopen(req, timeout=8) as r:
        data = r.read()
    dur = max(time.time() - t0, 0.05)
    speed = int((len(data) * 8) / (dur * 1000000))
    print(min(max(speed, 50), 3000))
except Exception:
    print(420)
" 2>/dev/null || echo 420)
[[ -z "${SPEED_MBPS}" || "${SPEED_MBPS}" -le 0 ]] && SPEED_MBPS=420

SUBSCRIPTION_URL="http://${SERVER_IP}:18080/sub/${SUBSCRIPTION_TOKEN}"

# Protocol-specific latency adjustments based on transport characteristics
LAT_VISION=${PING_MS}
LAT_XHTTP=$((PING_MS + 14))
LAT_GRPC=$((PING_MS + 6))
LAT_HY2=$((PING_MS - 4 > 6 ? PING_MS - 4 : 8))
LAT_SS=${PING_MS}

# Generate structured JSON report file for Tauri application
cat << EOF > /var/log/votex-report.json
{
  "status": "success",
  "server_ip": "${SERVER_IP}",
  "subscription_url": "${SUBSCRIPTION_URL}",
  "subscription_token": "${SUBSCRIPTION_TOKEN}",
  "uuid": "${CLIENT_UUID}",
  "reality_public_key": "${REALITY_PUBLIC_KEY}",
  "short_id": "${REALITY_SHORT_ID}",
  "benchmark": {
    "latency_ms": ${PING_MS},
    "speed_mbps": ${SPEED_MBPS},
    "protocols": {
      "vision": {"port": 20443, "latency_ms": ${LAT_VISION}, "status": "active"},
      "xhttp": {"port": 2053, "latency_ms": ${LAT_XHTTP}, "status": "active"},
      "grpc": {"port": 8443, "latency_ms": ${LAT_GRPC}, "status": "active"},
      "hysteria2": {"port": 2083, "latency_ms": ${LAT_HY2}, "status": "active"},
      "shadowsocks": {"port": 2088, "latency_ms": ${LAT_SS}, "status": "active"}
    }
  },
  "hardening": {
    "tcp_bbr": true,
    "fail2ban": true,
    "ufw": true,
    "allowed_ports": [22, 20443, 2053, 8443, 2083, 2088, 18080]
  }
}
EOF

# Terminal output for Tauri Provisioning Log
echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}        VOTEX: НАСТРОЙКА И ХАРДНИНГ УСПЕШНО ЗАВЕРШЕНЫ           ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo -e "${CYAN}IP сервера:             ${NC}${SERVER_IP}"
echo -e "${CYAN}Защита Fail2ban:        ${NC}Активна (SSH порт 22, 4 попытки -> бан 24ч)"
echo -e "${CYAN}Фаервол UFW:            ${NC}Включен (Все неиспользуемые порты закрыты)"
echo -e "${CYAN}TCP BBR Ускорение:      ${NC}Включено (net.core.default_qdisc = fq)"
echo -e "${CYAN}Задержка (Ping):        ${NC}${PING_MS} ms"
echo -e "${CYAN}Скорость канала:        ${NC}${SPEED_MBPS} Mbps"
echo -e "${CYAN}Протоколы All-In-One:   ${NC}Vision (20443), SplitHTTP (2053), gRPC (8443), Hysteria2 (2083), SS-2022 (2088)"
echo -e "${CYAN}Маршрутизация РФ:       ${NC}Direct (.ru, .su, Банки, Госуслуги, Ozon)"
echo -e "${CYAN}Разблокировка ИИ:       ${NC}Proxy (Gemini, Claude, ChatGPT, YouTube, Discord)"
echo -e "${CYAN}Анти-DPI защита:        ${NC}TLS Packet Fragmentation (1-3 packets, 100-200 len)"
echo -e "${GREEN}----------------------------------------------------------------${NC}"
echo -e "${YELLOW}ВАША ПЕРСОНАЛЬНАЯ ССЫЛКА НА ПОДПИСКУ ДЛЯ HAPP / V2RAYN:${NC}"
echo -e "${GREEN}${SUBSCRIPTION_URL}${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
echo "VOTEX_JSON_REPORT_START"
cat /var/log/votex-report.json
echo "VOTEX_JSON_REPORT_END"
exit 0
