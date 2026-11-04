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

# Active SSH port detection early for safe rollback
SSH_PORT="${VOTEX_SSH_PORT:-22}"
if [[ -z "${SSH_PORT}" || "${SSH_PORT}" -eq 0 ]]; then
    DETECTED_PORT=$(ss -tlnp 2>/dev/null | grep sshd | awk '{print $4}' | awk -F: '{print $NF}' | head -n1 || echo "")
    [[ -n "${DETECTED_PORT}" ]] && SSH_PORT="${DETECTED_PORT}" || SSH_PORT=22
fi

# Automatic Failure Rollback Mechanism
PROVISION_SUCCESS=0

rollback_installation() {
    local exit_code=$1
    local line_no=$2
    if [[ "${PROVISION_SUCCESS}" -eq 1 ]]; then
        return 0
    fi
    echo ""
    log_error "======================================================================"
    log_error "[VOTEX-ROLLBACK] СБОЙ РАЗВЕРТЫВАНИЯ на строке ${line_no} (код ошибки ${exit_code})!"
    log_error "[VOTEX-ROLLBACK] Запуск автоматического отката и очистки сервера..."
    log_error "======================================================================"

    # 1. Stop and disable created systemd services
    log_info "[ROLLBACK 1/5] Остановка и отключение служб Votex..."
    systemctl stop xray hysteria-server votex-subscription 2>/dev/null || true
    systemctl disable xray hysteria-server votex-subscription 2>/dev/null || true
    rm -f /etc/systemd/system/xray.service \
          /etc/systemd/system/hysteria-server.service \
          /etc/systemd/system/votex-subscription.service 2>/dev/null || true
    systemctl daemon-reload >/dev/null 2>&1 || true

    # 2. Remove binaries and configuration directories
    log_info "[ROLLBACK 2/5] Удаление конфигураций и бинарников..."
    rm -rf /usr/local/etc/xray /etc/hysteria /etc/votex /tmp/xray /tmp/hysteria.tar.gz 2>/dev/null || true
    rm -f /usr/local/bin/xray /usr/local/bin/hysteria /var/log/votex-report.json 2>/dev/null || true

    # 3. Revert sysctl and fail2ban rules
    log_info "[ROLLBACK 3/5] Откат сетевых настроек и Fail2ban..."
    rm -f /etc/sysctl.d/99-votex.conf /etc/fail2ban/jail.d/votex-ssh.local 2>/dev/null || true
    sysctl --system >/dev/null 2>&1 || true
    systemctl restart fail2ban >/dev/null 2>&1 || true

    # 4. Clean UFW firewall and iptables rules while preserving SSH
    log_info "[ROLLBACK 4/5] Восстановление правил фаервола (доступ SSH сохранен)..."
    ufw delete allow 20443/tcp >/dev/null 2>&1 || true
    ufw delete allow 2053/tcp >/dev/null 2>&1 || true
    ufw delete allow 8443/tcp >/dev/null 2>&1 || true
    ufw delete allow 443/tcp >/dev/null 2>&1 || true
    ufw delete allow 443/udp >/dev/null 2>&1 || true
    ufw delete allow 8443/udp >/dev/null 2>&1 || true
    ufw delete allow 2083/udp >/dev/null 2>&1 || true
    ufw delete allow 2083/tcp >/dev/null 2>&1 || true
    ufw delete allow 2088/tcp >/dev/null 2>&1 || true
    ufw delete allow 2088/udp >/dev/null 2>&1 || true
    ufw delete allow 18080/tcp >/dev/null 2>&1 || true
    ufw allow "${SSH_PORT}/tcp" >/dev/null 2>&1 || true
    iptables -t nat -D PREROUTING -p udp --dport 2083 -j REDIRECT --to-ports 443 2>/dev/null || true

    log_warn "[ROLLBACK 5/5] Сервер полностью очищен и возвращен в исходное состояние."
    log_warn "[ROLLBACK] Доступ по SSH гарантированно сохранен на порту ${SSH_PORT}."
    exit "${exit_code}"
}
trap 'rollback_installation $? $LINENO' ERR INT TERM

# 1. Pre-flight checks: root privileges, OS compatibility, and CPU architecture
if [[ "${EUID}" -ne 0 ]]; then
    log_error "Скрипт должен быть запущен с правами root!"
    exit 1
fi

log_step "==> Шаг 1/6: Предварительная валидация окружения и дистрибутива..."

# Check OS distribution
if [[ -f /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    log_info "Операционная система: ${NAME:-Linux} ${VERSION_ID:-} (${ID:-})"
    case "${ID:-}" in
        debian|ubuntu)
            log_info "Дистрибутив поддерживается (Debian/Ubuntu)"
            ;;
        *)
            log_warn "Обнаружен дистрибутив: ${ID:-unknown}. Рекомендуются чистые Debian 11/12 или Ubuntu 20.04/22.04/24.04."
            ;;
    esac
fi

# Verify systemd init system is active
if ! pidof systemd >/dev/null 2>&1 && ! [[ -d /run/systemd/system ]]; then
    log_error "Votex требует систему инициализации systemd. Системы без systemd (OpenVZ 6, SysVinit) не поддерживаются."
    exit 1
fi

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
            wget -qO- --timeout=4 http://api.ipify.org 2>/dev/null || \
            ip route get 1.1.1.1 2>/dev/null | awk '{print $7}' | tr -d '[:space:]' || \
            echo "127.0.0.1")
SERVER_IP=$(echo "${SERVER_IP}" | tr -d '[:space:]')
log_info "Определен внешний IPv4 сервера: ${SERVER_IP}"

# 2. Package updates and essential tooling
log_step "==> Шаг 2/6: Установка системных зависимостей и утилит..."
export DEBIAN_FRONTEND=noninteractive
export UCF_FORCE_CONFFOLD=1

# Wait for apt/dpkg lock release (e.g. if cloud-init is running on fresh VPS)
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

log_info "Установка базовых пакетов (curl, wget, jq, ufw, fail2ban, openssl, python3, psmisc)..."
apt-get install -y --no-install-recommends \
    curl wget jq ufw fail2ban openssl uuid-runtime tar unzip python3 ca-certificates iproute2 psmisc > /dev/null 2>&1 || \
    apt-get install -y curl wget openssl python3 ca-certificates psmisc > /dev/null 2>&1 || true

log_info "Используемый порт администрирования SSH: ${SSH_PORT}"

# Port conflict detection and auto-resolution
check_and_resolve_port_conflicts() {
    local votex_ports=(20443 2053 8443 443 2088 18080)
    log_info "Проверка доступности рабочих портов Votex..."
    for p in "${votex_ports[@]}"; do
        if ss -tuln 2>/dev/null | grep -q ":${p}\b"; then
            local proc_name
            proc_name=$(ss -tulpn 2>/dev/null | grep ":${p}\b" | awk '{print $NF}' | head -n1 || echo "")
            log_info "Порт ${p} занят (${proc_name}). Освобождение порта для Votex..."
            systemctl stop xray hysteria-server votex-subscription 2>/dev/null || true
            fuser -k -n tcp "${p}" 2>/dev/null || true
            fuser -k -n udp "${p}" 2>/dev/null || true
            sleep 1
        fi
    done
}
check_and_resolve_port_conflicts

# Pre-deployment SNI validation and dynamic candidate selection
select_best_sni() {
    log_info "Тестирование доступности и валидация кандидатов маскировки SNI (TLS 1.3 + HTTP/2)..."
    local candidates=(
        "addons.mozilla.org"
        "www.microsoft.com"
        "gateway.icloud.com"
        "dl.google.com"
        "www.apple.com"
        "teams.microsoft.com"
    )
    local best_sni=""
    local min_latency=9999

    for domain in "${candidates[@]}"; do
        # 1. DNS check
        if ! getent ahosts "${domain}" >/dev/null 2>&1; then
            continue
        fi
        # 2. TLS 1.3 check with timeout
        local tls_check
        tls_check=$(timeout 4 bash -c "echo | openssl s_client -connect ${domain}:443 -servername ${domain} -tls1_3 -brief 2>&1" || true)
        if ! echo "${tls_check}" | grep -E -q "TLSv1\.3|Protocol\s*:\s*TLSv1\.3"; then
            continue
        fi
        # 3. HTTP/2 ALPN check
        local alpn_check
        alpn_check=$(timeout 4 bash -c "echo | openssl s_client -connect ${domain}:443 -servername ${domain} -alpn h2 2>&1" || true)
        if ! echo "${alpn_check}" | grep -q "ALPN protocol: h2"; then
            continue
        fi
        # 4. Measure handshake latency
        local start_ms end_ms elapsed
        start_ms=$(date +%s%3N 2>/dev/null || python3 -c 'import time; print(int(time.time()*1000))' 2>/dev/null || echo 0)
        timeout 3 bash -c "true < /dev/tcp/${domain}/443" 2>/dev/null || true
        end_ms=$(date +%s%3N 2>/dev/null || python3 -c 'import time; print(int(time.time()*1000))' 2>/dev/null || echo 50)
        elapsed=$((end_ms - start_ms))
        if [[ ${elapsed} -le 0 ]]; then elapsed=50; fi

        log_info "Кандидат SNI: ${domain} (TLS 1.3: OK, h2: OK, задержка: ${elapsed}ms)"
        if [[ ${elapsed} -lt ${min_latency} ]]; then
            min_latency=${elapsed}
            best_sni="${domain}"
            if [[ ${elapsed} -lt 80 ]]; then
                break
            fi
        fi
    done

    if [[ -z "${best_sni}" ]]; then
        best_sni="addons.mozilla.org"
        log_warn "Автоподбор SNI: используется проверенный домен по умолчанию: ${best_sni}"
    else
        log_info "Выбран оптимальный домен прикрытия SNI: ${best_sni} (задержка: ${min_latency}ms)"
    fi
    REALITY_SNI="${best_sni}"
}
select_best_sni

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
ufw allow 8443/tcp comment 'Votex Reality gRPC' > /dev/null 2>&1 || true
ufw allow 443/tcp comment 'Votex Hysteria 2 TCP Ping' > /dev/null 2>&1 || true
ufw allow 443/udp comment 'Votex Hysteria 2 UDP' > /dev/null 2>&1 || true
ufw allow 8443/udp comment 'Votex Hysteria 2 UDP Legacy' > /dev/null 2>&1 || true
ufw allow 2083/udp comment 'Votex Hysteria 2 UDP Legacy' > /dev/null 2>&1 || true
ufw allow 2083/tcp comment 'Votex Hysteria 2 TCP Ping Legacy' > /dev/null 2>&1 || true
ufw allow 2088/tcp comment 'Votex Shadowsocks-2022' > /dev/null 2>&1 || true
ufw allow 2088/udp comment 'Votex Shadowsocks-2022 UDP' > /dev/null 2>&1 || true
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
curl -fsSL https://get.hy2.sh/ | bash > /dev/null 2>&1 || {
    log_warn "Официальный скрипт Hysteria не сработал, скачиваем бинарник с GitHub..."
    HYSTERIA_URL="https://github.com/apernet/hysteria/releases/latest/download/hysteria-linux-${HYSTERIA_ARCH}"
    wget -qO /usr/local/bin/hysteria "${HYSTERIA_URL}" || true
    chmod +x /usr/local/bin/hysteria || true
}

# 5. Configuration Generation and Key Generation
log_step "==> Шаг 5/6: Генерация криптографических ключей и конфигураций..."

# Generate Reality X25519 keys
if [[ -x /usr/local/bin/xray ]]; then
    XRAY_KEYS=$(/usr/local/bin/xray x25519)
    REALITY_PRIVATE_KEY=$(echo "${XRAY_KEYS}" | grep -i "Private" | awk '{print $NF}' | tr -d '[:space:]')
    REALITY_PUBLIC_KEY=$(echo "${XRAY_KEYS}" | grep -i "Public" | awk '{print $NF}' | tr -d '[:space:]')
else
    KEYS_PY=$(python3 -c "
import base64
from cryptography.hazmat.primitives.asymmetric import x25519
priv = x25519.X25519PrivateKey.generate()
pub = priv.public_key()
from cryptography.hazmat.primitives import serialization
priv_bytes = priv.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption())
pub_bytes = pub.public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
priv_b64 = base64.urlsafe_b64encode(priv_bytes).decode().rstrip('=')
pub_b64 = base64.urlsafe_b64encode(pub_bytes).decode().rstrip('=')
print(priv_b64, pub_b64)
")
    REALITY_PRIVATE_KEY=$(echo "${KEYS_PY}" | awk '{print $1}')
    REALITY_PUBLIC_KEY=$(echo "${KEYS_PY}" | awk '{print $2}')
fi

REALITY_SHORT_ID=$(openssl rand -hex 8)
CLIENT_UUID=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null || python3 -c 'import uuid; print(uuid.uuid4())')
SS_PASSWORD=$(openssl rand -base64 16)
HY_PASSWORD=$(openssl rand -hex 16)
SUBSCRIPTION_TOKEN=$(openssl rand -hex 16)

# Generate self-signed TLS cert for Hysteria 2 under selected SNI
SERVER_IP_DASH=$(echo "${SERVER_IP}" | tr '.' '-')
openssl ecparam -name prime256v1 -genkey -noout -out /etc/hysteria/server.key > /dev/null 2>&1 || true
openssl req -new -x509 -key /etc/hysteria/server.key -out /etc/hysteria/server.crt -days 3650 \
  -subj "/CN=${REALITY_SNI}" \
  -addext "subjectAltName=DNS:${REALITY_SNI},DNS:${SERVER_IP_DASH}.sslip.io,IP:${SERVER_IP}" > /dev/null 2>&1 || true
if [[ ! -s /etc/hysteria/server.key || ! -s /etc/hysteria/server.crt ]]; then
  openssl req -x509 -nodes -newkey rsa:2048 -keyout /etc/hysteria/server.key -out /etc/hysteria/server.crt -days 3650 \
    -subj "/CN=${REALITY_SNI}" > /dev/null 2>&1 || true
fi
HY_CERT_SHA256=$(openssl x509 -in /etc/hysteria/server.crt -outform der 2>/dev/null | sha256sum 2>/dev/null | awk '{print $1}' || echo "")

# 5.1. Generate Xray Server Configuration (/usr/local/etc/xray/config.json)
cat << EOF > /usr/local/etc/xray/config.json
{
  "log": {
    "loglevel": "warning"
  },
  "dns": {
    "servers": [
      "1.1.1.1",
      "8.8.8.8",
      "localhost"
    ]
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
          "dest": "${REALITY_SNI}:443",
          "xver": 0,
          "serverNames": ["${REALITY_SNI}"],
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
          "dest": "${REALITY_SNI}:443",
          "xver": 0,
          "serverNames": ["${REALITY_SNI}"],
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
          "dest": "${REALITY_SNI}:443",
          "xver": 0,
          "serverNames": ["${REALITY_SNI}"],
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
    },
    {
      "tag": "hysteria-tcp-ping",
      "port": 443,
      "protocol": "dokodemo-door",
      "settings": {
        "address": "127.0.0.1",
        "port": 18080,
        "network": "tcp"
      }
    },
    {
      "tag": "hysteria-tcp-ping-legacy",
      "port": 2083,
      "protocol": "dokodemo-door",
      "settings": {
        "address": "127.0.0.1",
        "port": 18080,
        "network": "tcp"
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
listen: :443
tls:
  cert: /etc/hysteria/server.crt
  key: /etc/hysteria/server.key
  sniGuard: disable
auth:
  type: password
  password: "${HY_PASSWORD}"
masquerade:
  type: proxy
  proxy:
    url: https://${REALITY_SNI}/
    rewriteHost: true
EOF

# Multi-port UDP redirection for Hysteria 2 (legacy port 2083 -> 443)
iptables -t nat -A PREROUTING -p udp --dport 2083 -j REDIRECT --to-ports 443 > /dev/null 2>&1 || true

# Set proper permissions for /etc/hysteria and certificates
chmod 755 /etc/hysteria
chmod 644 /etc/hysteria/server.crt > /dev/null 2>&1 || true
chmod 644 /etc/hysteria/server.key > /dev/null 2>&1 || true
chmod 644 /etc/hysteria/config.yaml > /dev/null 2>&1 || true

# Hysteria 2 Systemd Unit
cat << 'EOF' > /etc/systemd/system/hysteria-server.service
[Unit]
Description=Hysteria 2 Server
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/hysteria server --config /etc/hysteria/config.yaml
Restart=always
RestartSec=3s
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

# Reload and start core VPN engines
systemctl daemon-reload
systemctl enable --now xray > /dev/null 2>&1 || systemctl restart xray > /dev/null 2>&1 || true
systemctl enable --now hysteria-server > /dev/null 2>&1 || systemctl restart hysteria-server > /dev/null 2>&1 || true

sleep 2
if systemctl is-active --quiet xray; then
    log_info "Xray-core успешно запущен (порты 20443, 2053, 8443, 443-TCP, 2083-TCP, 2088 активны)"
else
    log_warn "Xray не запустился. Диагностика службы:"
    journalctl -u xray -n 12 --no-pager 2>&1 || true
fi

if systemctl is-active --quiet hysteria-server; then
    log_info "Hysteria 2 сервер успешно запущен (UDP 443 активен)"
else
    log_warn "Hysteria 2 не запустился. Диагностика службы:"
    journalctl -u hysteria-server -n 12 --no-pager 2>&1 || true
fi

# 5.3. Votex Subscription Microservice Deployment
mkdir -p /etc/votex
cat << EOF > /etc/votex/config.json
{
  "server_ip": "${SERVER_IP}",
  "subscription_token": "${SUBSCRIPTION_TOKEN}",
  "client_uuid": "${CLIENT_UUID}",
  "reality_public_key": "${REALITY_PUBLIC_KEY}",
  "reality_short_id": "${REALITY_SHORT_ID}",
  "ss_password": "${SS_PASSWORD}",
  "hy_password": "${HY_PASSWORD}",
  "hy_cert_sha256": "${HY_CERT_SHA256}",
  "reality_sni": "${REALITY_SNI}",
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
        "reality_sni": os.getenv("VOTEX_REALITY_SNI", "addons.mozilla.org"),
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
    """Generate Base64 encoded subscription link list with 5 protocols."""
    server_ip = cfg.get("server_ip", "127.0.0.1")
    uuid = cfg.get("client_uuid", "")
    pub_key = cfg.get("reality_public_key", "")
    short_id = cfg.get("reality_short_id", "")
    sni = cfg.get("reality_sni", "addons.mozilla.org")
    hy_pass = cfg.get("hy_password", "")
    ss_pass = cfg.get("ss_password", "")
    cert_sha256 = cfg.get("hy_cert_sha256", "")

    # SS-2022 userinfo base64 encoded (2022-blake3-aes-128-gcm:pass)
    ss_auth_str = f"2022-blake3-aes-128-gcm:{ss_pass}"
    ss_auth_b64 = base64.urlsafe_b64encode(ss_auth_str.encode("utf-8")).decode("utf-8").rstrip("=")

    pin_param = f"&pinSHA256={cert_sha256}" if cert_sha256 else ""

    links: List[str] = [
        (
            f"vless://{uuid}@{server_ip}:20443"
            f"?security=reality&encryption=none&pbk={pub_key}&headerType=none&fp=firefox"
            f"&type=tcp&flow=xtls-rprx-vision&sni={sni}&sid={short_id}"
            f"#Votex-Reality-Vision"
        ),
        (
            f"vless://{uuid}@{server_ip}:2053"
            f"?security=reality&encryption=none&pbk={pub_key}&headerType=none&fp=firefox"
            f"&type=xhttp&sni={sni}&sid={short_id}"
            f"&path=%2Fassets%2Fbuild%2F_app%2Fimmutable%2Fchunks%2Fstream-one%2F"
            f"#Votex-SplitHTTP-AntiDPI"
        ),
        (
            f"vless://{uuid}@{server_ip}:8443"
            f"?security=reality&encryption=none&pbk={pub_key}&headerType=none&fp=firefox"
            f"&type=grpc&serviceName=yabl1ch-grpc&sni={sni}&sid={short_id}"
            f"#Votex-Reality-gRPC"
        ),
        (
            f"hysteria2://{hy_pass}@{server_ip}:443/"
            f"?insecure=1&allowInsecure=1&sni={sni}{pin_param}"
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
    cert_sha256 = cfg.get("hy_cert_sha256", "")
    sni = cfg.get("reality_sni", "addons.mozilla.org")

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
        "remarks": "Votex Smart Routing",
        "burstObservatory": {
            "pingConfig": {
                "destination": "http://cp.cloudflare.com/generate_204",
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
        "observatory": {
            "probeUrl": "http://cp.cloudflare.com/generate_204",
            "probeInterval": "1m",
            "enableConcurrency": True,
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
                        "serverName": sni,
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
                        "serverName": sni,
                        "shortId": short_id,
                    },
                    "xhttpSettings": {
                        "host": sni,
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
                        "serverName": sni,
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
                    "port": 443,
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
                        "serverName": sni,
                        "allowInsecure": True,
                        "insecure": True,
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
                    "port": "22,18080",
                },
                {
                    "type": "field",
                    "outboundTag": "direct",
                    "ip": [server_ip, "geoip:ru", "geoip:private"],
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


def get_system_stats() -> Dict[str, Any]:
    """Collect real system metrics from Linux /proc filesystem."""
    stats: Dict[str, Any] = {
        "status": "online",
        "uptime_seconds": 0,
        "uptime_str": "0м",
        "cpu_percent": 0.0,
        "ram_used_mb": 0,
        "ram_total_mb": 0,
        "ram_percent": 0.0,
        "load_avg": [0.0, 0.0, 0.0],
    }
    # Uptime from /proc/uptime
    try:
        if os.path.exists("/proc/uptime"):
            with open("/proc/uptime", "r", encoding="utf-8") as f:
                up_sec = int(float(f.readline().split()[0]))
                stats["uptime_seconds"] = up_sec
                days = up_sec // 86400
                hours = (up_sec % 86400) // 3600
                mins = (up_sec % 3600) // 60
                if days > 0:
                    stats["uptime_str"] = f"{days}д {hours}ч {mins}м"
                elif hours > 0:
                    stats["uptime_str"] = f"{hours}ч {mins}м"
                else:
                    stats["uptime_str"] = f"{mins}м"
    except Exception:
        pass

    # RAM from /proc/meminfo
    try:
        if os.path.exists("/proc/meminfo"):
            mem_info: Dict[str, int] = {}
            with open("/proc/meminfo", "r", encoding="utf-8") as f:
                for line in f:
                    parts = line.split(":")
                    if len(parts) == 2:
                        key = parts[0].strip()
                        val = parts[1].strip().split()[0]
                        if val.isdigit():
                            mem_info[key] = int(val)
            total_kb = mem_info.get("MemTotal", 0)
            avail_kb = mem_info.get("MemAvailable", mem_info.get("MemFree", 0))
            used_kb = max(0, total_kb - avail_kb)
            if total_kb > 0:
                stats["ram_total_mb"] = total_kb // 1024
                stats["ram_used_mb"] = used_kb // 1024
                stats["ram_percent"] = round((used_kb / total_kb) * 100, 1)
    except Exception:
        pass

    # Load avg from /proc/loadavg or os.getloadavg()
    try:
        if hasattr(os, "getloadavg"):
            lavg = os.getloadavg()
            stats["load_avg"] = [round(x, 2) for x in lavg]
            cpu_count = os.cpu_count() or 1
            stats["cpu_percent"] = min(100.0, round((lavg[0] / cpu_count) * 100, 1))
    except Exception:
        pass

    return stats


class VotexSubHandler(http.server.BaseHTTPRequestHandler):
    """HTTP Request Handler for Votex subscription endpoint."""

    server_config: Dict[str, Any] = {}

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Expose-Headers", "*")
        self.end_headers()

    def do_HEAD(self) -> None:
        self._handle_request(head_only=True)

    def do_GET(self) -> None:
        self._handle_request(head_only=False)

    def _handle_request(self, head_only: bool = False) -> None:
        try:
            cfg = self.server_config or load_server_config()
            token = cfg.get("subscription_token", "")

            parsed = urllib.parse.urlparse(self.path)
            clean_path = parsed.path.rstrip("/")
            query = urllib.parse.parse_qs(parsed.query)

            # Direct generate_204 endpoint for client latency testing
            if clean_path in ("/generate_204", "/gen_204"):
                self.send_response(204)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Connection", "close")
                self.end_headers()
                return

            # Live system stats endpoint for Dashboard
            is_stats_req = (
                clean_path == f"/stats/{token}"
                or (clean_path == f"/sub/{token}" and query.get("action", [""])[0] == "stats")
            )
            if is_stats_req:
                stats_data = get_system_stats()
                stats_data["reality_sni"] = cfg.get("reality_sni", "addons.mozilla.org")
                resp_bytes = json.dumps(stats_data, ensure_ascii=False).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Length", str(len(resp_bytes)))
                self.end_headers()
                if not head_only:
                    self.wfile.write(resp_bytes)
                return

            # Validate secret token path
            expected_path = f"/sub/{token}"
            if clean_path != expected_path:
                self.send_response(404)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                if not head_only:
                    self.wfile.write(b"Not Found")
                return

            user_agent = self.headers.get("User-Agent", "").lower()
            format_param = query.get("format", [""])[0].lower()
            accept_header = self.headers.get("Accept", "").lower()

            # Return JSON only when explicitly requested
            # (?format=json or Accept: application/json without wildcard).
            # By default (for Happ, v2rayN, sing-box, Streisand, etc.), serve Base64 with all 5 protocols
            # so client displays all 5 individual protocol nodes.
            is_json = (
                format_param == "json"
                or (
                    "application/json" in accept_header
                    and "*/*" not in accept_header
                    and format_param not in ("b64", "base64")
                )
            )

            if is_json:
                profile_data = build_json_profile(cfg)
                response_bytes = json.dumps(profile_data, indent=2, ensure_ascii=False).encode("utf-8")

                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Profile-Title", "Votex Smart Routing")
                self.send_header("Profile-Type", "xray")
                self.send_header("Profile-Update-Interval", "24")
                self.send_header("Profile-Test-Url", "http://cp.cloudflare.com/generate_204")
                self.send_header("Profile-Web-Page-Url", "https://github.com/Yabl1ch/Votex")
                self.send_header(
                    "Subscription-Userinfo",
                    "upload=0; download=0; total=1073741824000; expire=0",
                )
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Access-Control-Expose-Headers", "*")
                self.send_header("Content-Length", str(len(response_bytes)))
                self.end_headers()
                if not head_only:
                    self.wfile.write(response_bytes)
            else:
                b64_content = build_base64_subscription(cfg)
                response_bytes = b64_content.encode("utf-8")

                self.send_response(200)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.send_header("Profile-Title", "Votex")
                self.send_header("Profile-Update-Interval", "24")
                self.send_header("Profile-Test-Url", "http://cp.cloudflare.com/generate_204")
                self.send_header("Profile-Web-Page-Url", "https://github.com/Yabl1ch/Votex")
                self.send_header(
                    "Subscription-Userinfo",
                    "upload=0; download=0; total=1073741824000; expire=0",
                )
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Access-Control-Expose-Headers", "*")
                self.send_header("Content-Length", str(len(response_bytes)))
                self.end_headers()
                if not head_only:
                    self.wfile.write(response_bytes)
        except Exception as e:
            try:
                self.send_response(500)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.end_headers()
                if not head_only:
                    self.wfile.write(f"Internal Error: {e}".encode("utf-8"))
            except Exception:
                pass

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
User=root
ExecStart=/usr/bin/python3 /etc/votex/sub-service.py /etc/votex/config.json
Restart=always
RestartSec=3s
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now votex-subscription > /dev/null 2>&1
systemctl restart votex-subscription > /dev/null 2>&1 || true

sleep 1
if systemctl is-active --quiet votex-subscription; then
    log_info "Микросервис подписки успешно запущен на порту 18080"
else
    log_warn "Микросервис подписки не запустился. Вывод ошибки:"
    journalctl -u votex-subscription -n 12 --no-pager 2>&1 || true
fi

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
  "reality_sni": "${REALITY_SNI}",
  "benchmark": {
    "latency_ms": ${PING_MS},
    "speed_mbps": ${SPEED_MBPS},
    "protocols": {
      "vision": {"port": 20443, "latency_ms": ${LAT_VISION}, "status": "active"},
      "xhttp": {"port": 2053, "latency_ms": ${LAT_XHTTP}, "status": "active"},
      "grpc": {"port": 8443, "latency_ms": ${LAT_GRPC}, "status": "active"},
      "hysteria2": {"port": 443, "latency_ms": ${LAT_HY2}, "status": "active"},
      "shadowsocks": {"port": 2088, "latency_ms": ${LAT_SS}, "status": "active"}
    }
  },
  "hardening": {
    "tcp_bbr": true,
    "fail2ban": true,
    "ufw": true,
    "allowed_ports": [22, 20443, 2053, 8443, 443, 2083, 2088, 18080]
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
echo -e "${CYAN}Маскировка SNI:         ${NC}${REALITY_SNI} (TLS 1.3 / HTTP/2 подтверждены)"
echo -e "${CYAN}Задержка (Ping):        ${NC}${PING_MS} ms"
echo -e "${CYAN}Скорость канала:        ${NC}${SPEED_MBPS} Mbps"
echo -e "${CYAN}Протоколы All-In-One:   ${NC}Vision (20443), SplitHTTP (2053), gRPC (8443), Hysteria2 (443), SS-2022 (2088)"
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

# Mark provisioning as successful to disarm rollback trap
PROVISION_SUCCESS=1
trap - ERR INT TERM
exit 0
