"""Gera segredo local de senha sem exibir a senha ou o hash no console."""
import getpass
import hashlib
from pathlib import Path
import secrets

def main():
    target = Path(__file__).resolve().parent.parent / "supabase" / "admin-secrets.local"
    password = getpass.getpass("Senha administrativa (prefira uma frase longa): ")
    if not password or len(password) > 256:
        raise SystemExit("A senha deve ter entre 1 e 256 caracteres.")
    if password != getpass.getpass("Confirme a senha: "):
        raise SystemExit("As senhas não coincidem.")
    if len(password) < 12:
        print("Aviso: uma senha curta é vulnerável a adivinhação. Prefira 12 caracteres ou mais.")
    salt = secrets.token_bytes(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 600000).hex()
    # O arquivo contém apenas hash/salt; não modifica outros arquivos de configuração.
    target.write_text(f"ADMIN_PASSWORD_HASH=pbkdf2-sha256$600000${salt.hex()}${hashed}\n", encoding="utf-8")
    print("Hash gravado no arquivo local ignorado pelo Git: supabase/admin-secrets.local")
    print("Configure ALLOWED_ORIGINS separadamente. Não publique este arquivo.")

if __name__ == "__main__":
    main()
