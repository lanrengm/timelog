// 语义化版本 2.0
// https://semver.org/

import process from 'process';
import fs from 'fs';


if (process.argv[2] === "fix") {
  // bug fix x.y.Z+1
  UpdateVersion('./manifest.json', 'z');
  UpdateVersion('./package.json', 'z');
} else if (process.argv[2] === "new") {
  // new feature x.Y+1.0
  UpdateVersion('./manifest.json', 'y');
  UpdateVersion('./package.json', 'y');
}

function UpdateVersion(filePath, flag) {
  const inContent = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r+' });
  const json = JSON.parse(inContent);
  const xyz = String(json.version).split('.');
  if (flag === 'x') {
    // 不兼容旧版本的大更新
    xyz[0] = String(Number(xyz[0] + 1));
    xyz[1] = '0';
    xyz[2] = '0';
  } else if (flag === 'y') {
    // new feature, y=y+1,z=0
    xyz[1] = String(Number(xyz[1]) + 1);
    xyz[2] = '0';
  } else if (flag === 'z') {
    // bug fix, z=z+1
    xyz[2] = String(Number(xyz[2]) + 1);
  } else {
    throw Error(`flag must is x | y | z, not ${flag}`);
  }
  json.version = xyz.join('.');
  const outContent = JSON.stringify(json, null, 2);
  fs.writeFileSync(filePath, outContent, { encoding: 'utf8', flag: 'w+' });
}
