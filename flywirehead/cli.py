"""Local application entrypoint; the full neural model runs on this machine."""

import argparse
import json
import os
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=Path("data"), help="Dataset/cache directory")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("prepare", help="Download and verify the full MaleCNS v1.0 graph (~1.1 GB download)")
    sub.add_parser("verify", help="Verify every prepared graph array against the upstream locks")
    run = sub.add_parser("run", help="Run the local brain and its 3D observation window")
    run.add_argument("--port", type=int, default=4173)
    run.add_argument("--no-browser", action="store_true")
    run.add_argument("--run-dir", type=Path, default=Path("runs/matrix"))
    run.add_argument("--neural-ms", type=float, default=50.0, help="Simulated milliseconds per submitted frame (0.1–500)")
    run.add_argument("--fresh", action="store_true", help="Start without restoring the existing checkpoint")
    run.add_argument("--frozen", action="store_true", help="Freeze plastic synaptic weights for a control run")
    run.add_argument("--no-video-reward", action="store_true", help="Disable automatic PAM11 stimulation while watching, for a control run")
    args = parser.parse_args()
    os.environ["FLYWIREHEAD_DATA"] = str(args.data.resolve())
    if args.command == "prepare":
        from .data import prepare
        prepare()
    elif args.command == "verify":
        from .data import verify
        print(json.dumps(verify(), indent=2))
    else:
        if not 1 <= args.port <= 65535:
            parser.error("Port must be between 1 and 65535")
        if not .1 <= args.neural_ms <= 500 or abs(args.neural_ms * 10 - round(args.neural_ms * 10)) > 1e-7:
            parser.error("Neural interval must be 0.1–500 ms in 0.1 ms increments")
        from .server import serve
        serve(args)


if __name__ == "__main__":
    main()
