#!/usr/bin/env python3
"""Small, dependency-free CI router. Run from the repository root."""
import argparse
import ast
import datetime
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile


def git(root, *args):
    return subprocess.check_output(["git", "-C", str(root), *args], stdin=subprocess.DEVNULL, stderr=subprocess.PIPE)


def classify_runs(runs, jobs):
    """A real test failure must never become a successful fallback."""
    if not runs:
        return "local", "no hosted run available"
    fallback = None
    for run in runs:
        if run.get("status") != "completed":
            fallback = "hosted run has not completed; execute without waiting"
            continue
        if run.get("conclusion") == "success":
            continue
        run_jobs = jobs.get(run["id"], [])
        # Billing/quota failures have no executed job steps. An ambiguous failure
        # is blocking; never infer a quota failure from a red conclusion alone.
        if run.get("conclusion") == "failure" and run_jobs and all(
            not j.get("steps") for j in run_jobs
        ):
            fallback = "hosted jobs did not start"
            continue
        return "blocked", "hosted checks failed or were cancelled"
    if fallback:
        return "local", fallback
    return "github", "all required light workflows passed"


def hosted_route(root, sha, policy):
    if not shutil.which("gh"):
        return "local", "GitHub CLI unavailable"
    try:
        remote = git(root, "remote", "get-url", "origin").decode().strip()
        match = re.search(r"[:/]([^/:]+/[^/]+?)(?:\.git)?$", remote)
        if not match:
            return "local", "no GitHub remote"
        repo = match[1]
        runs, jobs = [], {}
        for workflow in policy["light_workflows"]:
            endpoint = f"repos/{repo}/actions/workflows/{workflow}/runs?head_sha={sha}&per_page=20"
            raw = subprocess.check_output(["gh", "api", endpoint], stderr=subprocess.DEVNULL, timeout=25)
            candidates = json.loads(raw)["workflow_runs"]
            candidates = [r for r in candidates if r.get("head_sha") == sha and r.get("event") in ("push", "workflow_dispatch")]
            if not candidates:
                runs.append({"status": "queued"})
                continue
            run = max(candidates, key=lambda r: r["id"])
            runs.append(run)
            if run.get("conclusion") != "success":
                raw = subprocess.check_output(["gh", "api", f"repos/{repo}/actions/runs/{run['id']}/jobs"], stderr=subprocess.DEVNULL, timeout=25)
                jobs[run["id"]] = json.loads(raw)["jobs"]
        return classify_runs(runs, jobs)
    except (subprocess.SubprocessError, ValueError, KeyError):
        return "local", "GitHub API/auth/network unavailable"


def light_checks(root, sha, base=None, standard_only=False):
    policy = json.loads(git(root, "show", f"{sha}:.ci/policy.json"))
    if policy["heavy_executor"] != "local" or policy["light_executor"] != "github-with-local-fallback":
        raise ValueError("Invalid executor policy")
    if base:
        base = git(root, "rev-parse", "--verify", f"{base}^{{commit}}").decode().strip()
    else:
        try:
            base = git(root, "rev-parse", f"{sha}^").decode().strip()
        except subprocess.CalledProcessError:
            base = git(root, "hash-object", "-t", "tree", "--stdin").decode().strip()
    subprocess.run(["git", "-C", str(root), "diff", "--check", base, sha], check=True)
    files = git(root, "diff", "--name-only", "--diff-filter=ACMR", "-z", base, sha).decode().split("\0")
    checked = []
    secret_patterns = [re.compile("-----BEGIN " + r"(?:RSA |OPENSSH |EC )?PRIVATE KEY-----"), re.compile(r"gh[pousr]_" + r"[A-Za-z0-9]{30,}")]
    for name in filter(None, files):
        blob = git(root, "show", f"{sha}:{name}")
        if len(blob) > 2_000_000 or b"\0" in blob:
            continue
        try:
            text = blob.decode("utf-8")
        except UnicodeDecodeError:
            continue
        if any(p.search(text) for p in secret_patterns):
            raise ValueError(f"Possible private credential in {name}; value suppressed")
        if name.endswith(".py"):
            ast.parse(text, filename=name)
        if name in (".ci/policy.json", "package.json") or name.endswith(".schema.json"):
            json.loads(text)
        checked.append(name)
    for name in policy["local_workflows"]:
        git(root, "cat-file", "-e", f"{sha}:.ci/local-workflows/{name}")
    with tempfile.TemporaryDirectory(prefix="prm-ci-router-tests-") as folder:
        for name in ("ci.py", "test_ci.py"):
            pathlib.Path(folder, name).write_bytes(git(root, "show", f"{sha}:.ci/{name}"))
        subprocess.run([sys.executable, "-B", str(pathlib.Path(folder, "test_ci.py"))], check=True)
    if policy.get("local_light_commands") and not standard_only:
        # Exact immutable source, no .env from the operator checkout and no archive
        # left on disk. Installed dependencies disappear with the temporary context.
        with tempfile.TemporaryDirectory(prefix="prm-ci-light-") as folder:
            producer = subprocess.Popen(["git", "-C", str(root), "archive", sha], stdout=subprocess.PIPE)
            try:
                subprocess.run(["tar", "-xf", "-", "-C", folder], stdin=producer.stdout, check=True)
            finally:
                producer.stdout.close()
                if producer.wait() != 0:
                    raise ValueError("git archive failed")
            env = {**os.environ, "GITHUB_SHA": sha, "CI": "1"}
            for command in policy["local_light_commands"]:
                subprocess.run(["bash", "-e", "-o", "pipefail", "-c", command], cwd=folder, env=env, check=True, timeout=480)
    return checked


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("auto", "light", "plan"))
    parser.add_argument("--sha", default="HEAD")
    parser.add_argument("--base")
    parser.add_argument("--receipt", required=False)
    parser.add_argument("--standard-only", action="store_true", help="Hosted source job only; separate hosted jobs run project light checks")
    args = parser.parse_args()
    root = pathlib.Path(git(pathlib.Path.cwd(), "rev-parse", "--show-toplevel").decode().strip())
    sha = git(root, "rev-parse", "--verify", f"{args.sha}^{{commit}}").decode().strip()
    policy = json.loads(git(root, "show", f"{sha}:.ci/policy.json"))
    if args.mode == "plan":
        print(json.dumps({"sha": sha, **policy}, indent=2))
        return 0
    route, reason = ("local", "explicit local light checks")
    if args.mode == "auto":
        route, reason = hosted_route(root, sha, policy)
    result = {"sha": sha, "scope": "light-source-only" if args.standard_only else "light-only", "executor": route, "reason": reason,
              "time_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
              "heavy_status": "separate mandatory gates; this receipt cannot approve deployment"}
    code = 0
    try:
        if route == "blocked":
            raise ValueError(reason)
        if route == "local":
            result["files_checked"] = light_checks(root, sha, args.base, args.standard_only)
        result["status"] = "passed"
    except (ValueError, SyntaxError, subprocess.SubprocessError) as exc:
        result.update(status="failed", error=str(exc))
        code = 1
    if args.receipt:
        dest = pathlib.Path(args.receipt)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False))
    return code


if __name__ == "__main__":
    sys.exit(main())
