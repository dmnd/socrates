#!/bin/bash

BASE_DIR=".."

PACKAGES="shared.css video.css socrates.css"
OUTPUT="editor/css/khan-site.css"

python ${BASE_DIR}/deploy/combine.py ${PACKAGES} \
    | sed 's|url(/*\(.*images.*\))|url(http://www.khanacademy.org/\1)|' \
    | sed 's|url(/*\(.*fonts.*\))|url(http://www.khanacademy.org/\1)|' \
    > ${OUTPUT}


PACKAGES="shared.js video.js"
OUTPUT="editor/js/khan-site.js"

python ${BASE_DIR}/deploy/combine.py --dev ${PACKAGES} > ${OUTPUT}
cat ${BASE_DIR}/javascript/test/globals.js >> ${OUTPUT}
