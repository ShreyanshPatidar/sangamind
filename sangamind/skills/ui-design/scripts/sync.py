#!/usr/bin/env python
"""Pull the latest VoltAgent/awesome-design-md, normalise it, and rebuild the catalog."""
import os, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.join(HERE, '..', 'library')

with tempfile.TemporaryDirectory() as tmp:
    subprocess.run(['git', 'clone', '-q', '--depth', '1', 'https://github.com/VoltAgent/awesome-design-md.git', tmp + '/up'], check=True)
    src = os.path.join(tmp, 'up', 'design-md')
    subprocess.run([sys.executable, os.path.join(HERE, 'normalize.py'), src], check=True)
    n = 0
    for slug in os.listdir(src):
        p = os.path.join(src, slug, 'DESIGN.md')
        if os.path.isfile(p):
            shutil.copy(p, os.path.join(LIB, slug + '.md'))
            n += 1
    print(f'Synced {n} systems')
subprocess.run([sys.executable, os.path.join(HERE, 'ds.py'), 'build'], check=True)
