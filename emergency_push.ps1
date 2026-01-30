Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.33: Final Fix - Complete removal of @/ aliases and updated configs for Render/Docker stability"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
