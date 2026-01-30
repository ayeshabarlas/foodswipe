Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.36: Build Fix - Corrected relative paths in App Router pages"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
