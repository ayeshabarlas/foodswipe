Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.18: Fix 404 routing and remove standalone output"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
