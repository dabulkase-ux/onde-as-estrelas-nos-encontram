"""Iniciador do Meu Universo, somente com bibliotecas padrão do Python 3."""
import ctypes
from ctypes import wintypes
import os
from pathlib import Path
import queue
import re
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser

PROJECT = Path(__file__).resolve().parent
LOCAL_URL = "http://localhost:5173"
PUBLIC_URL = re.compile(r"https://[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com\b", re.I)
VITE_TIMEOUT = 60
TUNNEL_TIMEOUT = 120
PRINT_LOCK = threading.Lock()


def say(message):
    with PRINT_LOCK:
        print(message, flush=True)


def ensure_console():
    if os.name == "nt":
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        if not kernel.GetConsoleWindow():
            if not kernel.AllocConsole():
                raise OSError("Não foi possível abrir o console do Python.")
            sys.stdin = open("CONIN$", "r", encoding="utf-8")
            sys.stdout = open("CONOUT$", "w", encoding="utf-8", buffering=1)
            sys.stderr = open("CONOUT$", "w", encoding="utf-8", buffering=1)
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(errors="replace")


class ProcessTree:
    """Um Job Object privado encerra apenas nossos processos e descendentes."""
    def __init__(self):
        self.processes = []
        self.handle = None
        if os.name != "nt":
            return
        class BasicLimits(ctypes.Structure):
            _fields_ = [("PerProcessUserTimeLimit", ctypes.c_int64),
                        ("PerJobUserTimeLimit", ctypes.c_int64),
                        ("LimitFlags", wintypes.DWORD),
                        ("MinimumWorkingSetSize", ctypes.c_size_t),
                        ("MaximumWorkingSetSize", ctypes.c_size_t),
                        ("ActiveProcessLimit", wintypes.DWORD),
                        ("Affinity", ctypes.c_size_t),
                        ("PriorityClass", wintypes.DWORD),
                        ("SchedulingClass", wintypes.DWORD)]
        class IOCounts(ctypes.Structure):
            _fields_ = [(name, ctypes.c_uint64) for name in
                        ("ReadOperationCount", "WriteOperationCount", "OtherOperationCount",
                         "ReadTransferCount", "WriteTransferCount", "OtherTransferCount")]
        class ExtendedLimits(ctypes.Structure):
            _fields_ = [("BasicLimitInformation", BasicLimits), ("IoInfo", IOCounts),
                        ("ProcessMemoryLimit", ctypes.c_size_t), ("JobMemoryLimit", ctypes.c_size_t),
                        ("PeakProcessMemoryUsed", ctypes.c_size_t), ("PeakJobMemoryUsed", ctypes.c_size_t)]
        self.kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        self.kernel.CreateJobObjectW.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
        self.kernel.CreateJobObjectW.restype = wintypes.HANDLE
        self.kernel.SetInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD]
        self.kernel.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]
        self.kernel.CloseHandle.argtypes = [wintypes.HANDLE]
        self.handle = self.kernel.CreateJobObjectW(None, None)
        if not self.handle:
            raise ctypes.WinError(ctypes.get_last_error())
        limits = ExtendedLimits()
        limits.BasicLimitInformation.LimitFlags = 0x2000  # KILL_ON_JOB_CLOSE
        if not self.kernel.SetInformationJobObject(self.handle, 9, ctypes.byref(limits), ctypes.sizeof(limits)):
            self.close()
            raise OSError("Não foi possível configurar o encerramento seguro dos processos.")

    def start(self, args):
        command = args
        if os.name == "nt" and Path(args[0]).suffix.lower() in (".cmd", ".bat"):
            # cmd.exe executa npm.cmd; /d desabilita comandos AutoRun do usuário.
            command = '"{}" /d /s /c "{}"'.format(
                os.environ.get("COMSPEC", r"C:\Windows\System32\cmd.exe"),
                subprocess.list2cmdline(args))
        process = subprocess.Popen(command, cwd=PROJECT, stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                                   text=True, encoding="utf-8", errors="replace", bufsize=1,
                                   creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
                                   start_new_session=os.name != "nt")
        self.processes.append(process)
        if self.handle and not self.kernel.AssignProcessToJobObject(self.handle, wintypes.HANDLE(process._handle)):
            process.kill()
            process.wait()
            raise OSError("O Windows recusou o grupo seguro de processos. Nenhum serviço será mantido aberto.")
        return process

    def close(self):
        if self.handle:
            self.kernel.CloseHandle(self.handle)
            self.handle = None
        elif os.name != "nt":
            import signal
            for process in self.processes:
                try:
                    os.killpg(process.pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
        for process in self.processes:
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


def consume_output(process, label, links):
    try:
        for line in process.stdout:
            say(f"[{label}] {line.rstrip()}")
            match = PUBLIC_URL.search(line)
            if label == "Tunnel" and match:
                links.put(match.group(0))
    finally:
        process.stdout.close()


def check_running(process, label):
    code = process.poll()
    if code is not None:
        raise RuntimeError(f"{label} encerrou inesperadamente (código {code}). Confira os registros acima.")


def ensure_port_free():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        if os.name == "nt":
            probe.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        try:
            probe.bind(("0.0.0.0", 5173))
        except OSError as error:
            raise RuntimeError("A porta 5173 está ocupada ou indisponível. Encerre o servidor anterior e tente novamente.") from error


def wait_for_vite(process, timeout=VITE_TIMEOUT):
    deadline = time.monotonic() + timeout
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    while time.monotonic() < deadline:
        check_running(process, "Vite")
        try:
            with opener.open(LOCAL_URL, timeout=1) as response:
                if response.status == 200:
                    check_running(process, "Vite")
                    return
        except (OSError, urllib.error.URLError):
            pass
        time.sleep(0.2)
    raise RuntimeError(f"O Vite não ficou disponível em {LOCAL_URL} após {timeout} segundos.")


def wait_for_link(vite, tunnel, links, timeout=TUNNEL_TIMEOUT):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        check_running(vite, "Vite")
        check_running(tunnel, "Cloudflare Tunnel")
        try:
            return links.get(timeout=min(0.2, max(0.001, deadline - time.monotonic())))
        except queue.Empty:
            pass
    raise RuntimeError("O Cloudflare não gerou um link a tempo. Verifique a conexão e os registros acima.")


def main():
    ensure_console()
    tree = None
    readers = []
    failed = False
    try:
        say("========================================\n         MEU UNIVERSO\n       Iniciador automático\n========================================")
        npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
        node = shutil.which("node")
        cloudflared = shutil.which("cloudflared")
        missing = [name for name, path in (("Node.js", node), ("npm", npm), ("cloudflared", cloudflared)) if not path]
        if missing:
            raise RuntimeError("Não encontrado no PATH: " + ", ".join(missing) + ". Instale/configure manualmente e abra novamente.")
        if not (PROJECT / "node_modules" / "vite").is_dir():
            raise RuntimeError("As dependências do projeto não estão disponíveis. Execute npm install manualmente na pasta do projeto.")
        ensure_port_free()
        tree = ProcessTree()
        links = queue.Queue()

        def start(args, label):
            process = tree.start(args)
            reader = threading.Thread(target=consume_output, args=(process, label, links), daemon=True)
            readers.append(reader)
            reader.start()
            return process

        say("\n[1/3] Iniciando servidor Vite...")
        vite = start([npm, "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173", "--strictPort"], "Vite")
        wait_for_vite(vite)
        say("[OK] Servidor local disponível.\n\n[2/3] Iniciando Cloudflare Tunnel...")
        tunnel = start([cloudflared, "tunnel", "--url", LOCAL_URL], "Tunnel")
        url = wait_for_link(vite, tunnel, links)
        say(f"[OK] Link público gerado!\n\n{url}\n\nSelecione o link e use Ctrl+C para copiá-lo; sem seleção, Ctrl+C encerra os serviços.")
        say("\n[3/3] Abrindo navegador...")
        if webbrowser.open(url):
            say("[OK] Meu Universo iniciado!")
        else:
            say("Não foi possível abrir o navegador. Copie e abra o link acima manualmente.")
        say("Pressione Ctrl+C para encerrar tudo.")
        while True:
            check_running(vite, "Vite")
            check_running(tunnel, "Cloudflare Tunnel")
            time.sleep(0.2)
    except KeyboardInterrupt:
        say("\nEncerrando os serviços...")
    except Exception as error:
        failed = True
        say(f"\n[ERRO] {error}")
    finally:
        if tree:
            tree.close()
        for reader in readers:
            reader.join(timeout=2)
        say("Serviços encerrados.")
    if failed:
        try:
            input("Pressione Enter para fechar esta janela...")
        except (EOFError, KeyboardInterrupt):
            pass
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
