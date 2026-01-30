Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.26: Brutal Debug Fix - Disabled middleware, forced Node 20.x, and simplified rewrites"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
