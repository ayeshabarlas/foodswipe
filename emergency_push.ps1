Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.39: Render Domain & SPA Routing Fix"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
