Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.27: Render Emergency Shift - Full-stack optimization and 404 static serving fix"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
