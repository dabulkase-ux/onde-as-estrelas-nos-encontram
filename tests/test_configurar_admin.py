import contextlib
import hashlib
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

source = Path(__file__).resolve().parent.parent / "scripts" / "configurar_admin.py"
spec = importlib.util.spec_from_file_location("configurar_admin", source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PasswordSetupTests(unittest.TestCase):
    def test_hash_without_console_secret(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "supabase").mkdir()
            secret = "Only-for-this-isolated-test"
            output = io.StringIO()
            with patch.object(module, "__file__", str(root / "scripts" / "configurar_admin.py")), \
                    patch.object(module.getpass, "getpass", side_effect=[secret, secret]), contextlib.redirect_stdout(output):
                module.main()
            encoded = (root / "supabase" / "admin-secrets.local").read_text().strip().split("=", 1)[1]
            scheme, rounds, salt, digest = encoded.split("$")
            self.assertEqual(scheme, "pbkdf2-sha256")
            self.assertEqual(int(rounds), 600000)
            self.assertEqual(hashlib.pbkdf2_hmac("sha256", secret.encode(), bytes.fromhex(salt), int(rounds)).hex(), digest)
            self.assertNotIn(secret, output.getvalue())
            self.assertNotIn(encoded, output.getvalue())
            self.assertNotIn(secret, encoded)

    def test_confirmation_must_match(self):
        with patch.object(module.getpass, "getpass", side_effect=["test-only-one", "test-only-two"]):
            with self.assertRaisesRegex(SystemExit, "não coincidem"):
                module.main()

    def test_empty_password_rejected(self):
        with patch.object(module.getpass, "getpass", return_value=""):
            with self.assertRaisesRegex(SystemExit, "entre 1 e 256"):
                module.main()


if __name__ == "__main__":
    unittest.main()
