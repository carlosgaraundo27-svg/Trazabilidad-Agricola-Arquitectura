import { realpathSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const windowsDocker =
  "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe";
const windowsShell =
  "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
function verifyWindowsInstallation() {
  // Literal paths and OS cmdlets only. No script/profile, PATH discovery or
  // caller-selected executable is accepted at this boundary.
  const script = String.raw`
$ErrorActionPreference = 'Stop'
try {
 $paths = @('C:\Program Files','C:\Program Files\Docker','C:\Program Files\Docker\Docker','C:\Program Files\Docker\Docker\resources','C:\Program Files\Docker\Docker\resources\bin','C:\Program Files\Docker\Docker\resources\bin\docker.exe')
 $trusted = @('S-1-5-18','S-1-5-32-544','S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464')
 $signature = Get-AuthenticodeSignature -LiteralPath $paths[-1]
 if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch '(^|,\s*)(CN|O)="?Docker( Inc\.?)?"?(,|$)') { throw 'Unverified Docker signature' }
 $write = [System.Security.AccessControl.FileSystemRights]::Write -bor [System.Security.AccessControl.FileSystemRights]::Delete -bor [System.Security.AccessControl.FileSystemRights]::DeleteSubdirectoriesAndFiles -bor [System.Security.AccessControl.FileSystemRights]::ChangePermissions -bor [System.Security.AccessControl.FileSystemRights]::TakeOwnership
 foreach ($item in $paths) {
  $acl = Get-Acl -LiteralPath $item
  $owner = ([System.Security.Principal.NTAccount]::new($acl.Owner)).Translate([System.Security.Principal.SecurityIdentifier]).Value
  if ($owner -notin $trusted) { throw 'Untrusted owner' }
  foreach ($rule in $acl.Access) {
   if ($rule.AccessControlType -eq 'Allow' -and ($rule.PropagationFlags -band [System.Security.AccessControl.PropagationFlags]::InheritOnly) -eq 0 -and ($rule.FileSystemRights -band $write) -ne 0) {
    $sid = $rule.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value
    if ($sid -notin $trusted) { throw 'Untrusted write permission' }
   }
  }
 }
 $true | ConvertTo-Json -Compress
} catch { $false | ConvertTo-Json -Compress }
`;
  return (
    JSON.parse(
      execFileSync(
        windowsShell,
        ["-NoProfile", "-NonInteractive", "-Command", script],
        {
          encoding: "utf8",
          windowsHide: true,
          timeout: 10000,
          env: {
            ...process.env,
            PSModulePath:
              "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules",
          },
        },
      ),
    ) === true
  );
}
export function trustedDockerExecutable({
  platform = process.platform,
  realpath = realpathSync,
  stat = statSync,
  verifyWindows = verifyWindowsInstallation,
} = {}) {
  const candidate = platform === "linux" ? "/usr/bin/docker" : windowsDocker;
  if (!["linux", "win32"].includes(platform))
    throw new Error(
      "Docker requiere una instalación de sistema revisada para esta plataforma.",
    );
  const canonical = realpath(candidate);
  const samePath =
    platform === "win32"
      ? path.win32.normalize(canonical).toLowerCase() ===
        path.win32.normalize(candidate).toLowerCase()
      : canonical === candidate;
  if (!samePath)
    throw new Error("Docker no puede redirigirse a otra ubicación.");
  if (platform === "win32") {
    if (!verifyWindows())
      throw new Error(
        "Docker requiere firma válida de Docker y ACL de sistema verificadas.",
      );
    return candidate;
  }
  let current = candidate;
  for (;;) {
    const metadata = stat(current);
    const file = current === candidate;
    if (
      metadata.uid !== 0 ||
      (metadata.mode & 0o022) !== 0 ||
      (file
        ? !metadata.isFile() || (metadata.mode & 0o111) === 0
        : !metadata.isDirectory())
    )
      throw new Error(
        "Docker y sus directorios deben pertenecer a root y rechazar escritura no privilegiada.",
      );
    if (current === "/") break;
    current = path.posix.dirname(current);
  }
  return candidate;
}
