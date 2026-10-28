"""Offline deployment regression tests. No Docker, SSH or database mutations."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, patch

SCRIPT = Path(__file__).resolve().parents[2] / "deploy-release.py"
spec = importlib.util.spec_from_file_location("deploy_release", SCRIPT)
release = importlib.util.module_from_spec(spec)
with patch.dict(sys.modules, {"paramiko": MagicMock()}):
    spec.loader.exec_module(release)


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.commands = []
        self.log_patch = patch.object(release, "log")
        self.log_patch.start()
        self.addCleanup(self.log_patch.stop)

    def remote(self, cli, command, timeout=600):
        self.commands.append(command)
        if command.startswith("sha256sum"):
            return 0, "digest file", ""
        if "docker run --rm --entrypoint sh edu-manage-migrator:latest" in command:
            return 0, release.schema_migration_fingerprint(), ""
        if "docker image inspect" in command:
            if ":pre-" in command:
                return 1, "", "not found"
            if ":latest" in command:
                return 0, "sha256:old", ""
            return 0, "sha256:new", ""
        return 0, "", ""

    def test_healthy_container_requires_expected_image_and_http_200(self):
        responses = [
            (0, "a" * 64, ""),
            (0, json.dumps([{"Image": "sha256:new", "State": {"Running": True, "Status": "running", "Health": {"Status": "healthy"}}}]), ""),
            (0, "200", ""),
        ]
        with patch.object(release, "ssh_run", side_effect=responses):
            release.wait_for_app(None, "sha256:new")

    def test_wrong_image_fails_even_when_container_is_healthy(self):
        with patch.object(release, "ssh_run", side_effect=[
            (0, "a" * 64, ""),
            (0, json.dumps([{"Image": "sha256:old", "State": {"Running": True, "Health": {"Status": "healthy"}}}]), ""),
        ]):
            with self.assertRaisesRegex(RuntimeError, "镜像"):
                release.wait_for_app(None, "sha256:new")

    def test_unhealthy_or_bad_http_never_succeeds(self):
        for health, http in [("unhealthy", "200"), ("healthy", "500")]:
            with self.subTest(health=health, http=http):
                def response(cli, command, timeout=600):
                    if "ps -q" in command:
                        return 0, "a" * 64, ""
                    if "docker inspect" in command:
                        return 0, json.dumps([{"Image": "sha256:new", "State": {"Running": True, "Status": "running", "Health": {"Status": health}}}]), ""
                    return 0, http, ""
                with patch.object(release, "ssh_run", side_effect=response), patch.object(release.time, "monotonic", side_effect=[0, 0, 3]), patch.object(release.time, "sleep"):
                    with self.assertRaisesRegex(RuntimeError, "超时"):
                        release.wait_for_app(None, "sha256:new", timeout=2)

    def test_migration_and_backup_precede_app_recreation(self):
        with patch.object(release, "ssh_run", side_effect=self.remote), patch.object(release, "wait_for_app"):
            release.deploy_remote([("edu-manage-app-test.tar", "digest"), ("edu-manage-migrator-test.tar", "digest")], "test", False)
        backup = next(i for i, cmd in enumerate(self.commands) if "backup-db.sh" in cmd)
        migrate = next(i for i, cmd in enumerate(self.commands) if "run --rm --no-deps migrate" in cmd)
        app = next(i for i, cmd in enumerate(self.commands) if "up -d --no-build app" in cmd)
        self.assertLess(backup, migrate)
        self.assertLess(migrate, app)

    def test_skip_upload_requires_matching_local_and_remote_image_ids(self):
        local_image = MagicMock(returncode=0, stdout="sha256:new\n")
        with patch.object(release.subprocess, "run", return_value=local_image), patch.object(release, "ssh_run", side_effect=self.remote), patch.object(release, "wait_for_app"):
            release.deploy_remote(
                [("edu-manage-app-test.tar", "digest"), ("edu-manage-migrator-test.tar", "digest")],
                "test",
                False,
                skip_upload=True,
            )
        self.assertEqual(sum("docker image inspect" in cmd and ":test " in cmd for cmd in self.commands), 3)
        self.assertFalse(any(cmd.startswith("sha256sum") or "docker load" in cmd for cmd in self.commands))
        cleanup = next(i for i, cmd in enumerate(self.commands) if "rm -f /tmp/edu-manage-" in cmd)
        backup = next(i for i, cmd in enumerate(self.commands) if "backup-db.sh" in cmd)
        self.assertLess(cleanup, backup)

    def test_skip_upload_refuses_image_id_mismatch_before_retagging(self):
        local_image = MagicMock(returncode=0, stdout="sha256:local\n")
        with patch.object(release.subprocess, "run", return_value=local_image), patch.object(release, "ssh_run", side_effect=self.remote):
            with self.assertRaisesRegex(RuntimeError, "镜像 ID 不匹配"):
                release.deploy_remote([("edu-manage-app-test.tar", "digest")], "test", False, skip_upload=True)
        self.assertFalse(any("docker tag" in cmd for cmd in self.commands))
        self.assertFalse(any("rm -f" in cmd for cmd in self.commands))

    def test_retry_preserves_existing_old_image_backup_tag(self):
        def response(cli, command, timeout=600):
            if "docker image inspect" in command and ":pre-test-backup-app" in command:
                self.commands.append(command)
                return 0, "sha256:original-old", ""
            return self.remote(cli, command, timeout)

        with patch.object(release, "ssh_run", side_effect=response), patch.object(release, "wait_for_app"):
            release.deploy_remote([("edu-manage-app-test.tar", "digest")], "test", False)
        self.assertFalse(any("docker tag edu-manage-app:latest edu-manage-app:pre-test-backup-app" in cmd for cmd in self.commands))
        self.assertTrue(any("docker tag edu-manage-app:test edu-manage-app:latest" in cmd for cmd in self.commands))

    def test_app_only_refuses_schema_mismatch_before_retagging(self):
        def mismatched_remote(cli, command, timeout=600):
            if "docker run --rm --entrypoint sh edu-manage-migrator:latest" in command:
                self.commands.append(command)
                return 0, "schema=remote migrations=remote", ""
            return self.remote(cli, command, timeout)

        with patch.object(release, "schema_migration_fingerprint", return_value="schema=local migrations=local"), \
                patch.object(release, "ssh_run", side_effect=mismatched_remote):
            with self.assertRaisesRegex(RuntimeError, "schema 或迁移目录与生产 migrator 不一致"):
                release.deploy_remote([("edu-manage-app-test.tar", "digest")], "test", False)
        self.assertFalse(any("docker tag" in command for command in self.commands))
        self.assertFalse(any("up -d --no-build app" in command for command in self.commands))

    def test_failed_migration_does_not_start_app_and_keeps_local_artifacts(self):
        def response(cli, cmd, timeout=600):
            result = self.remote(cli, cmd, timeout)
            return (1, "", "migration failed") if "run --rm" in cmd else result
        with patch.object(release, "ssh_run", side_effect=response), patch.object(release, "wait_for_app") as health:
            with self.assertRaisesRegex(RuntimeError, "迁移"):
                release.deploy_remote([("edu-manage-app-test.tar", "digest"), ("edu-manage-migrator-test.tar", "digest")], "test", False)
        migrate = next(i for i, cmd in enumerate(self.commands) if "run --rm --no-deps migrate" in cmd)
        cleanup = [i for i, cmd in enumerate(self.commands) if "rm -f /tmp/edu-manage-" in cmd]
        self.assertEqual(len(cleanup), 2)
        self.assertTrue(all(i < migrate for i in cleanup))
        self.assertFalse(any("up -d --no-build app" in cmd for cmd in self.commands))
        health.assert_not_called()

    def test_failed_backup_prevents_migration(self):
        def response(cli, cmd, timeout=600):
            result = self.remote(cli, cmd, timeout)
            return (1, "", "backup failed") if "backup-db.sh" in cmd else result
        with patch.object(release, "ssh_run", side_effect=response):
            with self.assertRaisesRegex(RuntimeError, "备份"):
                release.deploy_remote([("edu-manage-app-test.tar", "digest"), ("edu-manage-migrator-test.tar", "digest")], "test", False)
        self.assertFalse(any("run --rm" in cmd for cmd in self.commands))

    def test_health_failure_rolls_back_and_keeps_local_tar_after_remote_cleanup(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            local_tar = Path(temp_dir) / "edu-manage-app-test.tar"
            local_tar.write_bytes(b"release archive")
            with patch.object(release, "ssh_run", side_effect=self.remote), patch.object(release, "wait_for_app", side_effect=[RuntimeError("health failed"), None]) as health:
                with self.assertRaisesRegex(RuntimeError, "health failed"):
                    release.deploy_remote([(str(local_tar), "digest")], "test", False)
            self.assertTrue(local_tar.exists())
        self.assertEqual(health.call_count, 2)
        self.assertTrue(any("pre-test-backup-app edu-manage-app:latest" in cmd for cmd in self.commands))
        cleanup = next(i for i, cmd in enumerate(self.commands) if "rm -f /tmp/edu-manage-app-test.tar" in cmd)
        load = next(i for i, cmd in enumerate(self.commands) if "docker load -i /tmp/edu-manage-app-test.tar" in cmd)
        self.assertLess(load, cleanup)


if __name__ == "__main__":
    unittest.main()
