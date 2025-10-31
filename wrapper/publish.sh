#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR"

# Iterate through all subdirectories
for dir in */; do
    # Remove trailing slash
    dir_name="${dir%/}"

    if [ -f "$dir_name/package.json" ]; then
        echo "========================================="
        echo "Publishing $dir_name..."
        echo "========================================="

        cd "$dir_name"
        pnpm i --frozen-lockfile
        npm publish

        if [ $? -eq 0 ]; then
            echo "✓ Successfully published $dir_name"
        else
            echo "✗ Failed to publish $dir_name"
        fi

        cd ..
        echo ""
    else
        echo "⊘ Skipping $dir_name (no package.json found)"
    fi
done

echo "========================================="
echo "Publishing process completed!"
echo "========================================="
