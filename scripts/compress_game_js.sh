#! /bin/bash

JS_PATH=/home/acs/acapp/game/static/js/
JS_PATH_DIST=${JS_PATH}dist/
JS_PATH_SRC=${JS_PATH}src/

# 将game.js内容作为标准输入到terser -c -m实现加密
find ${JS_PATH_SRC} -type f -name '*.js' | sort | xargs cat | terser -c -m > ${JS_PATH_DIST}game.js

echo yes | python3 manage.py collectstatic
