"""Unpack only an explicitly named, bounded Actions artifact. No general extraction."""
import os
import pathlib
import stat
import sys
import zipfile

LIMIT = 48 * 1024 * 1024


def unpack(archive, destination, allowed):
    target = pathlib.Path(destination)
    if target.exists():
        raise ValueError('destination must not exist')
    with zipfile.ZipFile(archive) as bundle:
        entries = bundle.infolist()
        if len(entries) != len(allowed) or set(e.filename for e in entries) != set(allowed):
            raise ValueError('unexpected, duplicate or missing artifact entries')
        if sum(e.file_size for e in entries) > LIMIT:
            raise ValueError('artifact exceeds size limit')
        payloads = {}
        for entry in entries:
            mode = entry.external_attr >> 16
            if entry.flag_bits & 1 or entry.is_dir() or stat.S_ISLNK(mode):
                raise ValueError('encrypted, directory or symlink entry')
            if stat.S_IFMT(mode) not in (0, stat.S_IFREG):
                raise ValueError('nonregular artifact entry')
            if entry.file_size > LIMIT or entry.compress_size > LIMIT:
                raise ValueError('artifact entry exceeds size limit')
            # Bounded streaming also protects against inconsistent size metadata.
            with bundle.open(entry) as stream:
                data = stream.read(LIMIT + 1)
            if len(data) != entry.file_size or len(data) > LIMIT:
                raise ValueError('artifact length mismatch')
            payloads[entry.filename] = data
    target.mkdir(parents=True)
    for name, data in payloads.items():
        with open(target / name, 'xb') as output:
            output.write(data)


if __name__ == '__main__':
    # Allowed filenames are fixed by trusted callers, never archive metadata.
    unpack(sys.argv[1], sys.argv[2], sys.argv[3:])
