import re
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class AppMetadataTest(unittest.TestCase):
    def test_app_metadata_allows_alice_nextcloud_34(self):
        tree = ET.parse(ROOT / "appinfo" / "info.xml")
        dependency = tree.find("./dependencies/nextcloud")
        if dependency is None:
            self.fail("Missing Nextcloud dependency in appinfo/info.xml")
        self.assertLessEqual(int(dependency.attrib["min-version"]), 34)
        self.assertGreaterEqual(int(dependency.attrib["max-version"]), 34)

    def test_readme_documents_nextcloud_34_sandbox_install(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("Nextcloud 34", readme)
        self.assertIn("/var/www/html/custom_apps/foldericon", readme)
        self.assertIn("docker compose exec -T --user www-data app php occ app:enable foldericon", readme)

    def test_files_ui_assets_are_registered(self):
        listener = (ROOT / "lib" / "Listeners" / "FilesLoadAdditionalScriptsListener.php").read_text(encoding="utf-8")
        self.assertIn("Util::addScript(Application::APP_ID, 'foldericon-main-v2')", listener)
        self.assertIn("Util::addStyle(Application::APP_ID, 'foldericon-main-v2')", listener)

    def test_folder_icon_filenames_include_common_cover_images(self):
        js = (ROOT / "js" / "foldericon-main-v2.js").read_text(encoding="utf-8")
        names = set(re.findall(r"'([^']+)'", js[js.index("const ICON_FILE_NAMES"):js.index("];", js.index("const ICON_FILE_NAMES"))]))
        self.assertIn("foldericon.jpg", names)
        self.assertIn("foldericon.png", names)
        self.assertIn("foldericon.webp", names)


if __name__ == "__main__":
    unittest.main()
