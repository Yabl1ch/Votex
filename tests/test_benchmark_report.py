#!/usr/bin/env python3
"""
Validation tests for Votex benchmark report structure and schema.
"""

import json
import unittest


class TestBenchmarkReportSchema(unittest.TestCase):
    def test_report_schema_validity(self):
        sample_report = {
            "status": "success",
            "server_ip": "198.51.100.42",
            "subscription_url": "http://198.51.100.42:18080/sub/test_token_12345",
            "subscription_token": "test_token_12345",
            "uuid": "e8a93ef0-5b74-4b53-90d2-5b91b8f17bc1",
            "reality_public_key": "x25519_pubkey_abcdef1234567890",
            "short_id": "0123456789abcdef",
            "benchmark": {
                "latency_ms": 32,
                "speed_mbps": 480,
                "protocols": {
                    "vision": {"port": 20443, "latency_ms": 32, "status": "active"},
                    "xhttp": {"port": 2053, "latency_ms": 46, "status": "active"},
                    "grpc": {"port": 8443, "latency_ms": 38, "status": "active"},
                    "hysteria2": {"port": 443, "latency_ms": 28, "status": "active"},
                    "shadowsocks": {"port": 2088, "latency_ms": 34, "status": "active"},
                },
            },
            "hardening": {
                "tcp_bbr": True,
                "fail2ban": True,
                "ufw": True,
                "allowed_ports": [22, 20443, 2053, 8443, 443, 2083, 2088, 18080],
            },
        }

        # Validate required fields
        required_keys = [
            "status",
            "server_ip",
            "subscription_url",
            "subscription_token",
            "uuid",
            "reality_public_key",
            "short_id",
            "benchmark",
            "hardening",
        ]
        for key in required_keys:
            self.assertIn(key, sample_report)

        # Validate benchmark structure
        bench = sample_report["benchmark"]
        self.assertGreater(bench["latency_ms"], 0)
        self.assertGreater(bench["speed_mbps"], 0)
        self.assertEqual(len(bench["protocols"]), 5)
        for proto in ["vision", "xhttp", "grpc", "hysteria2", "shadowsocks"]:
            self.assertIn(proto, bench["protocols"])
            self.assertGreater(bench["protocols"][proto]["port"], 0)
            self.assertEqual(bench["protocols"][proto]["status"], "active")

        # Validate hardening structure
        hard = sample_report["hardening"]
        self.assertTrue(hard["tcp_bbr"])
        self.assertTrue(hard["fail2ban"])
        self.assertTrue(hard["ufw"])
        expected_ports = {22, 20443, 2053, 8443, 443, 2083, 2088, 18080}
        self.assertEqual(set(hard["allowed_ports"]), expected_ports)


if __name__ == "__main__":
    unittest.main()
