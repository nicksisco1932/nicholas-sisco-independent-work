import importlib.util
import pathlib
import stat
import tempfile
import unittest
import zipfile

module_path = pathlib.Path(__file__).parents[1] / 'scripts' / 'unpack-editorial-artifact.py'
spec = importlib.util.spec_from_file_location('artifact', module_path)
artifact = importlib.util.module_from_spec(spec)
spec.loader.exec_module(artifact)


class ArtifactTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)
        self.archive = self.root / 'artifact.zip'
        self.output = self.root / 'output'

    def make_zip(self, entries):
        with zipfile.ZipFile(self.archive, 'w', compression=zipfile.ZIP_DEFLATED) as bundle:
            for name, data in entries:
                bundle.writestr(name, data)

    def unpack(self):
        artifact.unpack(self.archive, self.output, ['manifest.json', 'candidate.bundle.json'])

    def test_exact_entries_round_trip(self):
        self.make_zip([('manifest.json', b'{}'), ('candidate.bundle.json', b'hello')])
        self.unpack()
        self.assertEqual((self.output / 'candidate.bundle.json').read_bytes(), b'hello')

    def test_missing_extra_traversal_absolute_and_duplicate_entries(self):
        for names in [['manifest.json'], ['manifest.json', '../candidate.bundle.json'], ['manifest.json', '/candidate.bundle.json'], ['manifest.json', 'manifest.json'], ['manifest.json', 'candidate.bundle.json', 'extra.txt']]:
            with self.subTest(names=names):
                self.make_zip([(name, b'{}') for name in names])
                with self.assertRaises(ValueError):
                    self.unpack()
                self.assertFalse(self.output.exists())

    def test_symlink_entry_rejected_before_writes(self):
        link = zipfile.ZipInfo('manifest.json')
        link.create_system = 3
        link.external_attr = (stat.S_IFLNK | 0o777) << 16
        self.make_zip([(link, b'target'), ('candidate.bundle.json', b'{}')])
        with self.assertRaises(ValueError):
            self.unpack()
        self.assertFalse(self.output.exists())

    def test_unexpected_file_kind(self):
        pipe = zipfile.ZipInfo('manifest.json')
        pipe.create_system = 3
        pipe.external_attr = (stat.S_IFIFO | 0o600) << 16
        self.make_zip([(pipe, b'{}'), ('candidate.bundle.json', b'{}')])
        with self.assertRaises(ValueError):
            self.unpack()

    def test_size_bound_checked_before_decompression(self):
        self.make_zip([('manifest.json', b'123456'), ('candidate.bundle.json', b'123456')])
        original = artifact.LIMIT
        artifact.LIMIT = 10
        try:
            with self.assertRaises(ValueError):
                self.unpack()
        finally:
            artifact.LIMIT = original
        self.assertFalse(self.output.exists())

    def test_existing_destination_refused(self):
        self.make_zip([('manifest.json', b'{}'), ('candidate.bundle.json', b'{}')])
        self.output.mkdir()
        marker = self.output / 'preserve'
        marker.write_text('untouched')
        with self.assertRaises(ValueError):
            self.unpack()
        self.assertEqual(marker.read_text(), 'untouched')


if __name__ == '__main__':
    unittest.main()
