Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.22: App-wide 404 fix - Updated vercel.json rewrites and forced rebuild"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
