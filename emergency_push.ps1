Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.24: Manual trigger for Vercel build - Stable routes configuration"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
