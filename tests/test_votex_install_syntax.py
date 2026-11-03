#!/usr/bin/env python3
"""
Syntax, integrity, and compliance tests for scripts/votex-install.sh.
"""

import os
import re
import subprocess
import unittest

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INSTALL_SCRIPT = os.path.join(REPO_ROOT, "scripts", "votex-install.sh")
SUB_SERVICE_SCRIPT = os.path.join(REPO_ROOT, "scripts", "sub-service.py")

# Look for Git Bash or system bash
GIT_BASH_CANDIDATES = [
    r"D:\Games\Git\bin\bash.exe",
    r"C:\Program Files\Git\bin\bash.exe",
    "bash",
]


def find_bash():
    for candidate in GIT_BASH_CANDIDATES:
        try:
            res = subprocess.run(
                [candidate, "--version"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=False,
            )
            if res.returncode == 0:
                return candidate
        except Exception:
            continue
    return None


class TestVotexInstallScript(unittest.TestCase):
    def setUp(self):
        self.assertTrue(os.path.exists(INSTALL_SCRIPT), "scripts/votex-install.sh must exist")
        with open(INSTALL_SCRIPT, "r", encoding="utf-8") as f:
            self.script_content = f.read()

    def test_bash_syntax_check(self):
        """Run bash -n on votex-install.sh."""
        bash_bin = find_bash()
        if not bash_bin:
            self.skipTest("bash binary not found on host to perform bash -n check")

        cmd = [bash_bin, "-n", INSTALL_SCRIPT]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.assertEqual(
            res.returncode,
            0,
            f"bash -n failed with code {res.returncode}:\n{res.stderr}",
        )

    def test_defensive_bash_header(self):
        """Ensure defensive shell header 'set -euo pipefail' is used."""
        self.assertIn("set -euo pipefail", self.script_content)

    def test_preflight_checks(self):
        """Ensure root check and architecture branching exist."""
        self.assertIn('EUID', self.script_content)
        self.assertIn('x86_64', self.script_content)
        self.assertIn('arm64', self.script_content)
        self.assertIn('SERVER_IP', self.script_content)

    def test_hardening_configurations(self):
        """Ensure TCP BBR, Fail2ban, and UFW are properly configured."""
        # Sysctl
        self.assertIn("/etc/sysctl.d/99-votex.conf", self.script_content)
        self.assertIn("net.ipv4.tcp_congestion_control = bbr", self.script_content)
        self.assertIn("net.ipv4.tcp_syncookies = 1", self.script_content)
        self.assertIn("net.ipv4.conf.all.rp_filter = 1", self.script_content)

        # Fail2ban
        self.assertIn("/etc/fail2ban/jail.d/votex-ssh.local", self.script_content)
        self.assertIn("maxretry = 4", self.script_content)
        self.assertIn("findtime = 600", self.script_content)
        self.assertIn("bantime = 86400", self.script_content)
        self.assertIn("banaction = ufw", self.script_content)

        # UFW Ports
        self.assertIn("ufw default deny incoming", self.script_content)
        expected_ports = ["22/tcp", "20443/tcp", "2053/tcp", "8443/tcp", "2083/udp", "2088/tcp", "18080/tcp"]
        for port in expected_ports:
            self.assertIn(port, self.script_content, f"Port {port} must be configured in UFW rules")

    def test_vpn_engine_and_keys(self):
        """Ensure Xray, Hysteria 2 and cryptographic keys are handled."""
        self.assertIn("x25519", self.script_content)
        self.assertIn("/usr/local/etc/xray/config.json", self.script_content)
        self.assertIn("/etc/hysteria/config.yaml", self.script_content)
        self.assertIn("addons.mozilla.org", self.script_content)
        self.assertIn("xtls-rprx-vision", self.script_content)
        self.assertIn("2022-blake3-aes-128-gcm", self.script_content)

    def test_subscription_service_deployment(self):
        """Ensure sub-service.py is written and managed by systemd."""
        self.assertIn("/etc/votex/sub-service.py", self.script_content)
        self.assertIn("votex-subscription.service", self.script_content)
        self.assertIn("/etc/votex/config.json", self.script_content)

    def test_benchmark_and_report_markers(self):
        """Ensure benchmark runs and output markers are present."""
        self.assertIn("/var/log/votex-report.json", self.script_content)
        self.assertIn("VOTEX_JSON_REPORT_START", self.script_content)
        self.assertIn("VOTEX_JSON_REPORT_END", self.script_content)

    def test_no_unicode_emojis(self):
        """HARD RULE: Complete prohibition of Unicode emojis in codebase and scripts."""
        # Unicode emoji range regex
        emoji_pattern = re.compile(
            r"[\U0001F600-\U0001F64F"  # Emoticons
            r"\U0001F300-\U0001F5FF"  # Misc symbols & pictographs
            r"\U0001F680-\U0001F6FF"  # Transport & map
            r"\U0001F1E0-\U0001F1FF"  # Flags
            r"\U00002702-\U000027B0"  # Dingbats
            r"\U0001F900-\U0001F9FF"  # Supplemental symbols & pictographs
            r"\U0001FA00-\U0001FA6F"  # Chess symbols, symbols & pictographs extended-A
            r"\U0001FA70-\U0001FAFF"  # Symbols & pictographs extended-A
            r"]+",
            flags=re.UNICODE,
        )

        install_emojis = emoji_pattern.findall(self.script_content)
        self.assertEqual(
            len(install_emojis),
            0,
            f"Found forbidden Unicode emojis in scripts/votex-install.sh: {install_emojis}",
        )

        with open(SUB_SERVICE_SCRIPT, "r", encoding="utf-8") as f:
            sub_service_content = f.read()

        sub_service_emojis = emoji_pattern.findall(sub_service_content)
        self.assertEqual(
            len(sub_service_emojis),
            0,
            f"Found forbidden Unicode emojis in scripts/sub-service.py: {sub_service_emojis}",
        )


if __name__ == "__main__":
    unittest.main()
