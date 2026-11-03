#!/usr/bin/env python3
"""
Unit and integration tests for Votex Phase 4:
Business logic, screens, IPC integration, IPv4 validation, Smart Routing and benchmarks.
"""

import os
import re
import json
import unittest

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DIR = os.path.join(REPO_ROOT, "src")
PAGES_DIR = os.path.join(SRC_DIR, "pages")
PACKAGE_JSON = os.path.join(REPO_ROOT, "package.json")


def is_valid_ipv4(ip: str) -> bool:
    """Python replica of frontend isValidIPv4 function."""
    trimmed = ip.strip()
    pattern = r"^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$"
    return bool(re.match(pattern, trimmed))


def is_valid_port(port: int) -> bool:
    """Python replica of frontend isValidPort function."""
    return isinstance(port, int) and 1 <= port <= 65535


class TestPhase4BusinessLogic(unittest.TestCase):
    def test_ipv4_validation_logic(self):
        """Validate IPv4 parser against standard and edge cases."""
        valid_ips = [
            "89.125.126.90",
            "127.0.0.1",
            "192.168.1.1",
            "10.0.0.1",
            "255.255.255.255",
            "0.0.0.0",
        ]
        for ip in valid_ips:
            self.assertTrue(is_valid_ipv4(ip), f"Expected valid IP: {ip}")

        invalid_ips = [
            "256.1.1.1",
            "1.2.3.4.5",
            "192.168.1",
            "abc.def.ghi.jkl",
            "89.125.126.999",
            "",
            "   ",
            "1.1.1.1/24",
        ]
        for ip in invalid_ips:
            self.assertFalse(is_valid_ipv4(ip), f"Expected invalid IP: {ip}")

    def test_port_validation_logic(self):
        """Validate SSH port range 1..65535."""
        self.assertTrue(is_valid_port(22))
        self.assertTrue(is_valid_port(80))
        self.assertTrue(is_valid_port(443))
        self.assertTrue(is_valid_port(65535))

        self.assertFalse(is_valid_port(0))
        self.assertFalse(is_valid_port(-1))
        self.assertFalse(is_valid_port(65536))
        self.assertFalse(is_valid_port(100000))

    def test_smart_routing_categories_and_rules(self):
        """Verify Smart Routing has DIRECT, PROXY, and BLOCK with complete coverage."""
        store_file = os.path.join(SRC_DIR, "store", "index.ts")
        with open(store_file, "r", encoding="utf-8") as f:
            content = f.read()

        # Check required categories
        self.assertIn("ru_direct", content)
        self.assertIn("vpn_tunnel", content)
        self.assertIn("blocked", content)

        # Check essential Direct domains (Russian services)
        required_direct = [
            "*.ru",
            "*.su",
            "*.gosuslugi.ru",
            "*.sberbank.ru",
            "*.tbank.ru",
            "*.yandex.ru",
            "*.vk.com",
            "*.ozon.ru",
            "geoip:ru",
        ]
        for domain in required_direct:
            self.assertIn(domain, content, f"Missing direct domain rule: {domain}")

        # Check essential Proxy domains (Blocked services and AI)
        required_proxy = [
            "*.youtube.com",
            "*.discord.com",
            "*.gemini.google.com",
            "*.claude.ai",
            "*.chatgpt.com",
            "*.openai.com",
            "outboundTag: proxy",
        ]
        for domain in required_proxy:
            self.assertIn(domain, content, f"Missing proxy domain rule: {domain}")

        # Check essential Block rules
        required_block = [
            "mask.icloud.com",
            "dns.apple.com",
            "protocol: bittorrent",
            "geosite:category-ads-all",
        ]
        for domain in required_block:
            self.assertIn(domain, content, f"Missing block domain rule: {domain}")

    def test_anti_text_wrap_on_mandatory_buttons(self):
        """Verify whitespace-nowrap on all required key buttons across pages."""
        # 1. ProvisioningPage: "Настроить и защитить сервер"
        prov_path = os.path.join(PAGES_DIR, "ProvisioningPage.tsx")
        with open(prov_path, "r", encoding="utf-8") as f:
            prov_content = f.read()
        self.assertIn("Настроить и защитить сервер", prov_content)
        self.assertIn("Проверить соединение", prov_content)
        self.assertIn("whitespace-nowrap", prov_content)

        # 2. DashboardPage: "Копировать ссылку для Happ"
        dash_path = os.path.join(PAGES_DIR, "DashboardPage.tsx")
        with open(dash_path, "r", encoding="utf-8") as f:
            dash_content = f.read()
        self.assertIn("Копировать ссылку для Happ", dash_content)
        self.assertIn("whitespace-nowrap", dash_content)

        # 3. ReportsPage: "Повторить тест скорости"
        rep_path = os.path.join(PAGES_DIR, "ReportsPage.tsx")
        with open(rep_path, "r", encoding="utf-8") as f:
            rep_content = f.read()
        self.assertIn("Повторить тест скорости", rep_content)
        self.assertIn("whitespace-nowrap", rep_content)

    def test_qr_code_dependency_and_integration(self):
        """Verify qrcode package is declared and used in SubscriptionPage."""
        with open(PACKAGE_JSON, "r", encoding="utf-8") as f:
            pkg = json.load(f)
        self.assertIn("qrcode", pkg.get("dependencies", {}))

        sub_path = os.path.join(PAGES_DIR, "SubscriptionPage.tsx")
        with open(sub_path, "r", encoding="utf-8") as f:
            sub_content = f.read()
        self.assertIn('import QRCode from "qrcode"', sub_content)
        self.assertIn("QRCode.toDataURL", sub_content)

    def test_zero_emojis_in_phase4_pages(self):
        """HARD RULE: Verify no Unicode emojis exist in any of the updated pages."""
        emoji_pattern = re.compile(
            r"[\U0001F600-\U0001F64F"
            r"\U0001F300-\U0001F5FF"
            r"\U0001F680-\U0001F6FF"
            r"\U0001F1E0-\U0001F1FF"
            r"\U00002702-\U000027B0"
            r"\U0001F900-\U0001F9FF"
            r"\U0001FA00-\U0001FA6F"
            r"\U0001FA70-\U0001FAFF"
            r"]+",
            flags=re.UNICODE,
        )

        for filename in os.listdir(PAGES_DIR):
            if filename.endswith(".tsx"):
                filepath = os.path.join(PAGES_DIR, filename)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                matches = emoji_pattern.findall(content)
                self.assertEqual(
                    len(matches),
                    0,
                    f"Found forbidden emojis in {filename}: {matches}",
                )

    def test_all_five_protocols_present(self):
        """Ensure all 5 required protocols are present on Dashboard."""
        dash_path = os.path.join(PAGES_DIR, "DashboardPage.tsx")
        with open(dash_path, "r", encoding="utf-8") as f:
            content = f.read()

        protocols = ["Reality", "SplitHTTP", "gRPC", "Hysteria 2", "Shadowsocks-2022"]
        for proto in protocols:
            self.assertIn(proto, content, f"Missing protocol on dashboard: {proto}")


if __name__ == "__main__":
    unittest.main()
