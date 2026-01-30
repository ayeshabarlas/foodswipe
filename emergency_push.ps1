Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.40: Admin Routing & Static Fallback Fix"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
