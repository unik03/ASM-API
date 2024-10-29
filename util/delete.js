const fs = require('fs');

const deleteFile = path => {
    console.log('>>> path: ', path);
    fs.unlink(path, err => {
        if (err) {
            console.log('>>> error: ', err);
            throw err;
        }
    });
};

exports.deleteFile = deleteFile;
