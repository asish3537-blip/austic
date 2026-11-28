param([ValidateSet('release','debug')][string]$Mode='release',[switch]$RunTests)
$ErrorActionPreference='Stop'
$appRoot=Split-Path $PSScriptRoot -Parent
$toolsRoot=Join-Path (Split-Path $appRoot -Parent) '.android-tools'
$jdkPath=(Get-ChildItem -LiteralPath (Join-Path $toolsRoot 'jdk') -Directory | Select-Object -First 1).FullName
$keyFile=Join-Path $toolsRoot 'private-signing/pausstik.p12'
$passwordFile=Join-Path $toolsRoot 'private-signing/password.dpapi'
if(!(Test-Path -LiteralPath $keyFile) -or !(Test-Path -LiteralPath $passwordFile)){throw 'The original Android signing key is required. No replacement key was generated.'}
$env:JAVA_HOME=$jdkPath
$env:ANDROID_HOME=Join-Path $toolsRoot 'native-sdk'
$env:PAUSTIK_ANDROID_KEYSTORE=$keyFile
$securePassword=Get-Content -LiteralPath $passwordFile | ConvertTo-SecureString
$env:PAUSTIK_ANDROID_STORE_PASS=[Net.NetworkCredential]::new('',$securePassword).Password
try {
    Push-Location $appRoot
    & node --import tsx scripts/generate-native-assets.mjs
    if($LASTEXITCODE -ne 0){throw 'Asset preparation failed'}
    $task=if($RunTests){'testDebugUnitTest'}elseif($Mode -eq 'release'){'assembleRelease'}else{'assembleDebug'}
    & (Join-Path $toolsRoot 'gradle/gradle-8.13/bin/gradle.bat') --no-daemon --gradle-user-home (Join-Path $toolsRoot 'gradle-cache') --project-dir (Join-Path $appRoot 'android') $task
    if($LASTEXITCODE -ne 0){throw 'Native Android build failed'}
} finally {
    Pop-Location
    Remove-Item Env:PAUSTIK_ANDROID_STORE_PASS -ErrorAction SilentlyContinue
    Remove-Item Env:PAUSTIK_ANDROID_KEYSTORE -ErrorAction SilentlyContinue
}
