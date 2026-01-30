Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.43: Domain Health Check Fix"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
