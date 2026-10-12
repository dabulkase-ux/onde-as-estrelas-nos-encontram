"""Executar da raiz: python -m unittest discover -s tests -p test_iniciar.py -v."""
import io
import queue
import subprocess
import sys
import unittest
from unittest.mock import MagicMock, Mock, patch

import iniciar


class LauncherTests(unittest.TestCase):
    def test_public_url(self):
        line = "2026 INF | https://quiet-blue-sky.trycloudflare.com |"
        self.assertEqual(iniciar.PUBLIC_URL.search(line).group(), "https://quiet-blue-sky.trycloudflare.com")
        self.assertIsNone(iniciar.PUBLIC_URL.search("https://example.com"))

    def test_merged_logs_and_link(self):
        links = queue.Queue()
        process = Mock(stdout=io.StringIO("stderr: https://real-test.trycloudflare.com\n"))
        with patch.object(iniciar, "say"):
            iniciar.consume_output(process, "Tunnel", links)
        self.assertEqual(links.get_nowait(), "https://real-test.trycloudflare.com")
        self.assertTrue(process.stdout.closed)

    def test_vite_http_ready(self):
        process = Mock()
        process.poll.return_value = None
        opener = MagicMock()
        opener.open.return_value.__enter__.return_value.status = 200
        with patch.object(iniciar.urllib.request, "build_opener", return_value=opener):
            iniciar.wait_for_vite(process)
        opener.open.assert_called_once_with(iniciar.LOCAL_URL, timeout=1)

    def test_timeouts(self):
        process = Mock()
        process.poll.return_value = None
        with self.assertRaisesRegex(RuntimeError, "não ficou disponível"):
            iniciar.wait_for_vite(process, timeout=0)
        with self.assertRaisesRegex(RuntimeError, "não gerou um link"):
            iniciar.wait_for_link(process, process, queue.Queue(), timeout=0)

    def test_unexpected_exit(self):
        process = Mock()
        process.poll.return_value = 7
        with self.assertRaisesRegex(RuntimeError, "código 7"):
            iniciar.check_running(process, "Vite")

    def test_ready_link(self):
        process = Mock()
        process.poll.return_value = None
        links = queue.Queue()
        links.put("https://test.trycloudflare.com")
        self.assertEqual(iniciar.wait_for_link(process, process, links), "https://test.trycloudflare.com")

    def test_missing_dependency_keeps_error_visible(self):
        with patch.object(iniciar, "ensure_console"), patch.object(iniciar.shutil, "which", return_value=None), \
                patch.object(iniciar, "say") as output, patch("builtins.input") as pause:
            self.assertEqual(iniciar.main(), 1)
        pause.assert_called_once()
        self.assertTrue(any("Não encontrado no PATH" in str(call) for call in output.call_args_list))

    def test_port_occupied(self):
        with iniciar.socket.socket() as occupied:
            occupied.bind(("0.0.0.0", 5173))
            occupied.listen()
            with self.assertRaisesRegex(RuntimeError, "porta 5173"):
                iniciar.ensure_port_free()

    def test_actual_process_cleanup(self):
        tree = iniciar.ProcessTree()
        process = tree.start([sys.executable, "-u", "-c", "import time; print('ready'); time.sleep(60)"])
        try:
            self.assertEqual(process.stdout.readline().strip(), "ready")
        finally:
            tree.close()
            process.stdout.close()
        self.assertIsNotNone(process.poll())

    @unittest.skipUnless(sys.platform == "win32", "Job Object do Windows")
    def test_descendant_cleanup(self):
        import ctypes
        from ctypes import wintypes
        tree = iniciar.ProcessTree()
        code = "import subprocess,sys,time; child=subprocess.Popen([sys.executable,'-c','import time; time.sleep(60)']); print(child.pid,flush=True); time.sleep(60)"
        process = tree.start([sys.executable, "-u", "-c", code])
        handle = None
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
        kernel.OpenProcess.restype = wintypes.HANDLE
        kernel.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
        kernel.CloseHandle.argtypes = [wintypes.HANDLE]
        try:
            pid = int(process.stdout.readline().strip())
            handle = kernel.OpenProcess(0x100000, False, pid)
            self.assertTrue(handle)
            tree.close()
            self.assertEqual(kernel.WaitForSingleObject(handle, 5000), 0)
        finally:
            tree.close()
            process.stdout.close()
            if handle:
                kernel.CloseHandle(handle)


if __name__ == "__main__":
    unittest.main()
