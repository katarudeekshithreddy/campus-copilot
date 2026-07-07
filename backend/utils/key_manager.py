import os
import time
import threading

class KeyPoolManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(KeyPoolManager, cls).__new__(cls)
                cls._instance._initialize()
            return cls._instance

    def _initialize(self):
        keys_str = os.environ.get("GEMINI_API_KEYS", "")
        if not keys_str:
            single_key = os.environ.get("GEMINI_API_KEY", "")
            self.keys = [single_key] if single_key else []
        else:
            self.keys = [k.strip() for k in keys_str.split(",") if k.strip()]
        
        self.cooldowns = {}
        self.current_index = 0
        self._pool_lock = threading.Lock()
        self.cooldown_seconds = 60

    def get_active_key(self) -> str:
        if not self.keys:
            return None
            
        with self._pool_lock:
            start_index = self.current_index
            while True:
                key = self.keys[self.current_index]
                self.current_index = (self.current_index + 1) % len(self.keys)
                
                # Check if this key is healthy
                if key not in self.cooldowns or time.time() > self.cooldowns[key]:
                    if key in self.cooldowns:
                        del self.cooldowns[key]
                    return key
                
                # Pool depleted if we loop back to start
                if self.current_index == start_index:
                    return None

    def mark_key_exhausted(self, key: str):
        if not key:
            return
        with self._pool_lock:
            if key not in self.cooldowns or time.time() > self.cooldowns[key]:
                self.cooldowns[key] = time.time() + self.cooldown_seconds
                safe_key = key[-4:] if len(key) > 4 else "UNKNOWN"
                print(f"⚠️ [KeyPoolManager] Key ending in {safe_key} hit 429. Put on {self.cooldown_seconds}s cooldown.")

key_manager = KeyPoolManager()
