#!/usr/bin/env python3
import importlib.util
import pathlib
import json
import subprocess
import tempfile
import unittest

path = pathlib.Path(__file__).with_name("ci.py")
if not path.exists():
    path = pathlib.Path(__file__).with_name("hybrid-ci.py")
spec = importlib.util.spec_from_file_location("hybrid_ci", path)
ci = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ci)


class RoutingTests(unittest.TestCase):
    def test_budget_failure_without_steps_falls_back(self):
        self.assertEqual(ci.classify_runs([{"id": 1, "status": "completed", "conclusion": "failure"}], {1: [{"steps": []}]})[0], "local")

    def test_failed_test_cannot_turn_green_via_fallback(self):
        self.assertEqual(ci.classify_runs([{"id": 1, "status": "completed", "conclusion": "failure"}], {1: [{"steps": [{"conclusion": "failure"}]}]})[0], "blocked")

    def test_unknown_failure_is_blocking(self):
        self.assertEqual(ci.classify_runs([{"id": 1, "status": "completed", "conclusion": "failure"}], {})[0], "blocked")

    def test_no_run_or_waiting_does_not_wait_for_reset(self):
        self.assertEqual(ci.classify_runs([], {})[0], "local")
        self.assertEqual(ci.classify_runs([{"status": "queued"}], {})[0], "local")

    def test_all_light_workflows_must_pass(self):
        passed = {"id": 1, "status": "completed", "conclusion": "success"}
        self.assertEqual(ci.classify_runs([passed], {})[0], "github")
        failed = {"id": 2, "status": "completed", "conclusion": "failure"}
        self.assertEqual(ci.classify_runs([passed, failed], {2: [{"steps": [{}]}]})[0], "blocked")

    def test_queued_job_must_not_hide_a_failed_test(self):
        pending = {"id": 1, "status": "queued"}
        failed = {"id": 2, "status": "completed", "conclusion": "failure"}
        self.assertEqual(ci.classify_runs([pending, failed], {2: [{"steps": [{}]}]})[0], "blocked")

    def test_local_check_uses_commit_and_preserves_dirty_source(self):
        with tempfile.TemporaryDirectory(prefix="prm-ci-fixture-") as folder:
            root = pathlib.Path(folder)
            def git(*args):
                return subprocess.check_output(["git", "-C", folder, *args], stderr=subprocess.DEVNULL).decode().strip()
            git("init", "-q")
            (root / ".ci").mkdir()
            (root / ".ci/policy.json").write_text(json.dumps({"heavy_executor": "local", "light_executor": "github-with-local-fallback", "local_workflows": []}))
            (root / ".ci/ci.py").write_text("# isolated fixture\n")
            (root / ".ci/test_ci.py").write_text("# isolated fixture\n")
            (root / "module.py").write_text("answer = 42\n")
            git("add", ".")
            tree = git("write-tree")
            sha = git("-c", "user.name=CI fixture", "-c", "user.email=ci@example.invalid", "commit-tree", tree, "-m", "fixture")
            dirty = "this is not valid python :\n"
            (root / "module.py").write_text(dirty)
            self.assertIn("module.py", ci.light_checks(root, sha))
            self.assertEqual((root / "module.py").read_text(), dirty)


if __name__ == "__main__":
    unittest.main()
