#!/usr/bin/env python3
"""
Automated compliance and integrity tests for Phase 3:
organic-glass-bento-ui design system, components, and pages.
"""

import os
import re
import unittest

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DIR = os.path.join(REPO_ROOT, "src")
INDEX_CSS = os.path.join(SRC_DIR, "index.css")


class TestFrontendDesignSystem(unittest.TestCase):
    def setUp(self):
        self.assertTrue(os.path.exists(SRC_DIR), "src directory must exist")
        self.assertTrue(os.path.exists(INDEX_CSS), "src/index.css must exist")

    def test_organic_glass_tokens(self):
        """Verify presence of core organic-glass-bento-ui design tokens in CSS."""
        with open(INDEX_CSS, "r", encoding="utf-8") as f:
            css_content = f.read()

        required_tokens = [
            "--votex-bg-obsidian: #06100C",
            "--votex-surface-glass",
            "--votex-accent-mint: #4ADE80",
            "--votex-accent-emerald: #22C55E",
            "--votex-accent-sage: #86EFAC",
            "backdrop-filter: blur(24px)",
            "radial-gradient",
            "inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)",
        ]

        for token in required_tokens:
            self.assertIn(token, css_content, f"Missing required design token in CSS: {token}")

    def test_no_emojis_in_frontend_code(self):
        """HARD RULE: Complete prohibition of Unicode emojis in src/**/*.{ts,tsx,css}."""
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

        for root, _, files in os.walk(SRC_DIR):
            for file in files:
                if file.endswith((".ts", ".tsx", ".css")):
                    file_path = os.path.join(root, file)
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    matches = emoji_pattern.findall(content)
                    self.assertEqual(
                        len(matches),
                        0,
                        f"Found forbidden Unicode emojis in {file_path}: {matches}",
                    )

    def test_all_six_pages_exist(self):
        """Ensure all 6 application tab pages exist."""
        expected_pages = [
            "DashboardPage.tsx",
            "ProvisioningPage.tsx",
            "ReportsPage.tsx",
            "SubscriptionPage.tsx",
            "SecurityPage.tsx",
            "SettingsPage.tsx",
        ]
        pages_dir = os.path.join(SRC_DIR, "pages")
        self.assertTrue(os.path.exists(pages_dir), "src/pages directory must exist")

        for page in expected_pages:
            path = os.path.join(pages_dir, page)
            self.assertTrue(os.path.exists(path), f"Page {page} must exist")

    def test_five_navigation_tabs_in_ui(self):
        """Verify exactly 5 user tabs are in Sidebar and security tab is removed from UI."""
        sidebar_path = os.path.join(SRC_DIR, "components", "navigation", "Sidebar.tsx")
        with open(sidebar_path, "r", encoding="utf-8") as f:
            sidebar_content = f.read()

        # Check that 5 tabs are defined
        self.assertIn('id: "dashboard"', sidebar_content)
        self.assertIn('id: "provisioning"', sidebar_content)
        self.assertIn('id: "reports"', sidebar_content)
        self.assertIn('id: "subscription"', sidebar_content)
        self.assertIn('id: "settings"', sidebar_content)

        # Check that security is removed from navItems
        self.assertNotIn('id: "security"', sidebar_content)

        app_path = os.path.join(SRC_DIR, "App.tsx")
        with open(app_path, "r", encoding="utf-8") as f:
            app_content = f.read()
        self.assertNotIn('security: "Безопасность и UFW"', app_content)
        self.assertNotIn('activeTab === "security"', app_content)

    def test_bento_components_exist(self):
        """Ensure core bento components are present and exported."""
        bento_dir = os.path.join(SRC_DIR, "components", "bento")
        self.assertTrue(os.path.exists(bento_dir), "src/components/bento directory must exist")

        expected_components = [
            "BentoGrid.tsx",
            "BentoCard.tsx",
            "GlassButton.tsx",
            "GlassInput.tsx",
            "GlassBadge.tsx",
            "SpeedGauge.tsx",
            "LatencyBar.tsx",
        ]

        for comp in expected_components:
            path = os.path.join(bento_dir, comp)
            self.assertTrue(os.path.exists(path), f"Component {comp} must exist")

    def test_anti_text_wrap_on_buttons(self):
        """Verify that GlassButton enforces whitespace-nowrap against text wrapping."""
        glass_button_path = os.path.join(SRC_DIR, "components", "bento", "GlassButton.tsx")
        with open(glass_button_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("whitespace-nowrap", content, "GlassButton must enforce whitespace-nowrap")


if __name__ == "__main__":
    unittest.main()
