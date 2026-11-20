import { mkdir, lstat, access, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";

// Windows development fixture only: no machine certificate store, trust-all,
// administrator token, arbitrary path/command or access to the historical demo.
if (process.platform !== "win32")
  throw new Error(
    "Use un certificado local confiable preparado para su plataforma.",
  );
await access("migrations/008_harvest_sync.up.sql");
const local = path.resolve(".local");
await mkdir(local, { recursive: true });
if ((await lstat(local)).isSymbolicLink())
  throw new Error(".local no puede ser un enlace.");
const root = path.join(local, "android-b-fixture");
try {
  await lstat(root);
  throw new Error(
    "Fixture existente: conservar y reutilizar; no regenerar certificados o credenciales.",
  );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const script = String.raw`
$ErrorActionPreference='Stop'
$root=Join-Path (Get-Location) '.local\android-b-fixture'
New-Item -ItemType Directory -Path $root | Out-Null
$rsa=[System.Security.Cryptography.RSACng]::new(2048)
$request=[System.Security.Cryptography.X509Certificates.CertificateRequest]::new('CN=localhost',$rsa,[System.Security.Cryptography.HashAlgorithmName]::SHA256,[System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
$san=[System.Security.Cryptography.X509Certificates.SubjectAlternativeNameBuilder]::new()
$san.AddDnsName('localhost'); $san.AddIpAddress([System.Net.IPAddress]::Loopback)
$request.CertificateExtensions.Add($san.Build())
$request.CertificateExtensions.Add([System.Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]::new($false,$false,0,$true))
$request.CertificateExtensions.Add([System.Security.Cryptography.X509Certificates.X509KeyUsageExtension]::new(160,$true))
$cert=$request.CreateSelfSigned([DateTimeOffset]::UtcNow.AddHours(-1),[DateTimeOffset]::UtcNow.AddDays(7))
[System.IO.File]::WriteAllBytes((Join-Path $root 'localhost.pfx'),$cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Pfx,$env:ANDROID_B_PFX_PROTECTION))
$pem='-----BEGIN CERTIFICATE-----'+[Environment]::NewLine+[Convert]::ToBase64String($cert.RawData,[Base64FormattingOptions]::InsertLineBreaks)+[Environment]::NewLine+'-----END CERTIFICATE-----'+[Environment]::NewLine
[System.IO.File]::WriteAllText((Join-Path $root 'localhost.pem'),$pem)
$cert.Dispose(); $rsa.Dispose()
`;
const protection = randomBytes(32).toString("base64url");
execFileSync(
  String.raw`C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`,
  ["-NoProfile", "-NonInteractive", "-Command", script],
  {
    stdio: "inherit",
    windowsHide: true,
    env: { ...process.env, ANDROID_B_PFX_PROTECTION: protection },
  },
);
await writeFile(path.join(root, "pfx-password.txt"), protection, {
  flag: "wx",
});
console.log(
  "Certificado local de pruebas preparado; no se instala en el sistema. Iniciar backend-fixture.js.",
);
