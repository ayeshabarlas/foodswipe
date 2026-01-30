Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.19: Switch to rewrites in vercel.json and increment admin version"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
