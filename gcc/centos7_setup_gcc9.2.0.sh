#!/bin/bash

# update gcc symlink
unlink /lib64/libstdc++.so.6
ln -s ./lib/libstdc++.so.6.0.27 /lib64/libstdc++.so.6