Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.29: Fix SWC version mismatch and optimize Docker build process"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
