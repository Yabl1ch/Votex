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
        "remarks": "Votex / JSON",
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

            # Serve JSON with Smart Routing profile for Happ, sing-box, xray or when not requesting b64.
            # Base64 is only served when explicitly requested (?format=b64 or ?format=base64)
            # or for clients that require raw link lists (v2rayN, or desktop browser view).
            is_base64 = (
                format_param in ("b64", "base64")
                or "v2rayn" in user_agent
                or (
                    user_agent.startswith("mozilla")
                    and "happ" not in user_agent
                    and "sing-box" not in user_agent
                    and format_param != "json"
                    and "application/json" not in accept_header
                )
            )

            if not is_base64:
                profile_data = build_json_profile(cfg)
                response_bytes = json.dumps(profile_data, indent=2, ensure_ascii=False).encode("utf-8")

                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Profile-Title", "Votex / JSON")
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
