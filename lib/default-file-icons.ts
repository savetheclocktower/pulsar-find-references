import FS from 'fs-plus';
import Path from 'path';

class DefaultFileIcons {
  iconClassForPath(filePath: string) {
    let extension = Path.extname(filePath);

    if (FS.isSymbolicLinkSync(filePath)) {
      return 'icon-file-symlink-file';
    } else if (FS.isReadmePath(filePath)) {
      return 'icon-book';
    } else if (FS.isCompressedExtension(extension)) {
      return 'icon-file-zip';
    } else if (FS.isImageExtension(extension)) {
      return 'icon-file-media';
    } else if (FS.isPdfExtension(extension)) {
      return 'icon-file-pdf';
    } else if (FS.isBinaryExtension(extension)) {
      return 'icon-file-binary';
    } else {
      return 'icon-file-text';
    }
  }
}

export default new DefaultFileIcons();
