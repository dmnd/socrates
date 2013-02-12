#!/usr/bin/env python

import subprocess
import re

base_dir = ".."
cmd = "%s/deploy/combine.py" % base_dir

r = subprocess.check_output([cmd, "shared.css", "video.css", "socrates.css"])
r = re.sub(r'url\((\'?)/*(.*?images.*?)\)', 'url(\\1http://www.khanacademy.org/\\2)', r)
r = re.sub(r'url\((\'?)/*(.*?fonts.*?)\)', 'url(\\1http://www.khanacademy.org/\\2)', r)
with open("editor/css/khan-site.css", 'w') as f:
    f.write(r)

r = subprocess.check_output([cmd, "--dev", "shared.js", "video.js"])
with open("editor/js/khan-site.js", 'w') as f:
    f.write(r)
    with open("%s/javascript/test/globals.js" % base_dir) as f2:
        f.write(f2.read())
