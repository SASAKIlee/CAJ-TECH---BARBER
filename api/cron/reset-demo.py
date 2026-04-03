import os
from http.server import BaseHTTPRequestHandler
from supabase import create_client, Client

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # 1. SEGURANÇA: Verifica o Token do Cronjob enviado pela Vercel
        auth_header = self.headers.get('Authorization')
        cron_secret = os.environ.get('CRON_SECRET')
        
        if not auth_header or auth_header != f"Bearer {cron_secret}":
            self.send_response(401)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error": "Acesso Negado"}')
            return

        # 2. CONFIGURAÇÃO: Pega as chaves das variáveis de ambiente
        # Dica: Na Vercel, configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
        url: str = os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
        key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        
        if not url or not key:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(b"Erro: Variaveis de ambiente ausentes.")
            return
            
        # 3. CONEXÃO E EXECUÇÃO
        try:
            supabase: Client = create_client(url, key)
            # Chama a função SQL 'reset_demo_account' que você criou no painel do Supabase
            supabase.rpc('reset_demo_account', {}).execute()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"success": "Cenario Ouro restaurado!"}')
            
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"Erro no banco: {str(e)}".encode())