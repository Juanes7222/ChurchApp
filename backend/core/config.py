from dotenv import load_dotenv
from pathlib import Path
from supabase import create_client, Client
from fastapi.security import HTTPBearer
import os
load_dotenv()

class Config:
      SECRET_KEY: str = "super-secret-key-change-in-production"
      ROOT_DIR = Path(__file__).parent
      load_dotenv(ROOT_DIR / '.env')

      # Supabase config
      supabase_url = os.environ.get('SUPABASE_URL', 'https://example.supabase.co')
      supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', 'dummy-key')
      supabase_anon_key = os.environ.get('SUPABASE_ANON_KEY', 'dummy-anon-key')
      supabase: Client = create_client(supabase_url, supabase_key)

      # Google OAuth
      GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', 'dummy-client-id')

      # JWT config
      JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'super-secret-key-change-in-production')
      JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
      JWT_EXPIRE_MINUTES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', '1440'))

      log_level = os.environ.get('LOG_LEVEL', 'INFO')
      security = HTTPBearer()
      FIREBASE_CREDENTIALS_PATH = os.environ.get('FIREBASE_CREDENTIALS_PATH')
      
      if FIREBASE_CREDENTIALS_PATH is None:
          raise ValueError("FIREBASE_CREDENTIALS_PATH environment variable is not set.")
      
      

config = Config()