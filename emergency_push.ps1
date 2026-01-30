Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.38: Build Fix - Optimized Vercel configuration for monorepo and fixed foodswipe.pk 404"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
