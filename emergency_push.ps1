Write-Host "Starting Git Operations..."
git add .
Write-Host "Staging done."
git commit -m "v2.2.35: Build Fix - Moved tailwind postcss to dependencies and patched Next.js security vulnerability"
Write-Host "Commit done."
git push origin main --force
Write-Host "Push done."
