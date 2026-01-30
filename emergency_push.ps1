Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.25: ABSOLUTE FORCE TRIGGER - Added trigger file and fixed vercel paths"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
