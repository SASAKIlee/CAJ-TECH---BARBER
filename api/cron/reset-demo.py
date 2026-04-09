import os
import json
from http.server import BaseHTTPRequestHandler
from supabase import create_client, Client

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # 1. SEGURANÇA: Verifica o Token do Cronjob
        auth_header = self.headers.get('Authorization')
        cron_secret = os.environ.get('CRON_SECRET')
        
        if not auth_header or auth_header != f"Bearer {cron_secret}":
            self.send_response(401)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Acesso Negado"}).encode('utf-8'))
            return

        # 2. CONFIGURAÇÃO: Pegando as chaves
        url: str = os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
        key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        
        if not url or not key:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Erro: Variáveis de ambiente ausentes"}).encode('utf-8'))
            return
            
        # 3. MAPEAMENTO DAS VITRINES
        vitrines = [
            {"id": "6c00738f-3822-4c78-a220-4d2683ee0175", "tipo": "dono"},     # teste@caj.com
            {"id": "7370b13e-5295-4d5f-9a14-2bad066dc713", "tipo": "barbeiro"}  # teste2@caj.com
        ]

        # 4. CONEXÃO E EXECUÇÃO
        try:
            supabase: Client = create_client(url, key)
            
            for v in vitrines:
                supabase.rpc('reset_demo_account', {
                    'target_user_id': v['id'],
                    'scenario_type': v['tipo']
                }).execute()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": "Vitrines Dono e Barbeiro restauradas com sucesso!"}).encode('utf-8'))
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"Erro no banco de dados: {str(e)}"}).encode('utf-8'))