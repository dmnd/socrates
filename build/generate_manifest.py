#!/usr/bin/env python
"""Quick script for generating package manifests based on contents of the
filesystem.
"""


import argparse
import json
import os
import os.path


def main(path):
    manifest = {}
    for pkg in os.listdir(path):
        ytid, ext = os.path.splitext(pkg)
        name = "socrates-%s.js" % ytid
        value = {
            "base_path": "../socrates/questions/%s" % ytid,
            "base_url": "/socrates/questions/%s" % ytid,
        }
        if ext == ".yaml":
            value["files"] = ["../%s.yaml" % ytid]
        else:
            value["files"] = os.listdir(os.path.join(path, ytid))

        manifest[name] = value

    print json.dumps(manifest, indent=4, sort_keys=True)

if __name__ == '__main__':
    main("questions")
