import json
import sys
from pathlib import Path
from optimizer import optimize_file_bytes

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")


def main():
    if len(sys.argv) < 5:
        print(json.dumps({"error": "Missing arguments"}))
        sys.exit(1)

    in_path = Path(sys.argv[1])
    out_path = Path(sys.argv[2])
    orig_name = sys.argv[3]
    target_mb = float(sys.argv[4])

    input_bytes = in_path.read_bytes()
    optimized_bytes, meta = optimize_file_bytes(orig_name, input_bytes, target_mb)
    out_path.write_bytes(optimized_bytes)
    print(json.dumps(meta, ensure_ascii=False))


if __name__ == "__main__":
    main()
