const fs = require('fs');
const path = require('path');

const checkEmpty = (src_path) => {
  return readFile(src_path)
    .then(data => data.length === 0);
}

const confirmDirPath = (parent, name) => {
  try {
    const dirPath = path.join(parent, name);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }
    return dirPath;
  } catch (error) {
    return false;
  }
}

const deleteFile = (target_path) => {
  return new Promise((resolve, reject) => {
    fs.unlink(target_path, err => {
      err ? reject(err) : resolve(true);
    });
  });
}

const readFile = (src_path) => {
  return new Promise((resolve, reject) => {
    fs.readFile(src_path, (err, data) => {
      if (err) reject(err);
      resolve(data);
    });
  });
}

const write2File = (dest_path, data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(dest_path, data, (err) => {
      err ? reject(err) : resolve(dest_path);
    });
  });
}


module.exports = {
  confirmDir: confirmDirPath,
  delete: deleteFile,
  isEmpty: checkEmpty,
  read: readFile,
  write: write2File,
};
