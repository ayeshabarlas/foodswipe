Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.28: Dockerfile optimized for full-stack Render deployment - Automatic Frontend Build"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
