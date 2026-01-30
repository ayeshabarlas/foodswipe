Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.21: Safety fix for Rider ID in CODSettlementView"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
