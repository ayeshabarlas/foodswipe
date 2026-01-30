Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.34: Final Fix - Resolved CODSettlementView syntax error and verified relative imports for Render/Docker stability"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
