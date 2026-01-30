Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.20: Add Rider ID to EnhancedOrdersView and update vercel routing"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
