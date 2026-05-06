#!/usr/bin/env sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/.." && pwd)

vision_dir="$repo_root/src-native/bedmapper-vision"
resource_dir="$repo_root/src-tauri/resources/vision"
exe_name="bedmapper-vision"
platform=$(uname -s 2>/dev/null || echo unknown)

case "$platform" in
  MINGW*|MSYS*|CYGWIN*|Windows_NT)
    exe_name="bedmapper-vision.exe"
    ;;
esac

sidecar_source=""
for candidate in \
  "$vision_dir/build/$exe_name" \
  "$vision_dir/build/Release/$exe_name" \
  "$vision_dir/build/Debug/$exe_name"
do
  if [ -f "$candidate" ]; then
    sidecar_source="$candidate"
    break
  fi
done

if [ -z "$sidecar_source" ]; then
  echo "error: bedmapper vision sidecar was not found." >&2
  echo "expected one of:" >&2
  echo "  $vision_dir/build/$exe_name" >&2
  echo "  $vision_dir/build/Release/$exe_name" >&2
  echo "  $vision_dir/build/Debug/$exe_name" >&2
  echo "build the private src-native/bedmapper-vision project before packaging." >&2
  exit 1
fi

mkdir -p "$resource_dir"
rm -f "$resource_dir/$exe_name"
rm -rf "$resource_dir/lib"
cp "$sidecar_source" "$resource_dir/$exe_name"
chmod +x "$resource_dir/$exe_name" 2>/dev/null || true

echo "staged $sidecar_source -> $resource_dir/$exe_name"

if [ "$platform" = "Darwin" ]; then
  if ! command -v dylibbundler >/dev/null 2>&1; then
    echo "error: dylibbundler is required to package the macOS vision sidecar." >&2
    exit 1
  fi

  mkdir -p "$resource_dir/lib"
  dylibbundler \
    -od \
    -b \
    -x "$resource_dir/$exe_name" \
    -d "$resource_dir/lib" \
    -p "@loader_path/lib/"

  dylib_count=$(find "$resource_dir/lib" -type f -name '*.dylib' | wc -l | tr -d ' ')
  if [ "$dylib_count" = "0" ]; then
    echo "error: dylibbundler did not copy any dylibs into $resource_dir/lib." >&2
    exit 1
  fi

  if command -v otool >/dev/null 2>&1; then
    echo "staged sidecar linkage:"
    otool -L "$resource_dir/$exe_name"

    if otool -L "$resource_dir/$exe_name" | grep -E '/(opt/homebrew|usr/local)/(Cellar|opt)/' >/dev/null 2>&1; then
      echo "error: staged macOS sidecar still links to Homebrew paths." >&2
      exit 1
    fi

    for dependency in "$resource_dir"/lib/*.dylib; do
      [ -e "$dependency" ] || continue
      if otool -L "$dependency" | grep -E '/(opt/homebrew|usr/local)/(Cellar|opt)/' >/dev/null 2>&1; then
        otool -L "$dependency" >&2 || true
        echo "error: bundled dylib still links to Homebrew paths: $dependency" >&2
        exit 1
      fi
    done
  fi

  echo "bundled $dylib_count macOS dylib(s) for the vision sidecar"
fi

if command -v ldd >/dev/null 2>&1; then
  if ldd "$resource_dir/$exe_name" 2>/dev/null | grep 'not found' >/dev/null 2>&1; then
    ldd "$resource_dir/$exe_name" >&2 || true
    echo "error: staged sidecar has missing shared library dependencies." >&2
    exit 1
  fi
fi
