$out = git ls-remote origin main
$out += "`nLocal HEAD: " + (git rev-parse HEAD)
$out += "`nRemotes:`n" + (git remote -v | Out-String)
$out | Out-File -FilePath "c:\Users\PMLS\Desktop\foodswipe\git_debug_final.txt" -Encoding ascii
