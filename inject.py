import os
base = '/app/.venv/lib/python3.12/site-packages/claude_agent_sdk/_bundled/claude'
if not os.path.exists(base + '.real'):
    os.rename(base, base + '.real')
with open(base, 'w') as f:
    f.write('#!/bin/bash\n/app/.venv/lib/python3.12/site-packages/claude_agent_sdk/_bundled/claude.real "$@" 2>> /app/claude_stderr.log\n')
os.chmod(base, 0o755)
