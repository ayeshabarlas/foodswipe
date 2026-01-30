Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.31: Brutal Fix - Replaced all critical aliases with relative paths to bypass Docker resolution issues"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
