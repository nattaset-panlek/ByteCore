// electron-builder afterPack hook: embed the Xea OS icon and version info in ByteCore.exe.
// signAndEditExecutable is off because its winCodeSign download needs symlink rights on Windows,
// so the exe is edited here with rcedit instead.
const path = require("path");
const rcedit = require("rcedit");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") return;
  const { productFilename, info } = context.packager.appInfo;
  const exe = path.join(context.appOutDir, `${productFilename}.exe`);
  const version = info.metadata.version;
  await rcedit(exe, {
    icon: path.join(__dirname, "icon.ico"),
    "file-version": version,
    "product-version": version,
    "version-string": {
      ProductName: productFilename,
      FileDescription: productFilename,
      CompanyName: "SquadX Studio",
      OriginalFilename: `${productFilename}.exe`,
    },
  });
};
