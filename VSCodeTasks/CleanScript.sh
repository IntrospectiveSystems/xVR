#!/bin/bash
# Get the temp
cd Systems/$1

echo $1
pwd

if [ -d "temp" ] ; then
	rm -rf temp
	echo "temp cleared."
else
	echo "No such directory: temp."
fi

# Get the cache
if [ -d "cache" ] ; then
	rm -rf cache
	echo "cache cleared."
else
	echo "No such directory: cache."
fi

# Get the log
if [ -f "xgraph.log" ] ; then
	rm -f "xgraph.log"
	echo "xGraph log removed."
else
	echo "No xGraph log present."
fi

sleep 2