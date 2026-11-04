#!/usr/bin/env python3
"""
Unit and integration tests for Votex subscription microservice.
Tests both standard Base64 response and smart-routing JSON output.
"""

import base64
import json
import os
import sys
import threading
import time
import unittest
import urllib.request
import urllib.error

# Ensure scripts directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "scripts")))

import importlib
sub_service = importlib.import_module("sub-service")


class TestSubscriptionService(unittest.TestCase):
    def setUp(self):
        self.sample_config = {
            "server_ip": "198.51.100.42",
            "subscription_token": "test_secret_token_1234567890abcdef",
            "client_uuid": "e8a93ef0-5b74-4b53-90d2-5b91b8f17bc1",
            "reality_public_key": "x25519_pubkey_abcdef1234567890",
            "reality_short_id": "0123456789abcdef",
            "ss_password": "secret_ss_pass_2022",
            "hy_password": "secret_hy_pass_2026",
            "port": 28080,
        }

    def test_build_base64_subscription(self):
        """Verify that Base64 output contains 6 valid URIs (including Auto-Select)."""
        b64_output = sub_service.build_base64_subscription(self.sample_config)
        self.assertIsInstance(b64_output, str)

        decoded_bytes = base64.b64decode(b64_output.encode("utf-8"))
        decoded_text = decoded_bytes.decode("utf-8")
        links = [line.strip() for line in decoded_text.splitlines() if line.strip()]

        self.assertEqual(len(links), 6, f"Expected 6 links, got {len(links)}")

        # Check 1: Auto-select node (First node)
        auto_link = links[0]
        self.assertTrue(auto_link.startswith("vless://"))
        self.assertIn("198.51.100.42:20443", auto_link)
        self.assertIn("flow=xtls-rprx-vision", auto_link)
        self.assertIn("sni=addons.mozilla.org", auto_link)
        self.assertIn("e8a93ef0-5b74-4b53-90d2-5b91b8f17bc1", auto_link)
        self.assertIn("Votex-Auto-Select", auto_link)

        # Check 2: Vision link
        vision_link = links[1]
        self.assertTrue(vision_link.startswith("vless://"))
        self.assertIn("198.51.100.42:20443", vision_link)
        self.assertIn("flow=xtls-rprx-vision", vision_link)
        self.assertIn("sni=addons.mozilla.org", vision_link)
        self.assertIn("e8a93ef0-5b74-4b53-90d2-5b91b8f17bc1", vision_link)
        self.assertIn("Votex-Reality-Vision", vision_link)

        # Check 3: SplitHTTP link
        xhttp_link = links[2]
        self.assertTrue(xhttp_link.startswith("vless://"))
        self.assertIn("198.51.100.42:2053", xhttp_link)
        self.assertIn("type=xhttp", xhttp_link)
        self.assertIn("Votex-SplitHTTP-AntiDPI", xhttp_link)

        # Check 4: gRPC link
        grpc_link = links[3]
        self.assertTrue(grpc_link.startswith("vless://"))
        self.assertIn("198.51.100.42:8443", grpc_link)
        self.assertIn("type=grpc", grpc_link)
        self.assertIn("serviceName=yabl1ch-grpc", grpc_link)
        self.assertIn("Votex-Reality-gRPC", grpc_link)

        # Check 5: Hysteria 2 link (Port 443 UDP with insecure=1&allowInsecure=1)
        hy2_link = links[4]
        self.assertTrue(hy2_link.startswith("hysteria2://"))
        self.assertIn("198.51.100.42:443", hy2_link)
        self.assertIn("secret_hy_pass_2026", hy2_link)
        self.assertIn("insecure=1", hy2_link)
        self.assertIn("allowInsecure=1", hy2_link)
        self.assertIn("Votex-Hysteria2-Gaming", hy2_link)

        # Check Hysteria 2 link with pinSHA256
        cfg_with_pin = dict(self.sample_config, hy_cert_sha256="abcd1234ef567890")
        b64_with_pin = sub_service.build_base64_subscription(cfg_with_pin)
        links_with_pin = base64.b64decode(b64_with_pin.encode("utf-8")).decode("utf-8").splitlines()
        self.assertIn("pinSHA256=abcd1234ef567890", links_with_pin[4])

        # Check 6: Shadowsocks-2022 link
        ss_link = links[5]
        self.assertTrue(ss_link.startswith("ss://"))
        self.assertIn("198.51.100.42:2088", ss_link)
        self.assertIn("Votex-Shadowsocks-2022", ss_link)

    def test_dynamic_reality_sni_in_subscription(self):
        """Verify dynamic SNI is populated in base64 links and JSON profile."""
        custom_cfg = dict(self.sample_config, reality_sni="www.microsoft.com")
        b64 = sub_service.build_base64_subscription(custom_cfg)
        decoded = base64.b64decode(b64.encode("utf-8")).decode("utf-8")
        self.assertIn("sni=www.microsoft.com", decoded)

        profile = sub_service.build_json_profile(custom_cfg)
        outbound_map = {ob["tag"]: ob for ob in profile["outbounds"]}
        self.assertEqual(
            outbound_map["vision"]["streamSettings"]["realitySettings"]["serverName"],
            "www.microsoft.com",
        )
        self.assertEqual(
            outbound_map["hy2"]["streamSettings"]["tlsSettings"]["serverName"],
            "www.microsoft.com",
        )

    def test_build_json_profile(self):
        """Verify full JSON profile conforms to Xray and sing-box specifications."""
        profile = sub_service.build_json_profile(self.sample_config)

        # 1. Burst Observatory
        self.assertIn("burstObservatory", profile)
        obs = profile["burstObservatory"]
        self.assertEqual(obs["pingConfig"]["destination"], "http://cp.cloudflare.com/generate_204")
        self.assertListEqual(obs["subjectSelector"], ["vision", "xhttp", "grpc", "hy2", "ss2022"])

        # 2. DNS
        self.assertIn("dns", profile)
        dns = profile["dns"]
        self.assertIn("dns.apple.com", dns["hosts"])
        self.assertIn("mask.icloud.com", dns["hosts"])
        # Check Russian DNS
        ru_dns = next(s for s in dns["servers"] if isinstance(s, dict) and s.get("address") == "77.88.8.8")
        self.assertIn("geosite:category-ru", ru_dns["domains"])
        self.assertIn("domain:sberbank.ru", ru_dns["domains"])
        self.assertIn("domain:tbank.ru", ru_dns["domains"])
        self.assertIn("domain:gosuslugi.ru", ru_dns["domains"])
        self.assertIn("domain:ozon.ru", ru_dns["domains"])

        # 3. Inbounds
        inbounds = profile["inbounds"]
        tags = [ib["tag"] for ib in inbounds]
        self.assertIn("socks", tags)
        self.assertIn("http", tags)

        # 4. Outbounds
        outbounds = profile["outbounds"]
        outbound_map = {ob["tag"]: ob for ob in outbounds}

        self.assertIn("vision", outbound_map)
        self.assertIn("xhttp", outbound_map)
        self.assertIn("grpc", outbound_map)
        self.assertIn("hy2", outbound_map)
        self.assertEqual(outbound_map["hy2"]["settings"]["port"], 443)
        self.assertTrue(outbound_map["hy2"]["streamSettings"]["tlsSettings"]["insecure"])
        self.assertTrue(outbound_map["hy2"]["streamSettings"]["tlsSettings"]["allowInsecure"])
        self.assertIn("ss2022", outbound_map)
        self.assertIn("Auto-Select", outbound_map)
        auto_ob = outbound_map["Auto-Select"]
        self.assertEqual(auto_ob["type"], "urltest")
        self.assertEqual(auto_ob["url"], "http://cp.cloudflare.com/generate_204")
        self.assertListEqual(auto_ob["outbounds"], ["vision", "xhttp", "grpc", "hy2", "ss2022"])
        self.assertIn("fragment-out", outbound_map)
        self.assertIn("direct", outbound_map)
        self.assertIn("block", outbound_map)

        # Verify TLS fragmentation outbound
        frag_ob = outbound_map["fragment-out"]
        self.assertEqual(frag_ob["protocol"], "freedom")
        self.assertEqual(frag_ob["settings"]["fragment"]["packets"], "1-3")
        self.assertEqual(frag_ob["settings"]["fragment"]["length"], "100-200")
        self.assertEqual(frag_ob["settings"]["fragment"]["interval"], "10-20")

        # Verify that vision, xhttp, grpc route through dialerProxy: fragment-out
        for tag in ["vision", "xhttp", "grpc"]:
            ob = outbound_map[tag]
            self.assertEqual(ob["streamSettings"]["sockopt"]["dialerProxy"], "fragment-out")

        # 5. Routing
        routing = profile["routing"]
        self.assertIn("balancers", routing)
        balancer = routing["balancers"][0]
        self.assertEqual(balancer["tag"], "VotexBalancer")
        self.assertListEqual(balancer["selector"], ["vision", "xhttp", "grpc", "hy2", "ss2022"])
        self.assertEqual(balancer["strategy"]["type"], "leastPing")

        rules = routing["rules"]
        # Check rules presence
        block_rules = [r for r in rules if r.get("outboundTag") == "block"]
        self.assertTrue(any("bittorrent" in r.get("protocol", []) for r in block_rules))

        direct_rules = [r for r in rules if r.get("outboundTag") == "direct"]
        self.assertTrue(any("geoip:ru" in r.get("ip", []) for r in direct_rules))
        self.assertTrue(any(self.sample_config["server_ip"] in r.get("ip", []) for r in direct_rules))
        self.assertTrue(any("geosite:category-ru" in r.get("domain", []) for r in direct_rules))

        proxy_rule = next(r for r in rules if r.get("balancerTag") == "VotexBalancer")
        self.assertEqual(proxy_rule["network"], "tcp,udp")


class TestSubscriptionHttpServer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.port = 28081
        cls.token = "test_run_token_9876543210abcdef"
        cls.config = {
            "server_ip": "203.0.113.195",
            "subscription_token": cls.token,
            "client_uuid": "11111111-2222-3333-4444-555555555555",
            "reality_public_key": "pubkey_test",
            "reality_short_id": "deadbeefcafebabe",
            "ss_password": "test_ss_password",
            "hy_password": "test_hy_password",
            "port": cls.port,
        }
        sub_service.VotexSubHandler.server_config = cls.config

        # Run HTTP server in background thread
        sub_service.socketserver.TCPServer.allow_reuse_address = True
        cls.httpd = sub_service.socketserver.TCPServer(("127.0.0.1", cls.port), sub_service.VotexSubHandler)
        cls.server_thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.server_thread.start()
        time.sleep(0.1)

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def test_404_on_invalid_path(self):
        url = f"http://127.0.0.1:{self.port}/invalid/path"
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(url)
        self.assertEqual(ctx.exception.code, 404)

    def test_404_on_wrong_token(self):
        url = f"http://127.0.0.1:{self.port}/sub/wrong_token"
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(url)
        self.assertEqual(ctx.exception.code, 404)

    def test_200_base64_response(self):
        url = f"http://127.0.0.1:{self.port}/sub/{self.token}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            self.assertEqual(resp.headers.get("Profile-Title"), "Votex")
            self.assertEqual(resp.headers.get("Profile-Update-Interval"), "24")
            self.assertEqual(resp.headers.get("Profile-Test-Url"), "http://cp.cloudflare.com/generate_204")
            self.assertEqual(resp.headers.get("Profile-Web-Page-Url"), "https://github.com/Yabl1ch/Votex")
            self.assertIn("upload=0;", resp.headers.get("Subscription-Userinfo"))
            body = resp.read().decode("utf-8")
            decoded = base64.b64decode(body.encode("utf-8")).decode("utf-8")
            self.assertIn("vless://", decoded)
            self.assertIn("hysteria2://", decoded)
            self.assertIn("ss://", decoded)

    def test_200_json_format_via_query_param(self):
        url = f"http://127.0.0.1:{self.port}/sub/{self.token}?format=json"
        with urllib.request.urlopen(url) as resp:
            self.assertEqual(resp.status, 200)
            self.assertEqual(resp.headers.get("Content-Type"), "application/json; charset=utf-8")
            self.assertEqual(resp.headers.get("Profile-Title"), "Votex")
            data = json.loads(resp.read().decode("utf-8"))
            self.assertEqual(data["remarks"], "Votex")
            self.assertIn("burstObservatory", data)
            self.assertIn("outbounds", data)
            self.assertIn("routing", data)

    def test_200_happ_user_agent_gets_base64_with_5_protocols(self):
        """Verify Happ client receives all 6 nodes (Auto-Select + 5 protocols) via Base64."""
        url = f"http://127.0.0.1:{self.port}/sub/{self.token}"
        req = urllib.request.Request(url, headers={"User-Agent": "Happ/2.4.0 (Windows NT 10.0)"})
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            self.assertEqual(resp.headers.get("Profile-Title"), "Votex")
            body = resp.read().decode("utf-8")
            decoded = base64.b64decode(body.encode("utf-8")).decode("utf-8")
            lines = [l.strip() for l in decoded.splitlines() if l.strip()]
            self.assertEqual(len(lines), 6, f"Expected 6 protocol configs for Happ, got {len(lines)}")
            self.assertIn("#Votex-Auto-Select", lines[0])
            self.assertIn("#Votex-Reality-Vision", lines[1])
            self.assertIn("#Votex-SplitHTTP-AntiDPI", lines[2])
            self.assertIn("#Votex-Reality-gRPC", lines[3])
            self.assertIn("#Votex-Hysteria2-Gaming", lines[4])
            self.assertIn("#Votex-Shadowsocks-2022", lines[5])

    def test_204_generate_204_endpoint(self):
        url = f"http://127.0.0.1:{self.port}/generate_204"
        with urllib.request.urlopen(url) as resp:
            self.assertEqual(resp.status, 204)

    def test_200_system_stats_endpoint(self):
        url = f"http://127.0.0.1:{self.port}/stats/{self.token}"
        with urllib.request.urlopen(url) as resp:
            self.assertEqual(resp.status, 200)
            self.assertEqual(resp.headers.get("Content-Type"), "application/json; charset=utf-8")
            data = json.loads(resp.read().decode("utf-8"))
            self.assertEqual(data["status"], "online")
            self.assertIn("uptime_seconds", data)
            self.assertIn("uptime_str", data)
            self.assertIn("cpu_percent", data)
            self.assertIn("ram_used_mb", data)
            self.assertIn("ram_total_mb", data)


if __name__ == "__main__":
    unittest.main()
