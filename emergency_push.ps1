Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.37: Build Fix - Enabled static export for Render/Docker serving and fixed Cannot GET /admin"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
