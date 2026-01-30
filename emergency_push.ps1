Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.41: Trailing Slash Fix for Static Routing"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
