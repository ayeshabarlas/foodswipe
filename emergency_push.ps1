Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.23: Final attempt at Vercel routing fix - Switching back to routes from rewrites"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
