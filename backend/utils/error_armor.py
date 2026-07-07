import time
from functools import wraps

class NeedRetryImmediately(Exception):
    pass

class PoolDepletedException(Exception):
    pass

def retry_with_exponential_backoff(max_retries=3, initial_delay=2, backoff_factor=2):
    """
    A decorator to wrap API calls. 
    Intelligently handles 429 errors by rotating API keys if possible.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            delay = initial_delay
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except NeedRetryImmediately as e:
                    # Key was rotated, retry immediately without sleeping
                    print(f"DEBUG: Key rotated. Retrying immediately...")
                    continue
                except PoolDepletedException as e:
                    # Pool is depleted. We must sleep to let cooldowns expire.
                    if attempt == max_retries:
                        return f"⚠️ **Traffic Jam:** Google's servers are too busy right now. Pool depleted after {max_retries} retries. Please try again."
                    print(f"DEBUG: Attempt {attempt + 1} failed. Pool Depleted. Retrying in {delay} seconds...")
                    time.sleep(delay)
                    delay *= backoff_factor
                except Exception as e:
                    if attempt == max_retries:
                        print(f"DEBUG: Final attempt failed with error: {str(e)}")
                        return f"⚠️ **Traffic Jam:** Google's servers are too busy right now after {max_retries} retries. Please try again in a moment. \n\n*(Debug Error: {str(e)})*"
                    
                    print(f"DEBUG: Attempt {attempt + 1} failed with error: {str(e)}")
                    time.sleep(delay)
                    delay *= backoff_factor
            return f"⚠️ **Traffic Jam:** Unknown error"
        return wrapper
    return decorator
