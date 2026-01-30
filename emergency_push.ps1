Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.30: Fix module resolution errors by using relative paths and updating tsconfig"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
