#!/usr/bin/env python3
"""
Ultra-simple health check for the ML environment.
This should complete in under 5 seconds.
"""

import json
import sys

def main():
    try:
        # Just test that Python is working and basic imports
        import os
        
        result = {
            "status": "success",
            "python_version": sys.version,
            "working_directory": os.getcwd(),
            "message": "Python environment is working"
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            "status": "error",
            "error": str(e),
            "message": "Health check failed"
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main() 